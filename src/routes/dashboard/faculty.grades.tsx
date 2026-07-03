import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { BookOpen, Save, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { fetchSubjects, type Subject } from "@/lib/api";
import {
  useGrades,
  addOrUpdateGrade,
  type GradeEntry,
} from "@/lib/grades-store";
import { fetchEnrollments, type StudentEnrollment } from "@/lib/api";
import { fetchStudents, type StudentRegistration } from "@/lib/api";

type GradingPeriod = "prelim" | "midterm" | "final";

interface DetailedGrade {
  prelim: {
    activities: { a1: number; a2: number; a3: number };
    quizzes: { q1: number; q2: number; q3: number };
    exam: number;
    grade: number;
  };
  midterm: {
    activities: { a1: number; a2: number; a3: number };
    quizzes: { q1: number; q2: number; q3: number };
    exam: number;
    grade: number;
  };
  final: {
    activities: { a1: number; a2: number; a3: number };
    quizzes: { q1: number; q2: number; q3: number };
    exam: number;
    grade: number;
  };
}

function computePeriodGrade(activities: number[], quizzes: number[], exam: number): number {
  const avgAct = activities.reduce((a, b) => a + b, 0) / 3 || 0;
  const avgQuiz = quizzes.reduce((a, b) => a + b, 0) / 3 || 0;
  return Math.round((avgAct * 0.3 + avgQuiz * 0.3 + exam * 0.4) * 100) / 100;
}

function computeOverallGrade(prelim: number, midterm: number, final: number): number {
  return Math.round((prelim * 0.3 + midterm * 0.3 + final * 0.4) * 100) / 100;
}

export const Route = createFileRoute("/dashboard/faculty/grades")({
  component: FacultyGrades,
});

function FacultyGrades() {
  const { user } = useAuth();
  const [facultySubjects, setFacultySubjects] = useState<Subject[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<StudentRegistration[]>([]);
  const grades = useGrades();
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [gradingPeriod, setGradingPeriod] = useState<GradingPeriod>("prelim");
  const [detailedGrades, setDetailedGrades] = useState<Record<string, DetailedGrade>>({});
  const [existingGrades, setExistingGrades] = useState<Record<string, GradeEntry>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  useEffect(() => {
    const loadFacultySubjects = async () => {
      if (!user?.id) return;
      try {
        const allSubjects = await fetchSubjects();
        const facultyOnly = allSubjects.filter((s) => s.facultyId === user.id);
        setFacultySubjects(facultyOnly);
      } catch {
        setFacultySubjects([]);
      }
    };
    loadFacultySubjects();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setDetailedGrades({});
      setExistingGrades({});
      setEnrolledStudents([]);
      return;
    }

    const loadEnrolledStudents = async () => {
      try {
        const allEnrollments = await fetchEnrollments();
        const enrolledForSubject = allEnrollments
          .filter((e) => e.subjectId === selectedSubjectId && e.status === "enrolled")
          .map((e) => e.studentId);
        const allStudents = await fetchStudents();
        setEnrolledStudents(allStudents.filter((s) => enrolledForSubject.includes(s.studentId)));
      } catch {
        setEnrolledStudents([]);
      }
    };
    loadEnrolledStudents();

    const gradesMap: Record<string, GradeEntry> = {};
    grades.forEach((g) => {
      if (g.subjectId === selectedSubjectId) {
        gradesMap[g.studentId] = g;
      }
    });
    setExistingGrades(gradesMap);

    const detailedMap: Record<string, DetailedGrade> = {};
    grades.forEach((g) => {
      if (g.subjectId === selectedSubjectId && g.period && g.type && g.type !== "overall") {
        const studentId = g.studentId;
        if (!detailedMap[studentId]) {
          detailedMap[studentId] = {
            prelim: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
            midterm: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
            final: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
          };
        }
        const period = g.period as GradingPeriod;
        if (g.type === "activity") {
          const actNum = parseInt(g.component || "1");
          const actKey = `a${actNum}` as 'a1' | 'a2' | 'a3';
          detailedMap[studentId][period].activities = {
            ...detailedMap[studentId][period].activities,
            [actKey]: g.grade,
          };
        } else if (g.type === "quiz") {
          const quizNum = parseInt(g.component || "1");
          const quizKey = `q${quizNum}` as 'q1' | 'q2' | 'q3';
          detailedMap[studentId][period].quizzes = {
            ...detailedMap[studentId][period].quizzes,
            [quizKey]: g.grade,
          };
        } else if (g.type === "exam") {
          detailedMap[studentId][period].exam = g.grade;
        }
      }
    });
    setDetailedGrades(detailedMap);
  }, [grades, selectedSubjectId]);

  const selectedSubject = useMemo(
    () => facultySubjects.find((s) => s.id === selectedSubjectId),
    [selectedSubjectId, facultySubjects],
  );

  const handleDetailedGradeChange = (
    studentId: string,
    period: GradingPeriod,
    type: "activity" | "quiz" | "exam",
    component: number,
    value: string,
  ) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setDetailedGrades((prev) => {
      const next = { ...prev };
      if (!next[studentId]) {
        next[studentId] = {
          prelim: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
          midterm: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
          final: { activities: { a1: 0, a2: 0, a3: 0 }, quizzes: { q1: 0, q2: 0, q3: 0 }, exam: 0, grade: 0 },
        };
      }

      if (type === "activity") {
        const actKey = `a${component}` as 'a1' | 'a2' | 'a3';
        next[studentId][period].activities = {
          ...next[studentId][period].activities,
          [actKey]: numValue,
        };
        const acts = Object.values(next[studentId][period].activities);
        const quizzes = Object.values(next[studentId][period].quizzes);
        next[studentId][period].grade = computePeriodGrade(acts as number[], quizzes as number[], next[studentId][period].exam);
      } else if (type === "quiz") {
        const quizKey = `q${component}` as 'q1' | 'q2' | 'q3';
        next[studentId][period].quizzes = {
          ...next[studentId][period].quizzes,
          [quizKey]: numValue,
        };
        const acts = Object.values(next[studentId][period].activities);
        const quizzes = Object.values(next[studentId][period].quizzes);
        next[studentId][period].grade = computePeriodGrade(acts as number[], quizzes as number[], next[studentId][period].exam);
      } else {
        next[studentId][period].exam = numValue;
        const acts = Object.values(next[studentId][period].activities);
        const quizzes = Object.values(next[studentId][period].quizzes);
        next[studentId][period].grade = computePeriodGrade(acts, quizzes, numValue);
      }

      return next;
    });
  };

  const handleSaveGrades = async () => {
    if (!selectedSubjectId) return;

    let count = 0;
    for (const studentId of Object.keys(detailedGrades)) {
      const detailed = detailedGrades[studentId];
      
      for (let act = 1; act <= 3; act++) {
        const grade = detailed.prelim.activities[`a${act}` as keyof typeof detailed.prelim.activities];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "prelim", "activity", String(act));
          count++;
        }
      }
      for (let quiz = 1; quiz <= 3; quiz++) {
        const grade = detailed.prelim.quizzes[`q${quiz}` as keyof typeof detailed.prelim.quizzes];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "prelim", "quiz", String(quiz));
          count++;
        }
      }
      if (detailed.prelim.exam > 0) {
        await addOrUpdateGrade(studentId, selectedSubjectId, detailed.prelim.exam, undefined, "prelim", "exam");
        count++;
      }

      for (let act = 1; act <= 3; act++) {
        const grade = detailed.midterm.activities[`a${act}` as keyof typeof detailed.midterm.activities];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "midterm", "activity", String(act));
          count++;
        }
      }
      for (let quiz = 1; quiz <= 3; quiz++) {
        const grade = detailed.midterm.quizzes[`q${quiz}` as keyof typeof detailed.midterm.quizzes];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "midterm", "quiz", String(quiz));
          count++;
        }
      }
      if (detailed.midterm.exam > 0) {
        await addOrUpdateGrade(studentId, selectedSubjectId, detailed.midterm.exam, undefined, "midterm", "exam");
        count++;
      }

      for (let act = 1; act <= 3; act++) {
        const grade = detailed.final.activities[`a${act}` as keyof typeof detailed.final.activities];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "final", "activity", String(act));
          count++;
        }
      }
      for (let quiz = 1; quiz <= 3; quiz++) {
        const grade = detailed.final.quizzes[`q${quiz}` as keyof typeof detailed.final.quizzes];
        if (grade > 0) {
          await addOrUpdateGrade(studentId, selectedSubjectId, grade, undefined, "final", "quiz", String(quiz));
          count++;
        }
      }
      if (detailed.final.exam > 0) {
        await addOrUpdateGrade(studentId, selectedSubjectId, detailed.final.exam, undefined, "final", "exam");
        count++;
      }

      const overall = computeOverallGrade(
        detailed.prelim.grade || 0,
        detailed.midterm.grade || 0,
        detailed.final.grade || 0,
      );
      if (overall > 0) {
        await addOrUpdateGrade(studentId, selectedSubjectId, overall, undefined, undefined, "overall");
      }
    }

    toast.success(`Saved grades for ${enrolledStudents.length} students`, {
      description: `${count} grade components saved`,
    });
  };

  const handleSubmitGrades = async () => {
    if (!selectedSubjectId) return;

    const detailed = detailedGrades;
    let count = 0;
    for (const studentId of Object.keys(detailed)) {
      const studentDetailed = detailed[studentId];
      const overall = computeOverallGrade(
        studentDetailed.prelim.grade || 0,
        studentDetailed.midterm.grade || 0,
        studentDetailed.final.grade || 0,
      );
      
      if (overall > 0) {
        await addOrUpdateGrade(studentId, selectedSubjectId, overall, undefined, undefined, "overall", undefined);
        count++;
      }
    }

    setIsSubmitted(true);
    toast.success(`Submitted grades for ${count} students`);
  };

  const getGradeStatus = (grade: number) => {
    if (grade <= 1.25) return { label: "Excellent", color: "bg-green-100 text-green-700" };
    if (grade <= 1.75) return { label: "Very Good", color: "bg-blue-100 text-blue-700" };
    if (grade <= 2.25) return { label: "Good", color: "bg-cyan-100 text-cyan-700" };
    if (grade <= 3.0) return { label: "Passed", color: "bg-yellow-100 text-yellow-700" };
    return { label: "Failed", color: "bg-red-100 text-red-700" };
  };

  const renderGradeInputs = (period: GradingPeriod, studentId: string) => {
    const detailed = detailedGrades[studentId];
    return (
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Activities</p>
          <div className="flex gap-1">
            {[1, 2, 3].map((num) => (
              <Input
                key={`act-${period}-${num}`}
                type="number"
                min="0"
                max="100"
                step="0.25"
                placeholder={`A${num}`}
                value={detailed?.[period]?.activities?.[`a${num}` as keyof typeof detailed.prelim.activities] || ""}
                onChange={(e) => handleDetailedGradeChange(studentId, period, "activity", num, e.target.value)}
                className="w-12 text-center text-xs"
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Quizzes</p>
          <div className="flex gap-1">
            {[1, 2, 3].map((num) => (
              <Input
                key={`quiz-${period}-${num}`}
                type="number"
                min="0"
                max="100"
                step="0.25"
                placeholder={`Q${num}`}
                value={detailed?.[period]?.quizzes?.[`q${num}` as keyof typeof detailed.prelim.quizzes] || ""}
                onChange={(e) => handleDetailedGradeChange(studentId, period, "quiz", num, e.target.value)}
                className="w-12 text-center text-xs"
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Exam</p>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.25"
            placeholder="Exam"
            value={detailed?.[period].exam || ""}
            onChange={(e) => handleDetailedGradeChange(studentId, period, "exam", 0, e.target.value)}
            className="w-16 text-xs"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Gradebook</h1>
        <p className="text-sm text-muted-foreground">
          Encode grades organized by grading period (Prelim/Midterm/Final)
        </p>
      </div>

      <div className="flex gap-2">
        {(["prelim", "midterm", "final"] as const).map((period) => (
          <button
            key={period}
            onClick={() => setGradingPeriod(period)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors ${gradingPeriod === period ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {period === "prelim" ? "Prelim" : period === "midterm" ? "Midterm" : "Final"}
          </button>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
          Select Subject
        </h2>

        {facultySubjects.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 px-4 py-8">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No subjects assigned yet. Subjects are assigned by the Registrar.
            </p>
          </div>
        ) : (
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a subject to enter grades" />
            </SelectTrigger>
            <SelectContent>
              {facultySubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.code} - {subject.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedSubject && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-5 shadow-sm"
        >
          <div className="mb-4">
            <h2 className="font-heading text-sm font-semibold text-card-foreground">
              {selectedSubject.code} - {selectedSubject.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Schedule: {selectedSubject.schedule} | Room: {selectedSubject.room} | Units:{" "}
              {selectedSubject.units}
            </p>
          </div>

          <div className="mb-4 p-3 bg-muted/30 rounded-lg text-xs">
            <p className="font-medium text-foreground mb-1">Grading Formula:</p>
            <p className="text-muted-foreground">
              Prelim: (Activity Avg × 30%) + (Quiz Avg × 30%) + (Exam × 40%) = Period Grade
            </p>
            <p className="text-muted-foreground mt-1">
              Final Grade = (Prelim × 30%) + (Midterm × 30%) + (Final × 40%)
            </p>
          </div>

          {enrolledStudents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg bg-muted/50 px-4 py-8">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No students enrolled in this subject.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold">
                      Student ID
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold">
                      Name
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold">
                      {gradingPeriod === "prelim" ? "Prelim" : gradingPeriod === "midterm" ? "Midterm" : "Final"} Grades
                    </TableHead>
                    <TableHead className="py-3 px-4 text-left text-xs font-semibold">
                      Period Grade
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrolledStudents.map((student) => {
                    const detailed = detailedGrades[student.studentId];
                    const periodGrade = detailed?.[gradingPeriod]?.grade || 0;
                    const status = periodGrade > 0 ? getGradeStatus(periodGrade) : null;

                    return (
                      <motion.tr
                        key={student.studentId}
                        className="border-b border-border/50 hover:bg-muted/50"
                        layout
                      >
                        <TableCell className="py-3 px-4 text-sm font-mono text-foreground">
                          {student.studentId}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-sm text-foreground">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {renderGradeInputs(gradingPeriod, student.studentId)}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          {status && (
                            <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold ${status.color}`}>
                              {periodGrade.toFixed(2)} - {status.label}
                            </span>
                          )}
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={handleSaveGrades} className="gap-2">
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
            {!isSubmitted && (
              <Button
                onClick={() => setSubmitConfirmOpen(true)}
                className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              >
                <Send className="h-4 w-4" />
                Submit Grades
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <Dialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Grades</DialogTitle>
            <DialogDescription>
              Once submitted, grades become read-only and visible to students. Do you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitGrades} className="bg-success hover:bg-success/90">
              Submit Grades
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}