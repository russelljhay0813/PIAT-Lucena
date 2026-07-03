import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus } from "lucide-react";
import { fetchUsers as fetchFacultyUsers, fetchSubjects, updateSubjectApi } from "@/lib/api";
import type { UserAccount } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard/registrar/faculty")({
  component: RegistrarFaculty,
});

function RegistrarFaculty() {
  const [faculty, setFaculty] = useState<UserAccount[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFaculty, setSelectedFaculty] = useState<UserAccount | null>(null);
  const [assignModal, setAssignModal] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignSubject, setReassignSubject] = useState<any | null>(null);
  const [newFacultyId, setNewFacultyId] = useState("");

  const loadData = async () => {
    try {
      const [f, s] = await Promise.all([fetchFacultyUsers("faculty"), fetchSubjects()]);
      setFaculty(f);
      setSubjects(s);
    } catch {
      setFaculty([]);
      setSubjects([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredFaculty = faculty.filter((f) => {
    const q = search.toLowerCase();
    return (
      `${f.firstName} ${f.lastName}`.toLowerCase().includes(q) ||
      f.userId.toLowerCase().includes(q) ||
      (f.email && f.email.toLowerCase().includes(q))
    );
  });

  const getFacultySubjects = (facultyId: string) => subjects.filter((s) => s.facultyId === facultyId);
  const getTotalUnits = (facultyId: string) => getFacultySubjects(facultyId).reduce((sum, s) => sum + s.units, 0);

  const handleAssign = async () => {
    if (!selectedFaculty || !selectedSubjectId) return;
    try {
      await updateSubjectApi(selectedSubjectId, { facultyId: selectedFaculty.id, instructor: `${selectedFaculty.firstName} ${selectedFaculty.lastName}` });
      toast.success("Subject assigned");
      setAssignModal(false);
      setSelectedFaculty(null);
      setSelectedSubjectId("");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign subject");
    }
  };

  const handleReassign = async () => {
    if (!reassignSubject || !newFacultyId) return;
    const newFaculty = faculty.find((f) => f.id === newFacultyId);
    if (!newFaculty) return;
    try {
      await updateSubjectApi(reassignSubject.id, { facultyId: newFaculty.id, instructor: `${newFaculty.firstName} ${newFaculty.lastName}` });
      toast.success("Subject reassigned");
      setReassignModal(false);
      setReassignSubject(null);
      setNewFacultyId("");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to reassign subject");
    }
  };

  const handleRemoveAssignment = async (subject: any) => {
    if (!confirm(`Remove faculty assignment from ${subject.code}?`)) return;
    try {
      await updateSubjectApi(subject.id, { facultyId: "", instructor: "Unassigned" });
      toast.success("Assignment removed");
      loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove assignment");
    }
  };

  const openAssignModal = (fac: UserAccount) => {
    setSelectedFaculty(fac);
    setSelectedSubjectId("");
    setAssignModal(true);
  };

  const openReassignModal = (subject: any) => {
    setReassignSubject(subject);
    setNewFacultyId("");
    setReassignModal(true);
  };

  const unassignedSubjects = subjects.filter((s) => !s.facultyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Faculty Assignment</h1>
        <p className="text-sm text-muted-foreground">Manage faculty subject assignments and workloads</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Faculty</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{faculty.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Unassigned Subjects</p>
          <p className="mt-1 font-heading text-2xl font-bold text-warning">{unassignedSubjects.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Total Subject Offerings</p>
          <p className="mt-1 font-heading text-2xl font-bold text-foreground">{subjects.length}</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by faculty name or ID..."
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Faculty ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Faculty Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Department</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Assigned Subjects</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Current Load (Units)</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredFaculty.map((f, i) => {
              const assigned = getFacultySubjects(f.id);
              return (
                <motion.tr
                  key={f.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.userId}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{f.firstName} {f.lastName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.program || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {assigned.length === 0 ? (
                        <span className="text-xs text-muted-foreground">None</span>
                      ) : (
                        assigned.map((s) => (
                          <span key={s.id} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                            {s.code}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getTotalUnits(f.id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAssignModal(f)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> Assign
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
            {filteredFaculty.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No faculty found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={assignModal} onOpenChange={setAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subject</DialogTitle>
            <DialogDescription>
              Assign a subject to {selectedFaculty?.firstName} {selectedFaculty?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} - {s.title}
                    </SelectItem>
                  ))}
                  {unassignedSubjects.length === 0 && (
                    <div className="p-2 text-xs text-muted-foreground">No unassigned subjects</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Or reassign from existing:</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setAssignModal(false); setTimeout(() => openReassignModal(s), 100); }}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground hover:bg-muted/80"
                  >
                    {s.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModal(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedSubjectId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reassignModal} onOpenChange={setReassignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Subject</DialogTitle>
            <DialogDescription>
              Reassign {reassignSubject?.code} to a different faculty member
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>New Faculty</Label>
              <Select value={newFacultyId} onValueChange={setNewFacultyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select faculty..." />
                </SelectTrigger>
                <SelectContent>
                  {faculty.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.firstName} {f.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignModal(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={!newFacultyId}>Reassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
