import Constants from "expo-constants";
import { getAuthData, getAuthToken } from "./storage";

const API_BASE = String(
  Constants.expoConfig?.extra?.API_BASE ??
    process.env.EXPO_PUBLIC_API_BASE ??
    "http://localhost:4000",
);
const REQUEST_TIMEOUT = 20000;

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const token = await getAuthToken();
    const authData = token ? await getAuthData() : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    if (authData?.user) {
      headers["x-user-id"] = authData.user.id;
      headers["x-user-role"] = authData.user.role;
      if (authData.user.studentId) {
        headers["x-user-student-id"] = authData.user.studentId;
      }
    }

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      ...opts,
      signal: controller.signal,
    });

    if (!response.ok) {
      let payload: { error?: string } | null = null;
      try {
        payload = await response.json();
      } catch {
        // ignore
      }
      throw new Error(payload?.error ?? response.statusText);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  id: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
  studentId?: string;
}

export interface UserProfile {
  id: string;
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
  studentId?: string;
}

export interface SubjectOffering {
  id: string;
  code: string;
  title: string;
  schedule: string;
  room: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  facultyId?: string;
  academicYear?: string;
}

export interface StudentRecord {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
}

export interface AttendancePayload {
  studentId: string;
  subjectId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
}

export interface AttendanceBulkPayload extends AttendancePayload {
  localId?: string;
}

export interface BulkAttendanceResult {
  localId?: string;
  id?: string;
  status: "created" | "updated" | "failed";
  error?: string;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>("/api/users/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchUserProfile(): Promise<UserProfile> {
  return request<UserProfile>("/api/users/profile");
}

export async function fetchFacultySubjects(): Promise<SubjectOffering[]> {
  return request<SubjectOffering[]>("/api/faculty/subjects");
}

export async function fetchSubjectStudents(subjectId: string): Promise<StudentRecord[]> {
  return request<StudentRecord[]>(
    `/api/faculty/subjects/${encodeURIComponent(subjectId)}/students`,
  );
}

export async function saveAttendance(attendance: AttendancePayload) {
  return request<AttendancePayload>("/api/attendance", {
    method: "POST",
    body: JSON.stringify(attendance),
  });
}

export async function saveAttendanceBulk(
  records: AttendanceBulkPayload[],
): Promise<BulkAttendanceResult[]> {
  return request<BulkAttendanceResult[]>("/api/attendance/bulk", {
    method: "POST",
    body: JSON.stringify({ records }),
  });
}
