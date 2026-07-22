# PIAT School Management System — Comprehensive Audit Report

**Date:** 2026-07-22
**Scope:** Complete end-to-end audit of all workflows, dashboards, APIs, database, and UI/UX
**Constraint:** No source code modifications were made. Report covers only detected issues.

---

## Executive Summary

A comprehensive static code review was performed across the entire PIAT Academic Management System stack:
- **Backend:** Express.js REST API + SQLite database (`backend/index.js`, `backend/db.js`)
- **Web Frontend:** React 19 + TanStack Router + Tailwind CSS v4 (`src/`)
- **Mobile Client:** Expo/React Native (`mobile_build/` — screens directory empty)

**Total Issues Identified: 49**

| Severity | Count |
|----------|-------|
| Critical | 12 |
| High | 19 |
| Medium | 13 |
| Low | 5 |

---

## 1. Authentication & Authorization

### ISS-001: Hardcoded JWT Secret
- **Module:** Authentication
- **Severity:** Critical
- **File:** `backend/index.js:16`
- **Description:** The JWT secret is hardcoded as `"piat_mobile_secret"` with only an optional environment variable fallback. If `JWT_SECRET` is not set, all tokens are signed with a known, static secret.
- **Impact:** Any attacker who knows this secret can forge valid JWT tokens for any user, bypassing all authentication.
- **Possible Cause:** Development convenience left in production code.

### ISS-002: Dev-Mode Default Admin Role Fallback
- **Module:** Authentication
- **Severity:** Critical
- **File:** `backend/auth-utils.js:40-44`
- **Description:** When no JWT token and no `x-user-role` header are present, and `NODE_ENV` is not `"production"`, the system defaults to `role: "admin"`, `userId: "local-dev"`. This means any unauthenticated request in dev/staging environments receives full admin privileges.
- **Impact:** Complete administrative access without credentials in any non-production deployment.

### ISS-003: Unauthenticated Public Access to Sensitive Endpoints
- **Module:** Authentication / API
- **Severity:** High
- **File:** `backend/index.js`
- **Description:** The following endpoints have no authentication middleware and are fully public:
  - `GET /api/subjects` (line 255)
  - `GET /api/subjects/:id` (line 278)
  - `GET /api/programs` (line 1261)
  - `GET /api/programs/detailed` (line 1303)
  - `GET /api/curriculum` (line 1382)
  - `GET /api/meta/academic-structure` (line 1266)
  - `GET /api/students/eligible-for-reenrollment` (line 1421)
  - `GET /api/reports/enrollment` (line 1453)
  - `GET /api/reports/faculty-load` (line 1473)
  - `GET /api/reports/students` (line 1488)
  - `GET /api/reports/curriculum` (line 1493)
  - `GET /api/announcements` (line 1498)
  - `POST /api/programs` (line 1349)
  - `PUT /api/programs/:id` (line 1365)
  - `DELETE /api/programs/:id` (line 1376)
  - `POST /api/curriculum` (line 1402)
  - `DELETE /api/curriculum/:id` (line 1415)
  - `POST /api/announcements` (line 1503)
  - `DELETE /api/announcements` (line 1527)
  - `PATCH /api/announcements/:id/pin` (line 1534)
  - `POST /api/students/:studentId/reenroll` (line 1434)
  - `POST /api/students/:studentId/finalize-records` (line 1443)
  - `GET /api/dashboard/registrar` (line 1308)
- **Impact:** Sensitive institutional data is exposed without authentication. Critical operations like re-enrollment, record finalization, and program/curriculum modification are publicly accessible.

### ISS-004: Re-enrollment Endpoint Does Nothing
- **Module:** Re-enrollment / API
- **Severity:** Critical
- **File:** `backend/index.js:1434-1441`
- **Description:** `POST /api/students/:studentId/reenroll` only creates a notification saying "Re-enrollment Ignored" and returns the existing student with `enrollmentsCreated: 0`. It performs no actual re-enrollment logic.
- **Impact:** The entire re-enrollment workflow is non-functional via API.

### ISS-005: Finalize Records Endpoint Finalizes ALL Grades
- **Module:** Re-enrollment / API
- **Severity:** Critical
- **File:** `backend/index.js:1443-1451`
- **Description:** `POST /api/students/:studentId/finalize-records` updates every grade for the student to `status = 'finalized'`, regardless of which semester, subject, or period. There is no filtering.
- **Impact:** Finalizing records for one semester inadvertently finalizes all grades, corrupting academic record integrity.

### ISS-006: Enrollment Creation Endpoint Is a No-Op
- **Module:** Enrollment / API
- **Severity:** Critical
- **File:** `backend/index.js:1254-1259`
- **Description:** `POST /api/enrollments` accepts `studentId` and `subjectIds`, logs "Enrollment request ignored (student-only mode)", and returns `[]`. No enrollment records are created.
- **Impact:** The entire enrollment workflow is broken at the API level.

