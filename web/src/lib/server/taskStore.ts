import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { head, put } from "@vercel/blob";
import type { SharedTask } from "@/lib/types";

const BLOB_PATH = "physiot-shared-tasks.json";
const globalForTasks = globalThis as unknown as { physiotSharedTasks?: SharedTask[] };

function dataFilePath() {
  return join(process.cwd(), ".data", "shared-tasks.json");
}

function readLocalFile(): SharedTask[] {
  try {
    const p = dataFilePath();
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf8")) as SharedTask[];
  } catch {
    /* ignore */
  }
  return [];
}

function writeLocalFile(tasks: SharedTask[]) {
  try {
    const dir = join(process.cwd(), ".data");
    mkdirSync(dir, { recursive: true });
    writeFileSync(dataFilePath(), JSON.stringify(tasks, null, 2));
  } catch {
    /* ignore on read-only fs */
  }
}

async function readBlob(): Promise<SharedTask[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(BLOB_PATH);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as SharedTask[];
  } catch {
    return [];
  }
}

async function writeBlob(tasks: SharedTask[]): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await put(BLOB_PATH, JSON.stringify(tasks), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

export async function loadSharedTasksServer(): Promise<SharedTask[]> {
  if (globalForTasks.physiotSharedTasks) return globalForTasks.physiotSharedTasks;

  const fromBlob = await readBlob();
  if (fromBlob !== null) {
    globalForTasks.physiotSharedTasks = fromBlob;
    return fromBlob;
  }

  const fromFile = readLocalFile();
  globalForTasks.physiotSharedTasks = fromFile;
  return fromFile;
}

export async function saveSharedTasksServer(tasks: SharedTask[]): Promise<SharedTask[]> {
  globalForTasks.physiotSharedTasks = tasks;
  writeLocalFile(tasks);
  await writeBlob(tasks);
  return tasks;
}
