import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { bankUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canAccessBank } from '@/lib/auth';

// GET /api/banks/[id] - Get bank by ID
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    if (!canAccessBank(session.role, session.bankId, id)) {
      return errorResponse('Access denied', 403);
    }

    const bank = await prisma.bank.findUnique({
      where: { id },
      include: {
        branches: true,
        _count: {
          select: {
            users: true,
            approvals: true,
            transactions: true,
            submissions: true,
            exceptions: true,
          },
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            approvedAmount: true,
            currency: true,
            status: true,
            validityStart: true,
            validityEnd: true,
          },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 20,
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            amount: true,
            currency: true,
            transactionDate: true,
          },
        },
        exceptions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            code: true,
            description: true,
            severity: true,
            status: true,
            createdAt: true,
          },
        },
        riskScores: {
          orderBy: { calculatedAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!bank) {
      return errorResponse('Bank not found', 404);
    }

    return successResponse(bank);
  },
  { requiredPermission: 'banks:read' }
);

// PUT /api/banks/[id] - Update bank
export const PUT = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;
    const body = await request.json();
    const validated = bankUpdateSchema.parse(body);

    const existing = await prisma.bank.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('Bank not found', 404);
    }

    const bank = await prisma.bank.update({
      where: { id },
      data: validated,
    });

    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Bank',
      entityId: bank.id,
      details: { changes: validated },
    });

    return successResponse(bank);
  },
  { requiredPermission: 'banks:write' }
);

// DELETE /api/banks/[id] - Delete bank (soft delete by deactivating)
export const DELETE = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const existing = await prisma.bank.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('Bank not found', 404);
    }

    // Soft delete - just deactivate
    await prisma.bank.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Bank',
      entityId: id,
      details: { bankCode: existing.code },
    });

    return successResponse({ message: 'Bank deactivated successfully' });
  },
  { requiredPermission: 'banks:delete' }
);
