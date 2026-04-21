import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { transactionCreateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canAccessBank } from '@/lib/auth';

// GET /api/transactions - List transactions
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const type = searchParams.get('type') || undefined;
    const submissionId = searchParams.get('submissionId') || undefined;
    const hasApproval = searchParams.get('hasApproval');
    const search = searchParams.get('search') || undefined;
    const startDate = searchParams.get('startDate') || searchParams.get('dateFrom');
    const endDate = searchParams.get('endDate') || searchParams.get('dateTo');

    const where: Record<string, unknown> = {};

    if (bankId) {
      if (!canAccessBank(session.role, session.bankId, bankId)) {
        return errorResponse('Access denied', 403);
      }
      where.bankId = bankId;
    } else if (session.role === 'BANK_USER' && session.bankId) {
      where.bankId = session.bankId;
    }

    if (type) where.type = type;
    if (submissionId) where.submissionId = submissionId;

    if (hasApproval !== null && hasApproval !== undefined) {
      where.approvalId = hasApproval === 'true' ? { not: null } : null;
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { counterpartyName: { contains: search } },
        { documentReference: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) (where.transactionDate as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.transactionDate as Record<string, Date>).lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          branch: { select: { code: true, name: true } },
          approval: { select: { referenceNumber: true, type: true } },
          submission: { select: { id: true, referenceNumber: true, type: true } },
          _count: { select: { exceptions: true } },
        },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return paginatedResponse(transactions, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'transactions:read' }
);

// POST /api/transactions - Create transaction
export const POST = createApiHandler(
  async (request, { session }) => {
    const body = await request.json();
    const validated = transactionCreateSchema.parse(body);
    const targetBankId = session.role === 'BANK_USER' ? session.bankId : validated.bankId;

    if (!targetBankId) {
      return errorResponse('Bank ID is required', 400);
    }

    if (!canAccessBank(session.role, session.bankId, targetBankId)) {
      return errorResponse('Access denied', 403);
    }

    const existing = await prisma.transaction.findUnique({
      where: { referenceNumber: validated.referenceNumber },
    });

    if (existing) {
      return errorResponse('Transaction with this reference number already exists', 400);
    }

    if (validated.submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: validated.submissionId },
        select: { id: true, bankId: true },
      });

      if (!submission) {
        return errorResponse('Submission not found', 404);
      }

      if (submission.bankId !== targetBankId) {
        return errorResponse('Submission does not belong to the selected bank', 400);
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        referenceNumber: validated.referenceNumber,
        type: validated.type,
        amount: validated.amount,
        currency: validated.currency.toUpperCase(),
        exchangeRate: validated.exchangeRate,
        transactionDate: new Date(validated.transactionDate),
        valueDate: validated.valueDate ? new Date(validated.valueDate) : new Date(validated.transactionDate),
        counterpartyName: validated.counterpartyName,
        counterpartyAccount: validated.counterpartyAccount,
        counterpartyCountry: validated.counterpartyCountry,
        purpose: validated.purpose,
        documentReference: validated.documentReference,
        bankId: targetBankId,
        branchId: validated.branchId,
        approvalId: validated.approvalId,
        submissionId: validated.submissionId,
      },
      include: {
        bank: { select: { id: true, code: true, name: true } },
        branch: { select: { code: true, name: true } },
        approval: { select: { id: true, referenceNumber: true, type: true } },
        submission: { select: { id: true, referenceNumber: true, type: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'transaction.created',
      entityType: 'Transaction',
      entityId: transaction.id,
      details: {
        referenceNumber: transaction.referenceNumber,
        bankId: targetBankId,
      },
    });

    return successResponse(transaction, 201);
  },
  { requiredPermission: 'transactions:write' }
);
