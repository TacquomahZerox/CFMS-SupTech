import type { AuthSession } from '@/lib/auth';
import { USER_ROLES } from '@/lib/constants';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

const REGULATOR_ROLES = new Set([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.CFM_OFFICER,
  USER_ROLES.SUPERVISOR,
  USER_ROLES.AUDITOR,
]);

export function canAccessInstitution(session: AuthSession, targetBankId: string): boolean {
  if (REGULATOR_ROLES.has(session.role)) return true;
  return session.bankId === targetBankId;
}

export function canViewSubmission(session: AuthSession, targetBankId: string): boolean {
  return hasPermission(session.role, PERMISSIONS.SUBMISSIONS_READ) && canAccessInstitution(session, targetBankId);
}

export function canApproveSubmission(session: AuthSession, targetBankId: string): boolean {
  return hasPermission(session.role, PERMISSIONS.SUBMISSIONS_APPROVE) && canAccessInstitution(session, targetBankId);
}

export function canResolveException(session: AuthSession, targetBankId: string): boolean {
  return hasPermission(session.role, PERMISSIONS.EXCEPTIONS_RESOLVE) && canAccessInstitution(session, targetBankId);
}

export function canManageUsers(session: AuthSession): boolean {
  return hasPermission(session.role, PERMISSIONS.USERS_WRITE);
}

export function canGenerateRegulatoryReports(session: AuthSession): boolean {
  return hasPermission(session.role, PERMISSIONS.REPORTS_EXPORT);
}
