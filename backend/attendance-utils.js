export function buildAttendanceRecordPayload({
  studentId,
  subjectId,
  date,
  status,
  student,
  subject,
  facultyId,
  time,
  section,
}) {
  const studentName = student
    ? `${student.lastName ?? ""}, ${student.firstName ?? ""}`.trim()
    : String(studentId);
  const subjectCode = subject?.code ?? "";
  const subjectTitle = subject?.title ?? "";
  const program = subject?.program ?? student?.program ?? "";
  const yearLevel = subject?.yearLevel ?? student?.yearLevel ?? "";
  const academicYear = subject?.academicYear ?? "";
  const semester = subject?.semester ?? "";

  return {
    id: crypto.randomUUID(),
    studentId: String(studentId),
    studentName,
    subjectId: String(subjectId),
    subjectCode,
    subjectTitle,
    facultyId: String(facultyId),
    date: String(date),
    time: String(time ?? new Date().toISOString()),
    academicYear,
    semester,
    program,
    yearLevel,
    section: section ? String(section) : "",
    status: String(status),
    updatedAt: Date.now(),
  };
}
