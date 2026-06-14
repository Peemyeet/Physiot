import { formatDateThai } from "./schedule";
import { isTaskPendingForTeam } from "./sharedTasks";
import type { ClassItem, Exam, SharedTask } from "./types";
import { allStudents } from "./users";

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

function formatTaskLine(t: SharedTask): string {
  if (t.due) {
    const days = daysUntil(t.due);
    const dueLabel =
      days >= 0
        ? `📅 ${formatDateThai(t.due)} (${countdownLabel(days)})`
        : `📅 ${formatDateThai(t.due)} (เลยกำหนดแล้ว)`;
    return `• ${t.title} — ${t.courseName}\n   ${dueLabel}`;
  }
  return `• ${t.title} — ${t.courseName}\n   ⏳ ยังไม่ระบุวันส่ง`;
}

function formatExamBlock(exam: Exam): string {
  return `สอบถัดไป: ${exam.name}\n   📝 ${formatDateThai(exam.date)} (${countdownLabel(
    daysUntil(exam.date)
  )})`;
}

/** Build the popup shown on entry/refresh: which assignment, which subject, due when. */
export function buildReminder(
  _classes: ClassItem[],
  sharedTasks: SharedTask[],
  exams: Exam[]
): Reminder | null {
  const memberIds = allStudents().map((m) => m.id);

  const pending = sharedTasks
    .filter((t) => isTaskPendingForTeam(t, memberIds))
    .sort((a, b) => {
      if (!a.due && !b.due) return b.createdAt.localeCompare(a.createdAt);
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due.localeCompare(b.due);
    });

  const nextExam = exams
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0];

  if (pending.length > 0) {
    const lines = pending.slice(0, 5).map(formatTaskLine);
    const extra = pending.length > 5 ? `\n…และอีก ${pending.length - 5} งาน` : "";
    const examPart = nextExam ? `\n\n${formatExamBlock(nextExam)}` : "";
    return {
      type: "reminder",
      title: `มีงานค้าง ${pending.length} ชิ้น`,
      message: lines.join("\n") + extra + examPart,
      duration: 11000,
    };
  }

  if (nextExam) {
    return {
      type: "success",
      title: "ไม่มีงานค้าง 🎉",
      message: formatExamBlock(nextExam),
      duration: 8000,
    };
  }

  return {
    type: "success",
    title: "ไม่มีงานค้าง 🎉",
    message: "ยังไม่มีงานที่บันทึกไว้ — คลิกที่วิชาเพื่อเพิ่มงาน",
    duration: 8000,
  };
}
