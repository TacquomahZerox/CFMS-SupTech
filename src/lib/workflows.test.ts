import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidApprovalTransition, assertValidExceptionTransition } from '@/lib/workflows';

test('accepts legal approval transition', () => {
  assert.doesNotThrow(() => assertValidApprovalTransition('PENDING', 'ACTIVE'));
});

test('rejects illegal approval transition', () => {
  assert.throws(() => assertValidApprovalTransition('PENDING', 'EXHAUSTED'));
});

test('accepts legal exception transition', () => {
  assert.doesNotThrow(() => assertValidExceptionTransition('OPEN', 'UNDER_REVIEW'));
});

test('rejects illegal exception transition', () => {
  assert.throws(() => assertValidExceptionTransition('RESOLVED', 'DISMISSED'));
});
