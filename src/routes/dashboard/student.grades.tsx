import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Award, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSubjects, type Subject } from "@/lib/subjects-store";
import { useStudentGrades } from "@/lib/grades-store";

export const Route = createFileRoute("/dashboard/student/grades")({
  component: StudentGrades,
});

function gradeRemark(g: number): { label: string; tone: string } {
  if (g <= 1.25) return { label: "Excellent", tone: "bg-success/10 text-success" };
  if (g <= 1.75) return { label: "Very Good", tone: "bg-accent/10 text-accent" };
  if (g <= 2.25) return { label: "Good", tone: "bg-primary/10 text-primary" };
  if (g <= 3.0) return { label: "Passed", tone: "bg-warning/10 text-warning" };
  return { label: "Failed", tone: "bg-destructive/10 text-destructive" };
}

function StudentGrades() {
  const { user } = useAuth();
  const subjects = useSubjects();
  const grades = useStudentGrades(user?.studentId ?? "");

  const rows = useMemo(
    () =>
      grades
        .map((grade) => {
          const subject = subjects.find((s) => s.id === grade.subjectId);
          if (!subject) return null;
          return { subject, grade: grade.grade, remarks: grade.remarks ?? "" };
        })
        .filter((row): row is { subject: Subject; grade: number; remarks: string } => row !== null),
    [grades, subjects],
  );

  const totalUnits = rows.reduce((sum, row) => sum + row.subject.units, 0);
  const weighted = rows.reduce((sum, row) => sum + row.grade * row.subject.units, 0);
  const gwa = totalUnits > 0 ? weighted / totalUnits : 0;

  const honor =
    gwa > 0 && gwa <= 1.2
      ? "Summa Cum Laude"
      : gwa <= 1.45
      ? "Magna Cum Laude"
      : gwa <= 1.75
      ? "Cum Laude"
      : gwa <= 3.0
      ? "Regular Standing"
      : "—";

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Grades</h1>
          <p className="text-sm text-muted-foreground">Please sign in to view your grades.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Grades</h1>
        <p className="text-sm text-muted-foreground">
          Academic performance for {user.name} ({user.studentId ?? "student"}).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <p className="text-xs">GWA</p>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">
            {gwa > 0 ? gwa.toFixed(2) : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            <p className="text-xs">Subjects</p>
          </div>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{rows.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Units Earned</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{totalUnits}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            <p className="text-xs">Standing</p>
          </div>
          <p className="mt-1 font-heading text-base font-bold text-accent">{honor}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground">Grade Records</h2>

        {rows.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-lg bg-muted/50 px-4 py-10 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No grades yet. Grades will appear once your faculty enters them.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Subject</th>
                  <th className="px-4 py-2 font-medium">Instructor</th>
                  <th className="px-4 py-2 text-center font-medium">Units</th>
                  <th className="px-4 py-2 text-center font-medium">Grade</th>
                  <th className="px-4 py-2 text-right font-medium">Remark</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ subject: s, grade }, i) => {
                  const r = gradeRemark(grade);
                  return (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-t"
                    >
                      <td className="px-4 py-3 font-heading text-xs font-bold text-foreground">{s.code}</td>
                      <td className="px-4 py-3 text-foreground">{s.title}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{s.instructor}</td>
                      <td className="px-4 py-3 text-center text-xs text-foreground">{s.units}</td>
                      <td className="px-4 py-3 text-center font-heading text-sm font-bold text-accent">{grade.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.tone}`}>{r.label}</span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
