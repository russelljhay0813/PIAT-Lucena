import { createContext, useContext, useState, type ReactNode } from "react";

export type UserRole = "student" | "faculty" | "admin" | "registrar";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentId?: string;
  program?: string;
  yearLevel?: string;
  semester?: string;
  academicYear?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
}

interface AuthContextType {
  user: User | null;
  loginAs: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const loginAs = (u: User) => {
    setUser(u);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginAs, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}