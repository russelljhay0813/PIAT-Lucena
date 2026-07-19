# 5. Database Dictionary

## Table: programs
- Description: Stores academic programs offered by PIAT.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique identifier for the program.
  - name: TEXT, Not Null, Description: Program name.
  - description: TEXT, Nullable, Description: Program description or additional detail.
  - status: TEXT, Not Null, Default: active, Description: Program active status.
  - createdAt: TEXT, Not Null, Description: Record creation timestamp.

## Table: curriculum
- Description: Stores the curriculum items associated with each academic program.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique curriculum item identifier.
  - programId: TEXT, FK -> programs.id, Not Null, Description: Parent program reference.
  - yearLevel: TEXT, Not Null, Description: Year-level classification.
  - semester: TEXT, Not Null, Description: Semester classification.
  - subjectCode: TEXT, Not Null, Description: Subject code.
  - subjectTitle: TEXT, Not Null, Description: Subject title.
  - units: INTEGER, Not Null, Description: Subject units.

## Table: users
- Description: Stores authentication and profile information for staff and student accounts.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique user record identifier.
  - userId: TEXT, UK, Not Null, Description: External or internal user ID value.
  - username: TEXT, UK, Not Null, Description: Username used for login.
  - email: TEXT, Not Null, Description: User email address.
  - password: TEXT, Not Null, Description: Hashed password.
  - firstName: TEXT, Not Null, Description: First name.
  - lastName: TEXT, Not Null, Description: Last name.
  - middleName: TEXT, Nullable, Description: Middle name.
  - studentId: TEXT, Nullable, Description: Optional link to a student record.
  - role: TEXT, Not Null, Description: System role (admin, faculty, registrar, student).
  - status: TEXT, Not Null, Default: active, Description: Account status.
  - program: TEXT, Nullable, Description: Program associated with the user.
  - yearLevel: TEXT, Nullable, Description: User year level.
  - semester: TEXT, Nullable, Description: User semester.
  - academicYear: TEXT, Nullable, Description: Academic year associated with the user.
  - createdAt: TEXT, Not Null, Description: Account creation timestamp.
  - temporaryPassword: TEXT, Nullable, Description: Temporary password for first login.
  - firstLoginAt: TEXT, Nullable, Description: First login timestamp.
  - lastLoginAt: TEXT, Nullable, Description: Last login timestamp.

## Table: subjects
- Description: Stores subject offerings and scheduled class information.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique subject identifier.
  - code: TEXT, Not Null, Description: Subject code.
  - title: TEXT, Not Null, Description: Subject title.
  - units: INTEGER, Not Null, Description: Subject units.
  - schedule: TEXT, Not Null, Description: Schedule details.
  - room: TEXT, Not Null, Description: Room assigned to the subject.
  - instructor: TEXT, Not Null, Description: Instructor or faculty name.
  - program: TEXT, Nullable, Description: Program associated with the subject.
  - yearLevel: TEXT, Nullable, Description: Year level for the subject.
  - semester: TEXT, Nullable, Description: Semester for the subject.
  - facultyId: TEXT, Nullable, Description: Faculty user identifier associated with the subject.
  - academicYear: TEXT, Nullable, Description: Academic year for the offering.
  - addedAt: INTEGER, Not Null, Description: Timestamp when the subject was added.

## Table: students
- Description: Stores detailed student admission and academic profile information.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique student record identifier.
  - studentId: TEXT, UK, Not Null, Description: Student number or identifier.
  - firstName: TEXT, Not Null, Description: Student first name.
  - lastName: TEXT, Not Null, Description: Student last name.
  - middleName: TEXT, Nullable, Description: Student middle name.
  - suffix: TEXT, Nullable, Description: Name suffix.
  - email: TEXT, UK, Not Null, Description: Student email address.
  - password: TEXT, Not Null, Description: Student login password hash.
  - gender: TEXT, Nullable, Description: Gender.
  - dob: TEXT, Nullable, Description: Date of birth.
  - age: INTEGER, Nullable, Description: Student age.
  - civilStatus: TEXT, Nullable, Description: Civil status.
  - nationality: TEXT, Nullable, Description: Nationality.
  - religion: TEXT, Nullable, Description: Religion.
  - educationLevel: TEXT, Not Null, Description: Education level.
  - program: TEXT, Nullable, Description: Student program.
  - yearLevel: TEXT, Nullable, Description: Student year level.
  - gradeLevel: TEXT, Nullable, Description: Grade level used by the school workflow.
  - strand: TEXT, Nullable, Description: Senior high school strand.
  - studentType: TEXT, Nullable, Description: Student type or category.
  - academicYear: TEXT, Nullable, Description: Academic year of registration.
  - semester: TEXT, Nullable, Description: Semester of registration.
  - section: TEXT, Nullable, Description: Section assignment.
  - previousSchool: TEXT, Nullable, Description: Previous school.
  - lastGrade: TEXT, Nullable, Description: Last completed grade.
  - contactNumber: TEXT, Nullable, Description: Contact number.
  - address: TEXT, Nullable, Description: Residential address.
  - city: TEXT, Nullable, Description: City.
  - province: TEXT, Nullable, Description: Province.
  - zip: TEXT, Nullable, Description: ZIP or postal code.
  - fatherName: TEXT, Nullable, Description: Father’s name.
  - fatherOccupation: TEXT, Nullable, Description: Father’s occupation.
  - fatherContact: TEXT, Nullable, Description: Father’s contact number.
  - motherName: TEXT, Nullable, Description: Mother’s name.
  - motherOccupation: TEXT, Nullable, Description: Mother’s occupation.
  - motherContact: TEXT, Nullable, Description: Mother’s contact number.
  - guardianName: TEXT, Nullable, Description: Guardian’s name.
  - guardianOccupation: TEXT, Nullable, Description: Guardian’s occupation.
  - guardianContact: TEXT, Nullable, Description: Guardian’s contact number.
  - guardianRelation: TEXT, Nullable, Description: Guardian relationship.
  - parentName: TEXT, Nullable, Description: Parent name.
  - parentContact: TEXT, Nullable, Description: Parent contact number.
  - parentAddress: TEXT, Nullable, Description: Parent address.
  - emergencyName: TEXT, Nullable, Description: Emergency contact name.
  - emergencyContact: TEXT, Nullable, Description: Emergency contact number.
  - emergencyAddress: TEXT, Nullable, Description: Emergency address.
  - emergencyRelation: TEXT, Nullable, Description: Emergency contact relationship.
  - placeOfBirth: TEXT, Nullable, Description: Place of birth.
  - barangay: TEXT, Nullable, Description: Barangay.
  - parentRelationship: TEXT, Nullable, Description: Relationship to the student.
  - status: TEXT, Not Null, Description: Registration or student status.
  - submittedAt: TEXT, Not Null, Description: Registration submission timestamp.
  - reviewedAt: TEXT, Nullable, Description: Review completion timestamp.
  - reviewNote: TEXT, Nullable, Description: Review note by registrar or admin.
  - firstLoginAt: TEXT, Nullable, Description: First login timestamp.
  - lastLoginAt: TEXT, Nullable, Description: Last login timestamp.

