import { NextRequest } from 'next/server';
import { createApiHandler, successResponse, paginatedResponse } from '@/lib/api-utils';
import { getAuditLogs } from '@/services/audit.service';

// GET /api/audit - Get audit logs
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const result = await getAuditLogs({
      userId,
      action,
      entityType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });

    return paginatedResponse(result.logs, result.pagination);
  },
  { requiredPermission: 'audit:read' }
);
