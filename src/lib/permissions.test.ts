import test from 'node:test';
import assert from 'node:assert/strict';
import { USER_ROLES } from '@/lib/constants';
import { PERMISSIONS, hasPermission } from '@/lib/permissions';

test('allows own-scoped permission to satisfy base read for bank users', () => {
  assert.equal(hasPermission(USER_ROLES.BANK_USER, PERMISSIONS.SUBMISSIONS_READ), true);
});

test('denies privileged user-management permission for supervisors', () => {
  assert.equal(hasPermission(USER_ROLES.SUPERVISOR, PERMISSIONS.USERS_WRITE), false);
});
