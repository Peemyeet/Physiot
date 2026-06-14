import type { ClassItem, TermData } from "./types";
import { freshFixedClasses } from "./seed";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";
const TERM_KEY = "kmitl-2569-1";

let backendUp: boolean | null = null;
let currentUserId: string | null = null;

export function setApiUser(userId: string | null) {
  currentUserId = userId;
  backendUp = null; // re-ping on user switch
}

function requireUser(): string {
  if (!currentUserId) throw new Error("Not logged in");
  return currentUserId;
}

function storageKey(userId: string) {
  return `physiot-schedule-v4:${TERM_KEY}:${userId}`;
}

function apiPath(userId: string) {
  return `${API_BASE}/api/users/${userId}/term/${TERM_KEY}`;
}

async function ping(): Promise<boolean> {
  if (backendUp !== null) return backendUp;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch(`${API_BASE}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    backendUp = res.ok;
  } catch {
    backendUp = false;
  }
  return backendUp;
}

export function usingBackend(): boolean {
  return backendUp === true;
}

/* ---------------- localStorage fallback ---------------- */

function lsGet(userId: string): TermData {
  if (typeof window === "undefined") return { classes: [] };
  const key = storageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const seeded: TermData = { classes: freshFixedClasses(userId) };
  lsSet(userId, seeded);
  return seeded;
}

function lsSet(userId: string, data: TermData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(userId), JSON.stringify(data));
}

/* ---------------- public API ---------------- */

export async function getTerm(): Promise<TermData> {
  const userId = requireUser();

  if (await ping()) {
    try {
      const res = await fetch(apiPath(userId));
      if (res.ok) {
        const data = (await res.json()) as TermData;
        if (!data.classes || data.classes.length === 0) {
          for (const c of freshFixedClasses(userId)) {
            await fetch(`${apiPath(userId)}/classes`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            });
          }
          const res2 = await fetch(apiPath(userId));
          if (res2.ok) return (await res2.json()) as TermData;
        }
        return data;
      }
    } catch {
      backendUp = false;
    }
  }
  return lsGet(userId);
}

export async function saveClass(cls: ClassItem): Promise<TermData> {
  const userId = requireUser();

  if (await ping()) {
    try {
      const res = await fetch(`${apiPath(userId)}/classes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cls),
      });
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  const data = lsGet(userId);
  const idx = data.classes.findIndex((c) => c.id === cls.id);
  if (idx >= 0) data.classes[idx] = cls;
  else data.classes.push(cls);
  lsSet(userId, data);
  return data;
}

export async function deleteClass(id: string): Promise<TermData> {
  const userId = requireUser();

  if (await ping()) {
    try {
      const res = await fetch(`${apiPath(userId)}/classes/${id}`, { method: "DELETE" });
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  const data = lsGet(userId);
  data.classes = data.classes.filter((c) => c.id !== id);
  lsSet(userId, data);
  return data;
}

export async function resetTerm(): Promise<TermData> {
  const userId = requireUser();
  const fresh: TermData = { classes: freshFixedClasses(userId) };

  if (await ping()) {
    try {
      const cur = await fetch(apiPath(userId));
      if (cur.ok) {
        const data = (await cur.json()) as TermData;
        for (const c of data.classes) {
          await fetch(`${apiPath(userId)}/classes/${c.id}`, { method: "DELETE" });
        }
      }
      for (const c of fresh.classes) {
        await fetch(`${apiPath(userId)}/classes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
      }
      const res = await fetch(apiPath(userId));
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  lsSet(userId, fresh);
  return fresh;
}
