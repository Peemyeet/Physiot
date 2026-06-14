import { NextResponse } from "next/server";
import { loadSharedTasksServer, saveSharedTasksServer } from "@/lib/server/taskStore";
import type { SharedTask } from "@/lib/types";
import { allStudents } from "@/lib/users";

export const dynamic = "force-dynamic";

function initDoneBy(): Record<string, boolean> {
  const doneBy: Record<string, boolean> = {};
  for (const s of allStudents()) doneBy[s.id] = false;
  return doneBy;
}

export async function GET() {
  const tasks = await loadSharedTasksServer();
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const body = (await req.json()) as SharedTask;
  const tasks = await loadSharedTasksServer();
  const task: SharedTask = {
    ...body,
    doneBy: { ...initDoneBy(), ...body.doneBy },
  };
  tasks.push(task);
  await saveSharedTasksServer(tasks);
  return NextResponse.json(tasks);
}
