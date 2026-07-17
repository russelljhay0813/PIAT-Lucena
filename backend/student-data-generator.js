import crypto from "crypto";
import { openDb, run, all, get } from "./db.js";
import { normalizeStudentPayload } from "./schema-utils.js";

export const PIAT_PROGRAMS = [
  "Diploma in Hospitality Services and Technology",
  "Diploma in Tourism and Travel Services",
  "Diploma in Multimedia Arts and Design",
  "Diploma in Industrial Education (Major in Hotel and Restaurant Services)",
  "Diploma in Industrial Education (Major in Multimedia Arts and Design)",
];

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SECTIONS = ["Section A", "Section B", "Section C"];
const ACTIVE_SEMESTERS = ["1st Semester", "2nd Semester"];

const FIRST_NAMES = [
  "Aaliyah", "Abigail", "Adrian", "Aira", "Aldrin", "Alyssa", "Andrea", "Angel", "Angelo", "Aria",
  "Arvin", "Ashley", "Athena", "Bea", "Benedict", "Bianca", "Blanche", "Camille", "Celine", "Christian",
  "Claire", "Clint", "Cris", "Daniel", "Daniella", "Daphne", "Dave", "Denzel", "Dianne", "Dexter",
  "Diana", "Edgar", "Elijah", "Ella", "Emil", "Erica", "Ethan", "Eunice", "Faith", "Frances",
  "Gabriel", "Genesis", "George", "Gian", "Gina", "Gloria", "Harold", "Hazel", "Ian", "Ingrid",
  "Isabel", "Janelle", "Jayson", "Jessa", "Jhon", "Jillian", "Joan", "Jocelyn", "John", "Joshua",
  "Joy", "Julia", "Julian", "Justine", "Karl", "Katrina", "Kean", "Ken", "Kris", "Kristine",
  "Lance", "Lara", "Lianne", "Lloyd", "Lois", "Louise", "Maica", "Marian", "Marielle", "Marlon",
  "Mary", "Michaela", "Miguel", "Nadine", "Nico", "Noel", "Noreen", "Oscar", "Patricia", "Paulo",
  "Precious", "Rafael", "Randy", "Rhea", "Rhen", "Rica", "Rina", "Rizalyn", "Rochelle", "Rolly",
  "Rose", "Ruben", "Ruel", "Ryan", "Samantha", "Sarah", "Sean", "Shaira", "Sheila", "Shiela",
  "Sofia", "Stella", "Tyrone", "Vanessa", "Vince", "Warren", "Yvette", "Yza", "Zara", "Zion",
];

const LAST_NAMES = [
  "Abad", "Abarca", "Aguilar", "Alcantara", "Alvarez", "Andres", "Anzures", "Aquino", "Bacalso", "Bautista",
  "Beltran", "Bermudez", "Biscocho", "Borja", "Bulanadi", "Cabrera", "Caluag", "Canlas", "Cayanan", "Cruz",
  "Dela Cruz", "Dela Rosa", "Del Mundo", "Dimaculangan", "Dizon", "Esguerra", "Estrella", "Fernandez", "Flores", "Galang",
  "Garcia", "Gonzales", "Hernandez", "Ilagan", "Jimenez", "Labrador", "Lacson", "Ledesma", "Lorenzo", "Macalalad",
  "Magno", "Manalo", "Marasigan", "Martinez", "Mendoza", "Molina", "Natividad", "Nicolas", "Ocampo", "Ortega",
  "Padilla", "Panganiban", "Pascual", "Perez", "Pineda", "Puig", "Quezada", "Reyes", "Rico", "Rivera",
  "Robles", "Rosales", "Salazar", "Santos", "Sison", "Soberano", "Soliman", "Soria", "Suarez", "Tolentino",
  "Torres", "Trinidad", "Valdez", "Valencia", "Vargas", "Velasco", "Villanueva", "Villareal", "Yap", "Zamora",
];

const MIDDLE_NAMES = [
  "Angela", "Anita", "Aurelia", "Bernadette", "Cecilia", "Cristina", "Dahlia", "Daisy", "Delia", "Evelyn",
  "Faith", "Florence", "Gloria", "Grace", "Helena", "Irene", "Isabel", "Jasmine", "Joy", "Karen",
  "Lourdes", "Luz", "Margarita", "Maria", "Marilyn", "Marisol", "Mina", "Myrna", "Nadia", "Nora",
  "Patricia", "Pilar", "Rhea", "Rina", "Rosal", "Rosemary", "Sabrina", "Sarah", "Sofia", "Teresa",
  "Veronica", "Victoria", "Vivian", "Wendy", "Yvonne", "Zenaida",
];

