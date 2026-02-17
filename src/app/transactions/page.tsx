'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ArrowRightLeft,
  Search,
  RefreshCw,
  Eye,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Transaction {
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
  purpose: string | null;
  createdAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  approval: {
    id: string;
    referenceNumber: string;
  } | null;
}

const TRANSACTION_TYPES = [
  'FOREX_PURCHASE',
  'FOREX_SALE',
  'OUTWARD_TRANSFER',
  'INWARD_TRANSFER',
  'LOAN_DISBURSEMENT',
  'LOAN_REPAYMENT',
  'DIVIDEND_PAYMENT',
  'CAPITAL_REPATRIATION',
];

const getTypeIcon = (type: string) => {
  if (type.includes('OUTWARD') || type.includes('SALE') || type.includes('REPAYMENT') || type.includes('REPATRIATION')) {
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  }
  return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
};

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter && typeFilter !== '__all__') params.set('type', typeFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      
      const response = await fetch(`/api/transactions?${params}`);
      const result = await response.json();
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [searchQuery, typeFilter, dateFrom, dateTo]);

  const totalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const outflowVolume = transactions
    .filter(tx => tx.type.includes('OUTWARD') || tx.type.includes('SALE') || tx.type.includes('REPAYMENT') || tx.type.includes('REPATRIATION'))
    .reduce((sum, tx) => sum + tx.amount, 0);
  const inflowVolume = totalVolume - outflowVolume;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            View all capital flow transactions
          </p>
        </div>
        <Button variant="outline" onClick={fetchTransactions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">{formatCurrency(totalVolume, 'USD')}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inflows</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(inflowVolume, 'USD')}</p>
              </div>
              <ArrowDownLeft className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outflows</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(outflowVolume, 'USD')}</p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference or counterparty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[150px]"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[150px]"
              placeholder="To"
            />
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transactions ({transactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Counterparty</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{getTypeIcon(tx.type)}</TableCell>
                    <TableCell className="font-medium">{tx.referenceNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium">{tx.bank.code}</span>
                    </TableCell>
                    <TableCell>{tx.type.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(tx.amount, tx.currency)}
                      {tx.exchangeRate && (
                        <span className="text-xs text-muted-foreground ml-1">
                          @{tx.exchangeRate}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.counterpartyName ? (
                        <>
                          <span>{tx.counterpartyName}</span>
                          {tx.counterpartyCountry && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({tx.counterpartyCountry})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.approval ? (
                        <Badge variant="outline">{tx.approval.referenceNumber}</Badge>
                      ) : (
                        <Badge variant="destructive">None</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/transactions/${tx.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
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
