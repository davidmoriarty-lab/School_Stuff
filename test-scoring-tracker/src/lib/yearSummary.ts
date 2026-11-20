import { sqlite } from "./db";
import { loadRows, orderTests, scorer, type Row } from "./analytics";

// Everything a student's end-of-year summary needs, built from all of their scanned results in one course.

export type YearTopic = { code: string; title: string; unitNum: number | null; earned: number; answered: number; pct: number; classPct: number | null; topReason: string | null };
export type YearUnit = { num: number; title: string; answered: number; pct: number; classPct: number | null };
export type YearSummary = {
  studentId: number;
  name: string;
  period: string;
  course: string;
  tests: { name: string; raw: number; curved: number | null; classRaw: number | null }[];
  hasCurve: boolean;
  overall: { raw: number; curved: number | null; classRaw: number | null; answered: number };
  units: YearUnit[];
  weak: YearTopic[];
  strong: YearTopic[];
  reasons: { reason: string; n: number }[];
};

const WEAK_BELOW = 80;
const STRONG_AT = 90;

function group<T>(rows: T[], key: (r: T) => string | null): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (k == null) continue;
    (m.get(k) ?? m.set(k, []).get(k)!).push(r);
  }
  return m;
}

export function yearSummaries(courseId: number, filter: { sectionId?: number | null; studentId?: number | null }): YearSummary[] {
  const all = loadRows().filter((r) => r.courseId === courseId);
  const course = (sqlite.prepare("SELECT name FROM course WHERE id = ?").get(courseId) as { name: string } | undefined)?.name ?? "";
  const where = filter.studentId ? "s.id = ?" : filter.sectionId ? "s.section_id = ?" : "1 = 1";
  const arg = filter.studentId ?? filter.sectionId ?? null;
  const studs = sqlite
    .prepare(`SELECT s.id, s.section_id sectionId, s.last_name || ', ' || s.first_name name, se.name period FROM student s JOIN section se ON se.id = s.section_id WHERE ${where} ORDER BY se.name, s.last_name, s.first_name`)
    .all(...(arg == null ? [] : [arg])) as { id: number; sectionId: number; name: string; period: string }[];

  const raw = scorer("raw");
  const curved = scorer("curved");
  const earned = (rs: Row[]) => rs.filter((r) => r.status === "earned").length;

  const out: YearSummary[] = [];
  for (const s of studs) {
    const mine = all.filter((r) => r.studentId === s.id);
    if (!mine.length) continue;
    const mates = all.filter((r) => r.sectionId === s.sectionId && r.studentId !== s.id);
    const hasCurve = mine.some((r) => r.curve.type !== "none");

    const tests = orderTests(mine).map((t) => {
      const rs = mine.filter((r) => r.testId === t.id);
      const cls = mates.filter((r) => r.testId === t.id);
      return { name: t.name, raw: raw(rs)!, curved: hasCurve ? curved(rs) : null, classRaw: cls.length ? raw(cls) : null };
    });

    const units: YearUnit[] = [...group(mine, (r) => (r.unitNum != null ? String(r.unitNum) : null))]
      .map(([k, rs]) => {
        const cls = mates.filter((r) => String(r.unitNum) === k);
        return { num: Number(k), title: rs[0].unitTitle ?? "", answered: rs.length, pct: raw(rs)!, classPct: cls.length ? raw(cls) : null };
      })
      .sort((a, b) => a.num - b.num);

    const topics: YearTopic[] = [...group(mine, (r) => r.topicCode)].map(([code, rs]) => {
      const cls = mates.filter((r) => r.topicCode === code);
      const missed = rs.filter((r) => r.status === "missed");
      const counts = new Map<string, number>();
      for (const m of missed) counts.set(m.reason ?? "No reason chosen", (counts.get(m.reason ?? "No reason chosen") ?? 0) + 1);
      const top = [...counts].sort((a, b) => b[1] - a[1])[0];
      return {
        code,
        title: rs[0].topicTitle ?? "",
        unitNum: rs[0].unitNum,
        earned: earned(rs),
        answered: rs.length,
        pct: raw(rs)!,
        classPct: cls.length ? raw(cls) : null,
        topReason: top && top[0] !== "Other" && top[0] !== "No reason chosen" ? top[0] : null,
      };
    });

    const rc = new Map<string, number>();
    for (const r of mine) if (r.status === "missed" && r.reason && r.reason !== "No reason chosen" && r.reason !== "Other") rc.set(r.reason, (rc.get(r.reason) ?? 0) + 1);

    out.push({
      studentId: s.id,
      name: s.name,
      period: s.period,
      course,
      tests,
      hasCurve,
      overall: { raw: raw(mine)!, curved: hasCurve ? curved(mine) : null, classRaw: mates.length ? raw(mates) : null, answered: mine.length },
      units,
      weak: topics.filter((t) => t.answered >= 2 && t.pct < WEAK_BELOW).sort((a, b) => a.pct - b.pct || b.answered - a.answered).slice(0, 6),
      strong: topics.filter((t) => t.answered >= 2 && t.pct >= STRONG_AT).sort((a, b) => b.pct - a.pct || b.answered - a.answered).slice(0, 3),
      reasons: [...rc].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n).slice(0, 4),
    });
  }
  return out;
}
