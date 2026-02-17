import Papa from 'papaparse';
import prisma from '@/lib/prisma';
import { createAuditLog } from './audit.service';

// Type constants for SQLite (no enum support)
const SubmissionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
} as const;

const TransactionType = {
  FOREX_PURCHASE: 'FOREX_PURCHASE',
  FOREX_SALE: 'FOREX_SALE',
  OUTWARD_TRANSFER: 'OUTWARD_TRANSFER',
  INWARD_TRANSFER: 'INWARD_TRANSFER',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT: 'LOAN_REPAYMENT',
  DIVIDEND_PAYMENT: 'DIVIDEND_PAYMENT',
  CAPITAL_REPATRIATION: 'CAPITAL_REPATRIATION',
  OTHER: 'OTHER',
} as const;

const ApprovalType = {
  FOREX_PURCHASE: 'FOREX_PURCHASE',
  FOREX_SALE: 'FOREX_SALE',
  OUTWARD_TRANSFER: 'OUTWARD_TRANSFER',
  INWARD_TRANSFER: 'INWARD_TRANSFER',
  LOAN_DISBURSEMENT: 'LOAN_DISBURSEMENT',
  LOAN_REPAYMENT: 'LOAN_REPAYMENT',
  DIVIDEND_PAYMENT: 'DIVIDEND_PAYMENT',
  CAPITAL_REPATRIATION: 'CAPITAL_REPATRIATION',
  OTHER: 'OTHER',
} as const;

interface ParsedTransaction {
  referenceNumber: string;
  type: string;
  amount: number;
  currency: string;
  exchangeRate?: number;
  transactionDate: string;
  valueDate?: string;
  counterpartyName?: string;
  counterpartyCountry?: string;
  purpose?: string;
  branchCode?: string;
  approvalReference?: string;
}

interface ParsedApproval {
  referenceNumber: string;
  type: string;
  approvedAmount: number;
  currency: string;
  validityStart: string;
  validityEnd: string;
  beneficiaryName: string;
  bankCode: string;
  conditions?: string;
  purpose?: string;
}

interface UploadResult {
  success: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errors: { row: number; errors: string[] }[];
  submissionId?: string;
}

export async function parseCSV<T>(
  fileContent: string,
  hasHeader: boolean = true
): Promise<{ data: T[]; errors: string[] }> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    
    Papa.parse(fileContent, {
      header: hasHeader,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, ''),
      transform: (value) => value.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          errors.push(...results.errors.map(e => `Row ${e.row}: ${e.message}`));
        }
        resolve({ data: results.data as T[], errors });
      },
      error: (error: Error) => {
        errors.push(error.message);
        resolve({ data: [], errors });
      },
    });
  });
}

