import { NextRequest } from 'next/server';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import prisma from '@/lib/prisma';
import { 
  generateBankComplianceReport, 
  generateSystemSummaryReport, 
  generateExceptionReport,
  getApprovalUtilizationReport,
  exportToCSV 
} from '@/services/report.service';
import { canAccessBank } from '@/lib/auth';

// Map UI report type values to service report types
const typeMap: Record<string, string> = {
  BANK_SUMMARY: 'bank-compliance',
  COMPLIANCE_OVERVIEW: 'bank-compliance',
  TRANSACTION_VOLUME: 'system-summary',
  RISK_ANALYSIS: 'system-summary',
  EXCEPTION_SUMMARY: 'exceptions',
  APPROVAL_STATUS: 'approval-utilization',
  // default fallback handled in resolver
};

function resolveReportType(rawType?: string) {
  if (!rawType) return 'system-summary';
  return typeMap[rawType] || rawType;
}

// GET /api/reports - List generated reports history
export const GET = createApiHandler(
  async (_request, { session }) => {
    const reports = await prisma.report.findMany({
      where: session.role === 'BANK_USER' ? { generatedById: session.userId } : {},
      include: {
        generatedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { generatedAt: 'desc' },
      take: 100,
    });

    // Shape data for UI expectations
    const shaped = reports.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      format: r.format,
      status: r.status,
      generatedAt: r.generatedAt,
      fileSize: r.fileSize,
      parameters: r.parameters ? JSON.parse(r.parameters) : {},
      generatedBy: r.generatedBy,
    }));

    return successResponse(shaped);
  },
  { requiredPermission: 'reports:read' }
);

// POST /api/reports - Generate and save report
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const rawType = body.type as string | undefined;
    const format = ((body.format as string | undefined) || 'JSON').toUpperCase();
    const requestedBankId = (body.bankId as string | undefined) || undefined;
    const bankId = session.role === 'BANK_USER' ? session.bankId || undefined : requestedBankId;
    const startDate = body.dateFrom || body.startDate;
    const endDate = body.dateTo || body.endDate;

    const type = resolveReportType(rawType);

    let report;

    switch (type) {
      case 'bank-compliance': {
        if (!bankId) return errorResponse('Bank ID is required for compliance report', 400);
        if (!canAccessBank(session.role, session.bankId, bankId)) return errorResponse('Access denied', 403);
        report = await generateBankComplianceReport(bankId);
        break;
      }
      case 'system-summary': {
        if (!['SUPER_ADMIN', 'SUPERVISOR', 'AUDITOR'].includes(session.role)) return errorResponse('Access denied', 403);
        report = await generateSystemSummaryReport();
        break;
      }
      case 'exceptions': {
        if (requestedBankId && !canAccessBank(session.role, session.bankId, requestedBankId)) {
          return errorResponse('Access denied', 403);
        }

        report = await generateExceptionReport(
          bankId,
          startDate ? new Date(startDate) : undefined,
          endDate ? new Date(endDate) : undefined
        );
        break;
      }
      case 'approval-utilization': {
        if (requestedBankId && !canAccessBank(session.role, session.bankId, requestedBankId)) {
          return errorResponse('Access denied', 403);
        }

        report = await getApprovalUtilizationReport(bankId);
        break;
      }
      default:
        return errorResponse('Invalid report type', 400);
    }

    // Persist report metadata
    const serializedParams = JSON.stringify(body || {});
    const reportData = (report as { data: unknown }).data;
    const exportRows =
      format === 'CSV' && Array.isArray(reportData)
        ? reportData.filter(
            (row): row is Record<string, unknown> =>
              typeof row === 'object' && row !== null && !Array.isArray(row)
          )
        : null;
    const exportPayload =
      exportRows
        ? await exportToCSV(
            exportRows,
            Object.keys(exportRows[0] || {})
          )
        : null;
    const payloadSize = Buffer.byteLength(exportPayload ?? JSON.stringify(report), 'utf8');

    const saved = await prisma.report.create({
      data: {
        name: report.title,
        type,
        format,
        status: 'COMPLETED',
        fileSize: payloadSize,
        filePath: null,
        parameters: serializedParams,
        generatedById: session.userId,
      },
      select: {
        id: true,
        name: true,
        type: true,
        format: true,
        status: true,
        generatedAt: true,
        fileSize: true,
      },
    });

    return successResponse({
      report,
      saved,
      exportPreview:
        exportPayload && format === 'CSV'
          ? exportPayload.split('\n').slice(0, 5).join('\n')
          : null,
    });
  },
  { requiredPermission: 'reports:export' }
);
