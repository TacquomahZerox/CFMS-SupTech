import { z } from 'zod';

// ============================================
// TYPE CONSTANTS (for SQLite - no enum support)
// ============================================

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CFM_OFFICER: 'CFM_OFFICER',
  SUPERVISOR: 'SUPERVISOR',
  BANK_USER: 'BANK_USER',
  AUDITOR: 'AUDITOR',
} as const;

export const ApprovalType = {
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

export const ApprovalStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  EXHAUSTED: 'EXHAUSTED',
} as const;

export const TransactionType = {
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

export const ExceptionSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const ExceptionStatus = {
  OPEN: 'OPEN',
  UNDER_REVIEW: 'UNDER_REVIEW',
  RESOLVED: 'RESOLVED',
  WAIVED: 'WAIVED',
} as const;

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.CFM_OFFICER, UserRole.SUPERVISOR, UserRole.BANK_USER, UserRole.AUDITOR]),
  bankId: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================
// USER SCHEMAS
// ============================================

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.CFM_OFFICER, UserRole.SUPERVISOR, UserRole.BANK_USER, UserRole.AUDITOR]),
  bankId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.CFM_OFFICER, UserRole.SUPERVISOR, UserRole.BANK_USER, UserRole.AUDITOR]).optional(),
  bankId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ============================================
// BANK SCHEMAS
// ============================================

export const bankCreateSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(3),
  swiftCode: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const bankUpdateSchema = bankCreateSchema.partial();

export const branchCreateSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(3),
  address: z.string().optional(),
  bankId: z.string(),
  isActive: z.boolean().default(true),
});

export const branchUpdateSchema = branchCreateSchema.partial().omit({ bankId: true });

// ============================================
// APPROVAL SCHEMAS
// ============================================

const approvalTypeValues = [
  ApprovalType.FOREX_PURCHASE,
  ApprovalType.FOREX_SALE,
  ApprovalType.OUTWARD_TRANSFER,
  ApprovalType.INWARD_TRANSFER,
  ApprovalType.LOAN_DISBURSEMENT,
  ApprovalType.LOAN_REPAYMENT,
  ApprovalType.DIVIDEND_PAYMENT,
  ApprovalType.CAPITAL_REPATRIATION,
  ApprovalType.OTHER,
] as const;

const approvalStatusValues = [
  ApprovalStatus.PENDING,
  ApprovalStatus.ACTIVE,
  ApprovalStatus.EXPIRED,
  ApprovalStatus.REVOKED,
  ApprovalStatus.EXHAUSTED,
] as const;

export const approvalCreateSchema = z.object({
  referenceNumber: z.string().min(3),
  type: z.enum(approvalTypeValues),
  approvedAmount: z.number().positive(),
  currency: z.string().length(3),
  validityStart: z.string().datetime().or(z.date()),
  validityEnd: z.string().datetime().or(z.date()),
  conditions: z.string().optional(),
  beneficiaryName: z.string().optional(),
  beneficiaryAccount: z.string().optional(),
  purpose: z.string().optional(),
  bankId: z.string(),
  status: z.enum(approvalStatusValues).default(ApprovalStatus.ACTIVE),
});

export const approvalUpdateSchema = approvalCreateSchema.partial().omit({ bankId: true, referenceNumber: true });

export const approvalBulkUploadSchema = z.array(z.object({
  referenceNumber: z.string(),
  type: z.string(),
  approvedAmount: z.number(),
  currency: z.string(),
  validityStart: z.string(),
  validityEnd: z.string(),
  beneficiaryName: z.string().optional(),
  bankCode: z.string(),
  conditions: z.string().optional(),
  beneficiaryAccount: z.string().optional(),
  purpose: z.string().optional(),
}));

// ============================================
// TRANSACTION SCHEMAS
// ============================================

const transactionTypeValues = [
  TransactionType.FOREX_PURCHASE,
  TransactionType.FOREX_SALE,
  TransactionType.OUTWARD_TRANSFER,
  TransactionType.INWARD_TRANSFER,
  TransactionType.LOAN_DISBURSEMENT,
  TransactionType.LOAN_REPAYMENT,
  TransactionType.DIVIDEND_PAYMENT,
  TransactionType.CAPITAL_REPATRIATION,
  TransactionType.OTHER,
] as const;

export const transactionCreateSchema = z.object({
  referenceNumber: z.string().min(1),
  type: z.enum(transactionTypeValues),
  amount: z.number().positive(),
  currency: z.string().length(3),
  exchangeRate: z.number().positive().optional(),
  transactionDate: z.string().datetime().or(z.date()),
  valueDate: z.string().datetime().or(z.date()).optional(),
  counterpartyName: z.string().optional(),
  counterpartyCountry: z.string().optional(),
  purpose: z.string().optional(),
  bankId: z.string(),
  branchId: z.string().optional(),
  approvalId: z.string().optional(),
});

export const transactionBulkSchema = z.array(z.object({
  referenceNumber: z.string(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  exchangeRate: z.number().optional(),
  transactionDate: z.string(),
  valueDate: z.string().optional(),
  counterpartyName: z.string().optional(),
  counterpartyCountry: z.string().optional(),
  purpose: z.string().optional(),
  branchCode: z.string().optional(),
  approvalReference: z.string().optional(),
}));

// ============================================
// SUBMISSION SCHEMAS
// ============================================

export const submissionCreateSchema = z.object({
  fileName: z.string(),
  type: z.string(),
  bankId: z.string(),
});

// ============================================
// EXCEPTION SCHEMAS
// ============================================

const exceptionSeverityValues = [
  ExceptionSeverity.LOW,
  ExceptionSeverity.MEDIUM,
  ExceptionSeverity.HIGH,
  ExceptionSeverity.CRITICAL,
] as const;

const exceptionStatusValues = [
  ExceptionStatus.OPEN,
  ExceptionStatus.UNDER_REVIEW,
  ExceptionStatus.RESOLVED,
  ExceptionStatus.WAIVED,
] as const;

export const exceptionCreateSchema = z.object({
  code: z.string(),
  description: z.string(),
  severity: z.enum(exceptionSeverityValues),
  bankId: z.string(),
  transactionId: z.string().optional(),
});

export const exceptionUpdateSchema = z.object({
  status: z.enum(exceptionStatusValues),
  resolution: z.string().optional(),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const bankFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const approvalFilterSchema = paginationSchema.merge(dateRangeSchema).extend({
  bankId: z.string().optional(),
  type: z.enum(approvalTypeValues).optional(),
  status: z.enum(approvalStatusValues).optional(),
  search: z.string().optional(),
});

export const transactionFilterSchema = paginationSchema.merge(dateRangeSchema).extend({
  bankId: z.string().optional(),
  type: z.enum(transactionTypeValues).optional(),
  submissionId: z.string().optional(),
  hasApproval: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

export const exceptionFilterSchema = paginationSchema.extend({
  bankId: z.string().optional(),
  severity: z.enum(exceptionSeverityValues).optional(),
  status: z.enum(exceptionStatusValues).optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type BankCreateInput = z.infer<typeof bankCreateSchema>;
export type BankUpdateInput = z.infer<typeof bankUpdateSchema>;
export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
export type ApprovalCreateInput = z.infer<typeof approvalCreateSchema>;
export type ApprovalUpdateInput = z.infer<typeof approvalUpdateSchema>;
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;
export type ExceptionCreateInput = z.infer<typeof exceptionCreateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
