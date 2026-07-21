import sqlite3 from "sqlite3";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "bwest.db");

export function openDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

export function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function withTransaction(db, callback) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await run(db, "BEGIN");
        const result = await callback();
        await run(db, "COMMIT");
        resolve(result);
      } catch (error) {
        await run(db, "ROLLBACK").catch(() => {});
        reject(error);
      }
    });
  });
}

async function columnExists(db, table, column) {
  const rows = await all(db, `PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
}

async function addColumnIfMissing(db, table, column, type) {
  if (!(await columnExists(db, table, column))) {
    await run(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export async function initDb(db) {
  await run(db, `PRAGMA foreign_keys = ON`);

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
      createdAt TEXT NOT NULL
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS academic_years (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      startDate TEXT,
      endDate TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      createdAt TEXT NOT NULL
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sequence INTEGER NOT NULL,
      academicYearId TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (academicYearId) REFERENCES academic_years(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      programId TEXT,
      yearLevel TEXT,
      semesterId TEXT,
      academicYearId TEXT,
      capacity INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (programId) REFERENCES programs(id),
      FOREIGN KEY (semesterId) REFERENCES semesters(id),
      FOREIGN KEY (academicYearId) REFERENCES academic_years(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS curriculum (
      id TEXT PRIMARY KEY,
      programId TEXT NOT NULL,
      yearLevel TEXT NOT NULL,
      semester TEXT NOT NULL,
      subjectCode TEXT NOT NULL,
      subjectTitle TEXT NOT NULL,
      units INTEGER NOT NULL,
      FOREIGN KEY (programId) REFERENCES programs(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      middleName TEXT,
      studentId TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'registrar', 'student')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      program TEXT,
      yearLevel TEXT,
      semester TEXT,
      academicYear TEXT,
      createdAt TEXT NOT NULL,
      temporaryPassword TEXT,
      firstLoginAt TEXT,
      lastLoginAt TEXT
    )`,
  );
  await addColumnIfMissing(db, "users", "temporaryPassword", "TEXT");
  await addColumnIfMissing(db, "users", "semester", "TEXT");
  await addColumnIfMissing(db, "users", "academicYear", "TEXT");
  await addColumnIfMissing(db, "users", "firstLoginAt", "TEXT");
  await addColumnIfMissing(db, "users", "lastLoginAt", "TEXT");
  await addColumnIfMissing(db, "users", "studentId", "TEXT");

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      units INTEGER NOT NULL,
      schedule TEXT NOT NULL,
      room TEXT NOT NULL,
      instructor TEXT NOT NULL,
      program TEXT,
      yearLevel TEXT,
      semester TEXT,
      facultyId TEXT,
      academicYear TEXT,
      addedAt INTEGER NOT NULL
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS subject_offerings (
      id TEXT PRIMARY KEY,
      subjectId TEXT NOT NULL,
      academicYearId TEXT,
      semesterId TEXT,
      sectionId TEXT,
      facultyId TEXT,
      schedule TEXT,
      room TEXT,
      capacity INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'closed')),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (subjectId) REFERENCES subjects(id),
      FOREIGN KEY (academicYearId) REFERENCES academic_years(id),
      FOREIGN KEY (semesterId) REFERENCES semesters(id),
      FOREIGN KEY (sectionId) REFERENCES sections(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      academicYear TEXT NOT NULL,
      semester TEXT NOT NULL,
      enrolledAt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'dropped', 'completed')),
      FOREIGN KEY (studentId) REFERENCES students(studentId),
      FOREIGN KEY (subjectId) REFERENCES subjects(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentId TEXT UNIQUE NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      middleName TEXT,
      suffix TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      gender TEXT,
      dob TEXT,
      age INTEGER,
      civilStatus TEXT,
      nationality TEXT,
      religion TEXT,
      educationLevel TEXT NOT NULL,
      program TEXT,
      yearLevel TEXT,
      gradeLevel TEXT,
      strand TEXT,
      studentType TEXT,
      academicYear TEXT,
      semester TEXT,
      section TEXT,
      previousSchool TEXT,
      lastGrade TEXT,
      contactNumber TEXT,
      address TEXT,
      city TEXT,
      province TEXT,
      zip TEXT,
      fatherName TEXT,
      fatherOccupation TEXT,
      fatherContact TEXT,
      motherName TEXT,
      motherOccupation TEXT,
      motherContact TEXT,
      guardianName TEXT,
      guardianOccupation TEXT,
      guardianContact TEXT,
      guardianRelation TEXT,
      parentName TEXT,
      parentContact TEXT,
      parentAddress TEXT,
      emergencyName TEXT,
      emergencyContact TEXT,
      emergencyAddress TEXT,
      emergencyRelation TEXT,
      placeOfBirth TEXT,
      barangay TEXT,
      parentRelationship TEXT,
      status TEXT NOT NULL,
      submittedAt TEXT NOT NULL,
      reviewedAt TEXT,
      reviewNote TEXT,
      firstLoginAt TEXT,
      lastLoginAt TEXT
    )`,
  );
  await addColumnIfMissing(db, "students", "firstLoginAt", "TEXT");
  await addColumnIfMissing(db, "students", "lastLoginAt", "TEXT");
  await addColumnIfMissing(db, "students", "placeOfBirth", "TEXT");
  await addColumnIfMissing(db, "students", "barangay", "TEXT");
  await addColumnIfMissing(db, "students", "parentRelationship", "TEXT");

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      grade REAL NOT NULL,
      remarks TEXT,
      period TEXT CHECK(period IN ('prelim', 'midterm', 'final')),
      type TEXT CHECK(type IN ('activity', 'quiz', 'exam', 'overall')),
      component TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'finalized')),
      submittedAt INTEGER NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(studentId),
      FOREIGN KEY (subjectId) REFERENCES subjects(id)
    )`,
  );

