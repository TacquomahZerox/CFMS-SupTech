import { NextRequest } from 'next/server';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { runReconciliation, runBatchReconciliation, getReconciliationSummary } from '@/services/reconciliation.service';

// POST /api/reconciliation/run - Run reconciliation
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const { submissionId, bankId, batch } = body;

    if (batch && bankId) {
      if (!canAccessBank(session.role, session.bankId, bankId)) {
        return errorResponse('Access denied', 403);
      }

      // Run batch reconciliation for a bank
      const results = await runBatchReconciliation(bankId, session.userId);
      return successResponse({
        message: 'Batch reconciliation completed',
        results,
      });
    }

    if (!submissionId) {
      return errorResponse('Submission ID is required', 400);
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, bankId: true },
    });

    if (!submission) {
      return errorResponse('Submission not found', 404);
    }

    if (!canAccessBank(session.role, session.bankId, submission.bankId)) {
      return errorResponse('Access denied', 403);
    }

    const result = await runReconciliation(submissionId, session.userId);
    return successResponse(result);
  },
  { requiredPermission: 'risk:write' }
);

// GET /api/reconciliation/run - Get reconciliation summary
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const requestedBankId = searchParams.get('bankId') || undefined;
    const bankId = session.role === 'BANK_USER' ? session.bankId || undefined : requestedBankId;

    if (requestedBankId && !canAccessBank(session.role, session.bankId, requestedBankId)) {
      return errorResponse('Access denied', 403);
    }

    const summary = await getReconciliationSummary(bankId);
    return successResponse(summary);
  },
  { requiredPermission: 'risk:read' }
);
