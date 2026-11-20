import { sqlite } from "./db";
import { applyCurve, parseCurve, type Curve } from "./curve";

// A midterm combines two parts into one score, both counted in points:
//   FRQ: the teacher-graded packet, scanned from the grading sheet (one point per scored point)
//   MCQ: a score the teacher types in, out of the test's "MCQ points"
// The test's curve (if any) is applied to the combined percent.

export type MidtermStudent = {
  studentId: number;
  name: string;
  period: string;
  frqEarned: number;
  frqScored: number; // FRQ points that have been scanned so far
  byQuestion: { number: number; earned: number; total: number }[];
  mcq: number | null;
  combined: number; // earned FRQ + MCQ points
  raw: number | null; // combined / total, percent
  curved: number | null;
  frqComplete: boolean;
  complete: boolean; // FRQ fully scanned and MCQ entered
};

export type MidtermData = {
  test: { id: number; name: string; courseId: number; mcqTotal: number; frqTotal: number; total: number; curve: Curve };
  students: MidtermStudent[];
};

export function listMidterms() {
  return sqlite
    .prepare("SELECT t.id, t.name, c.name course FROM test t JOIN course c ON c.id = t.course_id WHERE t.kind = 'midterm' ORDER BY t.id DESC")
    .all() as { id: number; name: string; course: string }[];
}

export function midtermData(testId: number, filter: { sectionId?: number | null; studentId?: number | null }): MidtermData | null {
  const t = sqlite.prepare("SELECT id, name, course_id courseId, mcq_total mcqTotal, curve_type ct, curve_value cv FROM test WHERE id = ? AND kind = 'midterm'").get(testId) as
    | { id: number; name: string; courseId: number; mcqTotal: number; ct: string; cv: number }
    | undefined;
  if (!t) return null;

  const frqTotal = (sqlite
    .prepare("SELECT COUNT(*) n FROM point p JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id WHERE q.test_id = ?")
    .get(testId) as { n: number }).n;
  const perQuestion = sqlite
    .prepare("SELECT q.number number, COUNT(*) total FROM point p JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id WHERE q.test_id = ? GROUP BY q.id ORDER BY q.number")
    .all(testId) as { number: number; total: number }[];
  const total = frqTotal + t.mcqTotal;
  const curve = parseCurve(t.ct, t.cv);

  const where = filter.studentId ? "s.id = ?" : filter.sectionId ? "s.section_id = ?" : "1 = 1";
  const arg = filter.studentId ?? filter.sectionId ?? null;
  const studs = sqlite
    .prepare(`SELECT s.id, s.last_name || ', ' || s.first_name name, se.name period FROM student s JOIN section se ON se.id = s.section_id WHERE ${where} ORDER BY se.name, s.last_name, s.first_name`)
    .all(...(arg == null ? [] : [arg])) as { id: number; name: string; period: string }[];

  const resp = sqlite
    .prepare(
      `SELECT r.student_id sid, q.number qn, SUM(r.status = 'earned') earned, COUNT(*) scored
       FROM response r JOIN point p ON p.id = r.point_id JOIN part pa ON pa.id = p.part_id JOIN question q ON q.id = pa.question_id
       WHERE r.test_id = ? AND r.status IN ('earned','missed') GROUP BY r.student_id, q.number`,
    )
    .all(testId) as { sid: number; qn: number; earned: number; scored: number }[];
  const mcqs = new Map((sqlite.prepare("SELECT student_id sid, score FROM midterm_mcq WHERE test_id = ?").all(testId) as { sid: number; score: number }[]).map((r) => [r.sid, r.score]));

  const students: MidtermStudent[] = studs.map((s) => {
    const mine = resp.filter((r) => r.sid === s.id);
    const frqEarned = mine.reduce((n, r) => n + r.earned, 0);
    const frqScored = mine.reduce((n, r) => n + r.scored, 0);
    const mcq = mcqs.has(s.id) ? mcqs.get(s.id)! : null;
    const combined = frqEarned + (mcq ?? 0);
    const raw = total > 0 && (frqScored > 0 || mcq != null) ? (combined / total) * 100 : null;
    const frqComplete = frqTotal > 0 && frqScored >= frqTotal;
    return {
      studentId: s.id,
      name: s.name,
      period: s.period,
      frqEarned,
      frqScored,
      byQuestion: perQuestion.map((q) => ({ number: q.number, total: q.total, earned: mine.find((r) => r.qn === q.number)?.earned ?? 0 })),
      mcq,
      combined,
      raw,
      curved: raw == null ? null : applyCurve(raw, curve),
      frqComplete,
      complete: frqComplete && (t.mcqTotal === 0 || mcq != null),
    };
  });

  return { test: { id: t.id, name: t.name, courseId: t.courseId, mcqTotal: t.mcqTotal, frqTotal, total, curve }, students };
}
