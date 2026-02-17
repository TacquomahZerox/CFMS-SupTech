import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { canAccessBank } from '@/lib/auth';

// GET /api/submissions/[id] - Get submission details
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        bank: { select: { id: true, code: true, name: true } },
        submittedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!submission) {
      return errorResponse('Submission not found', 404);
    }

    if (!canAccessBank(session.role, session.bankId, submission.bankId)) {
      return errorResponse('Access denied', 403);
    }

    return successResponse(submission);
  },
  { requiredPermission: 'submissions:read' }
);
