'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileUp,
  Search,
  RefreshCw,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Submission {
  id: string;
  referenceNumber: string;
  type: string;
  fileName: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  submittedAt: string;
  processedAt: string | null;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  submittedBy: {
    firstName: string;
    lastName: string;
  };
}

const SUBMISSION_TYPES = ['TRANSACTIONS', 'APPROVALS'];
const SUBMISSION_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED'];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'PROCESSING':
      return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'PARTIALLY_COMPLETED':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'default';
    case 'FAILED': return 'destructive';
    case 'PROCESSING': return 'secondary';
    case 'PARTIALLY_COMPLETED': return 'default';
    default: return 'outline';
  }
};

export default function SubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [typeFilter, setTypeFilter] = useState<string>('__all__');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<string>('TRANSACTIONS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter && statusFilter !== '__all__') params.set('status', statusFilter);
      if (typeFilter && typeFilter !== '__all__') params.set('type', typeFilter);
      
      const response = await fetch(`/api/submissions?${params}`);
      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [searchQuery, statusFilter, typeFilter]);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', uploadType);

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setIsDialogOpen(false);
        setSelectedFile(null);
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = user?.role === 'BANK_USER' || user?.role === 'SUPER_ADMIN';

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'PENDING').length,
    processing: submissions.filter(s => s.status === 'PROCESSING').length,
    completed: submissions.filter(s => s.status === 'COMPLETED').length,
    failed: submissions.filter(s => s.status === 'FAILED' || s.status === 'PARTIALLY_COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Submissions</h1>
          <p className="text-muted-foreground">
            Upload and manage bank data submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSubmissions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          {canUpload && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Upload Data File</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="uploadType">Submission Type</Label>
                    <Select value={uploadType} onValueChange={setUploadType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSACTIONS">Transactions</SelectItem>
                        <SelectItem value="APPROVALS">Approvals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file">Select File (CSV)</Label>
                    <div className="border-2 border-dashed rounded-lg p-6 text-center">
                      <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <input
                        type="file"
                        id="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                      <label
                        htmlFor="file"
                        className="cursor-pointer text-sm text-primary hover:underline"
                      >
                        Click to select file
                      </label>
                      {selectedFile && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Selected: {selectedFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg text-sm">
                    <p className="font-medium mb-1">Required columns for transactions:</p>
                    <code className="text-xs">
                      referenceNumber, type, amount, currency, transactionDate, counterpartyName, counterpartyCountry
                    </code>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isUploading || !selectedFile}>
                      {isUploading ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-muted-foreground">Failed</p>
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
                  placeholder="Search by reference or filename..."
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
                {SUBMISSION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Types</SelectItem>
                {SUBMISSION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No submissions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>{getStatusIcon(submission.status)}</TableCell>
                    <TableCell className="font-medium">{submission.referenceNumber}</TableCell>
                    <TableCell>
                      <span className="font-medium">{submission.bank.code}</span>
                    </TableCell>
                    <TableCell>{submission.type}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{submission.fileName}</TableCell>
                    <TableCell>
                      <span className="text-green-600">{submission.processedRecords}</span>
                      {submission.errorRecords > 0 && (
                        <span className="text-red-600 ml-1">/ {submission.errorRecords} err</span>
                      )}
                      <span className="text-muted-foreground"> of {submission.totalRecords}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(submission.status) as any}>
                        {submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{formatDate(submission.submittedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          by {submission.submittedBy.firstName} {submission.submittedBy.lastName}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/submissions/${submission.id}`}>
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
