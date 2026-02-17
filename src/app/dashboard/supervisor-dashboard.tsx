'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatsCard } from '@/components/dashboard/stats-card';
import { RiskDistributionChart, ExceptionSeverityChart } from '@/components/dashboard/charts';
import { RiskRankingTable } from '@/components/dashboard/risk-ranking-table';
import { RecentExceptionsTable } from '@/components/dashboard/recent-exceptions-table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  ArrowRightLeft,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Play,
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';

interface DashboardData {
  overview: {
    totalBanks: number;
    totalTransactions: number;
    totalVolume: number;
    openExceptions: number;
    underReviewExceptions: number;
  };
  riskDistribution: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  recentExceptions: Array<{
    id: string;
    code: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
    bank: { code: string; name: string };
    transaction?: { referenceNumber: string; type: string };
  }>;
  topRiskBanks: Array<{
    id: string;
    code: string;
    name: string;
    score: number;
    grade: string;
    openExceptions: number;
  }>;
}

export default function SupervisorDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningScoring, setIsRunningScoring] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/supervisor');
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

  const handleRunScoring = async () => {
    setIsRunningScoring(true);
    try {
      await fetch('/api/risk/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      await fetchDashboardData();
    } catch (error) {
      console.error('Failed to run scoring:', error);
    } finally {
      setIsRunningScoring(false);
    }
  };

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
          <h1 className="text-3xl font-bold">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.firstName}. Here&apos;s your compliance overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleRunScoring} disabled={isRunningScoring}>
            <Play className="h-4 w-4 mr-2" />
            {isRunningScoring ? 'Running...' : 'Run Risk Scoring'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Banks"
          value={formatNumber(data.overview.totalBanks)}
          icon={Building2}
          description="Active regulated banks"
        />
        <StatsCard
          title="Total Transactions"
          value={formatNumber(data.overview.totalTransactions)}
          icon={ArrowRightLeft}
          description="All recorded transactions"
        />
        <StatsCard
          title="Open Exceptions"
          value={formatNumber(data.overview.openExceptions)}
          icon={AlertTriangle}
          description={`${data.overview.underReviewExceptions} under review`}
        />
        <StatsCard
          title="High Risk Banks"
          value={formatNumber(data.riskDistribution.C + data.riskDistribution.D)}
          icon={TrendingUp}
          description="Grade C or D banks"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <RiskDistributionChart data={data.riskDistribution} />
        <ExceptionSeverityChart
          data={{
            critical: data.recentExceptions.filter(e => e.severity === 'CRITICAL').length,
            high: data.recentExceptions.filter(e => e.severity === 'HIGH').length,
            medium: data.recentExceptions.filter(e => e.severity === 'MEDIUM').length,
            low: data.recentExceptions.filter(e => e.severity === 'LOW').length,
          }}
        />
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Risk Banks</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskRankingTable banks={data.topRiskBanks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Exceptions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentExceptionsTable exceptions={data.recentExceptions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
