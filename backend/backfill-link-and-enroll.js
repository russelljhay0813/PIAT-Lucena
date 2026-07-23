import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "bwest.db");
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    }),
  );
}
function allAsync(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
  );
}
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))),
  );
}

(async function () {
  try {
    const matches = await allAsync(
      "SELECT u.id as uid, u.email as uemail, s.studentId as sid FROM users u JOIN students s ON LOWER(u.email)=LOWER(s.email) WHERE u.role='student' AND (u.studentId IS NULL OR u.studentId='')",
    );
    console.log("matches to link", matches.length);
    for (const r of matches) {
      await runAsync("UPDATE users SET studentId = ? WHERE id = ?", [r.sid, r.uid]);
      console.log("linked user", r.uid, "->", r.sid);
    }

    const studs = await allAsync("SELECT * FROM students WHERE studentId IS NOT NULL");
    console.log("students to process for enrollment", studs.length);
    for (const st of studs) {
      const academicYear =
        st.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      const semester = st.semester || "1st Semester";
      if (!st.program || !st.yearLevel) continue;
      const subs = await allAsync(
        "SELECT id FROM subjects WHERE program = ? AND yearLevel = ? AND semester = ?",
        [st.program, st.yearLevel, semester],
      );
      if (!subs || subs.length === 0) continue;
      for (const s of subs) {
        const ex = await getAsync(
          "SELECT id FROM enrollments WHERE studentId = ? AND subjectId = ? AND academicYear = ? AND semester = ?",
          [st.studentId, s.id, academicYear, semester],
        );
        if (!ex) {
          await runAsync(
            "INSERT INTO enrollments (id, studentId, subjectId, academicYear, semester, enrolledAt, status) VALUES (?,?,?,?,?,?,?)",
            [
              crypto.randomUUID(),
              st.studentId,
              s.id,
              academicYear,
              semester,
              new Date().toISOString(),
              "enrolled",
            ],
          );
          console.log("enrolled", st.studentId, s.id);
        }
      }
    }

    console.log("Backfill and enrollment complete");
    db.close();
  } catch (err) {
    console.error("Error during backfill:", err);
    db.close();
    process.exit(1);
  }
})();
