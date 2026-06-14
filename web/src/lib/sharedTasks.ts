import type { SharedTask } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
const LS_KEY = "physiot-shared-tasks-v1";

let backendUp: boolean | null = null;

async function pingGo(): Promise<boolean> {
  if (!API_BASE) return false;
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

function lsGet(): SharedTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function lsSet(tasks: SharedTask[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(tasks));
}

async function apiGet(): Promise<SharedTask[] | null> {
  try {
    const res = await fetch("/api/shared/tasks", { cache: "no-store" });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    /* ignore */
  }
  return null;
}

async function apiPost(task: SharedTask): Promise<SharedTask[] | null> {
  try {
    const res = await fetch("/api/shared/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    /* ignore */
  }
  return null;
}

async function apiPatch(id: string, userId: string, done: boolean): Promise<SharedTask[] | null> {
  try {
    const res = await fetch(`/api/shared/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, done }),
    });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    /* ignore */
  }
  return null;
}

async function apiDelete(id: string): Promise<SharedTask[] | null> {
  try {
    const res = await fetch(`/api/shared/tasks/${id}`, { method: "DELETE" });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    /* ignore */
  }
  return null;
}

async function goGet(): Promise<SharedTask[] | null> {
  if (!(await pingGo())) return null;
  try {
    const res = await fetch(`${API_BASE}/api/shared/tasks`);
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    backendUp = false;
  }
  return null;
}

async function goPost(task: SharedTask): Promise<SharedTask[] | null> {
  if (!(await pingGo())) return null;
  try {
    const res = await fetch(`${API_BASE}/api/shared/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    backendUp = false;
  }
  return null;
}

async function goPatch(id: string, userId: string, done: boolean): Promise<SharedTask[] | null> {
  if (!(await pingGo())) return null;
  try {
    const res = await fetch(`${API_BASE}/api/shared/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, done }),
    });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    backendUp = false;
  }
  return null;
}

async function goDelete(id: string): Promise<SharedTask[] | null> {
  if (!(await pingGo())) return null;
  try {
    const res = await fetch(`${API_BASE}/api/shared/tasks/${id}`, { method: "DELETE" });
    if (res.ok) return (await res.json()) as SharedTask[];
  } catch {
    backendUp = false;
  }
  return null;
}

export async function getSharedTasks(): Promise<SharedTask[]> {
  const fromGo = await goGet();
  if (fromGo) {
    lsSet(fromGo);
    return fromGo;
  }
  const fromApi = await apiGet();
  if (fromApi) {
    lsSet(fromApi);
    return fromApi;
  }
  return lsGet();
}

export async function addSharedTask(task: SharedTask): Promise<SharedTask[]> {
  const fromGo = await goPost(task);
  if (fromGo) {
    lsSet(fromGo);
    return fromGo;
  }
  const fromApi = await apiPost(task);
  if (fromApi) {
    lsSet(fromApi);
    return fromApi;
  }
  const tasks = [...lsGet(), task];
  lsSet(tasks);
  return tasks;
}

export async function toggleSharedTask(
  id: string,
  userId: string,
  done: boolean
): Promise<SharedTask[]> {
  const fromGo = await goPatch(id, userId, done);
  if (fromGo) {
    lsSet(fromGo);
    return fromGo;
  }
  const fromApi = await apiPatch(id, userId, done);
  if (fromApi) {
    lsSet(fromApi);
    return fromApi;
  }
  const tasks = lsGet().map((t) =>
    t.id === id ? { ...t, doneBy: { ...t.doneBy, [userId]: done } } : t
  );
  lsSet(tasks);
  return tasks;
}

export async function deleteSharedTask(id: string): Promise<SharedTask[]> {
  const fromGo = await goDelete(id);
  if (fromGo) {
    lsSet(fromGo);
    return fromGo;
  }
  const fromApi = await apiDelete(id);
  if (fromApi) {
    lsSet(fromApi);
    return fromApi;
  }
  const tasks = lsGet().filter((t) => t.id !== id);
  lsSet(tasks);
  return tasks;
}

export function tasksForClass(tasks: SharedTask[], classId: string): SharedTask[] {
  return tasks.filter((t) => t.classId === classId);
}

export function pendingCountForClass(
  tasks: SharedTask[],
  classId: string,
  memberIds: string[]
): number {
  return tasksForClass(tasks, classId).filter((t) => isTaskPendingForTeam(t, memberIds)).length;
}

/** งานที่ยังมีคนในทีมไม่ได้ติ๊กเสร็จ */
export function isTaskPendingForTeam(task: SharedTask, memberIds: string[]): boolean {
  return memberIds.some((id) => !task.doneBy[id]);
}

export function isTaskDoneBy(task: SharedTask, userId: string): boolean {
  return !!task.doneBy[userId];
}
