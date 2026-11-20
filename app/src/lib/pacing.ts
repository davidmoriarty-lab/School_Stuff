// Pacing guide scheduling: give each unit a number of school days and the dates are worked out for you,
// skipping weekends and any day on the calendar marked "No school".
import { addDays, isWeekend } from "./dates";

export type Unit = { id: string; title: string; days: number; start: string; end: string; topics: string; standards: string; assessments: string; notes: string; color: string };
export type Guide = { course: string; startDate: string; skipWeekends: boolean; units: Unit[] };

export const UNIT_COLORS = ["#4f46e5", "#0d9488", "#ea580c", "#9333ea", "#16a34a", "#e11d48", "#2563eb", "#ca8a04"];

export function schedule(startDate: string, units: Unit[], skip: Set<string>, skipWeekends = true): Unit[] {
  const off = (d: string) => (skipWeekends && isWeekend(d)) || skip.has(d);
  let cur = startDate;
  while (cur && off(cur)) cur = addDays(cur, 1);
  return units.map((u) => {
    if (!cur) return u;
    const start = cur;
    let end = cur, left = Math.max(1, u.days) - 1;
    while (left > 0) { end = addDays(end, 1); if (!off(end)) left--; }
    cur = addDays(end, 1);
    while (off(cur)) cur = addDays(cur, 1);
    return { ...u, start, end };
  });
}
