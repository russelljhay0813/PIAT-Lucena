const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const REQUEST_TIMEOUT = 15000;

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const storedSession = typeof window !== "undefined" ? window.localStorage.getItem("piat-auth-user") : null;
    const authUser = storedSession ? JSON.parse(storedSession) : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(opts.headers ?? {}),
    };

    if (authUser?.role) {
      headers["x-user-role"] = authUser.role;
    }
    if (authUser?.id) {
      headers["x-user-id"] = authUser.id;
    }
    if (authUser?.studentId) {
      headers["x-user-student-id"] = authUser.studentId;
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
        // ignore parse errors
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

export interface SubjectPayload {
  code: string;
  title: string;
  units: number;
  schedule: string;
  room: string;
  instructor: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  facultyId?: string;
  academicYear?: string;
}

export interface StudentRegistrationPayload {
  firstName: string;
  middleName?: string | null;
  suffix?: string | null;
  lastName: string;
  email: string;
  password: string;
  gender?: string | null;
  dob?: string | null;
  age?: number | null;
  civilStatus?: string | null;
  nationality?: string | null;
  religion?: string | null;
  educationLevel: "JHS" | "SHS" | "College";
  program: string;
  yearLevel: string;
  gradeLevel: string;
  strand: string;
  studentType?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  section?: string | null;
  previousSchool?: string | null;
  lastGrade?: string | null;
  contactNumber?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  fatherContact?: string | null;
  motherName?: string | null;
  motherOccupation?: string | null;
  motherContact?: string | null;
  guardianName?: string | null;
  guardianOccupation?: string | null;
  guardianContact?: string | null;
  guardianRelation?: string | null;
  parentName?: string | null;
  parentContact?: string | null;
  parentAddress?: string | null;
  parentRelationship?: string | null;
  placeOfBirth?: string | null;
  barangay?: string | null;
  emergencyName?: string | null;
  emergencyContact?: string | null;
  emergencyAddress?: string | null;
  emergencyRelation?: string | null;
  status?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GradePayload {
  studentId: string;
  subjectId: string;
  grade: number;
  remarks?: string;
  period?: "prelim" | "midterm" | "final";
  type?: "activity" | "quiz" | "exam" | "overall";
  component?: string;
  status?: "draft" | "submitted" | "finalized";
}

export interface AttendancePayload {
  studentId: string;
  subjectId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  subjectId: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  updatedAt: number;
}

export async function fetchAttendance(subjectId: string, date: string) {
  const query = new URLSearchParams({ subjectId, date });
  return request<AttendanceRecord[]>(`/api/attendance?${query.toString()}`);
}

export async function saveAttendance(attendance: AttendancePayload) {
  return request<AttendanceRecord>("/api/attendance", {
    method: "POST",
    body: JSON.stringify(attendance),
  });
}

export async function fetchSubjects() {
  return request<Subject[]>("/api/subjects");
}

export async function createSubject(subject: SubjectPayload) {
  return request<Subject>("/api/subjects", {
    method: "POST",
    body: JSON.stringify(subject),
  });
}

export async function updateSubjectApi(id: string, subject: Partial<SubjectPayload>) {
  return request<Subject>(`/api/subjects/${id}`, {
    method: "PUT",
    body: JSON.stringify(subject),
  });
}

export async function deleteSubjectApi(id: string) {
  return request<void>(`/api/subjects/${id}`, {
    method: "DELETE",
  });
}

export async function fetchStudents(status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<StudentRegistration[]>(`/api/students${query}`);
}

export async function fetchStudentById(studentId: string) {
  return request<StudentRegistration>(`/api/students/${encodeURIComponent(studentId)}`);
}

export async function createStudent(student: StudentRegistrationPayload) {
  return request<StudentRegistration>("/api/students", {
    method: "POST",
    body: JSON.stringify(student),
  });
}

export async function updateStudent(studentId: string, patch: Partial<StudentRegistrationPayload & { status?: string; reviewedAt?: string; reviewNote?: string }>) {
  return request<StudentRegistration>(`/api/students/${encodeURIComponent(studentId)}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function loginStudent(email: string, password: string) {
  return request<StudentRegistration>("/api/students/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email: string, password: string): Promise<UserAccount | null> {
  try {
    return await request<UserAccount>("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return null;
  }
}

export async function fetchGrades(subjectId?: string, studentId?: string) {
  const params = new URLSearchParams();
  if (subjectId) params.set("subjectId", subjectId);
  if (studentId) params.set("studentId", studentId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<GradeEntry[]>(`/api/grades${query}`);
}

export async function fetchAttendanceRecords(subjectId?: string, date?: string, studentId?: string): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (subjectId) params.set("subjectId", subjectId);
  if (date) params.set("date", date);
  if (studentId) params.set("studentId", studentId);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<AttendanceRecord[]>(`/api/attendance${query}`);
}

export async function saveGrade(grade: GradePayload) {
  return request<GradeEntry>("/api/grades", {
    method: "POST",
    body: JSON.stringify(grade),
  });
}

export async function deleteGradeApi(studentId: string, subjectId: string) {
  return request<void>(`/api/grades?studentId=${encodeURIComponent(studentId)}&subjectId=${encodeURIComponent(subjectId)}`, {
    method: "DELETE",
  });
}



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

export interface StudentRegistration {
  id: string;
  studentId: string;
  firstName: string;
  middleName?: string | null;
  suffix?: string | null;
  lastName: string;
  email: string;
  password: string;
  gender?: string | null;
  dob?: string | null;
  age?: number | null;
  civilStatus?: string | null;
  nationality?: string | null;
  religion?: string | null;
  educationLevel: "JHS" | "SHS" | "College";
  program: string;
  yearLevel: string;
  gradeLevel: string;
  strand: string;
  studentType?: string | null;
  academicYear?: string | null;
  semester?: string | null;
  section?: string | null;
  previousSchool?: string | null;
  lastGrade?: string | null;
  contactNumber: string;
  address: string;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  fatherName?: string | null;
  fatherOccupation?: string | null;
  fatherContact?: string | null;
  motherName?: string | null;
  motherOccupation?: string | null;
  motherContact?: string | null;
  guardianName?: string | null;
  guardianOccupation?: string | null;
  guardianContact?: string | null;
  guardianRelation?: string | null;
  parentName?: string | null;
  parentContact?: string | null;
  parentAddress?: string | null;
  emergencyName?: string | null;
  emergencyContact?: string | null;
  emergencyAddress?: string | null;
  emergencyRelation?: string | null;
  parentRelationship?: string | null;
  placeOfBirth?: string | null;
  barangay?: string | null;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category?: string;
  audience?: string;
  subjectId?: string | null;
  pinned?: boolean;
  authorName?: string;
  authorRole?: string;
  createdAt: number;
  datePosted?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  relatedId?: string | null;
}

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
  subjectCode?: string;
  subjectTitle?: string;
  studentFirstName?: string;
  studentLastName?: string;
}

export interface UserAccount {
  id: string;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  role: "admin" | "faculty" | "registrar" | "student";
  status: "active" | "inactive";
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
  createdAt: string;
  temporaryPassword?: string;
  studentId?: string;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  details: string;
  role: string;
  createdAt: string;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  subjectId: string;
  academicYear: string;
  semester: string;
  enrolledAt: string;
  status: "enrolled" | "dropped" | "completed";
}

export async function fetchUsers(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : "";
  return request<UserAccount[]>(`/api/users${query}`);
}

export async function fetchActivityLogs() {
  return request<ActivityLogEntry[]>("/api/activity-logs");
}

export async function createUser(user: {
  role: string;
  studentId?: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  suffix?: string | null;
  gender?: string | null;
  email?: string;
  password?: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
}) {
  return request<UserAccount>("/api/users", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export async function fetchEnrollments(studentId?: string, academicYear?: string, semester?: string) {
  const params = new URLSearchParams();
  if (studentId) params.set("studentId", studentId);
  if (academicYear) params.set("academicYear", academicYear);
  if (semester) params.set("semester", semester);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<StudentEnrollment[]>(`/api/enrollments${query}`);
}

export async function createEnrollments(data: {
  studentId: string;
  subjectIds: string[];
  academicYear: string;
  semester: string;
}) {
  return request<StudentEnrollment[]>("/api/enrollments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchPrograms() {
  return request<string[]>("/api/programs");
}

export interface Program {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
}

export async function fetchProgramsDetailed() {
  return request<Program[]>("/api/programs/detailed");
}

export interface RegistrarDashboardStats {
  pendingApplications: number;
  approvedStudents: number;
  pendingEnrollments: number;
  activeStudents: number;
  totalSubjects: number;
  assignedFaculty: number;
  programsOffered: number;
  eligibleReenrollment: number;
  recentActivities: { type: string; message: string; date: string }[];
}

export async function fetchRegistrarDashboardStats() {
  return request<RegistrarDashboardStats>("/api/dashboard/registrar");
}

export async function createProgram(program: { name: string; description?: string }) {
  return request<Program>("/api/programs", {
    method: "POST",
    body: JSON.stringify(program),
  });
}

export async function updateProgramApi(id: string, program: Partial<{ name: string; description: string }>) {
  return request<Program>(`/api/programs/${id}`, {
    method: "PUT",
    body: JSON.stringify(program),
  });
}

export async function deleteProgramApi(id: string) {
  return request<void>(`/api/programs/${id}`, {
    method: "DELETE",
  });
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

export async function fetchCurriculum(programId?: string, programName?: string) {
  const params = new URLSearchParams();
  if (programId) params.set("programId", programId);
  if (programName) params.set("program", programName);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<CurriculumItem[]>(`/api/curriculum${query}`);
}

export async function createCurriculumItem(item: { programId: string; yearLevel: string; semester: string; subjectCode: string; subjectTitle: string; units: number }) {
  return request<CurriculumItem>("/api/curriculum", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function deleteCurriculumItem(id: string) {
  return request<void>(`/api/curriculum/${id}`, {
    method: "DELETE",
  });
}

export async function fetchEligibleReenrollments() {
  return request<any[]>("/api/students/eligible-for-reenrollment");
}

export async function reenrollStudent(studentId: string, data: { nextSemester?: string; nextYear?: string; nextAcademicYear?: string }) {
  return request<any>(`/api/students/${encodeURIComponent(studentId)}/reenroll`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchReportEnrollment() {
  return request<any>("/api/reports/enrollment");
}

export async function fetchReportFacultyLoad() {
  return request<any[]>("/api/reports/faculty-load");
}

export async function fetchReportStudents() {
  return request<any[]>("/api/reports/students");
}

export async function fetchReportCurriculum() {
  return request<any[]>("/api/reports/curriculum");
}

export async function fetchAnnouncements() {
  return request<Announcement[]>("/api/announcements");
}

export async function fetchNotifications(userId: string) {
  return request<NotificationItem[]>(`/api/notifications?userId=${encodeURIComponent(userId)}`);
}

export async function createAnnouncement(announcement: { title: string; body: string; audience: string; authorName: string; authorRole: string }) {
  return request<any>("/api/announcements", {
    method: "POST",
    body: JSON.stringify(announcement),
  });
}

export async function deleteAnnouncementApi(id: string) {
  return request<void>(`/api/announcements?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}