'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileCheck,
  ArrowRightLeft,
  AlertTriangle,
  Clock,
  RefreshCw,
  Upload,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface BankDashboardData {
  bank: {
    id: string;
    code: string;
    name: string;
    riskGrade: string;
    riskScore: number;
  };
  stats: {
    activeApprovals: number;
    totalApprovalLimit: number;
    totalTransactions: number;
    totalVolume: number;
    openExceptions: number;
    pendingSubmissions: number;
  };
  recentApprovals: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    validFrom: string;
    validTo: string;
  }>;
  recentExceptions: Array<{
    id: string;
    code: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    transaction?: { referenceNumber: string };
  }>;
}

const getRiskGradeColor = (grade: string) => {
  switch (grade) {
    case 'A': return 'bg-green-500';
    case 'B': return 'bg-blue-500';
    case 'C': return 'bg-yellow-500';
    case 'D': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'destructive';
    case 'HIGH': return 'destructive';
    case 'MEDIUM': return 'default';
    case 'LOW': return 'secondary';
    default: return 'outline';
  }
};

export default function BankDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<BankDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/bank');
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
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
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
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{data.bank.name}</h1>
            <Badge className={getRiskGradeColor(data.bank.riskGrade)}>
              Grade {data.bank.riskGrade}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}. Risk Score: {data.bank.riskScore.toFixed(1)}%
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Link href="/submissions/new">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              New Submission
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Approvals"
          value={formatNumber(data.stats.activeApprovals)}
          icon={FileCheck}
          description={formatCurrency(data.stats.totalApprovalLimit, 'USD') + ' total limit'}
        />
        <StatsCard
          title="Total Transactions"
          value={formatNumber(data.stats.totalTransactions)}
          icon={ArrowRightLeft}
          description={formatCurrency(data.stats.totalVolume, 'USD') + ' volume'}
        />
        <StatsCard
          title="Open Exceptions"
          value={formatNumber(data.stats.openExceptions)}
          icon={AlertTriangle}
          description="Requires attention"
        />
        <StatsCard
          title="Pending Submissions"
          value={formatNumber(data.stats.pendingSubmissions)}
          icon={Clock}
          description="Awaiting processing"
        />
      </div>

      {/* Recent Approvals & Exceptions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Approvals</CardTitle>
            <Link href="/approvals">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentApprovals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active approvals
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{approval.referenceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {approval.type.replace('_', ' ')} • Valid until {formatDate(approval.validTo)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatCurrency(approval.amount, approval.currency)}
                      </p>
                      <Badge variant={approval.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {approval.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Exceptions</CardTitle>
            <Link href="/exceptions">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentExceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open exceptions 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentExceptions.map((exception) => (
                  <div
                    key={exception.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityVariant(exception.severity) as any}>
                          {exception.severity}
                        </Badge>
                        <span className="text-sm font-medium">{exception.code}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {exception.description}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(exception.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
