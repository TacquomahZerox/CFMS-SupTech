import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { approvalUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canViewSubmission, canAccessInstitution } from '@/lib/policies';
import { assertValidApprovalTransition } from '@/lib/workflows';

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

    if (!canViewSubmission(session, approval.bankId)) {
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

    if (!canAccessInstitution(session, existing.bankId)) {
      return errorResponse('Access denied', 403);
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

    if (validated.status && validated.status !== existing.status) {
      assertValidApprovalTransition(existing.status, validated.status);
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
      action: validated.status ? 'approval.state_changed' : 'approval.updated',
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

    if (!canAccessInstitution(session, existing.bankId)) {
      return errorResponse('Access denied', 403);
    }

    // Don't allow deletion if transactions are linked
    const linkedTransactions = await prisma.transaction.count({
      where: { approvalId: id },
    });

    if (linkedTransactions > 0) {
      // Cancel instead of delete
      await prisma.approval.update({
        where: { id },
        data: { status: 'REVOKED' },
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
