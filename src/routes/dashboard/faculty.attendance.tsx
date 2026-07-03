import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { UserCheck, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { fetchSubjects, type Subject } from "@/lib/api";
import { fetchEnrollments, type StudentEnrollment } from "@/lib/api";
import { fetchStudents, type StudentRegistration } from "@/lib/api";
import { saveAttendance, fetchAttendanceRecords, type AttendanceRecord } from "@/lib/api";

export const Route = createFileRoute("/dashboard/faculty/attendance")({
  component: FacultyAttendance,
});

type AttendanceStatus = "present" | "absent" | "late" | "excused";

interface StudentWithAttendance extends StudentRegistration {
  status: AttendanceStatus;
}

function FacultyAttendance() {
  const { user } = useAuth();
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentWithAttendance[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const loadFacultySubjects = useCallback(async () => {
    if (!user?.id) return;
    try {
      const allSubjects = await fetchSubjects();
      const facultyOnly = allSubjects.filter((s) => s.facultyId === user.id);
      setFacultySubjects(facultyOnly);
    } catch {
      setFacultySubjects([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacultySubjects();
  }, [loadFacultySubjects]);

  const loadStudents = useCallback(async () => {
    try {
      const allEnrollments = await fetchEnrollments();
      const enrolledForSubject = allEnrollments
        .filter((e) => e.subjectId === selectedSubject && e.status === "enrolled")
        .map((e) => e.studentId);
      const allStudents = await fetchStudents();
      setStudents(
        allStudents
          .filter((s) => enrolledForSubject.includes(s.studentId))
          .map((s) => ({ ...s, status: "present" as AttendanceStatus })),
      );
    } catch {
      setStudents([]);
    }
  }, [selectedSubject]);

  const loadAttendance = useCallback(async () => {
    if (!selectedSubject) {
      setAttendanceMap({});
      return;
    }

    try {
      const attendanceRecords = await fetchAttendanceRecords(selectedSubject, selectedDate);
      
      const map = attendanceRecords.reduce((acc, record) => {
        acc[record.studentId] = record.status as AttendanceStatus;
        return acc;
      }, {} as Record<string, AttendanceStatus>);
      setAttendanceMap(map);
    } catch {
      setAttendanceMap({});
    }
  }, [selectedSubject, selectedDate]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const markStudent = useCallback(
    async (studentId: string, status: "present" | "absent" | "late" | "excused") => {
      if (!selectedSubject) return;
      try {
        await saveAttendance({ studentId, subjectId: selectedSubject, date: selectedDate, status });
        setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
      } catch {
      }
    },
    [selectedSubject, selectedDate],
  );

  const studentList = useMemo(
    () =>
      students.map((student) => ({
        ...student,
        status: attendanceMap[student.studentId] ?? "present",
      })),
    [attendanceMap, students],
  );

  const counts = useMemo(() => {
    const p = studentList.filter((s) => s.status === "present").length;
    const a = studentList.filter((s) => s.status === "absent").length;
    const l = studentList.filter((s) => s.status === "late").length;
    const e = studentList.filter((s) => s.status === "excused").length;
    return { present: p, absent: a, late: l, excused: e, total: studentList.length };
  }, [studentList]);

  const selected = facultySubjects.find((s) => s.id === selectedSubject);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Record attendance for your assigned subjects - {new Date(selectedDate).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs"
        />
        <span className="text-xs text-muted-foreground">Select Date</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {facultySubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects assigned yet. Subjects are assigned by the Registrar.</p>
        ) : (
          facultySubjects.map((s) => (
            <Button
              key={s.id}
              variant={selectedSubject === s.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(s.id)}
            >
              {s.code} - {s.title}
            </Button>
          ))
        )}
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-accent" />
              <h2 className="font-heading text-sm font-semibold text-card-foreground">
                {selected.code} — {selected.title}
              </h2>
            </div>

            <div className="mb-4 flex gap-4 text-xs">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" /> Present: {counts.present}
              </span>
              <span className="flex items-center gap-1 text-yellow-500">
                <Clock className="h-3 w-3" /> Late: {counts.late}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" /> Absent: {counts.absent}
              </span>
              <span className="flex items-center gap-1 text-blue-500">
                <AlertCircle className="h-3 w-3" /> Excused: {counts.excused}
              </span>
              <span className="text-muted-foreground">Total: {counts.total}</span>
            </div>

            <div className="space-y-2">
              {studentList.map((student) => (
                <div
                  key={student.studentId}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {student.firstName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={student.status === "present" ? "default" : "outline"}
                      className={student.status === "present" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                      onClick={() => markStudent(student.studentId, "present")}
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" /> P
                    </Button>
                    <Button
                      size="sm"
                      variant={student.status === "late" ? "default" : "outline"}
                      className={student.status === "late" ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                      onClick={() => markStudent(student.studentId, "late")}
                    >
                      <Clock className="mr-1 h-3 w-3" /> L
                    </Button>
                    <Button
                      size="sm"
                      variant={student.status === "absent" ? "default" : "outline"}
                      className={student.status === "absent" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                      onClick={() => markStudent(student.studentId, "absent")}
                    >
                      <XCircle className="mr-1 h-3 w-3" /> A
                    </Button>
                    <Button
                      size="sm"
                      variant={student.status === "excused" ? "default" : "outline"}
                      className={student.status === "excused" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}
                      onClick={() => markStudent(student.studentId, "excused")}
                    >
                      <AlertCircle className="mr-1 h-3 w-3" /> E
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}