const PLACES = [
  "Lucena City, Quezon", "Tayabas City, Quezon", "Sariaya, Quezon", "Pagbilao, Quezon", "Candelaria, Quezon",
  "Mauban, Quezon", "Gumaca, Quezon", "Lopez, Quezon", "Atimonan, Quezon", "Tagkawayan, Quezon",
  "Polillo, Quezon", "San Antonio, Quezon", "Calauag, Quezon", "Mulanay, Quezon", "Infanta, Quezon",
  "Unisan, Quezon", "Buenavista, Quezon", "General Luna, Quezon", "Agdangan, Quezon", "Plaridel, Quezon",
];

const BARANGAYS = [
  "Brgy. Ibabang Iyam", "Brgy. Ilayang Iyam", "Brgy. Gulang-Gulang", "Brgy. Market View", "Brgy. Dalahican",
  "Brgy. Mayao Crossing", "Brgy. Cotta", "Brgy. Isabang", "Brgy. Lagalag", "Brgy. Lusacan",
  "Brgy. San Antonio", "Brgy. Wakas", "Brgy. Malabanban Norte", "Brgy. Masinloc", "Brgy. Tupaz",
  "Brgy. Silangang Mayao", "Brgy. Ibabang Dupay", "Brgy. Ilayang Dupay", "Brgy. Bagong Silang", "Brgy. Sta. Cruz",
];

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeStudentId(index, academicYear) {
  const year = String(academicYear || new Date().getFullYear()).split("-")[0];
  return `${year}-${String(index + 1).padStart(5, "0")}`;
}

function createUsername(firstName, lastName, index) {
  const base = `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase().replace(/\s+/g, "")}${index}`;
  return base.slice(0, 20);
}

