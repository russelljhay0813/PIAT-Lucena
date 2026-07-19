# 4. Database Structure

## Overview

The PIAT School Management System uses a SQLite relational database managed by the backend service. The database contains tables for user accounts, student profiles, academic programs, subject offerings, student enrollments, grades, attendance, notifications, and supporting metadata.

## Core Tables

- programs
- curriculum
- users
- subjects
- enrollments
- students
- grades
- attendance
- notifications
- announcements
- activity_logs

## Logical Table Summary

```text
programs
  - id (PK)
  - name
  - description
  - status
  - createdAt

curriculum
  - id (PK)
  - programId (FK -> programs.id)
  - yearLevel
  - semester
  - subjectCode
  - subjectTitle
  - units

users
  - id (PK)
  - userId (UK)
  - username (UK)
  - email
  - password
  - firstName
  - lastName
  - middleName
  - studentId (FK conceptually linked to students.studentId)
  - role
  - status
  - program
  - yearLevel
  - semester
  - academicYear
  - createdAt
  - temporaryPassword
  - firstLoginAt
  - lastLoginAt

subjects
  - id (PK)
  - code
  - title
  - units
  - schedule
  - room
  - instructor
  - program
  - yearLevel
  - semester
  - facultyId
  - academicYear
  - addedAt

enrollments
  - id (PK)
  - studentId (FK -> students.studentId)
  - subjectId (FK -> subjects.id)
  - academicYear
  - semester
  - enrolledAt
  - status

students
  - id (PK)
  - studentId (UK)
  - firstName
  - lastName
  - middleName
  - suffix
  - email (UK)
  - password
  - gender
  - dob
  - age
  - civilStatus
  - nationality
  - religion
  - educationLevel
  - program
  - yearLevel
  - gradeLevel
  - strand
  - studentType
  - academicYear
  - semester
  - section
  - previousSchool
  - lastGrade
  - contactNumber
  - address
  - city
  - province
  - zip
  - fatherName
  - fatherOccupation
  - fatherContact
  - motherName
  - motherOccupation
  - motherContact
  - guardianName
  - guardianOccupation
  - guardianContact
  - guardianRelation
  - parentName
  - parentContact
  - parentAddress
  - emergencyName
  - emergencyContact
  - emergencyAddress
  - emergencyRelation
  - placeOfBirth
  - barangay
  - parentRelationship
  - status
  - submittedAt
  - reviewedAt
  - reviewNote
  - firstLoginAt
  - lastLoginAt

grades
  - id (PK)
  - studentId (FK -> students.studentId)
  - subjectId (FK -> subjects.id)
  - grade
  - remarks
  - period
  - type
  - component
  - status
  - submittedAt

attendance
  - id (PK)
  - studentId (FK -> students.studentId)
  - subjectId (FK -> subjects.id)
  - date
  - status
  - updatedAt

notifications
  - id (PK)
  - userId
  - type
  - title
  - message
  - read
  - createdAt
  - relatedId

announcements
  - id (PK)
  - title
  - body
  - category
  - audience
  - subjectId
  - pinned
  - authorName
  - authorRole
  - createdAt
  - datePosted

activity_logs
  - id (PK)
  - actorId
  - actorName
  - action
  - details
  - role
  - createdAt
```

## Design Notes

- The schema supports role-based access for administrators, registrars, faculty, and students.
- The database is normalized enough for the current scope and uses foreign keys where appropriate.
- Text columns are used for many identifiers because the system uses UUID-style string keys and SQLite-friendly field storage.