## Table: enrollments
- Description: Stores student subject enrollments for a given academic year and semester.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique enrollment identifier.
  - studentId: TEXT, FK -> students.studentId, Not Null, Description: Student reference.
  - subjectId: TEXT, FK -> subjects.id, Not Null, Description: Subject reference.
  - academicYear: TEXT, Not Null, Description: Enrollment academic year.
  - semester: TEXT, Not Null, Description: Enrollment semester.
  - enrolledAt: TEXT, Not Null, Description: Enrollment timestamp.
  - status: TEXT, Not Null, Default: enrolled, Description: Enrollment state.

## Table: grades
- Description: Stores student academic performance grades for subjects.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique grade record identifier.
  - studentId: TEXT, FK -> students.studentId, Not Null, Description: Student reference.
  - subjectId: TEXT, FK -> subjects.id, Not Null, Description: Subject reference.
  - grade: REAL, Not Null, Description: Numeric grade score.
  - remarks: TEXT, Nullable, Description: Grade remarks.
  - period: TEXT, Nullable, Description: Grade period such as prelim, midterm, or final.
  - type: TEXT, Nullable, Description: Grade component type.
  - component: TEXT, Nullable, Description: Component name such as quiz or exam.
  - status: TEXT, Nullable, Default: draft, Description: Grade status.
  - submittedAt: INTEGER, Not Null, Description: Timestamp when grade was submitted.

## Table: attendance
- Description: Stores daily attendance records for students in subjects.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique attendance identifier.
  - studentId: TEXT, FK -> students.studentId, Not Null, Description: Student reference.
  - subjectId: TEXT, FK -> subjects.id, Not Null, Description: Subject reference.
  - date: TEXT, Not Null, Description: Attendance date.
  - status: TEXT, Not Null, Description: Attendance status such as present or absent.
  - updatedAt: INTEGER, Not Null, Description: Timestamp of the last attendance update.

## Table: notifications
- Description: Stores notifications to users for events such as registrations, grades, and account updates.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique notification identifier.
  - userId: TEXT, Not Null, Description: Target user for the notification.
  - type: TEXT, Not Null, Description: Notification category.
  - title: TEXT, Not Null, Description: Notification title.
  - message: TEXT, Not Null, Description: Notification details.
  - read: INTEGER, Not Null, Default: 0, Description: Read/unread status.
  - createdAt: INTEGER, Not Null, Description: Notification creation timestamp.
  - relatedId: TEXT, Nullable, Description: Related record identifier.

## Table: announcements
- Description: Stores public announcements for users.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique announcement identifier.
  - title: TEXT, Not Null, Description: Announcement title.
  - body: TEXT, Not Null, Description: Announcement body.
  - category: TEXT, Nullable, Description: Announcement category.
  - audience: TEXT, Nullable, Description: Intended audience.
  - subjectId: TEXT, Nullable, Description: Related subject identifier.
  - pinned: INTEGER, Default: 0, Description: Pinned status.
  - authorName: TEXT, Nullable, Description: Author name.
  - authorRole: TEXT, Nullable, Description: Author role.
  - createdAt: INTEGER, Not Null, Description: Announcement creation timestamp.
  - datePosted: TEXT, Nullable, Description: Posting date.

## Table: activity_logs
- Description: Stores administrative activity trails.
- Columns:
  - id: TEXT, PK, Not Null, Description: Unique log identifier.
  - actorId: TEXT, Not Null, Description: Actor identifier.
  - actorName: TEXT, Not Null, Description: Actor display name.
  - action: TEXT, Not Null, Description: Action performed.
  - details: TEXT, Not Null, Description: Action details.
  - role: TEXT, Not Null, Description: Actor role.
  - createdAt: TEXT, Not Null, Description: Log timestamp.
