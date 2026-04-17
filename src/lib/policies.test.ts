import test from 'node:test';
import assert from 'node:assert/strict';
import { USER_ROLES } from '@/lib/constants';
import { canAccessInstitution, canResolveException } from '@/lib/policies';

const bankSession = {
  userId: 'u1',
  email: 'bank@example.com',
  role: USER_ROLES.BANK_USER,
  bankId: 'bank-1',
  firstName: 'Bank',
  lastName: 'User',
  tokenVersion: 1,
  permissions: [],
} as const;

const supervisorSession = {
  ...bankSession,
  role: USER_ROLES.SUPERVISOR,
  bankId: null,
} as const;

test('enforces institution scope for bank users', () => {
  assert.equal(canAccessInstitution(bankSession, 'bank-1'), true);
  assert.equal(canAccessInstitution(bankSession, 'bank-2'), false);
});

test('allows regulators to resolve exceptions cross-institution', () => {
  assert.equal(canResolveException(supervisorSession, 'bank-2'), true);
});
