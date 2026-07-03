import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, CheckCircle, Clock, XCircle, BookPlus, Eye, X } from "lucide-react";
import { motion } from "framer-motion";
import { getApprovedStudents, REGISTRATIONS_EVENT, type StudentRegistration } from "@/lib/registrations-store";
import { fetchUsers, type UserAccount } from "@/lib/api";
import { useSubjects, getCurriculumSubjects } from "@/lib/subjects-store";
import { enrollStudent, type StudentEnrollment, ENROLLMENT_EVENT } from "@/lib/enrollment-store";
import { fetchEnrollments } from "@/lib/api";
import { fetchPrograms } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/dashboard/registrar/enrollment")({
  component: RegistrarEnrollment,
});

function RegistrarEnrollment() {
  const subjects = useSubjects();
  const [activeStudents, setActiveStudents] = useState<StudentRegistration[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<UserAccount[]>([]);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRegistration | null>(null);
  const [selectedYearLevel, setSelectedYearLevel] = useState("1st Year");
  const [selectedSemester, setSelectedSemester] = useState("1st Semester");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("");
  const [curriculumSubjects, setCurriculumSubjects] = useState<any[]>([]);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const data = await fetchPrograms();
        setPrograms(data);
      } catch {
        setPrograms([]);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      const approved = await getApprovedStudents();
      setActiveStudents(approved as any);
    };
    loadStudents();
    const onChange = () => loadStudents();
    window.addEventListener(REGISTRATIONS_EVENT, onChange);
    return () => window.removeEventListener(REGISTRATIONS_EVENT, onChange);
  }, []);

  useEffect(() => {
    const loadFaculty = async () => {
      const faculty = await fetchUsers("faculty");
      setFacultyUsers(faculty as any);
    };
    loadFaculty();
  }, []);

  useEffect(() => {
    const loadEnrollments = async () => {
      const data = await fetchEnrollments();
      setEnrollments(data);
    };
    loadEnrollments();
    const onChange = () => loadEnrollments();
    window.addEventListener(ENROLLMENT_EVENT, onChange);
    return () => window.removeEventListener(ENROLLMENT_EVENT, onChange);
  }, []);

  const filteredStudents = activeStudents.filter((s) => {
    const matchSearch =
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchProgram = programFilter === "All" || s.program === programFilter;
    const matchYear = yearFilter === "All" || s.yearLevel === yearFilter;
    return matchSearch && matchProgram && matchYear;
  });

  const loadCurriculumForStudent = async (student: StudentRegistration) => {
    const items = await getCurriculumSubjects(student.program || "", selectedYearLevel, selectedSemester);
    setCurriculumSubjects(items);
  };

  const handleOpenEnroll = (student: StudentRegistration) => {
    setSelectedStudent(student);
    setSelectedYearLevel(student.yearLevel || "1st Year");
    setSelectedSemester("1st Semester");
    setSelectedAcademicYear("");
    setShowEnrollModal(true);
    loadCurriculumForStudent(student);
  };

  const handleEnrollStudent = async () => {
    if (!selectedStudent) return;

    const matchingSubjects = subjects.filter((s) =>
      curriculumSubjects.some((c) => c.code === s.code && s.program === selectedStudent.program),
    );
    const existingSubjectIds = matchingSubjects.map((s) => s.id);

    if (existingSubjectIds.length === 0) {
      // Fallback: try to create subjects from curriculum if none matched existing offerings
      // For now, require subject offerings to exist
      toast.error("No matching subject offerings found for this curriculum");
      return;
    }

    await enrollStudent(selectedStudent.studentId, existingSubjectIds, selectedAcademicYear, selectedSemester);
    toast.success(`Enrolled ${selectedStudent.firstName} in ${existingSubjectIds.length} subjects`);
    setShowEnrollModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Enrollment Management</h1>
          <p className="text-sm text-muted-foreground">Manage student enrollments by program and year level</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Students</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">
            {activeStudents.length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Enrolled This Term</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">
            {enrollments.filter((e) => e.status === "enrolled").length}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Available Subjects</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{subjects.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Faculty Available</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{facultyUsers.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <select
          value={programFilter}
          onChange={(e) => setProgramFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-1.5 text-xs"
        >
          <option value="All">All Programs</option>
          {programs.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="rounded-lg border bg-card px-3 py-1.5 text-xs"
        >
          <option value="All">All Years</option>
          {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Year Level</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enrolled Subjects</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s, i) => {
              const studentEnrollments = enrollments.filter((e) => e.studentId === s.studentId && e.status === "enrolled");
              return (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.studentId}</td>
                <td className="px-4 py-3 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.program}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.yearLevel}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                    {enrollments.filter((e) => e.studentId === s.studentId && e.status === "enrolled").length} subjects
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="rounded-lg border px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5 inline mr-1" /> View
                    </button>
                    <button
                      onClick={() => handleOpenEnroll(s)}
                      className="rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      <BookPlus className="h-3.5 w-3.5 inline mr-1" /> Enroll
                    </button>
                  </div>
                </td>
                </motion.tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No students found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Enrolled Subjects Modal */}
      {selectedStudent && !showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedStudent(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-foreground">Enrolled Subjects</h2>
              <button onClick={() => setSelectedStudent(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{selectedStudent.firstName} {selectedStudent.lastName}</p>
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {enrollments.filter((e) => e.studentId === selectedStudent.studentId && e.status === "enrolled").map((e) => {
                const subj = subjects.find((s) => s.id === e.subjectId);
                return (
                  <div key={e.id} className="rounded-lg bg-muted/50 px-3 py-2 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{subj?.code || "—"}</p>
                      <p className="text-xs text-muted-foreground">{subj?.title || "Unknown Subject"}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{e.semester}</span>
                  </div>
                );
              })}
              {enrollments.filter((e) => e.studentId === selectedStudent.studentId && e.status === "enrolled").length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No enrolled subjects</p>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Enroll Modal */}
      {showEnrollModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEnrollModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">Enroll Student</h2>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-sm font-medium text-foreground">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{selectedStudent.program}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Year Level</label>
                  <select
                    value={selectedYearLevel}
                    onChange={(e) => { setSelectedYearLevel(e.target.value); loadCurriculumForStudent(selectedStudent); }}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {["1st Year", "2nd Year", "3rd Year", "4th Year"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Semester</label>
                  <select
                    value={selectedSemester}
                    onChange={(e) => { setSelectedSemester(e.target.value); loadCurriculumForStudent(selectedStudent); }}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    {["1st Semester", "2nd Semester", "Summer"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
                <input
                  value={selectedAcademicYear}
                  onChange={(e) => setSelectedAcademicYear(e.target.value)}
                  placeholder={`${currentYear}-${currentYear + 1}`}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Curriculum Subjects:</p>
                <div className="flex flex-wrap gap-1">
                  {curriculumSubjects.map((s) => (
                    <span key={s.code} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {s.code}
                    </span>
                  ))}
                  {curriculumSubjects.length === 0 && (
                    <span className="text-xs text-muted-foreground">No subjects in curriculum</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-medium text-foreground mb-2">Available Subject Offerings:</p>
                <div className="flex flex-wrap gap-1">
                  {subjects.filter((s) => s.program === selectedStudent.program && s.yearLevel === selectedYearLevel && s.semester === selectedSemester).map((s) => (
                    <span key={s.id} className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
                      {s.code}
                    </span>
                  ))}
                  {subjects.filter((s) => s.program === selectedStudent.program && s.yearLevel === selectedYearLevel && s.semester === selectedSemester).length === 0 && (
                    <span className="text-xs text-muted-foreground">No offerings created yet</span>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setShowEnrollModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEnrollStudent}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Enroll Student
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
