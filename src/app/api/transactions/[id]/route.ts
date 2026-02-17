import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';

// GET /api/transactions/[id] - Get transaction by ID
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        bank: { select: { id: true, code: true, name: true } },
        branch: { select: { code: true, name: true } },
        approval: true,
        exceptions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!transaction) {
      return errorResponse('Transaction not found', 404);
    }

    if (!canAccessBank(session.role, session.bankId, transaction.bankId)) {
      return errorResponse('Access denied', 403);
    }

    return successResponse(transaction);
  },
  { requiredPermission: 'transactions:read' }
);
