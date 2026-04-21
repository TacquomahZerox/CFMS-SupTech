import prisma from '@/lib/prisma';
import { createAuditLog } from './audit.service';

// Type constants for SQLite (no enum support)
const ExceptionSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

const ExceptionStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  WAIVED: 'WAIVED',
} as const;

const ApprovalStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  EXHAUSTED: 'EXHAUSTED',
} as const;

interface ReconciliationResult {
  submissionId: string;
  bankId: string;
  totalTransactions: number;
  matchedTransactions: number;
  exceptionsCreated: number;
  exceptions: ExceptionDetail[];
}

interface ExceptionDetail {
  code: string;
  description: string;
  severity: string;
  transactionId: string;
  details: Record<string, unknown>;
}

// Exception codes
const EXCEPTION_CODES = {
  NO_APPROVAL: 'EX001',
  AMOUNT_EXCEEDED: 'EX002',
  DATE_OUTSIDE_VALIDITY: 'EX003',
  EXPIRED_APPROVAL: 'EX004',
  MISSING_REQUIRED_FIELDS: 'EX005',
  DUPLICATE_TRANSACTION: 'EX006',
  CURRENCY_MISMATCH: 'EX007',
  INVALID_COUNTERPARTY: 'EX008',
  APPROVAL_FULLY_UTILIZED: 'EX009',
};

// Transaction types that require approval
const APPROVAL_REQUIRED_TYPES = [
  'LOAN_DISBURSEMENT',
  'LOAN_REPAYMENT',
  'OUTWARD_TRANSFER',
  'INWARD_TRANSFER',
  'FOREX_PURCHASE',
  'FOREX_SALE',
];

export async function runReconciliation(
  submissionId: string,
  userId: string
): Promise<ReconciliationResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, bankId: true },
  });

  if (!submission) {
    throw new Error(`Submission not found: ${submissionId}`);
  }

  return reconcileTransactions({
    bankId: submission.bankId,
    submissionId: submission.id,
    userId,
  });
}

async function reconcileTransactions(params: {
  bankId: string;
  userId: string;
  submissionId?: string;
}): Promise<ReconciliationResult> {
  const { bankId, submissionId, userId } = params;

  const transactions = await prisma.transaction.findMany({
    where: {
      bankId,
      ...(submissionId ? { submissionId } : {}),
    },
    include: {
      approval: true,
    },
  });

  const exceptions: ExceptionDetail[] = [];
  let matchedCount = 0;

  for (const transaction of transactions) {
    const transactionExceptions = await reconcileTransaction(transaction, bankId);
    
    if (transactionExceptions.length === 0) {
      matchedCount++;
    } else {
      exceptions.push(...transactionExceptions);
    }
  }

  if (transactions.length > 0) {
    await prisma.exception.deleteMany({
      where: {
        transactionId: { in: transactions.map((transaction) => transaction.id) },
        status: { in: [ExceptionStatus.OPEN, ExceptionStatus.UNDER_REVIEW] },
      },
    });
  }

  // Create exceptions in database
  if (exceptions.length > 0) {
    await prisma.exception.createMany({
      data: exceptions.map(ex => ({
        code: ex.code,
        description: ex.description,
        severity: ex.severity,
        bankId: bankId,
        transactionId: ex.transactionId,
        status: ExceptionStatus.OPEN,
      })),
    });
  }

  // Create audit log
  await createAuditLog({
    userId,
    action: 'RUN_RECONCILIATION',
    entityType: 'Bank',
    entityId: bankId,
    details: {
      bankId,
      totalTransactions: transactions.length,
      matchedTransactions: matchedCount,
      exceptionsCreated: exceptions.length,
    },
  });

  return {
    submissionId: submissionId || '',
    bankId,
    totalTransactions: transactions.length,
    matchedTransactions: matchedCount,
    exceptionsCreated: exceptions.length,
    exceptions,
  };
}

interface TransactionWithApproval {
  id: string;
  type: string;
  amount: number;
  currency: string;
  transactionDate: Date;
  approvalId: string | null;
  approval: {
    id: string;
    approvedAmount: number;
    utilizedAmount: number;
    currency: string;
    validityStart: Date;
    validityEnd: Date;
    status: string;
  } | null;
  counterpartyName: string | null;
  counterpartyCountry: string | null;
  purpose: string | null;
  referenceNumber: string;
}

