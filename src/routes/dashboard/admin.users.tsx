import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Users, Search, UserCheck, UserX, Shield, Plus, Copy, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useUsers, createUser, UserRole, updateUser, toggleUserStatus } from "@/lib/users-store";
import { fetchPrograms } from "@/lib/api";
import { toast } from "sonner";

const YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SEMESTERS = ["1st Semester", "2nd Semester", "Summer"];

export const Route = createFileRoute("/dashboard/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const users = useUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"All" | UserRole>("All");
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [programs, setPrograms] = useState<string[]>([]);
  const currentYear = new Date().getFullYear();
  const [createStudentForm, setCreateStudentForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    program: "",
    yearLevel: "1st Year",
    semester: "1st Semester",
    academicYear: `${currentYear}-${currentYear + 1}`,
  });
  const [createStaffForm, setCreateStaffForm] = useState({
    role: "faculty" as UserRole,
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    fetchPrograms()
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  const filtered = users.filter((u) => {
    const matchSearch =
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      u.userId.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total: users.length,
    active: users.filter((u) => u.status === "active").length,
    inactive: users.filter((u) => u.status === "inactive").length,
  };

  const roleCounts = {
    admin: users.filter((u) => u.role === "admin").length,
    faculty: users.filter((u) => u.role === "faculty").length,
    registrar: users.filter((u) => u.role === "registrar").length,
    student: users.filter((u) => u.role === "student").length,
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStudentForm.firstName || !createStudentForm.lastName || !createStudentForm.program) {
      toast.error("First name, last name, and program are required");
      return;
    }
    await createUser({
      role: "student",
      firstName: createStudentForm.firstName,
      middleName: createStudentForm.middleName || undefined,
      lastName: createStudentForm.lastName,
      email: createStudentForm.email || undefined,
      program: createStudentForm.program,
      yearLevel: createStudentForm.yearLevel,
      semester: createStudentForm.semester,
      academicYear: createStudentForm.academicYear,
    });
    setShowStudentModal(false);
    setCreateStudentForm({ firstName: "", middleName: "", lastName: "", email: "", program: "", yearLevel: "1st Year", semester: "1st Semester", academicYear: `${currentYear}-${currentYear + 1}` });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createStaffForm.firstName || !createStaffForm.lastName) {
      toast.error("First name and last name are required");
      return;
    }
    await createUser({
      role: createStaffForm.role,
      firstName: createStaffForm.firstName,
      middleName: createStaffForm.middleName || undefined,
      lastName: createStaffForm.lastName,
      email: createStaffForm.email || undefined,
    });
    setShowStaffModal(false);
    setCreateStaffForm({ role: "faculty", firstName: "", middleName: "", lastName: "", email: "" });
  };

  const copyCredentials = (username: string, password?: string) => {
    const pwd = password || "No temporary password";
    navigator.clipboard.writeText(`${username} / ${pwd}`);
    toast.success("Credentials copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage all system users and roles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowStaffModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create Staff
          </button>
          <button
            onClick={() => setShowStudentModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Create Student
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="font-heading text-lg font-bold text-foreground">{counts.total}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <UserCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="font-heading text-lg font-bold text-success">{counts.active}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <UserX className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Inactive</p>
              <p className="font-heading text-lg font-bold text-destructive">{counts.inactive}</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Admins</p>
              <p className="font-heading text-lg font-bold text-foreground">{roleCounts.admin}</p>
            </div>
          </div>
        </motion.div>
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
        <div className="flex gap-1">
          {(["All", "admin", "faculty", "registrar", "student"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${roleFilter === r ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.userId}</td>
                <td className="px-4 py-3 font-medium text-foreground">
                  {u.firstName} {u.middleName ? u.middleName + " " : ""}{u.lastName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{u.username}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium capitalize text-accent">
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyCredentials(u.username, u.temporaryPassword)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      title="Copy credentials"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => toggleUserStatus(u.id, u.status)}
                      className={`rounded p-1 ${u.status === "active" ? "text-destructive" : "text-success"}`}
                      title={u.status === "active" ? "Deactivate" : "Activate"}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
          >
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">Create New Student</h2>
            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                <input
                  value={createStudentForm.firstName}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, firstName: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Middle Name</label>
                <input
                  value={createStudentForm.middleName}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, middleName: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                <input
                  value={createStudentForm.lastName}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, lastName: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
                <input
                  type="email"
                  value={createStudentForm.email}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, email: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Program *</label>
                <select
                  value={createStudentForm.program}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, program: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select program...</option>
                  {programs.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Year Level *</label>
                <select
                  value={createStudentForm.yearLevel}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, yearLevel: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {YEAR_LEVELS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Semester *</label>
                <select
                  value={createStudentForm.semester}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, semester: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  {SEMESTERS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Academic Year *</label>
                <input
                  value={createStudentForm.academicYear}
                  onChange={(e) => setCreateStudentForm({ ...createStudentForm, academicYear: e.target.value })}
                  placeholder={`${currentYear}-${currentYear + 1}`}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:opacity-90"
                >
                  Create Student
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg"
          >
            <h2 className="font-heading text-lg font-bold text-foreground mb-4">Create New Staff</h2>
            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select
                  value={createStaffForm.role}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, role: e.target.value as UserRole })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="admin">Administrator</option>
                  <option value="faculty">Faculty</option>
                  <option value="registrar">Registrar</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">First Name *</label>
                <input
                  value={createStaffForm.firstName}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, firstName: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Middle Name</label>
                <input
                  value={createStaffForm.middleName}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, middleName: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Name *</label>
                <input
                  value={createStaffForm.lastName}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, lastName: e.target.value })}
                  required
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Email (optional)</label>
                <input
                  type="email"
                  value={createStaffForm.email}
                  onChange={(e) => setCreateStaffForm({ ...createStaffForm, email: e.target.value })}
                  placeholder="Auto-generated if empty"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="rounded-lg border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Create Staff
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}