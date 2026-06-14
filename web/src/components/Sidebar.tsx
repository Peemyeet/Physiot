"use client";

import { formatDateThai } from "@/lib/schedule";
import { isTaskDoneBy, isTaskPendingForTeam } from "@/lib/sharedTasks";
import type { Exam, SharedTask } from "@/lib/types";
import { allStudents, type StudentUser } from "@/lib/users";

interface Props {
  exams: Exam[];
  sharedTasks: SharedTask[];
  currentUserId: string;
  onOpenCourse: (id: string) => void;
  onToggleTask: (taskId: string, done: boolean) => void;
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function MemberStatus({ members, task }: { members: StudentUser[]; task: SharedTask }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {members.map((m) => {
        const done = isTaskDoneBy(task, m.id);
        return (
          <span
            key={m.id}
            title={done ? `${m.nickname} ส่งแล้ว` : `${m.nickname} ยังไม่ส่ง`}
            className={`rounded-md px-1.5 py-0.5 text-[0.62rem] font-medium ${
              done
                ? "bg-lab/20 text-lab"
                : "bg-danger/15 text-danger ring-1 ring-danger/30"
            }`}
          >
            {done ? "✓" : "○"} {m.nickname}
          </span>
        );
      })}
    </div>
  );
}

export default function Sidebar({
  exams,
  sharedTasks,
  currentUserId,
  onOpenCourse,
  onToggleTask,
}: Props) {
  const members = allStudents();
  const memberIds = members.map((m) => m.id);

  const pendingTasks = sharedTasks
    .filter((t) => isTaskPendingForTeam(t, memberIds))
    .sort((a, b) => {
      if (!a.due && !b.due) return b.createdAt.localeCompare(a.createdAt);
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });

  const upcomingExams = exams
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  return (
    <aside className="flex flex-col gap-4">
      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span>📋</span> งานค้าง
        </h2>
        {pendingTasks.length === 0 ? (
          <p className="text-sm text-muted">
            ไม่มีงานค้าง — คลิกที่วิชาแล้วกด &quot;+ เพิ่มงาน&quot;
          </p>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {pendingTasks.map((t) => {
              const mineDone = isTaskDoneBy(t, currentUserId);
              const notDone = members.filter((m) => !isTaskDoneBy(t, m.id));
              return (
                <li key={t.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => onOpenCourse(t.classId)}
                    className="w-full cursor-pointer text-left transition hover:opacity-80"
                  >
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted">{t.courseName}</div>
                    {t.due && (
                      <div className="mt-0.5 text-xs text-task">
                        📅 {formatDateThai(t.due)}
                        {daysUntil(t.due) >= 0 && daysUntil(t.due) <= 3 && (
                          <span className="ml-1 text-danger">
                            ({daysUntil(t.due) === 0 ? "วันนี้!" : `อีก ${daysUntil(t.due)} วัน`})
                          </span>
                        )}
                      </div>
                    )}
                  </button>

                  <MemberStatus members={members} task={t} />

                  {notDone.length > 0 && (
                    <p className="mt-1.5 text-[0.65rem] text-danger">
                      ยังไม่ส่ง: {notDone.map((m) => m.nickname).join(", ")}
                    </p>
                  )}

                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={mineDone}
                      onChange={(e) => onToggleTask(t.id, e.target.checked)}
                      className="size-4 rounded border-border accent-primary"
                    />
                    <span className={mineDone ? "text-lab" : "text-text"}>
                      {mineDone ? "ฉันส่งแล้ว ✓" : "ติ๊กเมื่อส่งงานแล้ว"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span>📝</span> ตารางสอบ
        </h2>
        {upcomingExams.length === 0 ? (
          <p className="text-sm text-muted">ไม่มีตารางสอบที่จะถึง</p>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {upcomingExams.map((e) => {
              const d = daysUntil(e.date);
              return (
                <li key={e.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{e.name}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {formatDateThai(e.date)} · {e.start}–{e.end}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.6rem] font-semibold ${
                        e.kind === "midterm"
                          ? "bg-lecture/20 text-lecture"
                          : "bg-danger/20 text-danger"
                      }`}
                    >
                      {e.kind === "midterm" ? "กลางภาค" : "ปลายภาค"}
                    </span>
                  </div>
                  <div className="mt-1 text-[0.7rem] text-muted">
                    {d === 0 ? "วันนี้!" : `อีก ${d} วัน`}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-5">
        <h3 className="mb-2 text-sm font-semibold">วิธีใช้</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted">
          <li>คลิกการ์ดวิชาเพื่อดูรายละเอียด/เพิ่มงาน</li>
          <li>งานที่เพิ่มจะเห็นร่วมกันทุกคน</li>
          <li>ติ๊กใน sidebar เมื่อส่งงานแล้ว</li>
          <li>ดูได้ว่าใครยังไม่ส่งเพื่อตามเพื่อน</li>
        </ul>
      </div>
    </aside>
  );
}
