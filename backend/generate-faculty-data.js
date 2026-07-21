import crypto from 'crypto';
import { initDb, openDb, run, all, get } from './db.js';

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

function makeSchedule(index) {
  const schedules = [
    'MW 8:00-10:00',
    'MW 10:00-12:00',
    'TH 8:00-10:00',
    'TH 10:00-12:00',
    'TTh 1:00-3:00',
    'WF 1:00-3:00',
  ];
  return schedules[index % schedules.length];
}

function makeRoom(index) {
  const rooms = ['LAB-101', 'LAB-202', 'ROOM-305', 'ROOM-410', 'BLDG-A-12', 'BLDG-B-08'];
  return rooms[index % rooms.length];
}

const facultyProfiles = [
  { firstName: 'Maria', middleName: 'Anita', lastName: 'Santos', email: 'maria.santos@bwest.edu.ph', password: 'Password123!', contactNumber: '09171234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Leila', middleName: 'Cruz', lastName: 'Dela Vega', email: 'leila.delavega@bwest.edu.ph', password: 'Password123!', contactNumber: '09181234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Roselyn', middleName: 'Bautista', lastName: 'Reyes', email: 'roselyn.reyes@bwest.edu.ph', password: 'Password123!', contactNumber: '09191234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Senior Instructor', employmentStatus: 'regular' },
  { firstName: 'Juan', middleName: 'Miguel', lastName: 'Dela Cruz', email: 'juan.delacruz@bwest.edu.ph', password: 'Password123!', contactNumber: '09201234567', gender: 'Male', program: 'Diploma in Tourism and Travel Services', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Patricia', middleName: 'Lorenzo', lastName: 'Mercado', email: 'patricia.mercado@bwest.edu.ph', password: 'Password123!', contactNumber: '09211234567', gender: 'Female', program: 'Diploma in Tourism and Travel Services', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Ricardo', middleName: 'Antonio', lastName: 'Lim', email: 'ricardo.lim@bwest.edu.ph', password: 'Password123!', contactNumber: '09221234567', gender: 'Male', program: 'Diploma in Tourism and Travel Services', position: 'Program Coordinator', employmentStatus: 'regular' },
  { firstName: 'Ana', middleName: 'Rose', lastName: 'Villanueva', email: 'ana.villanueva@bwest.edu.ph', password: 'Password123!', contactNumber: '09231234567', gender: 'Female', program: 'Diploma in Multimedia Arts and Design', position: 'Instructor II', employmentStatus: 'regular' },
  { firstName: 'Christian', middleName: 'David', lastName: 'Reyes', email: 'christian.reyes@bwest.edu.ph', password: 'Password123!', contactNumber: '09241234567', gender: 'Male', program: 'Diploma in Multimedia Arts and Design', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Bianca', middleName: 'Santos', lastName: 'Navarro', email: 'bianca.navarro@bwest.edu.ph', password: 'Password123!', contactNumber: '09251234567', gender: 'Female', program: 'Diploma in Multimedia Arts and Design', position: 'Senior Instructor', employmentStatus: 'regular' },
  { firstName: 'Eduardo', middleName: 'Pablo', lastName: 'Ramos', email: 'eduardo.ramos@bwest.edu.ph', password: 'Password123!', contactNumber: '09261234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Grace', middleName: 'Angela', lastName: 'Tan', email: 'grace.tan@bwest.edu.ph', password: 'Password123!', contactNumber: '09271234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Mark', middleName: 'Joseph', lastName: 'Palisoc', email: 'mark.palisoc@bwest.edu.ph', password: 'Password123!', contactNumber: '09281234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor III', employmentStatus: 'regular' },
  { firstName: 'Nina', middleName: 'Corazon', lastName: 'Cordova', email: 'nina.cordova@bwest.edu.ph', password: 'Password123!', contactNumber: '09291234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Paolo', middleName: 'Enrique', lastName: 'Garcia', email: 'paolo.garcia@bwest.edu.ph', password: 'Password123!', contactNumber: '09301234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Sofia', middleName: 'Mina', lastName: 'Mendoza', email: 'sofia.mendoza@bwest.edu.ph', password: 'Password123!', contactNumber: '09311234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Senior Instructor', employmentStatus: 'regular' },
];

(async function main() {
  try {
    db = await openDb();
    await initDb(db);

    await runQuery('PRAGMA foreign_keys = ON');

    const academicYearRow = await getQuery(
      "SELECT id, code FROM academic_years WHERE code = ? ORDER BY startDate DESC LIMIT 1",
      ['2026-2027'],
    );
    const academicYear = academicYearRow?.code || '2026-2027';
    const academicYearId = academicYearRow?.id || null;

    const semesterRow = await getQuery(
      "SELECT id, code FROM semesters WHERE status = 'active' ORDER BY sequence, createdAt LIMIT 1",
    );
    const semester = semesterRow?.code || '1st Semester';
    const semesterId = semesterRow?.id || null;

    const existingFacultyUsers = await allQuery("SELECT id, userId, username, email, firstName, lastName FROM users WHERE role = 'faculty' ORDER BY createdAt, id");
    const placeholderUser = existingFacultyUsers.find((user) => user.username === 'faculty' || user.email === 'faculty@example.com' || user.firstName === 'Ramon');

    let userCounter = existingFacultyUsers.length;
    const createdFacultyUsers = [];
    const assignedSubjectIds = new Set();

    for (let index = 0; index < facultyProfiles.length; index += 1) {
      const profile = facultyProfiles[index];
      const isPlaceholderTarget = index === 0 && placeholderUser;
      const fullName = `${profile.firstName} ${profile.middleName ? `${profile.middleName} ` : ''}${profile.lastName}`.trim();
      const passwordHash = hashPassword(profile.password);
      const userCode = `FAC-${String((isPlaceholderTarget ? Number.parseInt(placeholderUser.userId?.split('-').pop() || '0', 10) : userCounter + 1)).toString().padStart(5, '0')}`;
      const employeeCode = `EMP-${String(index + 1).toString().padStart(4, '0')}`;
      const createdAt = new Date().toISOString();

      if (isPlaceholderTarget) {
        await runQuery(
          `UPDATE users
           SET userId = ?, username = ?, email = ?, password = ?, firstName = ?, middleName = ?, lastName = ?, role = ?, status = ?, program = ?, yearLevel = ?, semester = ?, academicYear = ?, temporaryPassword = ?, createdAt = ?
           WHERE id = ?`,
          [userCode, profile.firstName.toLowerCase().replace(/[^a-z0-9]+/g, '') + profile.lastName.toLowerCase().replace(/[^a-z0-9]+/g, ''), profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, profile.password, createdAt, placeholderUser.id],
        );
        createdFacultyUsers.push({ id: placeholderUser.id, userId: userCode, username: profile.firstName.toLowerCase().replace(/[^a-z0-9]+/g, '') + profile.lastName.toLowerCase().replace(/[^a-z0-9]+/g, ''), email: profile.email });
      } else {
        const userId = crypto.randomUUID();
        const username = `${profile.firstName.toLowerCase()}${profile.lastName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '');
        await runQuery(
          `INSERT INTO users (id, userId, username, email, password, firstName, middleName, lastName, studentId, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, userCode, username, profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, null, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, createdAt, profile.password],
        );
        createdFacultyUsers.push({ id: userId, userId: userCode, username, email: profile.email });
      }

      const currentUser = createdFacultyUsers[createdFacultyUsers.length - 1];
      const existingFacultyRow = await getQuery('SELECT id FROM faculty WHERE userId = ?', [currentUser.id]);
      if (existingFacultyRow) {
        await runQuery(
          `UPDATE faculty
           SET employeeId = ?, firstName = ?, lastName = ?, middleName = ?, email = ?, department = ?, designation = ?, status = ?, createdAt = ?
           WHERE userId = ?`,
          [employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt, currentUser.id],
        );
      } else {
        await runQuery(
          `INSERT INTO faculty (id, userId, employeeId, firstName, lastName, middleName, email, department, designation, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), currentUser.id, employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt],
        );
      }

      const eligibleSubjects = await allQuery(
        `SELECT id, code, title FROM subjects
         WHERE program = ? AND academicYear = ? AND semester = ?
         ORDER BY code`,
        [profile.program, academicYear, semester],
      );

      const chosenSubjects = [];
      for (const subject of eligibleSubjects) {
        if (chosenSubjects.length >= 4) break;
        if (assignedSubjectIds.has(subject.id)) continue;
        chosenSubjects.push(subject);
        assignedSubjectIds.add(subject.id);
      }

      if (chosenSubjects.length === 0) {
        const fallbackSubjects = await allQuery(
          `SELECT id, code, title FROM subjects
           WHERE program = ?
           ORDER BY code
           LIMIT 4`,
          [profile.program],
        );
        for (const subject of fallbackSubjects) {
          if (chosenSubjects.length >= 4) break;
          if (assignedSubjectIds.has(subject.id)) continue;
          chosenSubjects.push(subject);
          assignedSubjectIds.add(subject.id);
        }
      }

      for (let subjectIndex = 0; subjectIndex < chosenSubjects.length; subjectIndex += 1) {
        const subject = chosenSubjects[subjectIndex];
        await runQuery('UPDATE subjects SET facultyId = ?, instructor = ? WHERE id = ?', [currentUser.id, fullName, subject.id]);

        const existingOffering = await getQuery(
          'SELECT id FROM subject_offerings WHERE subjectId = ? AND facultyId = ? AND academicYearId = ? AND semesterId = ?',
          [subject.id, currentUser.id, academicYearId, semesterId],
        );
        if (!existingOffering) {
          await runQuery(
            `INSERT INTO subject_offerings (id, subjectId, academicYearId, semesterId, sectionId, facultyId, schedule, room, capacity, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), subject.id, academicYearId, semesterId, null, currentUser.id, makeSchedule(subjectIndex), makeRoom(subjectIndex), 30, 'active', createdAt],
          );
        }

        const existingEnrollment = await getQuery(
          'SELECT id FROM enrollments WHERE subjectId = ? AND academicYear = ? AND semester = ? LIMIT 1',
          [subject.id, academicYear, semester],
        );
        if (!existingEnrollment) {
          const students = await allQuery(
            `SELECT studentId FROM students
             WHERE (program = ? OR ? IS NULL)
             ORDER BY id
             LIMIT 5`,
            [profile.program, profile.program],
          );

          for (const student of students) {
            const duplicateEnrollment = await getQuery(
              'SELECT id FROM enrollments WHERE studentId = ? AND subjectId = ? AND academicYear = ? AND semester = ?',
              [student.studentId, subject.id, academicYear, semester],
            );
            if (!duplicateEnrollment) {
              await runQuery(
                `INSERT INTO enrollments (id, studentId, subjectId, academicYear, semester, enrolledAt, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), student.studentId, subject.id, academicYear, semester, createdAt, 'enrolled'],
              );
            }
          }
        }
      }

      userCounter += 1;
    }

    const facultyCount = await getQuery("SELECT COUNT(*) AS count FROM users WHERE role = 'faculty'");
    const assignedCount = await getQuery("SELECT COUNT(*) AS count FROM subjects WHERE facultyId IS NOT NULL AND facultyId != ''");
    const offeringCount = await getQuery("SELECT COUNT(*) AS count FROM subject_offerings");
    const enrollmentCount = await getQuery("SELECT COUNT(*) AS count FROM enrollments");

    console.log(JSON.stringify({
      facultyCount: facultyCount.count,
      assignedSubjects: assignedCount.count,
      offerings: offeringCount.count,
      enrollments: enrollmentCount.count,
      academicYear,
      semester,
    }, null, 2));
  } catch (error) {
    console.error('Faculty generation failed:', error);
    process.exitCode = 1;
  } finally {
    if (db) {
      db.close();
    }
  }
})();
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getQuery(sql, params = []) {
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

function makeSchedule(index) {
  const schedules = [
    'MW 8:00-10:00',
    'MW 10:00-12:00',
    'TH 8:00-10:00',
    'TH 10:00-12:00',
    'TTh 1:00-3:00',
    'WF 1:00-3:00',
  ];
  return schedules[index % schedules.length];
}

function makeRoom(index) {
  const rooms = ['LAB-101', 'LAB-202', 'ROOM-305', 'ROOM-410', 'BLDG-A-12', 'BLDG-B-08'];
  return rooms[index % rooms.length];
}

const facultyProfiles = [
  { firstName: 'Maria', middleName: 'Anita', lastName: 'Santos', email: 'maria.santos@bwest.edu.ph', password: 'Password123!', contactNumber: '09171234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Leila', middleName: 'Cruz', lastName: 'Dela Vega', email: 'leila.delavega@bwest.edu.ph', password: 'Password123!', contactNumber: '09181234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Roselyn', middleName: 'Bautista', lastName: 'Reyes', email: 'roselyn.reyes@bwest.edu.ph', password: 'Password123!', contactNumber: '09191234567', gender: 'Female', program: 'Diploma in Hospitality Services and Technology', position: 'Senior Instructor', employmentStatus: 'regular' },
  { firstName: 'Juan', middleName: 'Miguel', lastName: 'Dela Cruz', email: 'juan.delacruz@bwest.edu.ph', password: 'Password123!', contactNumber: '09201234567', gender: 'Male', program: 'Diploma in Tourism and Travel Services', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Patricia', middleName: 'Lorenzo', lastName: 'Mercado', email: 'patricia.mercado@bwest.edu.ph', password: 'Password123!', contactNumber: '09211234567', gender: 'Female', program: 'Diploma in Tourism and Travel Services', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Ricardo', middleName: 'Antonio', lastName: 'Lim', email: 'ricardo.lim@bwest.edu.ph', password: 'Password123!', contactNumber: '09221234567', gender: 'Male', program: 'Diploma in Tourism and Travel Services', position: 'Program Coordinator', employmentStatus: 'regular' },
  { firstName: 'Ana', middleName: 'Rose', lastName: 'Villanueva', email: 'ana.villanueva@bwest.edu.ph', password: 'Password123!', contactNumber: '09231234567', gender: 'Female', program: 'Diploma in Multimedia Arts and Design', position: 'Instructor II', employmentStatus: 'regular' },
  { firstName: 'Christian', middleName: 'David', lastName: 'Reyes', email: 'christian.reyes@bwest.edu.ph', password: 'Password123!', contactNumber: '09241234567', gender: 'Male', program: 'Diploma in Multimedia Arts and Design', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Bianca', middleName: 'Santos', lastName: 'Navarro', email: 'bianca.navarro@bwest.edu.ph', password: 'Password123!', contactNumber: '09251234567', gender: 'Female', program: 'Diploma in Multimedia Arts and Design', position: 'Senior Instructor', employmentStatus: 'regular' },
  { firstName: 'Eduardo', middleName: 'Pablo', lastName: 'Ramos', email: 'eduardo.ramos@bwest.edu.ph', password: 'Password123!', contactNumber: '09261234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Grace', middleName: 'Angela', lastName: 'Tan', email: 'grace.tan@bwest.edu.ph', password: 'Password123!', contactNumber: '09271234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Mark', middleName: 'Joseph', lastName: 'Palisoc', email: 'mark.palisoc@bwest.edu.ph', password: 'Password123!', contactNumber: '09281234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Hotel and Restaurant Services)', position: 'Instructor III', employmentStatus: 'regular' },
  { firstName: 'Nina', middleName: 'Corazon', lastName: 'Cordova', email: 'nina.cordova@bwest.edu.ph', password: 'Password123!', contactNumber: '09291234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Instructor I', employmentStatus: 'regular' },
  { firstName: 'Paolo', middleName: 'Enrique', lastName: 'Garcia', email: 'paolo.garcia@bwest.edu.ph', password: 'Password123!', contactNumber: '09301234567', gender: 'Male', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Assistant Professor', employmentStatus: 'regular' },
  { firstName: 'Sofia', middleName: 'Mina', lastName: 'Mendoza', email: 'sofia.mendoza@bwest.edu.ph', password: 'Password123!', contactNumber: '09311234567', gender: 'Female', program: 'Diploma in Industrial Education (Major in Multimedia Arts and Design)', position: 'Senior Instructor', employmentStatus: 'regular' },
];

(async function main() {
  try {
    await runQuery('PRAGMA foreign_keys = ON');

    const academicYearRow = await getQuery(
      "SELECT id, code FROM academic_years WHERE code = ? ORDER BY startDate DESC LIMIT 1",
      ['2026-2027'],
    );
    const academicYear = academicYearRow?.code || '2026-2027';
    const academicYearId = academicYearRow?.id || null;

    const semesterRow = await getQuery(
      "SELECT id, code FROM semesters WHERE status = 'active' ORDER BY sequence, createdAt LIMIT 1",
    );
    const semester = semesterRow?.code || '1st Semester';
    const semesterId = semesterRow?.id || null;

    const existingFacultyUsers = await allQuery("SELECT id, userId, username, email, firstName, lastName FROM users WHERE role = 'faculty' ORDER BY createdAt, id");
    const placeholderUser = existingFacultyUsers.find((user) => user.username === 'faculty' || user.email === 'faculty@example.com' || user.firstName === 'Ramon');

    let userCounter = existingFacultyUsers.length;
    const createdFacultyUsers = [];
    const assignedSubjectIds = new Set();

    for (let index = 0; index < facultyProfiles.length; index += 1) {
      const profile = facultyProfiles[index];
      const isPlaceholderTarget = index === 0 && placeholderUser;
      const fullName = `${profile.firstName} ${profile.middleName ? `${profile.middleName} ` : ''}${profile.lastName}`.trim();
      const passwordHash = hashPassword(profile.password);
      const userCode = `FAC-${String((isPlaceholderTarget ? Number.parseInt(placeholderUser.userId?.split('-').pop() || '0', 10) : userCounter + 1)).toString().padStart(5, '0')}`;
      const employeeCode = `EMP-${String(index + 1).toString().padStart(4, '0')}`;
      const createdAt = new Date().toISOString();

      if (isPlaceholderTarget) {
        await runQuery(
          `UPDATE users
           SET userId = ?, username = ?, email = ?, password = ?, firstName = ?, middleName = ?, lastName = ?, role = ?, status = ?, program = ?, yearLevel = ?, semester = ?, academicYear = ?, temporaryPassword = ?, createdAt = ?
           WHERE id = ?`,
          [userCode, profile.firstName.toLowerCase().replace(/[^a-z0-9]+/g, '') + profile.lastName.toLowerCase().replace(/[^a-z0-9]+/g, ''), profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, profile.password, createdAt, placeholderUser.id],
        );
        createdFacultyUsers.push({ id: placeholderUser.id, userId: userCode, username: profile.firstName.toLowerCase().replace(/[^a-z0-9]+/g, '') + profile.lastName.toLowerCase().replace(/[^a-z0-9]+/g, ''), email: profile.email });
      } else {
        const userId = crypto.randomUUID();
        const username = `${profile.firstName.toLowerCase()}${profile.lastName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '');
        await runQuery(
          `INSERT INTO users (id, userId, username, email, password, firstName, middleName, lastName, studentId, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, userCode, username, profile.email, passwordHash, profile.firstName, profile.middleName, profile.lastName, null, 'faculty', 'active', profile.program, '2nd Year', semester, academicYear, createdAt, profile.password],
        );
        createdFacultyUsers.push({ id: userId, userId: userCode, username, email: profile.email });
      }

      const currentUser = createdFacultyUsers[createdFacultyUsers.length - 1];
      const existingFacultyRow = await getQuery('SELECT id FROM faculty WHERE userId = ?', [currentUser.id]);
      if (existingFacultyRow) {
        await runQuery(
          `UPDATE faculty
           SET employeeId = ?, firstName = ?, lastName = ?, middleName = ?, email = ?, department = ?, designation = ?, status = ?, createdAt = ?
           WHERE userId = ?`,
          [employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt, currentUser.id],
        );
      } else {
        await runQuery(
          `INSERT INTO faculty (id, userId, employeeId, firstName, lastName, middleName, email, department, designation, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [crypto.randomUUID(), currentUser.id, employeeCode, profile.firstName, profile.lastName, profile.middleName, profile.email, profile.program, profile.position, 'active', createdAt],
        );
      }

      const eligibleSubjects = await allQuery(
        `SELECT id, code, title FROM subjects
         WHERE program = ? AND academicYear = ? AND semester = ?
         ORDER BY code`,
        [profile.program, academicYear, semester],
      );

      const chosenSubjects = [];
      for (const subject of eligibleSubjects) {
        if (chosenSubjects.length >= 4) break;
        if (assignedSubjectIds.has(subject.id)) continue;
        chosenSubjects.push(subject);
        assignedSubjectIds.add(subject.id);
      }

      if (chosenSubjects.length === 0) {
        const fallbackSubjects = await allQuery(
          `SELECT id, code, title FROM subjects
           WHERE program = ?
           ORDER BY code
           LIMIT 4`,
          [profile.program],
        );
        for (const subject of fallbackSubjects) {
          if (chosenSubjects.length >= 4) break;
          if (assignedSubjectIds.has(subject.id)) continue;
          chosenSubjects.push(subject);
          assignedSubjectIds.add(subject.id);
        }
      }

      for (let subjectIndex = 0; subjectIndex < chosenSubjects.length; subjectIndex += 1) {
        const subject = chosenSubjects[subjectIndex];
        await runQuery('UPDATE subjects SET facultyId = ?, instructor = ? WHERE id = ?', [currentUser.id, fullName, subject.id]);

        const existingOffering = await getQuery(
          'SELECT id FROM subject_offerings WHERE subjectId = ? AND facultyId = ? AND academicYearId = ? AND semesterId = ?',
          [subject.id, currentUser.id, academicYearId, semesterId],
        );
        if (!existingOffering) {
          await runQuery(
            `INSERT INTO subject_offerings (id, subjectId, academicYearId, semesterId, sectionId, facultyId, schedule, room, capacity, status, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [crypto.randomUUID(), subject.id, academicYearId, semesterId, null, currentUser.id, makeSchedule(subjectIndex), makeRoom(subjectIndex), 30, 'active', createdAt],
          );
        }

        const existingEnrollment = await getQuery(
          'SELECT id FROM enrollments WHERE subjectId = ? AND academicYear = ? AND semester = ? LIMIT 1',
          [subject.id, academicYear, semester],
        );
        if (!existingEnrollment) {
          const students = await allQuery(
            `SELECT studentId FROM students
             WHERE (program = ? OR ? IS NULL)
             ORDER BY id
             LIMIT 5`,
            [profile.program, profile.program],
          );

          for (const student of students) {
            const duplicateEnrollment = await getQuery(
              'SELECT id FROM enrollments WHERE studentId = ? AND subjectId = ? AND academicYear = ? AND semester = ?',
              [student.studentId, subject.id, academicYear, semester],
            );
            if (!duplicateEnrollment) {
              await runQuery(
                `INSERT INTO enrollments (id, studentId, subjectId, academicYear, semester, enrolledAt, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [crypto.randomUUID(), student.studentId, subject.id, academicYear, semester, createdAt, 'enrolled'],
              );
            }
          }
        }
      }

      userCounter += 1;
    }

    const facultyCount = await getQuery("SELECT COUNT(*) AS count FROM users WHERE role = 'faculty'");
    const assignedCount = await getQuery("SELECT COUNT(*) AS count FROM subjects WHERE facultyId IS NOT NULL AND facultyId != ''");
    const offeringCount = await getQuery("SELECT COUNT(*) AS count FROM subject_offerings");
    const enrollmentCount = await getQuery("SELECT COUNT(*) AS count FROM enrollments");

    console.log(JSON.stringify({
      facultyCount: facultyCount.count,
      assignedSubjects: assignedCount.count,
      offerings: offeringCount.count,
      enrollments: enrollmentCount.count,
      academicYear,
      semester,
    }, null, 2));
  } catch (error) {
    console.error('Faculty generation failed:', error);
    process.exitCode = 1;
  } finally {
    db.close();
  }
})();
