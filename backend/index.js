import express from "express";
import cors from "cors";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { openDb, initDb, run, all, get, withTransaction } from "./db.js";
import { normalizeStudentPayload, normalizeUserPayload } from "./schema-utils.js";
import { resolveProgramIdForStudent } from "./reenrollment-utils.js";
import { resolveAutoApprovalStatus, validateRegistrationPayload } from "./registration-workflow.js";

const app = express();
const PORT = process.env.PORT || 4000;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const JWT_SECRET = process.env.JWT_SECRET || "piat_mobile_secret";
const loginRateLimitStore = new Map();

function generateJwtToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      studentId: user.studentId || null,
    },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

function getRequestIdentity(req) {
  const authHeader = req.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      return {
        role: String(payload.role || "").toLowerCase(),
        userId: String(payload.id || ""),
        studentId: String(payload.studentId || ""),
      };
    } catch (error) {
      // invalid token falls back to header-based identity
    }
  }

  return {
    role: String(req.get("x-user-role") || "").toLowerCase(),
    userId: String(req.get("x-user-id") || ""),
    studentId: String(req.get("x-user-student-id") || ""),
  };
}

app.use(cors());
app.use(express.json());

const db = await openDb();
await initDb(db);

function sendError(res, status, message, details = null) {
  return res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

function validateRequiredFields(req, res, next, fields) {
  const missing = fields.filter((field) => {
    const value = req.body?.[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  });

  if (missing.length) {
    return sendError(res, 400, "Missing required fields", missing);
  }

  return next();
}

function validateArrayField(req, res, next, fieldName) {
  const value = req.body?.[fieldName];
  if (!Array.isArray(value) || value.length === 0) {
    return sendError(res, 400, `${fieldName} must be a non-empty array`);
  }
  return next();
}

function getClientKey(req) {
  const forwarded = req.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || req.ip || req.socket.remoteAddress || "unknown";
}

function applyRateLimit(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const entries = loginRateLimitStore.get(key) || [];
  const recent = entries.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    return sendError(res, 429, "Too many login attempts. Please try again later.");
  }

  recent.push(now);
  loginRateLimitStore.set(key, recent);
  return next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const { role } = getRequestIdentity(req);
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.userContext = getRequestIdentity(req);
    next();
  };
}

