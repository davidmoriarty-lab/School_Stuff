// The question bank and the test (exam) builder share this model.
//  * A Question is one self-contained item of any type: multiple choice, free response, matching, fill-in-the-blank...
//  * An Exam is an ordered list of questions (each exam keeps its OWN copy, so editing the bank later never changes a test
//    you already gave) plus options for versions A to D.
//  * buildVersion() is the heart of versions: it shuffles question order, answer choices and matching columns with a
//    seeded random generator, so the same exam and version letter always produce exactly the same paper and answer key.
import type { Field } from "./worksheet";

export type QType = "mcq" | "multi" | "tf" | "short" | "free" | "fill" | "matching" | "numeric" | "balance" | "nomen" | "ordering";

export type Choice = { id: string; text: string; correct: boolean; img?: string };
export type Part = { id: string; label: string; stem: string; points: number; answer: string; lines: number };
export type Attach = { id: string; kind: "image" | "table"; pos: "above" | "below"; src: string; width: number; caption: string; rows: number; cols: number; cells: string[][]; header: boolean; keyOnly?: boolean };

export type Question = {
  type: QType;
  stem: string; points: number; auto: boolean;
  course: string; unit: string; topic: string; difficulty: number; source: string; tags: string;
  attachments: Attach[];
  choices: Choice[]; cols: number; choiceShuffle: "auto" | "all" | "none";
  answer: string; explanation: string; lines: number; workSpace: number;
  rubric: { points: string; text: string }[];
  parts: Part[];
  blanks: string[];
  pairs: { a: string; b: string }[];
  eqs: { eq: string; ans: string }[];
  nomen: { formula: string; name: string }[]; nomenMode: "name" | "formula" | "alternate";
  steps: string[];
  unitsLabel: string; sigfigs: string; tolerance: string;
  tfCorrection: boolean;
};

export const uid = () => Math.random().toString(36).slice(2, 9);
export const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type QDef = { label: string; hint: string; points: number; fields: Field[]; seed?: Partial<Question> };
const DETAIL_HINT = "Use ___ (three underscores) for each blank";

