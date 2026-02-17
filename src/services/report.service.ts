import prisma from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReportData {
  title: string;
  generatedAt: string;
  data: Record<string, unknown>;
}

export async function generateBankComplianceReport(bankId: string): Promise<ReportData> {
  const bank = await prisma.bank.findUnique({
    where: { id: bankId },
    include: {
      riskScores: {
        orderBy: { calculatedAt: 'desc' },
        take: 1,
      },
      _count: {
        select: {
          transactions: true,
          approvals: true,
          exceptions: true,
        },
      },
    },
  });

  if (!bank) {
    throw new Error('Bank not found');
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [
    recentTransactions,
    openExceptions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        bankId,
        transactionDate: { gte: threeMonthsAgo },
      },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    }),
    prisma.exception.findMany({
      where: {
        bankId,
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const latestScore = bank.riskScores[0];

  return {
    title: `Compliance Report - ${bank.name}`,
    generatedAt: new Date().toISOString(),
    data: {
      bankInfo: {
        code: bank.code,
        name: bank.name,
        status: bank.isActive ? 'Active' : 'Inactive',
      },
      riskAssessment: latestScore ? {
        score: latestScore.score,
        grade: latestScore.grade,
        scoringDate: formatDate(latestScore.calculatedAt),
        components: {
          mismatch: latestScore.mismatchRate,
          unapprovedTransactions: latestScore.unapprovedRate,
          lateSubmissions: latestScore.lateSubmissionRate,
          dataQuality: latestScore.dataQualityScore,
          repeatViolations: latestScore.repeatViolationRate,
        },
      } : null,
      statistics: {
        totalTransactions: bank._count.transactions,
        totalApprovals: bank._count.approvals,
        totalExceptions: bank._count.exceptions,
        openExceptions: openExceptions.length,
      },
      openExceptions: openExceptions.map((ex: { code: string; description: string; severity: string; status: string; createdAt: Date }) => ({
        code: ex.code,
        description: ex.description,
        severity: ex.severity,
        status: ex.status,
        createdAt: formatDate(ex.createdAt),
      })),
      recentTransactionSummary: {
        count: recentTransactions.length,
        totalAmount: recentTransactions.reduce((sum: number, tx: { amount: number }) => sum + tx.amount, 0),
      },
    },
  };
}

export async function generateSystemSummaryReport(): Promise<ReportData> {
  const [
    bankStats,
    transactionStats,
    exceptionStats,
    riskDistribution,
    recentActivity,
  ] = await Promise.all([
    prisma.bank.aggregate({
      _count: true,
      where: { isActive: true },
    }),
    prisma.transaction.aggregate({
      _count: true,
      _sum: { amount: true },
    }),
    prisma.exception.groupBy({
      by: ['severity', 'status'],
      _count: true,
    }),
    prisma.riskScore.groupBy({
      by: ['grade'],
      _count: true,
      orderBy: { grade: 'asc' },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  return {
    title: 'System Summary Report',
    generatedAt: new Date().toISOString(),
    data: {
      overview: {
        activeBanks: bankStats._count,
        totalTransactions: transactionStats._count,
        totalVolume: transactionStats._sum.amount || 0,
      },
      exceptionAnalysis: exceptionStats.reduce((acc: Record<string, number>, stat: { severity: string; status: string; _count: number }) => {
        const key = `${stat.severity}_${stat.status}`;
        acc[key] = stat._count;
        return acc;
      }, {} as Record<string, number>),
      riskDistribution: riskDistribution.reduce((acc: Record<string, number>, r: { grade: string; _count: number }) => {
        acc[r.grade] = r._count;
        return acc;
      }, {} as Record<string, number>),
      recentActivity: recentActivity.map((log: { action: string; entityType: string; user: { firstName: string; lastName: string } | null; createdAt: Date }) => ({
        action: log.action,
        entityType: log.entityType,
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
        timestamp: formatDate(log.createdAt),
      })),
    },
  };
}

export async function generateExceptionReport(
  bankId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReportData> {
  const where: Record<string, unknown> = {};
  if (bankId) where.bankId = bankId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const exceptions = await prisma.exception.findMany({
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
  });

  type ExceptionType = typeof exceptions[number];
  
  const summary = {
    total: exceptions.length,
    bySeverity: {
      critical: exceptions.filter((e: ExceptionType) => e.severity === 'CRITICAL').length,
      high: exceptions.filter((e: ExceptionType) => e.severity === 'HIGH').length,
      medium: exceptions.filter((e: ExceptionType) => e.severity === 'MEDIUM').length,
      low: exceptions.filter((e: ExceptionType) => e.severity === 'LOW').length,
    },
    byStatus: {
      open: exceptions.filter((e: ExceptionType) => e.status === 'OPEN').length,
      underReview: exceptions.filter((e: ExceptionType) => e.status === 'UNDER_REVIEW').length,
      resolved: exceptions.filter((e: ExceptionType) => e.status === 'RESOLVED').length,
      waived: exceptions.filter((e: ExceptionType) => e.status === 'WAIVED').length,
    },
  };

  return {
    title: 'Exception Report',
    generatedAt: new Date().toISOString(),
    data: {
      summary,
      exceptions: exceptions.map((ex: ExceptionType) => ({
        id: ex.id,
        code: ex.code,
        description: ex.description,
        severity: ex.severity,
        status: ex.status,
        bank: ex.bank ? `${ex.bank.code} - ${ex.bank.name}` : 'N/A',
        transaction: ex.transaction ? {
          reference: ex.transaction.referenceNumber,
          type: ex.transaction.type,
          amount: formatCurrency(ex.transaction.amount, ex.transaction.currency),
          date: formatDate(ex.transaction.transactionDate),
        } : null,
        createdAt: formatDate(ex.createdAt),
        resolution: ex.resolution,
        resolvedAt: ex.resolvedAt ? formatDate(ex.resolvedAt) : null,
      })),
    },
  };
}

export async function exportToCSV(data: Record<string, unknown>[], headers: string[]): Promise<string> {
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export async function getApprovalUtilizationReport(bankId?: string): Promise<ReportData> {
  const where = bankId ? { bankId } : {};

  const approvals = await prisma.approval.findMany({
    where,
    include: {
      bank: { select: { code: true, name: true } },
      _count: { select: { transactions: true } },
    },
    orderBy: { validityEnd: 'asc' },
  });

  type ApprovalType = typeof approvals[number];
  
  const summary = {
    total: approvals.length,
    byStatus: {
      active: approvals.filter((a: ApprovalType) => a.status === 'ACTIVE').length,
      pending: approvals.filter((a: ApprovalType) => a.status === 'PENDING').length,
      expired: approvals.filter((a: ApprovalType) => a.status === 'EXPIRED').length,
      exhausted: approvals.filter((a: ApprovalType) => a.status === 'EXHAUSTED').length,
      revoked: approvals.filter((a: ApprovalType) => a.status === 'REVOKED').length,
    },
    totalApproved: approvals.reduce((sum: number, a: ApprovalType) => sum + a.approvedAmount, 0),
    totalUtilized: approvals.reduce((sum: number, a: ApprovalType) => sum + a.utilizedAmount, 0),
  };

  return {
    title: 'Approval Utilization Report',
    generatedAt: new Date().toISOString(),
    data: {
      summary,
      utilizationRate: summary.totalApproved > 0 
        ? Math.round((summary.totalUtilized / summary.totalApproved) * 100) 
        : 0,
      approvals: approvals.map((a: ApprovalType) => ({
        referenceNumber: a.referenceNumber,
        bank: `${a.bank.code} - ${a.bank.name}`,
        type: a.type,
        approvedAmount: formatCurrency(a.approvedAmount, a.currency),
        utilizedAmount: formatCurrency(a.utilizedAmount, a.currency),
        utilizationPercent: a.approvedAmount > 0
          ? Math.round((a.utilizedAmount / a.approvedAmount) * 100)
          : 0,
        status: a.status,
        validityStart: formatDate(a.validityStart),
        validityEnd: formatDate(a.validityEnd),
        transactionCount: a._count.transactions,
      })),
    },
  };
}
