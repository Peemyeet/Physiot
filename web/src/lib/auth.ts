import { findStudent, type StudentUser } from "./users";

const SESSION_KEY = "physiot-session-v1";

export function getSession(): StudentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { id } = JSON.parse(raw) as { id: string };
    return findStudent(id);
  } catch {
    return null;
  }
}

export function saveSession(user: StudentUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, at: Date.now() }));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function loginWithId(rawId: string): { ok: true; user: StudentUser } | { ok: false; error: string } {
  const id = rawId.trim();
  if (!/^\d{8}$/.test(id)) {
    return { ok: false, error: "รหัสนักศึกษาต้องเป็นตัวเลข 8 หลัก" };
  }
  const user = findStudent(id);
  if (!user) {
    return { ok: false, error: "ไม่พบรหัสนักศึกษานี้ในระบบ" };
  }
  saveSession(user);
  return { ok: true, user };
}
