import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse, paginatedResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';
import { ValidationError } from '@/lib/errors';
import { processTransactionUpload } from '@/services/upload.service';


const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_UPLOAD_EXTENSIONS = ['.csv'];

function assertSafeUpload(file: File): void {
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    throw new ValidationError('Only CSV uploads are supported');
  }

  if (file.size <= 0 || file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new ValidationError('File size must be between 1 byte and 10 MB');
  }
}


// GET /api/submissions - List submissions
export const GET = createApiHandler(
  async (request, { session }) => {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const bankId = searchParams.get('bankId') || undefined;
    const status = searchParams.get('status') || undefined;

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

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where,
        include: {
          bank: { select: { code: true, name: true } },
          submittedBy: { select: { firstName: true, lastName: true, email: true } },
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

    if (!file) {
      return errorResponse('No file provided', 400);
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

    const result = await processTransactionUpload(
      fileContent,
      targetBankId,
      session.userId,
      fileName
    );

    if (!result.success) {
      return errorResponse('Upload failed', 400, result.errors);
    }

    return successResponse(result, 201);
  },
  { requiredPermission: 'submissions:write' }
);
