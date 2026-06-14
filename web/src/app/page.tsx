"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScheduleGrid from "@/components/ScheduleGrid";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import ClassModal from "@/components/ClassModal";
import { ToastProvider, useToast } from "@/components/ToastProvider";
import { DAYS, DAY_KEYS, todayDayKey } from "@/lib/schedule";
import { deleteClass, getTerm, resetTerm, saveClass, usingBackend } from "@/lib/api";
import { EXAMS } from "@/lib/seed";
import { buildReminder } from "@/lib/reminder";
import type { ClassItem, Task } from "@/lib/types";

function Dashboard() {
  const { notify } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [defaults, setDefaults] = useState<{ day?: string; start?: string }>({});

  const remindedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getTerm();
    setClasses(data.classes);
    setLoading(false);
    return data.classes;
  }, []);

  useEffect(() => {
    setTodayKey(todayDayKey());
    load().then((loaded) => {
      if (remindedRef.current) return;
      remindedRef.current = true;
      const reminder = buildReminder(loaded, EXAMS);
      if (reminder) {
        // small delay so the popup animates in after the page reveal
        setTimeout(() => notify(reminder), 700);
      }
    });
  }, [load, notify]);

  useGSAP(
    () => {
      gsap.from(".reveal", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "opacity,transform",
      });
    },
    { scope: rootRef }
  );

  const openNew = (day?: string, start?: string) => {
    setEditing(null);
    setDefaults({ day, start });
    setModalOpen(true);
  };

  const openEdit = (cls: ClassItem) => {
    setEditing(cls);
    setDefaults({});
    setModalOpen(true);
  };

  const openCourseById = (id: string) => {
    const cls = classes.find((c) => c.id === id);
    if (cls) openEdit(cls);
  };

  const handleSave = async (cls: ClassItem, isNew: boolean) => {
    const data = await saveClass(cls);
    setClasses(data.classes);
    setModalOpen(false);
    const dayLabel = DAYS[DAY_KEYS.indexOf(cls.day as (typeof DAY_KEYS)[number])];
    if (isNew) {
      notify({
        type: "success",
        title: "เพิ่มวิชาแล้ว",
        message: `${cls.name} — ${dayLabel} ${cls.start}–${cls.end}`,
      });
    } else {
      notify({ type: "success", title: "บันทึกแล้ว", message: `อัปเดต ${cls.name} เรียบร้อย` });
    }
  };

  const handleDelete = async (id: string) => {
    const cls = classes.find((c) => c.id === id);
    if (!cls) return;
    if (!confirm(`ลบวิชา "${cls.name}" ใช่หรือไม่?`)) return;
    const data = await deleteClass(id);
    setClasses(data.classes);
    setModalOpen(false);
    notify({ type: "success", title: "ลบแล้ว", message: `ลบ ${cls.name} ออกจากตาราง` });
  };

  const handleReset = async () => {
    if (!confirm("รีเซ็ตกลับเป็นตารางฟิกเดิมของภาคเรียน? (งานที่เพิ่มไว้จะหายทั้งหมด)")) return;
    const data = await resetTerm();
    setClasses(data.classes);
    notify({ type: "success", title: "รีเซ็ตแล้ว", message: "กลับเป็นตารางฟิกของภาคเรียน 1/2569" });
  };

  const handleTaskAdded = (task: Task, courseName: string) => {
    notify({
      type: "task",
      title: "เพิ่มงานใหม่!",
      message: `"${task.title}" ใน ${courseName}${
        task.due ? ` — กำหนดส่ง ${task.due}` : ""
      }`,
    });
  };

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="reveal mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-gold text-xs font-bold text-white shadow-lg shadow-primary/25 sm:size-12 sm:text-sm">
            KMITL
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight sm:text-2xl">
              ตารางเรียน · ภาคเรียน 1/2569
            </h1>
            <p className="truncate text-xs text-muted sm:text-sm">
              ฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที · KMITL
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 cursor-pointer rounded-xl border border-border px-3.5 py-2.5 text-sm transition hover:bg-surface sm:flex-none"
          >
            รีเซ็ตตาราง
          </button>
          <button
            onClick={() => openNew()}
            className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition hover:bg-primary-soft sm:flex-none"
          >
            + เพิ่มวิชา
          </button>
        </div>
      </header>

      {/* Legend */}
      <div className="reveal glass mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-3 text-xs text-muted sm:text-sm">
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-lecture" /> บรรยาย
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-lab" /> แล็บ / ปฏิบัติ
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-both" /> ทฤษฎี + ปฏิบัติ
        </span>
        <span className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-task" /> มีงานที่ต้องทำ
        </span>
        <span className="flex items-center gap-2 text-xs sm:ml-auto">
          <span className={`size-2 rounded-full ${usingBackend() ? "bg-lab" : "bg-gold"}`} />
          {usingBackend() ? "เชื่อมต่อ Go backend" : "บันทึกในเบราว์เซอร์"}
        </span>
      </div>

      {/* Main */}
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[1fr_310px]">
        <section className="reveal glass rounded-2xl p-2 shadow-2xl sm:rounded-3xl sm:p-3">
          {loading ? (
            <div className="grid h-[420px] place-items-center text-muted">กำลังโหลด…</div>
          ) : (
            <ScheduleGrid
              classes={classes}
              onAddAt={(day, start) => openNew(day, start)}
              onEdit={openEdit}
              todayKey={todayKey}
            />
          )}
        </section>

        <div className="reveal">
          <Sidebar classes={classes} exams={EXAMS} onOpenCourse={openCourseById} />
        </div>
      </div>

      <Footer />

      <ClassModal
        open={modalOpen}
        initial={editing}
        defaults={defaults}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  );
}

export default function Page() {
  return (
    <ToastProvider>
      <Dashboard />
    </ToastProvider>
  );
}