export const QTYPES: Record<QType, QDef> = {
  mcq: {
    label: "Multiple choice", hint: "One correct answer", points: 1, seed: { choices: [{ id: "a", text: "", correct: true }, { id: "b", text: "", correct: false }, { id: "c", text: "", correct: false }, { id: "d", text: "", correct: false }] },
    fields: [
      { key: "stem", label: "Question", kind: "textarea", rows: 4 },
      { key: "choices", label: "Choices (tick the correct one)", kind: "choices", multi: false },
      { key: "cols", label: "Choice columns", kind: "select", options: [["1", "1 (stacked)"], ["2", "2"], ["4", "4 (across)"]] },
      { key: "choiceShuffle", label: "Shuffling in other versions", kind: "select", options: [["auto", "Shuffle, but keep 'All of the above' last"], ["all", "Shuffle every choice"], ["none", "Keep this order"]] },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Explanation (answer key only)", kind: "textarea", rows: 2 },
    ],
  },
  multi: {
    label: "Select all that apply", hint: "Several correct answers", points: 2, seed: { choices: [{ id: "a", text: "", correct: true }, { id: "b", text: "", correct: true }, { id: "c", text: "", correct: false }, { id: "d", text: "", correct: false }] },
    fields: [
      { key: "stem", label: "Question", kind: "textarea", rows: 4 },
      { key: "choices", label: "Choices (tick every correct one)", kind: "choices", multi: true },
      { key: "cols", label: "Choice columns", kind: "select", options: [["1", "1 (stacked)"], ["2", "2"], ["4", "4 (across)"]] },
      { key: "choiceShuffle", label: "Shuffling in other versions", kind: "select", options: [["auto", "Shuffle, but keep 'All of the above' last"], ["all", "Shuffle every choice"], ["none", "Keep this order"]] },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Explanation (answer key only)", kind: "textarea", rows: 2 },
    ],
  },
  tf: {
    label: "True / False", hint: "With an optional correction line", points: 1, seed: { answer: "True" },
    fields: [
      { key: "stem", label: "Statement", kind: "textarea", rows: 3 },
      { key: "answer", label: "Correct answer", kind: "select", options: [["True", "True"], ["False", "False"]] },
      { key: "tfCorrection", label: "If false, students rewrite it correctly", kind: "bool" },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Explanation (answer key only)", kind: "textarea", rows: 2 },
    ],
  },
  short: {
    label: "Short answer", hint: "A word, number or sentence", points: 2, seed: { lines: 2 },
    fields: [
      { key: "stem", label: "Question", kind: "textarea", rows: 4 },
      { key: "answer", label: "Correct answer (key)", kind: "textarea", rows: 2 },
      { key: "lines", label: "Answer lines", kind: "number", min: 0, max: 20 },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Explanation (answer key only)", kind: "textarea", rows: 2 },
    ],
  },
  free: {
    label: "Free response", hint: "Multi-part, with a scoring rubric", points: 5, seed: { lines: 6 },
    fields: [
      { key: "stem", label: "Question / setup", kind: "textarea", rows: 5 },
      { key: "parts", label: "Parts (a), (b), (c)... leave empty for a single response", kind: "parts" },
      { key: "lines", label: "Answer lines (when there are no parts)", kind: "number", min: 0, max: 40 },
      { key: "workSpace", label: "Blank work space instead of lines (px, 0 = none)", kind: "number", min: 0, max: 900 },
      { key: "points", label: "Points (when there are no parts)", kind: "number", min: 0, max: 100 },
      { key: "rubric", label: "Scoring rubric (key only)", kind: "pairs", cols: [{ key: "points", label: "Points" }, { key: "text", label: "What earns them" }], add: "Add rubric line" },
      { key: "answer", label: "Sample answer (key)", kind: "textarea", rows: 3 },
      { key: "explanation", label: "Notes for grading (key only)", kind: "textarea", rows: 2 },
    ],
  },
  fill: {
    label: "Fill in the blank", hint: "Blanks inside a sentence", points: 1, seed: {},
    fields: [
      { key: "stem", label: "Sentence", kind: "textarea", rows: 4, hint: DETAIL_HINT },
      { key: "blanks", label: "Answers, one per blank in order", kind: "lines", rows: 4 },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Explanation (answer key only)", kind: "textarea", rows: 2 },
    ],
  },
  matching: {
    label: "Matching", hint: "Terms to descriptions, shuffled for you", points: 4, seed: { pairs: [{ a: "", b: "" }, { a: "", b: "" }, { a: "", b: "" }] },
    fields: [
      { key: "stem", label: "Directions", kind: "textarea", rows: 2 },
      { key: "pairs", label: "Correct pairs (left term, matching right description)", kind: "pairs", cols: [{ key: "a", label: "Left (numbered)" }, { key: "b", label: "Right (lettered, shuffled)" }], add: "Add pair" },
      { key: "points", label: "Points (total)", kind: "number", min: 0, max: 100 },
    ],
  },
  numeric: {
    label: "Calculation", hint: "Numeric answer with units and work", points: 3, seed: { workSpace: 160 },
    fields: [
      { key: "stem", label: "Problem", kind: "textarea", rows: 4 },
      { key: "answer", label: "Correct answer (number)", kind: "text" },
      { key: "unitsLabel", label: "Units", kind: "text" },
      { key: "sigfigs", label: "Significant figures (optional)", kind: "text" },
      { key: "tolerance", label: "Accept within (optional, for example ±2%)", kind: "text" },
      { key: "workSpace", label: "Work space height (px)", kind: "number", min: 0, max: 900 },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
      { key: "explanation", label: "Worked solution (answer key only)", kind: "textarea", rows: 4 },
    ],
  },
  balance: {
    label: "Balance equations", hint: "Coefficient boxes", points: 3, seed: { eqs: [{ eq: "H2 + O2 -> H2O", ans: "2,1,2" }] },
    fields: [
      { key: "stem", label: "Directions", kind: "textarea", rows: 2 },
      { key: "eqs", label: "Equations", kind: "pairs", cols: [{ key: "eq", label: "Unbalanced equation" }, { key: "ans", label: "Coefficients, like 2,1,2" }], add: "Add equation" },
      { key: "points", label: "Points (total)", kind: "number", min: 0, max: 100 },
    ],
  },
  nomen: {
    label: "Names & formulas", hint: "Name to formula or formula to name", points: 4, seed: { nomen: [{ formula: "NaCl", name: "sodium chloride" }, { formula: "CaCO3", name: "calcium carbonate" }] },
    fields: [
      { key: "stem", label: "Directions", kind: "textarea", rows: 2 },
      { key: "nomenMode", label: "Blank out", kind: "select", options: [["name", "The name"], ["formula", "The formula"], ["alternate", "Alternate rows"]] },
      { key: "nomen", label: "Compounds", kind: "pairs", cols: [{ key: "formula", label: "Formula" }, { key: "name", label: "Name" }], add: "Add compound" },
      { key: "points", label: "Points (total)", kind: "number", min: 0, max: 100 },
    ],
  },
  ordering: {
    label: "Put in order", hint: "Steps or events, shuffled for you", points: 3, seed: { steps: ["", "", ""] },
    fields: [
      { key: "stem", label: "Directions", kind: "textarea", rows: 2 },
      { key: "steps", label: "Items in the CORRECT order (one per line)", kind: "lines", rows: 6 },
      { key: "points", label: "Points", kind: "number", min: 0, max: 100 },
    ],
  },
};
export const QTYPE_ORDER = Object.keys(QTYPES) as QType[];

