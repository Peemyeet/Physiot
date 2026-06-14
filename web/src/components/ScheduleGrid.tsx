"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  DAYS,
  DAY_KEYS,
  TIME_SLOTS,
  classDurationSlots,
  timeToMinutes,
} from "@/lib/schedule";
import type { ClassItem, ClassType, SharedTask } from "@/lib/types";
import { allStudents } from "@/lib/users";
import { pendingCountForClass } from "@/lib/sharedTasks";

interface Props {
  classes: ClassItem[];
  sharedTasks: SharedTask[];
  onAddAt: (day: string, start: string) => void;
  onEdit: (cls: ClassItem) => void;
  todayKey: string;
}

const COLS = TIME_SLOTS.length - 1;
const COL_W = 56;
const DAY_LABEL_W = 70;
const DAY_ROW_H = 78;
const HEADER_H = 38;
const GRID_START = timeToMinutes(TIME_SLOTS[0]);
const GRID_END = timeToMinutes(TIME_SLOTS[TIME_SLOTS.length - 1]);

const ACCENT: Record<ClassType, string> = {
  lecture: "var(--color-lecture)",
  lab: "var(--color-lab)",
  both: "var(--color-both)",
};

const TYPE_LABEL: Record<ClassType, string> = {
  lecture: "บรรยาย",
  lab: "ปฏิบัติ",
  both: "ทฤษฎี+ปฏิบัติ",
};

