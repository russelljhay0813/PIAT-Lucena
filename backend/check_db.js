const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("bwest.db");

db.serialize(() => {
  db.get("SELECT COUNT(*) AS c FROM programs", (err, row) => {
    if (err) throw err;
    console.log("programs", row.c);
  });

  db.get("SELECT COUNT(*) AS c FROM curriculum", (err, row) => {
    if (err) throw err;
    console.log("curriculum", row.c);
  });

  db.get("SELECT COUNT(*) AS c FROM subjects", (err, row) => {
    if (err) throw err;
    console.log("subjects", row.c);
  });

  db.all(
    "SELECT program, yearLevel, semester, code, title FROM subjects ORDER BY program, yearLevel, semester, code LIMIT 15",
    (err, rows) => {
      if (err) throw err;
      console.log("sample subjects:");
      rows.forEach((row) =>
        console.log([row.program, row.yearLevel, row.semester, row.code, row.title].join(" | ")),
      );
      db.close();
    },
  );
});
