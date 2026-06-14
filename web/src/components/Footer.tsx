"use client";

export default function Footer() {
  return (
    <footer className="reveal mt-8 border-t border-border/60 pt-5 pb-2">
      <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
        <p className="text-xs text-muted">
          ตารางเรียนภาควิชาฟิสิกส์อุตสาหกรรมและวิศวกรรมไอโอที · KMITL · ภาคเรียน 1/2569
        </p>
        <a
          href="https://instagram.com/_twwrp_"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3.5 py-1.5 text-xs font-medium transition hover:border-gold/60 hover:bg-surface"
        >
          <span className="text-muted">Credit</span>
          <span
            className="bg-gradient-to-r from-gold to-gold-soft bg-clip-text font-semibold text-transparent"
          >
            IG @_twwrp_
          </span>
          <span className="text-muted transition-transform group-hover:translate-x-0.5">↗</span>
        </a>
      </div>
    </footer>
  );
}
