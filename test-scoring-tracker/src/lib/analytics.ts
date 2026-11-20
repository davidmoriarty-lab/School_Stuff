import { sqlite } from "./db";
import { applyCurve, parseCurve, type Curve, type ScoreMode } from "./curve";

// Everything on the dashboards comes from saved scan results ("responses"). A point counts when its status
// is earned or missed; "unknown" points are left out. Every point is worth one point, so a score is
// earned / (earned + missed).

export type Row = {
  studentId: number;
  sectionId: number;
  testId: number;
  testName: string;
  testDate: string;
  testTotal: number;
  curve: Curve;
  courseId: number;
  pointId: number;
  qnum: number;
  tag: string;
  description: string;
  status: "earned" | "missed";
  reason: string | null; // for missed points
  topicId: number | null;
  topicCode: string | null;
  topicTitle: string | null;
  unitId: number | null;
  unitNum: number | null;
  unitTitle: string | null;
};

type RawRow = Omit<Row, "tag" | "curve"> & { plabel: string; ppos: number; curveType: string; curveValue: number };

export function loadRows(): Row[] {
  const raw = sqlite
    .prepare(
      `SELECT r.student_id studentId, st.section_id sectionId, r.test_id testId, te.name testName, te.course_id courseId, te.curve_type curveType, te.curve_value curveValue,
              (SELECT COUNT(*) FROM point p2 JOIN part pa2 ON pa2.id = p2.part_id JOIN question q2 ON q2.id = pa2.question_id WHERE q2.test_id = r.test_id) testTotal,
              COALESCE((SELECT MIN(scanned_at) FROM scan s WHERE s.test_id = r.test_id), '') testDate,
              r.point_id pointId, p.description description, q.number qnum, pa.label plabel, p.position ppos, r.status status,
              CASE WHEN r.status = 'missed' THEN
                CASE WHEN r.reason_id IS NOT NULL THEN (SELECT text FROM reason WHERE id = r.reason_id)
                     WHEN r.is_other = 1 THEN 'Other' ELSE 'No reason chosen' END
              END reason,
              p.topic_id topicId, t.code topicCode, t.title topicTitle, u.id unitId, u.number unitNum, u.title unitTitle
       FROM response r
       JOIN point p ON p.id = r.point_id JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id
       JOIN test te ON te.id = r.test_id JOIN student st ON st.id = r.student_id
       LEFT JOIN topic t ON t.id = p.topic_id LEFT JOIN unit u ON u.id = t.unit_id
       WHERE r.status IN ('earned','missed')`,
    )
    .all() as RawRow[];
  return raw.map(({ plabel, ppos, curveType, curveValue, ...r }) => ({ ...r, tag: `${r.qnum}${plabel}.${ppos}`, curve: parseCurve(curveType, curveValue) }));
}

const pct = (earned: number, total: number) => (total ? (earned / total) * 100 : null);
const earnedOf = (rows: Row[]) => rows.filter((r) => r.status === "earned").length;

/** Raw percent of one student's results on one test. */
export const rawPct = (rows: Row[]) => (rows.length ? (earnedOf(rows) / rows.length) * 100 : 0);

/**
 * Score (0-100) of a set of results. Raw: earned / scored. Curved: each student's results on each test are
 * curved by that test's curve first, then averaged weighted by how many points each covers. Tests with no
 * curve count as raw, so the two modes agree whenever no curve is set.
 */
export function scorer(mode: ScoreMode) {
  return (rows: Row[]): number | null => {
    if (!rows.length) return null;
    if (mode === "raw") return pct(earnedOf(rows), rows.length);
    const groups = new Map<string, Row[]>();
    for (const r of rows) (groups.get(`${r.studentId}|${r.testId}`) ?? groups.set(`${r.studentId}|${r.testId}`, []).get(`${r.studentId}|${r.testId}`)!).push(r);
    let sum = 0;
    for (const g of groups.values()) sum += applyCurve(rawPct(g), g[0].curve) * g.length;
    return sum / rows.length;
  };
}

