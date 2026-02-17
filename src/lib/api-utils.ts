import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionFromRequest, hasPermission, JWTPayload } from '@/lib/auth';

// User role type for SQLite (no enum support)
type UserRole = 'SUPER_ADMIN' | 'CFM_OFFICER' | 'SUPERVISOR' | 'BANK_USER' | 'AUDITOR';

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>>; session: JWTPayload }
) => Promise<NextResponse>;

interface ApiHandlerOptions {
  requiredPermission?: string;
  allowedRoles?: UserRole[];
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
}

export function createApiHandler(
  handler: RouteHandler,
  options: ApiHandlerOptions = {}
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // Authenticate
      const session = await getSessionFromRequest(request);
      
      if (!session) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check role permissions
      if (options.allowedRoles && !options.allowedRoles.includes(session.role)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      if (options.requiredPermission && !hasPermission(session.role, options.requiredPermission)) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Validate request body if schema provided
      if (options.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const validated = options.validateBody.parse(body);
          // Attach validated body to request
          (request as NextRequest & { validatedBody: unknown }).validatedBody = validated;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Validation Error', 
                message: 'Invalid request body',
                details: error.errors 
              },
              { status: 400 }
            );
          }
          throw error;
        }
      }

      // Validate query params if schema provided
      if (options.validateQuery) {
        try {
          const params = Object.fromEntries(request.nextUrl.searchParams);
          const validated = options.validateQuery.parse(params);
          (request as NextRequest & { validatedQuery: unknown }).validatedQuery = validated;
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { 
                error: 'Validation Error', 
                message: 'Invalid query parameters',
                details: error.errors 
              },
              { status: 400 }
            );
          }
          throw error;
        }
      }

      // Call the actual handler
      return await handler(request, { params: context.params, session });
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation Error', details: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'An unexpected error occurred' },
        { status: 500 }
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

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status: number = 400, details?: unknown) {
  return NextResponse.json(
    { success: false, error: message, details },
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
    pagination,
  });
}
