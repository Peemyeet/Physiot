import type { ClassItem, TermData } from "./types";
import { freshFixedClasses } from "./seed";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";
const TERM_KEY = "kmitl-2569-1";
const STORAGE_KEY = `physiot-schedule-v3:${TERM_KEY}`;

let backendUp: boolean | null = null;

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

function lsGet(): TermData {
  if (typeof window === "undefined") return { classes: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  const seeded: TermData = { classes: freshFixedClasses() };
  lsSet(seeded);
  return seeded;
}

function lsSet(data: TermData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ---------------- public API ---------------- */

export async function getTerm(): Promise<TermData> {
  if (await ping()) {
    try {
      const res = await fetch(`${API_BASE}/api/months/${TERM_KEY}`);
      if (res.ok) {
        const data = (await res.json()) as TermData;
        // Seed the backend the first time it comes up empty.
        if (!data.classes || data.classes.length === 0) {
          for (const c of freshFixedClasses()) {
            await fetch(`${API_BASE}/api/months/${TERM_KEY}/classes`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(c),
            });
          }
          const res2 = await fetch(`${API_BASE}/api/months/${TERM_KEY}`);
          if (res2.ok) return (await res2.json()) as TermData;
        }
        return data;
      }
    } catch {
      backendUp = false;
    }
  }
  return lsGet();
}

export async function saveClass(cls: ClassItem): Promise<TermData> {
  if (await ping()) {
    try {
      const res = await fetch(`${API_BASE}/api/months/${TERM_KEY}/classes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cls),
      });
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  const data = lsGet();
  const idx = data.classes.findIndex((c) => c.id === cls.id);
  if (idx >= 0) data.classes[idx] = cls;
  else data.classes.push(cls);
  lsSet(data);
  return data;
}

export async function deleteClass(id: string): Promise<TermData> {
  if (await ping()) {
    try {
      const res = await fetch(`${API_BASE}/api/months/${TERM_KEY}/classes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  const data = lsGet();
  data.classes = data.classes.filter((c) => c.id !== id);
  lsSet(data);
  return data;
}

/** Reset to the original fixed schedule (clears user edits/tasks). */
export async function resetTerm(): Promise<TermData> {
  const fresh: TermData = { classes: freshFixedClasses() };
  if (await ping()) {
    try {
      // delete everything then re-seed
      const cur = await fetch(`${API_BASE}/api/months/${TERM_KEY}`);
      if (cur.ok) {
        const data = (await cur.json()) as TermData;
        for (const c of data.classes) {
          await fetch(`${API_BASE}/api/months/${TERM_KEY}/classes/${c.id}`, {
            method: "DELETE",
          });
        }
      }
      for (const c of fresh.classes) {
        await fetch(`${API_BASE}/api/months/${TERM_KEY}/classes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
      }
      const res = await fetch(`${API_BASE}/api/months/${TERM_KEY}`);
      if (res.ok) return (await res.json()) as TermData;
    } catch {
      backendUp = false;
    }
  }
  lsSet(fresh);
  return fresh;
}