await run(
     db,
     `CREATE TABLE IF NOT EXISTS attendance (
       id TEXT PRIMARY KEY,
       studentId TEXT NOT NULL,
       studentName TEXT,
       subjectId TEXT NOT NULL,
       subjectCode TEXT,
       subjectTitle TEXT,
       facultyId TEXT,
       date TEXT NOT NULL,
       time TEXT,
       academicYear TEXT,
       semester TEXT,
       program TEXT,
       yearLevel TEXT,
       section TEXT,
       status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
       updatedAt INTEGER NOT NULL,
       FOREIGN KEY (studentId) REFERENCES students(studentId),
       FOREIGN KEY (subjectId) REFERENCES subjects(id),
       UNIQUE(studentId, subjectId, date)
     )`,
  );
  await addColumnIfMissing(db, "attendance", "studentName", "TEXT");
  await addColumnIfMissing(db, "attendance", "subjectCode", "TEXT");
  await addColumnIfMissing(db, "attendance", "subjectTitle", "TEXT");
  await addColumnIfMissing(db, "attendance", "facultyId", "TEXT");
  await addColumnIfMissing(db, "attendance", "time", "TEXT");
  await addColumnIfMissing(db, "attendance", "academicYear", "TEXT");
  await addColumnIfMissing(db, "attendance", "semester", "TEXT");
  await addColumnIfMissing(db, "attendance", "program", "TEXT");
  await addColumnIfMissing(db, "attendance", "yearLevel", "TEXT");
  await addColumnIfMissing(db, "attendance", "section", "TEXT");

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      userId TEXT UNIQUE NOT NULL,
      employeeId TEXT UNIQUE,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      middleName TEXT,
      email TEXT UNIQUE NOT NULL,
      department TEXT,
      designation TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS academic_records (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      subjectId TEXT,
      academicYearId TEXT,
      semesterId TEXT,
      recordType TEXT NOT NULL DEFAULT 'summary' CHECK(recordType IN ('summary', 'transcript', 'certificate')),
      summary TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (studentId) REFERENCES students(studentId),
      FOREIGN KEY (subjectId) REFERENCES subjects(id),
      FOREIGN KEY (academicYearId) REFERENCES academic_years(id),
      FOREIGN KEY (semesterId) REFERENCES semesters(id)
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      relatedId TEXT
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT CHECK(category IN ('general', 'academic', 'event', 'urgent')),
      audience TEXT CHECK(audience IN ('all', 'student', 'faculty')),
      subjectId TEXT,
      pinned INTEGER DEFAULT 0,
      authorName TEXT,
      authorRole TEXT,
      createdAt INTEGER NOT NULL,
      datePosted TEXT
    )`,
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      actorId TEXT NOT NULL,
      actorName TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      role TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`,
  );

  const existingAcademicYears = await all(db, "SELECT * FROM academic_years LIMIT 1");
  if (existingAcademicYears.length === 0) {
    const academicYears = [
      { id: crypto.randomUUID(), code: "2025-2026", name: "Academic Year 2025-2026", startDate: "2025-06-01", endDate: "2026-03-31", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), code: "2026-2027", name: "Academic Year 2026-2027", startDate: "2026-06-01", endDate: "2027-03-31", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), code: "2027-2028", name: "Academic Year 2027-2028", startDate: "2027-06-01", endDate: "2028-03-31", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), code: "2028-2029", name: "Academic Year 2028-2029", startDate: "2028-06-01", endDate: "2029-03-31", createdAt: new Date().toISOString() },
    ];
    for (const item of academicYears) {
      await run(db, "INSERT INTO academic_years (id, code, name, startDate, endDate, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [item.id, item.code, item.name, item.startDate, item.endDate, "active", item.createdAt]);
    }

    const semesters = [
      { id: crypto.randomUUID(), code: "1st Semester", name: "First Semester", sequence: 1, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), code: "2nd Semester", name: "Second Semester", sequence: 2, createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), code: "Summer", name: "Summer Term", sequence: 3, createdAt: new Date().toISOString() },
    ];
    const academicYearRows = await all(db, "SELECT id FROM academic_years ORDER BY code");
    for (let index = 0; index < semesters.length; index += 1) {
      const semester = semesters[index];
      const academicYearId = academicYearRows[Math.min(index, academicYearRows.length - 1)]?.id;
      if (academicYearId) {
        await run(db, "INSERT INTO semesters (id, code, name, sequence, academicYearId, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)", [semester.id, semester.code, semester.name, semester.sequence, academicYearId, "active", semester.createdAt]);
      }
    }
  }

  const existingPrograms = await all(db, "SELECT * FROM programs LIMIT 1");
  if (existingPrograms.length === 0) {
    const programs = [
      { id: crypto.randomUUID(), name: "Diploma in Hospitality Services and Technology", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "Diploma in Tourism and Travel Services", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "Diploma in Multimedia Arts and Design", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "Diploma in Industrial Education (Major in Hotel and Restaurant Services)", createdAt: new Date().toISOString() },
      { id: crypto.randomUUID(), name: "Diploma in Industrial Education (Major in Multimedia Arts and Design)", createdAt: new Date().toISOString() },
    ];
    for (const p of programs) {
      await run(db, "INSERT INTO programs (id, name, description, status, createdAt) VALUES (?, ?, ?, ?, ?)", [p.id, p.name, "", "active", p.createdAt]);
    }

    const curriculumItems = [
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "COM 101", "Purposive Communication", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "MATH 101", "Mathematics in the Modern World", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "HOS 101", "Introduction to Hospitality Industry", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "HOS 102", "Fundamentals of Food Service Operations", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "HOS 103", "Basic Housekeeping Procedures", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "CS 101", "Computer Fundamentals", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "PE 101", "Physical Fitness 1", 2],
      ["Diploma in Hospitality Services and Technology", "1st Year", "1st Semester", "NSTP 101", "National Service Training Program 1", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "PSY 101", "Understanding the Self", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "HIST 101", "Readings in Philippine History", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "HOS 104", "Front Office Operations", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "HOS 105", "Food and Beverage Service", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "HOS 106", "Basic Culinary Arts", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "HOS 107", "Hospitality Computer Applications", 3],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "PE 102", "Physical Fitness 2", 2],
      ["Diploma in Hospitality Services and Technology", "1st Year", "2nd Semester", "NSTP 102", "National Service Training Program 2", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "HOS 201", "Kitchen Operations", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "HOS 202", "Housekeeping Management", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "HOS 203", "Food Safety and Sanitation", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "HOS 204", "Event Planning Fundamentals", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "HOS 205", "Customer Service Excellence", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "ACC 101", "Hospitality Accounting", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "1st Semester", "LANG 101", "Foreign Language for Hospitality I", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "HOS 206", "Restaurant Operations", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "HOS 207", "Hotel Operations Management", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "HOS 208", "Bartending and Beverage Management", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "HOS 209", "Tourism Geography", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "MKT 101", "Hospitality Marketing", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "LANG 102", "Foreign Language for Hospitality II", 3],
      ["Diploma in Hospitality Services and Technology", "2nd Year", "2nd Semester", "ENT 101", "Entrepreneurship", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "HOS 301", "Hospitality Human Resource Management", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "HOS 302", "Banquet and Catering Management", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "MKT 301", "Hospitality Sales and Marketing", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "HOS 303", "Property Management Systems", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "HOS 304", "Sustainable Hospitality", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "1st Semester", "RES 101", "Research Methods", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "FIN 101", "Hospitality Financial Management", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "HOS 305", "Resort Operations", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "HOS 306", "Hospitality Laws and Ethics", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "HOS 307", "Leadership and Supervision", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "HOS 308", "Events Management", 3],
      ["Diploma in Hospitality Services and Technology", "3rd Year", "2nd Semester", "FEAS 101", "Feasibility Study", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "1st Semester", "HOS 401", "Strategic Hospitality Management", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "1st Semester", "HOS 402", "Hospitality Innovation and Technology", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "1st Semester", "HOS 403", "Quality Assurance in Hospitality", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "1st Semester", "OJT 401", "Internship/OJT (300-600 Hours)", 6],
      ["Diploma in Hospitality Services and Technology", "4th Year", "2nd Semester", "CAP 401", "Capstone Project", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "2nd Semester", "OJT 402", "Internship II", 3],
      ["Diploma in Hospitality Services and Technology", "4th Year", "2nd Semester", "SEMINAR 401", "Seminar in Hospitality Trends", 2],
      ["Diploma in Hospitality Services and Technology", "4th Year", "2nd Semester", "CAREER 101", "Career Development", 2],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "COM 101", "Purposive Communication", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "MATH 101", "Mathematics in the Modern World", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "TOUR 101", "Introduction to Tourism", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "TOUR 102", "Tourism Geography", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "CS 101", "Computer Applications", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "PE 101", "Physical Fitness 1", 2],
      ["Diploma in Tourism and Travel Services", "1st Year", "1st Semester", "NSTP 101", "National Service Training Program 1", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "PSY 101", "Understanding the Self", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "HIST 101", "Philippine History", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "TOUR 103", "Tourism Principles", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "TOUR 104", "Customer Relations", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "TOUR 105", "Tour Guiding Fundamentals", 3],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "PE 102", "Physical Fitness 2", 2],
      ["Diploma in Tourism and Travel Services", "1st Year", "2nd Semester", "NSTP 102", "National Service Training Program 2", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "TOUR 201", "Airline Ticketing and Reservation Systems", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "TOUR 202", "Travel Agency Operations", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "TOUR 203", "Tour Packaging", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "TOUR 204", "Tourism Marketing", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "ECON 101", "Tourism Economics", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "1st Semester", "LANG 101", "Foreign Language I", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "TOUR 205", "Airport and Airline Operations", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "TOUR 206", "Sustainable Tourism", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "TOUR 207", "Tour Guiding Techniques", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "TOUR 208", "Event Tourism", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "ENT 101", "Entrepreneurship", 3],
      ["Diploma in Tourism and Travel Services", "2nd Year", "2nd Semester", "LANG 102", "Foreign Language II", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "1st Semester", "TOUR 301", "International Tourism", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "1st Semester", "TOUR 302", "Ecotourism Management", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "1st Semester", "TOUR 303", "Cruise Operations", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "1st Semester", "TOUR 304", "Hospitality and Tourism Laws", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "1st Semester", "RES 101", "Tourism Research", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "2nd Semester", "TOUR 305", "Destination Management", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "2nd Semester", "TOUR 306", "MICE (Meetings, Incentives, Conferences and Exhibitions)", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "2nd Semester", "TOUR 307", "Tourism Planning", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "2nd Semester", "STAT 101", "Tourism Statistics", 3],
      ["Diploma in Tourism and Travel Services", "3rd Year", "2nd Semester", "FEAS 101", "Feasibility Study", 3],
      ["Diploma in Tourism and Travel Services", "4th Year", "1st Semester", "TOUR 401", "Tourism Management Strategies", 3],
      ["Diploma in Tourism and Travel Services", "4th Year", "1st Semester", "QM 101", "Quality Management", 3],
      ["Diploma in Tourism and Travel Services", "4th Year", "1st Semester", "OJT 401", "Internship/OJT", 6],
      ["Diploma in Tourism and Travel Services", "4th Year", "2nd Semester", "CAP 401", "Capstone Project", 3],
      ["Diploma in Tourism and Travel Services", "4th Year", "2nd Semester", "OJT 402", "Internship II", 3],
      ["Diploma in Tourism and Travel Services", "4th Year", "2nd Semester", "SEMINAR 401", "Tourism Seminar", 2],
      ["Diploma in Tourism and Travel Services", "4th Year", "2nd Semester", "CAREER 101", "Career Preparation", 2],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "COM 101", "Purposive Communication", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "MDA 101", "Introduction to Multimedia Arts", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "DRAW 101", "Drawing Fundamentals", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "DES 101", "Design Principles", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "CS 101", "Computer Fundamentals", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "MDA 102", "Digital Imaging", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "PE 101", "Physical Fitness 1", 2],
      ["Diploma in Multimedia Arts and Design", "1st Year", "1st Semester", "NSTP 101", "National Service Training Program 1", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "PSY 101", "Understanding the Self", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "ART 101", "Art Appreciation", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "DES 102", "Typography", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "DES 103", "Graphic Design", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "DES 104", "Color Theory", 3],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "PE 102", "Physical Fitness 2", 2],
      ["Diploma in Multimedia Arts and Design", "1st Year", "2nd Semester", "NSTP 102", "National Service Training Program 2", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "MDA 201", "Adobe Photoshop", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "MDA 202", "Adobe Illustrator", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "MDA 203", "Photography", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "DES 201", "Branding and Identity Design", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "MDA 204", "Digital Illustration", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "1st Semester", "WEB 101", "Web Design Fundamentals", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "MDA 205", "Adobe InDesign", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "MDA 206", "Motion Graphics", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "MDA 207", "Video Editing", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "DES 202", "UI/UX Design", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "MDA 208", "Audio Production", 3],
      ["Diploma in Multimedia Arts and Design", "2nd Year", "2nd Semester", "ENT 101", "Entrepreneurship", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "MDA 301", "Animation Principles", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "MDA 302", "2D Animation", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "MDA 303", "3D Modeling", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "MDA 304", "Visual Effects", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "MDA 305", "Storyboarding", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "1st Semester", "RES 101", "Multimedia Research", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "2nd Semester", "MDA 306", "3D Animation", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "2nd Semester", "MDA 307", "Game Art Fundamentals", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "2nd Semester", "WEB 201", "Web Development", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "2nd Semester", "PORT 101", "Portfolio Development", 3],
      ["Diploma in Multimedia Arts and Design", "3rd Year", "2nd Semester", "CAP 301", "Capstone Proposal", 3],
      ["Diploma in Multimedia Arts and Design", "4th Year", "1st Semester", "MDA 401", "Advanced Multimedia Production", 3],
      ["Diploma in Multimedia Arts and Design", "4th Year", "1st Semester", "MDA 402", "Creative Project Management", 3],
      ["Diploma in Multimedia Arts and Design", "4th Year", "1st Semester", "OJT 401", "Internship/OJT", 6],
      ["Diploma in Multimedia Arts and Design", "4th Year", "2nd Semester", "CAP 401", "Capstone Project", 3],
      ["Diploma in Multimedia Arts and Design", "4th Year", "2nd Semester", "OJT 402", "Internship II", 3],
      ["Diploma in Multimedia Arts and Design", "4th Year", "2nd Semester", "MDA 403", "Portfolio Exhibition", 2],
      ["Diploma in Multimedia Arts and Design", "4th Year", "2nd Semester", "CAREER 101", "Career Development", 2],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "COM 101", "Purposive Communication", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "MATH 101", "Mathematics in the Modern World", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "IND 101", "Introduction to Industrial Education", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "HOS 106", "Basic Cookery", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "CS 101", "Computer Fundamentals", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "PE 101", "Physical Fitness 1", 2],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "1st Semester", "NSTP 101", "National Service Training Program 1", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "PSY 101", "Understanding the Self", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "HIST 101", "Philippine History", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "HOS 107", "Food Preparation", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "HOS 103", "Housekeeping", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "HOS 108", "Basic Baking", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "PE 102", "Physical Fitness 2", 2],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "1st Year", "2nd Semester", "NSTP 102", "National Service Training Program 2", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "HOS 209", "Commercial Cooking", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "HOS 210", "Restaurant Service", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "HOS 203", "Food Safety and HACCP", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "NUTR 101", "Nutrition", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "MATH 201", "Hospitality Mathematics", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "1st Semester", "ENT 101", "Entrepreneurship", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "HOS 211", "Front Office Operations", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "HOS 212", "Beverage Management", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "HOS 103", "Hotel Housekeeping", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "HOS 213", "Catering Services", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "MKT 101", "Hospitality Marketing", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "2nd Year", "2nd Semester", "EDU 101", "Educational Technology", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "1st Semester", "HOS 214", "Hotel Operations", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "1st Semester", "HOS 215", "Restaurant Management", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "1st Semester", "EDU 201", "Teaching Strategies in Technical Education", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "1st Semester", "EDU 202", "Assessment of Learning", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "1st Semester", "RES 101", "Hospitality Research", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "2nd Semester", "EDU 203", "Instructional Materials Development", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "2nd Semester", "HOS 216", "Hospitality Supervision", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "2nd Semester", "HRM 101", "Human Resource Management", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "2nd Semester", "FEAS 101", "Feasibility Study", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "3rd Year", "2nd Semester", "EDU 204", "Practice Teaching I", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "1st Semester", "EDU 205", "Practice Teaching II", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "1st Semester", "OJT 401", "Internship/OJT", 6],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "1st Semester", "HOS 217", "Hospitality Leadership", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "1st Semester", "IND 201", "School and Industry Partnership", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "2nd Semester", "CAP 401", "Capstone Project", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "2nd Semester", "IND 202", "Industry Immersion", 3],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "2nd Semester", "SEMINAR 201", "Seminar in Hospitality Education", 2],
      ["Diploma in Industrial Education (Major in Hotel and Restaurant Services)", "4th Year", "2nd Semester", "CAREER 101", "Career Development", 2],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "COM 101", "Purposive Communication", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "IND 101", "Introduction to Industrial Education", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "DRAW 101", "Basic Drawing", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "CS 101", "Computer Fundamentals", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "DES 101", "Design Principles", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "PE 101", "Physical Fitness 1", 2],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "1st Semester", "NSTP 101", "National Service Training Program 1", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "PSY 101", "Understanding the Self", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "ART 101", "Art Appreciation", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "DES 103", "Graphic Design Fundamentals", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "MDA 104", "Digital Illustration", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "PE 102", "Physical Fitness 2", 2],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "1st Year", "2nd Semester", "NSTP 102", "National Service Training Program 2", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "1st Semester", "MDA 201", "Adobe Photoshop", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "1st Semester", "MDA 202", "Adobe Illustrator", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "1st Semester", "MDA 105", "Photography", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "1st Semester", "DES 102", "Typography", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "1st Semester", "EDU 101", "Educational Technology", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "2nd Semester", "MDA 206", "Motion Graphics", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "2nd Semester", "MDA 207", "Video Production", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "2nd Semester", "DES 202", "UI/UX Design", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "2nd Semester", "MDA 106", "Animation Fundamentals", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "2nd Year", "2nd Semester", "ENT 101", "Entrepreneurship", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "1st Semester", "MDA 303", "3D Modeling", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "1st Semester", "MDA 304", "Visual Communication", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "1st Semester", "MDA 305", "Multimedia Production", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "1st Semester", "EDU 201", "Teaching Strategies", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "1st Semester", "RES 101", "Multimedia Research", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "2nd Semester", "EDU 202", "Instructional Design", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "2nd Semester", "WEB 201", "Web Development", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "2nd Semester", "PORT 101", "Portfolio Development", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "2nd Semester", "EDU 203", "Practice Teaching I", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "3rd Year", "2nd Semester", "FEAS 101", "Feasibility Study", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "1st Semester", "EDU 204", "Practice Teaching II", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "1st Semester", "OJT 401", "Internship/OJT", 6],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "1st Semester", "MDA 205", "Multimedia Project Management", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "1st Semester", "IND 203", "Industry Collaboration", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "2nd Semester", "CAP 401", "Capstone Project", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "2nd Semester", "MDA 401", "Multimedia Portfolio Defense", 3],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "2nd Semester", "SEMINAR 301", "Seminar in Digital Media", 2],
      ["Diploma in Industrial Education (Major in Multimedia Arts and Design)", "4th Year", "2nd Semester", "CAREER 101", "Career Development", 2],
    ];
    const programMap = Object.fromEntries(programs.map(p => [p.name, p.id]));
    for (const item of curriculumItems) {
      const [progName, yearLevel, semester, subjectCode, subjectTitle, units] = item;
      const id = crypto.randomUUID();
      const programId = programMap[progName];
      if (!programId) continue;
      await run(db, "INSERT INTO curriculum (id, programId, yearLevel, semester, subjectCode, subjectTitle, units) VALUES (?, ?, ?, ?, ?, ?, ?)", [id, programId, yearLevel, semester, subjectCode, subjectTitle, units]);
    }
  }

  const supportedAcademicYears = ["2025-2026", "2026-2027", "2027-2028", "2028-2029"];
  const curriculumRows = await all(
    db,
    `SELECT c.yearLevel, c.semester, c.subjectCode, c.subjectTitle, c.units, p.name AS programName
     FROM curriculum c
     JOIN programs p ON p.id = c.programId`,
  );

  const existingSubjects = await all(db, "SELECT id, code, program, yearLevel, semester, academicYear FROM subjects");
  const makeOfferingKey = (row, academicYear) => `${row.programName || row.program || ""}|${row.yearLevel}|${row.semester}|${row.subjectCode}|${academicYear}`;

  for (const academicYear of supportedAcademicYears) {
    for (const row of curriculumRows) {
      const key = makeOfferingKey(row, academicYear);
      const existingMatch = existingSubjects.find((subject) => {
        if (subject.academicYear && subject.academicYear !== academicYear) return false;
        return subject.code === row.subjectCode && subject.program === row.programName && subject.yearLevel === row.yearLevel && subject.semester === row.semester;
      });

      if (existingMatch && academicYear === "2025-2026" && existingMatch.academicYear == null) {
        await run(
          db,
          "UPDATE subjects SET academicYear = ? WHERE id = ?",
          [academicYear, existingMatch.id],
        );
        continue;
      }

      const matchingAcademicYearRow = existingSubjects.find((subject) =>
        subject.code === row.subjectCode
        && subject.program === row.programName
        && subject.yearLevel === row.yearLevel
        && subject.semester === row.semester
        && subject.academicYear === academicYear
      );

      if (matchingAcademicYearRow) continue;

      await run(
        db,
        `INSERT INTO subjects (id, code, title, units, schedule, room, instructor, program, yearLevel, semester, facultyId, academicYear, addedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          row.subjectCode,
          row.subjectTitle,
          row.units,
          "TBA",
          "TBA",
          "Unassigned",
          row.programName,
          row.yearLevel,
          row.semester,
          null,
          academicYear,
          Date.now(),
        ],
      );
    }
  }

  // Seed default users for local demo and development
  const existingAdmin = await all(db, "SELECT * FROM users WHERE role = 'admin' LIMIT 1");
  if (existingAdmin.length === 0) {
    const adminUser = {
      id: crypto.randomUUID(),
      userId: "ADM-00001",
      username: "admin",
      email: "admin@bwest.edu.ph",
      password: "admin123",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await run(
      db,
      `INSERT INTO users (id, userId, username, email, password, firstName, lastName, studentId, role, status, program, yearLevel, createdAt, temporaryPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [adminUser.id, adminUser.userId, adminUser.username, adminUser.email, adminUser.password, adminUser.firstName, adminUser.lastName, null, adminUser.role, adminUser.status, null, null, adminUser.createdAt, adminUser.password],
    );
  }

  const existingRegistrar = await all(db, "SELECT * FROM users WHERE role = 'registrar' LIMIT 1");
  if (existingRegistrar.length === 0) {
    const registrarUser = {
      id: crypto.randomUUID(),
      userId: "REG-00001",
      username: "registrar",
      email: "registrar@example.com",
      password: "password",
      firstName: "Maria",
      lastName: "Santos",
      role: "registrar",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await run(
      db,
      `INSERT INTO users (id, userId, username, email, password, firstName, lastName, studentId, role, status, program, yearLevel, createdAt, temporaryPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [registrarUser.id, registrarUser.userId, registrarUser.username, registrarUser.email, registrarUser.password, registrarUser.firstName, registrarUser.lastName, null, registrarUser.role, registrarUser.status, null, null, registrarUser.createdAt, registrarUser.password],
    );
  }

  const existingFaculty = await all(db, "SELECT * FROM users WHERE role = 'faculty' LIMIT 1");
  if (existingFaculty.length === 0) {
    const facultyUser = {
      id: crypto.randomUUID(),
      userId: "FAC-00001",
      username: "faculty",
      email: "faculty@example.com",
      password: "password",
      firstName: "Ramon",
      lastName: "Cruz",
      role: "faculty",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await run(
      db,
      `INSERT INTO users (id, userId, username, email, password, firstName, lastName, studentId, role, status, program, yearLevel, createdAt, temporaryPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [facultyUser.id, facultyUser.userId, facultyUser.username, facultyUser.email, facultyUser.password, facultyUser.firstName, facultyUser.lastName, null, facultyUser.role, facultyUser.status, "BSIT", "1st Year", facultyUser.createdAt, facultyUser.password],
    );
  }

  const existingStudent = await all(db, "SELECT * FROM users WHERE role = 'student' LIMIT 1");
  if (existingStudent.length === 0) {
    const studentUser = {
      id: crypto.randomUUID(),
      userId: "STU-00001",
      username: "student",
      email: "student@example.com",
      password: "password",
      firstName: "Anna",
      lastName: "Dela Cruz",
      role: "student",
      status: "active",
      createdAt: new Date().toISOString(),
    };
    await run(
      db,
      `INSERT INTO users (id, userId, username, email, password, firstName, lastName, studentId, role, status, program, yearLevel, createdAt, temporaryPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [studentUser.id, studentUser.userId, studentUser.username, studentUser.email, studentUser.password, studentUser.firstName, studentUser.lastName, null, studentUser.role, studentUser.status, "BSIT", "1st Year", studentUser.createdAt, studentUser.password],
    );
  }
}