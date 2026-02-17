import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';

// GET /api/exceptions - List exceptions
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const status = searchParams.get('status') || undefined;

    const where: Record<string, unknown> = {};

    if (bankId) {
      if (!canAccessBank(session.role, session.bankId, bankId)) {
        return errorResponse('Access denied', 403);
      }
      where.bankId = bankId;
    } else if (session.role === 'BANK_USER' && session.bankId) {
      where.bankId = session.bankId;
    }

    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [exceptions, total] = await Promise.all([
      prisma.exception.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          transaction: {
            select: {
              referenceNumber: true,
              type: true,
              amount: true,
              currency: true,
              transactionDate: true,
            },
          },
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exception.count({ where }),
    ]);

    return paginatedResponse(exceptions, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'exceptions:read' }
);
