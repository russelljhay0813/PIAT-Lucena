import test from "node:test";
import assert from "node:assert/strict";
import { buildStudentSeedData, PIAT_PROGRAMS } from "./student-data-generator.js";

test("buildStudentSeedData creates 900 students across all programs, year levels, and sections", () => {
  const students = buildStudentSeedData({ academicYear: "2026-2027", activeSemester: "1st Semester" });

  assert.equal(students.length, 900, "expected 900 students");

  const programs = [...new Set(students.map((student) => student.program))].sort();
  assert.deepEqual(programs, PIAT_PROGRAMS.slice().sort(), "expected all PIAT programs to be represented");

  const expectedSections = [];
  for (const program of PIAT_PROGRAMS) {
    for (const yearLevel of ["1st Year", "2nd Year", "3rd Year", "4th Year"]) {
      for (const section of ["Section A", "Section B", "Section C"]) {
        expectedSections.push(`${program}:${yearLevel}:${section}`);
      }
    }
  }

  const sectionCounts = new Map();
  for (const student of students) {
    const key = `${student.program}:${student.yearLevel}:${student.section}`;
    sectionCounts.set(key, (sectionCounts.get(key) || 0) + 1);
  }

  assert.equal(sectionCounts.size, expectedSections.length, "expected one section bucket per program/year/section combination");
  for (const key of expectedSections) {
    assert.equal(sectionCounts.get(key), 15, `${key} should contain exactly 15 students`);
  }

  const ids = students.map((student) => student.studentId);
  assert.equal(new Set(ids).size, ids.length, "student IDs should be unique");

  const emails = students.map((student) => student.email);
  assert.equal(new Set(emails).size, emails.length, "student emails should be unique");

  const phones = students.map((student) => student.contactNumber);
  assert.equal(new Set(phones).size, phones.length, "student phone numbers should be unique");
});
