import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { userCreateSchema, userUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';

// GET /api/users - List users
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role') || undefined;
    const bankId = searchParams.get('bankId') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: Record<string, unknown> = {};

    if (role) where.role = role;
    if (bankId) where.bankId = bankId;

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          bank: { select: { code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return paginatedResponse(users, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'users:read' }
);

// POST /api/users - Create user
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const validated = userCreateSchema.parse(body);

    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existing) {
      return errorResponse('User with this email already exists', 400);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: passwordHash,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role,
        bankId: validated.bankId,
        isActive: validated.isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        bank: { select: { code: true, name: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
    });

    return successResponse(user, 201);
  },
  { requiredPermission: 'users:write' }
);
