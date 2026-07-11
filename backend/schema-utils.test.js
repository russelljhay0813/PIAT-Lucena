import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStudentPayload, normalizeUserPayload } from './schema-utils.js';

test('normalizeStudentPayload includes the full student schema shape', () => {
  const student = normalizeStudentPayload({ firstName: 'Ana', lastName: 'Dela Cruz' });

  assert.equal(student.firstName, 'Ana');
  assert.equal(student.lastName, 'Dela Cruz');
  assert.equal(student.email, '');
  assert.equal(student.status, 'submitted');
  assert.equal(student.program, '');
  assert.equal(student.contactNumber, null);
  assert.equal(student.placeOfBirth, null);
  assert.equal(student.parentRelationship, null);
  assert.ok(student.submittedAt);
});

test('normalizeUserPayload includes the full user schema shape', () => {
  const user = normalizeUserPayload({ firstName: 'Rina', lastName: 'Santos', role: 'faculty' });

  assert.equal(user.firstName, 'Rina');
  assert.equal(user.lastName, 'Santos');
  assert.equal(user.role, 'faculty');
  assert.equal(user.status, 'active');
  assert.equal(user.program, null);
  assert.equal(user.temporaryPassword, null);
  assert.equal(user.firstLoginAt, null);
  assert.equal(user.lastLoginAt, null);
});
