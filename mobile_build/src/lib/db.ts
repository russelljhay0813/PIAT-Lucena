import * as SQLite from "expo-sqlite";

const DB_NAME = "piat_mobile.db";
const db = SQLite.openDatabaseSync(DB_NAME);

export async function initDb() {
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      email TEXT,
      firstName TEXT,
      lastName TEXT,
      role TEXT,
      program TEXT,
      yearLevel TEXT,
      semester TEXT,
      academicYear TEXT
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT,
      title TEXT,
      schedule TEXT,
      room TEXT,
      program TEXT,
      yearLevel TEXT,
      semester TEXT,
      facultyId TEXT,
      academicYear TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentId TEXT UNIQUE,
      firstName TEXT,
      lastName TEXT,
      program TEXT,
      yearLevel TEXT,
      semester TEXT,
      academicYear TEXT
    );

    CREATE TABLE IF NOT EXISTS subject_students (
      subjectId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      PRIMARY KEY (subjectId, studentId)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      studentName TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      subjectCode TEXT NOT NULL,
      subjectName TEXT NOT NULL,
      facultyId TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      academicYear TEXT NOT NULL,
      semester TEXT NOT NULL,
      status TEXT NOT NULL,
      syncStatus TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      UNIQUE(studentId, subjectId, date)
    );
  `);
}

export async function upsertFaculty(faculty: Record<string, string | null>) {
  await db.runAsync(
    `INSERT OR REPLACE INTO faculty (id, email, firstName, lastName, role, program, yearLevel, semester, academicYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [faculty.id, faculty.email, faculty.firstName, faculty.lastName, faculty.role, faculty.program, faculty.yearLevel, faculty.semester, faculty.academicYear],
  );
}

export async function upsertSubjects(subjects: Array<Record<string, string | null>>) {
  await Promise.all(
    subjects.map((subject) =>
      db.runAsync(
        `INSERT OR REPLACE INTO subjects (id, code, title, schedule, room, program, yearLevel, semester, facultyId, academicYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [subject.id, subject.code, subject.title, subject.schedule, subject.room, subject.program, subject.yearLevel, subject.semester, subject.facultyId, subject.academicYear],
      ),
    ),
  );
}

export async function upsertStudents(students: Array<Record<string, string | null>>) {
  await Promise.all(
    students.map((student) =>
      db.runAsync(
        `INSERT OR REPLACE INTO students (id, studentId, firstName, lastName, program, yearLevel, semester, academicYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [student.id, student.studentId, student.firstName, student.lastName, student.program, student.yearLevel, student.semester, student.academicYear],
      ),
    ),
  );
}

export async function upsertSubjectStudents(subjectId: string, studentIds: string[]) {
  await db.runAsync(`DELETE FROM subject_students WHERE subjectId = ?`, [subjectId]);
  await Promise.all(
    studentIds.map((studentId) =>
      db.runAsync(`INSERT OR IGNORE INTO subject_students (subjectId, studentId) VALUES (?, ?)`, [subjectId, studentId]),
    ),
  );
}

export async function getSubjectById(subjectId: string) {
  return (await db.getFirstAsync(`SELECT * FROM subjects WHERE id = ?`, [subjectId])) ?? null;
}

export type AttendanceSyncStatus = "pending" | "synced" | "failed";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  facultyId: string;
  date: string;
  time: string;
  academicYear: string;
  semester: string;
  status: string;
  syncStatus: AttendanceSyncStatus;
  updatedAt: number;
}

export interface AttendanceSaveResult extends AttendanceRecord {
  isUpdated: boolean;
  previousStatus: string | null;
}

export async function getAttendanceRecord(studentId: string, subjectId: string, date: string) {
  return (await db.getFirstAsync(`SELECT * FROM attendance WHERE studentId = ? AND subjectId = ? AND date = ?`, [studentId, subjectId, date])) ?? null;
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceSaveResult> {
  const existing = await getAttendanceRecord(record.studentId, record.subjectId, record.date);
  const id = existing ? existing.id : record.id;
  const previousStatus = existing?.status ?? null;
  const syncStatus = existing && existing.status === record.status && existing.syncStatus === "synced" ? "synced" : "pending";
  await db.runAsync(
    `INSERT OR REPLACE INTO attendance (id, studentId, studentName, subjectId, subjectCode, subjectName, facultyId, date, time, academicYear, semester, status, syncStatus, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, record.studentId, record.studentName, record.subjectId, record.subjectCode, record.subjectName, record.facultyId, record.date, record.time, record.academicYear, record.semester, record.status, syncStatus, record.updatedAt],
  );
  return { ...record, id, syncStatus, isUpdated: !!existing, previousStatus };
}

export async function getSubjectRoster(subjectId: string, date: string) {
  return await db.getAllAsync(
    `SELECT st.*, a.status AS attendanceStatus, a.syncStatus AS attendanceSyncStatus, a.id AS attendanceId
     FROM subject_students ss
     JOIN students st ON st.studentId = ss.studentId
     LEFT JOIN attendance a ON a.studentId = st.studentId AND a.subjectId = ss.subjectId AND a.date = ?
     WHERE ss.subjectId = ?
     ORDER BY st.lastName, st.firstName`,
    [date, subjectId],
  );
}

export async function getTodaySubjects(facultyId: string) {
  return await db.getAllAsync(`SELECT * FROM subjects WHERE facultyId = ? ORDER BY code`, [facultyId]);
}

export async function getTotalStudentsForFaculty(facultyId: string) {
  const row = await db.getFirstAsync(
    `SELECT COUNT(DISTINCT ss.studentId) AS count
     FROM subject_students ss
     JOIN subjects s ON s.id = ss.subjectId
     WHERE s.facultyId = ?`,
    [facultyId],
  );
  return row ? Number(row.count) : 0;
}

export async function getPendingAttendance() {
  return await db.getAllAsync(`SELECT * FROM attendance WHERE syncStatus = 'pending' OR syncStatus = 'failed' ORDER BY updatedAt ASC`);
}

export async function updateAttendanceSyncStatus(id: string, syncStatus: AttendanceSyncStatus) {
  await db.runAsync(`UPDATE attendance SET syncStatus = ? WHERE id = ?`, [syncStatus, id]);
}
