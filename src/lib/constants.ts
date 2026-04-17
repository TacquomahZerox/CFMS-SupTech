export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CFM_OFFICER: 'CFM_OFFICER',
  SUPERVISOR: 'SUPERVISOR',
  BANK_USER: 'BANK_USER',
  AUDITOR: 'AUDITOR',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const AUTH_COOKIE_NAME = 'auth-token';
export const AUTH_ISSUER = 'cfms-suptech';
export const AUTH_AUDIENCE = 'cfms-suptech-app';

export const SESSION_DURATION_HOURS = Number.parseInt(
  process.env.SESSION_DURATION_HOURS || '24',
  10
);

export const SESSION_DURATION_SECONDS = SESSION_DURATION_HOURS * 60 * 60;

export const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000;
