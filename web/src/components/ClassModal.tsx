"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import TaskModal from "./TaskModal";
import {
  DAYS,
  DAY_KEYS,
  TIME_SLOTS,
  formatDateThai,
  timeToMinutes,
  uid,
} from "@/lib/schedule";
import type { ClassItem, ClassType, Task } from "@/lib/types";

interface Props {
  open: boolean;
  initial: ClassItem | null;
  defaults?: { day?: string; start?: string };
  onClose: () => void;
  onSave: (cls: ClassItem, isNew: boolean) => void;
  onDelete: (id: string) => void;
  onTaskAdded: (task: Task, courseName: string) => void;
}

const field =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";
const label = "mb-1.5 block text-xs font-medium text-muted";

function emptyForm(defaults?: { day?: string; start?: string }) {
  const start = defaults?.start ?? "09:00";
  const startIdx = TIME_SLOTS.indexOf(start);
  const end = startIdx >= 0 && startIdx + 4 < TIME_SLOTS.length ? TIME_SLOTS[startIdx + 4] : "12:00";
  return {
    name: "",
    day: defaults?.day ?? "mon",
    type: "lecture" as ClassType,
    start,
    end,
    location: "",
    note: "",
  };
}

export default function ClassModal({
  open,
  initial,
  defaults,
  onClose,
  onSave,
  onDelete,
  onTaskAdded,
}: Props) {
  const [form, setForm] = useState(emptyForm());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskOpen, setTaskOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        day: initial.day,
        type: initial.type,
        start: initial.start,
        end: initial.end,
        location: initial.location,
        note: initial.note,
      });
      setTasks([...initial.tasks]);
    } else {
      setForm(emptyForm(defaults));
      setTasks([]);
    }
  }, [open, initial, defaults]);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAddTask = (task: Task) => {
    setTasks((prev) => [...prev, task]);
    onTaskAdded(task, form.name.trim() || "วิชาใหม่");
  };

  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeToMinutes(form.end) <= timeToMinutes(form.start)) return;
    const cls: ClassItem = {
      id: initial?.id ?? uid(),
      name: form.name.trim(),
      day: form.day,
      type: form.type,
      start: form.start,
      end: form.end,
      location: form.location.trim(),
      note: form.note.trim(),
      tasks,
    };
    onSave(cls, !initial);
  };

  const timeInvalid = timeToMinutes(form.end) <= timeToMinutes(form.start);

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <form onSubmit={submit} className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">{initial ? "แก้ไขวิชา" : "เพิ่มวิชา"}</h2>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer text-2xl leading-none text-muted transition hover:text-text"
              aria-label="ปิด"
            >
              ×
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <label className={label}>ชื่อวิชา</label>
              <input
                autoFocus
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="เช่น กายวิภาคศาสตร์ I"
                className={field}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>วัน</label>
                <select
                  value={form.day}
                  onChange={(e) => set("day", e.target.value)}
                  className={field}
                >
                  {DAY_KEYS.map((k, i) => (
                    <option key={k} value={k}>
                      {DAYS[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>ประเภท</label>
                <select
                  value={form.type}
                  onChange={(e) => set("type", e.target.value as ClassType)}
                  className={field}
                >
                  <option value="lecture">บรรยาย</option>
                  <option value="lab">แล็บ / ปฏิบัติ</option>
                  <option value="both">ทฤษฎี + ปฏิบัติ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>เวลาเริ่ม</label>
                <select
                  value={form.start}
                  onChange={(e) => set("start", e.target.value)}
                  className={field}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>เวลาสิ้นสุด</label>
                <select
                  value={form.end}
                  onChange={(e) => set("end", e.target.value)}
                  className={`${field} ${timeInvalid ? "border-danger focus:ring-danger/30" : ""}`}
                >
                  {TIME_SLOTS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {timeInvalid && (
              <p className="-mt-2 text-xs text-danger">เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม</p>
            )}

            <div>
              <label className={label}>สถานที่เรียน</label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="เช่น ห้อง 301 อาคาร A"
                className={field}
              />
            </div>

            <div>
              <label className={label}>หมายเหตุ</label>
              <textarea
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                rows={2}
                placeholder="อาจารย์ผู้สอน, หนังสือที่ต้องเตรียม ฯลฯ"
                className={`${field} resize-none`}
              />
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">งาน / แล็บ / การบ้าน</h3>
                <button
                  type="button"
                  onClick={() => setTaskOpen(true)}
                  className="cursor-pointer rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium transition hover:bg-border"
                >
                  + เพิ่มงาน
                </button>
              </div>

              {tasks.length === 0 ? (
                <p className="text-xs text-muted">ยังไม่มีงานในวิชานี้</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-border bg-surface-2 px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{t.title}</div>
                        {t.detail && (
                          <div className="mt-0.5 text-xs text-muted">{t.detail}</div>
                        )}
                        {t.due && (
                          <div className="mt-1 text-xs text-task">📅 {formatDateThai(t.due)}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTask(t.id)}
                        className="cursor-pointer p-0.5 text-lg leading-none text-muted transition hover:text-danger"
                        aria-label="ลบงาน"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-4">
            {initial ? (
              <button
                type="button"
                onClick={() => onDelete(initial.id)}
                className="cursor-pointer rounded-xl border border-danger px-4 py-2 text-sm text-danger transition hover:bg-danger/10"
              >
                ลบวิชา
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-primary px-5 py-2 text-sm font-medium text-white transition hover:bg-primary-soft"
              >
                บันทึก
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} onAdd={handleAddTask} />
    </>
  );
}
