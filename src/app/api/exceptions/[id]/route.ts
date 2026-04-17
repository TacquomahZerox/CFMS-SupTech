import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { exceptionUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';
import { canAccessInstitution, canResolveException } from '@/lib/policies';
import { assertValidExceptionTransition } from '@/lib/workflows';

// GET /api/exceptions/[id] - Get exception details
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const exception = await prisma.exception.findUnique({
      where: { id },
      include: {
        bank: { select: { id: true, code: true, name: true } },
        transaction: {
          include: {
            approval: true,
          },
        },
      },
    });

    if (!exception) {
      return errorResponse('Exception not found', 404);
    }

    if (!canAccessInstitution(session, exception.bankId)) {
      return errorResponse('Access denied', 403);
    }

    return successResponse(exception);
  },
  { requiredPermission: 'exceptions:read' }
);

// PUT /api/exceptions/[id] - Update exception status
export const PUT = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;
    const body = await request.json();
    const validated = exceptionUpdateSchema.parse(body);

    const existing = await prisma.exception.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('Exception not found', 404);
    }

    if (!canResolveException(session, existing.bankId)) {
      return errorResponse('Access denied', 403);
    }

    assertValidExceptionTransition(existing.status, validated.status);

    const updateData: Record<string, unknown> = {
      status: validated.status,
    };

    if (validated.resolution) {
      updateData.resolution = validated.resolution;
    }

    if (validated.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      updateData.resolvedById = session.userId;
    }

    const exception = await prisma.exception.update({
      where: { id },
      data: updateData,
      include: {
        bank: { select: { code: true, name: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'exception.state_changed',
      entityType: 'Exception',
      entityId: exception.id,
      details: { 
        previousStatus: existing.status, 
        newStatus: validated.status,
        resolution: validated.resolution,
      },
    });

    return successResponse(exception);
  },
  { requiredPermission: 'exceptions:write' }
);
