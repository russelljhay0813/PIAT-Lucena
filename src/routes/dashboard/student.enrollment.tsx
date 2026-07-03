import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useEnrolledSubjects, enrollStudent as enrollStudentApi } from "@/lib/enrollment-store";
import { useGrades } from "@/lib/grades-store";
import { useSubjects, getCurriculumSubjects, YEAR_LEVELS } from "@/lib/subjects-store";
import { useState, useEffect } from "react";
import { updateStudent } from "@/lib/api";

export const Route = createFileRoute("/dashboard/student/enrollment")({
  component: StudentEnrollment,
});

function StudentEnrollment() {
  const { user } = useAuth();
  const enrolledSubjects = useEnrolledSubjects(user?.studentId ?? "");
  const grades = useGrades();
  const allSubjects = useSubjects();
  
  const [showReenrollModal, setShowReenrollModal] = useState(false);
  const [canReenroll, setCanReenroll] = useState(false);
  const [nextSemesterInfo, setNextSemesterInfo] = useState<{
    yearLevel: string;
    semester: string;
  } | null>(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState<{ code: string; title: string; units: number }[]>([]);

  const totalUnits = enrolledSubjects.reduce((sum, s) => sum + s.units, 0);
  const program = user?.program || "";

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!nextSemesterInfo) {
        setCurriculumSubjects([]);
        return;
      }
      try {
        const items = await getCurriculumSubjects(program, nextSemesterInfo.yearLevel, nextSemesterInfo.semester);
        setCurriculumSubjects(items);
      } catch {
        setCurriculumSubjects([]);
      }
    };
    loadCurriculum();
  }, [program, nextSemesterInfo]);

  // Check if all grades are submitted for enrolled subjects
  useEffect(() => {
    if (!user?.studentId || enrolledSubjects.length === 0) {
      setCanReenroll(false);
      return;
    }

    const allGradesSubmitted = enrolledSubjects.every((subject) => {
      return grades.some(
        (g) => g.studentId === user.studentId && g.subjectId === subject.id && g.status !== "draft",
      );
    });

    if (allGradesSubmitted && enrolledSubjects.length > 0) {
      setCanReenroll(true);
      const currentSemester = enrolledSubjects[0].semester || "1st Semester";
      const currentYear = enrolledSubjects[0].yearLevel || "1st Year";
      
      let nextYear = currentYear;
      let nextSem = currentSemester;

      if (currentSemester === "1st Semester") {
        nextSem = "2nd Semester";
      } else if (currentSemester === "2nd Semester") {
        nextSem = "1st Semester";
        const yearIdx = YEAR_LEVELS.indexOf(currentYear);
        if (yearIdx < YEAR_LEVELS.length - 1) {
          nextYear = YEAR_LEVELS[yearIdx + 1];
        }
      }

      setNextSemesterInfo({ yearLevel: nextYear, semester: nextSem });
    }
  }, [user?.studentId, enrolledSubjects, grades]);

  const handleReenroll = async () => {
    const currentYear = new Date().getFullYear();
    const academicYear = `${currentYear}-${currentYear + 1}`;
    
    const subjectIds = curriculumSubjects
      .map((s) => allSubjects.find((sub) => sub.code === s.code)?.id)
      .filter(Boolean) as string[];

    if (subjectIds.length > 0 && user?.studentId) {
      await enrollStudentApi(user.studentId, subjectIds, academicYear, nextSemesterInfo!.semester);
    }
    
    // Update student year level if advancing
    if (nextSemesterInfo && user?.studentId && user.yearLevel !== nextSemesterInfo.yearLevel) {
      await updateStudent(user.studentId, { yearLevel: nextSemesterInfo.yearLevel });
    }
    
    setShowReenrollModal(false);
    import("sonner").then(({ toast }) => {
      toast.success("Re-enrollment request submitted. Contact registrar for final approval.");
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Enrollment</h1>
          <p className="text-sm text-muted-foreground">
            Subjects assigned to you for this semester. Re-enrollment available after all grades are submitted.
          </p>
        </div>
        {canReenroll && (
          <button
            onClick={() => setShowReenrollModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Apply for Re-enrollment
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Subjects Enrolled</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">
            {enrolledSubjects.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Units</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{totalUnits}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="mt-1 font-heading text-2xl font-bold text-success">Active</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">
            My Subjects
          </h2>
        </div>

        {enrolledSubjects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 px-4 py-10 text-center">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No subjects enrolled yet. Contact your faculty or registrar for enrollment.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {enrolledSubjects.map((s) => {
              const grade = grades.find((g) => g.studentId === user?.studentId && g.subjectId === s.id);
              const hasGrade = !!grade && grade.status === "submitted";
              
              return (
                <motion.div
                  key={s.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-4 py-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-foreground">
                        {s.code}
                      </span>
                      <span className="text-sm text-foreground">{s.title}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {s.schedule} · {s.room} · Instructor: {s.instructor}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasGrade && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="sr-only">Grade Submitted</span>
                      </>
                    )}
                    <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                      {s.units} units
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-enrollment Modal */}
      {showReenrollModal && nextSemesterInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
          >
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">
              Re-enrollment Confirmation
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Next Semester:</p>
                <p className="text-sm text-muted-foreground">
                  {nextSemesterInfo.yearLevel} - {nextSemesterInfo.semester}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  You will be automatically enrolled in the curriculum subjects for this term.
                </p>
              </div>
              {curriculumSubjects.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Subjects to enroll:
                  </p>
                  <ul className="text-xs space-y-1">
                    {curriculumSubjects.map((s) => (
                      <li key={s.code} className="text-foreground">
                        {s.code} - {s.title} ({s.units} units)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowReenrollModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReenroll}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Confirm Re-enrollment
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}