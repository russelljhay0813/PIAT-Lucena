import { useEffect, useState, useCallback } from "react";
import { fetchGrades, saveGrade, deleteGradeApi } from "./api";

export interface GradeEntry {
  id: string;
  studentId: string;
  subjectId: string;
  grade: number;
  remarks?: string;
  submittedAt: number;
  period?: "prelim" | "midterm" | "final";
  type?: "activity" | "quiz" | "exam" | "overall";
  component?: string;
  status?: "draft" | "submitted" | "finalized";
}

const EVENT = "bwest:grades-changed";

function broadcastUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export async function addOrUpdateGrade(
  studentId: string,
  subjectId: string,
  grade: number,
  remarks?: string,
  period?: "prelim" | "midterm" | "final",
  type?: "activity" | "quiz" | "exam" | "overall",
  component?: string,
): Promise<GradeEntry> {
  const saved = await saveGrade({ studentId, subjectId, grade, remarks });
  if (period && type) {
    saved.period = period;
    saved.type = type;
    saved.component = component;
    saved.status = "draft";
  }
  broadcastUpdate();
  return saved;
}

export async function removeGrade(studentId: string, subjectId: string) {
  await deleteGradeApi(studentId, subjectId);
  broadcastUpdate();
}

export function getGradesBySubject(grades: GradeEntry[], subjectId: string): GradeEntry[] {
  return grades.filter((g) => g.subjectId === subjectId);
}

export function getGradeByStudentAndSubject(
  grades: GradeEntry[],
  studentId: string,
  subjectId: string,
): GradeEntry | null {
  return grades.find((g) => g.studentId === studentId && g.subjectId === subjectId) ?? null;
}

export function useGrades() {
  const [grades, setGrades] = useState<GradeEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchGrades();
      setGrades(data);
    } catch {
      setGrades([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
    };
  }, [refresh]);

  return grades;
}

export function useStudentGrades(studentId: string) {
  const [grades, setGrades] = useState<GradeEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!studentId) {
      setGrades([]);
      return;
    }
    try {
      const data = await fetchGrades(undefined, studentId);
      setGrades(data);
    } catch {
      setGrades([]);
    }
  }, [studentId]);

  useEffect(() => {
    refresh();
    const onChange = () => {
      refresh();
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
    };
  }, [refresh]);

  return grades;
}