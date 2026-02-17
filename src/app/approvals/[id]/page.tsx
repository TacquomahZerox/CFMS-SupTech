'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  FileCheck,
  ArrowLeft,
  Building2,
  Calendar,
  DollarSign,
  ArrowRightLeft,
  Clock,
  Edit,
  XCircle,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

interface ApprovalDetail {
  id: string;
  referenceNumber: string;
  type: string;
  approvedAmount: number;
  utilizedAmount: number;
  currency: string;
  status: string;
  validityStart: string;
  validityEnd: string;
  purpose: string | null;
  conditions: string | null;
  createdAt: string;
  updatedAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  transactions: Array<{
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    currency: string;
    transactionDate: string;
  }>;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'default';
    case 'PENDING': return 'secondary';
    case 'EXPIRED': return 'outline';
    case 'REVOKED': return 'destructive';
    case 'EXHAUSTED': return 'outline';
    case 'CANCELLED': return 'destructive';
    default: return 'outline';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ACTIVE': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'EXPIRED': return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    case 'REVOKED': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />;
    default: return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const formatApprovalType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function ApprovalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [approval, setApproval] = useState<ApprovalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    approvedAmount: '',
    validityStart: '',
    validityEnd: '',
    conditions: '',
  });

  const fetchApproval = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/approvals/${params.id}`);
      const result = await response.json();
      
      if (result.success) {
        setApproval(result.data);
        setEditForm({
          approvedAmount: result.data.approvedAmount.toString(),
          validityStart: result.data.validityStart ? result.data.validityStart.split('T')[0] : '',
          validityEnd: result.data.validityEnd ? result.data.validityEnd.split('T')[0] : '',
          conditions: result.data.conditions || '',
        });
      } else {
        setError(result.error || 'Failed to load approval');
      }
    } catch (err) {
      setError('Failed to load approval');
      console.error('Failed to fetch approval:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchApproval();
    }
  }, [params.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/approvals/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedAmount: parseFloat(editForm.approvedAmount),
          validityStart: editForm.validityStart,
          validityEnd: editForm.validityEnd,
          conditions: editForm.conditions || undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsEditDialogOpen(false);
        fetchApproval();
      } else {
        alert(result.error || 'Failed to update approval');
      }
    } catch (err) {
      console.error('Failed to update approval:', err);
      alert('Failed to update approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/approvals/${params.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        router.push('/approvals');
      } else {
        alert(result.error || 'Failed to cancel approval');
      }
    } catch (err) {
      console.error('Failed to cancel approval:', err);
      alert('Failed to cancel approval');
    } finally {
      setIsSubmitting(false);
      setIsCancelDialogOpen(false);
    }
  };

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

  if (error || !approval) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Approval Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The approval you are looking for does not exist.'}</p>
            <Link href="/approvals">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Approvals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const remainingAmount = approval.approvedAmount - approval.utilizedAmount;
  const utilizationPercentage = approval.approvedAmount > 0 
    ? ((approval.utilizedAmount / approval.approvedAmount) * 100).toFixed(1) 
    : '0';
  const isExpired = new Date(approval.validityEnd) < new Date();
  const daysRemaining = Math.ceil((new Date(approval.validityEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'CFM_OFFICER' || user?.role === 'SUPERVISOR';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/approvals">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">{approval.referenceNumber}</h1>
                <p className="text-muted-foreground">{formatApprovalType(approval.type)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusIcon(approval.status)}
          <Badge variant={getStatusVariant(approval.status)} className="text-sm">
            {approval.status}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Approved Amount"
          value={formatCurrency(approval.approvedAmount, approval.currency)}
          icon={DollarSign}
          description="Total approved limit"
        />
        <StatsCard
          title="Utilized Amount"
          value={formatCurrency(approval.utilizedAmount, approval.currency)}
          icon={ArrowRightLeft}
          description={`${utilizationPercentage}% utilized`}
        />
        <StatsCard
          title="Remaining Balance"
          value={formatCurrency(remainingAmount, approval.currency)}
          icon={DollarSign}
          description="Available to use"
        />
        <StatsCard
          title="Validity Period"
          value={isExpired ? 'Expired' : `${daysRemaining} days left`}
          icon={Calendar}
          description={`${formatDate(approval.validityStart)} - ${formatDate(approval.validityEnd)}`}
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Approval Details */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Approval Details</CardTitle>
              <CardDescription>Complete information about this approval</CardDescription>
            </div>
            {canEdit && approval.status === 'ACTIVE' && (
              <div className="flex gap-2">
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Approval</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="approvedAmount">Approved Amount</Label>
                        <Input
                          id="approvedAmount"
                          type="number"
                          step="0.01"
                          value={editForm.approvedAmount}
                          onChange={(e) => setEditForm({ ...editForm, approvedAmount: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="validityStart">Validity Start</Label>
                          <Input
                            id="validityStart"
                            type="date"
                            value={editForm.validityStart}
                            onChange={(e) => setEditForm({ ...editForm, validityStart: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="validityEnd">Validity End</Label>
                          <Input
                            id="validityEnd"
                            type="date"
                            value={editForm.validityEnd}
                            onChange={(e) => setEditForm({ ...editForm, validityEnd: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="conditions">Conditions</Label>
                        <Textarea
                          id="conditions"
                          value={editForm.conditions}
                          onChange={(e) => setEditForm({ ...editForm, conditions: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Approval
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Approval</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground">
                      Are you sure you want to cancel this approval? This action cannot be undone.
                    </p>
                    {approval.transactions.length > 0 && (
                      <p className="text-sm text-yellow-600">
                        Note: This approval has {approval.transactions.length} linked transactions. 
                        The approval will be marked as cancelled but not deleted.
                      </p>
                    )}
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                        Keep Approval
                      </Button>
                      <Button variant="destructive" onClick={handleCancel} disabled={isSubmitting}>
                        {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Approval'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Reference Number</p>
                  <p className="font-medium">{approval.referenceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">{formatApprovalType(approval.type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{approval.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(approval.createdAt)}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <Link href={`/banks/${approval.bank.id}`} className="font-medium text-primary hover:underline">
                    {approval.bank.name} ({approval.bank.code})
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created By</p>
                  <p className="font-medium">
                    {approval.createdBy ? `${approval.createdBy.firstName} ${approval.createdBy.lastName}` : 'N/A'}
                  </p>
                  <p className="text-xs text-muted-foreground">{approval.createdBy?.email || ''}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(approval.updatedAt)}</p>
                </div>
              </div>
            </div>

            {approval.purpose && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Purpose</p>
                <p className="text-sm">{approval.purpose}</p>
              </div>
            )}

            {approval.conditions && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Conditions</p>
                <p className="text-sm">{approval.conditions}</p>
              </div>
            )}

            {/* Utilization Progress */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex justify-between mb-2">
                <p className="text-sm text-muted-foreground">Utilization Progress</p>
                <p className="text-sm font-medium">{utilizationPercentage}%</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${Math.min(parseFloat(utilizationPercentage), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{formatCurrency(approval.utilizedAmount, approval.currency)} used</span>
                <span>{formatCurrency(remainingAmount, approval.currency)} remaining</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Bank Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Bank Name</p>
                <Link href={`/banks/${approval.bank.id}`} className="font-medium text-primary hover:underline">
                  {approval.bank.name}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bank Code</p>
                <p className="font-medium">{approval.bank.code}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Validity Start</p>
                <p className="font-medium">{formatDate(approval.validityStart)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Validity End</p>
                <p className="font-medium">{formatDate(approval.validityEnd)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <Badge variant="outline" className="text-red-600">Expired</Badge>
                  ) : daysRemaining <= 30 ? (
                    <Badge variant="secondary" className="text-yellow-600">Expiring Soon</Badge>
                  ) : (
                    <Badge variant="default">Valid</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Linked Transactions
          </CardTitle>
          <CardDescription>
            Transactions using this approval ({approval.transactions.length} total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approval.transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions linked to this approval yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approval.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.referenceNumber}</TableCell>
                    <TableCell>{formatApprovalType(transaction.type)}</TableCell>
                    <TableCell>{formatCurrency(transaction.amount, transaction.currency)}</TableCell>
                    <TableCell>{formatDate(transaction.transactionDate)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/transactions/${transaction.id}`}>
                        <Button variant="ghost" size="sm">
                          View
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
