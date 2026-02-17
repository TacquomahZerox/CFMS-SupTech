'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileUp,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface UploadResult {
  success: boolean;
  totalRecords?: number;
  validRecords?: number;
  invalidRecords?: number;
  errors?: { row: number; errors: string[] }[];
  submissionId?: string;
}

export default function NewSubmissionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadType, setUploadType] = useState<string>('TRANSACTIONS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<{ id: string; code: string; name: string }[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>('');

  const isBankUser = user?.role === 'BANK_USER';

  useEffect(() => {
    // Non-bank users need to pick a bank
    if (!isBankUser) {
      fetch('/api/banks')
        .then((res) => res.json())
        .then((result) => {
          if (result.success && result.data) {
            setBanks(result.data);
          }
        })
        .catch(console.error);
    }
  }, [isBankUser]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadResult(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', uploadType);
      if (!isBankUser && selectedBankId) {
        formData.append('bankId', selectedBankId);
      }

      const response = await fetch('/api/submissions', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result.data);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
      setError('An unexpected error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError(null);
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

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

      <div>
        <h1 className="text-3xl font-bold">New Data Submission</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to submit bank data for processing
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Upload Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Data File
            </CardTitle>
            <CardDescription>
              Select the submission type and upload a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bank Selector (for non-bank users) */}
              {!isBankUser && (
                <div className="space-y-2">
                  <Label htmlFor="bankId">Bank</Label>
                  <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a bank..." />
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
              )}

              {/* Submission Type */}
              <div className="space-y-2">
                <Label htmlFor="uploadType">Submission Type</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSACTIONS">Transaction Data</SelectItem>
                    <SelectItem value="APPROVALS">Approval Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload Area */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select File (CSV)</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <input
                    type="file"
                    id="file-upload"
                    accept=".csv,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm text-primary hover:underline font-medium"
                  >
                    Click to select a file
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV and XLSX files
                  </p>
                  {selectedFile && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">Upload Failed</p>
                    <p className="text-sm text-destructive/80 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {uploadResult && uploadResult.success && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-green-700 dark:text-green-400">Upload Successful</p>
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Records</p>
                          <p className="font-medium">{uploadResult.totalRecords}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valid</p>
                          <p className="font-medium text-green-600">{uploadResult.validRecords}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Invalid</p>
                          <p className="font-medium text-red-600">{uploadResult.invalidRecords}</p>
                        </div>
                      </div>
                      {uploadResult.errors && uploadResult.errors.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            {uploadResult.errors.length} row(s) had errors:
                          </p>
                          <ul className="mt-1 text-xs space-y-1 max-h-[120px] overflow-y-auto">
                            {uploadResult.errors.slice(0, 10).map((err, i) => (
                              <li key={i} className="text-muted-foreground">
                                Row {err.row}: {err.errors.join(', ')}
                              </li>
                            ))}
                            {uploadResult.errors.length > 10 && (
                              <li className="text-muted-foreground italic">
                                ...and {uploadResult.errors.length - 10} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push('/submissions')}
                        >
                          View All Submissions
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleReset}
                        >
                          Upload Another
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!uploadResult?.success && (
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/submissions')}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isUploading || !selectedFile || (!isBankUser && !selectedBankId)}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Submit Data
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Instructions Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Format</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <p className="text-muted-foreground">
                Upload a CSV file with the following columns based on submission type.
              </p>

              {uploadType === 'TRANSACTIONS' ? (
                <div>
                  <p className="font-medium mb-1">Transaction Columns:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      referenceNumber
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      type
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      amount
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      currency
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      transactionDate
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      exchangeRate
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      counterpartyName
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      counterpartyCountry
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      purpose
                    </li>
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-1">Approval Columns:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      referenceNumber
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      type
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      approvedAmount
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      currency
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      validityStart
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      validityEnd
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px] px-1">Required</Badge>
                      beneficiaryName
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      conditions
                    </li>
                    <li className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1">Optional</Badge>
                      purpose
                    </li>
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accepted Types</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-sm text-foreground">Transaction Types:</p>
              <div className="flex flex-wrap gap-1">
                {['FOREX_PURCHASE', 'FOREX_SALE', 'OUTWARD_TRANSFER', 'INWARD_TRANSFER', 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'DIVIDEND_PAYMENT', 'CAPITAL_REPATRIATION', 'OTHER'].map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
