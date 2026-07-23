import test from "node:test";
import assert from "node:assert/strict";
import { inferReenrollmentTarget, resolveProgramIdForStudent } from "./reenrollment-utils.js";

test("matches a program by its stored name", () => {
  const programs = [
    { id: "prog-1", name: "Diploma in Hospitality Services and Technology" },
    { id: "prog-2", name: "Diploma in Tourism and Travel Services" },
  ];

  assert.equal(
    resolveProgramIdForStudent("Diploma in Hospitality Services and Technology", programs),
    "prog-1",
  );
});

test("returns null when no program name matches", () => {
  assert.equal(resolveProgramIdForStudent("Unknown Program", []), null);
});

test("advances from 1st semester to 2nd semester in the same year", () => {
  const target = inferReenrollmentTarget({
    yearLevel: "2nd Year",
    semester: "1st Semester",
    academicYear: "2025-2026",
  });

  assert.deepEqual(target, {
    academicYear: "2025-2026",
    yearLevel: "2nd Year",
    semester: "2nd Semester",
  });
});

test("advances from 2nd semester to the next year and first semester", () => {
  const target = inferReenrollmentTarget({
    yearLevel: "2nd Year",
    semester: "2nd Semester",
    academicYear: "2025-2026",
  });

  assert.deepEqual(target, {
    academicYear: "2026-2027",
    yearLevel: "3rd Year",
    semester: "1st Semester",
  });
});
