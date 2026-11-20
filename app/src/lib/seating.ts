// Seating chart data. A chart is a room (width x height) containing objects: desks, tables, a teacher desk, a door...
// Objects that have seats hold one student id (or null) per seat. Students are never stored here, only their ids,
// and ids are stripped when a chart is shared.
export type ObjType = "desk" | "pair" | "table" | "bench" | "teacher" | "door" | "board" | "sink" | "cabinet" | "label";
export type Obj = { id: string; type: ObjType; x: number; y: number; w: number; h: number; label: string; students: (number | null)[] };
export type Chart = {
  sectionId: number | null; w: number; h: number; grid: number; snap: boolean;
  nameFormat: "first" | "firstLast1" | "full" | "last"; fontSize: number; note: string; objs: Obj[];
};
export type Student = { id: number; sectionId: number; first: string; last: string };

export const OBJ_DEFS: Record<ObjType, { label: string; w: number; h: number; seats: number; color: string; text: string }> = {
  desk: { label: "Desk", w: 80, h: 60, seats: 1, color: "#ffffff", text: "#0f172a" },
  pair: { label: "Pair of desks", w: 160, h: 60, seats: 2, color: "#ffffff", text: "#0f172a" },
  table: { label: "Table of 4", w: 160, h: 120, seats: 4, color: "#fefce8", text: "#0f172a" },
  bench: { label: "Lab bench", w: 240, h: 80, seats: 4, color: "#ecfeff", text: "#0f172a" },
  teacher: { label: "Teacher desk", w: 160, h: 60, seats: 0, color: "#e0e7ff", text: "#3730a3" },
  door: { label: "Door", w: 60, h: 20, seats: 0, color: "#e2e8f0", text: "#475569" },
  board: { label: "Board", w: 240, h: 20, seats: 0, color: "#1e293b", text: "#f8fafc" },
  sink: { label: "Sink", w: 60, h: 40, seats: 0, color: "#dbeafe", text: "#1e40af" },
  cabinet: { label: "Cabinet", w: 100, h: 30, seats: 0, color: "#f1f5f9", text: "#475569" },
  label: { label: "Text label", w: 140, h: 30, seats: 0, color: "transparent", text: "#0f172a" },
};
export const OBJ_ORDER = Object.keys(OBJ_DEFS) as ObjType[];

const id = () => Math.random().toString(36).slice(2, 9);
export function makeObj(type: ObjType, x: number, y: number, seats?: number): Obj {
  const d = OBJ_DEFS[type];
  const n = seats ?? d.seats;
  return { id: id(), type, x, y, w: d.w, h: d.h, label: type === "teacher" || type === "door" || type === "board" || type === "sink" || type === "cabinet" ? d.label : type === "label" ? "Label" : "", students: Array(n).fill(null) };
}

export function emptyChart(sectionId: number | null = null): Chart {
  return { sectionId, w: 960, h: 620, grid: 20, snap: true, nameFormat: "firstLast1", fontSize: 12, note: "", objs: [] };
}

export const PRESETS: { id: string; label: string; hint: string; build: (c: Chart) => Obj[] }[] = [
  { id: "empty", label: "Empty room", hint: "Teacher desk and board only", build: () => [makeObj("board", 360, 20), makeObj("teacher", 780, 40), makeObj("door", 900, 560)] },
  {
    id: "rows", label: "Rows (5 × 6)", hint: "Traditional rows facing the board",
    build: () => {
      const o: Obj[] = [makeObj("board", 360, 20), makeObj("teacher", 780, 40), makeObj("door", 900, 560)];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) o.push(makeObj("desk", 100 + c * 130, 120 + r * 90));
      return o;
    },
  },
  {
    id: "pairs", label: "Pairs", hint: "Rows of two-person desks",
    build: () => {
      const o: Obj[] = [makeObj("board", 360, 20), makeObj("teacher", 780, 40), makeObj("door", 900, 560)];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) o.push(makeObj("pair", 120 + c * 280, 120 + r * 90));
      return o;
    },
  },
  {
    id: "groups", label: "Groups of 4", hint: "Tables of four around the room",
    build: () => {
      const o: Obj[] = [makeObj("board", 360, 20), makeObj("teacher", 780, 40), makeObj("door", 900, 560)];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) o.push(makeObj("table", 60 + c * 220, 100 + r * 170));
      return o;
    },
  },
  {
    id: "horseshoe", label: "Horseshoe", hint: "U shape around the front",
    build: () => {
      const o: Obj[] = [makeObj("board", 360, 20), makeObj("teacher", 400, 100)];
      for (let i = 0; i < 6; i++) o.push(makeObj("desk", 100, 160 + i * 70));
      for (let i = 0; i < 6; i++) o.push(makeObj("desk", 780, 160 + i * 70));
      for (let i = 0; i < 6; i++) o.push(makeObj("desk", 200 + i * 100, 540));
      return o;
    },
  },
  {
    id: "lab", label: "Lab benches", hint: "Four-seat lab benches in rows",
    build: () => {
      const o: Obj[] = [makeObj("board", 360, 20), makeObj("teacher", 780, 40), makeObj("door", 900, 560), makeObj("sink", 20, 100), makeObj("sink", 20, 300)];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) o.push(makeObj("bench", 100 + c * 280, 120 + r * 120));
      return o;
    },
  },
];

export function studentName(s: Student, f: Chart["nameFormat"]) {
  switch (f) {
    case "first": return s.first;
    case "last": return s.last;
    case "full": return `${s.first} ${s.last}`;
    default: return `${s.first} ${s.last.slice(0, 1)}.`;
  }
}

/** Seats in reading order (top to bottom, left to right) for auto-fill. */
export function seatSlots(c: Chart): { objId: string; seat: number }[] {
  const rows = [...c.objs].filter((o) => o.students.length).sort((a, b) => Math.round(a.y / 40) - Math.round(b.y / 40) || a.x - b.x);
  return rows.flatMap((o) => o.students.map((_, seat) => ({ objId: o.id, seat })));
}

export function autoFill(c: Chart, ids: number[]): Chart {
  const slots = seatSlots(c);
  const objs = c.objs.map((o) => ({ ...o, students: o.students.map(() => null as number | null) }));
  slots.forEach((sl, i) => {
    if (i < ids.length) objs.find((o) => o.id === sl.objId)!.students[sl.seat] = ids[i];
  });
  return { ...c, objs };
}

/** Where the seats sit inside an object: a grid of rows x cols. */
export function seatGrid(o: Obj) {
  const n = o.students.length;
  if (n <= 1) return { rows: 1, cols: 1 };
  if (o.w >= o.h) { const cols = n <= 3 ? n : Math.ceil(n / 2); return { cols, rows: Math.ceil(n / cols) }; }
  const rows = n <= 3 ? n : Math.ceil(n / 2);
  return { rows, cols: Math.ceil(n / rows) };
}
