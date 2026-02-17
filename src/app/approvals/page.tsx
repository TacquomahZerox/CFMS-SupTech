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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileCheck,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Filter,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Approval {
  id: string;
  referenceNumber: string;
  type: string;
  approvedAmount: number;
  utilizedAmount: number;
  currency: string;
  status: string;
  validityStart: string;
  validityEnd: string;
  createdAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
}

interface Bank {
  id: string;
  code: string;
  name: string;
}

const APPROVAL_TYPES = [
  'FOREX_PURCHASE',
  'FOREX_SALE',
  'OUTWARD_TRANSFER',
  'INWARD_TRANSFER',
  'LOAN_DISBURSEMENT',
  'LOAN_REPAYMENT',
  'DIVIDEND_PAYMENT',
  'CAPITAL_REPATRIATION',
];

const APPROVAL_STATUSES = ['PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED'];

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'PENDING': return 'secondary';
    case 'EXPIRED': return 'outline';
    case 'REVOKED': return 'destructive';
    case 'EXHAUSTED': return 'outline';
    default: return 'outline';
  }
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [typeFilter, setTypeFilter] = useState<string>('__all__');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    bankId: '',
    type: '',
    approvedAmount: '',
    currency: 'USD',
    validityStart: '',
    validityEnd: '',
    purpose: '',
    conditions: '',
  });

  const fetchApprovals = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== '__all__') params.set('status', statusFilter);
      if (typeFilter && typeFilter !== '__all__') params.set('type', typeFilter);
      
      const response = await fetch(`/api/approvals?${params}`);
      const result = await response.json();
      if (result.success) {
        setApprovals(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
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
    fetchApprovals();
    fetchBanks();
  }, [searchQuery, statusFilter, typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          approvedAmount: parseFloat(formData.approvedAmount),
          referenceNumber: `APR-${Date.now()}`,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setIsDialogOpen(false);
        setFormData({
          bankId: '',
          type: '',
          approvedAmount: '',
          currency: 'USD',
          validityStart: '',
          validityEnd: '',
          purpose: '',
          conditions: '',
        });
        fetchApprovals();
      }
    } catch (error) {
      console.error('Failed to create approval:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateApproval = user?.role === 'SUPER_ADMIN' || user?.role === 'CFM_OFFICER';

  const getUtilization = (approval: Approval) => {
    if (approval.approvedAmount === 0) return 0;
    return (approval.utilizedAmount / approval.approvedAmount) * 100;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Capital Flow Approvals</h1>
          <p className="text-muted-foreground">
            Manage foreign exchange and capital transfer approvals
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchApprovals}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canCreateApproval && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Approval
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Approval</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bankId">Bank *</Label>
                      <Select
                        value={formData.bankId}
                        onValueChange={(value) => setFormData({ ...formData, bankId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map((bank) => (
                            <SelectItem key={bank.id} value={bank.id}>
                              {bank.code} - {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Approval Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {APPROVAL_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="approvedAmount">Amount *</Label>
                      <Input
                        id="approvedAmount"
                        type="number"
                        step="0.01"
                        value={formData.approvedAmount}
                        onChange={(e) => setFormData({ ...formData, approvedAmount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData({ ...formData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="JPY">JPY</SelectItem>
                          <SelectItem value="CHF">CHF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="validityStart">Valid From *</Label>
                      <Input
                        id="validityStart"
                        type="date"
                        value={formData.validityStart}
                        onChange={(e) => setFormData({ ...formData, validityStart: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="validityEnd">Valid To *</Label>
                      <Input
                        id="validityEnd"
                        type="date"
                        value={formData.validityEnd}
                        onChange={(e) => setFormData({ ...formData, validityEnd: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      placeholder="Purpose of the capital flow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conditions">Conditions</Label>
                    <Input
                      id="conditions"
                      value={formData.conditions}
                      onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                      placeholder="Any conditions or restrictions"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Creating...' : 'Create Approval'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                {APPROVAL_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {APPROVAL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Approvals ({approvals.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No approvals found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Utilization</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => {
                  const utilization = getUtilization(approval);
                  return (
                    <TableRow key={approval.id}>
                      <TableCell className="font-medium">{approval.referenceNumber}</TableCell>
                      <TableCell>
                        <span className="font-medium">{approval.bank.code}</span>
                        <br />
                        <span className="text-sm text-muted-foreground">{approval.bank.name}</span>
                      </TableCell>
                      <TableCell>{approval.type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{formatCurrency(approval.approvedAmount, approval.currency)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${utilization > 90 ? 'bg-red-500' : utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm">{utilization.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(approval.validityStart)} - {formatDate(approval.validityEnd)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(approval.status) as any}>
                          {approval.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/approvals/${approval.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
