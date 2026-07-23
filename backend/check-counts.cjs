const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("bwest.db");
db.all("SELECT COUNT(*) as cnt FROM enrollments", (err, rows) =>
  console.log("enrollments count:", rows && rows[0]),
);
db.all("SELECT COUNT(*) as cnt FROM attendance", (err, rows) =>
  console.log("attendance count:", rows && rows[0]),
);
db.all("SELECT COUNT(*) as cnt FROM subjects", (err, rows) =>
  console.log("subjects count:", rows && rows[0]),
);
db.all("SELECT COUNT(*) as cnt FROM students", (err, rows) =>
  console.log("students count:", rows && rows[0]),
);
setTimeout(() => db.close(), 100);
