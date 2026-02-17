import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse } from '@/lib/api-utils';

// GET /api/dashboard/cfm - Get CFM officer dashboard data
export const GET = createApiHandler(
  async (request, { session }) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      approvalStats,
      approvalsByType,
      recentApprovals,
      utilizationStats,
      expiringApprovals,
      topBanksByApprovals,
    ] = await Promise.all([
      // Overall approval statistics
      prisma.approval.aggregate({
        _count: true,
        _sum: { approvedAmount: true, utilizedAmount: true },
      }),
      // Approvals by type
      prisma.approval.groupBy({
        by: ['type'],
        _count: true,
        _sum: { approvedAmount: true, utilizedAmount: true },
      }),
      // Recent approvals
      prisma.approval.findMany({
        include: {
          bank: { select: { code: true, name: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Utilization stats by status
      prisma.approval.groupBy({
        by: ['status'],
        _count: true,
        _sum: { approvedAmount: true, utilizedAmount: true },
      }),
      // Expiring approvals (next 30 days)
      prisma.approval.findMany({
        where: {
          status: { in: ['ACTIVE', 'PARTIALLY_UTILIZED'] },
          validityEnd: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          bank: { select: { code: true, name: true } },
        },
        orderBy: { validityEnd: 'asc' },
        take: 10,
      }),
      // Banks by approval count
      prisma.bank.findMany({
        include: {
          _count: { select: { approvals: true } },
          approvals: {
            select: { approvedAmount: true, utilizedAmount: true },
          },
        },
        where: { isActive: true },
        take: 10,
      }),
    ]);

    // Process approvals by type
    type ApprovalByTypeType = { type: string; _count: number; _sum: { approvedAmount: number | null; utilizedAmount: number | null } };
    const byType = approvalsByType.map((t: ApprovalByTypeType) => ({
      type: t.type,
      count: t._count,
      approvedAmount: t._sum.approvedAmount || 0,
      utilizedAmount: t._sum.utilizedAmount || 0,
      utilizationRate: t._sum.approvedAmount
        ? Math.round((t._sum.utilizedAmount || 0) / t._sum.approvedAmount * 100)
        : 0,
    }));

    // Process status distribution
    type UtilizationStatType = { status: string; _count: number; _sum: { approvedAmount: number | null; utilizedAmount: number | null } };
    const byStatus = utilizationStats.map((s: UtilizationStatType) => ({
      status: s.status,
      count: s._count,
      approvedAmount: s._sum.approvedAmount || 0,
      utilizedAmount: s._sum.utilizedAmount || 0,
    }));

    // Calculate overall utilization rate
    const totalApproved = approvalStats._sum.approvedAmount || 0;
    const totalUtilized = approvalStats._sum.utilizedAmount || 0;
    const overallUtilizationRate = totalApproved > 0 
      ? Math.round((totalUtilized / totalApproved) * 100) 
      : 0;

    // Process top banks
    type BankApprovalType = typeof topBanksByApprovals[number];
    type ApprovalSumType = { approvedAmount: number; utilizedAmount: number };
    type BankResultType = { id: string; code: string; name: string; approvalCount: number; totalApproved: number; totalUtilized: number };
    const banksByApprovals = topBanksByApprovals
      .map((b: BankApprovalType) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        approvalCount: b._count.approvals,
        totalApproved: b.approvals.reduce((sum: number, a: ApprovalSumType) => sum + a.approvedAmount, 0),
        totalUtilized: b.approvals.reduce((sum: number, a: ApprovalSumType) => sum + a.utilizedAmount, 0),
      }))
      .sort((a: BankResultType, b: BankResultType) => b.totalApproved - a.totalApproved)
      .slice(0, 5);

    return successResponse({
      overview: {
        totalApprovals: approvalStats._count,
        totalApprovedAmount: totalApproved,
        totalUtilizedAmount: totalUtilized,
        utilizationRate: overallUtilizationRate,
        expiringCount: expiringApprovals.length,
      },
      byType,
      byStatus,
      recentApprovals,
      expiringApprovals,
      topBanks: banksByApprovals,
    });
  },
  { requiredPermission: 'approvals:read' }
);
