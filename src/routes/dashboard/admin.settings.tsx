import { createFileRoute } from "@tanstack/react-router";
import { Settings, Bell, Globe, Database, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchAcademicStructure, type AcademicStructure } from "@/lib/api";
import { SEMESTERS } from "@/lib/subjects-store";

export const Route = createFileRoute("/dashboard/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [academicStructure, setAcademicStructure] = useState<AcademicStructure>({ academicYears: [], yearLevels: [], semesters: [] });
  const [settings, setSettings] = useState({
    schoolName: "Philtech Institute Of Arts And Technology",
    academicYear: "",
    semester: "",
    enrollmentOpen: true,
    emailNotifications: true,
    maintenanceMode: false,
    autoBackup: true,
  });

  const defaultAcademicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  useEffect(() => {
    fetchAcademicStructure()
      .then((structure) => {
        setAcademicStructure(structure);
        setSettings((prev) => ({
          ...prev,
          academicYear: prev.academicYear || structure.academicYears[0] || defaultAcademicYear,
          semester: prev.semester || structure.semesters[0] || SEMESTERS[0],
        }));
      })
      .catch(() => {
        setAcademicStructure({ academicYears: [], yearLevels: [], semesters: [] });
      });
  }, []);

  const toggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">System configuration and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">General</h2>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Institution Name</label>
            <input
              value={settings.schoolName}
              onChange={(e) => setSettings((p) => ({ ...p, schoolName: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
            <select
              value={settings.academicYear}
              onChange={(e) => setSettings((p) => ({ ...p, academicYear: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {(academicStructure.academicYears.length ? academicStructure.academicYears : [defaultAcademicYear]).map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Current Semester</label>
            <select
              value={settings.semester}
              onChange={(e) => setSettings((p) => ({ ...p, semester: e.target.value }))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {(academicStructure.semesters.length ? academicStructure.semesters : SEMESTERS).map((semester) => (
                <option key={semester} value={semester}>{semester}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-accent" />
            <h2 className="font-heading text-sm font-semibold text-card-foreground">System Toggles</h2>
          </div>
          {[
            { label: "Enrollment Open", key: "enrollmentOpen" as const, icon: Database, desc: "Allow new student enrollment" },
            { label: "Email Notifications", key: "emailNotifications" as const, icon: Mail, desc: "Send system email alerts" },
            { label: "Maintenance Mode", key: "maintenanceMode" as const, icon: Bell, desc: "Show maintenance banner to users" },
            { label: "Auto Backup", key: "autoBackup" as const, icon: Database, desc: "Daily automatic database backup" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <button onClick={() => toggle(item.key)}
                className={`relative h-6 w-11 rounded-full transition-colors ${settings[item.key] ? "bg-accent" : "bg-muted-foreground/30"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[item.key] ? "left-5.5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
