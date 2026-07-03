import { createFileRoute } from "@tanstack/react-router";
import { Settings, Bell, Globe, Database, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/dashboard/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const [settings, setSettings] = useState({
    schoolName: "Philtech Institute Of Arts And Technology",
    academicYear: "2025-2026",
    semester: "2nd Semester",
    enrollmentOpen: true,
    emailNotifications: true,
    maintenanceMode: false,
    autoBackup: true,
  });

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
          {[
            { label: "Institution Name", value: settings.schoolName, key: "schoolName" },
            { label: "Academic Year", value: settings.academicYear, key: "academicYear" },
            { label: "Current Semester", value: settings.semester, key: "semester" },
          ].map((field) => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
              <input value={field.value} onChange={(e) => setSettings((p) => ({ ...p, [field.key]: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent" />
            </div>
          ))}
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
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settings[item.key] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
