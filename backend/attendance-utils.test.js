import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceRecordPayload } from './attendance-utils.js';

test('buildAttendanceRecordPayload enriches attendance records with student and subject metadata', () => {
  const payload = buildAttendanceRecordPayload({
    studentId: 'STD-001',
    subjectId: 'SUB-001',
    date: '2026-07-20',
    status: 'present',
    student: { id: 'stu-1', studentId: 'STD-001', firstName: 'Ana', lastName: 'Dela Cruz', program: 'BSIT', yearLevel: '2nd Year' },
    subject: { id: 'SUB-001', code: 'CS101', title: 'Programming 1', program: 'BSIT', yearLevel: '2nd Year', semester: '1st Semester', academicYear: '2026-2027', facultyId: 'FAC-001' },
    facultyId: 'FAC-001',
    time: '2026-07-20T08:00:00.000Z',
    section: 'A',
  });

  assert.equal(payload.studentId, 'STD-001');
  assert.equal(payload.studentName, 'Dela Cruz, Ana');
  assert.equal(payload.subjectCode, 'CS101');
  assert.equal(payload.subjectTitle, 'Programming 1');
  assert.equal(payload.program, 'BSIT');
  assert.equal(payload.yearLevel, '2nd Year');
  assert.equal(payload.section, 'A');
  assert.equal(payload.academicYear, '2026-2027');
  assert.equal(payload.semester, '1st Semester');
  assert.equal(payload.status, 'present');
  assert.equal(payload.facultyId, 'FAC-001');
  assert.ok(payload.time);
});
