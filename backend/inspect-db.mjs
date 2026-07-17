import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new sqlite3.Database(path.join(__dirname, "bwest.db"));

db.serialize(() => {
  db.get("SELECT COUNT(*) AS c FROM curriculum", (err, row) => {
    if (err) throw err;
    console.log("curriculumCount", row.c);
    db.get("SELECT COUNT(*) AS c FROM subjects", (err2, row2) => {
      if (err2) throw err2;
      console.log("subjectsCount", row2.c);
      db.get("SELECT COUNT(*) AS c FROM subjects WHERE academicYear IS NULL", (err3, row3) => {
        if (err3) throw err3;
        console.log("subjectsNullAcademicYear", row3.c);
        db.get("SELECT COUNT(DISTINCT academicYear) AS c FROM subjects WHERE academicYear IS NOT NULL", (err4, row4) => {
          if (err4) throw err4;
          console.log("distinctAcademicYears", row4.c);
          db.all("SELECT academicYear, COUNT(*) AS c FROM subjects GROUP BY academicYear ORDER BY academicYear", (err5, rows5) => {
            if (err5) throw err5;
            console.log("subjectsByAcademicYear", rows5);
            db.all("SELECT program, yearLevel, semester, academicYear, COUNT(*) AS c FROM subjects WHERE academicYear IS NOT NULL GROUP BY program, yearLevel, semester, academicYear ORDER BY program, yearLevel, semester, academicYear LIMIT 20", (err6, rows6) => {
              if (err6) throw err6;
              console.log("sampleSubjectsStructure", rows6);
              db.close();
            });
          });
        });
      });
    });
  });
});
