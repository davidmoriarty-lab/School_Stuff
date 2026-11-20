"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, max } from "drizzle-orm";
import * as XLSX from "xlsx";
import { MAX_POINTS_PER_PART } from "./limits";
import { sqlite } from "./db";
import { db } from "./db";
import { course, test, question, part, point, reason, section, student, unit, topic } from "./schema";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = str(f, k);
  return v === "" ? null : Number(v);
};

export async function addCourse(f: FormData) {
  const name = str(f, "name");
  if (name) db.insert(course).values({ name }).run();
  revalidatePath("/");
}

export async function addTest(f: FormData) {
  const name = str(f, "name");
  const courseId = num(f, "courseId");
  if (name && courseId) db.insert(test).values({ name, courseId }).run();
  revalidatePath("/");
}

export async function deleteTest(f: FormData) {
  db.delete(test).where(eq(test.id, Number(f.get("testId")))).run();
  redirect("/tests");
}

const letter = (i: number) => String.fromCharCode(65 + i);

/** Add a question in one step: how many points, and optionally how many lettered parts (each gets that many points). */
export async function addQuestion(f: FormData) {
  const testId = Number(f.get("testId"));
  const points = Math.max(1, Math.min(MAX_POINTS_PER_PART, num(f, "points") ?? 1));
  const parts = Math.max(0, Math.min(8, num(f, "parts") ?? 0));
  const topicId = num(f, "topicId");
  const row = db.select({ m: max(question.number) }).from(question).where(eq(question.testId, testId)).get();
  const q = db.insert(question).values({ testId, number: (row?.m ?? 0) + 1 }).returning().get();
  for (let p = 0; p < Math.max(1, parts); p++) {
    const pt = db.insert(part).values({ questionId: q.id, label: parts ? letter(p) : "" }).returning().get();
    for (let i = 1; i <= points; i++) db.insert(point).values({ partId: pt.id, position: i, topicId }).run();
  }
  revalidatePath(`/tests/${testId}`);
}

export async function deleteQuestion(f: FormData) {
  const testId = Number(f.get("testId"));
  db.delete(question).where(eq(question.id, Number(f.get("questionId")))).run();
  // Keep question numbers 1, 2, 3... with no gaps.
  const rest = db.select().from(question).where(eq(question.testId, testId)).orderBy(question.number).all();
  rest.forEach((q, i) => {
    if (q.number !== i + 1) db.update(question).set({ number: i + 1 }).where(eq(question.id, q.id)).run();
  });
  revalidatePath(`/tests/${testId}`);
}