export async function processTransactionUpload(
  fileContent: string,
  bankId: string,
  userId: string,
  fileName: string
): Promise<UploadResult> {
  const { data: parsedData, errors: parseErrors } = await parseCSV<ParsedTransaction>(fileContent);
  
  if (parseErrors.length > 0 || parsedData.length === 0) {
    return {
      success: false,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: parseErrors.map((e, i) => ({ row: i, errors: [e] })),
    };
  }

  // Create submission record
  const submission = await prisma.submission.create({
    data: {
      referenceNumber: `SUB-${Date.now()}`,
      fileName,
      type: 'TRANSACTION',
      bankId,
      submittedById: userId,
      totalRecords: parsedData.length,
      status: SubmissionStatus.PROCESSING,
    },
  });

  const validRecords: {
    referenceNumber: string;
    type: string;
    amount: number;
    currency: string;
    exchangeRate?: number;
    transactionDate: Date;
    valueDate: Date;
    counterpartyName?: string;
    counterpartyCountry?: string;
    purpose?: string;
    bankId: string;
    branchId?: string;
    approvalId?: string;
  }[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  // Map branch codes to IDs
  const branches = await prisma.branch.findMany({
    where: { bankId },
    select: { id: true, code: true },
  });
  const branchMap = new Map(branches.map(b => [b.code, b.id]));

  // Map approval references to IDs
  const approvalRefs = parsedData
    .filter(r => r.approvalReference)
    .map(r => r.approvalReference!);
  const approvals = await prisma.approval.findMany({
    where: {
      referenceNumber: { in: approvalRefs },
      bankId,
    },
    select: { id: true, referenceNumber: true },
  });
  const approvalMap = new Map(approvals.map(a => [a.referenceNumber, a.id]));

  // Process each record
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowErrors: string[] = [];

    // Validate required fields
    if (!row.referenceNumber) rowErrors.push('Missing reference number');
    if (!row.type) rowErrors.push('Missing transaction type');
    if (!row.amount || isNaN(row.amount)) rowErrors.push('Invalid amount');
    if (!row.currency || row.currency.length !== 3) rowErrors.push('Invalid currency');
    if (!row.transactionDate) rowErrors.push('Missing transaction date');

    // Validate transaction type
    const txType = mapTransactionType(row.type);
    if (!txType) rowErrors.push(`Invalid transaction type: ${row.type}`);

    // Validate date
    const txDate = new Date(row.transactionDate);
    if (isNaN(txDate.getTime())) rowErrors.push('Invalid transaction date format');

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, errors: rowErrors });
      continue;
    }

    validRecords.push({
      referenceNumber: row.referenceNumber,
      type: txType!,
      amount: row.amount,
      currency: row.currency.toUpperCase(),
      exchangeRate: row.exchangeRate ? row.exchangeRate : undefined,
      transactionDate: txDate,
      valueDate: row.valueDate ? new Date(row.valueDate) : txDate,
      counterpartyName: row.counterpartyName,
      counterpartyCountry: row.counterpartyCountry,
      purpose: row.purpose,
      bankId,
      branchId: row.branchCode ? branchMap.get(row.branchCode) : undefined,
      approvalId: row.approvalReference ? approvalMap.get(row.approvalReference) : undefined,
    });
  }

  // Bulk insert valid records
  if (validRecords.length > 0) {
    await prisma.transaction.createMany({
      data: validRecords,
    });
  }

  // Update submission status
  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      processedRecords: validRecords.length,
      errorRecords: errors.length,
      status: errors.length > 0 ? SubmissionStatus.PARTIALLY_COMPLETED : SubmissionStatus.COMPLETED,
      errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
      processedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    userId,
    action: 'UPLOAD',
    entityType: 'Transaction',
    entityId: submission.id,
    details: {
      fileName,
      totalRecords: parsedData.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
    },
  });

  return {
    success: true,
    totalRecords: parsedData.length,
    validRecords: validRecords.length,
    invalidRecords: errors.length,
    errors,
    submissionId: submission.id,
  };
}

export async function processApprovalUpload(
  fileContent: string,
  userId: string
): Promise<UploadResult> {
  const { data: parsedData, errors: parseErrors } = await parseCSV<ParsedApproval>(fileContent);
  
  if (parseErrors.length > 0 || parsedData.length === 0) {
    return {
      success: false,
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      errors: parseErrors.map((e, i) => ({ row: i, errors: [e] })),
    };
  }

  // Map bank codes to IDs
  const bankCodes = Array.from(new Set(parsedData.map(r => r.bankCode)));
  const banks = await prisma.bank.findMany({
    where: { code: { in: bankCodes } },
    select: { id: true, code: true },
  });
  const bankMap = new Map(banks.map(b => [b.code, b.id]));

  const validRecords: {
    referenceNumber: string;
    type: string;
    approvedAmount: number;
    currency: string;
    validityStart: Date;
    validityEnd: Date;
    beneficiaryName?: string;
    conditions?: string;
    purpose?: string;
    bankId: string;
    createdById: string;
  }[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowErrors: string[] = [];

    // Validate required fields
    if (!row.referenceNumber) rowErrors.push('Missing reference number');
    if (!row.type) rowErrors.push('Missing approval type');
    if (!row.approvedAmount || isNaN(row.approvedAmount)) rowErrors.push('Invalid amount');
    if (!row.currency || row.currency.length !== 3) rowErrors.push('Invalid currency');
    if (!row.validityStart) rowErrors.push('Missing validity start');
    if (!row.validityEnd) rowErrors.push('Missing validity end');
    if (!row.bankCode) rowErrors.push('Missing bank code');

    // Validate bank exists
    const bankId = bankMap.get(row.bankCode);
    if (!bankId) rowErrors.push(`Bank not found: ${row.bankCode}`);

    // Validate approval type
    const approvalType = mapApprovalType(row.type);
    if (!approvalType) rowErrors.push(`Invalid approval type: ${row.type}`);

    // Validate dates
    const startDate = new Date(row.validityStart);
    const endDate = new Date(row.validityEnd);
    if (isNaN(startDate.getTime())) rowErrors.push('Invalid validity start date');
    if (isNaN(endDate.getTime())) rowErrors.push('Invalid validity end date');
    if (startDate >= endDate) rowErrors.push('Validity start must be before end');

    if (rowErrors.length > 0) {
      errors.push({ row: i + 2, errors: rowErrors });
      continue;
    }

    validRecords.push({
      referenceNumber: row.referenceNumber,
      type: approvalType!,
      approvedAmount: row.approvedAmount,
      currency: row.currency.toUpperCase(),
      validityStart: startDate,
      validityEnd: endDate,
      beneficiaryName: row.beneficiaryName,
      conditions: row.conditions,
      purpose: row.purpose,
      bankId: bankId!,
      createdById: userId,
    });
  }

  // Bulk insert valid records
  if (validRecords.length > 0) {
    // SQLite doesn't support skipDuplicates, so we insert one by one with error handling
    for (const record of validRecords) {
      try {
        await prisma.approval.create({ data: record });
      } catch (error) {
        // Skip duplicate errors
        console.warn('Failed to create approval:', error);
      }
    }
  }

  // Create audit log
  await createAuditLog({
    userId,
    action: 'UPLOAD',
    entityType: 'Approval',
    details: {
      totalRecords: parsedData.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
    },
  });

  return {
    success: true,
    totalRecords: parsedData.length,
    validRecords: validRecords.length,
    invalidRecords: errors.length,
    errors,
  };
}

