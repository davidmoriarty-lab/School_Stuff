// Settings shared by the server and the browser. Every option in the app that a teacher can change lives here,
// with a default. Saved values (from the Settings page or a page's "quick settings" pop-up) are merged over these.

export type ModuleKey =
  | "library" | "worksheets" | "profiles" | "seating" | "lessons" | "pacing" | "calendar" | "todo" | "tools" | "gradebook" | "share";

export const MODULES: { key: ModuleKey; label: string; hint: string }[] = [
  { key: "library", label: "Library", hint: "Browse, search, preview and print your class files" },
  { key: "worksheets", label: "Worksheet builder", hint: "Drag-and-snap chemistry worksheet maker" },
  { key: "profiles", label: "Student profiles", hint: "Preferred names, notes and a printable substitute roster" },
  { key: "seating", label: "Seating charts", hint: "Room layouts with students, printable" },
  { key: "lessons", label: "Lesson plans", hint: "Customizable lesson plan templates" },
  { key: "pacing", label: "Pacing guides", hint: "Unit schedule for the year" },
  { key: "calendar", label: "Calendar", hint: "Tests, labs, due dates and school events" },
  { key: "todo", label: "To-do list", hint: "Tasks with due dates and lists" },
  { key: "tools", label: "Classroom tools", hint: "Random picker, group maker, timer" },
  { key: "gradebook", label: "Test scoring & gradebook", hint: "Tests, scanning, curves, reports" },
  { key: "share", label: "Share packages", hint: "Send items to another teacher as a file" },
];

export type Period = { name: string; start: string; end: string };
export type EventType = { id: string; label: string; color: string };
export type LessonSection = { id: string; label: string; enabled: boolean };
export type Pin = { root: string; path: string; name: string };
export type StudentTag = { id: string; label: string; color: string };
export type StudentField = { id: string; label: string; long: boolean };
export type ProfileFields = { pronunciation: boolean; pronouns: boolean; accommodations: boolean; medical: boolean; guardian: boolean; strengths: boolean };

export type Settings = {
  appName: string;
  teacherName: string;
  schoolYear: string;
  schoolStart: string;
  schoolEnd: string;
  accent: string;
  theme: "light" | "dark";
  fontScale: "small" | "normal" | "large" | "xl";
  density: "comfortable" | "compact";
  modules: Record<ModuleKey, boolean>;
  periods: Period[];
  courses: string[];
  eventTypes: EventType[];
  todoLists: string[];
  lessonSections: LessonSection[];
  dashboard: { today: boolean; todos: boolean; upcoming: boolean; pinned: boolean; pacing: boolean; recent: boolean };
  print: { paper: "letter" | "a4"; headerText: string; footerText: string; showDate: boolean };
  pins: Pin[];
  studentTags: StudentTag[];
  studentFields: StudentField[];
  profileFields: ProfileFields;
  /** Per-page quick settings, e.g. prefs.calendar.weekStart */
  prefs: Record<string, Record<string, string | number | boolean>>;
};