### ISS-007: Student Login Returns Full Student Record
- **Module:** Authentication / API
- **Severity:** High
- **File:** `backend/index.js:683`
- **Description:** The student login endpoint returns the full sanitized student record. While `password` is stripped, all other columns—including emergency contacts, parent details, and personal information—are returned.
- **Impact:** Over-exposure of sensitive personal data in the login response.

### ISS-008: Staff Login Returns Plaintext Temporary Password
- **Module:** Authentication / API
- **Severity:** High
- **File:** `backend/index.js:1083`
- **Description:** `POST /api/users/login` returns `sanitizeUserRecord(updatedUser)` which strips `password`, but also returns `temporaryPassword` (the plaintext temporary password).
- **Impact:** Temporary passwords are exposed in API responses after every staff login.

### ISS-009: Rate Limiter Uses Client IP Without Proxy Awareness
- **Module:** Authentication / API
- **Severity:** High
- **File:** `backend/index.js:66-84`
- **Description:** `getClientKey()` uses `req.ip || req.socket.remoteAddress` without checking `X-Forwarded-For` or `X-Real-IP` headers.
- **Impact:** Rate limiting is unreliable in production deployments behind proxies.

### ISS-010: No CSRF Protection
- **Module:** Authentication / API
- **Severity:** Medium
- **File:** `backend/index.js:35`
- **Description:** `cors()` is used with default settings, and there is no CSRF token validation for state-changing operations.
- **Impact:** Authenticated users can be tricked into performing unintended actions via cross-site request forgery.

### ISS-011: Password Reset Allows Any Password Without Old Password Verification
- **Module:** Authentication / API
- **Severity:** High
- **File:** `backend/index.js:1050-1060`
- **Description:** `PATCH /api/users/:id/password` requires only the new password. Any admin can reset any user's password without verifying the old one.
- **Impact:** Account takeover risk if an admin session is compromised.

### ISS-012: Session Never Invalidated on Logout
- **Module:** Authentication / Frontend
- **Severity:** Medium
- **File:** `src/lib/auth-context.tsx:69-74`
- **Description:** The frontend `logout()` clears localStorage and React state, but the backend JWT remains valid for 7 days. There is no token revocation mechanism.
- **Impact:** Stolen JWTs remain usable for up to 7 days after logout.

---

## 2. Administrator Module

### ISS-013: Admin Dashboard Stats Inaccurate
- **Module:** Administrator / Dashboard
- **Severity:** High
- **File:** `src/routes/dashboard/admin.index.tsx:25-28`
- **Description:** The admin dashboard computes `totalStudents` and `totalFaculty` from the `users` table, while `pendingApplications` and `approvedStudents` come from the `students` table. These two sources can diverge.
- **Impact:** Dashboard statistics may be incorrect or misleading.

### ISS-014: Subject Offerings Card Uses Wrong Icon
- **Module:** Administrator / Dashboard
- **Severity:** Low
- **File:** `src/routes/dashboard/admin.index.tsx:41`
- **Description:** The "Subject Offerings" card uses the `Users` icon and subtitle "Active courses" instead of a more appropriate icon like `BookOpen`.
- **Impact:** Minor UI inconsistency.

### ISS-015: Create Staff Form Missing Semester and Academic Year Fields
- **Module:** Administrator / User Management
- **Severity:** Medium
- **File:** `src/routes/dashboard/admin.users.tsx:34-40`
- **Description:** The "Create Staff" modal form only captures `role`, `firstName`, `middleName`, `lastName`, and `email`. It does not include `semester` or `academicYear` fields.
- **Impact:** Staff accounts are created with NULL semester/academicYear.

### ISS-016: Create Student Form Does Not Capture Required Backend Fields
- **Module:** Administrator / User Management
- **Severity:** High
- **File:** `src/routes/dashboard/admin.users.tsx:23-33`
- **Description:** The "Create Student" form omits critical fields required by `validateRegistrationPayload`: `educationLevel`, `yearLevel`, `semester`, `contactNumber`, `address`, `city`, `province`, `zip`, `parentName`, `parentRelationship`, `parentContact`.
- **Impact:** Students created by admin have incomplete records and will fail auto-approval validation.

### ISS-017: Credentials Modal Z-Index Inconsistency
- **Module:** Administrator / User Management
- **Severity:** Low
- **File:** `src/routes/dashboard/admin.users.tsx:450`
- **Description:** The credentials modal overlay uses `z-50` while all other modals use `z-50`. Not necessarily wrong but worth noting.
- **Impact:** Minor z-index layering risk.

### ISS-018: Admin Settings Page Has No Persistence
- **Module:** Administrator / Settings
- **Severity:** High
- **File:** `src/routes/dashboard/admin.settings.tsx:13-21, 40-42`
- **Description:** The settings page stores all configuration in local React state. There is no API call to persist any settings to the database.
- **Impact:** Settings are completely non-functional; changes are lost on page refresh.

