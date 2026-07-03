import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/StatCard";
import { BookOpen, Calendar, Clock, TrendingUp, User, MapPin, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useEnrolledSubjects, useStudentSubjectsFromCurriculum } from "@/lib/enrollment-store";
import { useRegistrations } from "@/lib/registrations-store";
import { useGrades } from "@/lib/grades-store";
import { useEffect, useState } from "react";
import { fetchAttendanceRecords } from "@/lib/api";

export const Route = createFileRoute("/dashboard/student/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();
  const enrolledSubjects = useEnrolledSubjects(user?.studentId ?? "");
  const allStudents = useRegistrations();
  const grades = useGrades();
  const currentStudent = allStudents.find((s) => s.studentId === user?.studentId || s.id === user?.id);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  
  const curriculumSubjects = useStudentSubjectsFromCurriculum(
    user?.program ?? "",
    user?.yearLevel ?? "",
    user?.semester ?? ""
  );
  
  const displaySubjects = enrolledSubjects.length > 0 ? enrolledSubjects : curriculumSubjects;
  const totalUnits = displaySubjects.reduce((s, sub) => s + sub.units, 0);

  const todaySchedule = displaySubjects.filter((s) => {
    const days = ["SU", "M", "T", "W", "TH", "F", "SA"];
    const jsDay = new Date().getDay();
    const todayToken = days[jsDay];

    const todayAliases: Record<string, string[]> = {
      MON: ["M", "MW", "MWF"],
      TUE: ["T", "TTH"],
      WED: ["W", "MW", "MWF"],
      THU: ["TH", "TTH"],
      FRI: ["F", "MWF"],
      SAT: ["S"],
      SUN: [],
    };
    const aliases = todayAliases[todayToken] || [];
    return aliases.some((a) => s.schedule?.toUpperCase().includes(a));
  });

  useEffect(() => {
    const loadAttendance = async () => {
      if (!user?.studentId || displaySubjects.length === 0) {
        setAttendanceRate(null);
        return;
      }
      try {
        const subjectIds = displaySubjects.map((s) => s.id);
        const records = await Promise.all(
          subjectIds.map((id) => fetchAttendanceRecords(id, undefined, user!.studentId))
        );
        const allRecords = records.flat();
        const present = allRecords.filter((r) => r.status === "present" || r.status === "late").length;
        const total = allRecords.length;
        setAttendanceRate(total > 0 ? Math.round((present / total) * 100) : null);
      } catch {
        setAttendanceRate(null);
      }
    };
    loadAttendance();
  }, [user?.studentId, displaySubjects]);

  const gradedSubjects = enrolledSubjects.filter((s) =>
    grades.some((g) => g.studentId === user?.studentId && g.subjectId === s.id && g.status !== "draft")
  ).length;

  const subjectCount = enrolledSubjects.length > 0 ? enrolledSubjects.length : curriculumSubjects.length;

  const displayAcademicYear = user?.academicYear || currentStudent?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const displaySemester = user?.semester || currentStudent?.semester || "1st Semester";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h1 className="font-heading text-xl font-bold text-foreground">Student Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Academic year {displayAcademicYear}, {displaySemester}
        </p>
        {user && (
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Student ID</p>
              <p className="font-mono text-sm font-medium text-foreground">{user.studentId || user.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Program</p>
              <p className="text-sm font-medium text-foreground">{user.program || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Year Level</p>
              <p className="text-sm font-medium text-foreground">{user.yearLevel || "—"}</p>
            </div>
          </div>
        )}
        {user && (
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Semester</p>
              <p className="text-sm font-medium text-foreground">{user.semester || currentStudent?.semester || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Academic Year</p>
              <p className="text-sm font-medium text-foreground">{user.academicYear || currentStudent?.academicYear || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Enrollment Status</p>
              <p className="text-sm font-medium text-success">Active</p>
            </div>
          </div>
        )}

        {currentStudent && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-3.5 w-3.5 text-accent" />
                <h3 className="font-heading text-xs font-semibold text-muted-foreground">Personal Information</h3>
              </div>
              <div className="space-y-1 text-xs">
                <p><span className="text-muted-foreground">Email:</span> <span className="text-foreground">{currentStudent.email}</span></p>
                <p><span className="text-muted-foreground">Contact:</span> <span className="text-foreground">{currentStudent.contactNumber || "—"}</span></p>
                <p><span className="text-muted-foreground">Gender:</span> <span className="text-foreground">{currentStudent.gender || "—"}</span></p>
              </div>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-3.5 w-3.5 text-accent" />
                <h3 className="font-heading text-xs font-semibold text-muted-foreground">Home Address</h3>
              </div>
              <p className="text-xs text-foreground">{currentStudent.address || "—"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Subjects Enrolled", value: subjectCount, subtitle: `${totalUnits} total units`, icon: BookOpen },
          { title: "Units Enrolled", value: totalUnits, subtitle: `${subjectCount} subjects`, icon: Calendar },
          { title: "Graded Subjects", value: gradedSubjects, subtitle: `${Math.round((gradedSubjects / Math.max(1, subjectCount)) * 100)}% complete`, icon: ClipboardList },
          { title: "Attendance Rate", value: attendanceRate !== null ? `${attendanceRate}%` : "—", subtitle: attendanceRate !== null ? (attendanceRate >= 90 ? "Excellent" : attendanceRate >= 75 ? "Good" : "Needs improvement") : "No records yet", icon: TrendingUp },
        ].map((stat, i) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Today's Schedule</h2>
        </div>
        {displaySubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No classes scheduled today.</p>
        ) : (
          <div className="space-y-3">
            {todaySchedule.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No classes scheduled today.</p>
            ) : (
              todaySchedule.map((s) => (
                <div key={s.id} className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="flex-1">
                    <span className="font-heading text-sm font-bold text-foreground">{s.code}</span>
                    <span className="ml-2 text-sm text-foreground">{s.title}</span>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.schedule} · {s.room} · {s.units} units
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Enrolled Subjects</h2>
        </div>
        {displaySubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No subjects are currently assigned for your program and semester.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Code</th>
                  <th className="pb-2 pr-4">Subject</th>
                  <th className="pb-2 pr-4">Units</th>
                  <th className="pb-2 pr-4">Schedule</th>
                  <th className="pb-2 pr-4">Room</th>
                  <th className="pb-2">Instructor</th>
                </tr>
              </thead>
              <tbody>
                {displaySubjects.map((s) => (
                  <tr key={s.id} className="border-b border-muted/50 last:border-0">
                    <td className="py-3 pr-4 font-heading font-bold text-foreground">{s.code}</td>
                    <td className="py-3 pr-4 text-foreground">{s.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.units}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.schedule}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.room}</td>
                    <td className="py-3 text-muted-foreground">{s.instructor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}