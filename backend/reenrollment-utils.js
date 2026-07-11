export function resolveProgramIdForStudent(programName, programs = []) {
  if (!programName) return null;
  const normalized = String(programName).trim();
  return programs.find((program) => String(program.name).trim() === normalized)?.id ?? null;
}
