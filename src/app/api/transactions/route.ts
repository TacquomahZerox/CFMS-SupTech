import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';

// GET /api/transactions - List transactions
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const type = searchParams.get('type') || undefined;
    const submissionId = searchParams.get('submissionId') || undefined;
    const hasApproval = searchParams.get('hasApproval');
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

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
    if (submissionId) where.submissionId = submissionId;

    if (hasApproval !== null && hasApproval !== undefined) {
      where.approvalId = hasApproval === 'true' ? { not: null } : null;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { counterpartyName: { contains: search, mode: 'insensitive' } },
        { documentReference: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) (where.transactionDate as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.transactionDate as Record<string, Date>).lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          branch: { select: { code: true, name: true } },
          approval: { select: { referenceNumber: true, type: true } },
          _count: { select: { exceptions: true } },
        },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginatedResponse(transactions, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'transactions:read' }
);
