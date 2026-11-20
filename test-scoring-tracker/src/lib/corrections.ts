import { sqlite } from "./db";

export type MissedPoint = { tag: string; description: string; topic: string | null; reason: string };
export type CorrectionQuestion = { number: number; earned: number; total: number; missed: MissedPoint[] };
export type StudentCorrections = { studentId: number; name: string; period: string; missedCount: number; questions: CorrectionQuestion[] };

/**
 * For each student on a test: every question where they missed at least one point, with the points they
 * earned on that question and, for each missed point, the reason they chose.
 */
export function correctionsFor(testId: number, filter: { sectionId?: number | null; studentId?: number | null }): StudentCorrections[] {
  const where = filter.studentId ? "s.id = ?" : filter.sectionId ? "s.section_id = ?" : "1 = 1";
  const arg = filter.studentId ?? filter.sectionId ?? null;
  const rows = sqlite
    .prepare(
      `SELECT s.id sid, s.last_name || ', ' || s.first_name name, se.name period,
              q.number qn, pa.label plabel, p.position ppos, p.description description, t.code tcode, t.title ttitle, r.status status,
              CASE WHEN r.status = 'missed' THEN
                CASE WHEN r.reason_id IS NOT NULL THEN (SELECT text FROM reason WHERE id = r.reason_id)
                     WHEN r.is_other = 1 THEN 'Other' ELSE 'No reason selected' END
              END reason
       FROM response r
       JOIN student s ON s.id = r.student_id JOIN section se ON se.id = s.section_id
       JOIN point p ON p.id = r.point_id JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id
       LEFT JOIN topic t ON t.id = p.topic_id
       WHERE r.test_id = ? AND r.status IN ('earned','missed') AND ${where}
       ORDER BY se.name, s.last_name, s.first_name, q.number, pa.label, p.position`,
    )
    .all(testId, ...(arg == null ? [] : [arg])) as {
    sid: number; name: string; period: string; qn: number; plabel: string; ppos: number; description: string;
    tcode: string | null; ttitle: string | null; status: "earned" | "missed"; reason: string | null;
  }[];

  const out = new Map<number, StudentCorrections>();
  for (const r of rows) {
    if (!out.has(r.sid)) out.set(r.sid, { studentId: r.sid, name: r.name, period: r.period, missedCount: 0, questions: [] });
    const s = out.get(r.sid)!;
    let q = s.questions.find((x) => x.number === r.qn);
    if (!q) { q = { number: r.qn, earned: 0, total: 0, missed: [] }; s.questions.push(q); }
    q.total++;
    if (r.status === "earned") q.earned++;
    else {
      q.missed.push({ tag: `${r.qn}${r.plabel}.${r.ppos}`, description: r.description, topic: r.tcode ? `${r.tcode} ${r.ttitle ?? ""}`.trim() : null, reason: r.reason ?? "No reason selected" });
      s.missedCount++;
    }
  }
  return [...out.values()].map((s) => ({ ...s, questions: s.questions.filter((q) => q.missed.length) }));
}
