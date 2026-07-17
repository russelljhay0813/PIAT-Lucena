import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'bwest.db');
const db = new sqlite3.Database(dbPath);
const email = 'aabad346@piat.edu.ph';

function print(name, row) {
  console.log(`${name}:`, row ? JSON.stringify(row) : null);
}

db.get('SELECT id,userId,username,email,role,studentId,program,yearLevel,semester,academicYear FROM users WHERE LOWER(email)=LOWER(?)', [email], (err, user) => {
  if (err) { console.error('USER ERR', err); process.exit(1); }
  print('USER', user);
  db.get('SELECT studentId,firstName,lastName,email,program,yearLevel,semester,academicYear,status FROM students WHERE LOWER(email)=LOWER(?)', [email], (err2, studentByEmail) => {
    if (err2) { console.error('STUDENT_BY_EMAIL ERR', err2); process.exit(1); }
    print('STUDENT_BY_EMAIL', studentByEmail);
    if (user?.studentId) {
      db.get('SELECT studentId,firstName,lastName,email,program,yearLevel,semester,academicYear,status FROM students WHERE studentId=?', [user.studentId], (err3, studentByStudentId) => {
        if (err3) { console.error('STUDENT_BY_USER_STUDENTID ERR', err3); process.exit(1); }
        print('STUDENT_BY_USER_STUDENTID', studentByStudentId);
        db.close();
      });
    } else {
      db.close();
    }
  });
});
