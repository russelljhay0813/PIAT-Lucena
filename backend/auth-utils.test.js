import test from "node:test";
import assert from "node:assert/strict";
import { resolveRequestIdentity } from "./auth-utils.js";

test("resolveRequestIdentity falls back to admin in non-production when no auth headers are present", () => {
  const req = {
    get(name) {
      return undefined;
    },
  };

  const identity = resolveRequestIdentity(req, "test-secret");

  assert.equal(identity.role, "admin");
  assert.equal(identity.userId, "local-dev");
});

test("resolveRequestIdentity preserves explicit role headers", () => {
  const req = {
    get(name) {
      if (name === "x-user-role") return "registrar";
      if (name === "x-user-id") return "u-42";
      if (name === "x-user-student-id") return "s-42";
      return undefined;
    },
  };

  const identity = resolveRequestIdentity(req, "test-secret");

  assert.equal(identity.role, "registrar");
  assert.equal(identity.userId, "u-42");
  assert.equal(identity.studentId, "s-42");
});
