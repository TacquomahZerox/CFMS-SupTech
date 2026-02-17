import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { createApiHandler, successResponse, errorResponse } from '@/lib/api-utils';
import { userUpdateSchema } from '@/lib/validations';
import { createAuditLog } from '@/services/audit.service';

// GET /api/users/[id] - Get user by ID
export const GET = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        bank: { select: { id: true, code: true, name: true } },
      },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  },
  { requiredPermission: 'users:read' }
);

// PUT /api/users/[id] - Update user
export const PUT = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;
    const body = await request.json();
    const validated = userUpdateSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('User not found', 404);
    }

    // Check email uniqueness if changing
    if (validated.email && validated.email !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validated.email },
      });
      if (emailExists) {
        return errorResponse('Email already in use', 400);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        bank: { select: { code: true, name: true } },
      },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: user.id,
      details: { changes: validated },
    });

    return successResponse(user);
  },
  { requiredPermission: 'users:write' }
);

// DELETE /api/users/[id] - Deactivate user
export const DELETE = createApiHandler(
  async (request, { params, session }) => {
    const { id } = await params;

    // Prevent self-deletion
    if (id === session.userId) {
      return errorResponse('Cannot delete your own account', 400);
    }

    const existing = await prisma.user.findUnique({
      where: { id },
    });

    if (!existing) {
      return errorResponse('User not found', 404);
    }

    // Soft delete - deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      details: { email: existing.email },
    });

    return successResponse({ message: 'User deactivated successfully' });
  },
  { requiredPermission: 'users:delete' }
);
