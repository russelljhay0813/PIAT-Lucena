import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "bwest.db");
const fallbackPassword = process.env.PIAT_STUDENT_DEFAULT_PASSWORD || "Student123!";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function getRows(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function main() {
  const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error("Unable to open database", err);
      process.exit(1);
    }
  });

  try {
    const rows = await getRows(
      db,
      "SELECT id, studentId, email FROM students WHERE password IS NULL OR TRIM(password) = ''",
    );
    if (rows.length === 0) {
      console.log("No student records need password backfill.");
      return;
    }

    const hashedPassword = hashPassword(fallbackPassword);
    let updated = 0;
    for (const row of rows) {
      await runQuery(db, "UPDATE students SET password = ? WHERE id = ?", [hashedPassword, row.id]);
      updated += 1;
      console.log(`Backfilled ${row.studentId || row.email || row.id}`);
    }

    console.log(
      `Backfilled ${updated} student account(s) with the default password: ${fallbackPassword}`,
    );
  } finally {
    db.close();
  }
}

main().catch((error) => {
  console.error("Backfill failed", error);
  process.exit(1);
});
