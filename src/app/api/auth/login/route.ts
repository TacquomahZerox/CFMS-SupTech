import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { assertRateLimit, clearRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';
import { z } from 'zod';

const MAX_LOGIN_ATTEMPTS = 6;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    assertRateLimit(`login:${clientIp}`, MAX_LOGIN_ATTEMPTS, LOGIN_WINDOW_MS);

    const body = await request.json();
    const validated = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
      include: { bank: true },
    });

    const invalidResponse = NextResponse.json(
      { success: false, error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials' } },
      { status: 401 }
    );

    if (!user || !user.isActive) {
      if (user) {
        await createAuditLog({
          userId: user.id,
          action: 'auth.login.failure',
          entityType: 'User',
          entityId: user.id,
          ipAddress: clientIp,
          userAgent,
          details: { reason: user.isActive ? 'INVALID_CREDENTIALS' : 'ACCOUNT_DISABLED' },
        });
      }
      return invalidResponse;
    }

    const isValidPassword = await bcrypt.compare(validated.password, user.password);

    if (!isValidPassword) {
      await createAuditLog({
        userId: user.id,
        action: 'auth.login.failure',
        entityType: 'User',
        entityId: user.id,
        ipAddress: clientIp,
        userAgent,
        details: { reason: 'INVALID_CREDENTIALS' },
      });
      return invalidResponse;
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'SUPER_ADMIN' | 'CFM_OFFICER' | 'SUPERVISOR' | 'BANK_USER' | 'AUDITOR',
      bankId: user.bankId,
      firstName: user.firstName,
      lastName: user.lastName,
      tokenVersion: 1,
    });

    await setSessionCookie(token);
    clearRateLimit(`login:${clientIp}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAuditLog({
      userId: user.id,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: user.id,
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        bankId: user.bankId,
        bankName: user.bank?.name,
      },
      error: null,
      meta: null,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid login payload', details: error.errors } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'AUTH_FAILED', message: 'Authentication failed' } },
      { status: 500 }
    );
  }
}
