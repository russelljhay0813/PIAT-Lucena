const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("bwest.db");
db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='students'", (err, rows) => {
  console.log("err:", err);
  console.log("sql:", rows && rows[0] && rows[0].sql);
  db.close();
});