function mapTransactionType(type: string): string | null {
  const typeMap: Record<string, string> = {
    'forex_purchase': TransactionType.FOREX_PURCHASE,
    'forexpurchase': TransactionType.FOREX_PURCHASE,
    'forex purchase': TransactionType.FOREX_PURCHASE,
    'forex_sale': TransactionType.FOREX_SALE,
    'forexsale': TransactionType.FOREX_SALE,
    'forex sale': TransactionType.FOREX_SALE,
    'outward_transfer': TransactionType.OUTWARD_TRANSFER,
    'outwardtransfer': TransactionType.OUTWARD_TRANSFER,
    'outward transfer': TransactionType.OUTWARD_TRANSFER,
    'inward_transfer': TransactionType.INWARD_TRANSFER,
    'inwardtransfer': TransactionType.INWARD_TRANSFER,
    'inward transfer': TransactionType.INWARD_TRANSFER,
    'loan_disbursement': TransactionType.LOAN_DISBURSEMENT,
    'loandisbursement': TransactionType.LOAN_DISBURSEMENT,
    'loan disbursement': TransactionType.LOAN_DISBURSEMENT,
    'loan_repayment': TransactionType.LOAN_REPAYMENT,
    'loanrepayment': TransactionType.LOAN_REPAYMENT,
    'loan repayment': TransactionType.LOAN_REPAYMENT,
    'dividend_payment': TransactionType.DIVIDEND_PAYMENT,
    'dividendpayment': TransactionType.DIVIDEND_PAYMENT,
    'dividend payment': TransactionType.DIVIDEND_PAYMENT,
    'capital_repatriation': TransactionType.CAPITAL_REPATRIATION,
    'capitalrepatriation': TransactionType.CAPITAL_REPATRIATION,
    'capital repatriation': TransactionType.CAPITAL_REPATRIATION,
    'other': TransactionType.OTHER,
  };

  return typeMap[type.toLowerCase().trim()] || null;
}

function mapApprovalType(type: string): string | null {
  const typeMap: Record<string, string> = {
    'forex_purchase': ApprovalType.FOREX_PURCHASE,
    'forex_sale': ApprovalType.FOREX_SALE,
    'outward_transfer': ApprovalType.OUTWARD_TRANSFER,
    'inward_transfer': ApprovalType.INWARD_TRANSFER,
    'loan_disbursement': ApprovalType.LOAN_DISBURSEMENT,
    'loan_repayment': ApprovalType.LOAN_REPAYMENT,
    'dividend_payment': ApprovalType.DIVIDEND_PAYMENT,
    'capital_repatriation': ApprovalType.CAPITAL_REPATRIATION,
    'other': ApprovalType.OTHER,
  };

  return typeMap[type.toLowerCase().trim()] || null;
}

export async function getSubmissionHistory(
  bankId: string,
  page: number = 1,
  limit: number = 20
) {
  const [submissions, total] = await Promise.all([
    prisma.submission.findMany({
      where: { bankId },
      include: {
        submittedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.submission.count({ where: { bankId } }),
  ]);

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
