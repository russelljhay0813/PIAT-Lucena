import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Users, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchSubjects, type Subject } from "@/lib/api";
import { fetchEnrollments, type StudentEnrollment } from "@/lib/api";
import { fetchStudents, type StudentRegistration } from "@/lib/api";
import { fetchGrades, fetchAttendanceRecords, type GradeEntry } from "@/lib/api";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/dashboard/faculty/classes")({
  component: FacultyClassList,
});

function FacultyClassList() {
  const { user } = useAuth();
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [enrolledStudents, setEnrolledStudents] = useState<StudentRegistration[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState<Record<string, string>>({});

  const loadFacultySubjects = useCallback(async () => {
    if (!user?.id) return;
    try {
      const allSubjects = await fetchSubjects();
      setFacultySubjects(allSubjects.filter((s) => s.facultyId === user.id));
    } catch {
      setFacultySubjects([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacultySubjects();
  }, [loadFacultySubjects]);

  useEffect(() => {
    if (!selectedSubject) {
      setEnrolledStudents([]);
      setGrades([]);
      setAttendanceStatus({});
      return;
    }

    const loadData = async () => {
      try {
        const allEnrollments = await fetchEnrollments();
        const enrolledForSubject = allEnrollments
          .filter((e) => e.subjectId === selectedSubject && e.status === "enrolled")
          .map((e) => e.studentId);
        const allStudents = await fetchStudents();
        setEnrolledStudents(allStudents.filter((s) => enrolledForSubject.includes(s.studentId)));
        
        const allGrades = await fetchGrades(selectedSubject);
        setGrades(allGrades);

        const statusMap: Record<string, string> = {};
        for (const studentId of enrolledForSubject) {
          try {
            const records = await fetchAttendanceRecords(selectedSubject, undefined, studentId);
            const latest = records.sort((a, b) => b.updatedAt - a.updatedAt)[0];
            statusMap[studentId] = latest ? latest.status.charAt(0).toUpperCase() + latest.status.slice(1) : "—";
          } catch {
            statusMap[studentId] = "—";
          }
        }
        setAttendanceStatus(statusMap);
      } catch {
        setEnrolledStudents([]);
        setGrades([]);
        setAttendanceStatus({});
      }
    };
    loadData();
  }, [selectedSubject]);

  const getStudentGrade = (studentId: string) => {
    const studentGrade = grades.find((g) => g.studentId === studentId && g.type === "overall");
    return studentGrade ? studentGrade.grade.toFixed(2) : "—";
  };

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return enrolledStudents;
    return enrolledStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [enrolledStudents, searchQuery]);

  const selectedSubjectInfo = facultySubjects.find((s) => s.id === selectedSubject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Class List</h1>
        <p className="text-sm text-muted-foreground">
          View students enrolled in your assigned subjects
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {facultySubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
        ) : (
          facultySubjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedSubject === s.id
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {s.code}
            </button>
          ))
        )}
      </div>

      {selectedSubjectInfo && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-sm font-semibold text-card-foreground">
                {selectedSubjectInfo.code} - {selectedSubjectInfo.title}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedSubjectInfo.schedule} · {selectedSubjectInfo.room}
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students..."
                className="pl-8 text-xs h-8"
              />
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Student ID</th>
                    <th className="pb-2 pr-4">Student Name</th>
                    <th className="pb-2 pr-4">Program</th>
                    <th className="pb-2 pr-4">Year Level</th>
                    <th className="pb-2 pr-4">Attendance Status</th>
                    <th className="pb-2">Current Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.studentId} className="border-b border-border/50">
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {student.studentId}
                      </td>
                      <td className="py-2 pr-4 text-foreground">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{student.program || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{student.yearLevel || "—"}</td>
                       <td className="py-2 pr-4 text-muted-foreground">{attendanceStatus[student.studentId] || "—"}</td>
                      <td className="py-2 pr-4 font-medium text-foreground">{getStudentGrade(student.studentId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}