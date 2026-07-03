import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { User, Mail, BookOpen, Building2, Camera, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { fetchUsers, type UserAccount } from "@/lib/api";
import { fetchSubjects, type Subject } from "@/lib/api";
import { useEffect, useState, useCallback } from "react";

export const Route = createFileRoute("/dashboard/faculty/profile")({
  component: FacultyProfile,
});

function FacultyProfile() {
  const { user } = useAuth();
  const [facultyInfo, setFacultyInfo] = useState<UserAccount | null>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<Subject[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadFacultyInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const allUsers = await fetchUsers();
      const facultyUser = allUsers.find((u) => u.id === user.id);
      setFacultyInfo(facultyUser as UserAccount || null);
    } catch {
      setFacultyInfo(null);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFacultyInfo();
  }, [loadFacultyInfo]);

  useEffect(() => {
    const loadAssignedSubjects = async () => {
      if (!user?.id) return;
      try {
        const allSubjects = await fetchSubjects();
        setAssignedSubjects(allSubjects.filter((s) => s.facultyId === user.id));
      } catch {
        setAssignedSubjects([]);
      }
    };
    loadAssignedSubjects();
  }, [user?.id]);

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    try {
      const response = await fetch(`/api/users/${user?.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!response.ok) throw new Error("Failed to update password");
      alert("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      alert("Failed to change password");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile information
        </p>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
          Faculty Information
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-xs text-muted-foreground">Faculty ID</span>
            <p className="font-medium text-foreground font-mono">{user?.studentId || user?.id || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Full Name</span>
            <p className="font-medium text-foreground">{user?.firstName || user?.name || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Email</span>
            <p className="font-medium text-foreground">{user?.email || "—"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Department</span>
            <p className="font-medium text-foreground">{user?.program || facultyInfo?.program || "—"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
          Change Password
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handlePasswordChange}
            disabled={!newPassword || newPassword !== confirmPassword}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Lock className="h-3.5 w-3.5" />
            Update Password
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-heading text-sm font-semibold text-card-foreground mb-4">
          Assigned Subjects ({assignedSubjects.length})
        </h2>
        {assignedSubjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedSubjects.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2"
              >
                <BookOpen className="h-4 w-4 text-accent" />
                <div>
                  <p className="font-medium text-foreground">{s.code} - {s.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.units} units · {s.schedule} · {s.room}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}