import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { loginUser, loginStudent, type UserAccount } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — PIAT Academic Management System" },
      { name: "description", content: "Sign in to the PIAT Academic Management System to access your dashboard." },
    ],
  }),
  component: LoginPage,
});

const roleDashboardPaths: Record<UserAccount["role"], string> = {
  admin: "/dashboard/admin",
  faculty: "/dashboard/faculty",
  registrar: "/dashboard/registrar",
  student: "/dashboard/student",
};

function LoginPage() {
  const { loginAs, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    if (user.role === "student") {
      const registrationStatus = user.registrationStatus?.toLowerCase();
      if (!registrationStatus || registrationStatus !== "approved") {
        navigate({ to: "/register" });
        return;
      }
    }

    navigate({ to: roleDashboardPaths[user.role] });
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let userAccount: UserAccount | null = await loginUser(email, password);
      let studentRecord = null;

      if (!userAccount) {
        studentRecord = await loginStudent(email, password);
        if (studentRecord) {
          userAccount = {
            id: studentRecord.id,
            userId: studentRecord.studentId,
            username: studentRecord.email,
            email: studentRecord.email,
            firstName: studentRecord.firstName,
            lastName: studentRecord.lastName,
            role: "student",
            status: "active",
            program: studentRecord.program,
            yearLevel: studentRecord.yearLevel,
            semester: studentRecord.semester,
            academicYear: studentRecord.academicYear,
            createdAt: studentRecord.submittedAt,
          };
        } else {
          setError("Invalid email or password.");
          setIsLoading(false);
          return;
        }
      }

      if (userAccount.role === "student") {
        try {
          studentRecord = await loginStudent(email, password);
        } catch {
          studentRecord = null;
        }
      }

      const sessionUser = {
        id: userAccount.id,
        name: `${userAccount.firstName} ${userAccount.lastName}`,
        email: userAccount.email,
        role: userAccount.role,
        studentId: studentRecord?.studentId || userAccount.userId || userAccount.studentId,
        program: studentRecord?.program || userAccount.program,
        yearLevel: studentRecord?.yearLevel || userAccount.yearLevel,
        semester: studentRecord?.semester || userAccount.semester,
        academicYear: studentRecord?.academicYear || userAccount.academicYear,
        firstName: userAccount.firstName,
        lastName: userAccount.lastName,
        middleName: userAccount.middleName || undefined,
        registrationStatus: userAccount.role === "student" ? studentRecord?.status : undefined,
      };

      loginAs(sessionUser);

      if (userAccount.role === "student") {
        const nextStatus = studentRecord?.status?.toLowerCase();
        if (!nextStatus || nextStatus !== "approved") {
          navigate({ to: "/register" });
          return;
        }
      }
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,rgba(122,20,20,0.12),transparent_60%)] px-4 py-16">
      <motion.div
        initial={isHydrated ? { opacity: 0, y: 24 } : false}
        animate={isHydrated ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground shadow-lg">
            PIAT
          </div>
          <h1 className="font-heading text-3xl font-semibold text-foreground">PIAT Academic Management System</h1>
          <p className="mt-2 text-sm text-muted-foreground">Secure sign-in for students, faculty, registrar, and administrators.</p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-xl shadow-maroon-primary/10">
          <h2 className="font-heading text-lg font-semibold text-foreground">User Login</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your registered email and password to continue.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@piat.edu.ph"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" /> {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </motion.div>
      <footer className="absolute bottom-0 w-full border-t border-border/70 bg-background/80 px-4 py-4 text-center text-sm text-muted-foreground backdrop-blur">
        © 2026 PIAT Academic Management System
      </footer>
    </div>
  );
}
