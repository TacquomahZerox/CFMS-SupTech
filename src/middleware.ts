import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import { verifyToken } from '@/lib/auth';

const publicRoutes = ['/login', '/api/auth/login'];

const roleRoutes: Record<string, string[]> = {
  '/users': ['SUPER_ADMIN'],
  '/api/users': ['SUPER_ADMIN'],
  '/settings': ['SUPER_ADMIN'],
};

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return withSecurityHeaders(NextResponse.next());
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    if (!pathname.startsWith('/api')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return withSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    );
  }

  const session = await verifyToken(token);

  if (!session) {
    const response = pathname.startsWith('/api')
      ? NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(AUTH_COOKIE_NAME);
    return withSecurityHeaders(response);
  }

  for (const [route, allowedRoles] of Object.entries(roleRoutes)) {
    if (pathname.startsWith(route) && !allowedRoles.includes(session.role)) {
      if (!pathname.startsWith('/api')) {
        return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', request.url)));
      }
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      );
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-user-role', session.role);
  requestHeaders.set('x-user-email', session.email);
  if (session.bankId) {
    requestHeaders.set('x-user-bank-id', session.bankId);
  }

  return withSecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