export function emptyQuestion(type: QType, course = "", unit = ""): Question {
  const d = QTYPES[type];
  return {
    type, stem: "", points: d.points, auto: true, course, unit, topic: "", difficulty: 2, source: "", tags: "",
    attachments: [], choices: [], cols: 1, choiceShuffle: "auto", answer: "", explanation: "", lines: 0, workSpace: 0,
    rubric: [], parts: [], blanks: [], pairs: [], eqs: [], nomen: [], nomenMode: "name", steps: [], unitsLabel: "", sigfigs: "", tolerance: "", tfCorrection: false,
    ...(JSON.parse(JSON.stringify(d.seed ?? {})) as Partial<Question>),
  };
}

/** Old or partial data (for example from a shared package) is filled in so the rest of the app can rely on every field. */
export function normalizeQuestion(q: Partial<Question>): Question {
  const base = emptyQuestion((q.type ?? "short") as QType);
  return { ...base, ...q, attachments: q.attachments ?? [], choices: q.choices ?? base.choices, parts: q.parts ?? [], rubric: q.rubric ?? [] } as Question;
}

export function questionPoints(q: Question): number {
  if (q.type === "free" && q.parts.length) return q.parts.reduce((n, p) => n + (Number(p.points) || 0), 0);
  return Number(q.points) || 0;
}

