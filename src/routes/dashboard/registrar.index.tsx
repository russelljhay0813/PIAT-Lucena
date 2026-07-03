import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/StatCard";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, ClipboardList, BookOpen, Building2, GraduationCap, RefreshCw } from "lucide-react";
import { fetchStudents, fetchEnrollments, fetchSubjects, fetchUsers, fetchEligibleReenrollments, fetchProgramsDetailed } from "@/lib/api";

export const Route = createFileRoute("/dashboard/registrar/")({
  component: RegistrarDashboard,
});

function RegistrarDashboard() {
  const [pendingApps, setPendingApps] = useState(0);
  const [approvedStudents, setApprovedStudents] = useState(0);
  const [pendingEnrollments, setPendingEnrollments] = useState(0);
  const [activeStudents, setActiveStudents] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [assignedFaculty, setAssignedFaculty] = useState(0);
  const [programsCount, setProgramsCount] = useState(0);
  const [eligibleReenrollment, setEligibleReenrollment] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  const loadStats = async () => {
    try {
      const [students, enrollments, subjects, faculty, eligible, programs] = await Promise.all([
        fetchStudents(),
        fetchEnrollments(),
        fetchSubjects(),
        fetchUsers("faculty"),
        fetchEligibleReenrollments(),
        fetchProgramsDetailed(),
      ]);
      setPendingApps(students.filter((s: any) => s.status === "pending").length);
      setApprovedStudents(students.filter((s: any) => s.status === "approved").length);
      const enrolled = enrollments.filter((e: any) => e.status === "enrolled");
      setPendingEnrollments(enrolled.length);
      setActiveStudents(students.filter((s: any) => s.status === "approved").length);
      setTotalSubjects(subjects.length);
      setAssignedFaculty(faculty.filter((f: any) => subjects.some((s: any) => s.facultyId === f.id)).length);
      setProgramsCount(Array.isArray(programs) ? programs.length : 0);
      setEligibleReenrollment(eligible.length);

      const recentEnrollments = enrolled.slice(0, 5).map((e: any) => ({
        type: "enrollment",
        message: `New enrollment recorded`,
        date: e.enrolledAt,
      }));
      setRecentActivities(recentEnrollments);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Registrar Dashboard</h1>
        <p className="text-sm text-muted-foreground">Academic control center</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Pending Applications", value: pendingApps, icon: Users, trend: { value: "Awaiting review", positive: false } },
          { title: "Approved Students", value: approvedStudents, icon: UserCheck, trend: { value: "Active", positive: true } },
          { title: "Pending Enrollments", value: pendingEnrollments, icon: ClipboardList, trend: { value: "Current term", positive: true } },
          { title: "Active Students", value: activeStudents, icon: GraduationCap },
        ].map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Subject Offerings", value: totalSubjects, icon: BookOpen },
          { title: "Assigned Faculty", value: assignedFaculty, icon: Users },
          { title: "Programs Offered", value: programsCount, icon: Building2 },
          { title: "Eligible for Re-enrollment", value: eligibleReenrollment, icon: RefreshCw },
        ].map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.4 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground">Recent Activities</h2>
        <div className="mt-4 space-y-3">
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activities</p>
          ) : (
            recentActivities.map((a, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{a.message}</span>
                <span className="text-xs text-muted-foreground">{a.date ? new Date(a.date).toLocaleString() : ""}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
