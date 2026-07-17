import test from "node:test";
import assert from "node:assert/strict";
import sqlite3 from "sqlite3";
import { initDb } from "./db.js";

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getTableColumns(db, table) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map((row) => row.name));
    });
  });
}

test("initDb adds semester and academicYear columns to legacy users table", async () => {
  const db = new sqlite3.Database(":memory:");

  try {
    await runSql(
      db,
      `CREATE TABLE users (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        role TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        program TEXT,
        yearLevel TEXT,
        createdAt TEXT NOT NULL
      )`,
    );

    await initDb(db);
    const columns = await getTableColumns(db, "users");

    assert.ok(columns.includes("semester"), "users table should gain a semester column");
    assert.ok(columns.includes("academicYear"), "users table should gain an academicYear column");
  } finally {
    await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));
  }
});

test("initDb seeds subject offerings for every supported academic year", async () => {
  const db = new sqlite3.Database(":memory:");

  try {
    await initDb(db);
    const academicYears = await new Promise((resolve, reject) => {
      db.all("SELECT DISTINCT academicYear FROM subjects WHERE academicYear IS NOT NULL ORDER BY academicYear", (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row) => row.academicYear));
      });
    });

    assert.deepEqual(academicYears, ["2025-2026", "2026-2027", "2027-2028", "2028-2029"]);

    const programCount = await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(DISTINCT program) AS count FROM subjects WHERE academicYear = '2025-2026'", (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    assert.ok(programCount >= 5, "expected at least one offering per program for the first academic year");
  } finally {
    await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));
  }
});
