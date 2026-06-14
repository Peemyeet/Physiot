"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { uid } from "@/lib/schedule";
import type { Task } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (task: Task) => void;
}

const field =
  "w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";
const label = "mb-1.5 block text-xs font-medium text-muted";

export default function TaskModal({ open, onClose, onAdd }: Props) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [due, setDue] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setDetail("");
      setDue("");
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ id: uid(), title: title.trim(), detail: detail.trim(), due });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <form onSubmit={submit} className="flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">เพิ่มงาน / แล็บ</h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-2xl leading-none text-muted transition hover:text-text"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div>
            <label className={label}>ชื่องาน</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น แล็บวัด ROM, ส่งรายงาน"
              className={field}
              required
            />
          </div>
          <div>
            <label className={label}>รายละเอียด</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="อาจารย์สั่งอะไร ต้องเตรียมอะไร"
              className={`${field} resize-none`}
            />
          </div>
          <div>
            <label className={label}>กำหนดส่ง (ไม่บังคับ)</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={`${field} [color-scheme:dark]`}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-xl border border-border px-4 py-2 text-sm transition hover:bg-surface-2"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-soft"
          >
            เพิ่มงาน
          </button>
        </div>
      </form>
    </Modal>
  );
}