async function reconcileTransaction(
  transaction: TransactionWithApproval,
  bankId: string
): Promise<ExceptionDetail[]> {
  const exceptions: ExceptionDetail[] = [];

  // Check for missing required fields
  const missingFields: string[] = [];
  if (!transaction.counterpartyName) missingFields.push('counterpartyName');
  if (!transaction.counterpartyCountry) missingFields.push('counterpartyCountry');
  if (!transaction.purpose) missingFields.push('purpose');

  if (missingFields.length > 0) {
    exceptions.push({
      code: EXCEPTION_CODES.MISSING_REQUIRED_FIELDS,
      description: `Transaction ${transaction.referenceNumber} is missing required fields: ${missingFields.join(', ')}`,
      severity: ExceptionSeverity.LOW,
      transactionId: transaction.id,
      details: { missingFields },
    });
  }

  // Check if transaction type requires approval
  if (APPROVAL_REQUIRED_TYPES.includes(transaction.type)) {
    if (!transaction.approvalId || !transaction.approval) {
      // Try to find matching approval
      const matchingApproval = await findMatchingApproval(transaction, bankId);

      if (!matchingApproval) {
        exceptions.push({
          code: EXCEPTION_CODES.NO_APPROVAL,
          description: `Transaction ${transaction.referenceNumber} of type ${transaction.type} has no matching approval`,
          severity: ExceptionSeverity.HIGH,
          transactionId: transaction.id,
          details: {
            transactionType: transaction.type,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
          },
        });
      } else {
        // Link the approval and validate
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { approvalId: matchingApproval.id },
        });

        const approvalExceptions = validateAgainstApproval(transaction, matchingApproval);
        exceptions.push(...approvalExceptions);

        // Update utilized amount
        await updateApprovalUtilization(matchingApproval.id, transaction.amount);
      }
    } else {
      // Validate against existing approval
      const approvalExceptions = validateAgainstApproval(transaction, transaction.approval);
      exceptions.push(...approvalExceptions);
    }
  }

  // Check for duplicate transactions
  const duplicates = await prisma.transaction.findMany({
    where: {
      bankId,
      referenceNumber: transaction.referenceNumber,
      id: { not: transaction.id },
      transactionDate: transaction.transactionDate,
      amount: transaction.amount,
    },
  });

  if (duplicates.length > 0) {
    exceptions.push({
      code: EXCEPTION_CODES.DUPLICATE_TRANSACTION,
      description: `Potential duplicate transaction found: ${transaction.referenceNumber}`,
      severity: ExceptionSeverity.MEDIUM,
      transactionId: transaction.id,
      details: {
        duplicateIds: duplicates.map((d: { id: string }) => d.id),
      },
    });
  }

  return exceptions;
}

interface ApprovalData {
  id: string;
  approvedAmount: number;
  utilizedAmount: number;
  currency: string;
  validityStart: Date;
  validityEnd: Date;
  status: string;
}

function validateAgainstApproval(
  transaction: {
    id: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    referenceNumber: string;
  },
  approval: ApprovalData
): ExceptionDetail[] {
  const exceptions: ExceptionDetail[] = [];

  // Check if approval is expired
  if (approval.status === ApprovalStatus.EXPIRED) {
    exceptions.push({
      code: EXCEPTION_CODES.EXPIRED_APPROVAL,
      description: `Transaction ${transaction.referenceNumber} is linked to an expired approval`,
      severity: ExceptionSeverity.HIGH,
      transactionId: transaction.id,
      details: {
        approvalId: approval.id,
        approvalStatus: approval.status,
      },
    });
  }

  // Check if approval is fully utilized
  if (approval.status === ApprovalStatus.EXHAUSTED) {
    exceptions.push({
      code: EXCEPTION_CODES.APPROVAL_FULLY_UTILIZED,
      description: `Transaction ${transaction.referenceNumber} exceeds fully utilized approval`,
      severity: ExceptionSeverity.HIGH,
      transactionId: transaction.id,
      details: {
        approvalId: approval.id,
        approvedAmount: approval.approvedAmount.toString(),
        utilizedAmount: approval.utilizedAmount.toString(),
      },
    });
  }

  // Check currency mismatch
  if (transaction.currency !== approval.currency) {
    exceptions.push({
      code: EXCEPTION_CODES.CURRENCY_MISMATCH,
      description: `Transaction ${transaction.referenceNumber} currency (${transaction.currency}) does not match approval currency (${approval.currency})`,
      severity: ExceptionSeverity.MEDIUM,
      transactionId: transaction.id,
      details: {
        transactionCurrency: transaction.currency,
        approvalCurrency: approval.currency,
      },
    });
  }

  // Check if amount exceeds remaining approval
  const remainingAmount = approval.approvedAmount - approval.utilizedAmount;
  if (transaction.amount > remainingAmount) {
    exceptions.push({
      code: EXCEPTION_CODES.AMOUNT_EXCEEDED,
      description: `Transaction ${transaction.referenceNumber} amount (${transaction.amount}) exceeds remaining approval amount (${remainingAmount})`,
      severity: ExceptionSeverity.HIGH,
      transactionId: transaction.id,
      details: {
        transactionAmount: transaction.amount.toString(),
        approvedAmount: approval.approvedAmount.toString(),
        utilizedAmount: approval.utilizedAmount.toString(),
        remainingAmount: remainingAmount.toString(),
      },
    });
  }

  // Check if transaction date is within validity period
  const txDate = new Date(transaction.transactionDate);
  if (txDate < approval.validityStart || txDate > approval.validityEnd) {
    exceptions.push({
      code: EXCEPTION_CODES.DATE_OUTSIDE_VALIDITY,
      description: `Transaction ${transaction.referenceNumber} date is outside approval validity period`,
      severity: ExceptionSeverity.HIGH,
      transactionId: transaction.id,
      details: {
        transactionDate: txDate.toISOString(),
        validityStart: approval.validityStart.toISOString(),
        validityEnd: approval.validityEnd.toISOString(),
      },
    });
  }

  return exceptions;
}

