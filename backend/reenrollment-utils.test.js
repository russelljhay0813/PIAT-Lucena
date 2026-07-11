import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProgramIdForStudent } from './reenrollment-utils.js';

test('matches a program by its stored name', () => {
  const programs = [
    { id: 'prog-1', name: 'Diploma in Hospitality Services and Technology' },
    { id: 'prog-2', name: 'Diploma in Tourism and Travel Services' },
  ];

  assert.equal(resolveProgramIdForStudent('Diploma in Hospitality Services and Technology', programs), 'prog-1');
});

test('returns null when no program name matches', () => {
  assert.equal(resolveProgramIdForStudent('Unknown Program', []), null);
});
