import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { BookOpen, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import { useSubjects, YEAR_LEVELS, SEMESTERS } from "@/lib/subjects-store";
import { createSubject } from "@/lib/api";
import { fetchUsers, fetchPrograms } from "@/lib/api";
import type { UserAccount } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard/registrar/subjects")({
  component: RegistrarSubjects,
});

function RegistrarSubjects() {
  const subjects = useSubjects();
  const [facultyUsers, setFacultyUsers] = useState<UserAccount[]>([]);
  const [programs, setPrograms] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [programFilter, setProgramFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [semesterFilter, setSemesterFilter] = useState("All");
  const [facultySearch, setFacultySearch] = useState("");

  const [newSubject, setNewSubject] = useState({
    code: "",
    title: "",
    units: "3",
    schedule: "",
    room: "",
    program: "",
    yearLevel: "1st Year",
    semester: "1st Semester",
    facultyId: "",
  });

  useEffect(() => {
    const loadFaculty = async () => {
      const allUsers = await fetchUsers("faculty");
      setFacultyUsers(allUsers);
    };
    const loadPrograms = async () => {
      try {
        const data = await fetchPrograms();
        setPrograms(data);
      } catch {
        setPrograms([]);
      }
    };
    loadFaculty();
    loadPrograms();
  }, []);

  const filteredSubjects = subjects.filter((s) => {
    const matchProgram = programFilter === "All" || s.program === programFilter;
    const matchYear = yearFilter === "All" || s.yearLevel === yearFilter;
    const matchSemester = semesterFilter === "All" || s.semester === semesterFilter;
    return matchProgram && matchYear && matchSemester;
  });

  const filteredFaculty = facultyUsers.filter((f) => {
    const q = facultySearch.toLowerCase();
    return `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) || f.email.toLowerCase().includes(q);
  });

  const handleCreateSubject = async () => {
    if (!newSubject.code || !newSubject.title) {
      toast.error("Subject code and title are required");
      return;
    }

    const faculty = facultyUsers.find((f) => f.id === newSubject.facultyId);
    await createSubject({
      code: newSubject.code,
      title: newSubject.title,
      units: Number(newSubject.units),
      schedule: newSubject.schedule,
      room: newSubject.room,
      instructor: faculty ? `${faculty.firstName} ${faculty.lastName}` : "Unassigned",
      program: newSubject.program,
      yearLevel: newSubject.yearLevel,
      semester: newSubject.semester,
      facultyId: newSubject.facultyId,
    });

    toast.success("Subject offering created");
    setShowCreateModal(false);
    setNewSubject({
      code: "",
      title: "",
      units: "3",
      schedule: "",
      room: "",
      program: "",
      yearLevel: "1st Year",
      semester: "1st Semester",
      facultyId: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">Subject Offerings</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage subject offerings organized by program, year level, and semester
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Subject
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Years</SelectItem>
            {YEAR_LEVELS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={semesterFilter} onValueChange={setSemesterFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Semesters</SelectItem>
            {SEMESTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Program</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Year</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Semester</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Units</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Schedule</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Room</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned Faculty</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubjects.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-foreground font-medium">{s.code}</td>
                <td className="px-4 py-3 text-foreground">{s.title}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.program || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.yearLevel || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.semester || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.units}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.schedule}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.room}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.instructor}</td>
              </motion.tr>
            ))}
            {filteredSubjects.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No subject offerings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Subject Offering</DialogTitle>
            <DialogDescription>
              Create a subject offering that will be assigned to students and faculty
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">Subject Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., CS 101"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">Subject Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Introduction to Computing"
                  value={newSubject.title}
                  onChange={(e) => setNewSubject({ ...newSubject, title: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="units">Units</Label>
                <Input
                  id="units"
                  type="number"
                  min="1"
                  max="6"
                  value={newSubject.units}
                  onChange={(e) => setNewSubject({ ...newSubject, units: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schedule">Schedule</Label>
                <Input
                  id="schedule"
                  placeholder="MWF 8:00-9:00 AM"
                  value={newSubject.schedule}
                  onChange={(e) => setNewSubject({ ...newSubject, schedule: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="program">Program</Label>
                <Select
                  value={newSubject.program}
                  onValueChange={(v) => setNewSubject({ ...newSubject, program: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select program..." />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="yearLevel">Year Level</Label>
                <Select
                  value={newSubject.yearLevel}
                  onValueChange={(v) => setNewSubject({ ...newSubject, yearLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year..." />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVELS.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={newSubject.semester}
                  onValueChange={(v) => setNewSubject({ ...newSubject, semester: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SEMESTERS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faculty">Assigned Faculty</Label>
                <Select
                  value={newSubject.facultyId}
                  onValueChange={(v) => setNewSubject({ ...newSubject, facultyId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search faculty..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        <input
                          className="w-full rounded-md border bg-background pl-8 pr-2 py-1 text-xs"
                          placeholder="Search..."
                          value={facultySearch}
                          onChange={(e) => setFacultySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    {filteredFaculty.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.firstName} {f.lastName}
                      </SelectItem>
                    ))}
                    {filteredFaculty.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground">No faculty found</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Input
                id="room"
                placeholder="Room 201"
                value={newSubject.room}
                onChange={(e) => setNewSubject({ ...newSubject, room: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject}>Create Subject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
