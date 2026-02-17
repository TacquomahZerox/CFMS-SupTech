'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  ArrowRightLeft,
  FileCheck,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';

interface ExceptionDetail {
  id: string;
  code: string;
  description: string;
  severity: string;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  transaction: {
    id: string;
    referenceNumber: string;
    type: string;
    amount: number;
    currency: string;
    transactionDate: string;
    approval: {
      id: string;
      referenceNumber: string;
      type: string;
      status: string;
    } | null;
  } | null;
}

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

const formatType = (type: string) => {
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const EXCEPTION_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'WAIVED'];

export default function ExceptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [exception, setException] = useState<ExceptionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolveForm, setResolveForm] = useState({
    status: '',
    resolution: '',
  });

  const fetchException = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/exceptions/${params.id}`);
      const result = await response.json();
      
      if (result.success) {
        setException(result.data);
        setResolveForm({
          status: result.data.status,
          resolution: result.data.resolution || '',
        });
      } else {
        setError(result.error || 'Failed to load exception');
      }
    } catch (err) {
      setError('Failed to load exception');
      console.error('Failed to fetch exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchException();
    }
  }, [params.id]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/exceptions/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolveForm),
      });

      const result = await response.json();
      if (result.success) {
        setIsResolveDialogOpen(false);
        fetchException();
      } else {
        alert(result.error || 'Failed to update exception');
      }
    } catch (err) {
      console.error('Failed to update exception:', err);
      alert('Failed to update exception');
    } finally {
      setIsSubmitting(false);
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
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !exception) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Exception Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'The exception you are looking for does not exist.'}</p>
            <Link href="/exceptions">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Exceptions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canResolve = user?.role === 'SUPER_ADMIN' || user?.role === 'CFM_OFFICER' || user?.role === 'SUPERVISOR';
  const isResolved = exception.status === 'RESOLVED' || exception.status === 'WAIVED';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/exceptions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div>
                <h1 className="text-2xl font-bold">{exception.code}</h1>
                <p className="text-muted-foreground">{exception.description}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={getSeverityVariant(exception.severity) as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-sm">
            {exception.severity}
          </Badge>
          <Badge variant={getStatusVariant(exception.status) as 'default' | 'secondary' | 'destructive' | 'outline'} className="text-sm">
            {exception.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Exception Details */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Exception Details</CardTitle>
              <CardDescription>Information about this exception</CardDescription>
            </div>
            {canResolve && !isResolved && (
              <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve Exception
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Resolve Exception</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleResolve} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={resolveForm.status}
                        onValueChange={(value) => setResolveForm({ ...resolveForm, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXCEPTION_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolution">Resolution Notes</Label>
                      <Textarea
                        id="resolution"
                        value={resolveForm.resolution}
                        onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                        placeholder="Enter resolution details..."
                        rows={4}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Updating...' : 'Update Status'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Exception Code</p>
                  <p className="font-medium">{exception.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{exception.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge variant={getSeverityVariant(exception.severity) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                    {exception.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusVariant(exception.status) as 'default' | 'secondary' | 'destructive' | 'outline'}>
                    {exception.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank</p>
                  <Link href={`/banks/${exception.bank.id}`} className="font-medium text-primary hover:underline">
                    {exception.bank.name} ({exception.bank.code})
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">{formatDate(exception.createdAt)}</p>
                </div>
                {exception.resolvedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolved At</p>
                    <p className="font-medium">{formatDate(exception.resolvedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{formatDate(exception.updatedAt)}</p>
                </div>
              </div>
            </div>

            {exception.resolution && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-2">Resolution Notes</p>
                <p className="text-sm bg-muted p-3 rounded-md">{exception.resolution}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Related Transaction */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Related Transaction
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exception.transaction ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <Link 
                      href={`/transactions/${exception.transaction.id}`} 
                      className="font-medium text-primary hover:underline"
                    >
                      {exception.transaction.referenceNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{formatType(exception.transaction.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-medium">
                      {formatCurrency(exception.transaction.amount, exception.transaction.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{formatDate(exception.transaction.transactionDate)}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No transaction linked</p>
                </div>
              )}
            </CardContent>
          </Card>

          {exception.transaction?.approval && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="h-4 w-4" />
                  Related Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <Link 
                      href={`/approvals/${exception.transaction.approval.id}`} 
                      className="font-medium text-primary hover:underline"
                    >
                      {exception.transaction.approval.referenceNumber}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{formatType(exception.transaction.approval.type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={exception.transaction.approval.status === 'ACTIVE' ? 'default' : 'outline'}>
                      {exception.transaction.approval.status}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