function createTemporaryPassword() {
  return `PIAT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function formatDateOfBirth(index) {
  const start = new Date(2002, 0, 1);
  const end = new Date(2008, 11, 31);
  const offset = start.getTime() + (index % 2557) * 86400000;
  const date = new Date(offset);
  if (date > end) {
    date.setFullYear(date.getFullYear() - 1);
  }
  return date.toISOString().slice(0, 10);
}

function createAddress(index) {
  const place = pick(PLACES);
  const barangay = pick(BARANGAYS);
  return `${barangay}, ${place}`;
}

function createPhoneNumber(index) {
  const suffix = String(900000000 + index).slice(-9);
  return `09${suffix}`;
}

function createParentName(index) {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function mapProgramToYearLevelProgram(program) {
  switch (program) {
    case "Diploma in Hospitality Services and Technology":
      return "Hospitality Services";
    case "Diploma in Tourism and Travel Services":
      return "Tourism and Travel Services";
    case "Diploma in Multimedia Arts and Design":
      return "Multimedia Arts and Design";
    case "Diploma in Industrial Education (Major in Hotel and Restaurant Services)":
      return "Industrial Education - HRS";
    default:
      return "Industrial Education - MMAD";
  }
}

export function buildStudentSeedData({ academicYear = "2026-2027", activeSemester = "1st Semester" } = {}) {
  const students = [];
  const resolvedSemester = ACTIVE_SEMESTERS.includes(activeSemester) ? activeSemester : "1st Semester";
  let index = 0;

  for (const program of PIAT_PROGRAMS) {
    for (const yearLevel of YEAR_LEVELS) {
      for (const section of SECTIONS) {
        for (let studentNumber = 0; studentNumber < 15; studentNumber += 1) {
          const firstName = pick(FIRST_NAMES);
          const middleName = pick(MIDDLE_NAMES);
          const lastName = pick(LAST_NAMES);
          const gender = studentNumber % 2 === 0 ? "Female" : "Male";
          const dob = formatDateOfBirth(index + studentNumber);
          const address = createAddress(index + studentNumber);
          const phone = createPhoneNumber(index + studentNumber);
          const studentId = makeStudentId(index + studentNumber, academicYear);
          const username = createUsername(firstName, lastName, index + studentNumber + 1);
          const temporaryPassword = createTemporaryPassword();
          const email = `${username}@piat.edu.ph`;

          students.push({
            id: crypto.randomUUID(),
            studentId,
            firstName,
            middleName,
            lastName,
            gender,
            dob,
            civilStatus: "Single",
            nationality: "Filipino",
            email,
            contactNumber: phone,
            address,
            placeOfBirth: `Lucena City, Quezon`,
            barangay: address.split(",")[0],
            parentName: createParentName(index + studentNumber),
            parentContact: createPhoneNumber(index + studentNumber + 1000),
            program,
            yearLevel,
            section,
            academicYear,
            semester: resolvedSemester,
            registrationStatus: "approved",
            enrollmentStatus: "enrolled",
            username,
            temporaryPassword,
            password: temporaryPassword,
            programSlug: mapProgramToYearLevelProgram(program),
          });
        }
        index += 15;
      }
    }
  }

  return students;
}

export async function seedStudentRecords({ academicYear = "2026-2027", activeSemester = "1st Semester" } = {}) {
  const db = await openDb();
  try {
    const existingCount = await get(db, "SELECT COUNT(*) AS count FROM students");
    if (Number(existingCount?.count || 0) >= 900) {
      await run(db, "DELETE FROM enrollments");
      return { inserted: 0, existing: Number(existingCount?.count || 0) };
    }

    await run(db, "DELETE FROM enrollments");

    const students = buildStudentSeedData({ academicYear, activeSemester });
    const semester = activeSemester || "1st Semester";
    const academicYearValue = academicYear || "2026-2027";

    for (const student of students) {
      const normalized = normalizeStudentPayload({
        id: student.id,
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        email: student.email,
        password: student.password,
        gender: student.gender,
        dob: student.dob,
        civilStatus: student.civilStatus,
        nationality: student.nationality,
        educationLevel: "College",
        program: student.program,
        yearLevel: student.yearLevel,
        academicYear: academicYearValue,
        semester,
        section: student.section,
        contactNumber: student.contactNumber,
        address: student.address,
        placeOfBirth: student.placeOfBirth,
        barangay: student.barangay,
        parentName: student.parentName,
        parentContact: student.parentContact,
        status: student.registrationStatus === "approved" ? "approved" : "submitted",
        submittedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        reviewNote: "Seeded student data",
      });

      const existingStudent = await get(db, "SELECT id FROM students WHERE studentId = ?", [normalized.studentId]);
      if (!existingStudent) {
        await run(
          db,
          `INSERT INTO students (id, studentId, firstName, lastName, middleName, email, password, gender, dob, civilStatus, nationality, educationLevel, program, yearLevel, academicYear, semester, section, contactNumber, address, placeOfBirth, barangay, parentName, parentContact, status, submittedAt, reviewedAt, reviewNote, firstLoginAt, lastLoginAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            normalized.id,
            normalized.studentId,
            normalized.firstName,
            normalized.lastName,
            normalized.middleName,
            normalized.email,
            normalized.password,
            normalized.gender,
            normalized.dob,
            normalized.civilStatus,
            normalized.nationality,
            normalized.educationLevel,
            normalized.program,
            normalized.yearLevel,
            normalized.academicYear,
            normalized.semester,
            normalized.section,
            normalized.contactNumber,
            normalized.address,
            normalized.placeOfBirth,
            normalized.barangay,
            normalized.parentName,
            normalized.parentContact,
            normalized.status,
            normalized.submittedAt,
            normalized.reviewedAt,
            normalized.reviewNote,
            null,
            null,
          ],
        );

        await run(
          db,
          `INSERT INTO users (id, userId, username, email, password, firstName, middleName, lastName, studentId, role, status, program, yearLevel, semester, academicYear, createdAt, temporaryPassword)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            crypto.randomUUID(),
            normalized.studentId,
            student.username,
            normalized.email,
            normalized.password,
            normalized.firstName,
            normalized.middleName,
            normalized.lastName,
            normalized.studentId,
            "student",
            "active",
            normalized.program,
            normalized.yearLevel,
            normalized.semester,
            normalized.academicYear,
            new Date().toISOString(),
            student.temporaryPassword,
          ],
        );

      }
    }

    return { inserted: students.length, existing: 0 };
  } finally {
    await new Promise((resolve, reject) => db.close((err) => (err ? reject(err) : resolve())));
  }
}
