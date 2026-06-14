import { formatDateThai } from "./schedule";
import type { ClassItem, Exam } from "./types";

export interface Reminder {
  type: "reminder" | "success";
  title: string;
  message: string;
  duration: number;
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysUntil(iso: string): number {
  const d = new Date(iso + "T00:00:00").getTime();
  return Math.round((d - startOfToday()) / 86400000);
}

function countdownLabel(days: number): string {
  if (days <= 0) return "วันนี้";
  if (days === 1) return "พรุ่งนี้";
  return `อีก ${days} วัน`;
}

/** Build the popup shown on entry/refresh: which assignment, which subject, due when. */
export function buildReminder(classes: ClassItem[], exams: Exam[]): Reminder | null {
  const tasks = classes
    .flatMap((c) => c.tasks.map((t) => ({ ...t, course: c.name })))
    .filter((t) => t.due && daysUntil(t.due) >= 0)
    .sort((a, b) => a.due.localeCompare(b.due));

  const noDueCount = classes
    .flatMap((c) => c.tasks)
    .filter((t) => !t.due).length;

  const nextExam = exams
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0];

  if (tasks.length > 0) {
    const lines = tasks
      .slice(0, 5)
      .map(
        (t) =>
          `• ${t.title} — ${t.course}\n   📅 ${formatDateThai(t.due)} (${countdownLabel(
            daysUntil(t.due)
          )})`
      );
    const extra = tasks.length > 5 ? `\n…และอีก ${tasks.length - 5} งาน` : "";
    return {
      type: "reminder",
      title: `มีงานต้องส่ง ${tasks.length} ชิ้น`,
      message: lines.join("\n") + extra,
      duration: 11000,
    };
  }

  // No dated assignments — reassure + show next exam.
  const parts: string[] = [];
  if (noDueCount > 0) parts.push(`มีงานที่ยังไม่ระบุวันส่ง ${noDueCount} ชิ้น`);
  if (nextExam) {
    parts.push(
      `สอบถัดไป: ${nextExam.name}\n   📝 ${formatDateThai(nextExam.date)} (${countdownLabel(
        daysUntil(nextExam.date)
      )})`
    );
  }
  return {
    type: "success",
    title: "ไม่มีงานค้างส่ง 🎉",
    message: parts.length ? parts.join("\n") : "ยังไม่มีงานที่บันทึกไว้ — คลิกที่วิชาเพื่อเพิ่มงาน",
    duration: 8000,
  };
}
