"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import gsap from "gsap";
import { uid } from "@/lib/schedule";

type ToastType = "task" | "success" | "error" | "reminder";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

interface ToastCtx {
  notify: (t: Omit<Toast, "id">) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  task: "🔔",
  success: "✅",
  error: "⚠️",
  reminder: "📌",
};

const ACCENT: Record<ToastType, string> = {
  task: "before:bg-task",
  success: "before:bg-lab",
  error: "before:bg-danger",
  reminder: "before:bg-primary",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nodes = useRef<Map<string, HTMLDivElement>>(new Map());

  const remove = useCallback((id: string) => {
    const el = nodes.current.get(id);
    if (!el) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      return;
    }
    gsap.to(el, {
      x: 420,
      opacity: 0,
      scale: 0.9,
      duration: 0.35,
      ease: "power3.in",
      onComplete: () => {
        nodes.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    });
  }, []);

  const notify = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = uid();
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => remove(id), t.duration ?? 5200);
    },
    [remove]
  );

  const attach = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) return;
    nodes.current.set(id, el);
    gsap.fromTo(
      el,
      { x: 420, opacity: 0, scale: 0.85 },
      { x: 0, opacity: 1, scale: 1, duration: 0.55, ease: "elastic.out(1, 0.7)" }
    );
  }, []);

  return (
    <Ctx.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[min(92vw,400px)] flex-col gap-3 sm:right-5 sm:top-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            ref={(el) => attach(t.id, el)}
            className={`glass pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-2xl p-4 pl-5 shadow-2xl before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:content-[''] ${ACCENT[t.type]}`}
          >
            <span className="text-2xl leading-none">{ICONS[t.type]}</span>
            <div className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold">{t.title}</strong>
              <p className="mt-0.5 whitespace-pre-line text-[0.8rem] leading-relaxed text-muted">
                {t.message}
              </p>
            </div>
            <button
              onClick={() => remove(t.id)}
              aria-label="ปิด"
              className="-mr-1 -mt-1 cursor-pointer rounded-md p-1 text-lg leading-none text-muted transition-colors hover:text-text"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
