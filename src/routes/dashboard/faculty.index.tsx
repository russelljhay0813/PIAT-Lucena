import { createFileRoute, Link } from "@tanstack/react-router";
import { StatCard } from "@/components/StatCard";
import { BookOpen, Users, Clock, CheckCircle, Calendar, BarChart3, Megaphone } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useMemo, useEffect, useState, useCallback } from "react";
import { fetchSubjects, type Subject } from "@/lib/api";
import { fetchEnrollments, type StudentEnrollment } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/api";
import type { GradeEntry } from "@/lib/api";
import { fetchGrades } from "@/lib/api";
import { fetchAttendanceRecords } from "@/lib/api";

export const Route = createFileRoute("/dashboard/faculty/")({
  component: FacultyDashboard,
});

type RecentGrade = {
  studentId: string;
  studentName: string;
  subjectCode: string;
  subjectTitle: string;
  grade: number;
  period?: string;
  createdAt: number;
};

type RecentAttendance = {
  studentId: string;
  studentName: string;
  subjectCode: string;
  date: string;
  status: string;
  createdAt: number;
};

type AnnouncementItem = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: number;
};

function FacultyDashboard() {
  const { user } = useAuth();
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [recentGrades, setRecentGrades] = useState<RecentGrade[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<RecentAttendance[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<AnnouncementItem[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [pendingGradesCount, setPendingGradesCount] = useState(0);

  const today = new Date().toISOString().slice(0, 10);
  const todayToken = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date().getDay()];
  const todayAliases: Record<string, string[]> = {
    MON: ["M", "MW", "MWF", "MTH", "MON"],
    TUE: ["T", "TTH", "TF", "TUE"],
    WED: ["W", "MW", "MWF", "WF", "WED"],
    THU: ["TH", "TTH", "MTH", "THU"],
    FRI: ["F", "MWF", "TF", "WF", "FRI"],
    SAT: ["S", "SAT"],
    SUN: ["SUN"],
  };
  const aliases = todayAliases[todayToken] ?? [];

  const loadFacultyData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const allSubjects = await fetchSubjects();
      const facultySubjects = allSubjects.filter((s) => s.facultyId === user.id);
      setFacultySubjects(facultySubjects);
    } catch {
      setFacultySubjects([]);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacultyData();
  }, [loadFacultyData]);

  const todayClasses = useMemo(
    () =>
      facultySubjects.filter((s) => {
        const upper = s.schedule.toUpperCase();
        return aliases.some((a) => upper.includes(a));
      }),
    [facultySubjects, aliases],
  );

  const totalStudents = useMemo(() => {
    const subjectIds = facultySubjects.map((s) => s.id);
    return enrollments.filter((e) => subjectIds.includes(e.subjectId)).length;
  }, [facultySubjects, enrollments]);

  useEffect(() => {
    const loadEnrollments = async () => {
      try {
        const allEnrollments = await fetchEnrollments();
        setEnrollments(allEnrollments);
      } catch {
        setEnrollments([]);
      }
    };
    loadEnrollments();
  }, []);

  useEffect(() => {
    const loadRecentGrades = async () => {
      try {
        const allGrades = await fetchGrades();
        const subjectIds = facultySubjects.map((s) => s.id);
        const recent = allGrades
          .filter((g) => subjectIds.includes(g.subjectId))
          .sort((a, b) => b.submittedAt - a.submittedAt)
          .slice(0, 5);
        setRecentGrades(recent.map((g) => ({
          studentId: g.studentId,
          studentName: `${g.studentFirstName || ""} ${g.studentLastName || ""}`.trim() || g.studentId,
          subjectCode: g.subjectCode || "",
          subjectTitle: g.subjectTitle || "",
          grade: g.grade,
          period: g.period,
          createdAt: g.submittedAt,
        })));
      } catch {
        setRecentGrades([]);
      }
    };
    if (facultySubjects.length > 0) loadRecentGrades();
  }, [facultySubjects]);

  useEffect(() => {
    const loadTodayAttendance = async () => {
      try {
        const subjectIds = facultySubjects.map((s) => s.id);
        const promises = subjectIds.map((sid) => fetchAttendanceRecords(sid, today));
        const results = await Promise.all(promises);
        const allRecords = results.flat();
        setTodayAttendanceCount(allRecords.length);
        setRecentAttendance(
          allRecords
            .map((r) => ({
              studentId: r.studentId,
              studentName: r.studentId,
              subjectCode: "",
              date: r.date,
              status: r.status,
              createdAt: r.updatedAt,
            }))
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5),
        );
      } catch {
        setTodayAttendanceCount(0);
        setRecentAttendance([]);
      }
    };
    if (facultySubjects.length > 0) loadTodayAttendance();
  }, [facultySubjects, today]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/announcements`).then((r) => r.json());
        const facultyAnns = res
          .filter((a: any) => a.audience === "faculty" || a.audience === "all")
          .sort((a: any, b: any) => b.createdAt - a.createdAt)
          .slice(0, 3);
        setRecentAnnouncements(facultyAnns);
      } catch {
        setRecentAnnouncements([]);
      }
    };
    loadAnnouncements();
  }, []);

  useEffect(() => {
    const loadPendingGrades = async () => {
      try {
        const allGrades = await fetchGrades();
        const subjectIds = facultySubjects.map((s) => s.id);
        const pending = allGrades.filter((g) => subjectIds.includes(g.subjectId) && g.status === "draft");
        setPendingGradesCount(pending.length);
      } catch {
        setPendingGradesCount(0);
      }
    };
    if (facultySubjects.length > 0) loadPendingGrades();
  }, [facultySubjects]);

  const getGradeStatus = (grade: number) => {
    if (grade <= 1.25) return { label: "Excellent", color: "text-green-600" };
    if (grade <= 1.75) return { label: "Very Good", color: "text-blue-600" };
    if (grade <= 2.25) return { label: "Good", color: "text-cyan-600" };
    if (grade <= 3.0) return { label: "Passed", color: "text-yellow-600" };
    return { label: "Failed", color: "text-red-600" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Faculty Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage your classes and academic responsibilities
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Assigned Subjects",
            value: String(facultySubjects.length),
            subtitle: "Current semester",
            icon: BookOpen,
          },
          {
            title: "Total Students",
            value: String(totalStudents),
            subtitle: "Across all subjects",
            icon: Users,
          },
          {
            title: "Classes Today",
            value: String(todayClasses.length),
            subtitle: todayToken,
            icon: Calendar,
          },
          {
            title: "Attendance Submitted Today",
            value: String(todayAttendanceCount),
            subtitle: "Records submitted",
            icon: CheckCircle,
          },
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
            Pending Grade Submissions
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-foreground">{pendingGradesCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Draft grades requiring finalization</p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
            Today's Schedule
          </h2>
          {todayClasses.length === 0 ? (
            <p className="rounded-lg bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
              No classes scheduled for today.
            </p>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 rounded-lg bg-muted/50 px-4 py-3"
                >
                  <div className="flex-1">
                    <span className="font-heading text-sm font-bold text-foreground">{s.code}</span>
                    <span className="ml-2 text-sm text-foreground">{s.title}</span>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.schedule} · {s.room} · {s.units} units
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.program} · {s.yearLevel} · {s.semester}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
            Recently Updated Grades
          </h2>
          {recentGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades updated recently</p>
          ) : (
            <div className="space-y-2">
              {recentGrades.map((g, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-foreground">{g.subjectCode}</span>
                    <span className="text-muted-foreground"> - {g.studentName}</span>
                  </div>
                  <span className={`font-medium ${getGradeStatus(g.grade).color}`}>
                    {g.grade.toFixed(2)} ({g.period})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
            Recently Submitted Attendance
          </h2>
          {recentAttendance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records today</p>
          ) : (
            <div className="space-y-2">
              {recentAttendance.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{a.studentId}</span>
                  <span className={`capitalize ${a.status === "present" ? "text-green-600" : a.status === "late" ? "text-yellow-600" : "text-red-600"}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
            Latest Announcements
          </h2>
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-muted-foreground">No announcements available</p>
          ) : (
            <div className="space-y-2">
              {recentAnnouncements.map((a, i) => (
                <div key={i} className="text-xs">
                  <p className="font-medium text-foreground line-clamp-1">{a.title}</p>
                  <p className="text-muted-foreground line-clamp-2">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}