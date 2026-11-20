// Small date helpers. Dates are stored as plain "YYYY-MM-DD" text so there are no time-zone surprises.
export const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayStr = () => ymd(new Date());
export const parseYmd = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
export const addDays = (s: string, n: number) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
export const isWeekend = (s: string) => [0, 6].includes(parseYmd(s).getDay());
export const fmtLong = (s: string) =>
  parseYmd(s).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const fmtShort = (s: string) => parseYmd(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const monthTitle = (ym: string) =>
  parseYmd(ym + "-01").toLocaleDateString(undefined, { month: "long", year: "numeric" });
export const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Weeks (arrays of 7 date strings) covering a month, starting on weekStart (0 = Sunday, 1 = Monday). */
export function monthWeeks(ym: string, weekStart: 0 | 1) {
  const first = parseYmd(ym + "-01");
  const offset = (first.getDay() - weekStart + 7) % 7;
  let cur = addDays(ymd(first), -offset);
  const weeks: string[][] = [];
  do {
    const w: string[] = [];
    for (let i = 0; i < 7; i++) { w.push(cur); cur = addDays(cur, 1); }
    weeks.push(w);
  } while (cur.slice(0, 7) <= ym && weeks.length < 6);
  return weeks;
}
