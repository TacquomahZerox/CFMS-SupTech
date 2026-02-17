'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  User,
  Calendar,
  Hash,
  BarChart3,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import Link from 'next/link';

interface SubmissionDetail {
  id: string;
  referenceNumber: string;
  type: string;
  fileName: string;
  status: string;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  errorDetails: string | null;
  submittedAt: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bank: {
    id: string;
    code: string;
    name: string;
  };
  submittedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'FAILED':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'PROCESSING':
      return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'PARTIALLY_COMPLETED':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED': return 'text-green-600';
    case 'FAILED': return 'text-red-600';
    case 'PROCESSING': return 'text-blue-600';
    case 'PARTIALLY_COMPLETED': return 'text-yellow-600';
    default: return 'text-gray-600';
  }
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmission = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/submissions/${params.id}`);
        const result = await response.json();
        if (result.success) {
          setSubmission(result.data);
        } else {
          setError(result.error || 'Submission not found');
        }
      } catch (err) {
        console.error('Failed to fetch submission:', err);
        setError('Failed to load submission details');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchSubmission();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-6">
        <Link href="/submissions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold">{error || 'Submission Not Found'}</h2>
            <p className="text-muted-foreground mt-2">
              The submission you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const successRate = submission.totalRecords > 0
    ? ((submission.processedRecords / submission.totalRecords) * 100).toFixed(1)
    : '0';

  const errorRate = submission.totalRecords > 0
    ? ((submission.errorRecords / submission.totalRecords) * 100).toFixed(1)
    : '0';

  let parsedErrors: { row: number; errors: string[] }[] = [];
  if (submission.errorDetails) {
    try {
      parsedErrors = JSON.parse(submission.errorDetails);
    } catch {
      // errorDetails might be plain text
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/submissions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{submission.referenceNumber}</h1>
            <Badge variant={getStatusVariant(submission.status) as any} className="text-sm">
              {getStatusIcon(submission.status)}
              <span className="ml-1">{submission.status}</span>
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            {submission.type} submission for {submission.bank.name}
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Hash className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{submission.totalRecords}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-600">{submission.processedRecords}</p>
                <p className="text-sm text-muted-foreground">Processed ({successRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{submission.errorRecords}</p>
                <p className="text-sm text-muted-foreground">Errors ({errorRate}%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className={`text-2xl font-bold ${getStatusColor(submission.status)}`}>
                  {successRate}%
                </p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Submission Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submission Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reference Number</p>
                <p className="font-medium">{submission.referenceNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <Badge variant="outline">{submission.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">File Name</p>
                <p className="font-medium text-sm truncate" title={submission.fileName}>
                  {submission.fileName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(submission.status) as any}>
                  {submission.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank & Submitter Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Bank & Submitter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bank Code</p>
                <p className="font-medium">{submission.bank.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bank Name</p>
                <p className="font-medium">{submission.bank.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted By</p>
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">
                    {submission.submittedBy.firstName} {submission.submittedBy.lastName}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-sm">{submission.submittedBy.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm font-medium">Submitted</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(submission.submittedAt)}
                  </p>
                </div>
              </div>
              {submission.processedAt && (
                <div className="flex items-start gap-3">
                  <div className={`mt-1 h-2 w-2 rounded-full ${
                    submission.status === 'COMPLETED' ? 'bg-green-500' :
                    submission.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">Processed</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(submission.processedAt)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-gray-400" />
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(submission.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Details */}
        {(submission.errorRecords > 0 || submission.errorDetails) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Error Details
              </CardTitle>
              <CardDescription>
                {submission.errorRecords} record(s) had errors during processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {parsedErrors.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {parsedErrors.map((err, i) => (
                    <div key={i} className="text-sm border rounded-lg p-3">
                      <p className="font-medium text-red-600">Row {err.row}</p>
                      <ul className="mt-1 space-y-0.5">
                        {err.errors.map((e, j) => (
                          <li key={j} className="text-muted-foreground text-xs">• {e}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : submission.errorDetails ? (
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted p-3 rounded-lg max-h-[300px] overflow-y-auto">
                  {submission.errorDetails}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No detailed error information available.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
