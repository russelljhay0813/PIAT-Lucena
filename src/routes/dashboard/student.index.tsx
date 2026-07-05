import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/StatCard";
import { BookOpen, Calendar, Clock, TrendingUp, User, MapPin, ClipboardList, BellRing, Megaphone, RefreshCw, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  fetchAnnouncements,
  fetchAttendanceRecords,
  fetchEnrollments,
  fetchGrades,
  fetchNotifications,
  fetchStudentById,
  fetchSubjects,
  fetchEligibleReenrollments,
  reenrollStudent,
  type Announcement,
  type GradeEntry,
  type NotificationItem,
  type StudentEnrollment,
  type StudentRegistration,
  type Subject,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard/student/")({
  component: StudentDashboard,
});

function StudentDashboard() {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState<StudentRegistration | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [eligibleForReenrollment, setEligibleForReenrollment] = useState(false);
  const [isReenrolling, setIsReenrolling] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    if (!user?.studentId) {
      setStudentProfile(null);
      setEnrollments([]);
      setSubjects([]);
      setGrades([]);
      setAnnouncements([]);
      setNotifications([]);
      setAttendanceRate(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [profile, enrollmentData, subjectData, gradeData, announcementData, notificationData, eligibleData] = await Promise.all([
        fetchStudentById(user.studentId),
        fetchEnrollments(user.studentId),
        fetchSubjects(),
        fetchGrades(undefined, user.studentId),
        fetchAnnouncements(),
        fetchNotifications(user.studentId),
        fetchEligibleReenrollments(),
      ]);

      setStudentProfile(profile);
      setEnrollments(enrollmentData);
      const enrolledSubjectIds = new Set(enrollmentData.map((entry) => entry.subjectId));
      setSubjects(subjectData.filter((subject) => enrolledSubjectIds.has(subject.id)));
      setGrades(gradeData);
      setAnnouncements((announcementData || []).filter((item) => item.audience === "all" || item.audience === "student"));
      setNotifications(notificationData || []);
      setEligibleForReenrollment(eligibleData.some((item) => item.studentId === user.studentId));
    } catch {
      setStudentProfile(null);
      setEnrollments([]);
      setSubjects([]);
      setGrades([]);
      setAnnouncements([]);
      setNotifications([]);
      setEligibleForReenrollment(false);
    } finally {
      setLoading(false);
    }
  }, [user?.studentId]);

  useEffect(() => {
    refreshDashboard();
    const refreshEvents = ["bwest:registrations-changed", "bwest:enrollments-changed", "bwest:grades-changed", "bwest:announcements-changed"];
    const onChange = () => {
      void refreshDashboard();
    };
    refreshEvents.forEach((eventName) => window.addEventListener(eventName, onChange));
    return () => {
      refreshEvents.forEach((eventName) => window.removeEventListener(eventName, onChange));
    };
  }, [refreshDashboard]);

  useEffect(() => {
    const loadAttendance = async () => {
      if (!user?.studentId || subjects.length === 0) {
        setAttendanceRate(null);
        return;
      }
      try {
        const subjectIds = subjects.map((subject) => subject.id);
        const records = await Promise.all(subjectIds.map((id) => fetchAttendanceRecords(id, undefined, user.studentId)));
        const allRecords = records.flat();
        const present = allRecords.filter((record) => record.status === "present" || record.status === "late").length;
        const total = allRecords.length;
        setAttendanceRate(total > 0 ? Math.round((present / total) * 100) : null);
      } catch {
        setAttendanceRate(null);
      }
    };
    void loadAttendance();
  }, [user?.studentId, subjects]);

  const subjectSummaries = useMemo(() => {
    return subjects.map((subject) => {
      const subjectGrades = grades.filter((grade) => grade.subjectId === subject.id);
      const prelimEntries = subjectGrades.filter((grade) => grade.period === "prelim");
      const midtermEntries = subjectGrades.filter((grade) => grade.period === "midterm");
      const finalEntries = subjectGrades.filter((grade) => grade.period === "final");
      const overallEntries = subjectGrades.filter((grade) => grade.period === "overall" || grade.type === "overall");
      const computeGrade = (entries: GradeEntry[]) => {
        if (entries.length === 0) return null;
        const gradeEntry = entries.find((entry) => entry.status === "finalized" || entry.type === "overall") ?? entries[0];
        if (gradeEntry && gradeEntry.type === "overall") return gradeEntry.grade;
        const average = entries.reduce((sum, entry) => sum + entry.grade, 0) / entries.length;
        return Number(average.toFixed(2));
      };
      const prelimGrade = computeGrade(prelimEntries);
      const midtermGrade = computeGrade(midtermEntries);
      const finalGrade = computeGrade(finalEntries.length > 0 ? finalEntries : overallEntries);
      const overallGrade = finalGrade ?? computeGrade(overallEntries) ?? null;
      const remark = overallGrade === null ? "Pending" : overallGrade >= 75 ? "Passed" : overallGrade >= 60 ? "Incomplete" : "Failed";
      return { subject, prelimGrade, midtermGrade, finalGrade, overallGrade, remark, subjectGrades };
    });
  }, [subjects, grades]);

  useEffect(() => {
    if (!selectedSubjectId && subjectSummaries.length > 0) {
      setSelectedSubjectId(subjectSummaries[0].subject.id);
    }
  }, [selectedSubjectId, subjectSummaries]);

  const selectedSubjectSummary = useMemo(() => {
    return subjectSummaries.find((summary) => summary.subject.id === selectedSubjectId) ?? subjectSummaries[0] ?? null;
  }, [selectedSubjectId, subjectSummaries]);

  const totalUnits = subjects.reduce((sum, subject) => sum + subject.units, 0);
  const completedSubjects = enrollments.filter((entry) => entry.status === "completed").length;
  const subjectCount = subjects.length;
  const gradedSubjects = subjectSummaries.filter((summary) => summary.overallGrade !== null).length;
  const displayName = studentProfile ? `${studentProfile.firstName} ${studentProfile.lastName}`.trim() : user?.name ?? "Student";
  const displayAcademicYear = studentProfile?.academicYear || user?.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const displaySemester = studentProfile?.semester || user?.semester || "1st Semester";
  const registrationStatus = studentProfile?.status === "approved" ? "Approved" : studentProfile?.status === "rejected" ? "Rejected" : studentProfile?.status === "pending" ? "Under Review" : "Registration Not Started";
  const enrollmentStatus = enrollments.length > 0 ? "Enrolled" : studentProfile?.status === "approved" ? "Pending Enrollment" : "Not Enrolled";

  const handleReenrollment = async () => {
    if (!user?.studentId || !eligibleForReenrollment) return;
    setIsReenrolling(true);
    try {
      const result = await reenrollStudent(user.studentId, {
        nextAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      });
      if (result?.student) {
        setStudentProfile(result.student);
      }
      setEligibleForReenrollment(false);
      setEnrollments((current) => current.length > 0 ? current : []);
      window.dispatchEvent(new Event("bwest:enrollments-changed"));
    } catch {
      // keep the error hidden from the student while preserving a clean experience
    } finally {
      setIsReenrolling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-sm text-muted-foreground">Academic year {displayAcademicYear}, {displaySemester}</p>
          </div>
          <div className="rounded-full bg-muted/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {registrationStatus}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Student ID</p>
            <p className="mt-1 font-mono text-sm font-semibold text-foreground">{studentProfile?.studentId || user?.studentId || user?.id || "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Full Name</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{displayName}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Email Address</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{studentProfile?.email || user?.email || "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Program</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{studentProfile?.program || user?.program || "—"}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Year Level</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{studentProfile?.yearLevel || user?.yearLevel || "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Semester</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{studentProfile?.semester || user?.semester || "—"}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Academic Year</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{displayAcademicYear}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Enrollment Status</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{enrollmentStatus}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-accent" />
              <h3 className="font-heading text-xs font-semibold uppercase text-muted-foreground">Student Details</h3>
            </div>
            <div className="space-y-1 text-sm text-foreground">
              <p><span className="text-muted-foreground">Email:</span> {studentProfile?.email || user?.email || "—"}</p>
              <p><span className="text-muted-foreground">Contact:</span> {studentProfile?.contactNumber || "—"}</p>
              <p><span className="text-muted-foreground">Gender:</span> {studentProfile?.gender || "—"}</p>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mb-2 flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              <h3 className="font-heading text-xs font-semibold uppercase text-muted-foreground">Address</h3>
            </div>
            <p className="text-sm text-foreground">{studentProfile?.address || "—"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Current Program", value: studentProfile?.program || user?.program || "—", subtitle: "Verified from student record", icon: BookOpen },
          { title: "Current Year Level", value: studentProfile?.yearLevel || user?.yearLevel || "—", subtitle: "Updated by registrar", icon: Calendar },
          { title: "Current Semester", value: studentProfile?.semester || user?.semester || "—", subtitle: "Current academic term", icon: Clock },
          { title: "Total Enrolled Subjects", value: subjectCount, subtitle: `${totalUnits} total units`, icon: ClipboardList },
        ].map((stat, index) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">My Subjects</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your enrolled subjects...</p>
          ) : subjects.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">No subjects are currently assigned to you.</p>
          ) : (
            <div className="space-y-3">
              {subjects.map((subject) => (
                <div key={subject.id} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-sm font-semibold text-foreground">{subject.code}</p>
                      <p className="text-sm text-foreground">{subject.title}</p>
                    </div>
                    <div className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">{subject.units} units</div>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p><span className="font-medium text-foreground">Schedule:</span> {subject.schedule || "TBA"}</p>
                    <p><span className="font-medium text-foreground">Room:</span> {subject.room || "TBA"}</p>
                    <p><span className="font-medium text-foreground">Assigned Faculty:</span> {subject.instructor || "TBA"}</p>
                    <p><span className="font-medium text-foreground">Semester:</span> {subject.semester || displaySemester}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">Class Schedule</h2>
          </div>
          {subjects.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">No class schedule is available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Subject</th>
                    <th className="pb-2 pr-4">Day/Time</th>
                    <th className="pb-2 pr-4">Room</th>
                    <th className="pb-2">Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject.id} className="border-b border-muted/50 last:border-0">
                      <td className="py-3 pr-4">
                        <p className="font-heading font-semibold text-foreground">{subject.code}</p>
                        <p className="text-xs text-muted-foreground">{subject.title}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{subject.schedule || "TBA"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{subject.room || "TBA"}</td>
                      <td className="py-3 text-muted-foreground">{subject.instructor || "TBA"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Grades</h2>
        </div>
        {subjectSummaries.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">No grades have been posted for your enrolled subjects yet.</p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">Subject</th>
                    <th className="pb-2 pr-4">Prelim</th>
                    <th className="pb-2 pr-4">Midterm</th>
                    <th className="pb-2 pr-4">Final</th>
                    <th className="pb-2 pr-4">Overall</th>
                    <th className="pb-2">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectSummaries.map((summary) => (
                    <tr key={summary.subject.id} className="border-b border-muted/50 last:border-0">
                      <td className="py-3 pr-4">
                        <button type="button" className="flex items-center gap-2 text-left font-medium text-foreground" onClick={() => setSelectedSubjectId(summary.subject.id)}>
                          <span>{summary.subject.code}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <p className="text-xs text-muted-foreground">{summary.subject.title}</p>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{summary.prelimGrade ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{summary.midtermGrade ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{summary.finalGrade ?? "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{summary.overallGrade ?? "—"}</td>
                      <td className="py-3 text-muted-foreground">{summary.remark}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedSubjectSummary && (
              <div className="rounded-lg border bg-muted/20 p-4">
                <h3 className="font-heading text-sm font-semibold text-foreground">Grade Breakdown for {selectedSubjectSummary.subject.code}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{selectedSubjectSummary.subject.title}</p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  {(["prelim", "midterm", "final"] as const).map((period) => {
                    const entries = selectedSubjectSummary.subjectGrades.filter((grade) => grade.period === period);
                    const quizScores = entries.filter((grade) => grade.type === "quiz").map((grade) => grade.grade);
                    const activityScores = entries.filter((grade) => grade.type === "activity").map((grade) => grade.grade);
                    const examScores = entries.filter((grade) => grade.type === "exam").map((grade) => grade.grade);
                    const computed = period === "prelim" ? selectedSubjectSummary.prelimGrade : period === "midterm" ? selectedSubjectSummary.midtermGrade : selectedSubjectSummary.finalGrade;
                    return (
                      <div key={period} className="rounded-lg border bg-background/70 p-4">
                        <p className="text-sm font-semibold capitalize text-foreground">{period}</p>
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          <p><span className="font-medium text-foreground">Quiz Scores:</span> {quizScores.length > 0 ? quizScores.join(", ") : "—"}</p>
                          <p><span className="font-medium text-foreground">Activity Scores:</span> {activityScores.length > 0 ? activityScores.join(", ") : "—"}</p>
                          <p><span className="font-medium text-foreground">Exam Score:</span> {examScores.length > 0 ? examScores.join(", ") : "—"}</p>
                          <p><span className="font-medium text-foreground">Computed Grade:</span> {computed ?? "—"}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Academic Records</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4">Academic Year</th>
                <th className="pb-2 pr-4">Semester</th>
                <th className="pb-2 pr-4">Subjects Taken</th>
                <th className="pb-2 pr-4">Units Earned</th>
                <th className="pb-2">Final Grades</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.filter((entry) => entry.status === "completed").length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-muted-foreground">No completed semesters have been finalized yet.</td>
                </tr>
              ) : (
                enrollments
                  .filter((entry) => entry.status === "completed")
                  .map((entry) => (
                    <tr key={entry.id} className="border-b border-muted/50 last:border-0">
                      <td className="py-3 pr-4 text-foreground">{entry.academicYear || "—"}</td>
                      <td className="py-3 pr-4 text-foreground">{entry.semester || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{subjects.find((subject) => subject.id === entry.subjectId)?.title || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{subjects.find((subject) => subject.id === entry.subjectId)?.units || 0}</td>
                      <td className="py-3 text-muted-foreground">{grades.find((grade) => grade.studentId === user?.studentId && grade.subjectId === entry.subjectId)?.grade ?? "—"}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">Registration & Enrollment</h2>
          </div>
          <div className="space-y-3 text-sm text-foreground">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Registration Status</p>
              <p className="mt-1 font-medium">{registrationStatus}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Enrollment Status</p>
              <p className="mt-1 font-medium">{enrollmentStatus}</p>
            </div>
            {eligibleForReenrollment ? (
              <button type="button" onClick={handleReenrollment} disabled={isReenrolling} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
                <RefreshCw className="h-4 w-4" /> {isReenrolling ? "Processing..." : "Continue to Next Semester"}
              </button>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
                Re-enrollment is currently unavailable. Your grades and academic record must be finalized before the next semester can be opened.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BellRing className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">Notifications</h2>
          </div>
          {notifications.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">No notifications are available right now.</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 6).map((notification) => (
                <div key={notification.id} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    <span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-accent" />
          <h2 className="font-heading text-sm font-semibold text-card-foreground">Announcements</h2>
        </div>
        {announcements.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">No announcements have been posted yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.slice().sort((left, right) => right.createdAt - left.createdAt).map((announcement) => (
              <div key={announcement.id} className="rounded-lg border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-heading text-sm font-semibold text-foreground">{announcement.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{announcement.body}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{announcement.datePosted || new Date(announcement.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}