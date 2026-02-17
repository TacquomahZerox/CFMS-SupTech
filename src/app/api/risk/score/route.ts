import { NextRequest } from 'next/server';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { 
  calculateBankRiskScore, 
  calculateAllBankScores, 
  getBankRiskHistory,
  getRiskRanking,
  getRiskSummary 
} from '@/services/risk-scoring.service';

// POST /api/risk/score - Calculate risk scores
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const { bankId, all } = body;

    if (all) {
      // Calculate scores for all banks
      const results = await calculateAllBankScores(session.userId);
      return successResponse({
        message: 'Risk scoring completed for all banks',
        results,
      });
    }

    if (!bankId) {
      return errorResponse('Bank ID is required', 400);
    }

    const result = await calculateBankRiskScore(bankId, session.userId);
    return successResponse(result);
  },
  { requiredPermission: 'risk:write' }
);

// GET /api/risk/score - Get risk data
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const bankId = searchParams.get('bankId') || undefined;
    const view = searchParams.get('view') || 'summary';

    if (view === 'ranking') {
      const limit = parseInt(searchParams.get('limit') || '20');
      const ranking = await getRiskRanking(limit);
      return successResponse(ranking);
    }

    if (view === 'history' && bankId) {
      const limit = parseInt(searchParams.get('limit') || '12');
      const history = await getBankRiskHistory(bankId, limit);
      return successResponse(history);
    }

    const summary = await getRiskSummary();
    return successResponse(summary);
  },
  { requiredPermission: 'risk:read' }
);
