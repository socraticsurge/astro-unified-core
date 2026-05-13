import { test, describe } from 'node:test';
import assert from 'node:assert';
import { isAdmin, ADMIN_EMAILS } from './admin';

describe('isAdmin', () => {
  test('returns false when session is null', () => {
    assert.strictEqual(isAdmin(null), false);
  });

  test('returns false when session is undefined', () => {
    assert.strictEqual(isAdmin(undefined), false);
  });

  test('returns false when session has no user', () => {
    assert.strictEqual(isAdmin({} as any), false);
  });

  test('returns false when session user has no email', () => {
    assert.strictEqual(isAdmin({ user: {} } as any), false);
  });

  test('returns false when email is not in ADMIN_EMAILS', () => {
    assert.strictEqual(isAdmin({ user: { email: 'random_user@example.com' } } as any), false);
  });

  test('returns true when email is in ADMIN_EMAILS (exact match)', () => {
    assert.strictEqual(isAdmin({ user: { email: 'cvk.atreya@gmail.com' } } as any), true);
  });

  test('returns true when email is in ADMIN_EMAILS (different case)', () => {
    assert.strictEqual(isAdmin({ user: { email: 'CVK.ATREYA@GMAIL.COM' } } as any), true);
  });
});
