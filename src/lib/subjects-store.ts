import { useEffect, useState, useCallback } from "react";
import { fetchSubjects as apiFetchSubjects, createSubject as apiCreateSubject, updateSubjectApi as apiUpdateSubject, deleteSubjectApi as apiDeleteSubject, fetchCurriculum } from "./api";

export interface Subject {
  id: string;
  code: string;
  title: string;
  units: number;
  schedule: string;
  room: string;
  instructor: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
  facultyId?: string;
  addedAt: number;
}

export interface CurriculumItem {
  id: string;
  programId: string;
  programName?: string;
  yearLevel: string;
  semester: string;
  subjectCode: string;
  subjectTitle: string;
  units: number;
}

const EVENT = "bwest:subjects-changed";

function broadcastUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export async function fetchSubjects(): Promise<Subject[]> {
  return apiFetchSubjects();
}

export async function createSubject(subject: Omit<Subject, "id" | "addedAt">): Promise<Subject> {
  const created = await apiCreateSubject({
    code: subject.code,
    title: subject.title,
    units: subject.units,
    schedule: subject.schedule,
    room: subject.room,
    instructor: subject.instructor,
    program: subject.program,
    yearLevel: subject.yearLevel,
    semester: subject.semester,
    facultyId: subject.facultyId,
    academicYear: subject.academicYear,
  });
  broadcastUpdate();
  return created;
}

export async function addSubject(subject: Omit<Subject, "id" | "addedAt">): Promise<Subject> {
  const created = await apiCreateSubject({
    code: subject.code,
    title: subject.title,
    units: subject.units,
    schedule: subject.schedule,
    room: subject.room,
    instructor: subject.instructor,
    program: subject.program,
    yearLevel: subject.yearLevel,
    semester: subject.semester,
    facultyId: subject.facultyId,
    academicYear: subject.academicYear,
  });
  broadcastUpdate();
  return created;
}

export async function updateSubject(
  id: string,
  patch: Partial<Omit<Subject, "id" | "addedAt">>,
): Promise<Subject | null> {
  const updated = await apiUpdateSubject(id, patch);
  if (updated) {
    broadcastUpdate();
    return updated as Subject;
  }
  return null;
}

export async function removeSubject(id: string): Promise<void> {
  await apiDeleteSubject(id);
  broadcastUpdate();
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchSubjects();
      setSubjects(data);
    } catch {
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [refresh]);

  return subjects;
}

export function getSubjectsByProgramYearSemester(
  subjects: Subject[],
  program: string,
  yearLevel: string,
  semester: string,
): Subject[] {
  return subjects.filter(
    (s) => s.program === program && s.yearLevel === yearLevel && s.semester === semester,
  );
}

export const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

export function useCurriculum() {
  const [curriculum, setCurriculum] = useState<CurriculumItem[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchCurriculum();
      setCurriculum(data);
    } catch {
      setCurriculum([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return curriculum;
}

export async function getCurriculumSubjects(
  program: string,
  yearLevel: string,
  semester: string,
): Promise<{ code: string; title: string; units: number }[]> {
  const items = await fetchCurriculum(undefined, program);
  return items
    .filter((c) => c.yearLevel === yearLevel && c.semester === semester)
    .map((c) => ({ code: c.subjectCode, title: c.subjectTitle, units: c.units }));
}
