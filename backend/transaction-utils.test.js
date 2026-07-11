import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { initDb, run, withTransaction } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDbPath = path.join(__dirname, 'transaction-test.db');

function createTestDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(testDbPath, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

test('withTransaction rolls back partial changes on failure', async () => {
  const db = await createTestDb();
  try {
    await initDb(db);
    await run(db, 'CREATE TABLE IF NOT EXISTS rollback_test (id TEXT PRIMARY KEY, value TEXT NOT NULL)');
    await run(db, 'DELETE FROM rollback_test');

    await assert.rejects(
      withTransaction(db, async () => {
        await run(db, 'INSERT INTO rollback_test (id, value) VALUES (?, ?)', ['tx-1', 'Test']);
        throw new Error('boom');
      }),
      /boom/
    );

    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT id FROM rollback_test WHERE id = ?', ['tx-1'], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    assert.equal(rows.length, 0);
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
