const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("bwest.db");
const tables = ["enrollments", "subjects", "attendance", "students"];
for (const table of tables) {
  db.all(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`, (err, rows) => {
    if (!err && rows && rows[0]) {
      console.log(`--- ${table} ---`);
      console.log(rows[0].sql);
      console.log();
    }
  });
}
setTimeout(() => db.close(), 100);
