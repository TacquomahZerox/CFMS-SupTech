import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, hasPermission, type AuthSession } from '@/lib/auth';
import {
  AuthenticationError,
  AuthorizationError,
  DomainError,
  ValidationError,
} from '@/lib/errors';
import { USER_ROLES, type UserRole } from '@/lib/constants';

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>>; session: AuthSession; requestId: string }
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  requiredPermission?: string;
  allowedRoles?: UserRole[];
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
}

function buildRequestId(request: NextRequest): string {
  return request.headers.get('x-request-id') || randomUUID();
}

function mapError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return new ValidationError('Request validation failed', error.errors);
  }

  return new DomainError('An unexpected error occurred', 'INTERNAL_ERROR', 500);
}

export function createApiHandler(handler: RouteHandler, options: ApiHandlerOptions = {}) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = buildRequestId(request);

    try {
      const session = await getSessionFromRequest(request);
      if (!session) {
        throw new AuthenticationError();
      }

      if (options.allowedRoles && !options.allowedRoles.includes(session.role)) {
        throw new AuthorizationError();
      }

      if (options.requiredPermission && !hasPermission(session.role, options.requiredPermission)) {
        throw new AuthorizationError();
      }

      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const body = await request.json();
        const validated = options.validateBody.parse(body);
        (request as NextRequest & { validatedBody: unknown }).validatedBody = validated;
      }

      if (options.validateQuery) {
        const params = Object.fromEntries(request.nextUrl.searchParams);
        const validated = options.validateQuery.parse(params);
        (request as NextRequest & { validatedQuery: unknown }).validatedQuery = validated;
      }

      return await handler(request, { params: context.params, session, requestId });
    } catch (error) {
      const mappedError = mapError(error);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: mappedError.code,
            message: mappedError.message,
            details: mappedError.details,
          },
          meta: { requestId },
        },
        { status: mappedError.statusCode }
      );
    }
  };
}

export function getValidatedBody<T>(request: NextRequest): T {
  return (request as NextRequest & { validatedBody: T }).validatedBody;
}

export function getValidatedQuery<T>(request: NextRequest): T {
  return (request as NextRequest & { validatedQuery: T }).validatedQuery;
}

export function successResponse<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ success: true, data, error: null, meta: meta ?? null }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: unknown,
  code = 'REQUEST_ERROR'
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: { code, message, details },
      meta: null,
    },
    { status }
  );
}

export function paginatedResponse<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number; totalPages: number }
) {
  return NextResponse.json({
    success: true,
    data,
    error: null,
    meta: { pagination },
  });
}

export const ALL_ROLES = Object.values(USER_ROLES);
