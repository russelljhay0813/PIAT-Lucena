import { useEffect, useState, useCallback } from "react";
import {
  fetchStudents,
  createStudent,
  updateStudent,
  loginStudent,
  fetchCurriculum,
  fetchSubjects,
  createEnrollments,
  type StudentRegistration as ApiStudentRegistration,
  type StudentRegistrationPayload,
} from "./api";

export type RegistrationStatus = "pending" | "approved" | "rejected";

export interface StudentRegistration extends ApiStudentRegistration {}

export const REGISTRATIONS_EVENT = "bwest:registrations-changed";

function broadcastUpdate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(REGISTRATIONS_EVENT));
}

export async function getRegistrations(): Promise<StudentRegistration[]> {
  return fetchStudents();
}

export async function getPending(): Promise<StudentRegistration[]> {
  return fetchStudents("pending");
}

export async function getApprovedStudents(): Promise<StudentRegistration[]> {
  return fetchStudents("approved");
}

export async function findApprovedByEmail(email: string, password: string): Promise<StudentRegistration | null> {
  try {
    const student = await loginStudent(email, password);
    return student.status === "approved" ? student : null;
  } catch {
    return null;
  }
}

export async function emailExists(email: string): Promise<boolean> {
  const all = await getRegistrations();
  const normalized = email.trim().toLowerCase();
  return all.some((r) => r.email.toLowerCase() === normalized);
}

export async function submitRegistration(
  data: StudentRegistrationPayload,
): Promise<StudentRegistration> {
  const created = await createStudent(data);
  broadcastUpdate();
  return created;
}

export async function approveRegistration(id: string, note?: string) {
  const all = await getRegistrations();
  const reg = all.find((r) => r.id === id);
  if (!reg) return;
  
  await updateStudent(reg.studentId, {
    status: "approved",
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  });
  
  const studentYearLevel = reg.yearLevel || "1st Year";
  const studentSemester = reg.semester || "1st Semester";
  const studentAcademicYear = reg.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  
  try {
    const [curriculumItems, allSubjects] = await Promise.all([
      fetchCurriculum(undefined, reg.program),
      fetchSubjects(),
    ]);
    
    const programSubjects = curriculumItems
      .filter((c) => c.yearLevel === studentYearLevel && c.semester === studentSemester)
      .map((c) => c.subjectCode);
    
    const subjectIds = allSubjects
      .filter((s) => programSubjects.includes(s.code))
      .map((s) => s.id);
    
    if (subjectIds.length > 0) {
      await createEnrollments({
        studentId: reg.studentId,
        subjectIds,
        academicYear: studentAcademicYear,
        semester: studentSemester,
      });
    }
  } catch {
    // Enrollment auto-creation failed, but registration is still approved
  }
  
  broadcastUpdate();
}

export async function rejectRegistration(id: string, note?: string) {
  const all = await getRegistrations();
  const reg = all.find((r) => r.id === id);
  if (!reg) return;
  await updateStudent(reg.studentId, {
    status: "rejected",
    reviewedAt: new Date().toISOString(),
    reviewNote: note,
  });
  broadcastUpdate();
}

export function useRegistrations() {
  const [registrations, setRegistrations] = useState<StudentRegistration[]>([]);

  const refresh = useCallback(async () => {
    try {
      setRegistrations(await getRegistrations());
    } catch {
      setRegistrations([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(REGISTRATIONS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(REGISTRATIONS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return registrations;
}