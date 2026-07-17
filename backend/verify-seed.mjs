import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(path.join(__dirname, "bwest.db"));

db.serialize(() => {
  db.all("SELECT DISTINCT academicYear FROM subjects WHERE academicYear IS NOT NULL ORDER BY academicYear", (err, rows) => {
    if (err) throw err;
    console.log("academicYears", rows.map((r) => r.academicYear));
    db.get("SELECT COUNT(*) AS c FROM subjects", (err2, row) => {
      if (err2) throw err2;
      console.log("subjectsCount", row.c);
      db.get("SELECT COUNT(DISTINCT program) AS c FROM subjects WHERE academicYear = '2025-2026'", (err3, row3) => {
        if (err3) throw err3;
        console.log("programsFor2025_2026", row3.c);
        db.close();
      });
    });
  });
});
