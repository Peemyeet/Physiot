import { NextResponse } from "next/server";
import { loadSharedTasksServer, saveSharedTasksServer } from "@/lib/server/taskStore";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { userId, done } = (await req.json()) as { userId: string; done: boolean };
  const tasks = await loadSharedTasksServer();
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx < 0) return NextResponse.json({ error: "not found" }, { status: 404 });

  tasks[idx] = {
    ...tasks[idx],
    doneBy: { ...tasks[idx].doneBy, [userId]: done },
  };
  await saveSharedTasksServer(tasks);
  return NextResponse.json(tasks);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const tasks = (await loadSharedTasksServer()).filter((t) => t.id !== id);
  await saveSharedTasksServer(tasks);
  return NextResponse.json(tasks);
}
