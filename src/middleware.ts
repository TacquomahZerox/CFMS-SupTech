import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
);

// Public routes that don't require authentication
const publicRoutes = ['/login', '/api/auth/login'];

// Routes that require specific roles
const roleRoutes: Record<string, string[]> = {
  '/users': ['SUPER_ADMIN'],
  '/api/users': ['SUPER_ADMIN'],
  '/settings': ['SUPER_ADMIN'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and API health checks
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Get auth token from cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Redirect to login for page requests
    if (!pathname.startsWith('/api')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Return 401 for API requests
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Verify the token
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userRole = payload.role as string;

    // Check role-based access
    for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(route) && !allowedRoles.includes(userRole)) {
        if (!pathname.startsWith('/api')) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-email', payload.email as string);
    if (payload.bankId) {
      requestHeaders.set('x-user-bank-id', payload.bankId as string);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Token is invalid or expired
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
