export type ClassType = "lecture" | "lab" | "both";

export interface Task {
  id: string;
  title: string;
  detail: string;
  due: string; // ISO date (yyyy-mm-dd) or ""
  done?: boolean;
}

export interface ClassItem {
  id: string;
  name: string;
  code?: string; // course code e.g. 05016201
  day: string; // mon..sun
  type: ClassType;
  start: string; // "09:00"
  end: string; // "12:00"
  location: string;
  note: string;
  tasks: Task[];
}

export type ExamKind = "midterm" | "final";

export interface Exam {
  id: string;
  kind: ExamKind;
  name: string;
  code?: string;
  date: string; // ISO yyyy-mm-dd
  start: string;
  end: string;
  location: string;
  note: string;
}

export interface TermData {
  classes: ClassItem[];
}
