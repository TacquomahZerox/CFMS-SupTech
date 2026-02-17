import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { approvalCreateSchema, approvalFilterSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canAccessBank } from '@/lib/auth';

// GET /api/approvals - List approvals
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const where: Record<string, unknown> = {};

    if (bankId) {
      if (!canAccessBank(session.role, session.bankId, bankId)) {
        return errorResponse('Access denied', 403);
      }
      where.bankId = bankId;
    } else if (session.role === 'BANK_USER' && session.bankId) {
      where.bankId = session.bankId;
    }

    if (type) where.type = type;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { beneficiaryName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [approvals, total] = await Promise.all([
      prisma.approval.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.approval.count({ where }),
    ]);

    return paginatedResponse(approvals, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'approvals:read' }
);

// POST /api/approvals - Create approval
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const validated = approvalCreateSchema.parse(body);

    // Check for duplicate reference number
    const existing = await prisma.approval.findUnique({
      where: { referenceNumber: validated.referenceNumber },
    });

    if (existing) {
      return errorResponse('Approval with this reference number already exists', 400);
    }

    const approval = await prisma.approval.create({
      data: {
        ...validated,
        approvedAmount: validated.approvedAmount,
        validityStart: new Date(validated.validityStart),
        validityEnd: new Date(validated.validityEnd),
        createdById: session.userId,
      },
      include: {
        bank: { select: { code: true, name: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Approval',
      entityId: approval.id,
      details: {
        referenceNumber: approval.referenceNumber,
        type: approval.type,
        amount: validated.approvedAmount,
      },
    });

    return successResponse(approval, 201);
  },
  { requiredPermission: 'approvals:write' }
);
