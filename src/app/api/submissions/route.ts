import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';
import { processApprovalUpload, processTransactionUpload } from '@/services/upload.service';


const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = ['.csv'];
const SUBMISSION_TYPE_MAP: Record<string, string> = {
  TRANSACTION: 'TRANSACTIONS',
  TRANSACTIONS: 'TRANSACTIONS',
  APPROVAL: 'APPROVALS',
  APPROVALS: 'APPROVALS',
};

function assertSafeUpload(file: File): void {
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    throw new ValidationError('Only CSV uploads are supported');
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new ValidationError('File size must be between 1 byte and 10 MB');
  }
}

function normalizeSubmissionType(rawType: FormDataEntryValue | string | null): string | null {
  if (typeof rawType !== 'string') {
    return null;
  }

  const normalized = SUBMISSION_TYPE_MAP[rawType.trim().toUpperCase()];
  return normalized || null;
}


// GET /api/submissions - List submissions
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const status = searchParams.get('status') || undefined;
    const type = normalizeSubmissionType(searchParams.get('type'));
    const search = searchParams.get('search') || undefined;

    const where: Record<string, unknown> = {};

    if (bankId) {
      if (!canAccessBank(session.role, session.bankId, bankId)) {
        return errorResponse('Access denied', 403);
      }
      where.bankId = bankId;
    } else if (session.role === 'BANK_USER' && session.bankId) {
      where.bankId = session.bankId;
    }

    if (status) where.status = status;
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search } },
        { fileName: { contains: search } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          submittedBy: { select: { firstName: true, lastName: true, email: true } },
          _count: { select: { transactions: true } },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.submission.count({ where }),
    ]);

    return paginatedResponse(submissions, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  },
  { requiredPermission: 'submissions:read' }
);

// POST /api/submissions - Create new submission (upload)
export const POST = createApiHandler(
  async (request, { session }) => {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bankId = formData.get('bankId') as string;
    const uploadType = normalizeSubmissionType(formData.get('type'));

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    if (!uploadType) {
      return errorResponse('Invalid submission type', 400);
    }

    assertSafeUpload(file);

    // Check bank access
    const targetBankId = session.role === 'BANK_USER' ? session.bankId : bankId;
    
    if (!targetBankId) {
      return errorResponse('Bank ID is required', 400);
    }

    if (!canAccessBank(session.role, session.bankId, targetBankId)) {
      return errorResponse('Access denied', 403);
    }

    const fileContent = await file.text();
    const fileName = file.name;

    let result;

    if (uploadType === 'TRANSACTIONS') {
      if (!hasPermission(session.role, PERMISSIONS.SUBMISSIONS_WRITE)) {
        return errorResponse('Access denied', 403);
      }

      result = await processTransactionUpload(
        fileContent,
        targetBankId,
        session.userId,
        fileName
      );
    } else {
      if (!hasPermission(session.role, PERMISSIONS.APPROVALS_WRITE)) {
        return errorResponse('Access denied', 403);
      }

      result = await processApprovalUpload(
        fileContent,
        targetBankId,
        session.userId,
        fileName
      );
    }

    if (!result.success) {
      return errorResponse(`${uploadType === 'APPROVALS' ? 'Approval upload' : 'Upload'} failed`, 400, result.errors);
    }

    return successResponse(result, 201);
  },
  {}
);
