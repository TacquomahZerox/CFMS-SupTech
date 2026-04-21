'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  FileCheck,
  Clock,
  TrendingUp,
  RefreshCw,
  Check,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface CFMDashboardData {
  overview: {
    totalApprovals: number;
    totalApprovedAmount: number;
    totalUtilizedAmount: number;
    utilizationRate: number;
    expiringCount: number;
  };
  byType: Array<{
    type: string;
    count: number;
    approvedAmount: number;
    utilizedAmount: number;
    utilizationRate: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
    approvedAmount: number;
    utilizedAmount: number;
  }>;
  recentApprovals: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    approvedAmount: number;
    currency: string;
    status: string;
    createdAt: string;
    bank: { code: string; name: string };
  }>;
  expiringApprovals: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    approvedAmount: number;
    currency: string;
    validityEnd: string;
    bank: { code: string; name: string };
  }>;
  topBanks: Array<{
    id: string;
    code: string;
    name: string;
    approvalCount: number;
    totalApproved: number;
    totalUtilized: number;
  }>;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'PENDING': return 'secondary';
    case 'EXPIRED': return 'outline';
    case 'REVOKED': return 'destructive';
    default: return 'outline';
  }
};

export default function CFMDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<CFMDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/cfm');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CFM Officer Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}. Manage capital flow approvals.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/approvals">
            <Button>
              <FileCheck className="h-4 w-4 mr-2" />
              New Approval
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Approvals"
          value={formatNumber(data.overview.totalApprovals)}
          icon={FileCheck}
          description="All time approvals"
        />
        <StatsCard
          title="Total Approved"
          value={formatCurrency(data.overview.totalApprovedAmount, 'USD')}
          icon={Check}
          description="Total approved amount"
        />
        <StatsCard
          title="Utilization Rate"
          value={`${data.overview.utilizationRate}%`}
          icon={TrendingUp}
          description="Of approved amount utilized"
        />
        <StatsCard
          title="Expiring Soon"
          value={formatNumber(data.overview.expiringCount)}
          icon={Clock}
          description="Expiring in 30 days"
        />
      </div>

      {/* Approval Management */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">
            Recent Approvals ({data.recentApprovals.length})
          </TabsTrigger>
          <TabsTrigger value="expiring">
            Expiring Soon ({data.expiringApprovals.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent approvals
                </p>
              ) : (
                <div className="space-y-4">
                  {data.recentApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{approval.referenceNumber}</span>
                          <Badge variant={getStatusVariant(approval.status) as any}>
                            {approval.status}
                          </Badge>
                          <Badge variant="secondary">
                            {approval.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {approval.bank.name} ({approval.bank.code})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {formatDate(approval.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">
                          {formatCurrency(approval.approvedAmount, approval.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring">
          <Card>
            <CardHeader>
              <CardTitle>Expiring Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              {data.expiringApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No approvals expiring soon 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {data.expiringApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{approval.referenceNumber}</span>
                          <Badge variant="outline">
                            {approval.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {approval.bank.name} ({approval.bank.code})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(approval.approvedAmount, approval.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground text-orange-600">
                          Expires: {formatDate(approval.validityEnd)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
