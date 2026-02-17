'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Exception {
  id: string;
  code: string;
  description: string;
  severity: string;
  status: string;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
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
  } | null;
  approval: {
    id: string;
    referenceNumber: string;
  } | null;
  resolvedBy: {
    firstName: string;
    lastName: string;
  } | null;
}

const EXCEPTION_STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'WAIVED'];
const EXCEPTION_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return 'destructive';
    case 'HIGH': return 'destructive';
    case 'MEDIUM': return 'default';
    case 'LOW': return 'secondary';
    default: return 'outline';
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'RESOLVED': return 'default';
    case 'WAIVED': return 'secondary';
    case 'OPEN': return 'destructive';
    case 'UNDER_REVIEW': return 'outline';
    default: return 'outline';
  }
};

export default function ExceptionsPage() {
  const { user } = useAuth();
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [severityFilter, setSeverityFilter] = useState<string>('__all__');
  
  // Resolution dialog state
  const [selectedException, setSelectedException] = useState<Exception | null>(null);
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [resolveStatus, setResolveStatus] = useState<string>('RESOLVED');
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExceptions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== '__all__') params.set('status', statusFilter);
      if (severityFilter && severityFilter !== '__all__') params.set('severity', severityFilter);
      
      const response = await fetch(`/api/exceptions?${params}`);
      const result = await response.json();
      if (result.success) {
        setExceptions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch exceptions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
  }, [searchQuery, statusFilter, severityFilter]);

  const handleResolve = async () => {
    if (!selectedException) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/exceptions/${selectedException.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolveStatus,
          resolution,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsResolveDialogOpen(false);
        setSelectedException(null);
        setResolution('');
        fetchExceptions();
      }
    } catch (error) {
      console.error('Failed to resolve exception:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openResolveDialog = (exception: Exception) => {
    setSelectedException(exception);
    setResolveStatus('RESOLVED');
    setResolution('');
    setIsResolveDialogOpen(true);
  };

  const canResolve = user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERVISOR' || user?.role === 'CFM_OFFICER';

  const stats = {
    total: exceptions.length,
    critical: exceptions.filter(e => e.severity === 'CRITICAL').length,
    high: exceptions.filter(e => e.severity === 'HIGH').length,
    open: exceptions.filter(e => e.status === 'OPEN').length,
    underReview: exceptions.filter(e => e.status === 'UNDER_REVIEW').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exceptions</h1>
          <p className="text-muted-foreground">
            Review and manage compliance exceptions
          </p>
        </div>
        <Button variant="outline" onClick={fetchExceptions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
              <p className="text-sm text-muted-foreground">Critical</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
              <p className="text-sm text-muted-foreground">High</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.open}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
              <p className="text-sm text-muted-foreground">Under Review</p>
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
                  placeholder="Search by code or description..."
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
                {EXCEPTION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Severity</SelectItem>
                {EXCEPTION_SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Exceptions ({exceptions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : exceptions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No exceptions found 🎉</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceptions.map((exception) => (
                  <TableRow key={exception.id}>
                    <TableCell className="font-medium">{exception.code}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {exception.description}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{exception.bank.code}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(exception.severity) as any}>
                        {exception.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(exception.status) as any}>
                        {exception.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exception.transaction ? (
                        <span className="text-sm">{exception.transaction.referenceNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(exception.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canResolve && (exception.status === 'OPEN' || exception.status === 'UNDER_REVIEW') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResolveDialog(exception)}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        )}
                        <Link href={`/exceptions/${exception.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolution Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resolve Exception</DialogTitle>
          </DialogHeader>
          {selectedException && (
            <div className="space-y-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{selectedException.code}</p>
                <p className="text-sm text-muted-foreground">{selectedException.description}</p>
              </div>
              <div className="space-y-2">
                <Label>Resolution Status</Label>
                <Select value={resolveStatus} onValueChange={setResolveStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="WAIVED">Waived</SelectItem>
                    <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolution Notes *</Label>
                <Textarea
                  value={resolution}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResolution(e.target.value)}
                  placeholder="Describe the resolution or reason for waiving..."
                  rows={4}
                  required
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResolve} disabled={isSubmitting || !resolution}>
                  {isSubmitting ? 'Saving...' : 'Save Resolution'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
