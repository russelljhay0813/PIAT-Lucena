# 6. Logical Database Schema

## Overview

This logical schema reflects the SQLite database structure used by the PIAT School Management System backend and matches the ERD and data dictionary.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE programs (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  createdAt TEXT NOT NULL
);

CREATE TABLE curriculum (
  id TEXT PRIMARY KEY,
  programId TEXT NOT NULL,
  yearLevel TEXT NOT NULL,
  semester TEXT NOT NULL,
  subjectCode TEXT NOT NULL,
  subjectTitle TEXT NOT NULL,
  units INTEGER NOT NULL,
  FOREIGN KEY (programId) REFERENCES programs(id)
);

CREATE TABLE users (
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
);

CREATE TABLE subjects (
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
);

CREATE TABLE students (
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
);

CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  subjectId TEXT NOT NULL,
  academicYear TEXT NOT NULL,
  semester TEXT NOT NULL,
  enrolledAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'dropped', 'completed')),
  FOREIGN KEY (studentId) REFERENCES students(studentId),
  FOREIGN KEY (subjectId) REFERENCES subjects(id)
);

CREATE TABLE grades (
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
);

CREATE TABLE attendance (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  subjectId TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
  updatedAt INTEGER NOT NULL,
  FOREIGN KEY (studentId) REFERENCES students(studentId),
  FOREIGN KEY (subjectId) REFERENCES subjects(id),
  UNIQUE(studentId, subjectId, date)
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  relatedId TEXT
);

CREATE TABLE announcements (
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
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  actorId TEXT NOT NULL,
  actorName TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  role TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
```

## Relationship Summary

- programs 1:N curriculum
- programs 1:N subjects (conceptually, via program text field)
- students 1:N enrollments
- subjects 1:N enrollments
- students 1:N grades
- subjects 1:N grades
- students 1:N attendance
- subjects 1:N attendance
- users 1:N notifications
