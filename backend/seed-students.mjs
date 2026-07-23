import { seedStudentRecords } from "./student-data-generator.js";

const result = await seedStudentRecords({
  academicYear: "2026-2027",
  activeSemester: "1st Semester",
});
console.log(JSON.stringify(result));
