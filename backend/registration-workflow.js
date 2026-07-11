function validateRegistrationPayload(payload) {
  const requiredFields = [
    "firstName",
    "lastName",
    "gender",
    "dob",
    "civilStatus",
    "nationality",
    "email",
    "contactNumber",
    "address",
    "province",
    "city",
    "barangay",
    "zip",
    "parentName",
    "parentRelationship",
    "parentContact",
    "program",
    "yearLevel",
    "semester",
    "academicYear",
  ];

  const missing = requiredFields.filter((field) => {
    const value = payload?.[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  });

  return {
    isValid: missing.length === 0,
    missing,
  };
}

function resolveAutoApprovalStatus(currentStatus, validationResult) {
  if (validationResult?.isValid) {
    return "approved";
  }
  return String(currentStatus || "submitted");
}

export { validateRegistrationPayload, resolveAutoApprovalStatus };
