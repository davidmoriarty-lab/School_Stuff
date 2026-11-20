import { asc, eq, inArray } from "drizzle-orm";
import { db, sqlite } from "./db";
import { question, part, point, reason, unit, topic } from "./schema";

export type PointT = { id: number; position: number; description: string; topicId: number | null; reasons: { id: number; text: string }[] };
export type PartT = { id: number; label: string; points: PointT[] };
export type QuestionT = { id: number; number: number; parts: PartT[] };

/** Load a test's full template (questions > parts > points > reasons) as a nested structure. */
export function loadTemplate(testId: number): QuestionT[] {
  const qs = db.select().from(question).where(eq(question.testId, testId)).orderBy(asc(question.number)).all();
  if (!qs.length) return [];
  const parts = db.select().from(part).where(inArray(part.questionId, qs.map((q) => q.id))).orderBy(asc(part.label)).all();
  const pts = parts.length ? db.select().from(point).where(inArray(point.partId, parts.map((p) => p.id))).orderBy(asc(point.position)).all() : [];
  const rs = pts.length ? db.select().from(reason).where(inArray(reason.pointId, pts.map((p) => p.id))).orderBy(asc(reason.position)).all() : [];
  return qs.map((q) => ({
    id: q.id,
    number: q.number,
    parts: parts.filter((p) => p.questionId === q.id).map((p) => ({
      id: p.id,
      label: p.label,
      points: pts.filter((pt) => pt.partId === p.id).map((pt) => ({
        id: pt.id,
        position: pt.position,
        description: pt.description,
        topicId: pt.topicId,
        reasons: rs.filter((r) => r.pointId === pt.id).map((r) => ({ id: r.id, text: r.text })),
      })),
    })),
  }));
}

export type UnitT = { id: number; number: number; title: string; topics: { id: number; code: string; title: string }[] };

/** A course's curriculum outline: units with their topics, in order. */
export function loadCurriculum(courseId: number): UnitT[] {
  const us = db.select().from(unit).where(eq(unit.courseId, courseId)).orderBy(asc(unit.number)).all();
  if (!us.length) return [];
  const ts = db.select().from(topic).where(inArray(topic.unitId, us.map((u) => u.id))).orderBy(asc(topic.position)).all();
  return us.map((u) => ({
    id: u.id,
    number: u.number,
    title: u.title,
    topics: ts.filter((t) => t.unitId === u.id).map((t) => ({ id: t.id, code: t.code, title: t.title })),
  }));
}

/** Midterm FRQ sheets are graded by the teacher, so they have no "reason" bubbles. */
export function sheetOptionsFor(testId: number): { reasons: boolean } {
  const row = sqlite.prepare("SELECT kind FROM test WHERE id = ?").get(testId) as { kind: string } | undefined;
  return { reasons: row?.kind !== "midterm" };
}
