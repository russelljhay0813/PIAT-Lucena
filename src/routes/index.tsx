import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { loginUser, loginStudent, type UserAccount } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PIAT — Academic Management System" },
      { name: "description", content: "Secure role-based academic management system for Philtech Institute Of Arts And Technology." },
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
    if (isAuthenticated && user) {
      navigate({ to: roleDashboardPaths[user.role] });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      let userAccount: UserAccount | null = await loginUser(email, password);

      if (!userAccount) {
        const student = await loginStudent(email, password);
        if (student) {
          if (student.status === "pending") {
            setError("Your registration is still pending registrar approval.");
            setIsLoading(false);
            return;
          }
          if (student.status === "rejected") {
            setError("Your registration was rejected. Please contact the registrar.");
            setIsLoading(false);
            return;
          }
          userAccount = {
            id: student.id,
            userId: student.studentId,
            username: student.email,
            email: student.email,
            firstName: student.firstName,
            lastName: student.lastName,
            role: "student",
            status: "active",
            program: student.program,
            yearLevel: student.yearLevel,
            semester: student.semester,
            academicYear: student.academicYear,
            createdAt: student.submittedAt,
          };
        } else {
          setError("Invalid email or password.");
          setIsLoading(false);
          return;
        }
      }

      const user = userAccount;
      loginAs({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        studentId: user.userId,
        program: user.program,
        yearLevel: user.yearLevel,
        semester: user.semester,
        academicYear: user.academicYear,
        firstName: user.firstName,
        lastName: user.lastName,
        middleName: user.middleName || undefined,
      });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-maroon-primary to-maroon-light px-4">
      <motion.div
        initial={isHydrated ? { opacity: 0, y: 20 } : false}
        animate={isHydrated ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-maroon-primary">PIAT</h1>
          <p className="mt-1 text-sm text-maroon-primary/70">Philtech Institute Of Arts And Technology</p>
          <p className="mt-1 text-xs text-maroon-primary/60">Academic Management System</p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-heading text-sm font-semibold text-foreground">User Login</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Sign in with your registered email and password</p>
          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}