### ISS-019: Settings Toggle "left-5.5" Is Invalid CSS
- **Module:** Administrator / Settings
- **Severity:** Medium
- **File:** `src/routes/dashboard/admin.settings.tsx:112`
- **Description:** The toggle switch uses `left-5.5` which is not a valid Tailwind CSS class.
- **Impact:** Settings toggles appear broken in the UI.

### ISS-020: Security Page Misinterprets `temporaryPassword` as 2FA
- **Module:** Administrator / Security
- **Severity:** Medium
- **File:** `src/routes/dashboard/admin.security.tsx:16`
- **Description:** The "2FA Enabled" stat counts users where `temporaryPassword` is truthy. The `temporaryPassword` field stores the plaintext initial password, not a 2FA flag.
- **Impact:** Misleading security metrics displayed to administrators.

---

## 3. Registrar Module

### ISS-021: Enrollment Page Stats Use Unfiltered Data
- **Module:** Registrar / Enrollment
- **Severity:** High
- **File:** `src/routes/dashboard/registrar.enrollment.tsx:175-177`
- **Description:** "Enrolled This Term" is computed using all enrollments fetched without filters, counting ALL enrollments across all terms.
- **Impact:** Enrollment statistics are inflated and inaccurate.

### ISS-022: Enrollment Creation Fails Silently
- **Module:** Registrar / Enrollment
- **Severity:** Critical
- **File:** `backend/index.js:1254-1259` (see ISS-006)
- **Description:** The `POST /api/enrollments` endpoint is a complete no-op. It returns `[]` without creating any records.
- **Impact:** The entire enrollment management workflow is broken.

### ISS-023: Re-enrollment Eligibility Criteria Too Restrictive
- **Module:** Registrar / Re-enrollment
- **Severity:** High
- **File:** `backend/index.js:1421-1431`
- **Description:** The `eligible-for-reenrollment` endpoint requires students to have no draft grades and at least one finalized grade.
- **Impact:** Very few students will ever appear as eligible for re-enrollment.

### ISS-024: Re-enrollment Endpoint Does Nothing (Registrar Side)
- **Module:** Registrar / Re-enrollment
- **Severity:** Critical
- **File:** `backend/index.js:1434-1441` (see ISS-004)
- **Description:** When the registrar clicks "Approve Re-enrollment", the API call succeeds but performs no actual re-enrollment.
- **Impact:** Registrar cannot process re-enrollments.

### ISS-025: Student Re-enrollment Bypasses Registrar Approval
- **Module:** Registrar / Re-enrollment / Student
- **Severity:** High
- **File:** `src/routes/dashboard/student.enrollment.tsx:83-104`
- **Description:** The student's "Apply for Re-enrollment" button directly calls `enrollStudentApi`. Since that endpoint is a no-op, nothing happens. Additionally, the student self-enrollment logic bypasses the Registrar's approval workflow entirely.
- **Impact:** Re-enrollment workflow is broken and lacks proper approval gates.

### ISS-026: Finalize Records Button Missing from Registrar UI
- **Module:** Registrar / Academic Records
- **Severity:** High
- **File:** `src/routes/dashboard/registrar.records.tsx`
- **Description:** The Registrar Academic Records page shows student records with grades and attendance but has no button or mechanism to trigger `POST /api/students/:studentId/finalize-records`.
- **Impact:** Registrars cannot finalize student academic records through the UI.

### ISS-027: Academic Records "Units" Column Shows Year Level Numeric Part
- **Module:** Registrar / Academic Records
- **Severity:** Medium
- **File:** `src/routes/dashboard/registrar.records.tsx:150`
- **Description:** The "Units" column renders `r.yearLevel.replace(" Year", "")` instead of actual credit units.
- **Impact:** Academic records display incorrect/misleading data.

### ISS-028: Reports CSV Export Does Not Escape Commas
- **Module:** Registrar / Reports
- **Severity:** Medium
- **File:** `src/routes/dashboard/registrar.reports.tsx:48-75`
- **Description:** The CSV export concatenates values directly without escaping quotes or commas.
- **Impact:** Corrupted CSV files for reports containing names or titles with commas.

### ISS-029: Faculty Assignment Page Does Not Filter by Faculty
- **Module:** Registrar / Faculty Assignment
- **Severity:** Medium
- **File:** `src/routes/dashboard/registrar.faculty.tsx:71`
- **Description:** `getFacultySubjects` filters subjects by `facultyId`, but the faculty list displayed includes ALL faculty users regardless of whether they have any assigned subjects.
- **Impact:** Dashboard statistics may misrepresent actual faculty workload.

---

## 4. Faculty Module