/** Add the next lettered part (A, B, C...) to a question. */
export async function addPart(f: FormData) {
  const questionId = Number(f.get("questionId"));
  const existing = db.select().from(part).where(eq(part.questionId, questionId)).all();
  const used = new Set(existing.map((p) => p.label));
  let i = 0;
  while (used.has(letter(i))) i++;
  const p = db.insert(part).values({ questionId, label: letter(i) }).returning().get();
  db.insert(point).values({ partId: p.id, position: 1 }).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

/** Turn a question with no parts into one with parts A and B (the existing points stay in A). */
export async function splitIntoParts(f: FormData) {
  const questionId = Number(f.get("questionId"));
  const only = db.select().from(part).where(eq(part.questionId, questionId)).get();
  if (only && only.label === "") {
    db.update(part).set({ label: "A" }).where(eq(part.id, only.id)).run();
    const b = db.insert(part).values({ questionId, label: "B" }).returning().get();
    db.insert(point).values({ partId: b.id, position: 1 }).run();
  }
  revalidatePath(`/tests/${f.get("testId")}`);
}

export async function updatePart(f: FormData) {
  const label = str(f, "label").toUpperCase().slice(0, 3);
  if (label) db.update(part).set({ label }).where(eq(part.id, Number(f.get("partId")))).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

/** Delete a part; if only one part is left, it goes back to being a plain question with no parts. */
export async function deletePart(f: FormData) {
  const partId = Number(f.get("partId"));
  const p = db.select().from(part).where(eq(part.id, partId)).get();
  if (p) {
    db.delete(part).where(eq(part.id, partId)).run();
    const left = db.select().from(part).where(eq(part.questionId, p.questionId)).all();
    if (left.length === 1) db.update(part).set({ label: "" }).where(eq(part.id, left[0].id)).run();
  }
  revalidatePath(`/tests/${f.get("testId")}`);
}

/** Add one or more points to a part. A new point copies the topic of the point before it. */
export async function addPoints(f: FormData) {
  const partId = Number(f.get("partId"));
  const existing = db.select().from(point).where(eq(point.partId, partId)).orderBy(point.position).all();
  const count = Math.min(Math.max(1, num(f, "count") ?? 1), MAX_POINTS_PER_PART - existing.length);
  const last = existing.at(-1);
  const topicId = num(f, "topicId") ?? last?.topicId ?? null;
  let pos = last?.position ?? 0;
  for (let i = 0; i < count; i++) db.insert(point).values({ partId, position: ++pos, topicId }).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

/** Save whichever of description / topicId was sent. */
export async function updatePoint(f: FormData) {
  const set: { description?: string; topicId?: number | null } = {};
  if (f.has("description")) set.description = str(f, "description");
  if (f.has("topicId")) set.topicId = num(f, "topicId");
  if (Object.keys(set).length) db.update(point).set(set).where(eq(point.id, Number(f.get("pointId")))).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

/** Copy the reason options from one point to another (handy when points share the same common mistakes). */
export async function copyReasons(f: FormData) {
  const from = Number(f.get("fromPointId"));
  const to = Number(f.get("pointId"));
  const src = db.select().from(reason).where(eq(reason.pointId, from)).orderBy(reason.position).all();
  src.forEach((r, i) => db.insert(reason).values({ pointId: to, position: i + 1, text: r.text }).run());
  revalidatePath(`/tests/${f.get("testId")}`);
}

export async function deletePoint(f: FormData) {
  db.delete(point).where(eq(point.id, Number(f.get("pointId")))).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

export async function addReason(f: FormData) {
  const text = str(f, "text");
  const pointId = Number(f.get("pointId"));
  if (text) {
    const row = db.select({ m: max(reason.position) }).from(reason).where(eq(reason.pointId, pointId)).get();
    db.insert(reason).values({ pointId, position: (row?.m ?? 0) + 1, text }).run();
  }
  revalidatePath(`/tests/${f.get("testId")}`);
}

export async function deleteReason(f: FormData) {
  db.delete(reason).where(eq(reason.id, Number(f.get("reasonId")))).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

/**
 * Import a roster workbook with columns: Last Name, First Name, Class Period (any order).
 * Each distinct class period becomes a section. Students are matched by name: a match is moved to the
 * period in the file, a new name is added, and nobody is ever removed (so saved scan results are safe).
 */
export async function importRoster(f: FormData) {
  const file = f.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()));
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);
  const pick = (r: Record<string, unknown>, re: RegExp) => {
    const k = Object.keys(r).find((key) => re.test(key));
    return k ? String(r[k]).trim() : "";
  };
  const bySection = new Map<string, { first: string; last: string }[]>();
  for (const r of rows) {
    const first = pick(r, /first/i);
    const last = pick(r, /last/i);
    const period = pick(r, /period|section|class/i) || "Unassigned";
    if (!first && !last) continue;
    if (!bySection.has(period)) bySection.set(period, []);
    bySection.get(period)!.push({ first, last });
  }
  const everyone = db.select().from(student).all();
  const sections = db.select().from(section).all();
  let added = 0, moved = 0, same = 0;
  for (const [name, list] of bySection) {
    const s = sections.find((x) => x.name.toLowerCase() === name.toLowerCase()) ?? db.insert(section).values({ name }).returning().get();
    if (!sections.includes(s)) sections.push(s);
    for (const p of list) {
      const match = everyone.find((x) => x.firstName.toLowerCase() === p.first.toLowerCase() && x.lastName.toLowerCase() === p.last.toLowerCase());
      if (!match) {
        const row = db.insert(student).values({ sectionId: s.id, firstName: p.first, lastName: p.last }).returning().get();
        everyone.push(row);
        added++;
      } else if (match.sectionId !== s.id) {
        db.update(student).set({ sectionId: s.id }).where(eq(student.id, match.id)).run();
        match.sectionId = s.id;
        moved++;
      } else same++;
    }
  }
  revalidatePath("/rosters", "layout");
  redirect(`/rosters?added=${added}&moved=${moved}&same=${same}`);
}

export async function updateReason(f: FormData) {
  const text = str(f, "text");
  const id = Number(f.get("reasonId"));
  if (text) db.update(reason).set({ text }).where(eq(reason.id, id)).run();
  revalidatePath(`/tests/${f.get("testId")}`);
}

// ---- Curriculum (units and topics per course) ----

export async function addUnit(f: FormData) {
  const courseId = Number(f.get("courseId"));
  const title = str(f, "title");
  if (!title) return;
  const row = db.select({ m: max(unit.number) }).from(unit).where(eq(unit.courseId, courseId)).get();
  db.insert(unit).values({ courseId, number: num(f, "number") ?? (row?.m ?? 0) + 1, title }).run();
  revalidatePath("/curriculum");
}

export async function updateUnit(f: FormData) {
  const title = str(f, "title");
  if (title) db.update(unit).set({ title }).where(eq(unit.id, Number(f.get("unitId")))).run();
  revalidatePath("/curriculum");
}

export async function deleteUnit(f: FormData) {
  db.delete(unit).where(eq(unit.id, Number(f.get("unitId")))).run();
  revalidatePath("/curriculum");
}

export async function addTopic(f: FormData) {
  const unitId = Number(f.get("unitId"));
  const title = str(f, "title");
  if (!title) return;
  const row = db.select({ m: max(topic.position) }).from(topic).where(eq(topic.unitId, unitId)).get();
  const u = db.select().from(unit).where(eq(unit.id, unitId)).get();
  const position = (row?.m ?? 0) + 1;
  const code = str(f, "code") || (u ? `${u.number}.${position}` : "");
  db.insert(topic).values({ unitId, position, code, title }).run();
  revalidatePath("/curriculum");
}

export async function updateTopic(f: FormData) {
  const id = Number(f.get("topicId"));
  const title = str(f, "title");
  const code = str(f, "code");
  if (title) db.update(topic).set({ title }).where(eq(topic.id, id)).run();
  if (f.has("code") && code) db.update(topic).set({ code }).where(eq(topic.id, id)).run();
  revalidatePath("/curriculum");
}

export async function deleteTopic(f: FormData) {
  db.delete(topic).where(eq(topic.id, Number(f.get("topicId")))).run();
  revalidatePath("/curriculum");
}

// ---- Roster editing ----

export async function addSection(f: FormData) {
  const name = str(f, "name");
  if (name && !db.select().from(section).where(eq(section.name, name)).get()) db.insert(section).values({ name }).run();
  revalidatePath("/rosters", "layout");
}

export async function renameSection(f: FormData) {
  const name = str(f, "name");
  if (name) db.update(section).set({ name }).where(eq(section.id, Number(f.get("sectionId")))).run();
  revalidatePath("/rosters", "layout");
}

export async function deleteSection(f: FormData) {
  db.delete(section).where(eq(section.id, Number(f.get("sectionId")))).run();
  revalidatePath("/rosters", "layout");
  redirect("/rosters");
}

export async function addStudent(f: FormData) {
  const firstName = str(f, "firstName");
  const lastName = str(f, "lastName");
  const sectionId = Number(f.get("sectionId"));
  if ((firstName || lastName) && sectionId) db.insert(student).values({ sectionId, firstName, lastName }).run();
  revalidatePath("/rosters", "layout");
}

export async function updateStudent(f: FormData) {
  const set: { firstName?: string; lastName?: string; sectionId?: number } = {};
  if (f.has("firstName")) set.firstName = str(f, "firstName");
  if (f.has("lastName")) set.lastName = str(f, "lastName");
  if (f.has("sectionId") && Number(f.get("sectionId"))) set.sectionId = Number(f.get("sectionId"));
  if (Object.keys(set).length) db.update(student).set(set).where(eq(student.id, Number(f.get("studentId")))).run();
  revalidatePath("/rosters", "layout");
}

export async function deleteStudent(f: FormData) {
  db.delete(student).where(eq(student.id, Number(f.get("studentId")))).run();
  revalidatePath("/rosters", "layout");
}

/** Set a test's grade curve: type "none", "sqrt", or "add" (with a number of points to add). */
export async function setCurve(f: FormData) {
  const testId = Number(f.get("testId"));
  const type = String(f.get("curveType") ?? "none");
  const value = Math.max(0, Number(f.get("curveValue") ?? 0) || 0);
  const curveType = type === "sqrt" || (type === "add" && value > 0) ? type : "none";
  db.update(test).set({ curveType, curveValue: curveType === "add" ? value : 0 }).where(eq(test.id, testId)).run();
  revalidatePath(`/tests/${testId}`);
  revalidatePath("/classes");
  revalidatePath("/students", "layout");
}

/** Mark a test as a regular self-scored test or a midterm (teacher-graded FRQ sheet + a typed-in MCQ score). */
export async function setTestKind(f: FormData) {
  const testId = Number(f.get("testId"));
  const kind = f.get("kind") === "midterm" ? "midterm" : "standard";
  const mcqTotal = kind === "midterm" ? Math.max(0, Math.min(500, Math.round(Number(f.get("mcqTotal") ?? 0) || 0))) : 0;
  db.update(test).set({ kind, mcqTotal }).where(eq(test.id, testId)).run();
  revalidatePath(`/tests/${testId}`);
  revalidatePath("/midterm");
  revalidatePath("/tests");
}

export async function setMcqTotal(f: FormData) {
  const testId = Number(f.get("testId"));
  const total = Math.max(0, Math.min(500, Math.round(Number(f.get("mcqTotal") ?? 0) || 0)));
  db.update(test).set({ mcqTotal: total }).where(eq(test.id, testId)).run();
  revalidatePath("/midterm");
}

/** Save (or clear, if blank) one student's multiple-choice score on a midterm. */
export async function setMcqScore(f: FormData) {
  const testId = Number(f.get("testId"));
  const studentId = Number(f.get("studentId"));
  const raw = String(f.get("score") ?? "").trim();
  if (raw === "") {
    sqlite.prepare("DELETE FROM midterm_mcq WHERE test_id = ? AND student_id = ?").run(testId, studentId);
  } else {
    const t = db.select().from(test).where(eq(test.id, testId)).get();
    const score = Math.max(0, Math.min(t?.mcqTotal || 500, Number(raw) || 0));
    sqlite
      .prepare("INSERT INTO midterm_mcq (test_id, student_id, score) VALUES (?,?,?) ON CONFLICT(test_id, student_id) DO UPDATE SET score = excluded.score")
      .run(testId, studentId, score);
  }
  revalidatePath("/midterm");
}
