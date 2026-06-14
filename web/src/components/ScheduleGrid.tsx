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
import type { ClassItem, ClassType } from "@/lib/types";

interface Props {
  classes: ClassItem[];
  onAddAt: (day: string, start: string) => void;
  onEdit: (cls: ClassItem) => void;
  todayKey: string;
}

const ROWS = TIME_SLOTS.length - 1; // 30-min rows
const ROW_H = 48; // px per 30-min row
const GRID_START = timeToMinutes(TIME_SLOTS[0]); // 08:00
const GRID_END = timeToMinutes(TIME_SLOTS[TIME_SLOTS.length - 1]); // 20:00

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

export default function ScheduleGrid({ classes, onAddAt, onEdit, todayKey }: Props) {
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
        { opacity: 0, y: 16, scale: 0.97 },
        {
          opacity: 1,
          y: 0,
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
  const nowRowIdx = showNow ? Math.floor((nowMin! - GRID_START) / 30) : 0;
  const nowOffset = showNow ? (((nowMin! - GRID_START) % 30) / 30) * ROW_H : 0;

  return (
    <div className="touch-scroll overflow-x-auto">
      <div
        ref={gridRef}
        className="grid min-w-[760px] gap-x-px gap-y-0 rounded-2xl bg-border-soft p-px sm:min-w-[880px]"
        style={{
          gridTemplateColumns: "62px repeat(7, minmax(108px, 1fr))",
          gridTemplateRows: `auto repeat(${ROWS}, ${ROW_H}px)`,
        }}
      >
        {/* corner */}
        <div className="sticky left-0 z-30 rounded-tl-2xl bg-surface-2" />

        {/* day headers */}
        {DAYS.map((d, i) => {
          const today = DAY_KEYS[i] === todayKey;
          return (
            <div
              key={d}
              className={`px-2 py-3 text-center ${i === 6 ? "rounded-tr-2xl" : ""} ${
                today ? "bg-primary/10" : "bg-surface-2"
              }`}
            >
              <div className={`text-sm font-semibold ${today ? "text-primary" : ""}`}>{d}</div>
              {today && (
                <div className="mt-0.5 text-[0.6rem] font-medium text-primary/80">วันนี้</div>
              )}
            </div>
          );
        })}

        {/* time labels + background cells */}
        {TIME_SLOTS.slice(0, ROWS).map((slot, rowIdx) => {
          const isHour = slot.endsWith(":00");
          return (
            <div key={`row-${slot}`} className="contents">
              <div
                className="sticky left-0 z-20 flex items-start justify-end bg-surface-2 pr-2 pt-1"
                style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
              >
                <span
                  className={
                    isHour
                      ? "text-[0.74rem] font-semibold text-text/90"
                      : "text-[0.62rem] text-muted/60"
                  }
                >
                  {slot}
                </span>
              </div>

              {DAY_KEYS.map((dayKey, dayIdx) => {
                const today = dayKey === todayKey;
                return (
                  <button
                    key={`${dayKey}-${slot}`}
                    onClick={() => onAddAt(dayKey, slot)}
                    style={{ gridColumn: dayIdx + 2, gridRow: rowIdx + 2 }}
                    className={`group relative transition-colors ${
                      today ? "bg-primary/[0.07]" : "bg-white"
                    } ${
                      isHour ? "border-t border-border" : "border-t border-border-soft"
                    } hover:bg-primary/[0.06]`}
                    aria-label={`เพิ่มวิชา ${DAYS[dayIdx]} ${slot}`}
                  >
                    <span className="pointer-events-none absolute inset-0 grid place-items-center text-base text-primary opacity-0 transition-opacity group-hover:opacity-60">
                      +
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {/* current-time indicator */}
        {showNow && (
          <div
            className="pointer-events-none relative z-40"
            style={{
              gridColumn: "2 / -1",
              gridRow: nowRowIdx + 2,
              alignSelf: "start",
              transform: `translateY(${nowOffset}px)`,
            }}
          >
            <div className="absolute -left-1 -top-[5px] size-2.5 rounded-full bg-danger shadow-[0_0_8px_var(--color-danger)]" />
            <div className="h-px w-full bg-danger/70" />
          </div>
        )}

        {/* class blocks */}
        {classes.map((cls) => {
          const startIdx = TIME_SLOTS.indexOf(cls.start);
          if (startIdx < 0) return null;
          const dayIdx = DAY_KEYS.indexOf(cls.day as (typeof DAY_KEYS)[number]);
          if (dayIdx < 0) return null;
          const span = Math.min(classDurationSlots(cls.start, cls.end), ROWS - startIdx);
          const taskCount = cls.tasks.length;
          const accent = ACCENT[cls.type] ?? ACCENT.lecture;

          return (
            <button
              key={cls.id}
              onClick={() => onEdit(cls)}
              title={`${cls.name}\n${cls.start}–${cls.end}\n${cls.location}`}
              style={{
                gridColumn: dayIdx + 2,
                gridRow: `${startIdx + 2} / span ${span}`,
                background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 10%, #ffffff) 0%, #ffffff 45%)`,
                borderColor: `color-mix(in srgb, ${accent} 35%, transparent)`,
              }}
              className="js-card z-10 m-[3px] flex flex-col overflow-hidden rounded-xl border p-2 text-left shadow-sm ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary/20"
            >
              <div className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-full" style={{ background: accent }} />
                <span className="text-[0.66rem] font-medium text-muted">
                  {cls.start}–{cls.end}
                </span>
              </div>
              <div className="mt-1 line-clamp-2 text-[0.78rem] font-semibold leading-tight text-text">
                {cls.name}
              </div>
              {cls.location && (
                <div className="mt-0.5 line-clamp-2 text-[0.64rem] leading-snug text-muted">
                  📍 {cls.location}
                </div>
              )}
              <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                <span
                  className="rounded px-1.5 py-0.5 text-[0.58rem] font-medium"
                  style={{
                    background: `color-mix(in srgb, ${accent} 20%, transparent)`,
                    color: accent,
                  }}
                >
                  {TYPE_LABEL[cls.type]}
                </span>
                {taskCount > 0 && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[0.58rem] font-semibold"
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
