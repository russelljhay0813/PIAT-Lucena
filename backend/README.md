# BWEST College Backend

This backend provides a simple REST API for subjects, student registrations, and grades.

## Setup

```bash
cd backend
npm install
npm start
```

The server starts on `http://localhost:4000`.

## API Endpoints

- `GET /api/subjects`
- `POST /api/subjects`
- `PUT /api/subjects/:id`
- `DELETE /api/subjects/:id`
- `GET /api/students`
- `GET /api/students/:studentId`
- `POST /api/students`
- `PUT /api/students/:studentId`
- `POST /api/students/login`
- `GET /api/grades?subjectId=&studentId=`
- `POST /api/grades`
- `DELETE /api/grades?studentId=&subjectId=`

## Notes

- The backend uses SQLite (`backend/bwest.db`).
- The frontend Vite config is already set to proxy `/api` to `http://localhost:4000`.
- Current frontend logic still uses localStorage mocks; this backend can be integrated by updating the store modules and API calls.
