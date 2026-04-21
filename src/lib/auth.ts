import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import {
  AUTH_AUDIENCE,
  AUTH_COOKIE_NAME,
  AUTH_ISSUER,
  SESSION_DURATION_SECONDS,
  USER_ROLES,
  type UserRole,
} from '@/lib/constants';
import { listPermissions } from '@/lib/permissions';

const CROSS_BANK_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CFM_OFFICER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.AUDITOR,
]);

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
);

export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  bankId: string | null;
  firstName: string;
  lastName: string;
  tokenVersion: number;
  permissions: string[];
}

interface TokenClaims extends AuthSession {
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
}

function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

function isTokenClaims(payload: unknown): payload is TokenClaims {
  if (!payload || typeof payload !== 'object') return false;
  const candidate = payload as Partial<TokenClaims>;
  return Boolean(
    candidate.userId &&
      candidate.email &&
      candidate.role &&
      isValidRole(candidate.role)
  );
}

export async function createToken(
  payload: Omit<AuthSession, 'permissions'>
): Promise<string> {
  const permissions = listPermissions(payload.role);

  return new SignJWT({ ...payload, permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(AUTH_ISSUER)
    .setAudience(AUTH_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: AUTH_ISSUER,
      audience: AUTH_AUDIENCE,
    });

    if (!isTokenClaims(payload)) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      bankId: payload.bankId ?? null,
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      tokenVersion: payload.tokenVersion ?? 1,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.filter((item) => typeof item === 'string')
        : listPermissions(payload.role),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifyToken(token);
}

export async function getSessionFromRequest(
  request: NextRequest
): Promise<AuthSession | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export { hasPermission } from '@/lib/permissions';
export function canAccessBank(
  role: UserRole,
  userBankId: string | null,
  targetBankId: string
): boolean {
  if (CROSS_BANK_ROLES.has(role)) {
    return true;
  }
  return userBankId === targetBankId;
}