/** Tests in chronological order (first scan time, then id). */
export function orderTests(rows: Row[]) {
  const m = new Map<number, { id: number; name: string; date: string }>();
  for (const r of rows) if (!m.has(r.testId)) m.set(r.testId, { id: r.testId, name: r.testName, date: r.testDate });
  return [...m.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
}

// ---------------------------------------------------------------------------------------------
// Class dashboard
// ---------------------------------------------------------------------------------------------

export type PointStat = { pointId: number; tag: string; description: string; testName: string; topic: string | null; answered: number; missed: number; missedPct: number; topReason: string | null; topReasonN: number };
export type TopicStat = { key: string; code: string; title: string; unitNum: number | null; answered: number; correctPct: number };
export type ReasonStat = { reason: string; n: number };

export type ClassFilters = { courseId: number | null; sectionId: number | null; testId: number | null };

export function classAnalytics(all: Row[], f: ClassFilters, mode: ScoreMode = "raw") {
  const P = scorer(mode);
  const rows = all.filter((r) => (f.courseId ? r.courseId === f.courseId : true) && (f.sectionId ? r.sectionId === f.sectionId : true) && (f.testId ? r.testId === f.testId : true));

  const byPoint = new Map<number, Row[]>();
  for (const r of rows) (byPoint.get(r.pointId) ?? byPoint.set(r.pointId, []).get(r.pointId)!).push(r);
  const points: PointStat[] = [...byPoint.values()].map((rs) => {
    const missed = rs.filter((r) => r.status === "missed");
    const counts = new Map<string, number>();
    for (const m of missed) counts.set(m.reason ?? "No reason chosen", (counts.get(m.reason ?? "No reason chosen") ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    return {
      pointId: rs[0].pointId,
      tag: rs[0].tag,
      description: rs[0].description,
      testName: rs[0].testName,
      topic: rs[0].topicCode ? `${rs[0].topicCode} ${rs[0].topicTitle}` : null,
      answered: rs.length,
      missed: missed.length,
      missedPct: (missed.length / rs.length) * 100,
      topReason: top?.[0] ?? null,
      topReasonN: top?.[1] ?? 0,
    };
  });
  points.sort((a, b) => b.missedPct - a.missedPct || b.answered - a.answered);

  const byTopic = new Map<string, Row[]>();
  for (const r of rows) if (r.topicCode) (byTopic.get(`${r.courseId}|${r.topicCode}`) ?? byTopic.set(`${r.courseId}|${r.topicCode}`, []).get(`${r.courseId}|${r.topicCode}`)!).push(r);
  const topics: TopicStat[] = [...byTopic].map(([key, rs]) => ({
    key, code: rs[0].topicCode!, title: rs[0].topicTitle ?? "", unitNum: rs[0].unitNum, answered: rs.length, correctPct: P(rs)!,
  }));
  topics.sort((a, b) => a.correctPct - b.correctPct || b.answered - a.answered);

  const byReason = new Map<string, number>();
  for (const r of rows) if (r.status === "missed") byReason.set(r.reason ?? "No reason chosen", (byReason.get(r.reason ?? "No reason chosen") ?? 0) + 1);
  const reasons: ReasonStat[] = [...byReason].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n);

  // Average score per test (class trend)
  const tests = orderTests(rows);
  const trend = tests.map((t) => {
    const rs = rows.filter((r) => r.testId === t.id);
    return { ...t, correctPct: P(rs)!, students: new Set(rs.map((r) => r.studentId)).size };
  });

  const students = new Set(rows.map((r) => r.studentId));
  return {
    kpis: {
      avg: P(rows),
      students: students.size,
      answered: rows.length,
      tests: tests.length,
      weakest: topics.find((t) => t.answered >= 3) ?? topics[0] ?? null,
    },
    points,
    topics,
    reasons,
    trend,
    rows,
  };
}

/** Correct % by unit for one section, used by the side-by-side comparison. */
export function unitScores(all: Row[], sectionId: number, f: { courseId: number | null; testId: number | null }, mode: ScoreMode = "raw") {
  const P = scorer(mode);
  const rows = all.filter((r) => r.sectionId === sectionId && (f.courseId ? r.courseId === f.courseId : true) && (f.testId ? r.testId === f.testId : true));
  const m = new Map<string, { num: number | null; title: string; rows: Row[] }>();
  for (const r of rows) {
    const key = r.unitNum != null ? `u${r.unitNum}` : "none";
    if (!m.has(key)) m.set(key, { num: r.unitNum, title: r.unitNum != null ? r.unitTitle ?? "" : "Untagged points", rows: [] });
    m.get(key)!.rows.push(r);
  }
  return {
    overall: P(rows),
    answered: rows.length,
    units: [...m].map(([key, v]) => ({ key, num: v.num, title: v.title, answered: v.rows.length, correctPct: P(v.rows)! })),
  };
}

// ---------------------------------------------------------------------------------------------
// Student profile
// ---------------------------------------------------------------------------------------------

export type Series = { student: (number | null)[]; cls: (number | null)[]; n: number[] };
export type StudentData = {
  tests: { id: number; name: string }[];
  overall: Series;
  units: ({ id: number; num: number; title: string } & Series)[];
  topics: ({ code: string; title: string; unitNum: number } & Series)[];
};

export function studentAnalytics(all: Row[], studentId: number, sectionId: number, mode: ScoreMode = "raw") {
  const P = scorer(mode);
  const mine = all.filter((r) => r.studentId === studentId);
  const classmates = all.filter((r) => r.sectionId === sectionId);
  const tests = orderTests(mine);

  const series = (pick: (r: Row) => boolean): Series => ({
    student: tests.map((t) => { const rs = mine.filter((r) => r.testId === t.id && pick(r)); return P(rs); }),
    cls: tests.map((t) => { const rs = classmates.filter((r) => r.testId === t.id && pick(r)); return P(rs); }),
    n: tests.map((t) => mine.filter((r) => r.testId === t.id && pick(r)).length),
  });

  const unitMap = new Map<number, { id: number; num: number; title: string }>();
  const topicMap = new Map<string, { code: string; title: string; unitNum: number }>();
  for (const r of mine) {
    if (r.unitId != null && r.unitNum != null) unitMap.set(r.unitNum, { id: r.unitId, num: r.unitNum, title: r.unitTitle ?? "" });
    if (r.topicCode && r.unitNum != null) topicMap.set(r.topicCode, { code: r.topicCode, title: r.topicTitle ?? "", unitNum: r.unitNum });
  }

  const data: StudentData = {
    tests: tests.map((t) => ({ id: t.id, name: t.name })),
    overall: series(() => true),
    units: [...unitMap.values()].sort((a, b) => a.num - b.num).map((u) => ({ ...u, ...series((r) => r.unitNum === u.num) })),
    topics: [...topicMap.values()].sort((a, b) => a.unitNum - b.unitNum || a.code.localeCompare(b.code, undefined, { numeric: true })).map((t) => ({ ...t, ...series((r) => r.topicCode === t.code) })),
  };

  const missed = mine.filter((r) => r.status === "missed");
  const rc = new Map<string, number>();
  for (const r of missed) rc.set(r.reason ?? "No reason chosen", (rc.get(r.reason ?? "No reason chosen") ?? 0) + 1);

  const tp = new Map<string, Row[]>();
  for (const r of mine) if (r.topicCode) (tp.get(r.topicCode) ?? tp.set(r.topicCode, []).get(r.topicCode)!).push(r);
  const topicScores = [...tp].map(([code, rs]) => ({ code, title: rs[0].topicTitle ?? "", answered: rs.length, correctPct: P(rs)! }))
    .sort((a, b) => a.correctPct - b.correctPct || b.answered - a.answered);

  const classRows = classmates.filter((r) => r.studentId !== studentId);
  return {
    data,
    summary: {
      overall: P(mine),
      classAvg: classRows.length ? P(classRows) : null,
      answered: mine.length,
      tests: tests.length,
    },
    testScores: tests.map((t) => {
      const rs = mine.filter((r) => r.testId === t.id);
      const raw = rawPct(rs);
      return { id: t.id, name: t.name, earned: earnedOf(rs), answered: rs.length, total: rs[0].testTotal, raw, curved: applyCurve(raw, rs[0].curve), curve: rs[0].curve };
    }),
    reasons: [...rc].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n),
    topicScores,
    questions: mine
      .map((r) => ({ testId: r.testId, testName: r.testName, tag: r.tag, qnum: r.qnum, topic: r.topicCode, status: r.status, reason: r.reason }))
      .sort((a, b) => a.testId - b.testId || a.qnum - b.qnum || a.tag.localeCompare(b.tag, undefined, { numeric: true })),
  };
}
