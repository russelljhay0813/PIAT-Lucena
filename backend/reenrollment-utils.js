export function resolveProgramIdForStudent(programName, programs = []) {
  if (!programName) return null;
  const normalized = String(programName).trim();
  return programs.find((program) => String(program.name).trim() === normalized)?.id ?? null;
}

export function inferReenrollmentTarget(student, currentYear = new Date().getFullYear()) {
  const currentAcademicYear = String(
    student?.academicYear || `${currentYear}-${currentYear + 1}`,
  ).trim();
  const currentYearLevel = String(student?.yearLevel || "").trim();
  const currentSemester = String(student?.semester || "").trim();
  const yearLevels = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

  if (currentSemester === "1st Semester") {
    return {
      academicYear: currentAcademicYear,
      yearLevel: currentYearLevel || yearLevels[0],
      semester: "2nd Semester",
    };
  }

  const yearIndex = yearLevels.indexOf(currentYearLevel);
  const nextYearLevel =
    yearIndex >= 0 && yearIndex < yearLevels.length - 1
      ? yearLevels[yearIndex + 1]
      : currentYearLevel || yearLevels[0];
  const [startYear] = currentAcademicYear.split("-").map((value) => Number(value));

  return {
    academicYear: Number.isFinite(startYear)
      ? `${startYear + 1}-${startYear + 2}`
      : `${currentYear}-${currentYear + 1}`,
    yearLevel: nextYearLevel,
    semester: "1st Semester",
  };
}
