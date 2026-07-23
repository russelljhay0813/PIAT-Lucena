import sqlite3 from "sqlite3";

const db = new sqlite3.Database("bwest.db");
const counts = await new Promise((resolve, reject) => {
  db.serialize(() => {
    db.get("SELECT COUNT(*) AS c FROM students", (err, row) => {
      if (err) return reject(err);
      db.get("SELECT COUNT(*) AS c FROM users WHERE role = 'student'", (err2, row2) => {
        if (err2) return reject(err2);
        db.get("SELECT COUNT(*) AS c FROM enrollments", (err3, row3) => {
          if (err3) return reject(err3);
          resolve({ students: row.c, studentUsers: row2.c, enrollments: row3.c });
        });
      });
    });
  });
});
console.log(JSON.stringify(counts));
db.close();
