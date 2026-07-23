import { openDb } from "./db.js";
import crypto from "crypto";

const db = await openDb();
const id = crypto.randomUUID();
await new Promise((resolve, reject) => {
  db.run(
    "INSERT INTO users (id, userId, username, email, password, firstName, lastName, studentId, role, status, program, yearLevel, createdAt, temporaryPassword) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      `REG-${Date.now()}`,
      "registrar",
      "registrar@example.com",
      "password",
      "Maria",
      "Santos",
      null,
      "registrar",
      "active",
      null,
      null,
      new Date().toISOString(),
      "password",
    ],
    (err) => (err ? reject(err) : resolve()),
  );
});

const row = await new Promise((resolve, reject) => {
  db.get(
    "SELECT id, userId, username, email, password, role, status FROM users WHERE email = ?",
    ["registrar@example.com"],
    (err, row) => {
      if (err) reject(err);
      else resolve(row);
    },
  );
});

console.log(JSON.stringify(row, null, 2));
db.close();
