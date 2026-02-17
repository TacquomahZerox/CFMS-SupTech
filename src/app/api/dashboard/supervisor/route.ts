import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse } from '@/lib/api-utils';

// GET /api/dashboard/supervisor - Get supervisor dashboard data
export const GET = createApiHandler(
  async (request, { session }) => {
    const [
      bankStats,
      transactionStats,
      exceptionStats,
      recentExceptions,
      riskDistribution,
      recentSubmissions,
      topRiskBanks,
    ] = await Promise.all([
      // Bank statistics
      prisma.bank.aggregate({
        _count: true,
        where: { isActive: true },
      }),
      // Transaction statistics
      prisma.transaction.aggregate({
        _count: true,
        _sum: { amount: true },
      }),
      // Exception statistics
      prisma.exception.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Recent exceptions
      prisma.exception.findMany({
        where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } },
        include: {
          bank: { select: { code: true, name: true } },
          transaction: { select: { referenceNumber: true, type: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Risk grade distribution
      prisma.riskScore.groupBy({
        by: ['grade'],
        _count: true,
        where: {
          calculatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      // Recent submissions
      prisma.submission.findMany({
        include: {
          bank: { select: { code: true, name: true } },
          submittedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { submittedAt: 'desc' },
        take: 5,
      }),
      // Top risk banks
      prisma.bank.findMany({
        where: { isActive: true },
        include: {
          riskScores: {
            orderBy: { calculatedAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              exceptions: { where: { status: 'OPEN' } },
            },
          },
        },
        take: 10,
      }),
    ]);

    // Process exception stats
    const exceptionStatusCounts = Object.fromEntries(
      exceptionStats.map((e: { status: string; _count: number }) => [e.status, e._count])
    );

    // Process risk distribution
    const riskGradeCounts = Object.fromEntries(
      riskDistribution.map((r: { grade: string; _count: number }) => [r.grade, r._count])
    );

    // Sort banks by risk score
    type RiskBankType = typeof topRiskBanks[number];
    const sortedRiskBanks = topRiskBanks
      .filter((b: RiskBankType) => b.riskScores.length > 0)
      .sort((a: RiskBankType, b: RiskBankType) => {
        const scoreA = a.riskScores[0]?.score || 0;
        const scoreB = b.riskScores[0]?.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, 5)
      .map((b: RiskBankType) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        score: b.riskScores[0]?.score || 0,
        grade: b.riskScores[0]?.grade || 'N/A',
        openExceptions: b._count.exceptions,
      }));

    return successResponse({
      overview: {
        totalBanks: bankStats._count,
        totalTransactions: transactionStats._count,
        totalVolume: transactionStats._sum.amount || 0,
        openExceptions: exceptionStatusCounts['OPEN'] || 0,
        underReviewExceptions: exceptionStatusCounts['UNDER_REVIEW'] || 0,
      },
      riskDistribution: {
        A: riskGradeCounts['A'] || 0,
        B: riskGradeCounts['B'] || 0,
        C: riskGradeCounts['C'] || 0,
        D: riskGradeCounts['D'] || 0,
      },
      recentExceptions,
      recentSubmissions,
      topRiskBanks: sortedRiskBanks,
    });
  },
  { requiredPermission: 'risk:read' }
);
