import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('bwest.db');

function print(name, row) {
  console.log(`${name}: ${row ? row.c : 'null'}`);
}

db.serialize(() => {
  db.get('SELECT COUNT(*) AS c FROM students', (err, row) => { if (err) throw err; print('students', row); });
  db.get('SELECT COUNT(*) AS c FROM enrollments', (err, row) => { if (err) throw err; print('enrollments', row); });
  db.get('SELECT COUNT(*) AS c FROM users WHERE role = ?', ['faculty'], (err, row) => { if (err) throw err; print('faculty', row); });
  db.get('SELECT COUNT(*) AS c FROM programs', (err, row) => { if (err) throw err; print('programs', row); });
  db.all('SELECT status, COUNT(*) AS c FROM students GROUP BY status', (err, rows) => { if (err) throw err; rows.forEach(r => console.log(`student status ${r.status}: ${r.c}`)); });
  db.all('SELECT status, COUNT(*) AS c FROM enrollments GROUP BY status', (err, rows) => { if (err) throw err; rows.forEach(r => console.log(`enrollment status ${r.status}: ${r.c}`)); });
  db.close();
});
