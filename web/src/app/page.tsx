"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import ScheduleGrid from "@/components/ScheduleGrid";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import ClassModal from "@/components/ClassModal";
import LoginPage from "@/components/LoginPage";
import { ToastProvider, useToast } from "@/components/ToastProvider";
import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { DAYS, DAY_KEYS, todayDayKey } from "@/lib/schedule";
import { deleteClass, getTerm, resetTerm, saveClass, usingBackend } from "@/lib/api";
import { EXAMS } from "@/lib/seed";
import { buildReminder } from "@/lib/reminder";
import {
  addSharedTask,
  deleteSharedTask,
  getSharedTasks,
  toggleSharedTask,
} from "@/lib/sharedTasks";
import type { ClassItem, SharedTask, Task } from "@/lib/types";

function Dashboard() {
  const { user, ready, logout } = useAuth();
  const { notify } = useToast();
  const rootRef = useRef<HTMLDivElement>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sharedTasks, setSharedTasks] = useState<SharedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClassItem | null>(null);
  const [defaults, setDefaults] = useState<{ day?: string; start?: string }>({});

  const remindedRef = useRef(false);

  const load = useCallback(async () => {
    if (!user) return { classes: [] as ClassItem[], sharedTasks: [] as SharedTask[] };
    setLoading(true);
    const [data, tasks] = await Promise.all([getTerm(), getSharedTasks()]);
    setClasses(data.classes);
    setSharedTasks(tasks);
    setLoading(false);
    return { classes: data.classes, sharedTasks: tasks };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    remindedRef.current = false;
    setTodayKey(todayDayKey());
    load().then(({ classes: loaded, sharedTasks: tasks }) => {
      if (remindedRef.current) return;
      remindedRef.current = true;
      const reminder = buildReminder(loaded, tasks, EXAMS);
      if (reminder) {
        setTimeout(
          () =>
            notify({
              ...reminder,
              title: `สวัสดี ${user.nickname}! ${reminder.title}`,
            }),
          700
        );
      }
    });
  }, [user, load, notify]);

  useGSAP(
    () => {
      if (!user) return;
      gsap.from(".reveal", {
        opacity: 0,
        y: 24,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        clearProps: "opacity,transform",
      });
    },
    { scope: rootRef, dependencies: [user?.id] }
  );

  if (!ready) {
    return (
      <div className="grid min-h-full flex-1 place-items-center text-muted">กำลังโหลด…</div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

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
    if (!confirm("รีเซ็ตกลับเป็นตารางฟิกเดิมของคุณ? (งานที่เพิ่มไว้จะหายทั้งหมด)")) return;
    const data = await resetTerm();
    setClasses(data.classes);
    notify({ type: "success", title: "รีเซ็ตแล้ว", message: "กลับเป็นตารางฟิกของคุณแล้ว" });
  };

  const handleTaskAdded = (task: Task, courseName: string) => {
    notify({
      type: "task",
      title: "เพิ่มงานใหม่!",
      message: `"${task.title}" ใน ${courseName}${
        task.due ? ` — กำหนดส่ง ${task.due}` : ""
      } — ทุกคนจะเห็น`,
    });
  };

  const handleAddSharedTask = async (task: SharedTask) => {
    const tasks = await addSharedTask(task);
    setSharedTasks(tasks);
  };

  const handleToggleSharedTask = async (taskId: string, done: boolean) => {
    if (!user) return;
    const tasks = await toggleSharedTask(taskId, user.id, done);
    setSharedTasks(tasks);
  };

  const handleDeleteSharedTask = async (id: string) => {
    if (!confirm("ลบงานนี้?")) return;
    const tasks = await deleteSharedTask(id);
    setSharedTasks(tasks);
  };

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6">
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
              สวัสดี <span className="font-medium text-primary">{user.nickname}</span> ·{" "}
              {user.id} · IoT Physiot · KMITL
            </p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 cursor-pointer rounded-xl border border-border px-3.5 py-2.5 text-sm transition hover:bg-surface-2 sm:flex-none"
          >
            รีเซ็ตตาราง
          </button>
          <button
            onClick={() => openNew()}
            className="flex-1 cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary/25 transition hover:bg-primary-soft sm:flex-none"
          >
            + เพิ่มวิชา
          </button>
          <button
            onClick={logout}
            className="cursor-pointer rounded-xl border border-border px-3.5 py-2.5 text-sm text-muted transition hover:border-danger/40 hover:text-danger sm:flex-none"
            title="ออกจากระบบ"
          >
            ออก
          </button>
        </div>
      </header>

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

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[1fr_310px]">
        <section className="reveal glass rounded-2xl p-2 shadow-2xl sm:rounded-3xl sm:p-3">
          {loading ? (
            <div className="grid h-[420px] place-items-center text-muted">กำลังโหลด…</div>
          ) : (
            <ScheduleGrid
              classes={classes}
              sharedTasks={sharedTasks}
              onAddAt={(day, start) => openNew(day, start)}
              onEdit={openEdit}
              todayKey={todayKey}
            />
          )}
        </section>

        <div className="reveal">
          <Sidebar
            exams={EXAMS}
            sharedTasks={sharedTasks}
            currentUserId={user.id}
            onOpenCourse={openCourseById}
            onToggleTask={handleToggleSharedTask}
          />
        </div>
      </div>

      <Footer />

      <ClassModal
        open={modalOpen}
        initial={editing}
        defaults={defaults}
        sharedTasks={sharedTasks}
        currentUserId={user.id}
        currentUserName={user.nickname}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
        onAddSharedTask={handleAddSharedTask}
        onDeleteSharedTask={handleDeleteSharedTask}
        onToggleSharedTask={handleToggleSharedTask}
        onTaskAdded={handleTaskAdded}
      />
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Dashboard />
      </ToastProvider>
    </AuthProvider>
  );
}
