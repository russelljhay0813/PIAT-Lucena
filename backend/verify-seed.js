const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(), 'bwest.db'));

db.serialize(() => {
  db.all('SELECT DISTINCT academicYear FROM subjects WHERE academicYear IS NOT NULL ORDER BY academicYear', (err, rows) => {
    if (err) throw err;
    console.log('academicYears', rows.map((row) => row.academicYear));
    db.get('SELECT COUNT(*) AS c FROM subjects', (err2, row) => {
      if (err2) throw err2;
      console.log('subjectsCount', row.c);
      db.get("SELECT COUNT(DISTINCT program) AS c FROM subjects WHERE academicYear = '2025-2026'", (err3, row2) => {
        if (err3) throw err3;
        console.log('programsFor2025_2026', row2.c);
        db.close();
      });
    });
  });
});
