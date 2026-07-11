import test from "node:test";
import assert from "node:assert/strict";
import { resolveAutoApprovalStatus, validateRegistrationPayload } from "./registration-workflow.js";

test("valid registration payload resolves to an approved workflow state", () => {
  const payload = {
    firstName: "Ana",
    lastName: "Dela Cruz",
    gender: "Female",
    dob: "2003-01-02",
    civilStatus: "Single",
    nationality: "Filipino",
    email: "ana@example.com",
    contactNumber: "09171234567",
    address: "123 Main Street",
    province: "Cebu",
    city: "Lapu-Lapu",
    barangay: "Punta Engaño",
    zip: "6015",
    parentName: "Juan Dela Cruz",
    parentRelationship: "Father",
    parentContact: "09181234567",
    program: "Diploma in Hospitality Services and Technology",
    yearLevel: "1st Year",
    semester: "1st Semester",
    academicYear: "2026-2027",
  };

  const result = validateRegistrationPayload(payload);

  assert.equal(result.isValid, true);
  assert.deepEqual(result.missing, []);
  assert.equal(resolveAutoApprovalStatus("submitted", result), "approved");
});

test("incomplete payloads stay pending and are not auto-approved", () => {
  const result = validateRegistrationPayload({
    firstName: "Ana",
    lastName: "Dela Cruz",
    email: "ana@example.com",
  });

  assert.equal(result.isValid, false);
  assert.ok(result.missing.includes("gender"));
  assert.equal(resolveAutoApprovalStatus("submitted", result), "submitted");
});
