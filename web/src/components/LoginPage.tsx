"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useAuth } from "@/context/AuthProvider";

export default function LoginPage() {
  const { login } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    gsap.fromTo(
      el.querySelector(".login-card"),
      { opacity: 0, y: 28, scale: 0.96 },
      { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.4)" }
    );
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = login(id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      gsap.fromTo(
        ".login-error",
        { x: -8 },
        { x: 0, duration: 0.4, ease: "elastic.out(1, 0.5)" }
      );
    }
  };

  return (
    <div
      ref={rootRef}
      className="flex min-h-full flex-1 items-center justify-center px-4 py-10"
    >
      <div className="login-card glass w-full max-w-md rounded-3xl p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-gold text-sm font-bold text-white shadow-lg shadow-primary/25">
            KMITL
          </div>
          <h1 className="text-xl font-semibold sm:text-2xl">เข้าสู่ระบบตารางเรียน</h1>
          <p className="mt-1 text-sm text-muted">
            ฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที · ภาคเรียน 1/2569
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="studentId" className="mb-1.5 block text-xs font-medium text-muted">
              รหัสนักศึกษา
            </label>
            <input
              id="studentId"
              inputMode="numeric"
              autoComplete="username"
              autoFocus
              maxLength={8}
              value={id}
              onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="690XXXXX"
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-center text-lg font-semibold tracking-widest outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {error && (
            <p className="login-error rounded-lg bg-danger/10 px-3 py-2 text-center text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || id.length < 8}
            className="w-full cursor-pointer rounded-xl bg-primary py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
