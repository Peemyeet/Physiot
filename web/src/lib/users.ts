import type { ClassItem } from "./types";

export interface StudentUser {
  id: string;
  name: string;
  nickname: string;
}

/** รายชื่อนักศึกษาที่อนุญาต — เพิ่มคนใหม่ได้ที่นี่ */
export const STUDENTS: Record<string, StudentUser> = {
  "69050356": { id: "69050356", name: "พึก", nickname: "พึก" },
  "69050432": { id: "69050432", name: "ภู", nickname: "ภู" },
  "69050095": { id: "69050095", name: "มันนี่", nickname: "มันนี่" },
  "69050411": { id: "69050411", name: "เพทาย", nickname: "เพทาย" },
  "69050613": { id: "69050613", name: "เหม่ย", nickname: "เหม่ย" },
  "69050188": { id: "69050188", name: "บอส", nickname: "บอส" },
  "69050582": { id: "69050582", name: "อิงฟ้า", nickname: "อิงฟ้า" },
};

/** ปรับวิชาเฉพาะรายคน (เซค/กลุ่ม/ห้อง/เวลาต่างกัน) — key = รหัสนักศึกษา */
export type ClassOverride = Partial<Omit<ClassItem, "id" | "tasks">> & {
  id: string;
  hidden?: boolean;
};

export const USER_OVERRIDES: Record<string, ClassOverride[]> = {
  // ตัวอย่าง: ถ้าวิชาไหนเซคต่างกัน ใส่ override ตรงนี้
  // "69050356": [{ id: "01006012-tue", note: "ทฤษฎี (กลุ่ม 28), ปฏิบัติ (กลุ่ม 128)" }],
};

export function findStudent(id: string): StudentUser | null {
  const trimmed = id.trim();
  return STUDENTS[trimmed] ?? null;
}

export function allStudents(): StudentUser[] {
  return Object.values(STUDENTS);
}
