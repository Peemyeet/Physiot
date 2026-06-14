"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: "md" | "sm";
}

export default function Modal({ open, onClose, children, size = "md" }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    if (!backdrop || !panel) return;

    if (open) {
      mounted.current = true;
      document.body.style.overflow = "hidden";
      gsap.killTweensOf([backdrop, panel]);
      gsap.set(backdrop, { display: "flex" });
      gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: "power2.out" });
      gsap.fromTo(
        panel,
        { y: 28, scale: 0.94, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }
      );
    } else if (mounted.current) {
      document.body.style.overflow = "";
      gsap.killTweensOf([backdrop, panel]);
      gsap.to(panel, { y: 20, scale: 0.96, opacity: 0, duration: 0.22, ease: "power2.in" });
      gsap.to(backdrop, {
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
        onComplete: () => gsap.set(backdrop, { display: "none" }),
      });
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ display: "none" }}
      className="fixed inset-0 z-[1000] hidden items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        className={`glass max-h-[90vh] w-full overflow-hidden rounded-3xl shadow-2xl ${
          size === "sm" ? "max-w-md" : "max-w-xl"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
