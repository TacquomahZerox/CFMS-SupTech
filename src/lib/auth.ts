import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// User role type for SQLite (no enum support)
type UserRole = 'SUPER_ADMIN' | 'CFM_OFFICER' | 'SUPERVISOR' | 'BANK_USER' | 'AUDITOR';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
);

const SESSION_DURATION = parseInt(process.env.SESSION_DURATION_HOURS || '24') * 60 * 60 * 1000;

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  bankId: string | null;
  firstName: string;
  lastName: string;
  exp?: number;
  iat?: number;
}

export async function createToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${process.env.SESSION_DURATION_HOURS || '24'}h`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function getSessionFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

// Role-based permission checking
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: [
    'users:read', 'users:write', 'users:delete',
    'banks:read', 'banks:write', 'banks:delete',
    'approvals:read', 'approvals:write', 'approvals:delete',
    'transactions:read', 'transactions:write',
    'submissions:read', 'submissions:write',
    'exceptions:read', 'exceptions:write',
    'reports:read', 'reports:export',
    'risk:read', 'risk:write',
    'audit:read',
    'settings:read', 'settings:write',
  ],
  CFM_OFFICER: [
    'banks:read',
    'approvals:read', 'approvals:write',
    'transactions:read',
    'submissions:read',
    'exceptions:read',
    'reports:read', 'reports:export',
    'risk:read',
  ],
  SUPERVISOR: [
    'banks:read',
    'approvals:read',
    'transactions:read',
    'submissions:read',
    'exceptions:read', 'exceptions:write',
    'reports:read', 'reports:export',
    'risk:read', 'risk:write',
    'audit:read',
  ],
  BANK_USER: [
    'banks:read:own',
    'approvals:read:own',
    'transactions:read:own', 'transactions:write:own',
    'submissions:read:own', 'submissions:write:own',
    'exceptions:read:own',
    'reports:read:own',
    'risk:read:own',
  ],
  AUDITOR: [
    'banks:read',
    'approvals:read',
    'transactions:read',
    'submissions:read',
    'exceptions:read',
    'reports:read', 'reports:export',
    'risk:read',
    'audit:read',
  ],
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  // Exact match
  if (permissions.includes(permission)) return true;
  // If the role has the ":own" variant, it still satisfies the base permission
  // e.g. BANK_USER has 'banks:read:own' which satisfies 'banks:read'
  if (permissions.includes(`${permission}:own`)) return true;
  // Also handle when a specific permission is requested but user has the base
  if (permissions.includes(permission.replace(':own', ''))) return true;
  return false;
}

export function canAccessBank(role: UserRole, userBankId: string | null, targetBankId: string): boolean {
  if (['SUPER_ADMIN', 'CFM_OFFICER', 'SUPERVISOR', 'AUDITOR'].includes(role)) {
    return true;
  }
  return userBankId === targetBankId;
}
