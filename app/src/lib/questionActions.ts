"use server";
import fs from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { listItems, saveItem } from "./store";
import { rootDir } from "./library";
import { emptyQuestion, normalizeQuestion, uid, type Attach, type Question } from "./questions";

/** Set a course / unit / difficulty, or add tags, on several questions at once. */
export async function bulkUpdateQuestions(uids: string[], patch: { course?: string; unit?: string; difficulty?: number; addTags?: string }) {
  const set = new Set(uids);
  for (const it of listItems("question")) {
    if (!set.has(it.uid)) continue;
    const q = normalizeQuestion(it.data as Partial<Question>);
    if (patch.course !== undefined) q.course = patch.course;
    if (patch.unit !== undefined) q.unit = patch.unit;
    if (patch.difficulty) q.difficulty = patch.difficulty;
    if (patch.addTags) q.tags = [...new Set([...q.tags.split(",").map((t) => t.trim()).filter(Boolean), ...patch.addTags.split(",").map((t) => t.trim()).filter(Boolean)])].join(", ");
    saveItem({ uid: it.uid, kind: "question", title: it.title, data: q });
  }
  revalidatePath("/questions");
}

const img = (src: string, pos: Attach["pos"], keyOnly = false): Attach => ({ id: uid(), kind: "image", pos, src, width: 380, caption: "", rows: 0, cols: 0, cells: [], header: false, keyOnly });

/**
 * Brings the questions that ship with the class materials into the bank: the acids and bases quiz (multiple choice,
 * some with pictured answers) and the substitution/elimination problems (free response with diagrams). Safe to run again:
 * a question already imported is skipped.
 */
export async function importClassQuestions() {
  const base = rootDir("class");
  const have = new Set(listItems("question").map((i) => String((i.data as Partial<Question>).source ?? "")));
  let added = 0, skipped = 0;
  const url = (dir: string, rel: string) => `/files/class/organic-chemistry/${dir}/${rel.split("/").map(encodeURIComponent).join("/")}`;

  const abFile = path.join(base, "organic-chemistry/acids-bases/questions.json");
  if (fs.existsSync(abFile)) {
    const rows = JSON.parse(fs.readFileSync(abFile, "utf8")) as { id: string; stem: string; stem_image?: string; options: { type: string; value: string }[]; answer: string; why?: string; topic?: string; level?: string }[];
    for (const r of rows) {
      const source = `Acids & bases quiz ${r.id}`;
      if (have.has(source)) { skipped++; continue; }
      const q = emptyQuestion("mcq", "Organic Chemistry", "Acids and bases");
      q.stem = r.stem; q.source = source; q.topic = r.topic ?? ""; q.tags = [r.level, "imported"].filter(Boolean).join(", ");
      q.difficulty = r.level === "Direct" ? 1 : r.level === "Two-factor" ? 3 : 5;
      q.explanation = r.why ?? "";
      q.choices = r.options.map((o, i) => ({ id: "c" + i, text: o.type === "img" ? "" : o.value, img: o.type === "img" ? url("acids-bases", o.value) : undefined, correct: "ABCDEFGH"[i] === r.answer }));
      q.cols = r.options.some((o) => o.type === "img") ? 2 : 1;
      q.choiceShuffle = r.options.some((o) => /of the above/i.test(o.value)) ? "auto" : "all";
      if (r.stem_image) q.attachments = [img(url("acids-bases", r.stem_image), "above")]; // under the question, above the choices
      saveItem({ kind: "question", title: r.stem.slice(0, 80), data: q });
      added++;
    }
  }
  const sePath = path.join(base, "organic-chemistry/substitution-elimination/problems.json");
  if (fs.existsSync(sePath)) {
    const rows = JSON.parse(fs.readFileSync(sePath, "utf8")) as { id: string; type: string; mechanism: string; difficulty: number; question: string; answer: string; explanation?: string; question_image?: string; answer_image?: string; source?: string }[];
    for (const r of rows) {
      const source = `SN/E problem ${r.id}`;
      if (have.has(source)) { skipped++; continue; }
      const q = emptyQuestion("free", "Organic Chemistry", "Substitution and elimination");
      q.stem = r.question; q.source = source; q.topic = r.type; q.tags = [r.mechanism, "imported"].join(", ");
      q.difficulty = Math.min(5, Math.max(1, r.difficulty + 1)); q.points = 4; q.lines = 6;
      q.answer = r.answer; q.explanation = r.explanation ?? "";
      q.attachments = [...(r.question_image ? [img(url("substitution-elimination", r.question_image), "above")] : []), ...(r.answer_image ? [img(url("substitution-elimination", r.answer_image), "below", true)] : [])];
      saveItem({ kind: "question", title: r.question.slice(0, 80), data: q });
      added++;
    }
  }
  revalidatePath("/questions");
  return { added, skipped };
}
