import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { approvalUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canAccessBank } from '@/lib/auth';

// GET /api/approvals/[id] - Get approval by ID
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        bank: { select: { id: true, code: true, name: true } },
        createdBy: { select: { firstName: true, lastName: true, email: true } },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 50,
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            amount: true,
            currency: true,
            transactionDate: true,
          },
        },
      },
    });

    if (!approval) {
      return errorResponse('Approval not found', 404);
    }

    if (!canAccessBank(session.role, session.bankId, approval.bankId)) {
      return errorResponse('Access denied', 403);
    }

    return successResponse(approval);
  },
  { requiredPermission: 'approvals:read' }
);

// PUT /api/approvals/[id] - Update approval
export const PUT = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;
    const body = await request.json();
    const validated = approvalUpdateSchema.parse(body);

    const existing = await prisma.approval.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('Approval not found', 404);
    }

    const updateData: Record<string, unknown> = { ...validated };
    
    if (validated.approvedAmount !== undefined && validated.approvedAmount !== null) {
      updateData.approvedAmount = validated.approvedAmount;
    }
    if (validated.validityStart) {
      updateData.validityStart = new Date(validated.validityStart);
    }
    if (validated.validityEnd) {
      updateData.validityEnd = new Date(validated.validityEnd);
    }

    const approval = await prisma.approval.update({
      where: { id },
      data: updateData,
      include: {
        bank: { select: { code: true, name: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Approval',
      entityId: approval.id,
      details: { changes: validated },
    });

    return successResponse(approval);
  },
  { requiredPermission: 'approvals:write' }
);

// DELETE /api/approvals/[id] - Cancel approval
export const DELETE = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const existing = await prisma.approval.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('Approval not found', 404);
    }

    // Don't allow deletion if transactions are linked
    const linkedTransactions = await prisma.transaction.count({
      where: { approvalId: id },
    });

    if (linkedTransactions > 0) {
      // Cancel instead of delete
      await prisma.approval.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    } else {
      await prisma.approval.delete({
        where: { id },
      });
    }

    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Approval',
      entityId: id,
      details: { referenceNumber: existing.referenceNumber },
    });

    return successResponse({ message: 'Approval cancelled successfully' });
  },
  { requiredPermission: 'approvals:delete' }
);
