'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  ArrowRightLeft,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  FileCheck,
  AlertTriangle,
  Globe,
  User,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface TransactionDetail {
  id: string;
  referenceNumber: string;
  type: string;
  amount: number;
  currency: string;
  exchangeRate: number | null;
  transactionDate: string;
  valueDate: string;
  counterpartyName: string | null;
  counterpartyCountry: string | null;
  counterpartyAccount: string | null;
  purpose: string | null;
  documentReference: string | null;
  createdAt: string;
  updatedAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  branch: {
    code: string;
    name: string;
  } | null;
  approval: {
    id: string;
    referenceNumber: string;
    type: string;
    approvedAmount: number;
    utilizedAmount: number;
    currency: string;
    status: string;
    validityStart: string;
    validityEnd: string;
  } | null;
  exceptions: Array<{
    id: string;
    code: string;
    description: string;
    severity: string;
    status: string;
    createdAt: string;
  }>;
}

const formatTransactionType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'destructive';
    case 'HIGH': return 'destructive';
    case 'MEDIUM': return 'secondary';
    case 'LOW': return 'outline';
    default: return 'outline';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'OPEN': return 'destructive';
    case 'UNDER_REVIEW': return 'secondary';
    case 'RESOLVED': return 'default';
    case 'WAIVED': return 'outline';
    default: return 'outline';
  }
};

export default function TransactionDetailPage() {
  const params = useParams();
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/transactions/${params.id}`);
      const result = await response.json();
      
      if (result.success) {
        setTransaction(result.data);
      } else {
        setError(result.error || 'Failed to load transaction');
      }
    } catch (err) {
      setError('Failed to load transaction');
      console.error('Failed to fetch transaction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTransaction();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Transaction Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The transaction you are looking for does not exist.'}</p>
            <Link href="/transactions">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Transactions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasExceptions = transaction.exceptions.length > 0;
  const openExceptions = transaction.exceptions.filter(e => e.status === 'OPEN').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <ArrowRightLeft className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{transaction.referenceNumber}</h1>
                <p className="text-muted-foreground">{formatTransactionType(transaction.type)}</p>
              </div>
            </div>
          </div>
        </div>
        {hasExceptions && (
          <Badge variant="destructive" className="text-sm">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {openExceptions} Open Exception{openExceptions !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Amount"
          value={formatCurrency(transaction.amount, transaction.currency)}
          icon={DollarSign}
          description={transaction.exchangeRate ? `Rate: ${transaction.exchangeRate}` : 'Spot transaction'}
        />
        <StatsCard
          title="Transaction Date"
          value={formatDate(transaction.transactionDate)}
          icon={Calendar}
          description={`Value: ${formatDate(transaction.valueDate)}`}
        />
        <StatsCard
          title="Bank"
          value={transaction.bank.code}
          icon={Building2}
          description={transaction.bank.name}
        />
        <StatsCard
          title="Exceptions"
          value={hasExceptions ? `${openExceptions} Open` : 'None'}
          icon={AlertTriangle}
          description={hasExceptions ? `${transaction.exceptions.length} total` : 'Clean transaction'}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Transaction Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Transaction Details</CardTitle>
            <CardDescription>Complete information about this transaction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{transaction.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{formatTransactionType(transaction.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="font-medium">{formatCurrency(transaction.amount, transaction.currency)}</p>
                </div>
                {transaction.exchangeRate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Exchange Rate</p>
                    <p className="font-medium">{transaction.exchangeRate}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Date</p>
                  <p className="font-medium">{formatDate(transaction.transactionDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Value Date</p>
                  <p className="font-medium">{formatDate(transaction.valueDate)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <Link href={`/banks/${transaction.bank.id}`} className="font-medium text-primary hover:underline">
                    {transaction.bank.name} ({transaction.bank.code})
                  </Link>
                </div>
                {transaction.branch && (
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-medium">{transaction.branch.name} ({transaction.branch.code})</p>
                  </div>
                )}
                {transaction.counterpartyName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Counterparty</p>
                    <p className="font-medium">{transaction.counterpartyName}</p>
                    {transaction.counterpartyCountry && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {transaction.counterpartyCountry}
                      </p>
                    )}
                  </div>
                )}
                {transaction.counterpartyAccount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Counterparty Account</p>
                    <p className="font-medium font-mono text-sm">{transaction.counterpartyAccount}</p>
                  </div>
                )}
                {transaction.documentReference && (
                  <div>
                    <p className="text-sm text-muted-foreground">Document Reference</p>
                    <p className="font-medium">{transaction.documentReference}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(transaction.createdAt)}</p>
                </div>
              </div>
            </div>

            {transaction.purpose && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Purpose</p>
                <p className="text-sm">{transaction.purpose}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Approval */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4" />
                Linked Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transaction.approval ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <Link 
                      href={`/approvals/${transaction.approval.id}`} 
                      className="font-medium text-primary hover:underline"
                    >
                      {transaction.approval.referenceNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{formatTransactionType(transaction.approval.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={transaction.approval.status === 'ACTIVE' ? 'default' : 'outline'}>
                      {transaction.approval.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Utilization</p>
                    <p className="font-medium">
                      {formatCurrency(transaction.approval.utilizedAmount, transaction.approval.currency)} / 
                      {formatCurrency(transaction.approval.approvedAmount, transaction.approval.currency)}
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ 
                          width: `${Math.min(
                            (transaction.approval.utilizedAmount / transaction.approval.approvedAmount) * 100, 
                            100
                          )}%` 
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validity</p>
                    <p className="text-sm">
                      {formatDate(transaction.approval.validityStart)} - {formatDate(transaction.approval.validityEnd)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No approval linked</p>
                  <p className="text-xs">This transaction may require review</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Exceptions Table */}
      {hasExceptions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Exceptions
            </CardTitle>
            <CardDescription>
              Issues detected for this transaction ({transaction.exceptions.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.exceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell className="font-medium">{exception.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{exception.description}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(exception.severity) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                        {exception.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(exception.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                        {exception.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(exception.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/exceptions/${exception.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
