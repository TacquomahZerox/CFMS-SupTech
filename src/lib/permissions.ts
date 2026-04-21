import { USER_ROLES, type UserRole } from '@/lib/constants';

export const PERMISSIONS = {
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  BANKS_READ: 'banks:read',
  BANKS_WRITE: 'banks:write',
  BANKS_DELETE: 'banks:delete',
  APPROVALS_READ: 'approvals:read',
  APPROVALS_WRITE: 'approvals:write',
  APPROVALS_DELETE: 'approvals:delete',
  APPROVALS_APPROVE: 'approvals:approve',
  TRANSACTIONS_READ: 'transactions:read',
  TRANSACTIONS_WRITE: 'transactions:write',
  SUBMISSIONS_READ: 'submissions:read',
  SUBMISSIONS_WRITE: 'submissions:write',
  SUBMISSIONS_APPROVE: 'submissions:approve',
  EXCEPTIONS_READ: 'exceptions:read',
  EXCEPTIONS_WRITE: 'exceptions:write',
  EXCEPTIONS_RESOLVE: 'exceptions:resolve',
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  RISK_READ: 'risk:read',
  RISK_WRITE: 'risk:write',
  AUDIT_READ: 'audit:read',
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type PermissionSet = ReadonlySet<string>;

const rolePermissions: Record<UserRole, PermissionSet> = {
  [USER_ROLES.SUPER_ADMIN]: new Set(Object.values(PERMISSIONS)),
  [USER_ROLES.CFM_OFFICER]: new Set([
    PERMISSIONS.BANKS_READ,
    PERMISSIONS.APPROVALS_READ,
    PERMISSIONS.APPROVALS_WRITE,
    PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.SUBMISSIONS_READ,
    PERMISSIONS.SUBMISSIONS_APPROVE,
    PERMISSIONS.EXCEPTIONS_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.RISK_READ,
  ]),
  [USER_ROLES.SUPERVISOR]: new Set([
    PERMISSIONS.BANKS_READ,
    PERMISSIONS.APPROVALS_READ,
    PERMISSIONS.APPROVALS_APPROVE,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.SUBMISSIONS_READ,
    PERMISSIONS.SUBMISSIONS_APPROVE,
    PERMISSIONS.EXCEPTIONS_READ,
    PERMISSIONS.EXCEPTIONS_WRITE,
    PERMISSIONS.EXCEPTIONS_RESOLVE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.RISK_WRITE,
    PERMISSIONS.AUDIT_READ,
  ]),
  [USER_ROLES.BANK_USER]: new Set([
    `${PERMISSIONS.BANKS_READ}:own`,
    `${PERMISSIONS.APPROVALS_READ}:own`,
    `${PERMISSIONS.TRANSACTIONS_READ}:own`,
    `${PERMISSIONS.TRANSACTIONS_WRITE}:own`,
    `${PERMISSIONS.SUBMISSIONS_READ}:own`,
    `${PERMISSIONS.SUBMISSIONS_WRITE}:own`,
    `${PERMISSIONS.EXCEPTIONS_READ}:own`,
    `${PERMISSIONS.REPORTS_READ}:own`,
    `${PERMISSIONS.REPORTS_EXPORT}:own`,
    `${PERMISSIONS.RISK_READ}:own`,
  ]),
  [USER_ROLES.AUDITOR]: new Set([
    PERMISSIONS.BANKS_READ,
    PERMISSIONS.APPROVALS_READ,
    PERMISSIONS.TRANSACTIONS_READ,
    PERMISSIONS.SUBMISSIONS_READ,
    PERMISSIONS.EXCEPTIONS_READ,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.AUDIT_READ,
  ]),
};

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = rolePermissions[role];
  if (permissions.has(permission)) return true;
  if (permissions.has(`${permission}:own`)) return true;
  if (permission.endsWith(':own')) {
    return permissions.has(permission.replace(':own', ''));
  }
  return false;
}

export function listPermissions(role: UserRole): string[] {
  return Array.from(rolePermissions[role]);
}
