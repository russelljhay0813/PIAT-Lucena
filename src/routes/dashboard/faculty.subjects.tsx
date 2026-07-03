import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Users, Calendar, MapPin, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useCallback } from "react";
import { fetchSubjects, type Subject } from "@/lib/api";
import { fetchEnrollments, type StudentEnrollment } from "@/lib/api";

export const Route = createFileRoute("/dashboard/faculty/subjects")({
  component: FacultyMySubjects,
});

function FacultyMySubjects() {
  const { user } = useAuth();
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFacultySubjects = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const allSubjects = await fetchSubjects();
      const facultyOnly = allSubjects.filter((s) => s.facultyId === user.id);
      setFacultySubjects(facultyOnly);
    } catch {
      setFacultySubjects([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacultySubjects();
  }, [loadFacultySubjects]);

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

  const getStudentCount = (subjectId: string) => {
    return enrollments.filter((e) => e.subjectId === subjectId && e.status === "enrolled").length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">My Subjects</h1>
        <p className="text-sm text-muted-foreground">
          Subjects assigned by the Registrar for this academic year
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading subjects...</p>
        </div>
      ) : facultySubjects.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">
            No subjects assigned yet. Subjects are assigned by the Registrar.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facultySubjects.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to="/dashboard/faculty/subjects/$subjectId"
                params={{ subjectId: subject.id }}
                className="block rounded-xl border bg-card p-5 shadow-sm hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-heading text-base font-bold text-foreground">
                      {subject.code}
                    </h3>
                    <p className="text-sm text-foreground mt-1">{subject.title}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>{subject.program || "General"}</span>
                    <span>·</span>
                    <span>{subject.yearLevel || "All Years"}</span>
                    <span>·</span>
                    <span>{subject.semester || "All Semesters"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{subject.schedule || "TBA"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{subject.room || "TBA"}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-foreground font-medium">
                      {getStudentCount(subject.id)} students
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{subject.units} units</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}