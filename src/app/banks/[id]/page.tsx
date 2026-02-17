'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  Building2,
  ArrowLeft,
  FileCheck,
  ArrowRightLeft,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface BankDetail {
  id: string;
  code: string;
  name: string;
  swiftCode: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  branches: Array<{
    id: string;
    code: string;
    name: string;
    address: string | null;
    isActive: boolean;
  }>;
  approvals: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    approvedAmount: number;
    currency: string;
    status: string;
    validityStart: string;
    validityEnd: string;
  }>;
  transactions: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    currency: string;
    transactionDate: string;
  }>;
  exceptions: Array<{
    id: string;
    code: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
  riskScores: Array<{
    score: number;
    grade: string;
    mismatchRate: number;
    unapprovedRate: number;
    lateSubmissionRate: number;
    calculatedAt: string;
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

export default function BankDetailPage() {
  const params = useParams();
  const bankId = params.id as string;
  const [bank, setBank] = useState<BankDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBank = async () => {
      try {
        const response = await fetch(`/api/banks/${bankId}`);
        const result = await response.json();
        if (result.success) {
          setBank(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch bank:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (bankId) {
      fetchBank();
    }
  }, [bankId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Bank not found</p>
        <Link href="/banks">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Banks
          </Button>
        </Link>
      </div>
    );
  }

  const latestRisk = bank.riskScores?.[0];
  const openExceptions = (bank.exceptions || []).filter(e => e.status === 'OPEN' || e.status === 'UNDER_REVIEW').length;
  const activeApprovals = (bank.approvals || []).filter(a => a.status === 'ACTIVE').length;
  const totalTxVolume = (bank.transactions || []).reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/banks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{bank.name}</h1>
              <Badge variant={bank.isActive ? 'default' : 'secondary'}>
                {bank.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {latestRisk && (
                <Badge className={getRiskGradeColor(latestRisk.grade)}>
                  Grade {latestRisk.grade}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Code: {bank.code}</p>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            {bank.swiftCode && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">SWIFT: {bank.swiftCode}</span>
              </div>
            )}
            {bank.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{bank.address}</span>
              </div>
            )}
            {bank.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{bank.contactEmail}</span>
              </div>
            )}
            {bank.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{bank.contactPhone}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Approvals"
          value={formatNumber(activeApprovals)}
          icon={FileCheck}
          description={`${bank.approvals.length} total`}
        />
        <StatsCard
          title="Total Transactions"
          value={formatNumber(bank.transactions.length)}
          icon={ArrowRightLeft}
          description={formatCurrency(totalTxVolume, 'USD') + ' volume'}
        />
        <StatsCard
          title="Open Exceptions"
          value={formatNumber(openExceptions)}
          icon={AlertTriangle}
          description={`${bank.exceptions.length} total`}
        />
        <StatsCard
          title="Risk Score"
          value={latestRisk ? `${latestRisk.score.toFixed(1)}%` : 'N/A'}
          icon={TrendingUp}
          description={latestRisk ? `Grade ${latestRisk.grade}` : 'Not scored'}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="approvals" className="w-full">
        <TabsList>
          <TabsTrigger value="approvals">Approvals ({(bank.approvals || []).length})</TabsTrigger>
          <TabsTrigger value="transactions">Transactions ({(bank.transactions || []).length})</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions ({(bank.exceptions || []).length})</TabsTrigger>
          <TabsTrigger value="branches">Branches ({(bank.branches || []).length})</TabsTrigger>
          <TabsTrigger value="risk">Risk History ({(bank.riskScores || []).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          <Card>
            <CardContent className="pt-6">
              {(bank.approvals || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No approvals</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Valid Period</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bank.approvals || []).slice(0, 10).map((approval) => (
                      <TableRow key={approval.id}>
                        <TableCell className="font-medium">{approval.referenceNumber}</TableCell>
                        <TableCell>{approval.type.replace('_', ' ')}</TableCell>
                        <TableCell>{formatCurrency(approval.approvedAmount, approval.currency)}</TableCell>
                        <TableCell>
                          {formatDate(approval.validityStart)} - {formatDate(approval.validityEnd)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={approval.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {approval.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="pt-6">
              {(bank.transactions || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No transactions</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bank.transactions || []).slice(0, 10).map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.referenceNumber}</TableCell>
                        <TableCell>{tx.type.replace('_', ' ')}</TableCell>
                        <TableCell>{formatCurrency(tx.amount, tx.currency)}</TableCell>
                        <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions">
          <Card>
            <CardContent className="pt-6">
              {(bank.exceptions || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No exceptions 🎉</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bank.exceptions || []).slice(0, 10).map((exc) => (
                      <TableRow key={exc.id}>
                        <TableCell className="font-medium">{exc.code}</TableCell>
                        <TableCell className="max-w-xs truncate">{exc.description}</TableCell>
                        <TableCell>
                          <Badge variant={getSeverityVariant(exc.severity) as any}>
                            {exc.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{exc.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(exc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches">
          <Card>
            <CardContent className="pt-6">
              {(bank.branches || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No branches</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bank.branches || []).map((branch) => (
                      <TableRow key={branch.id}>
                        <TableCell className="font-medium">{branch.code}</TableCell>
                        <TableCell>{branch.name}</TableCell>
                        <TableCell>{branch.address || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                            {branch.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk">
          <Card>
            <CardContent className="pt-6">
              {(bank.riskScores || []).length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No risk scores calculated</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Mismatch Rate</TableHead>
                      <TableHead>Unapproved Rate</TableHead>
                      <TableHead>Late Submission Rate</TableHead>
                      <TableHead>Calculated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(bank.riskScores || []).map((score, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{score.score.toFixed(2)}%</TableCell>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
