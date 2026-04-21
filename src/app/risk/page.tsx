'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  RefreshCw,
  Play,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { formatNumber, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface RiskScore {
  id: string;
  score: number;
  grade: string;
  mismatchRate: number;
  unapprovedRate: number;
  lateSubmissionRate: number;
  dataQualityScore: number;
  repeatViolationRate: number;
  calculatedAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
}

interface Bank {
  id: string;
  code: string;
  name: string;
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

const getScoreColor = (score: number) => {
  if (score <= 25) return 'text-green-600';
  if (score <= 50) return 'text-blue-600';
  if (score <= 75) return 'text-yellow-600';
  return 'text-red-600';
};

export default function RiskAnalysisPage() {
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>('__all__');
  const [gradeFilter, setGradeFilter] = useState<string>('__all__');

  const fetchRiskScores = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/risk/score?view=ranking');
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const scores = result.data.map((bank: any) => ({
          id: bank.bankId,
          score: bank.score,
          grade: bank.grade,
          mismatchRate: 0,
          unapprovedRate: 0,
          lateSubmissionRate: 0,
          dataQualityScore: 0,
          repeatViolationRate: 0,
          calculatedAt: bank.scoringDate,
          bank: {
            id: bank.bankId,
            code: bank.bankCode,
            name: bank.bankName,
            isActive: true,
          },
        }));
        setRiskScores(scores);
      }
    } catch (error) {
      console.error('Failed to fetch risk scores:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBanks = async () => {
    try {
      const response = await fetch('/api/banks');
      const result = await response.json();
      if (result.success) {
        setBanks(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch banks:', error);
    }
  };

  useEffect(() => {
    fetchRiskScores();
    fetchBanks();
  }, []);

  const runRiskScoring = async () => {
    setIsRunning(true);
    try {
      const body = selectedBank && selectedBank !== '__all__' ? { bankId: selectedBank } : { all: true };
      await fetch('/api/risk/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await fetchRiskScores();
    } catch (error) {
      console.error('Failed to run risk scoring:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const filteredScores = riskScores.filter((score) => {
    if (selectedBank !== '__all__' && score.bank.id !== selectedBank) return false;
    if (gradeFilter && gradeFilter !== '__all__' && score.grade !== gradeFilter) return false;
    return true;
  });

  const distribution = {
    A: riskScores.filter(s => s.grade === 'A').length,
    B: riskScores.filter(s => s.grade === 'B').length,
    C: riskScores.filter(s => s.grade === 'C').length,
    D: riskScores.filter(s => s.grade === 'D').length,
  };

  const avgScore = riskScores.length > 0
    ? riskScores.reduce((sum, s) => sum + s.score, 0) / riskScores.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Risk Analysis</h1>
          <p className="text-muted-foreground">
            Monitor and analyze bank risk scores
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRiskScores}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Banks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Banks</SelectItem>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.code} - {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={runRiskScoring} disabled={isRunning}>
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run Scoring'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{riskScores.length}</p>
              <p className="text-sm text-muted-foreground">Banks Scored</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{distribution.A}</p>
              <p className="text-sm text-muted-foreground">Grade A</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{distribution.B}</p>
              <p className="text-sm text-muted-foreground">Grade B</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{distribution.C}</p>
              <p className="text-sm text-muted-foreground">Grade C</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{distribution.D}</p>
              <p className="text-sm text-muted-foreground">Grade D</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution Visual */}
      <Card>
        <CardHeader>
          <CardTitle>Risk Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-8 rounded-lg overflow-hidden flex">
              {distribution.A > 0 && (
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(distribution.A / riskScores.length) * 100}%` }}
                >
                  {distribution.A}
                </div>
              )}
              {distribution.B > 0 && (
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(distribution.B / riskScores.length) * 100}%` }}
                >
                  {distribution.B}
                </div>
              )}
              {distribution.C > 0 && (
                <div
                  className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(distribution.C / riskScores.length) * 100}%` }}
                >
                  {distribution.C}
                </div>
              )}
              {distribution.D > 0 && (
                <div
                  className="bg-red-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(distribution.D / riskScores.length) * 100}%` }}
                >
                  {distribution.D}
                </div>
              )}
            </div>
            <div className="text-right w-32">
              <p className="text-sm text-muted-foreground">Average Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                {avgScore.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Grades</SelectItem>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
                <SelectItem value="C">Grade C</SelectItem>
                <SelectItem value="D">Grade D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Risk Scores Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Risk Scores ({filteredScores.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredScores.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No risk scores found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Run risk scoring to calculate bank risk grades
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Mismatch Rate</TableHead>
                  <TableHead>Unapproved Rate</TableHead>
                  <TableHead>Late Submission</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScores
                  .sort((a, b) => b.score - a.score)
                  .map((score, index) => (
                    <TableRow key={score.id}>
                      <TableCell className="font-medium">#{index + 1}</TableCell>
                      <TableCell>
                        <Link href={`/banks/${score.bank.id}`} className="hover:underline">
                          <span className="font-medium">{score.bank.code}</span>
                          <br />
                          <span className="text-sm text-muted-foreground">{score.bank.name}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className={`font-bold text-lg ${getScoreColor(score.score)}`}>
                          {score.score.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getRiskGradeColor(score.grade)}>
                          Grade {score.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>{(score.mismatchRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{(score.unapprovedRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{(score.lateSubmissionRate * 100).toFixed(1)}%</TableCell>
                      <TableCell>{formatDate(score.calculatedAt)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
