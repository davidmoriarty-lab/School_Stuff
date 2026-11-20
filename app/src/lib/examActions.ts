"use server";
// Turn a test into a scoring template in the Gradebook (the original Test Scoring Tracker), so you can print its
// scoring sheets, scan results and see error reports. Uses Version A, the order you built.
import { revalidatePath } from "next/cache";
import { sqlite } from "./db";
import { getItem } from "./store";
import { MAX_POINTS_PER_PART } from "./limits";
import { buildVersion, normalizeExam, normalizeQuestion, questionSummary, type Exam } from "./questions";

export async function createGradebookTest(examUid: string, courseId: number, includeMc: boolean) {
  const it = getItem(examUid);
  if (!it || it.kind !== "exam") throw new Error("Test not found");
  const exam = normalizeExam(it.data as Partial<Exam>);
  if (!sqlite.prepare("SELECT 1 FROM course WHERE id = ?").get(courseId)) throw new Error("Pick a course in the Gradebook first");
  const rendered = buildVersion({ ...exam, options: { ...exam.options, shuffleFirst: false } }, 0).filter((r) => r.q);

  const letter = (i: number) => String.fromCharCode(65 + i);
  const tx = sqlite.transaction(() => {
    const testId = Number(sqlite.prepare("INSERT INTO test(course_id, name) VALUES(?, ?)").run(courseId, it.title || "Test").lastInsertRowid);
    let number = 0, rows = 0;
    for (const r of rendered) {
      const q = normalizeQuestion(r.q!);
      if (!includeMc && (q.type === "mcq" || q.type === "multi" || q.type === "tf")) continue;
      number += 1;
      const qid = Number(sqlite.prepare("INSERT INTO question(test_id, number) VALUES(?, ?)").run(testId, number).lastInsertRowid);
      // The tracker allows at most a few points per part, so larger questions are split into parts of up to that size.
      const chunks: { label: string; pts: number; text: string }[] = [];
      const explicit = q.type === "free" && q.parts.length > 0;
      const sources = explicit ? q.parts.map((p) => ({ label: p.label.replace(/[()]/g, "").trim(), pts: Math.max(1, Math.round(Number(p.points) || 1)), text: p.stem })) : [{ label: "", pts: Math.max(1, Math.round(r.points || 1)), text: questionSummary(q, 60) }];
      for (const s of sources) {
        const pieces = Math.ceil(s.pts / MAX_POINTS_PER_PART);
        let left = s.pts;
        for (let k = 0; k < pieces; k++) {
          const take = Math.min(MAX_POINTS_PER_PART, left);
          // Labels: none for a one-part question; (a), (b)... for explicit parts; A, B... when one big question is split.
          const label = explicit ? (pieces > 1 ? `${s.label}${k + 1}` : s.label) : pieces > 1 ? letter(k) : "";
          chunks.push({ label, pts: take, text: s.text });
          left -= take;
        }
      }
      if (chunks.length === 1) chunks[0].label = "";
      for (const c of chunks) {
        const partId = Number(sqlite.prepare("INSERT INTO part(question_id, label) VALUES(?, ?)").run(qid, c.label).lastInsertRowid);
        for (let p = 1; p <= c.pts; p++) { sqlite.prepare("INSERT INTO point(part_id, position, description) VALUES(?, ?, ?)").run(partId, p, p === 1 ? questionSummary(normalizeQuestion({ ...q, stem: c.text }), 70) : ""); rows++; }
      }
    }
    return { testId, questions: number, points: rows };
  });
  const out = tx();
  revalidatePath("/tests");
  return out;
}