function requireSelfOrRole(resourceParamName, ...allowedRoles) {
  return (req, res, next) => {
    const { role, userId, studentId } = getRequestIdentity(req);
    const requested = req.params[resourceParamName];
    const isSelf = role === "student" && requested && (userId === requested || studentId === requested);
    if (!allowedRoles.includes(role) && !isSelf) {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.userContext = { role, userId, studentId };
    next();
  };
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedPassword) {
  if (!password || !storedPassword) return false;
  const stored = String(storedPassword);
  if (!stored.startsWith("scrypt$")) {
    return safeCompare(password, stored);
  }

  const [, salt, expectedHash] = stored.split("$");
  if (!salt || !expectedHash) return false;

  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(derived, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function sanitizeStudentRecord(student) {
  if (!student) return student;
  const { password, ...rest } = student;
  return rest;
}

function sanitizeUserRecord(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

async function createNotificationRecord(userId, type, title, message, relatedId = null) {
  const notification = {
    id: crypto.randomUUID(),
    userId: String(userId),
    type: String(type),
    title: String(title).trim(),
    message: String(message).trim(),
    read: 0,
    createdAt: Date.now(),
    relatedId: relatedId ? String(relatedId) : null,
  };

  await run(
    db,
    `INSERT INTO notifications (id, userId, type, title, message, read, createdAt, relatedId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [notification.id, notification.userId, notification.type, notification.title, notification.message, notification.read, notification.createdAt, notification.relatedId],
  );

  return notification;
}

async function notifyUsers(userIds, type, title, message, relatedId = null) {
  const notifications = [];
  for (const userId of userIds) {
    notifications.push(await createNotificationRecord(userId, type, title, message, relatedId));
  }
  return notifications;
}

async function notifyRoleUsers(role, type, title, message, relatedId = null) {
  const users = await all(db, "SELECT id FROM users WHERE role = ? AND status = 'active'", [role]);
  return notifyUsers(users.map((user) => user.id), type, title, message, relatedId);
}

async function notifyRegistrarUsers(type, title, message, relatedId = null) {
  return notifyRoleUsers("registrar", type, title, message, relatedId);
}

async function notifyAdminUsers(type, title, message, relatedId = null) {
  return notifyRoleUsers("admin", type, title, message, relatedId);
}

async function createActivityLog(actorId, actorName, action, details, role) {
  const entry = {
    id: crypto.randomUUID(),
    actorId: String(actorId || "system"),
    actorName: String(actorName || "System").trim() || "System",
    action: String(action).trim(),
    details: String(details).trim(),
    role: String(role || "system"),
    createdAt: new Date().toISOString(),
  };

  await run(
    db,
    `INSERT INTO activity_logs (id, actorId, actorName, action, details, role, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.actorId, entry.actorName, entry.action, entry.details, entry.role, entry.createdAt],
  );

  return entry;
}

async function syncStudentEnrollment(student) {
  if (!student?.studentId || !student.program || !student.yearLevel || !student.semester) {
    return [];
  }

  return [];
}

app.get("/api/subjects", async (req, res) => {
  const rows = await all(
    db,
    `SELECT * FROM subjects
     ORDER BY program,
       CASE yearLevel
         WHEN '1st Year' THEN 1
         WHEN '2nd Year' THEN 2
         WHEN '3rd Year' THEN 3
         WHEN '4th Year' THEN 4
         ELSE 5
       END,
       CASE semester
         WHEN '1st Semester' THEN 1
         WHEN '2nd Semester' THEN 2
         WHEN 'Summer' THEN 3
         ELSE 4
       END,
       code`,
  );
  res.json(rows);
});

app.get("/api/subjects/:id", async (req, res) => {
  const row = await get(db, "SELECT * FROM subjects WHERE id = ?", [req.params.id]);
  if (!row) return res.status(404).json({ error: "Subject not found" });
  res.json(row);
});

app.post("/api/subjects", async (req, res) => {
  const { code, title, units, schedule, room, instructor, program, yearLevel, semester, facultyId } = req.body;
  if (!code || !title) return res.status(400).json({ error: "Subject code and title are required" });
  const subject = {
    id: crypto.randomUUID(),
    code: String(code).toUpperCase(),
    title: String(title).trim(),
    units: Number(units) || 3,
    schedule: String(schedule || "TBA").trim(),
    room: String(room || "TBA").trim(),
    instructor: String(instructor || "Faculty").trim(),
    program: program ? String(program) : null,
    yearLevel: yearLevel ? String(yearLevel) : null,
    semester: semester ? String(semester) : null,
    facultyId: facultyId ? String(facultyId) : null,
    academicYear: req.body.academicYear ? String(req.body.academicYear) : null,
    addedAt: Date.now(),
  };
  await run(
    db,
    `INSERT INTO subjects (id, code, title, units, schedule, room, instructor, program, yearLevel, semester, facultyId, academicYear, addedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [subject.id, subject.code, subject.title, subject.units, subject.schedule, subject.room, subject.instructor, subject.program, subject.yearLevel, subject.semester, subject.facultyId, subject.academicYear, subject.addedAt],
  );
  if (subject.facultyId) {
    const faculty = await get(db, "SELECT id FROM users WHERE id = ?", [subject.facultyId]);
    if (faculty) {
      await createNotificationRecord(faculty.id, "schedule", "Faculty Assignment Completed", `${subject.code} has been assigned to you.`, subject.id);
    }
  }
  res.status(201).json(subject);
});

app.put("/api/subjects/:id", async (req, res) => {
  const { code, title, units, schedule, room, instructor, program, yearLevel, semester, facultyId } = req.body;
  const existing = await get(db, "SELECT * FROM subjects WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "Subject not found" });
  const updated = {
    ...existing,
    code: code ? String(code).toUpperCase() : existing.code,
    title: title ? String(title).trim() : existing.title,
    units: units !== undefined ? Number(units) || existing.units : existing.units,
    schedule: schedule ? String(schedule).trim() : existing.schedule,
    room: room ? String(room).trim() : existing.room,
    instructor: instructor ? String(instructor).trim() : existing.instructor,
    program: program ? String(program) : existing.program,
    yearLevel: yearLevel ? String(yearLevel) : existing.yearLevel,
    semester: semester ? String(semester) : existing.semester,
    facultyId: facultyId ? String(facultyId) : existing.facultyId,
  };
  await run(
    db,
    `UPDATE subjects SET code = ?, title = ?, units = ?, schedule = ?, room = ?, instructor = ?, program = ?, yearLevel = ?, semester = ?, facultyId = ? WHERE id = ?`,
    [updated.code, updated.title, updated.units, updated.schedule, updated.room, updated.instructor, updated.program, updated.yearLevel, updated.semester, updated.facultyId, req.params.id],
  );
  if (updated.facultyId && updated.facultyId !== existing.facultyId) {
    const faculty = await get(db, "SELECT id FROM users WHERE id = ?", [updated.facultyId]);
    if (faculty) {
      await createNotificationRecord(faculty.id, "schedule", "Faculty Assignment Completed", `${updated.code} has been assigned to you.`, updated.id);
    }
  }
  res.json(updated);
});

app.delete("/api/subjects/:id", async (req, res) => {
  await run(db, "DELETE FROM subjects WHERE id = ?", [req.params.id]);
  res.status(204).end();
});

app.get("/api/students", requireRole("admin", "registrar"), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  const query = status
    ? { sql: "SELECT * FROM students WHERE status = ? ORDER BY lastName, firstName", params: [status] }
    : { sql: "SELECT * FROM students ORDER BY lastName, firstName", params: [] };
  const rows = await all(db, query.sql, query.params);
  res.json(rows.map(sanitizeStudentRecord));
});

app.get("/api/students/:studentId", requireSelfOrRole("studentId", "admin", "registrar"), async (req, res) => {
  const row = await get(db, "SELECT * FROM students WHERE studentId = ?", [req.params.studentId]);
  if (!row) return res.status(404).json({ error: "Student not found" });
  res.json(sanitizeStudentRecord(row));
});

app.post("/api/students", requireRole("admin", "registrar"), (req, res, next) => validateRequiredFields(req, res, next, ["firstName", "lastName", "email", "password", "educationLevel"]), async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    suffix,
    email,
    password,
    gender,
    dob,
    age,
    civilStatus,
    nationality,
    religion,
    educationLevel,
    program,
    yearLevel,
    gradeLevel,
    strand,
    studentType,
    academicYear,
    semester,
    section,
    previousSchool,
    lastGrade,
    contactNumber,
    city,
    province,
    zip,
    fatherName,
    fatherOccupation,
    fatherContact,
    motherName,
    motherOccupation,
    motherContact,
    guardianName,
    guardianOccupation,
    guardianContact,
    guardianRelation,
    parentName,
    parentContact,
    parentAddress,
    emergencyName,
    emergencyContact,
    emergencyAddress,
    emergencyRelation,
    address,
    placeOfBirth,
    barangay,
    parentRelationship,
  } = req.body;
  if (!firstName || !lastName || !email || !password || !educationLevel) {
    return res.status(400).json({ error: "Missing required student registration fields" });
  }
  const students = await all(db, "SELECT studentId FROM students WHERE studentId LIKE ?", [`${new Date().getFullYear()}-%`]);
  const nextId = `${new Date().getFullYear()}-${String(students.length + 1).padStart(5, "0")}`;
  const passwordHash = hashPassword(String(password));
  const student = normalizeStudentPayload({
    id: crypto.randomUUID(),
    studentId: nextId,
    firstName,
    lastName,
    middleName,
    suffix,
    email,
    password: passwordHash,
    gender,
    dob,
    age,
    civilStatus,
    nationality,
    religion,
    educationLevel,
    program,
    yearLevel,
    gradeLevel,
    strand,
    studentType,
    academicYear,
    semester,
    section,
    previousSchool,
    lastGrade,
    contactNumber,
    address,
    city,
    province,
    zip,
    fatherName,
    fatherOccupation,
    fatherContact,
    motherName,
    motherOccupation,
    motherContact,
    guardianName,
    guardianOccupation,
    guardianContact,
    guardianRelation,
    parentName,
    parentContact,
    parentAddress,
    emergencyName,
    emergencyContact,
    emergencyAddress,
    emergencyRelation,
    placeOfBirth,
    barangay,
    parentRelationship,
    status: req.body.status,
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewNote: null,
  });
  await run(
    db,
    `INSERT INTO students (id, studentId, firstName, lastName, middleName, suffix, email, password, gender, educationLevel, program, yearLevel, studentType, academicYear, semester, status, submittedAt, reviewedAt, reviewNote, firstLoginAt, lastLoginAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.id,
      student.studentId,
      student.firstName,
      student.lastName,
      student.middleName,
      student.suffix,
      student.email,
      student.password,
      student.gender,
      student.educationLevel,
      student.program,
      student.yearLevel,
      student.studentType,
      student.academicYear,
      student.semester,
      student.status,
      student.submittedAt,
      student.reviewedAt,
      student.reviewNote,
      null,
      null,
    ],
  );
  if (student.status === "approved") {
    await syncStudentEnrollment(student);
  }
  await createActivityLog(req.userContext?.userId || "system", req.userContext?.role || "system", "Created student registration", `${student.firstName} ${student.lastName} (${student.studentId})`, req.userContext?.role || "system");
  await notifyRegistrarUsers("registration", "New Registration Submitted", `${student.firstName} ${student.lastName} submitted a new application.`, student.studentId);
  res.status(201).json(sanitizeStudentRecord(student));
});

app.put("/api/students/:studentId", requireSelfOrRole("studentId", "admin", "registrar"), async (req, res) => {
  const existing = await get(db, "SELECT * FROM students WHERE studentId = ?", [req.params.studentId]);
  if (!existing) return res.status(404).json({ error: "Student not found" });

  const requestedStatus = req.body.status ? String(req.body.status).toLowerCase() : existing.status;
  const mergedStudentData = {
    ...existing,
    firstName: req.body.firstName ?? existing.firstName,
    lastName: req.body.lastName ?? existing.lastName,
    middleName: req.body.middleName ?? existing.middleName,
    suffix: req.body.suffix ?? existing.suffix,
    email: req.body.email ? String(req.body.email).trim().toLowerCase() : existing.email,
    password: req.body.password && String(req.body.password).length > 0 ? hashPassword(String(req.body.password)) : existing.password,
    gender: req.body.gender ?? existing.gender,
    dob: req.body.dob ?? existing.dob,
    age: req.body.age ?? existing.age,
    civilStatus: req.body.civilStatus ?? existing.civilStatus,
    nationality: req.body.nationality ?? existing.nationality,
    religion: req.body.religion ?? existing.religion,
    educationLevel: req.body.educationLevel ?? existing.educationLevel,
    program: req.body.program ?? existing.program,
    yearLevel: req.body.yearLevel ?? existing.yearLevel,
    gradeLevel: req.body.gradeLevel ?? existing.gradeLevel,
    strand: req.body.strand ?? existing.strand,
    studentType: req.body.studentType ?? existing.studentType,
    academicYear: req.body.academicYear ?? existing.academicYear,
    semester: req.body.semester ?? existing.semester,
    section: req.body.section ?? existing.section,
    previousSchool: req.body.previousSchool ?? existing.previousSchool,
    lastGrade: req.body.lastGrade ?? existing.lastGrade,
    contactNumber: req.body.contactNumber ?? existing.contactNumber,
    address: req.body.address ?? existing.address,
    city: req.body.city ?? existing.city,
    province: req.body.province ?? existing.province,
    zip: req.body.zip ?? existing.zip,
    fatherName: req.body.fatherName ?? existing.fatherName,
    fatherOccupation: req.body.fatherOccupation ?? existing.fatherOccupation,
    fatherContact: req.body.fatherContact ?? existing.fatherContact,
    motherName: req.body.motherName ?? existing.motherName,
    motherOccupation: req.body.motherOccupation ?? existing.motherOccupation,
    motherContact: req.body.motherContact ?? existing.motherContact,
    guardianName: req.body.guardianName ?? existing.guardianName,
    guardianOccupation: req.body.guardianOccupation ?? existing.guardianOccupation,
    guardianContact: req.body.guardianContact ?? existing.guardianContact,
    guardianRelation: req.body.guardianRelation ?? existing.guardianRelation,
    parentName: req.body.parentName ?? existing.parentName,
    parentContact: req.body.parentContact ?? existing.parentContact,
    parentAddress: req.body.parentAddress ?? existing.parentAddress,
    emergencyName: req.body.emergencyName ?? existing.emergencyName,
    emergencyContact: req.body.emergencyContact ?? existing.emergencyContact,
    emergencyAddress: req.body.emergencyAddress ?? existing.emergencyAddress,
    emergencyRelation: req.body.emergencyRelation ?? existing.emergencyRelation,
    placeOfBirth: req.body.placeOfBirth ?? existing.placeOfBirth,
    barangay: req.body.barangay ?? existing.barangay,
    parentRelationship: req.body.parentRelationship ?? existing.parentRelationship,
  };

  const validationResult = validateRegistrationPayload(mergedStudentData);
  const nextStatus = resolveAutoApprovalStatus(requestedStatus, validationResult);

  const updates = normalizeStudentPayload({
    ...mergedStudentData,
    status: nextStatus,
    submittedAt: req.body.submittedAt ?? existing.submittedAt ?? new Date().toISOString(),
    reviewedAt: nextStatus === "approved" && existing.status !== "approved" ? new Date().toISOString() : req.body.reviewedAt ?? existing.reviewedAt,
    reviewNote: req.body.reviewNote ?? existing.reviewNote,
  });

  const result = await withTransaction(db, async () => {
    await run(
      db,
      `UPDATE students SET firstName = ?, lastName = ?, middleName = ?, suffix = ?, email = ?, password = ?, gender = ?, dob = ?, age = ?, civilStatus = ?, nationality = ?, religion = ?, educationLevel = ?, program = ?, yearLevel = ?, gradeLevel = ?, strand = ?, studentType = ?, academicYear = ?, semester = ?, section = ?, previousSchool = ?, lastGrade = ?, contactNumber = ?, address = ?, city = ?, province = ?, zip = ?, fatherName = ?, fatherOccupation = ?, fatherContact = ?, motherName = ?, motherOccupation = ?, motherContact = ?, guardianName = ?, guardianOccupation = ?, guardianContact = ?, guardianRelation = ?, parentName = ?, parentContact = ?, parentAddress = ?, emergencyName = ?, emergencyContact = ?, emergencyAddress = ?, emergencyRelation = ?, placeOfBirth = ?, barangay = ?, parentRelationship = ?, status = ?, submittedAt = ?, reviewedAt = ?, reviewNote = ? WHERE studentId = ?`,
      [
        updates.firstName,
        updates.lastName,
        updates.middleName,
        updates.suffix,
        updates.email,
        updates.password,
        updates.gender,
        updates.dob,
        updates.age,
        updates.civilStatus,
        updates.nationality,
        updates.religion,
        updates.educationLevel,
        updates.program,
        updates.yearLevel,
        updates.gradeLevel,
        updates.strand,
        updates.studentType,
        updates.academicYear,
        updates.semester,
        updates.section,
        updates.previousSchool,
        updates.lastGrade,
        updates.contactNumber,
        updates.address,
        updates.city,
        updates.province,
        updates.zip,
        updates.fatherName,
        updates.fatherOccupation,
        updates.fatherContact,
        updates.motherName,
        updates.motherOccupation,
        updates.motherContact,
        updates.guardianName,
        updates.guardianOccupation,
        updates.guardianContact,
        updates.guardianRelation,
        updates.parentName,
        updates.parentContact,
        updates.parentAddress,
        updates.emergencyName,
        updates.emergencyContact,
        updates.emergencyAddress,
        updates.emergencyRelation,
        updates.placeOfBirth,
        updates.barangay,
        updates.parentRelationship,
        updates.status,
        updates.submittedAt,
        updates.reviewedAt,
        updates.reviewNote,
        req.params.studentId,
      ],
    );
    if (updates.status === "approved" && existing.status !== "approved") {
      await syncStudentEnrollment(updates);
      await createNotificationRecord(req.params.studentId, "schedule", "Registration Completed", "Your registration has been successfully completed and approved. You may now access your Student Dashboard.", req.params.studentId);
      await notifyRegistrarUsers("registration", "New student registration approved", "A new student registration has been automatically approved and enrolled. The student record is now available for monitoring and management.", req.params.studentId);
      await notifyAdminUsers("registration", "Student registration completed", "A student has successfully completed registration and has been automatically enrolled.", req.params.studentId);
    }
    if (updates.status === "rejected" && existing.status !== "rejected") {
      await createNotificationRecord(req.params.studentId, "schedule", "Application Rejected", "Your registration was not approved. Please contact the registrar for details.", req.params.studentId);
    }
    return updates;
  });

  await createActivityLog(req.userContext?.userId || "system", req.userContext?.role || "system", updates.status === "approved" ? "Approved student registration" : updates.status === "rejected" ? "Rejected student registration" : "Updated student registration", `${req.params.studentId} -> ${updates.status}`, req.userContext?.role || "system");
  res.json(sanitizeStudentRecord(result));
});

app.post("/api/students/login", applyRateLimit, (req, res, next) => validateRequiredFields(req, res, next, ["email", "password"]), async (req, res) => {
  const { email, password } = req.body;
  const student = await get(db, "SELECT * FROM students WHERE LOWER(email) = LOWER(?)", [email]);
  if (!student || !verifyPassword(password, student.password)) {
    await createActivityLog("system", "system", "Failed student login", String(email || "unknown"), "student");
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const now = new Date().toISOString();
  const isFirstLogin = !student.firstLoginAt;
  const needsPasswordUpgrade = !String(student.password).startsWith("scrypt$");
  if (needsPasswordUpgrade) {
    await run(db, "UPDATE students SET password = ?, firstLoginAt = COALESCE(firstLoginAt, ?), lastLoginAt = ? WHERE id = ?", [hashPassword(String(password)), now, now, student.id]);
  } else {
    await run(db, "UPDATE students SET firstLoginAt = COALESCE(firstLoginAt, ?), lastLoginAt = ? WHERE id = ?", [now, now, student.id]);
  }
  if (isFirstLogin) {
    await createNotificationRecord(student.id, "schedule", "Welcome to PIAT", "Welcome! Your student account is ready to use. Please review your profile and registration status.", student.id);
  }
  await createActivityLog(student.studentId, student.firstName || "Student", "Successful student login", "Student signed in", "student");
  const updatedStudent = await get(db, "SELECT * FROM students WHERE id = ?", [student.id]);
  res.json(sanitizeStudentRecord(updatedStudent));
});

app.get("/api/grades", requireRole("admin", "faculty", "registrar"), async (req, res) => {
  const { subjectId, studentId } = req.query;
  const conditions = [];
  const params = [];
  if (subjectId) {
    conditions.push("g.subjectId = ?");
    params.push(String(subjectId));
  }
  if (studentId) {
    conditions.push("g.studentId = ?");
    params.push(String(studentId));
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await all(
    db,
    `SELECT g.*, s.code as subjectCode, s.title as subjectTitle, st.firstName as studentFirstName, st.lastName as studentLastName
     FROM grades g
     JOIN subjects s ON s.id = g.subjectId
     JOIN students st ON st.studentId = g.studentId
     ${where}
     ORDER BY g.submittedAt DESC`,
    params,
  );
  res.json(rows);
});

app.post("/api/grades", requireRole("admin", "faculty"), async (req, res) => {
  const { studentId, subjectId, grade, remarks, period, type, component, status } = req.body;
  if (!studentId || !subjectId || grade === undefined) {
    return res.status(400).json({ error: "studentId, subjectId, and grade are required" });
  }
  const existing = await get(db, "SELECT * FROM grades WHERE studentId = ? AND subjectId = ? AND COALESCE(period, 'overall') = ?", [studentId, subjectId, period || "overall"]);
  if (existing) {
    await run(
      db,
      `UPDATE grades SET grade = ?, remarks = ?, period = COALESCE(?, period), type = COALESCE(?, type), component = COALESCE(?, component), status = COALESCE(?, status), submittedAt = ? WHERE id = ?`,
      [Number(grade), remarks || null, period || null, type || null, component || null, status || "draft", Date.now(), existing.id],
    );
    const updated = await get(db, "SELECT * FROM grades WHERE id = ?", [existing.id]);
    return res.json(updated);
  }
  const entry = {
    id: crypto.randomUUID(),
    studentId: String(studentId),
    subjectId: String(subjectId),
    grade: Number(grade),
    remarks: remarks ? String(remarks).trim() : null,
    period: period ? String(period) : "overall",
    type: type ? String(type) : "overall",
    component: component ? String(component) : null,
    status: status || "draft",
    submittedAt: Date.now(),
  };
  await run(
    db,
    `INSERT INTO grades (id, studentId, subjectId, grade, remarks, period, type, component, status, submittedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [entry.id, entry.studentId, entry.subjectId, entry.grade, entry.remarks, entry.period, entry.type, entry.component, entry.status, entry.submittedAt],
  );
  if (entry.status === "submitted" || entry.status === "finalized") {
    await createNotificationRecord(studentId, "grade", "Grade Posted", `Your grades have been submitted for the selected subject.`, entry.subjectId);
  }
  res.status(201).json(entry);
});

app.delete("/api/grades", requireRole("admin", "faculty"), async (req, res) => {
  const { studentId, subjectId } = req.query;
  if (!studentId || !subjectId) return res.status(400).json({ error: "studentId and subjectId are required" });
  await run(db, "DELETE FROM grades WHERE studentId = ? AND subjectId = ?", [String(studentId), String(subjectId)]);
  res.status(204).end();
});

app.get("/api/attendance", requireRole("admin", "faculty", "registrar", "student"), async (req, res) => {
   const subjectId = req.query.subjectId ? String(req.query.subjectId) : null;
   const date = req.query.date ? String(req.query.date) : null;
   const studentId = req.query.studentId ? String(req.query.studentId) : null;
   if (!subjectId && !studentId) return res.status(400).json({ error: "subjectId or studentId is required" });
   let rows;
   if (date) {
     rows = await all(
       db,
       "SELECT * FROM attendance WHERE subjectId = ? AND date = ? ORDER BY studentId",
       [subjectId, date],
     );
   } else if (studentId) {
     rows = await all(
       db,
       "SELECT * FROM attendance WHERE studentId = ? ORDER BY date DESC",
       [studentId],
     );
   } else {
     rows = await all(
       db,
       "SELECT * FROM attendance WHERE subjectId = ? ORDER BY date DESC, studentId",
       [subjectId],
     );
   }
   res.json(rows);
 });

app.post("/api/attendance", requireRole("admin", "faculty"), async (req, res) => {
  const { studentId, subjectId, date, status } = req.body;
  if (!studentId || !subjectId || !date || !status) {
    return res.status(400).json({ error: "studentId, subjectId, date, and status are required" });
  }
  const existing = await get(
    db,
    "SELECT * FROM attendance WHERE studentId = ? AND subjectId = ? AND date = ?",
    [studentId, subjectId, date],
  );
  if (existing) {
    await run(
      db,
      "UPDATE attendance SET status = ?, updatedAt = ? WHERE id = ?",
      [String(status), Date.now(), existing.id],
    );
    const updated = await get(db, "SELECT * FROM attendance WHERE id = ?", [existing.id]);
    return res.json(updated);
  }

  const record = {
    id: crypto.randomUUID(),
    studentId: String(studentId),
    subjectId: String(subjectId),
    date: String(date),
    status: String(status),
    updatedAt: Date.now(),
  };
  await run(
    db,
    "INSERT INTO attendance (id, studentId, subjectId, date, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    [record.id, record.studentId, record.subjectId, record.date, record.status, record.updatedAt],
  );
  res.status(201).json(record);
});



// Notifications endpoints
app.get("/api/notifications", async (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : null;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const rows = await all(
    db,
    "SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC",
    [userId],
  );
  res.json(rows);
});

app.post("/api/notifications", async (req, res) => {
  const { userId, type, title, message, relatedId } = req.body;
  if (!userId || !type || !title || !message) {
    return res.status(400).json({ error: "userId, type, title, and message are required" });
  }

  const notification = {
    id: crypto.randomUUID(),
    userId: String(userId),
    type: String(type),
    title: String(title).trim(),
    message: String(message).trim(),
    read: 0,
    createdAt: Date.now(),
    relatedId: relatedId ? String(relatedId) : null,
  };

  await run(
    db,
    `INSERT INTO notifications (id, userId, type, title, message, read, createdAt, relatedId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notification.id,
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.read,
      notification.createdAt,
      notification.relatedId,
    ],
  );

  res.status(201).json(notification);
});

app.patch("/api/notifications/:id/read", async (req, res) => {
  const notification = await get(db, "SELECT * FROM notifications WHERE id = ?", [req.params.id]);
  if (!notification) return res.status(404).json({ error: "Notification not found" });

  await run(db, "UPDATE notifications SET read = 1 WHERE id = ?", [req.params.id]);
  const updated = await get(db, "SELECT * FROM notifications WHERE id = ?", [req.params.id]);
  res.json(updated);
});

app.delete("/api/notifications", async (req, res) => {
  const userId = req.query.userId ? String(req.query.userId) : null;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  await run(db, "DELETE FROM notifications WHERE userId = ?", [userId]);
  res.status(204).end();
});

app.get("/api/activity-logs", requireRole("admin"), async (_req, res) => {
  const rows = await all(db, "SELECT * FROM activity_logs ORDER BY createdAt DESC LIMIT 20");
  res.json(rows);
});

// Users endpoints
app.get("/api/users", requireRole("admin"), async (req, res) => {
  const role = req.query.role ? String(req.query.role) : null;
  const query = role
    ? { sql: "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword FROM users WHERE role = ? ORDER BY lastName, firstName", params: [role] }
    : { sql: "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword FROM users ORDER BY lastName, firstName", params: [] };
  const rows = await all(db, query.sql, query.params);
  res.json(rows.map(sanitizeUserRecord));
});

app.post("/api/users", requireRole("admin"), (req, res, next) => validateRequiredFields(req, res, next, ["role", "firstName", "lastName"]), async (req, res) => {
  const { role, studentId, firstName, middleName, lastName, suffix, gender, email, password, program, yearLevel, semester, academicYear } = req.body;

  const users = await all(db, "SELECT userId FROM users WHERE role = ?", [role]);
  let maxNum = 0;
  for (const user of users) {
    const match = user.userId.match(/-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  const nextId = `${role.toUpperCase().slice(0, 3)}-${String(maxNum + 1).padStart(5, "0")}`;
  const username = `user${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}${Math.floor(1000 + Math.random() * 9000)}`;
  const initialPassword = password ? String(password) : Math.random().toString(36).slice(2, 12);

  const user = normalizeUserPayload({
    id: crypto.randomUUID(),
    userId: nextId,
    username,
    email: email ? String(email).trim().toLowerCase() : `${username}@bwest.edu.ph`,
    password: hashPassword(initialPassword),
    firstName,
    middleName,
    lastName,
    role,
    status: "active",
    program,
    yearLevel: role === "student" ? "1st Year" : yearLevel ? String(yearLevel) : null,
    createdAt: new Date().toISOString(),
    temporaryPassword: initialPassword,
  });

  await run(
    db,
    `INSERT INTO users (id, userId, username, email, password, firstName, middleName, lastName, role, status, program, yearLevel, createdAt, temporaryPassword)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id, user.userId, user.username, user.email, user.password, user.firstName, user.middleName, user.lastName, user.role, user.status, user.program, user.yearLevel, user.createdAt, user.temporaryPassword],
  );

  await createActivityLog(req.body.actorId || "system", req.body.actorName || "Admin", role === "student" ? "Created student account" : "Created staff account", `${user.firstName} ${user.lastName} (${user.role})`, user.role);
  await createNotificationRecord(user.id, "schedule", "Account Ready", `Your account has been created successfully. Use your username and temporary password to sign in.`, user.id);

  if (role === "student") {
    const generatedStudentId = `${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const normalizedStudentId = studentId ? String(studentId).trim() : generatedStudentId;
    const student = normalizeStudentPayload({
      id: crypto.randomUUID(),
      studentId: normalizedStudentId,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      suffix: suffix ? String(suffix).trim() : null,
      email: user.email,
      password: user.password,
      gender: gender ? String(gender) : null,
      educationLevel: "College",
      program: user.program || "",
      yearLevel: "1st Year",
      studentType: "Incoming Freshman",
      academicYear: academicYear ? String(academicYear) : `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      semester: "1st Semester",
      status: "not_started",
      submittedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewNote: "Created by admin",
    });
    await run(
      db,
      `INSERT INTO students (id, studentId, firstName, lastName, middleName, suffix, email, password, gender, educationLevel, program, yearLevel, studentType, academicYear, semester, status, submittedAt, reviewedAt, reviewNote, firstLoginAt, lastLoginAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        student.id, student.studentId, student.firstName, student.lastName, student.middleName, student.suffix,
        student.email, student.password, student.gender, student.educationLevel, student.program, student.yearLevel,
        student.studentType, student.academicYear, student.semester, student.status,
        student.submittedAt, student.reviewedAt, student.reviewNote,
        null,
        null,
      ],
    );
  }

  res.status(201).json(sanitizeUserRecord(user));
});

app.patch("/api/users/:id/status", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const existing = await get(db, "SELECT * FROM users WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "User not found" });
  await run(db, "UPDATE users SET status = ? WHERE id = ?", [status || "inactive", id]);
  const updated = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword FROM users WHERE id = ?", [id]);
  res.json(sanitizeUserRecord(updated));
});

app.put("/api/users/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const existing = await get(db, "SELECT * FROM users WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "User not found" });
  const updates = {
    ...existing,
    firstName: req.body.firstName ?? existing.firstName,
    lastName: req.body.lastName ?? existing.lastName,
    middleName: req.body.middleName ?? existing.middleName,
    email: req.body.email ? String(req.body.email).trim().toLowerCase() : existing.email,
    program: req.body.program ?? existing.program,
    yearLevel: req.body.yearLevel ?? existing.yearLevel,
  };
  await run(
    db,
    `UPDATE users SET firstName = ?, lastName = ?, middleName = ?, email = ?, program = ?, yearLevel = ? WHERE id = ?`,
    [updates.firstName, updates.lastName, updates.middleName, updates.email, updates.program, updates.yearLevel, id]
  );
  const updated = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword FROM users WHERE id = ?", [id]);
  res.json(sanitizeUserRecord(updated));
});

app.patch("/api/users/:id/password", requireSelfOrRole("id", "admin"), (req, res, next) => validateRequiredFields(req, res, next, ["password"]), async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required" });
  const existing = await get(db, "SELECT * FROM users WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "User not found" });
  const newPassword = String(password);
  await run(db, "UPDATE users SET password = ?, temporaryPassword = ? WHERE id = ?", [hashPassword(newPassword), newPassword, id]);
  const updated = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword FROM users WHERE id = ?", [id]);
  res.json(sanitizeUserRecord(updated));
});

app.post("/api/users/login", applyRateLimit, (req, res, next) => validateRequiredFields(req, res, next, ["email", "password"]), async (req, res) => {
  const { email, password } = req.body;
  const user = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, createdAt, temporaryPassword, password, firstLoginAt, lastLoginAt FROM users WHERE LOWER(email) = LOWER(?)", [email]);
  if (!user || !verifyPassword(password, user.password)) {
    await createActivityLog("system", "system", "Failed staff login", String(email || "unknown"), "system");
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const now = new Date().toISOString();
  const isFirstLogin = !user.firstLoginAt;
  const needsPasswordUpgrade = !String(user.password).startsWith("scrypt$");
  if (needsPasswordUpgrade) {
    await run(db, "UPDATE users SET password = ?, firstLoginAt = COALESCE(firstLoginAt, ?), lastLoginAt = ? WHERE id = ?", [hashPassword(String(password)), now, now, user.id]);
  } else {
    await run(db, "UPDATE users SET firstLoginAt = COALESCE(firstLoginAt, ?), lastLoginAt = ? WHERE id = ?", [now, now, user.id]);
  }
  if (isFirstLogin) {
    await createNotificationRecord(user.id, "schedule", "Welcome to PIAT", "Welcome! Your account is ready to use. Please sign in with your temporary password and update it when prompted.", user.id);
  }
  await createActivityLog(user.id, `${user.firstName} ${user.lastName}`.trim(), "Successful staff login", "User signed in", user.role);
  const updatedUser = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword, firstLoginAt, lastLoginAt FROM users WHERE id = ?", [user.id]);
  const token = generateJwtToken(updatedUser);
  res.json({ ...sanitizeUserRecord(updatedUser), token });
});

app.get("/api/users/profile", requireRole("admin", "faculty", "registrar", "student"), async (req, res) => {
  const user = await get(db, "SELECT id, userId, username, firstName, middleName, lastName, email, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword, firstLoginAt, lastLoginAt FROM users WHERE id = ?", [req.userContext.userId]);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(sanitizeUserRecord(user));
});

app.get("/api/faculty/subjects", requireRole("admin", "faculty"), async (req, res) => {
  const rows = await all(db, "SELECT * FROM subjects WHERE facultyId = ? ORDER BY code", [req.userContext.userId]);
  res.json(rows);
});

app.get("/api/faculty/subjects/:subjectId/students", requireRole("admin", "faculty"), async (req, res) => {
  const subject = await get(db, "SELECT * FROM subjects WHERE id = ?", [req.params.subjectId]);
  if (!subject) return res.status(404).json({ error: "Subject not found" });
  if (String(subject.facultyId) !== req.userContext.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const rows = await all(
    db,
    `SELECT st.*
     FROM enrollments e
     JOIN students st ON st.studentId = e.studentId
     WHERE e.subjectId = ?
     ORDER BY st.lastName, st.firstName`,
    [req.params.subjectId],
  );
  res.json(rows.map(sanitizeStudentRecord));
});

app.post("/api/attendance/bulk", requireRole("admin", "faculty"), async (req, res) => {
  const records = Array.isArray(req.body?.records) ? req.body.records : null;
  if (!records || records.length === 0) {
    return res.status(400).json({ error: "records must be a non-empty array" });
  }

  const results = [];
  for (const record of records) {
    const localId = record.localId || null;
    const { studentId, subjectId, date, status } = record;
    if (!studentId || !subjectId || !date || !status) {
      results.push({ localId, status: "failed", error: "Missing required fields" });
      continue;
    }

    const subject = await get(db, "SELECT * FROM subjects WHERE id = ?", [subjectId]);
    if (!subject) {
      results.push({ localId, status: "failed", error: "Subject not found" });
      continue;
    }
    if (req.userContext.role === "faculty" && String(subject.facultyId) !== req.userContext.userId) {
      results.push({ localId, status: "failed", error: "Forbidden" });
      continue;
    }

    const existing = await get(db, "SELECT * FROM attendance WHERE studentId = ? AND subjectId = ? AND date = ?", [studentId, subjectId, date]);
    if (existing) {
      await run(db, "UPDATE attendance SET status = ?, updatedAt = ? WHERE id = ?", [String(status), Date.now(), existing.id]);
      results.push({ localId, id: existing.id, status: "updated" });
      continue;
    }

    const entry = {
      id: crypto.randomUUID(),
      studentId: String(studentId),
      subjectId: String(subjectId),
      date: String(date),
      status: String(status),
      updatedAt: Date.now(),
    };
    await run(db, "INSERT INTO attendance (id, studentId, subjectId, date, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?)", [entry.id, entry.studentId, entry.subjectId, entry.date, entry.status, entry.updatedAt]);
    results.push({ localId, id: entry.id, status: "created" });
  }

  res.json(results);
});

app.post("/api/attendance", requireRole("admin", "faculty"), async (req, res) => {
  const { studentId, subjectId, date, status } = req.body;
  if (!studentId || !subjectId || !date || !status) {
    return res.status(400).json({ error: "studentId, subjectId, date, and status are required" });
  }
  const subject = await get(db, "SELECT * FROM subjects WHERE id = ?", [subjectId]);
  if (!subject) {
    return res.status(404).json({ error: "Subject not found" });
  }
  if (req.userContext.role === "faculty" && String(subject.facultyId) !== req.userContext.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const existing = await get(
    db,
    "SELECT * FROM attendance WHERE studentId = ? AND subjectId = ? AND date = ?",
    [studentId, subjectId, date],
  );
  if (existing) {
    await run(
      db,
      "UPDATE attendance SET status = ?, updatedAt = ? WHERE id = ?",
      [String(status), Date.now(), existing.id],
    );
    const updated = await get(db, "SELECT * FROM attendance WHERE id = ?", [existing.id]);
    return res.json(updated);
  }

  const record = {
    id: crypto.randomUUID(),
    studentId: String(studentId),
    subjectId: String(subjectId),
    date: String(date),
    status: String(status),
    updatedAt: Date.now(),
  };
  await run(
    db,
    "INSERT INTO attendance (id, studentId, subjectId, date, status, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    [record.id, record.studentId, record.subjectId, record.date, record.status, record.updatedAt],
  );
  res.status(201).json(record);
});

// Notifications endpoints
app.get("/api/enrollments", requireRole("admin", "registrar", "student"), async (req, res) => {
  const studentId = req.query.studentId ? String(req.query.studentId) : null;
  const academicYear = req.query.academicYear ? String(req.query.academicYear) : null;
  const semester = req.query.semester ? String(req.query.semester) : null;
  const conditions = ["status = 'enrolled'"];
  const params = [];

  if (studentId) {
    conditions.push("studentId = ?");
    params.push(studentId);
  }
  if (academicYear) {
    conditions.push("academicYear = ?");
    params.push(academicYear);
  }
  if (semester) {
    conditions.push("semester = ?");
    params.push(semester);
  }

  const query = {
    sql: `SELECT * FROM enrollments WHERE ${conditions.join(" AND ")} ORDER BY enrolledAt DESC`,
    params,
  };
  const rows = await all(db, query.sql, query.params);
  res.json(rows);
});

app.post("/api/enrollments", requireRole("admin", "registrar"), (req, res, next) => validateRequiredFields(req, res, next, ["studentId"]), (req, res, next) => validateArrayField(req, res, next, "subjectIds"), async (req, res) => {
  const { studentId } = req.body;

  await createActivityLog(req.userContext?.userId || "system", req.userContext?.role || "system", "Enrollment request ignored", `${studentId} (student-only mode)`, req.userContext?.role || "system");
  res.status(201).json([]);
});

app.get("/api/programs", async (_req, res) => {
  const rows = await all(db, "SELECT name FROM programs WHERE status = 'active' ORDER BY name");
  res.json(rows.map((r) => r.name));
});

app.get("/api/programs/detailed", async (_req, res) => {
  const rows = await all(db, "SELECT id, name, description, status, createdAt FROM programs ORDER BY name");
  res.json(rows);
});

app.get("/api/dashboard/registrar", async (_req, res) => {
  const pendingApplications = await get(db, "SELECT COUNT(*) AS count FROM students WHERE status IN ('submitted', 'under_review', 'pending')");
  const approvedStudents = await get(db, "SELECT COUNT(*) AS count FROM students WHERE status = 'approved'");
  const pendingEnrollments = await get(db, "SELECT COUNT(*) AS count FROM enrollments WHERE status = 'enrolled'");
  const totalSubjects = await get(db, "SELECT COUNT(*) AS count FROM subjects");
  const assignedFaculty = await get(
    db,
    "SELECT COUNT(DISTINCT facultyId) AS count FROM subjects WHERE facultyId IS NOT NULL AND facultyId != ''",
  );
  const programsOffered = await get(db, "SELECT COUNT(*) AS count FROM programs WHERE status = 'active'");
  const eligibleStudents = await all(
    db,
    `SELECT 1
     FROM students s
     WHERE s.status = 'approved'
       AND EXISTS (SELECT 1 FROM enrollments e WHERE e.studentId = s.studentId AND e.status = 'enrolled')
       AND EXISTS (SELECT 1 FROM grades g WHERE g.studentId = s.studentId AND g.status = 'finalized')
       AND NOT EXISTS (SELECT 1 FROM grades g WHERE g.studentId = s.studentId AND g.status = 'draft')`,
  );
  const recentActivities = await all(
    db,
    `SELECT 'enrollment' AS type, 'New enrollment recorded' AS message, enrolledAt AS date
     FROM enrollments
     WHERE status = 'enrolled'
     ORDER BY enrolledAt DESC
     LIMIT 5`,
  );

  res.json({
    pendingApplications: pendingApplications?.count ?? 0,
    approvedStudents: approvedStudents?.count ?? 0,
    pendingEnrollments: pendingEnrollments?.count ?? 0,
    activeStudents: approvedStudents?.count ?? 0,
    totalSubjects: totalSubjects?.count ?? 0,
    assignedFaculty: assignedFaculty?.count ?? 0,
    programsOffered: programsOffered?.count ?? 0,
    eligibleReenrollment: eligibleStudents.length,
    recentActivities,
  });
});

app.post("/api/programs", async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Program name is required" });
  const existing = await get(db, "SELECT id FROM programs WHERE name = ?", [name]);
  if (existing) return res.status(400).json({ error: "Program already exists" });
  const program = {
    id: crypto.randomUUID(),
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  await run(db, "INSERT INTO programs (id, name, description, status, createdAt) VALUES (?, ?, ?, ?, ?)", [program.id, program.name, program.description, program.status, program.createdAt]);
  res.status(201).json(program);
});

app.put("/api/programs/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await get(db, "SELECT * FROM programs WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Program not found" });
  const name = req.body.name ? String(req.body.name).trim() : existing.name;
  const description = req.body.description !== undefined ? String(req.body.description).trim() : existing.description;
  await run(db, "UPDATE programs SET name = ?, description = ? WHERE id = ?", [name, description, id]);
  const updated = await get(db, "SELECT * FROM programs WHERE id = ?", [id]);
  res.json(updated);
});

app.delete("/api/programs/:id", async (req, res) => {
  const { id } = req.params;
  await run(db, "UPDATE programs SET status = 'archived' WHERE id = ?", [id]);
  res.status(204).end();
});

app.get("/api/curriculum", async (req, res) => {
  const programId = req.query.programId ? String(req.query.programId) : null;
  const programName = req.query.program ? String(req.query.program) : null;
  let where = "WHERE 1=1";
  const params = [];
  if (programId) {
    where += " AND c.programId = ?";
    params.push(programId);
  } else if (programName) {
    where += " AND p.name = ?";
    params.push(programName);
  }
  const rows = await all(
    db,
    `SELECT c.*, p.name as programName FROM curriculum c JOIN programs p ON p.id = c.programId ${where} ORDER BY c.yearLevel, c.semester, c.subjectCode`,
    params,
  );
  res.json(rows);
});

app.post("/api/curriculum", async (req, res) => {
  const { programId, yearLevel, semester, subjectCode, subjectTitle, units } = req.body;
  if (!programId || !yearLevel || !semester || !subjectCode || !subjectTitle || units === undefined) {
    return res.status(400).json({ error: "Program ID, year level, semester, subject code, title, and units are required" });
  }
  const existing = await get(db, "SELECT id FROM curriculum WHERE programId = ? AND yearLevel = ? AND semester = ? AND subjectCode = ?", [programId, yearLevel, semester, subjectCode]);
  if (existing) return res.status(400).json({ error: "Subject already exists in this curriculum" });
  const id = crypto.randomUUID();
  await run(db, "INSERT INTO curriculum (id, programId, yearLevel, semester, subjectCode, subjectTitle, units) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, programId, yearLevel, semester, subjectCode, subjectTitle, Number(units)]);
  const created = await get(db, "SELECT c.*, p.name as programName FROM curriculum c JOIN programs p ON p.id = c.programId WHERE c.id = ?", [id]);
  res.status(201).json(created);
});

app.delete("/api/curriculum/:id", async (req, res) => {
  const { id } = req.params;
  await run(db, "DELETE FROM curriculum WHERE id = ?", [id]);
  res.status(204).end();
});

app.get("/api/students/eligible-for-reenrollment", async (_req, res) => {
  const rows = await all(
    db,
    `SELECT s.studentId, s.firstName, s.lastName, s.program, s.yearLevel, s.semester
     FROM students s
     WHERE s.status = 'approved'
     AND EXISTS (SELECT 1 FROM enrollments e WHERE e.studentId = s.studentId AND e.status = 'enrolled')
     AND EXISTS (SELECT 1 FROM grades g WHERE g.studentId = s.studentId AND g.status = 'finalized')
     AND NOT EXISTS (SELECT 1 FROM grades g WHERE g.studentId = s.studentId AND g.status = 'draft')`,
  );
  res.json(rows);
});

app.post("/api/students/:studentId/reenroll", async (req, res) => {
  const { studentId } = req.params;
  const existing = await get(db, "SELECT * FROM students WHERE studentId = ?", [studentId]);
  if (!existing) return res.status(404).json({ error: "Student not found" });

  await createNotificationRecord(studentId, "schedule", "Re-enrollment Ignored", "Student-only mode is active, so no re-enrollment records were created.", studentId);
  res.json({ student: existing, enrollmentsCreated: 0 });
});

app.post("/api/students/:studentId/finalize-records", async (req, res) => {
  const { studentId } = req.params;
  const rows = await all(db, "SELECT id FROM grades WHERE studentId = ?", [studentId]);
  for (const row of rows) {
    await run(db, "UPDATE grades SET status = 'finalized' WHERE id = ?", [row.id]);
  }
  await createNotificationRecord(studentId, "grade", "Academic Records Finalized", "Your academic records have been finalized by the Registrar.", studentId);
  res.json({ finalizedCount: rows.length });
});

app.get("/api/reports/enrollment", async (_req, res) => {
  const enrollments = await all(db, "SELECT * FROM enrollments WHERE status = 'enrolled'");
  const students = await all(db, "SELECT studentId, firstName, lastName, program, yearLevel FROM students WHERE status = 'approved'");
  const report = {
    totalEnrolled: enrollments.length,
    byProgram: {},
    byYear: {},
    bySemester: {},
  };
  for (const e of enrollments) {
    const student = students.find(s => s.studentId === e.studentId);
    const prog = student?.program || "Unknown";
    const year = student?.yearLevel || "Unknown";
    report.byProgram[prog] = (report.byProgram[prog] || 0) + 1;
    report.byYear[year] = (report.byYear[year] || 0) + 1;
    report.bySemester[e.semester] = (report.bySemester[e.semester] || 0) + 1;
  }
  res.json(report);
});

app.get("/api/reports/faculty-load", async (_req, res) => {
  const subjects = await all(db, "SELECT * FROM subjects");
  const faculty = await all(db, "SELECT id, userId, firstName, lastName FROM users WHERE role = 'faculty'");
  const report = faculty.map(f => {
    const assigned = subjects.filter(s => s.facultyId === f.id);
    return {
      facultyId: f.userId,
      name: `${f.firstName} ${f.lastName}`,
      subjectCount: assigned.length,
      totalUnits: assigned.reduce((sum, s) => sum + s.units, 0),
    };
  });
  res.json(report);
});

app.get("/api/reports/students", async (_req, res) => {
  const rows = await all(db, "SELECT studentId, firstName, lastName, program, yearLevel, semester FROM students WHERE status = 'approved' ORDER BY lastName, firstName");
  res.json(rows);
});

app.get("/api/reports/curriculum", async (_req, res) => {
  const rows = await all(db, "SELECT p.name, c.yearLevel, c.semester, c.subjectCode, c.subjectTitle, c.units FROM curriculum c JOIN programs p ON p.id = c.programId ORDER BY p.name, c.yearLevel, c.semester, c.subjectCode");
  res.json(rows);
});

app.get("/api/announcements", async (_req, res) => {
  const rows = await all(db, "SELECT * FROM announcements ORDER BY createdAt DESC");
  res.json(rows);
});

app.post("/api/announcements", (req, res, next) => validateRequiredFields(req, res, next, ["title", "body"]), async (req, res) => {
  const { title, body, category, audience, subjectId, authorName, authorRole } = req.body;
  const id = `a-${Date.now()}`;
  const announcement = {
    id,
    title,
    body,
    category: category || "general",
    audience: audience || "all",
    subjectId: subjectId || null,
    pinned: false,
    authorName: authorName || "Admin",
    authorRole: authorRole || "admin",
    createdAt: Date.now(),
    datePosted: new Date().toISOString().split("T")[0],
  };
  await run(
    db,
    "INSERT INTO announcements (id, title, body, category, audience, subjectId, pinned, authorName, authorRole, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [announcement.id, announcement.title, announcement.body, announcement.category, announcement.audience, announcement.subjectId, announcement.pinned ? 1 : 0, announcement.authorName, announcement.authorRole, announcement.createdAt]
  );
  res.status(201).json(announcement);
});

app.delete("/api/announcements", async (req, res) => {
  const id = req.query.id ? String(req.query.id) : null;
  if (!id) return res.status(400).json({ error: "Announcement id is required" });
  await run(db, "DELETE FROM announcements WHERE id = ?", [id]);
  res.status(204).end();
});

app.patch("/api/announcements/:id/pin", async (req, res) => {
  const { id } = req.params;
  const existing = await get(db, "SELECT * FROM announcements WHERE id = ?", [id]);
  if (!existing) return res.status(404).json({ error: "Announcement not found" });
  const pinned = req.body.pinned ? 1 : 0;
  await run(db, "UPDATE announcements SET pinned = ? WHERE id = ?", [pinned, id]);
  const updated = await get(db, "SELECT * FROM announcements WHERE id = ?", [id]);
  res.json(updated);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  return sendError(res, 500, "Internal server error");
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`BWEST backend listening on http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      const nextPort = port + 1;
      console.warn(`Port ${port} is in use, trying ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error(err);
      process.exit(1);
    }
  });
}

startServer(PORT);
