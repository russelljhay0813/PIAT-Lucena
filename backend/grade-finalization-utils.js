export function buildGradeFinalizationQuery(student, filters = {}) {
  const conditions = ["g.studentId = ?"];
  const params = [String(student?.studentId || "")];

  conditions.push("g.status != ?");
  params.push("finalized");

  if (filters.period) {
    conditions.push("g.period = ?");
    params.push(String(filters.period));
  }

  if (filters.subjectId) {
    conditions.push("g.subjectId = ?");
    params.push(String(filters.subjectId));
  }

  const effectiveAcademicYear = filters.academicYear ?? student?.academicYear;
  if (effectiveAcademicYear) {
    conditions.push("s.academicYear = ?");
    params.push(String(effectiveAcademicYear));
  }

  const effectiveSemester = filters.semester ?? student?.semester;
  if (effectiveSemester) {
    conditions.push("s.semester = ?");
    params.push(String(effectiveSemester));
  }

  const sql = `SELECT g.id, g.studentId, g.subjectId, g.period, g.status FROM grades g JOIN enrollments s ON s.studentId = g.studentId AND s.subjectId = g.subjectId WHERE ${conditions.join(" AND ")}`;
  return { sql, params };
}