export const DEFAULT_SETTINGS: Settings = {
  appName: "Classroom",
  teacherName: "",
  schoolYear: "",
  schoolStart: "",
  schoolEnd: "",
  accent: "#4f46e5",
  theme: "light",
  fontScale: "normal",
  density: "comfortable",
  modules: {
    library: true, worksheets: true, profiles: true, seating: true, lessons: true, pacing: true,
    calendar: true, todo: true, tools: true, gradebook: true, share: true,
  },
  periods: [
    { name: "Period 1", start: "08:00", end: "08:50" },
    { name: "Period 2", start: "08:55", end: "09:45" },
    { name: "Period 3", start: "09:50", end: "10:40" },
  ],
  courses: ["Honors Chemistry", "AP Chemistry", "Organic Chemistry", "Anatomy & Physiology"],
  eventTypes: [
    { id: "test", label: "Test / Quiz", color: "#dc2626" },
    { id: "lab", label: "Lab", color: "#16a34a" },
    { id: "due", label: "Assignment due", color: "#d97706" },
    { id: "meeting", label: "Meeting", color: "#7c3aed" },
    { id: "noschool", label: "No school", color: "#64748b" },
    { id: "other", label: "Other", color: "#2563eb" },
  ],
  todoLists: ["Teaching", "Grading", "Prep", "Admin"],
  lessonSections: [
    { id: "objectives", label: "Objectives / Learning targets", enabled: true },
    { id: "standards", label: "Standards", enabled: true },
    { id: "warmup", label: "Warm-up / Do now", enabled: true },
    { id: "instruction", label: "Direct instruction", enabled: true },
    { id: "guided", label: "Guided practice", enabled: true },
    { id: "independent", label: "Independent practice / Lab", enabled: true },
    { id: "assessment", label: "Assessment / Exit ticket", enabled: true },
    { id: "materials", label: "Materials & prep", enabled: true },
    { id: "differentiation", label: "Differentiation / Accommodations", enabled: true },
    { id: "homework", label: "Homework", enabled: true },
    { id: "reflection", label: "Notes / Reflection", enabled: true },
  ],
  dashboard: { today: true, todos: true, upcoming: true, pinned: true, pacing: true, recent: true },
  print: { paper: "letter", headerText: "", footerText: "", showDate: true },
  pins: [],
  studentTags: [
    { id: "iep", label: "IEP", color: "#7c3aed" }, { id: "504", label: "504", color: "#2563eb" },
    { id: "ell", label: "ELL", color: "#0d9488" }, { id: "medical", label: "Medical alert", color: "#dc2626" },
    { id: "allergy", label: "Allergy", color: "#ea580c" }, { id: "seat", label: "Preferred seat", color: "#ca8a04" },
    { id: "checkin", label: "Check in", color: "#db2777" }, { id: "leader", label: "Helper / leader", color: "#16a34a" },
  ],
  studentFields: [],
  profileFields: { pronunciation: true, pronouns: true, accommodations: true, medical: true, guardian: true, strengths: true },
  prefs: {},
};

const OBJECT_KEYS = ["modules", "dashboard", "print", "profileFields", "prefs"] as const;

/** Merge saved settings over the defaults (one level deep for the grouped options). */
export function mergeSettings(saved: Partial<Settings>): Settings {
  const out = { ...DEFAULT_SETTINGS, ...saved } as Settings;
  for (const k of OBJECT_KEYS) {
    (out as Record<string, unknown>)[k] = { ...(DEFAULT_SETTINGS[k] as object), ...((saved[k] as object) ?? {}) };
  }
  return out;
}

export function pref<T extends string | number | boolean>(s: Settings, page: string, key: string, fallback: T): T {
  const v = s.prefs[page]?.[key];
  return (v === undefined ? fallback : v) as T;
}

export const ACCENTS = [
  { name: "Indigo", hex: "#4f46e5" }, { name: "Blue", hex: "#2563eb" }, { name: "Teal", hex: "#0d9488" },
  { name: "Green", hex: "#16a34a" }, { name: "Orange", hex: "#ea580c" }, { name: "Rose", hex: "#e11d48" },
  { name: "Purple", hex: "#9333ea" }, { name: "Slate", hex: "#475569" },
];

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
function mix(hex: string, other: number, t: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const h = m ? m[1] : "4f46e5";
  const c = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return "#" + c.map((v) => clamp(v + (other - v) * t).toString(16).padStart(2, "0")).join("");
}

/** CSS variables that recolor every "brand" shade in the app from one accent color. */
export function accentVars(hex: string): Record<string, string> {
  return {
    "--color-brand-50": mix(hex, 255, 0.93),
    "--color-brand-100": mix(hex, 255, 0.84),
    "--color-brand-500": mix(hex, 255, 0.15),
    "--color-brand-600": mix(hex, 0, 0),
    "--color-brand-700": mix(hex, 0, 0.18),
  };
}

export const FONT_PX = { small: 14, normal: 16, large: 18, xl: 20 } as const;
