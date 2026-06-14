"use client";

import { formatDateThai } from "@/lib/schedule";
import type { ClassItem, Exam } from "@/lib/types";

interface Props {
  classes: ClassItem[];
  exams: Exam[];
  onOpenCourse: (id: string) => void;
}

function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function Sidebar({ classes, exams, onOpenCourse }: Props) {
  const tasks = classes
    .flatMap((c) => c.tasks.map((t) => ({ ...t, courseName: c.name, courseId: c.id })))
    .sort((a, b) => {
      if (!a.due && !b.due) return 0;
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
          <span>📌</span> งานที่ใกล้ถึงกำหนด
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">ยังไม่มีงานที่บันทึกไว้ — คลิกที่วิชาเพื่อเพิ่มงาน</p>
        ) : (
          <ul className="-my-1 divide-y divide-border">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onOpenCourse(t.courseId)}
                  className="w-full cursor-pointer py-3 text-left transition hover:opacity-80"
                >
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-muted">{t.courseName}</div>
                  {t.due && (
                    <div className="mt-0.5 text-xs text-task">📅 {formatDateThai(t.due)}</div>
                  )}
                </button>
              </li>
            ))}
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
          <li>คลิกช่องว่างเพื่อเพิ่มวิชาเอง</li>
          <li>เพิ่มงาน/แล็บ — ระบบจะเด้ง popup แจ้งเตือน</li>
          <li>ข้อมูลบันทึกอัตโนมัติ</li>
        </ul>
      </div>
    </aside>
  );
}
