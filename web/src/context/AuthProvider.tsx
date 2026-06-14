"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { clearSession, getSession, loginWithId } from "@/lib/auth";
import { setApiUser } from "@/lib/api";
import type { StudentUser } from "@/lib/users";

interface AuthCtx {
  user: StudentUser | null;
  ready: boolean;
  login: (id: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setApiUser(session.id);
      setUser(session);
    }
    setReady(true);
  }, []);

  const login = useCallback((id: string) => {
    const result = loginWithId(id);
    if (!result.ok) return result;
    setApiUser(result.user.id);
    setUser(result.user);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setApiUser(null);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
