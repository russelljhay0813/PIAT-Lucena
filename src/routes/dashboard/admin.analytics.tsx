import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { useUsers } from "@/lib/users-store";
import { useRegistrations } from "@/lib/registrations-store";
import { fetchSubjects, fetchPrograms } from "@/lib/api";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const users = useUsers();
  const registrations = useRegistrations();
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [programs, setPrograms] = useState<string[]>([]);

  useEffect(() => {
    fetchSubjects()
      .then((subjects) => setSubjectsCount(subjects.length))
      .catch(() => setSubjectsCount(0));
    fetchPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalFaculty = users.filter((u) => u.role === "faculty").length;
  const totalRegistrars = users.filter((u) => u.role === "registrar").length;

  const programStats = programs
    .map((p) => ({
      program: p,
      count: users.filter((u) => u.role === "student" && u.program === p).length,
    }))
    .filter((p) => p.count > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Institutional performance and trends</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Students", value: totalStudents, icon: Users },
          { title: "Active Faculty", value: totalFaculty, icon: TrendingUp },
          { title: "Registrars", value: totalRegistrars, icon: BookOpen },
          { title: "Subject Offerings", value: subjectsCount, icon: BarChart3 },
        ].map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground">
          Students by Program
        </h2>
        {programStats.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground py-6 text-center">
            No students registered yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {programStats.map((p) => (
              <div key={p.program} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                <span className="text-sm font-medium text-foreground">{p.program}</span>
                <span className="text-sm font-medium text-foreground">{p.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}