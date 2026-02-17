import { NextRequest } from 'next/server';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { runReconciliation, runBatchReconciliation, getReconciliationSummary } from '@/services/reconciliation.service';

// POST /api/reconciliation/run - Run reconciliation
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const { submissionId, bankId, batch } = body;

    if (batch && bankId) {
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

    const result = await runReconciliation(submissionId, session.userId);
    return successResponse(result);
  },
  { requiredPermission: 'risk:write' }
);

// GET /api/reconciliation/run - Get reconciliation summary
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const bankId = searchParams.get('bankId') || undefined;

    const summary = await getReconciliationSummary(bankId);
    return successResponse(summary);
  },
  { requiredPermission: 'risk:read' }
);
