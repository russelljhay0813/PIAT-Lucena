# 4. Database Structure

## Overview

The PIAT School Management System uses a SQLite relational database managed by the backend service. The database contains tables for user accounts, student profiles, academic programs, subject offerings, student enrollments, grades, attendance, notifications, and supporting metadata.

## Core Tables

- programs
- academic_years
- semesters
- sections
- curriculum
- users
- subjects
- subject_offerings
- enrollments
- students
- grades
- attendance
- faculty
- academic_records
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

academic_years
  - id (PK)
  - code
  - name
  - startDate
  - endDate
  - status
  - createdAt

semesters
  - id (PK)
  - code
  - name
  - sequence
  - academicYearId (FK -> academic_years.id)
  - status
  - createdAt

sections
  - id (PK)
  - code
  - name
  - programId (FK -> programs.id)
  - yearLevel
  - semesterId (FK -> semesters.id)
  - academicYearId (FK -> academic_years.id)
  - capacity
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

subject_offerings
  - id (PK)
  - subjectId (FK -> subjects.id)
  - academicYearId (FK -> academic_years.id)
  - semesterId (FK -> semesters.id)
  - sectionId (FK -> sections.id)
  - facultyId
  - schedule
  - room
  - capacity
  - status
  - createdAt

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

faculty
  - id (PK)
  - userId (FK -> users.id)
  - employeeId
  - firstName
  - lastName
  - middleName
  - email
  - department
  - designation
  - status
  - createdAt

academic_records
  - id (PK)
  - studentId (FK -> students.studentId)
  - subjectId (FK -> subjects.id)
  - academicYearId (FK -> academic_years.id)
  - semesterId (FK -> semesters.id)
  - recordType
  - summary
  - createdAt

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
- The current implementation uses dedicated tables for academic years, semesters, sections, subject offerings, faculty, and academic records to support the registrar and faculty workflows more explicitly.
- Student enrollments remain linked to subjects, while subject offerings provide a more structured view of scheduled classes and sections.
