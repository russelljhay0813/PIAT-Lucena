import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/StatCard";
import { Users, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useUsers } from "@/lib/users-store";
import { useRegistrations } from "@/lib/registrations-store";
import { fetchSubjects } from "@/lib/api";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const users = useUsers();
  const registrations = useRegistrations();
  const [subjectsCount, setSubjectsCount] = useState(0);

  useEffect(() => {
    fetchSubjects()
      .then((subjects) => setSubjectsCount(subjects.length))
      .catch(() => setSubjectsCount(0));
  }, []);

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalFaculty = users.filter((u) => u.role === "faculty").length;
  const pendingApplications = registrations.filter((r) => r.status === "pending").length;
  const approvedStudents = registrations.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">System overview and analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Students", value: totalStudents, icon: GraduationCap, subtitle: "Registered" },
          { title: "Active Faculty", value: totalFaculty, icon: Users, subtitle: "Teaching staff" },
          { title: "Subject Offerings", value: subjectsCount, icon: Users, subtitle: "Active courses" },
          { title: "Pending Applications", value: pendingApplications, icon: Users, subtitle: "Awaiting approval" },
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
        <h2 className="font-heading text-sm font-semibold text-card-foreground">Registration Status</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Pending Applications</span>
            <span className="text-sm font-medium text-warning">{pendingApplications}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Approved Students</span>
            <span className="text-sm font-medium text-success">{approvedStudents}</span>
          </div>
        </div>
      </div>
    </div>
  );
}