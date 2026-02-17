'use client';

import { useEffect, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Download,
  RefreshCw,
  Calendar,
  Building2,
  Filter,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Report {
  id: string;
  name: string;
  type: string;
  format: string;
  status: string;
  generatedAt: string;
  fileSize: number;
  parameters: Record<string, any>;
  generatedBy: {
    firstName: string;
    lastName: string;
  };
}

interface Bank {
  id: string;
  code: string;
  name: string;
}

const REPORT_TYPES = [
  { value: 'BANK_SUMMARY', label: 'Bank Summary Report' },
  { value: 'TRANSACTION_VOLUME', label: 'Transaction Volume Report' },
  { value: 'EXCEPTION_SUMMARY', label: 'Exception Summary Report' },
  { value: 'RISK_ANALYSIS', label: 'Risk Analysis Report' },
  { value: 'APPROVAL_STATUS', label: 'Approval Status Report' },
  { value: 'COMPLIANCE_OVERVIEW', label: 'Compliance Overview Report' },
];

const REPORT_FORMATS = ['PDF', 'EXCEL', 'CSV'];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Form state
  const [reportType, setReportType] = useState('BANK_SUMMARY');
  const [reportFormat, setReportFormat] = useState('PDF');
  const [selectedBank, setSelectedBank] = useState('__all__');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/reports');
      const result = await response.json();
      if (result.success) {
        setReports(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
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
    fetchReports();
    fetchBanks();
  }, []);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const params: Record<string, any> = {
        type: reportType,
        format: reportFormat,
      };
      if (selectedBank && selectedBank !== '__all__') params.bankId = selectedBank;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (result.success) {
        fetchReports();
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'default';
      case 'GENERATING': return 'secondary';
      case 'FAILED': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and download compliance reports
          </p>
        </div>
        <Button variant="outline" onClick={fetchReports}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
          <CardDescription>
            Select report parameters and generate a new compliance report
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2 lg:col-span-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={reportFormat} onValueChange={setReportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bank (Optional)</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="All Banks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Banks</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate Report'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generated Reports ({reports.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reports generated yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Use the form above to generate your first report
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell>
                      {REPORT_TYPES.find(t => t.value === report.type)?.label || report.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.format}</Badge>
                    </TableCell>
                    <TableCell>{formatFileSize(report.fileSize)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(report.status) as any}>
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {report.generatedBy.firstName} {report.generatedBy.lastName}
                    </TableCell>
                    <TableCell>{formatDate(report.generatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={report.status !== 'COMPLETED'}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
