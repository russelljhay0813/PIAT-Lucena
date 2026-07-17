# BWEST College Backend

This backend provides the REST API and data persistence layer for the PIAT Academic Management System.

## Requirements
- Node.js 18+ or compatible runtime
- npm

## Setup

```bash
cd backend
npm install
npm start
```

The backend server starts on `http://localhost:4000`.

## Database
- SQLite database file: `backend/bwest.db`
- The database schema is initialized automatically when the server starts.
- To reset the database, stop the server and delete `backend/bwest.db`.

## Seeding generated students

The backend includes a seeding script that generates student records and matching student user accounts.

```bash
cd backend
node seed-students.mjs
```

This script inserts 900 student records into the `students` table and creates corresponding `student` rows in the `users` table.

## API Endpoints

### Student endpoints
- `GET /api/students` — list students (requires `admin` or `registrar` role)
- `GET /api/students/:studentId` — get student details (self or staff)
- `POST /api/students` — create student (requires `admin` or `registrar`)
- `PUT /api/students/:studentId` — update student (self or staff)
- `POST /api/students/login` — student login

### User endpoints
- `GET /api/users` — list users (requires `admin` or `registrar`)
- `POST /api/users` — create user (requires `admin`)
- `POST /api/users/login` — staff login
- `GET /api/users/profile` — get authenticated user profile

### Grades and attendance
- `GET /api/grades?subjectId=&studentId=` — list grades
- `POST /api/grades` — add or update grade
- `DELETE /api/grades?studentId=&subjectId=` — delete grade
- `GET /api/attendance` — query attendance
- `POST /api/attendance` — add attendance record

## Authentication
- The backend supports JWT-based auth for protected routes.
- After login, the frontend should send `Authorization: Bearer <token>` on protected requests.
- Role headers `x-user-role`, `x-user-id`, and `x-user-student-id` are also supported for local development.

## Notes
- If your web or mobile client cannot access `/api`, ensure the backend is running and the API base URL is correct.
- Use the seed script after a fresh database reset to populate generated student data.
