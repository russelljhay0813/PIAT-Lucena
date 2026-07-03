import { useEffect, useState, useCallback } from "react";
import { fetchEnrollments as apiFetchEnrollments, createEnrollments, fetchSubjects, fetchCurriculum } from "./api";
import type { Subject } from "./subjects-store";

export interface StudentEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
  academicYear: string;
  semester: string;
  enrolledAt: string;
  status: "enrolled" | "dropped" | "completed";
}

export async function fetchEnrollments(studentId?: string): Promise<StudentEnrollment[]> {
  return apiFetchEnrollments(studentId);
}

export const ENROLLMENT_EVENT = "bwest:enrollments-changed";

function broadcastUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ENROLLMENT_EVENT));
}

export async function enrollStudent(
  studentId: string,
  subjectIds: string[],
  academicYear: string,
  semester: string,
): Promise<StudentEnrollment[]> {
  const enrollments = await createEnrollments({ studentId, subjectIds, academicYear, semester });
  broadcastUpdate();
  return enrollments;
}

export function useEnrollments() {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchEnrollments();
      setEnrollments(data);
    } catch {
      setEnrollments([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(ENROLLMENT_EVENT, onChange);
    return () => window.removeEventListener(ENROLLMENT_EVENT, onChange);
  }, [refresh]);

  return enrollments;
}

export function useStudentEnrollments(studentId: string) {
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);

  const refresh = useCallback(async () => {
    if (!studentId) {
      setEnrollments([]);
      return;
    }
    try {
      const data = await fetchEnrollments(studentId);
      setEnrollments(data);
    } catch {
      setEnrollments([]);
    }
  }, [studentId]);

  useEffect(() => {
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(ENROLLMENT_EVENT, onChange);
    return () => window.removeEventListener(ENROLLMENT_EVENT, onChange);
  }, [refresh]);

  return enrollments;
}

export function useEnrolledSubjects(studentId: string): Subject[] {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!studentId) {
        setSubjects([]);
        return;
      }
      try {
        const [enrolled, allSubjects] = await Promise.all([
          fetchEnrollments(studentId),
          fetchSubjects(),
        ]);
        const enrolledSubjectIds = enrolled.map((e) => e.subjectId);
        setSubjects(allSubjects.filter((s) => enrolledSubjectIds.includes(s.id)));
      } catch {
        setSubjects([]);
      }
    };
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(ENROLLMENT_EVENT, onChange);
    return () => {
      window.removeEventListener(ENROLLMENT_EVENT, onChange);
    };
  }, [studentId]);

  return subjects;
}

export function useStudentSubjectsFromCurriculum(
  program: string,
  yearLevel: string,
  semester: string
): Subject[] {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const refresh = async () => {
      if (!program || !yearLevel || !semester) {
        setSubjects([]);
        return;
      }
      try {
        const [curriculumItems, allSubjects] = await Promise.all([
          fetchCurriculum(undefined, program),
          fetchSubjects(),
        ]);
        const programSubjectCodes = curriculumItems
          .filter((c) => c.yearLevel === yearLevel && c.semester === semester)
          .map((c) => c.subjectCode);
        setSubjects(allSubjects.filter((s) => programSubjectCodes.includes(s.code)));
      } catch {
        setSubjects([]);
      }
    };
    refresh();
  }, [program, yearLevel, semester]);

  return subjects;
}