export function questionSummary(q: Question, n = 110): string {
  const s = (q.stem || q.parts[0]?.stem || q.pairs[0]?.a || q.eqs[0]?.eq || q.nomen[0]?.formula || "(empty question)").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ---- seeded shuffling -----------------------------------------------------------------------------------------------
function hash(s: string) { let h = 1779033703 ^ s.length; for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
export function rngFrom(seed: string) {
  const next = hash(seed); let a = next();
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// ---- exams ------------------------------------------------------------------------------------------------------------
export type ExamItem = {
  id: string; kind: "question" | "section" | "pagebreak";
  q?: Question; qid?: string; points?: number; locked?: boolean;
  title?: string; text?: string; shuffle?: boolean;
};
export type ExamOptions = {
  versions: number; shuffleQuestions: boolean; shuffleChoices: boolean; shuffleFirst: boolean;
  showPoints: boolean; showHeader: boolean; paper: "letter" | "a4"; font: "sans" | "serif"; fontSize: number;
  gap: number; numbering: "plain" | "q"; seed: string;
};
export type Exam = { course: string; unit: string; date: string; instructions: string; options: ExamOptions; items: ExamItem[] };

export const DEFAULT_OPTIONS: ExamOptions = {
  versions: 2, shuffleQuestions: true, shuffleChoices: true, shuffleFirst: false, showPoints: true, showHeader: true,
  paper: "letter", font: "sans", fontSize: 13, gap: 18, numbering: "plain", seed: "",
};
export const emptyExam = (course = "", unit = ""): Exam => ({ course, unit, date: "", instructions: "", options: { ...DEFAULT_OPTIONS, seed: uid() }, items: [] });
export const normalizeExam = (e: Partial<Exam>): Exam => ({ ...emptyExam(), ...e, options: { ...DEFAULT_OPTIONS, ...(e.options ?? {}) }, items: e.items ?? [] });

export type Order = { choices?: string[]; right?: number[]; steps?: number[] };
export type Rendered = { item: ExamItem; number?: number; q?: Question; points: number; order: Order; key?: string };

const AUTO_LAST = /\b(all|none|both|neither)\s+of\s+(the\s+)?(above|these|those)\b|\ball\s+of\s+the\s+above\b|\bnone\s+of\s+the\s+above\b|\b[a-d]\s+and\s+[a-d]\b|\bboth\s+[a-d]\s+and\s+[a-d]\b/i;

function orderChoices(q: Question, rnd: () => number, shuffle: boolean): string[] {
  const ids = q.choices.map((c) => c.id);
  if (!shuffle || q.choiceShuffle === "none") return ids;
  if (q.choiceShuffle === "all") return shuffled(ids, rnd);
  const fixedTail = q.choices.filter((c) => AUTO_LAST.test(c.text));
  const free = q.choices.filter((c) => !fixedTail.includes(c));
  return [...shuffled(free.map((c) => c.id), rnd), ...fixedTail.map((c) => c.id)];
}

/** Letter(s) a reader would see as the answer, given the order of the choices in this version. */
export function answerText(q: Question, o: Order): string {
  switch (q.type) {
    case "mcq": case "multi": {
      const order = o.choices ?? q.choices.map((c) => c.id);
      return order.map((id, i) => (q.choices.find((c) => c.id === id)?.correct ? LETTERS[i] : "")).filter(Boolean).join(", ");
    }
    case "tf": return q.answer === "False" ? "False" : "True";
    case "matching": {
      const right = o.right ?? q.pairs.map((_, i) => i);
      return q.pairs.map((_, i) => `${i + 1}${LETTERS[right.indexOf(i)]}`).join(" ");
    }
    case "ordering": {
      // The paper lists the items in shuffled order; beside each one the student writes its true step number.
      const steps = o.steps ?? q.steps.map((_, i) => i);
      return steps.map((i) => i + 1).join(", ");
    }
    case "fill": return q.blanks.join("; ");
    case "numeric": return [q.answer, q.unitsLabel].filter(Boolean).join(" ");
    case "balance": return q.eqs.map((e) => e.ans).join(" | ");
    case "nomen": return `${q.nomen.length} items`;
    default: return q.answer ? q.answer.split("\n")[0].slice(0, 40) : "see key";
  }
}

/**
 * The exam as one version sees it: shuffled order, numbering, points and each question's choice/column order.
 * Version 0 ("A") keeps the order you built, unless you turn on "shuffle version A too".
 */
export function buildVersion(exam: Exam, version: number): Rendered[] {
  const o = exam.options;
  const shuffle = version > 0 || o.shuffleFirst;
  const rnd = rngFrom(`${o.seed}:${version}`);
  // Questions move only within their section: headings and page breaks stay put. Pinned questions stay put too.
  const items = [...exam.items];
  if (shuffle && o.shuffleQuestions) {
    let start = 0;
    const flush = (end: number) => {
      const idx: number[] = [];
      for (let i = start; i < end; i++) if (items[i].kind === "question" && !items[i].locked) idx.push(i);
      const sec = start > 0 ? items[start - 1] : undefined;
      if (sec?.kind === "section" && sec.shuffle === false) return;
      const moved = shuffled(idx.map((i) => items[i]), rnd);
      idx.forEach((i, k) => { items[i] = moved[k]; });
    };
    for (let i = 0; i < items.length; i++) if (items[i].kind !== "question") { flush(i); start = i + 1; }
    flush(items.length);
  }
  let n = 0;
  return items.map((item): Rendered => {
    if (item.kind !== "question" || !item.q) return { item, points: 0, order: {} };
    const q = normalizeQuestion(item.q);
    const order: Order = {};
    if (q.type === "mcq" || q.type === "multi") order.choices = orderChoices(q, rnd, shuffle && o.shuffleChoices);
    if (q.type === "matching") order.right = shuffle && o.shuffleChoices ? shuffled(q.pairs.map((_, i) => i), rnd) : q.pairs.map((_, i) => i);
    if (q.type === "ordering") {
      let s = q.steps.map((_, i) => i);
      if (s.length > 1) { for (let t = 0; t < 6; t++) { s = shuffled(s, rnd); if (s.some((v, i) => v !== i)) break; } }
      order.steps = s;
    }
    n += 1;
    return { item, number: n, q, points: item.points ?? questionPoints(q), order, key: answerText(q, order) };
  });
}

export const VERSION_LETTERS = "ABCD";
export const totalPoints = (exam: Exam) => exam.items.reduce((s, i) => s + (i.kind === "question" && i.q ? i.points ?? questionPoints(normalizeQuestion(i.q)) : 0), 0);
