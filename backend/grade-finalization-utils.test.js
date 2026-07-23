import test from "node:test";
import assert from "node:assert/strict";
import { buildGradeFinalizationQuery } from "./grade-finalization-utils.js";

test("uses the student current academic term when no explicit filters are supplied", () => {
  const query = buildGradeFinalizationQuery(
    { studentId: "STU-001", academicYear: "2025-2026", semester: "2nd Semester" },
    {},
  );

  assert.equal(query.sql.includes("g.studentId = ?"), true);
  assert.equal(query.sql.includes("g.status != ?"), true);
  assert.equal(query.sql.includes("s.academicYear = ?"), true);
  assert.equal(query.sql.includes("s.semester = ?"), true);
  assert.deepEqual(query.params, ["STU-001", "finalized", "2025-2026", "2nd Semester"]);
});

test("supports explicit subject and period filters without applying unrelated terms", () => {
  const query = buildGradeFinalizationQuery(
    { studentId: "STU-001" },
    { period: "final", subjectId: "SUB-123" },
  );

  assert.equal(query.sql.includes("g.period = ?"), true);
  assert.equal(query.sql.includes("g.subjectId = ?"), true);
  assert.equal(query.sql.includes("s.academicYear = ?"), false);
  assert.deepEqual(query.params, ["STU-001", "finalized", "final", "SUB-123"]);
});