### ISS-030: Faculty Attendance Page Does Not Allow Recording Attendance
- **Module:** Faculty / Attendance
- **Severity:** Critical
- **File:** `src/routes/dashboard/faculty.attendance.tsx:90-95`
- **Description:** The `markStudent` function is defined as an empty async function that does nothing. There are no UI buttons wired to call `markStudent`.
- **Impact:** Faculty cannot record attendance through the web dashboard at all.

### ISS-031: Faculty Attendance Page Shows All Students, Not Subject-Specific
- **Module:** Faculty / Attendance
- **Severity:** High
- **File:** `src/routes/dashboard/faculty.attendance.tsx:45-61`
- **Description:** `loadStudents` calls `fetchStudents()` without any subject filter, returning ALL students in the system.
- **Impact:** The attendance page shows every student in the institution, not just those enrolled in the selected subject.

### ISS-032: Faculty Grades Page Saves Only Prelim Grades
- **Module:** Faculty / Grading
- **Severity:** Critical
- **File:** `src/routes/dashboard/faculty.grades.tsx:223-300`
- **Description:** `handleSaveGrades` iterates over `detailedGrades` and only saves grades for the `prelim` period. Midterm and final period grades are computed but never persisted.
- **Impact:** Midterm and final grades are lost when "Save Draft" is clicked.

### ISS-033: Faculty Grades Page Submit Only Saves Overall
- **Module:** Faculty / Grading
- **Severity:** High
- **File:** `src/routes/dashboard/faculty.grades.tsx:302-323`
- **Description:** `handleSubmitGrades` computes the overall grade and saves it with `status: "submitted"`, but it does NOT save the midterm or final period component grades.
- **Impact:** Submitted grades lack period-level detail.

### ISS-034: Faculty Performance Page Has Inverted Min/Max Labels
- **Module:** Faculty / Performance
- **Severity:** Medium
- **File:** `src/routes/dashboard/faculty.performance.tsx:79-80`
- **Description:** The analytics compute `highestGrade` using `Math.min(...gradeValues)` and `lowestGrade` using `Math.max(...gradeValues)`. The labels and colors are swapped.
- **Impact:** Performance statistics are misleading.

### ISS-035: Faculty Subject Details Page Shows All Students in Subject List
- **Module:** Faculty / Class List
- **Severity:** High
- **File:** `src/routes/dashboard/faculty.subject-details.tsx:45-53`
- **Description:** The page fetches all enrollments and filters by `subjectId`, but then calls `fetchStudents()` which returns ALL students and filters client-side.
- **Impact:** Students who enrolled but don't have a `students` record will be missing from the class list.

### ISS-036: Faculty Dashboard Today's Classes Uses Naive Schedule Parsing
- **Module:** Faculty / Dashboard
- **Severity:** Low
- **File:** `src/routes/dashboard/faculty.index.tsx:54-65`
- **Description:** The schedule parser matches day abbreviations against today's day token. This is fragile for non-standard schedule formats.
- **Impact:** "Today's Schedule" may show incorrect classes.

---

## 5. Student Module

### ISS-037: Student Registration Submits Without Auto-Approval
- **Module:** Student / Registration
- **Severity:** High
- **File:** `src/routes/register.tsx:214-249`
- **Description:** The registration form submits with `status: "submitted"`. The frontend validation schema does not match the backend's required fields exactly.
- **Impact:** Registrations may be submitted with missing fields, causing auto-approval to fail.

### ISS-038: Registration Success Message Claims Approval Regardless of Actual Status
- **Module:** Student / Registration
- **Severity:** High
- **File:** `src/routes/register.tsx:245, 262`
- **Description:** After submission, the UI displays "Your registration has been approved and you are now officially enrolled" regardless of whether auto-approval actually occurred.
- **Impact:** Misleading user experience.

### ISS-039: Student Dashboard Academic History Uses Enrollment Status for History
- **Module:** Student / Dashboard
- **Severity:** High
- **File:** `src/routes/dashboard/student.index.tsx:214-241`
- **Description:** Historical enrollments are computed by filtering out the current term's enrollments. The dashboard does not check `status === "completed"`. Dropped subjects from previous terms appear in academic history.
- **Impact:** Academic history may show dropped/failed subjects alongside completed ones.

### ISS-040: Student Dashboard GWA Computation Does Not Use Credit Units
- **Module:** Student / Dashboard
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.index.tsx:281-283`
- **Description:** The Overall GWA is computed as a simple average of all `finalGrade` values, without weighting by subject units.
- **Impact:** GWA calculations are academically incorrect.

### ISS-041: Student Dashboard Current Term May Show Stale Data
- **Module:** Student / Dashboard
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.index.tsx:169-170`
- **Description:** `currentAcademicYear` and `currentSemester` default to the student's stored values, which may be stale.
- **Impact:** Student dashboard may display the wrong current term.