export default function ScheduleGrid({ classes, sharedTasks, onAddAt, onEdit, todayKey }: Props) {
  const memberIds = allStudents().map((m) => m.id);
  const gridRef = useRef<HTMLDivElement>(null);
  const [nowMin, setNowMin] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".js-card");
      if (!cards.length) return;
      gsap.fromTo(
        cards,
        { opacity: 0, x: 12, scale: 0.98 },
        {
          opacity: 1,
          x: 0,
          scale: 1,
          duration: 0.45,
          ease: "power3.out",
          stagger: 0.035,
          overwrite: "auto",
          clearProps: "opacity,transform",
        }
      );
    },
    { scope: gridRef }
  );

  const showNow = nowMin !== null && nowMin >= GRID_START && nowMin <= GRID_END;
  const nowColIdx = showNow ? Math.floor((nowMin! - GRID_START) / 30) : 0;
  const nowOffset = showNow ? (((nowMin! - GRID_START) % 30) / 30) * COL_W : 0;
  const todayRowIdx = DAY_KEYS.indexOf(todayKey as (typeof DAY_KEYS)[number]);

  return (
    <div className="touch-scroll overflow-x-auto">
      <div
        ref={gridRef}
        className="grid gap-0 overflow-hidden rounded-2xl border border-border-soft bg-border-soft"
        style={{
          minWidth: DAY_LABEL_W + COLS * COL_W,
          gridTemplateColumns: `${DAY_LABEL_W}px repeat(${COLS}, ${COL_W}px)`,
          gridTemplateRows: `${HEADER_H}px repeat(${DAY_KEYS.length}, ${DAY_ROW_H}px)`,
        }}
      >
        {/* corner */}
        <div className="sticky left-0 top-0 z-30 border-b border-border bg-surface-2" />

        {/* hour headers — label only on full hours, spanning the two half-hour columns */}
        {TIME_SLOTS.slice(0, COLS).map((slot, colIdx) => {
          if (!slot.endsWith(":00")) return null;
          return (
            <div
              key={slot}
              className="sticky top-0 z-20 flex items-center border-b border-l border-border bg-surface-2 pl-2"
              style={{ gridColumn: `${colIdx + 2} / span 2`, gridRow: 1 }}
            >
              <span className="text-[0.7rem] font-semibold text-text/80">{slot}</span>
            </div>
          );
        })}

        {/* day rows + background cells */}
        {DAY_KEYS.map((dayKey, dayIdx) => {
          const today = dayKey === todayKey;
          const isWeekend = dayKey === "sat" || dayKey === "sun";
          const notLast = dayIdx < DAY_KEYS.length - 1;
          return (
            <div key={dayKey} className="contents">
              <div
                className={`sticky left-0 z-20 flex flex-col justify-center px-3 ${
                  notLast ? "border-b border-border" : ""
                } ${today ? "bg-primary/10" : "bg-surface-2"}`}
                style={{ gridColumn: 1, gridRow: dayIdx + 2 }}
              >
                <div
                  className={`text-sm font-semibold leading-tight ${
                    today ? "text-primary" : isWeekend ? "text-muted" : "text-text"
                  }`}
                >
                  {DAYS[dayIdx]}
                </div>
                {today && (
                  <div className="mt-0.5 text-[0.58rem] font-medium text-primary/80">วันนี้</div>
                )}
              </div>

              {TIME_SLOTS.slice(0, COLS).map((slot, colIdx) => {
                const isHour = slot.endsWith(":00");
                const cellBg = today ? "bg-primary/[0.06]" : isWeekend ? "bg-surface-2/40" : "bg-white";
                return (
                  <button
                    key={`${dayKey}-${slot}`}
                    onClick={() => onAddAt(dayKey, slot)}
                    style={{ gridColumn: colIdx + 2, gridRow: dayIdx + 2 }}
                    className={`group relative transition-colors ${cellBg} ${
                      isHour ? "border-l border-border" : "border-l border-border-soft/60"
                    } ${notLast ? "border-b border-border-soft" : ""} hover:bg-primary/[0.1]`}
                    aria-label={`เพิ่มวิชา ${DAYS[dayIdx]} ${slot}`}
                  >
                    <span className="pointer-events-none absolute inset-0 grid place-items-center text-base text-primary opacity-0 transition-opacity group-hover:opacity-70">
                      +
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* current-time indicator (today row only) */}
        {showNow && todayRowIdx >= 0 && (
          <div
            className="pointer-events-none relative z-40"
            style={{
              gridColumn: nowColIdx + 2,
              gridRow: todayRowIdx + 2,
              alignSelf: "stretch",
              justifySelf: "start",
              transform: `translateX(${nowOffset}px)`,
            }}
          >
            <div className="absolute -top-1 left-0 size-2.5 rounded-full bg-danger shadow-[0_0_8px_var(--color-danger)]" />
            <div className="h-full w-px bg-danger/70" />
          </div>
        )}

        {/* class blocks */}
        {classes.map((cls) => {
          const startIdx = TIME_SLOTS.indexOf(cls.start);
          if (startIdx < 0) return null;
          const dayIdx = DAY_KEYS.indexOf(cls.day as (typeof DAY_KEYS)[number]);
          if (dayIdx < 0) return null;
          const span = Math.min(classDurationSlots(cls.start, cls.end), COLS - startIdx);
          const taskCount = pendingCountForClass(sharedTasks, cls.id, memberIds);
          const accent = ACCENT[cls.type] ?? ACCENT.lecture;

          return (
            <button
              key={cls.id}
              onClick={() => onEdit(cls)}
              title={`${cls.name}\n${cls.start}–${cls.end}\n${cls.location}`}
              style={{
                gridColumn: `${startIdx + 2} / span ${span}`,
                gridRow: dayIdx + 2,
                background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 12%, #ffffff) 0%, #ffffff 55%)`,
                borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
              className="js-card z-10 m-1 flex min-w-0 flex-col gap-0.5 overflow-hidden rounded-lg border-l-[3px] border-y border-r px-2 py-1.5 text-left shadow-sm ring-1 ring-black/[0.03] transition hover:-translate-y-px hover:shadow-md hover:ring-primary/20"
            >
              <div className="flex items-center gap-1">
                <span className="truncate text-[0.6rem] font-semibold tracking-tight text-muted">
                  {cls.start}–{cls.end}
                </span>
              </div>
              <div className="line-clamp-2 text-[0.74rem] font-semibold leading-tight text-text">
                {cls.name}
              </div>
              {cls.location && span >= 4 && (
                <div className="line-clamp-1 text-[0.6rem] text-muted">📍 {cls.location}</div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-1">
                <span
                  className="rounded px-1.5 py-px text-[0.54rem] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${accent} 18%, transparent)`,
                    color: accent,
                  }}
                >
                  {TYPE_LABEL[cls.type]}
                </span>
                {taskCount > 0 && (
                  <span
                    className="rounded px-1.5 py-px text-[0.54rem] font-semibold"
                    style={{
                      background: "color-mix(in srgb, var(--color-task) 22%, transparent)",
                      color: "var(--color-task)",
                    }}
                  >
                    {taskCount} งาน
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
