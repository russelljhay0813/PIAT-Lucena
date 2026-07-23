const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("bwest.db");
db.all("SELECT DISTINCT status FROM students", (err, rows) => {
  console.log("distinct student statuses:", rows);
  db.close();
});
