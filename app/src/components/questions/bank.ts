// Shared by the question bank page and the test builder's question picker.
import { QTYPES, type Question, type QType } from "@/lib/questions";

export type BankItem = { uid: string; q: Question; updatedAt: string };
export type Filters = { text: string; course: string; unit: string; type: string; difficulty: string; sort: string };
export const NO_FILTERS: Filters = { text: "", course: "", unit: "", type: "", difficulty: "", sort: "recent" };

export const TYPE_COLOR: Record<QType, string> = {
  mcq: "#2563eb", multi: "#7c3aed", tf: "#0d9488", short: "#ca8a04", free: "#dc2626", fill: "#ea580c", matching: "#db2777", numeric: "#16a34a", balance: "#0891b2", nomen: "#4f46e5", ordering: "#64748b",
};

export function applyFilters(items: BankItem[], f: Filters): BankItem[] {
  const n = f.text.trim().toLowerCase();
  const hay = (q: Question) => [q.stem, q.topic, q.tags, q.source, q.unit, q.course, ...q.parts.map((p) => p.stem), ...q.choices.map((c) => c.text), ...q.pairs.map((p) => p.a)].join(" ").toLowerCase();
  const out = items.filter(({ q }) =>
    (!f.course || q.course === f.course) && (!f.unit || q.unit === f.unit) && (!f.type || q.type === f.type) && (!f.difficulty || String(q.difficulty) === f.difficulty) && (!n || hay(q).includes(n)));
  const by = f.sort;
  return out.sort((a, b) => by === "type" ? QTYPES[a.q.type].label.localeCompare(QTYPES[b.q.type].label) || a.q.stem.localeCompare(b.q.stem)
    : by === "difficulty" ? a.q.difficulty - b.q.difficulty || a.q.stem.localeCompare(b.q.stem)
    : by === "unit" ? a.q.course.localeCompare(b.q.course) || a.q.unit.localeCompare(b.q.unit, undefined, { numeric: true }) || a.q.stem.localeCompare(b.q.stem)
    : b.updatedAt.localeCompare(a.updatedAt));
}