### ISS-042: Student Attendance Page Shows Subject ID Instead of Subject Code/Title
- **Module:** Student / Attendance
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.attendance.tsx:116`
- **Description:** The attendance table displays `r.subjectId` (a UUID) instead of `r.subjectCode` or `r.subjectTitle`.
- **Impact:** Attendance records are unreadable.

---

## 6. Attendance Tracker Module

### ISS-043: Attendance Does Not Sync to Dashboards
- **Module:** Attendance / Integration
- **Severity:** High
- **File:** `backend/index.js:795-846` and `backend/index.js:1115-1174`
- **Description:** The attendance create/update endpoints do not dispatch any custom events that the frontend stores listen for.
- **Impact:** Attendance data entered via API does not trigger real-time updates on dashboards.

### ISS-044: Attendance API Returns Incomplete Records
- **Module:** Attendance / API
- **Severity:** Medium
- **File:** `backend/index.js:1176-1217`
- **Description:** The second `POST /api/attendance` handler creates a minimal record with only 6 fields, missing `studentName`, `subjectCode`, `subjectTitle`, `facultyId`, `time`, `academicYear`, `semester`, `program`, `yearLevel`, and `section`.
- **Impact:** Some attendance records lack display data.

### ISS-045: Duplicate `POST /api/attendance` Route Definitions
- **Module:** Attendance / API
- **Severity:** High
- **File:** `backend/index.js:795-846` and `backend/index.js:1176-1217`
- **Description:** Two Express routes are registered for `POST /api/attendance`. The second silently overwrites the first.
- **Impact:** All new attendance records are created with missing data.

---

## 7. Database & Data Integrity

### ISS-046: `students` Table Status Allows Invalid Values
- **Module:** Database
- **Severity:** Medium
- **File:** `backend/db.js:285`
- **Description:** The `students.status` column is defined as `TEXT NOT NULL` with no CHECK constraint.
- **Impact:** Invalid or unexpected status values can be inserted.

### ISS-047: Foreign Key Enforcement May Be Unreliable
- **Module:** Database
- **Severity:** High
- **File:** `backend/db.js:73`
- **Description:** `PRAGMA foreign_keys = ON` is set, but SQLite only enforces foreign keys within the same database connection.
- **Impact:** Orphaned records may exist in the database.

### ISS-048: `enrollments` References `students(studentId)` But `studentId` Is Not Primary Key
- **Module:** Database
- **Severity:** High
- **File:** `backend/db.js:227`
- **Description:** The `enrollments` table has `FOREIGN KEY (studentId) REFERENCES students(studentId)`, but the `students` table's primary key is `id` (TEXT), not `studentId`.
- **Impact:** Architecturally inconsistent; may cause issues with cascading deletes.

### ISS-049: `subjects` Table Lacks Foreign Key to `programs`
- **Module:** Database
- **Severity:** Medium
- **File:** `backend/db.js:179-194`
- **Description:** The `subjects` table stores `program` as free-text with no foreign key to the `programs` table.
- **Impact:** Data inconsistency when programs are renamed or archived.

### ISS-050: `attendance` Table Has No Foreign Key to `faculty`
- **Module:** Database
- **Severity:** Medium
- **File:** `backend/db.js:317-340`
- **Description:** The `attendance` table stores `facultyId` but has no `FOREIGN KEY (facultyId) REFERENCES users(id)` constraint.
- **Impact:** Orphaned attendance records when faculty accounts are removed.

### ISS-051: Duplicate `POST /api/attendance` Route Definitions
- **Module:** API
- **Severity:** High
- **File:** `backend/index.js:795-846` and `backend/index.js:1176-1217`
- **Description:** Two Express routes for `POST /api/attendance` are registered. The second silently overwrites the first.
- **Impact:** The more complete handler is unreachable.

---

## 8. UI/UX Issues

### ISS-052: Faculty Attendance Page Missing Action Buttons
- **Module:** Faculty / UI
- **Severity:** High
- **File:** `src/routes/dashboard/faculty.attendance.tsx`
- **Description:** The attendance page displays student names and statuses but provides no interactive elements to change a student's attendance status.
- **Impact:** Faculty cannot mark attendance through the web interface.

### ISS-053: Student Registration Step 3 Fields Are Disabled
- **Module:** Student / Registration
- **Severity:** High
- **File:** `src/routes/register.tsx:406-423`
- **Description:** The Program, Year Level, and Semester dropdowns in Step 3 have `disabled` attributes.
- **Impact:** Students cannot correct their program/year/semester if the stored values are wrong.

### ISS-054: Faculty Dashboard "Current Semester" Shows "—" When User Has No Semester
- **Module:** Faculty / Dashboard
- **Severity:** Low
- **File:** `src/routes/dashboard/faculty.index.tsx:98`
- **Description:** `currentSemester` falls back to `facultyOnly[0]?.semester || "—"`.
- **Impact:** Minor display issue.

### ISS-055: Admin Security Page "2FA Enabled" Stat Is Misleading
- **Module:** Administrator / Security
- **Severity:** Medium
- **File:** `src/routes/dashboard/admin.security.tsx:16`
- **Description:** Counts users with non-null `temporaryPassword` as "2FA Enabled".
- **Impact:** Administrators see false security metrics.

### ISS-056: Registrar Students Page Shows "Enrolled" Status Based on Registration Status
- **Module:** Registrar / Students
- **Severity:** Medium
- **File:** `src/routes/dashboard/registrar.students.tsx:144-146`
- **Description:** The "Enrollment Status" column shows "Enrolled" if `s.status === "approved"` and "Pending" otherwise.
- **Impact:** Misleading enrollment status display.

### ISS-057: Faculty Grades Page Does Not Show Midterm/Final Grades After Save
- **Module:** Faculty / Grading
- **Severity:** High
- **File:** `src/routes/dashboard/faculty.grades.tsx:223-300`
- **Description:** `handleSaveGrades` only saves prelim grades. Midterm and final grades are lost.
- **Impact:** Faculty lose midterm and final grade data.

### ISS-058: Student Dashboard Grades Section Does Not Show All Periods
- **Module:** Student / Dashboard
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.index.tsx:755-826`
- **Description:** The grades section shows prelim, midterm, and final grades, but midterm/final grades are never saved by the faculty page.
- **Impact:** Students cannot see their midterm or final grades.

