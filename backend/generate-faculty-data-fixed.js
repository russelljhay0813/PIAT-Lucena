import crypto from 'crypto';
import { initDb, openDb } from './db.js';

let db;

async function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function makeSchedule(index, facultyIndex) {
  const schedules = ['MW 8:00-10:00', 'MW 10:00-12:00', 'TH 8:00-10:00', 'TH 10:00-12:00', 'TTh 1:00-3:00', 'WF 1:00-3:00'];
  return schedules[(index + facultyIndex) % schedules.length];
}

function makeRoom(index, facultyIndex) {
  const rooms = ['LAB-101', 'LAB-202', 'ROOM-305', 'ROOM-410', 'BLDG-A-12', 'BLDG-B-08'];
  return rooms[(index + facultyIndex) % rooms.length];
}

const facultyProfiles = [
  { firstName: 'Maria', middleName: 'Anita', lastName: 'Santos', email: 'maria.santos@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Hospitality Services and Technology', position: 'Instructor I' },
  { firstName: 'Leila', middleName: 'Cruz', lastName: 'Dela Vega', email: 'leila.delavega@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Hospitality Services and Technology', position: 'Assistant Professor' },
  { firstName: 'Roselyn', middleName: 'Bautista', lastName: 'Reyes', email: 'roselyn.reyes@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Hospitality Services and Technology', position: 'Senior Instructor' },
  { firstName: 'Juan', middleName: 'Miguel', lastName: 'Dela Cruz', email: 'juan.delacruz@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Tourism and Travel Services', position: 'Instructor I' },
  { firstName: 'Patricia', middleName: 'Lorenzo', lastName: 'Mercado', email: 'patricia.mercado@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Tourism and Travel Services', position: 'Assistant Professor' },
  { firstName: 'Ricardo', middleName: 'Antonio', lastName: 'Lim', email: 'ricardo.lim@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Tourism and Travel Services', position: 'Program Coordinator' },
  { firstName: 'Ana', middleName: 'Rose', lastName: 'Villanueva', email: 'ana.villanueva@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Multimedia Arts and Design', position: 'Instructor II' },
  { firstName: 'Christian', middleName: 'David', lastName: 'Reyes', email: 'christian.reyes@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Multimedia Arts and Design', position: 'Assistant Professor' },
  { firstName: 'Bianca', middleName: 'Santos', lastName: 'Navarro', email: 'bianca.navarro@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Multimedia Arts and Design', position: 'Senior Instructor' },
  { firstName: 'Eduardo', middleName: 'Pablo', lastName: 'Ramos', email: 'eduardo.ramos@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor I' },
  { firstName: 'Grace', middleName: 'Angela', lastName: 'Tan', email: 'grace.tan@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Assistant Professor' },
  { firstName: 'Mark', middleName: 'Joseph', lastName: 'Palisoc', email: 'mark.palisoc@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor III' },
  { firstName: 'Nina', middleName: 'Corazon', lastName: 'Cordova', email: 'nina.cordova@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Instructor I' },
  { firstName: 'Paolo', middleName: 'Enrique', lastName: 'Garcia', email: 'paolo.garcia@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Assistant Professor' },
  { firstName: 'Sofia', middleName: 'Mina', lastName: 'Mendoza', email: 'sofia.mendoza@bwest.edu.ph', password: 'Password123!', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Senior Instructor' },
];

(async function main() {
  try {
    db = await openDb();
    await initDb(db);
    await runQuery('PRAGMA foreign_keys = ON');

    const academicYearRow = await getQuery("SELECT id, code FROM academic_years WHERE code = ? ORDER BY startDate DESC LIMIT 1", ['2026-2027']);
    const academicYear = academicYearRow?.code || '2026-2027';
    const academicYearId = academicYearRow?.id || null;
    const semesterRow = await getQuery("SELECT id, code FROM semesters WHERE status = 'active' ORDER BY sequence, createdAt LIMIT 1");
    const semester = semesterRow?.code || '1st Semester';
    const semesterId = semesterRow?.id || null;

    const assignedSubjectIds = new Set();
    const createdFacultyUsers = [];

    for (let index = 0; index < facultyProfiles.length; index += 1) {
      const profile = facultyProfiles[index];
      const fullName = `${profile.firstName} ${profile.middleName ? `${profile.middleName} ` : ''}${profile.lastName}`.trim();
      const createdAt = new Date().toISOString();
      const userCode = `FAC-${String(index + 10001).toString().padStart(5, '0')}`;
      const employeeCode = `EMP-${String(index + 1).toString().padStart(4, '0')}`;
      const passwordHash = hashPassword(profile.password);
      const username = `${profile.firstName.toLowerCase()}${profile.lastName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '');
      const existingUser = await getQuery('SELECT id FROM users WHERE email = ? AND role = ? LIMIT 1', [profile.email, 'faculty']);
      let userId = existingUser?.id || crypto.randomUUID();

      if (!existingUser) {
        await runQuery(
          `INSERT INTO users (id, userId, username, email, password, firstName, middleName, lastName, studentId, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, userCode, username, profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, null, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, createdAt, profile.password],
        );
      } else {
        await runQuery(
          `UPDATE users
           SET userId = ?, username = ?, email = ?, password = ?, firstName = ?, middleName = ?, lastName = ?, role = ?, status = ?, program = ?, yearLevel = ?, semester = ?, academicYear = ?, temporaryPassword = ?, createdAt = ?
           WHERE id = ?`,
          [userCode, username, profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, profile.password, createdAt, userId],
        );
      }

      createdFacultyUsers.push({ id: userId, userId: userCode, username, email: profile.email });

      const existingFacultyRow = await getQuery('SELECT id FROM faculty WHERE userId = ?', [userId]);
      if (existingFacultyRow) {
        await runQuery(
          `UPDATE faculty SET employeeId = ?, firstName = ?, lastName = ?, middleName = ?, email = ?, department = ?, designation = ?, status = ?, createdAt = ? WHERE userId = ?`,
          [employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt, userId],
        );
      } else {
        await runQuery(
          `INSERT INTO faculty (id, userId, employeeId, firstName, lastName, middleName, email, department, designation, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), userId, employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt],
        );
      }

      const eligibleSubjects = await allQuery(`SELECT id, code, title FROM subjects WHERE program = ? AND academicYear = ? AND semester = ? ORDER BY code`, [profile.program, academicYear, semester]);
      const chosenSubjects = [];
      for (const subject of eligibleSubjects) {
        if (chosenSubjects.length >= 4) break;
        if (assignedSubjectIds.has(subject.id)) continue;
        chosenSubjects.push(subject);
        assignedSubjectIds.add(subject.id);
      }
      if (chosenSubjects.length === 0) {
        const fallbackSubjects = await allQuery('SELECT id, code, title FROM subjects WHERE program = ? ORDER BY code LIMIT 4', [profile.program]);
        for (const subject of fallbackSubjects) {
          if (chosenSubjects.length >= 4) break;
          if (assignedSubjectIds.has(subject.id)) continue;
          chosenSubjects.push(subject);
          assignedSubjectIds.add(subject.id);
        }
      }

      for (let subjectIndex = 0; subjectIndex < chosenSubjects.length; subjectIndex += 1) {
        const subject = chosenSubjects[subjectIndex];
        await runQuery('UPDATE subjects SET facultyId = ?, instructor = ? WHERE id = ?', [userId, fullName, subject.id]);
        const offeringExists = await getQuery('SELECT id FROM subject_offerings WHERE subjectId = ? AND facultyId = ? AND academicYearId = ? AND semesterId = ?', [subject.id, userId, academicYearId, semesterId]);
        if (!offeringExists) {
          await runQuery(
            `INSERT INTO subject_offerings (id, subjectId, academicYearId, semesterId, sectionId, facultyId, schedule, room, capacity, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), subject.id, academicYearId, semesterId, null, userId, makeSchedule(subjectIndex, index), makeRoom(subjectIndex, index), 30, 'active', createdAt],
          );
        }
      }
    }

    console.log(JSON.stringify({
      facultyCount: await getQuery("SELECT COUNT(*) AS count FROM users WHERE role = 'faculty'"),
      assignedSubjects: await getQuery("SELECT COUNT(*) AS count FROM subjects WHERE facultyId IS NOT NULL AND facultyId != ''"),
      offerings: await getQuery("SELECT COUNT(*) AS count FROM subject_offerings"),
      enrollments: await getQuery("SELECT COUNT(*) AS count FROM enrollments"),
    }, null, 2));
  } catch (error) {
    console.error('Faculty generation failed:', error);
    process.exitCode = 1;
  } finally {
    if (db) db.close();
  }
})();
