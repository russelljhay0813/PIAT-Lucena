import sqlite3
from pathlib import Path

db_path = Path(__file__).parent / 'bwest.db'
con = sqlite3.connect(db_path)
cur = con.cursor()

print('STUDENTS', cur.execute('SELECT COUNT(*) FROM students').fetchone()[0])
print('ENROLLMENTS', cur.execute('SELECT COUNT(*) FROM enrollments').fetchone()[0])
print('SUBJECTS', cur.execute('SELECT COUNT(*) FROM subjects').fetchone()[0])

print('\nSTUDENTS SAMPLE')
for row in cur.execute('SELECT studentId, program, yearLevel, academicYear, semester, status FROM students LIMIT 20').fetchall():
    print(row)

print('\nENROLLMENTS SAMPLE')
for row in cur.execute('SELECT studentId, subjectId, academicYear, semester, status FROM enrollments LIMIT 50').fetchall():
    print(row)

print('\nSUBJECTS SAMPLE')
for row in cur.execute('SELECT id, code, program, yearLevel, semester, academicYear FROM subjects LIMIT 50').fetchall():
    print(row)

con.close()
