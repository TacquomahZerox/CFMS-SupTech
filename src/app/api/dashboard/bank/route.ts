import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';

// GET /api/dashboard/bank - Get bank-specific dashboard data
export const GET = createApiHandler(
  async (request, { session }) => {
    const bankId = session.bankId;

    if (!bankId) {
      return errorResponse('Bank ID not found', 400);
    }

    const [
      bank,
      transactionStats,
      activeApprovals,
      openExceptions,
      pendingSubmissions,
      recentApprovals,
      recentExceptions,
      riskHistory,
    ] = await Promise.all([
      // Bank info
      prisma.bank.findUnique({
        where: { id: bankId },
        select: { id: true, code: true, name: true },
      }),
      // Transaction statistics
      prisma.transaction.aggregate({
        where: { bankId },
        _count: true,
        _sum: { amount: true },
      }),
      // Active approval count + total limit
      prisma.approval.aggregate({
        where: { bankId, status: 'ACTIVE' },
        _count: true,
        _sum: { approvedAmount: true },
      }),
      // Open exceptions count
      prisma.exception.count({
        where: { bankId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      // Pending submissions count
      prisma.submission.count({
        where: { bankId, status: 'PENDING' },
      }),
      // Recent approvals for the table
      prisma.approval.findMany({
        where: { bankId },
        orderBy: { createdAt: 'desc' },
        take: 5,
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
      }),
      // Recent exceptions for the table
      prisma.exception.findMany({
        where: { bankId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          code: true,
          description: true,
          severity: true,
          status: true,
          createdAt: true,
          transaction: { select: { referenceNumber: true } },
        },
      }),
      // Risk history
      prisma.riskScore.findMany({
        where: { bankId },
        orderBy: { calculatedAt: 'desc' },
        take: 6,
      }),
    ]);

    const latestRiskScore = riskHistory[0];

    // Shape data exactly as the frontend expects
    return successResponse({
      bank: {
        id: bank?.id || '',
        code: bank?.code || '',
        name: bank?.name || '',
        riskGrade: latestRiskScore?.grade || 'N/A',
        riskScore: latestRiskScore?.score || 0,
      },
      stats: {
        activeApprovals: activeApprovals._count || 0,
        totalApprovalLimit: activeApprovals._sum.approvedAmount || 0,
        totalTransactions: transactionStats._count || 0,
        totalVolume: transactionStats._sum.amount || 0,
        openExceptions: openExceptions,
        pendingSubmissions: pendingSubmissions,
      },
      recentApprovals: recentApprovals.map((a) => ({
        id: a.id,
        referenceNumber: a.referenceNumber,
        type: a.type,
        amount: a.approvedAmount,
        currency: a.currency,
        status: a.status,
        validFrom: a.validityStart,
        validTo: a.validityEnd,
      })),
      recentExceptions: recentExceptions.map((e) => ({
        id: e.id,
        code: e.code,
        description: e.description,
        severity: e.severity,
        status: e.status,
        createdAt: e.createdAt,
        transaction: e.transaction,
      })),
      riskHistory: riskHistory.map((r) => ({
        score: r.score,
        grade: r.grade,
        date: r.calculatedAt,
      })),
    });
  },
  // BANK_USER has 'banks:read:own' — use a permission they have
  { requiredPermission: 'banks:read' }
);