async function findMatchingApproval(
  transaction: {
    type: string;
    amount: number;
    currency: string;
    transactionDate: Date;
    counterpartyName: string | null;
  },
  bankId: string
) {
  const txDate = new Date(transaction.transactionDate);

  // Find active approvals with matching criteria
  const approvals = await prisma.approval.findMany({
    where: {
      bankId,
      type: transaction.type,
      currency: transaction.currency,
      status: ApprovalStatus.ACTIVE,
      validityStart: { lte: txDate },
      validityEnd: { gte: txDate },
    },
    orderBy: { validityEnd: 'asc' },
  });

  // Find approval with sufficient remaining amount
  for (const approval of approvals) {
    const remaining = approval.approvedAmount - approval.utilizedAmount;
    if (remaining >= transaction.amount) {
      return approval;
    }
  }

  return null;
}

async function updateApprovalUtilization(approvalId: string, amount: number): Promise<void> {
  const approval = await prisma.approval.findUnique({
    where: { id: approvalId },
  });

  if (!approval) return;

  const newUtilized = approval.utilizedAmount + amount;
  let newStatus = approval.status;

  if (newUtilized >= approval.approvedAmount) {
    newStatus = ApprovalStatus.EXHAUSTED;
  }

  await prisma.approval.update({
    where: { id: approvalId },
    data: {
      utilizedAmount: newUtilized,
      status: newStatus,
    },
  });
}

export async function runBatchReconciliation(
  bankId: string,
  userId: string
): Promise<ReconciliationResult[]> {
  const result = await reconcileTransactions({ bankId, userId });
  return [result];
}

export async function getReconciliationSummary(bankId?: string) {
  const where = bankId ? { bankId } : {};

  const [
    totalTransactions,
    transactionsWithApproval,
    openExceptions,
    exceptionsBySeverity,
  ] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.count({
      where: {
        ...where,
        approvalId: { not: null },
      },
    }),
    prisma.exception.count({
      where: {
        ...where,
        status: ExceptionStatus.OPEN,
      },
    }),
    prisma.exception.groupBy({
      by: ['severity'],
      where,
      _count: { severity: true },
    }),
  ]);

  const severityCounts = Object.fromEntries(
    exceptionsBySeverity.map((e: { severity: string; _count: { severity: number } }) => [e.severity, e._count.severity])
  );

  return {
    totalTransactions,
    transactionsWithApproval,
    transactionsWithoutApproval: totalTransactions - transactionsWithApproval,
    matchRate: totalTransactions > 0 
      ? Math.round((transactionsWithApproval / totalTransactions) * 100) 
      : 0,
    openExceptions,
    exceptionsBySeverity: {
      critical: severityCounts['CRITICAL'] || 0,
      high: severityCounts['HIGH'] || 0,
      medium: severityCounts['MEDIUM'] || 0,
      low: severityCounts['LOW'] || 0,
    },
  };
}