### ISS-059: Attendance Records Table Missing Subject Details
- **Module:** Student / Attendance
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.attendance.tsx:116`
- **Description:** The attendance table column labeled "Subject" displays `r.subjectId` (a UUID) instead of `r.subjectCode` or `r.subjectTitle`.
- **Impact:** Students cannot identify which subject each attendance record belongs to.

### ISS-060: Faculty Subject Details Page Shows "—" for Missing Attendance
- **Module:** Faculty / Class List
- **Severity:** Low
- **File:** `src/routes/dashboard/faculty.subject-details.tsx:220`
- **Description:** The "Attendance Status" column shows "—" when no attendance records exist for a student.
- **Impact:** Minor display issue in a broken feature.

---

## 9. Mobile Client

### ISS-061: Mobile Screens Directory Is Empty
- **Module:** Mobile Client
- **Severity:** High
- **File:** `mobile_build/src/screens/`
- **Description:** The `mobile_build/src/screens/` directory exists but contains zero files. The mobile application has no UI screens implemented.
- **Impact:** The mobile client is non-functional.

### ISS-062: Mobile API Client Missing Identity Headers
- **Module:** Mobile Client / API
- **Severity:** Medium
- **File:** `mobile_build/src/lib/api.ts:8-19`
- **Description:** The mobile API client only sends the `Authorization: Bearer <token>` header. It does not send `x-user-role`, `x-user-id`, or `x-user-student-id` headers.
- **Impact:** Backend identity resolution for mobile requests may fall back to dev-mode admin.

---

## 10. Integration & Workflow Issues

### ISS-063: No Synchronization Between Admin User Creation and Student Record Creation
- **Module:** Integration / Administrator ↔ Student
- **Severity:** High
- **File:** `backend/index.js:974-1013`
- **Description:** When an admin creates a student user via `POST /api/users`, the backend auto-creates a `students` record with hardcoded defaults. `syncStudentEnrollment` is NOT called.
- **Impact:** Students created by admin have incomplete records and no enrollments.

### ISS-064: No Synchronization Between Grade Submission and Student Dashboard
- **Module:** Integration / Faculty ↔ Student
- **Severity:** High
- **File:** `backend/index.js:752-754`
- **Description:** When grades are saved, a notification is created, but the student dashboard listens for `bwest:grades-changed` events which are only dispatched by the frontend.
- **Impact:** Students must manually refresh their dashboard to see new grades.

### ISS-065: No Synchronization Between Attendance Recording and Student Dashboard
- **Module:** Integration / Faculty ↔ Student
- **Severity:** High
- **File:** `backend/index.js:795-846`
- **Description:** Attendance records are created/updated via API, but the backend does not dispatch `bwest:attendance-changed` events.
- **Impact:** Attendance data is stale until manual refresh.

### ISS-066: No Synchronization Between Enrollment and Faculty Dashboard
- **Module:** Integration / Registrar ↔ Faculty
- **Severity:** High
- **File:** `backend/index.js:1254-1259`
- **Description:** Since enrollment creation is a no-op, there is no synchronization.
- **Impact:** Faculty class lists would not update automatically.

### ISS-067: Attendance Bulk Endpoint Not Used by Any Frontend
- **Module:** Integration / API
- **Severity:** Medium
- **File:** `backend/index.js:1115-1174` and `mobile_build/src/lib/api.ts:147-151`
- **Description:** The `POST /api/attendance/bulk` endpoint exists but the web frontend has no UI for bulk attendance entry. The mobile app's screens directory is empty.
- **Impact:** The bulk attendance endpoint is effectively unreachable.

---

## 11. Performance & Infrastructure

### ISS-068: No Database Indexes on Foreign Keys
- **Module:** Database
- **Severity:** Medium
- **File:** `backend/db.js`
- **Description:** The database schema does not define indexes on commonly queried foreign key columns.
- **Impact:** Slow query performance as data volume grows.

### ISS-069: N+1 Query Pattern in Reports and Dashboard Stats
- **Module:** API / Performance
- **Severity:** Medium
- **File:** `backend/index.js:1453-1471`
- **Description:** The enrollment report fetches all enrollments and all students, then performs `students.find()` inside a loop.
- **Impact:** Reports will become slow as data grows.

### ISS-070: No Request Validation Middleware
- **Module:** API
- **Severity:** Medium
- **File:** `backend/index.js`
- **Description:** There is no centralized request validation middleware.
- **Impact:** Missing or inconsistent validation can lead to unexpected errors or data corruption.

### ISS-071: No Pagination on List Endpoints
- **Module:** API
- **Severity:** Medium
- **File:** `backend/index.js`
- **Description:** List endpoints return all records without pagination.
- **Impact:** As data grows, response payloads become large, causing slow page loads.

### ISS-072: No Caching Layer
- **Module:** API / Performance
- **Severity:** Low
- **File:** `backend/index.js`
- **Description:** There is no HTTP caching or application-level caching for frequently accessed data.
- **Impact:** Redundant database queries for static reference data.

---

## 12. Additional Findings

### ISS-073: Registrar Dashboard Stats Endpoint Is Public
- **Module:** Registrar / API
- **Severity:** High
- **File:** `backend/index.js:1308`
- **Description:** `GET /api/dashboard/registrar` has no authentication middleware.
- **Impact:** Sensitive institutional metrics are publicly accessible.

### ISS-074: Student Re-enrollment Uses Hardcoded Academic Year
- **Module:** Student / Re-enrollment
- **Severity:** Medium
- **File:** `src/routes/dashboard/student.enrollment.tsx:83-86`
- **Description:** When a student applies for re-enrollment, the `academicYear` is hardcoded to `${currentYear}-${currentYear + 1}` based on the client's local clock.
- **Impact:** Re-enrollment may create enrollments for the wrong academic year.

### ISS-075: Faculty Grades Page Does Not Validate Grade Range
- **Module:** Faculty / Grading
- **Severity:** Medium
- **File:** `src/routes/dashboard/faculty.grades.tsx:174-220`
- **Description:** The grade inputs allow any numeric value, but the grading formula can compute values outside expected ranges.
- **Impact:** Invalid grades can be saved to the database.

### ISS-076: Student Dashboard "Date Completed" Uses `reviewedAt`
- **Module:** Student / Dashboard
- **Severity:** Low
- **File:** `src/routes/dashboard/student.index.tsx:679`
- **Description:** The "Date Completed" field displays `studentProfile?.reviewedAt`, which is the date the registration was approved, not the completion date.
- **Impact:** Misleading graduation/completion date display.

### ISS-077: Faculty Dashboard "Recent Notifications" May Show Other Faculty's Notifications
- **Module:** Faculty / Dashboard
- **Severity:** Medium
- **File:** `src/routes/dashboard/faculty.index.tsx:74`
- **Description:** The faculty dashboard fetches notifications using `fetchNotifications(user.id)`, but some backend notifications may use different identifiers.
- **Impact:** Faculty may see notifications intended for other users.

### ISS-078: Registrar Enrollment Page Does Not Validate Duplicate Enrollments
- **Module:** Registrar / Enrollment
- **Severity:** Medium
- **File:** `src/routes/dashboard/registrar.enrollment.tsx:137-155`
- **Description:** The `handleEnrollStudent` function calls `enrollStudent` without checking if the student is already enrolled in the selected subjects.
- **Impact:** Duplicate enrollment records may be created if the endpoint were functional.

### ISS-079: No Audit Log for Sensitive Operations
- **Module:** Security / API
- **Severity:** Medium
- **File:** `backend/index.js`
- **Description:** Many sensitive operations lack audit logging: password resets, grade finalization, re-enrollment attempts, attendance modifications, and program/curriculum changes.
- **Impact:** Security incidents cannot be traced or investigated.

### ISS-080: Student Registration Form Does Not Validate Email Uniqueness Before Submission
- **Module:** Student / Registration
- **Severity:** Medium
- **File:** `src/routes/register.tsx:207-209`
- **Description:** The form checks `emailExists` only after the user clicks "Submit Registration".
- **Impact:** Poor user experience—error occurs after full form submission.

---

## 13. Summary of Critical Workflow Blockers

The following issues completely block core system workflows:

| Workflow | Blocker Issue(s) |
|----------|------------------|
| **Enrollment** | ISS-006 (endpoint is no-op) |
| **Re-enrollment** | ISS-004 (endpoint does nothing), ISS-005 (finalizes all grades) |
| **Attendance (Web)** | ISS-030 (no UI to record), ISS-045 (duplicate routes) |
| **Grade Entry (Midterm/Final)** | ISS-032 (only prelim saved), ISS-033 (submit only overall) |
| **Student Self-Registration** | ISS-037 (validation mismatch), ISS-038 (false success message) |
| **Mobile Attendance** | ISS-061 (no screens implemented) |
| **Admin Settings** | ISS-018 (no persistence) |

---

## 14. Recommendations Priority

### Immediate (Critical) — Fix Before Any Deployment

1. **ISS-001:** Move JWT secret to environment variable. Enforce `JWT_SECRET` in production.
2. **ISS-002:** Remove dev-mode admin fallback. Require authentication for all protected routes.
3. **ISS-004:** Implement actual re-enrollment logic in `POST /api/students/:studentId/reenroll`.
4. **ISS-005:** Add semester/subject/period filters to `POST /api/students/:studentId/finalize-records`.
5. **ISS-006:** Implement actual enrollment creation in `POST /api/enrollments`.
6. **ISS-030:** Either implement web attendance recording or clearly disable the page with a redirect message.
7. **ISS-032:** Fix `handleSaveGrades` to persist all periods (prelim, midterm, final).
8. **ISS-045:** Remove duplicate `POST /api/attendance` route; keep only the complete handler.

### High Priority — Fix Within Sprint

9. **ISS-003:** Add authentication middleware to all sensitive public endpoints.
10. **ISS-016:** Expand admin "Create Student" form to capture all required fields.
11. **ISS-018:** Implement API persistence for admin settings.
12. **ISS-021:** Filter enrollment stats by current term.
13. **ISS-023:** Review and relax re-enrollment eligibility criteria.
14. **ISS-031:** Filter `loadStudents` by selected subject in faculty attendance page.
15. **ISS-037:** Align frontend registration validation with backend `validateRegistrationPayload`.
16. **ISS-038:** Fix registration success message to reflect actual status.
17. **ISS-043:** Add backend event dispatching for attendance changes.
18. **ISS-062:** Add `x-user-role`, `x-user-id`, `x-user-student-id` headers to mobile API client.

### Medium Priority — Fix Within Next Release

19. **ISS-008:** Remove `temporaryPassword` from login responses.
20. **ISS-009:** Update rate limiter to respect `X-Forwarded-For` header.
21. **ISS-011:** Add old password verification to password reset endpoint.
22. **ISS-012:** Implement JWT token revocation list or short-lived tokens with refresh mechanism.
23. **ISS-013:** Unify admin dashboard stats to use a single source of truth.
24. **ISS-026:** Add "Finalize Records" button to Registrar Academic Records page.
25. **ISS-027:** Fix "Units" column in academic records to show actual credit units.
26. **ISS-028:** Properly escape CSV values in reports export.
27. **ISS-034:** Fix inverted min/max labels in faculty performance analytics.
28. **ISS-040:** Weight GWA computation by subject units.
29. **ISS-042:** Display `subjectCode` instead of `subjectId` in student attendance table.
30. **ISS-051:** Resolve duplicate attendance route definitions.

### Low Priority — Fix When Time Permits

31. **ISS-014:** Update Subject Offerings card icon to `BookOpen`.
32. **ISS-017:** Review and standardize z-index values across modals.
33. **ISS-019:** Fix invalid `left-5.5` CSS class.
34. **ISS-020:** Replace misleading "2FA Enabled" stat with actual security metrics.
35. **ISS-036:** Improve schedule parser to handle complex formats.
36. **ISS-054:** Handle missing semester display more gracefully.
37. **ISS-060:** Clarify attendance status display in faculty class list.
38. **ISS-072:** Add caching headers for static reference data.

---

## 15. Conclusion

The PIAT School Management System has a solid architectural foundation with a well-organized frontend and a comprehensive backend API. However, several **critical workflow blockers** render core features non-functional:

- **Enrollment** is completely broken at the API level.
- **Re-enrollment** performs no actual work and finalizes all grades indiscriminately.
- **Attendance recording** has no functional web interface and the mobile app is not implemented.
- **Grade entry** only persists prelim grades; midterm and final grades are lost.
- **Student registration** has a misleading success message and validation mismatches.
- **Admin settings** have no persistence mechanism.

These issues must be addressed before the system can be considered production-ready. Additionally, the authentication layer requires immediate hardening (hardcoded JWT secret, dev-mode admin fallback, missing CSRF protection) to prevent security vulnerabilities.

**Recommendation:** Do not deploy this system to production until the Critical and High priority issues are resolved. The system as currently architected cannot reliably support academic operations due to the broken core workflows.