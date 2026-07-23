import test from "node:test";
import assert from "node:assert/strict";
import {
  buildStudentSeedData,
  PIAT_PROGRAMS,
  buildAcademicHistoryPlan,
  generateGradeBreakdown,
} from "./student-data-generator.js";

test("buildStudentSeedData creates 900 students across all programs, year levels, and sections", () => {
  const students = buildStudentSeedData({
    academicYear: "2026-2027",
    activeSemester: "1st Semester",
  });

  assert.equal(students.length, 900, "expected 900 students");

  const programs = [...new Set(students.map((student) => student.program))].sort();
  assert.deepEqual(
    programs,
    PIAT_PROGRAMS.slice().sort(),
    "expected all PIAT programs to be represented",
  );

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

  assert.equal(
    sectionCounts.size,
    expectedSections.length,
    "expected one section bucket per program/year/section combination",
  );
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

test("buildAcademicHistoryPlan includes prior year levels and the current semester", () => {
  const plan = buildAcademicHistoryPlan({
    yearLevel: "4th Year",
    semester: "2nd Semester",
    academicYear: "2026-2027",
  });

  assert.equal(plan.length, 8, "expected complete history through the current semester");
  assert.deepEqual(
    plan.slice(0, 2).map((entry) => `${entry.yearLevel}:${entry.semester}`),
    ["1st Year:1st Semester", "1st Year:2nd Semester"],
    "expected the first semesters to be the first-year sequence",
  );
  assert.equal(
    plan[plan.length - 1].yearLevel,
    "4th Year",
    "expected the current year level to appear in the plan",
  );
});

test("generateGradeBreakdown creates weighted period grades and component rows", () => {
  const breakdown = generateGradeBreakdown({ period: "final", studentSeed: 3 });

  assert.ok(
    breakdown.overall.grade >= 60 && breakdown.overall.grade <= 100,
    "expected a realistic overall grade",
  );
  assert.equal(
    breakdown.components.length,
    5,
    "expected one row for each grade component plus the overall row",
  );
  assert.equal(
    breakdown.overall.period,
    "final",
    "expected the overall grade to be attached to the requested period",
  );
});
