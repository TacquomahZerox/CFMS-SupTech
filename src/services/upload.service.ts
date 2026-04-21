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
  counterpartyAccount?: string;
  counterpartyCountry?: string;
  purpose?: string;
  documentReference?: string;
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
  bankCode?: string;
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

const SubmissionType = {
  TRANSACTIONS: 'TRANSACTIONS',
  APPROVALS: 'APPROVALS',
} as const;

function buildSubmissionReference(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function normalizeKey(value?: string | null): string {
  return (value || '').trim().toUpperCase();
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
      referenceNumber: buildSubmissionReference('SUB-TXN'),
      fileName,
      type: SubmissionType.TRANSACTIONS,
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
    counterpartyAccount?: string;
    counterpartyCountry?: string;
    purpose?: string;
    documentReference?: string;
    bankId: string;
    branchId?: string;
    approvalId?: string;
    submissionId: string;
  }[] = [];
  const errors: { row: number; errors: string[] }[] = [];

  // Map branch codes to IDs
  const branches = await prisma.branch.findMany({
    where: { bankId },
    select: { id: true, code: true },
  });
  const branchMap = new Map(branches.map((b) => [normalizeKey(b.code), b.id]));

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
  const approvalMap = new Map(approvals.map((a) => [normalizeKey(a.referenceNumber), a.id]));

  const referenceNumbers = parsedData
    .map((row) => row.referenceNumber)
    .filter((value): value is string => Boolean(value));
  const existingTransactions = await prisma.transaction.findMany({
    where: {
      bankId,
      referenceNumber: { in: referenceNumbers },
    },
    select: { referenceNumber: true },
  });
  const existingReferenceSet = new Set(
    existingTransactions.map((row) => normalizeKey(row.referenceNumber))
  );
  const seenReferenceSet = new Set<string>();

  // Process each record
  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowErrors: string[] = [];
    const amount = Number(row.amount);
    const exchangeRate =
      row.exchangeRate !== undefined && row.exchangeRate !== null
        ? Number(row.exchangeRate)
        : undefined;

    // Validate required fields
    if (!row.referenceNumber) rowErrors.push('Missing reference number');
    if (!row.type) rowErrors.push('Missing transaction type');
    if (!Number.isFinite(amount) || amount <= 0) rowErrors.push('Invalid amount');
    if (!row.currency || row.currency.length !== 3) rowErrors.push('Invalid currency');
    if (!row.transactionDate) rowErrors.push('Missing transaction date');
    if (exchangeRate !== undefined && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
      rowErrors.push('Invalid exchange rate');
    }

    const normalizedReference = normalizeKey(row.referenceNumber);
    if (normalizedReference) {
      if (existingReferenceSet.has(normalizedReference)) {
        rowErrors.push(`Duplicate transaction reference number: ${row.referenceNumber}`);
      } else if (seenReferenceSet.has(normalizedReference)) {
        rowErrors.push(`Duplicate reference number within upload: ${row.referenceNumber}`);
      }
    }

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

    seenReferenceSet.add(normalizedReference);

    validRecords.push({
      referenceNumber: row.referenceNumber,
      type: txType!,
      amount,
      currency: row.currency.toUpperCase(),
      exchangeRate,
      transactionDate: txDate,
      valueDate: row.valueDate ? new Date(row.valueDate) : txDate,
      counterpartyName: row.counterpartyName,
      counterpartyAccount: row.counterpartyAccount,
      counterpartyCountry: row.counterpartyCountry,
      purpose: row.purpose,
      documentReference: row.documentReference,
      bankId,
      branchId: row.branchCode ? branchMap.get(normalizeKey(row.branchCode)) : undefined,
      approvalId: row.approvalReference ? approvalMap.get(normalizeKey(row.approvalReference)) : undefined,
      submissionId: submission.id,
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
      status:
        validRecords.length === 0
          ? SubmissionStatus.FAILED
          : errors.length > 0
            ? SubmissionStatus.PARTIALLY_COMPLETED
            : SubmissionStatus.COMPLETED,
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
    success: validRecords.length > 0,
    totalRecords: parsedData.length,
    validRecords: validRecords.length,
    invalidRecords: errors.length,
    errors,
    submissionId: submission.id,
  };
}

export async function processApprovalUpload(
  fileContent: string,
  bankId: string,
  userId: string,
  fileName: string
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

  const bank = await prisma.bank.findUnique({
    where: { id: bankId },
    select: { id: true, code: true },
  });

  if (!bank) {
    return {
      success: false,
      totalRecords: parsedData.length,
      validRecords: 0,
      invalidRecords: parsedData.length,
      errors: [{ row: 1, errors: ['Target bank not found'] }],
    };
  }

  const submission = await prisma.submission.create({
    data: {
      referenceNumber: buildSubmissionReference('SUB-APR'),
      fileName,
      type: SubmissionType.APPROVALS,
      bankId,
      submittedById: userId,
      totalRecords: parsedData.length,
      status: SubmissionStatus.PROCESSING,
    },
  });

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
  const seenReferenceSet = new Set<string>();
  const existingApprovals = await prisma.approval.findMany({
    where: {
      bankId,
      referenceNumber: {
        in: parsedData
          .map((row) => row.referenceNumber)
          .filter((value): value is string => Boolean(value)),
      },
    },
    select: { referenceNumber: true },
  });
  const existingReferenceSet = new Set(
    existingApprovals.map((row) => normalizeKey(row.referenceNumber))
  );

  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const rowErrors: string[] = [];
    const approvedAmount = Number(row.approvedAmount);

    // Validate required fields
    if (!row.referenceNumber) rowErrors.push('Missing reference number');
    if (!row.type) rowErrors.push('Missing approval type');
    if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) rowErrors.push('Invalid amount');
    if (!row.currency || row.currency.length !== 3) rowErrors.push('Invalid currency');
    if (!row.validityStart) rowErrors.push('Missing validity start');
    if (!row.validityEnd) rowErrors.push('Missing validity end');

    if (row.bankCode && normalizeKey(row.bankCode) !== normalizeKey(bank.code)) {
      rowErrors.push(`Row bank code ${row.bankCode} does not match selected bank ${bank.code}`);
    }

    const normalizedReference = normalizeKey(row.referenceNumber);
    if (normalizedReference) {
      if (existingReferenceSet.has(normalizedReference)) {
        rowErrors.push(`Duplicate approval reference number: ${row.referenceNumber}`);
      } else if (seenReferenceSet.has(normalizedReference)) {
        rowErrors.push(`Duplicate reference number within upload: ${row.referenceNumber}`);
      }
    }

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

    seenReferenceSet.add(normalizedReference);

    validRecords.push({
      referenceNumber: row.referenceNumber,
      type: approvalType!,
      approvedAmount,
      currency: row.currency.toUpperCase(),
      validityStart: startDate,
      validityEnd: endDate,
      beneficiaryName: row.beneficiaryName,
      conditions: row.conditions,
      purpose: row.purpose,
      bankId,
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

  await prisma.submission.update({
    where: { id: submission.id },
    data: {
      processedRecords: validRecords.length,
      errorRecords: errors.length,
      status:
        validRecords.length === 0
          ? SubmissionStatus.FAILED
          : errors.length > 0
            ? SubmissionStatus.PARTIALLY_COMPLETED
            : SubmissionStatus.COMPLETED,
      errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
      processedAt: new Date(),
    },
  });

  // Create audit log
  await createAuditLog({
    userId,
    action: 'UPLOAD',
    entityType: 'Approval',
    entityId: submission.id,
    details: {
      fileName,
      totalRecords: parsedData.length,
      validRecords: validRecords.length,
      invalidRecords: errors.length,
    },
  });

  return {
    success: validRecords.length > 0,
    totalRecords: parsedData.length,
    validRecords: validRecords.length,
    invalidRecords: errors.length,
    errors,
    submissionId: submission.id,
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
