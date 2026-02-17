import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse, getValidatedBody } from '@/lib/api-utils';
import { bankCreateSchema, bankFilterSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';

// GET /api/banks - List all banks
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { shortName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Bank users can only see their own bank
    if (session.role === 'BANK_USER' && session.bankId) {
      where.id = session.bankId;
    }

    const [banks, total] = await Promise.all([
      prisma.bank.findMany({
        where,
        include: {
          _count: {
            select: {
              branches: true,
              users: true,
              approvals: true,
              transactions: true,
            },
          },
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
            select: { score: true, grade: true, calculatedAt: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bank.count({ where }),
    ]);

    return paginatedResponse(banks, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'banks:read' }
);

// POST /api/banks - Create a new bank
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const validated = bankCreateSchema.parse(body);

    // Check for duplicate code
    const existing = await prisma.bank.findFirst({
      where: {
        code: validated.code,
      },
    });

    if (existing) {
      return errorResponse('Bank with this code already exists', 400);
    }

    const bank = await prisma.bank.create({
      data: validated,
    });

    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Bank',
      entityId: bank.id,
      details: { bankCode: bank.code, bankName: bank.name },
    });

    return successResponse(bank, 201);
  },
  { requiredPermission: 'banks:write' }
);
