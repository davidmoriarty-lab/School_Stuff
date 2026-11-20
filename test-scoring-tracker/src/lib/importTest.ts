import * as XLSX from "xlsx";
import { sqlite } from "./db";
import { MAX_POINTS_PER_PART } from "./limits";

// The standard "test import" workbook. A person (usually Claude, working from a test PDF) fills in the
// Questions sheet with ONE ROW PER POINT; this module reads it, checks it, and creates the test.

export const SHEET = {
  instructions: "Instructions", info: "Test Info", questions: "Questions", reasons: "Reasons",
  example: "Example", exampleReasons: "Example Reasons", topics: "Topic Reference",
};
export const REASON_HEADERS = ["Question", "Part", "Point", "Reason"];
export const MAX_REASONS = 8;
export const REASON_COLUMNS = 6;
export const QUESTION_HEADERS = ["Question", "Part", "Point", "Description", "Topic", ...Array.from({ length: REASON_COLUMNS }, (_, i) => `Reason ${i + 1}`)];

export type ParsedPoint = { description: string; topicCode: string; topicId: number | null; reasons: string[] };
export type ParsedPart = { label: string; points: ParsedPoint[] };
export type ParsedQuestion = { number: number; parts: ParsedPart[] };
export type ParsedTest = { courseId: number; courseName: string; testName: string; questions: ParsedQuestion[] };
export type ParseResult = {
  errors: string[];
  warnings: string[];
  test: ParsedTest | null;
  stats: { questions: number; points: number; topicsMatched: number; topicsTagged: number };
};

const text = (v: unknown) => (v == null ? "" : String(v).trim());
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function sheetByName(wb: XLSX.WorkBook, name: string) {
  const key = wb.SheetNames.find((n) => norm(n) === norm(name));
  return key ? wb.Sheets[key] : null;
}

export function parseTestWorkbook(buffer: Buffer | ArrayBuffer): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty = (): ParseResult => ({ errors, warnings, test: null, stats: { questions: 0, points: 0, topicsMatched: 0, topicsTagged: 0 } });

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    errors.push("This file couldn't be read as an Excel workbook (.xlsx).");
    return empty();
  }

  // ---- Test Info ----
  const infoSheet = sheetByName(wb, SHEET.info);
  if (!infoSheet) {
    errors.push(`The workbook has no "${SHEET.info}" sheet.`);
    return empty();
  }
  const infoRows = XLSX.utils.sheet_to_json<unknown[]>(infoSheet, { header: 1, defval: "" });
  const infoVal = (re: RegExp) => text(infoRows.find((r) => re.test(norm(text(r[0]))))?.[1]);
  const courseName = infoVal(/^course/);
  const testName = infoVal(/^test(name)?$/) || infoVal(/testname|^name$/);
  if (!courseName) errors.push(`"${SHEET.info}" needs a Course (for example "AP Chemistry").`);
  if (!testName) errors.push(`"${SHEET.info}" needs a Test Name (for example "Unit 4 Test").`);

  const course = courseName
    ? (sqlite.prepare("SELECT id, name FROM course WHERE lower(name) = lower(?)").get(courseName) as { id: number; name: string } | undefined)
    : undefined;
  if (courseName && !course) {
    const all = (sqlite.prepare("SELECT name FROM course ORDER BY name").all() as { name: string }[]).map((c) => c.name).join(", ");
    errors.push(`There is no course named "${courseName}" in the app. Existing courses: ${all || "(none)"}.`);
  }

  // ---- Questions ----
  const qSheet = sheetByName(wb, SHEET.questions);
  if (!qSheet) {
    errors.push(`The workbook has no "${SHEET.questions}" sheet.`);
    return empty();
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(qSheet, { defval: "", raw: true });
  const keys = rows.length ? Object.keys(rows[0]) : (XLSX.utils.sheet_to_json<unknown[]>(qSheet, { header: 1 })[0] as unknown[] | undefined)?.map(text) ?? [];
  const findKey = (re: RegExp) => keys.find((k) => re.test(norm(k)));
  const kQuestion = findKey(/^question(number|no)?$/);
  const kPart = findKey(/^part$/);
  const kPoint = findKey(/^point(s|number|no)?$/);
  const kDesc = findKey(/^description$|^note$/);
  const kTopic = findKey(/^topic(code)?$/);
  const kReasons = keys.filter((k) => /^reasons?\d*$/.test(norm(k)));
  if (!kQuestion) {
    errors.push(`The "${SHEET.questions}" sheet needs a "Question" column in its header row.`);
    return empty();
  }

  const topicByCode = new Map<string, number>();
  if (course) {
    const ts = sqlite
      .prepare("SELECT t.id, t.code FROM topic t JOIN unit u ON u.id = t.unit_id WHERE u.course_id = ?")
      .all(course.id) as { id: number; code: string }[];
    for (const t of ts) topicByCode.set(t.code.trim(), t.id);
  }
  const hasCurriculum = topicByCode.size > 0;

  type Row = { rowNo: number; q: number; part: string; order: number | null; p: ParsedPoint };
  const parsed: Row[] = [];
  let lastQ: number | null = null;
  const unknownTopics = new Set<string>();
  const dropped = { other: 0, extra: 0, dup: 0 };
  const pushReason = (list: string[], raw: string) => {
    const t = raw.replace(/\s+/g, " ").trim();
    if (!t) return;
    if (/^other\.?$/i.test(t)) { dropped.other++; return; }
    if (list.some((x) => x.toLowerCase() === t.toLowerCase())) { dropped.dup++; return; }
    if (list.length >= MAX_REASONS) { dropped.extra++; return; }
    list.push(t);
  };

  rows.forEach((r, i) => {
    const rowNo = i + 2; // header is row 1
    const cells = Object.values(r).map(text);
    if (cells.every((c) => c === "")) return;

    const qCell = text(r[kQuestion]);
    if (qCell) {
      const m = /^\s*(?:q(?:uestion)?\s*)?(\d+)\s*$/i.exec(qCell);
      if (!m) { errors.push(`Row ${rowNo}: "${qCell}" isn't a question number (use 1, 2, 3...).`); return; }
      lastQ = Number(m[1]);
    }
    if (lastQ == null) { errors.push(`Row ${rowNo}: no question number.`); return; }

    const part = kPart ? text(r[kPart]).replace(/^part\s*/i, "").replace(/[.)]+$/, "").toUpperCase() : "";
    if (part.length > 3) { errors.push(`Row ${rowNo}: part "${part}" should be a letter like A, B or C.`); return; }

    const rawTopic = kTopic ? r[kTopic] : "";
    let topicCode = text(rawTopic);
    let topicId: number | null = null;
    if (topicCode) {
      topicId = topicByCode.get(topicCode) ?? null;
      // Excel turns a typed "4.10" into the number 4.1; try the likely intended code.
      if (topicId == null && typeof rawTopic === "number" && topicByCode.has(`${topicCode}0`)) {
        topicCode = `${topicCode}0`;
        topicId = topicByCode.get(topicCode) ?? null;
        warnings.push(`Row ${rowNo}: the topic was stored as a number (${rawTopic}); treated as ${topicCode}. Format the Topic column as Text to avoid this.`);
      }
      if (topicId == null && hasCurriculum) unknownTopics.add(topicCode);
    }

    const reasons: string[] = [];
    for (const k of kReasons) pushReason(reasons, text(r[k]));

    const order = kPoint && /^\d+$/.test(text(r[kPoint])) ? Number(text(r[kPoint])) : null;
    parsed.push({ rowNo, q: lastQ, part, order, p: { description: kDesc ? text(r[kDesc]) : "", topicCode, topicId, reasons } });
  });

  if (!parsed.length && !errors.length) errors.push(`The "${SHEET.questions}" sheet has no rows. Add one row per point.`);
  if (unknownTopics.size) {
    warnings.push(`These topic codes aren't in ${course?.name ?? "the course"}'s curriculum, so those points will have no topic: ${[...unknownTopics].join(", ")}.`);
  }

  // ---- group: question -> part -> points ----
  const qMap = new Map<number, Map<string, Row[]>>();
  for (const r of parsed) {
    if (!qMap.has(r.q)) qMap.set(r.q, new Map());
    const pm = qMap.get(r.q)!;
    if (!pm.has(r.part)) pm.set(r.part, []);
    pm.get(r.part)!.push(r);
  }
  const questions: ParsedQuestion[] = [];
  for (const [number, pm] of [...qMap].sort((a, b) => a[0] - b[0])) {
    if (pm.size > 1 && pm.has("")) {
      errors.push(`Question ${number} has some rows with a Part letter and some without. Give every row a Part, or none.`);
      continue;
    }
    const parts: ParsedPart[] = [];
    for (const [label, rs] of [...pm].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (rs.length > MAX_POINTS_PER_PART) {
        errors.push(`Question ${number}${label ? ` part ${label}` : ""} has ${rs.length} points. A part is worth at most ${MAX_POINTS_PER_PART}. Split it into parts.`);
      }
      const ordered = rs.every((r) => r.order != null) ? [...rs].sort((a, b) => a.order! - b.order!) : rs;
      parts.push({ label, points: ordered.map((r) => r.p) });
    }
    questions.push({ number, parts });
  }
  const nums = questions.map((q) => q.number);
  if (nums.length && (nums[0] !== 1 || nums.some((n, i) => i > 0 && n !== nums[i - 1] + 1))) {
    warnings.push(`Question numbers are ${nums.join(", ")}: they don't run 1, 2, 3... without gaps. They will be imported as written.`);
  }

  // ---- optional "Reasons" sheet: one reason per row, for a point, a whole part, or a whole question ----
  const rSheet = sheetByName(wb, SHEET.reasons);
  if (rSheet) {
    const rRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(rSheet, { defval: "", raw: true });
    const rKeys = rRows.length ? Object.keys(rRows[0]) : [];
    const rq = rKeys.find((k) => /^question(number|no)?$/.test(norm(k)));
    const rp = rKeys.find((k) => /^part$/.test(norm(k)));
    const rpt = rKeys.find((k) => /^point(number|no)?$/.test(norm(k)));
    const rr = rKeys.find((k) => /^reasons?$|^missedreason$/.test(norm(k)));
    if (rRows.length && (!rq || !rr)) {
      errors.push(`The "${SHEET.reasons}" sheet needs "Question" and "Reason" columns in its header row.`);
    } else {
      let lastRq: number | null = null;
      rRows.forEach((r, i) => {
        const rowNo = i + 2;
        const reason = text(r[rr!]);
        if (!reason) return;
        const qCell = text(r[rq!]);
        if (qCell) {
          const m = /^\s*(?:q(?:uestion)?\s*)?(\d+)\s*$/i.exec(qCell);
          if (!m) { warnings.push(`Reasons row ${rowNo}: "${qCell}" isn't a question number; skipped.`); return; }
          lastRq = Number(m[1]);
        }
        const q = questions.find((x) => x.number === lastRq);
        if (!q) { warnings.push(`Reasons row ${rowNo}: Question ${lastRq ?? "?"} isn't on the "${SHEET.questions}" sheet; skipped.`); return; }
        const partLabel = rp ? text(r[rp]).replace(/^part\s*/i, "").replace(/[.)]+$/, "").toUpperCase() : "";
        const parts = partLabel ? q.parts.filter((p) => p.label === partLabel) : q.parts;
        if (!parts.length) { warnings.push(`Reasons row ${rowNo}: Question ${q.number} has no part ${partLabel}; skipped.`); return; }
        const ptCell = rpt ? text(r[rpt]) : "";
        const targets = parts.flatMap((p) => (/^\d+$/.test(ptCell) ? p.points.slice(Number(ptCell) - 1, Number(ptCell)) : p.points));
        if (!targets.length) { warnings.push(`Reasons row ${rowNo}: no matching point; skipped.`); return; }
        for (const pt of targets) pushReason(pt.reasons, reason);
      });
    }
  }
  if (dropped.other) warnings.push(`Removed ${dropped.other} "Other" reason(s): "Other" is added to every point automatically.`);
  if (dropped.dup) warnings.push(`Removed ${dropped.dup} duplicate reason(s).`);
  if (dropped.extra) warnings.push(`Dropped ${dropped.extra} reason(s) beyond the limit of ${MAX_REASONS} per point.`);

  const allPoints = questions.flatMap((q) => q.parts.flatMap((p) => p.points));
  const stats = {
    questions: questions.length,
    points: allPoints.length,
    topicsTagged: allPoints.filter((p) => p.topicCode).length,
    topicsMatched: allPoints.filter((p) => p.topicId != null).length,
  };
  if (allPoints.length && !hasCurriculum && course) {
    warnings.push(`${course.name} has no units/topics yet, so no points can be tagged. Build its curriculum first if you want topic tags.`);
  }
  if (allPoints.length && allPoints.every((p) => p.reasons.length === 0)) {
    warnings.push("No point has any reasons, so students will only see \"Other\" under Missed it.");
  }
  if (course && testName) {
    const clash = sqlite.prepare("SELECT 1 FROM test WHERE course_id = ? AND lower(name) = lower(?)").get(course.id, testName);
    if (clash) warnings.push(`A test named "${testName}" already exists in ${course.name}. This one will be created as "${uniqueName(course.id, testName)}".`);
  }

  if (errors.length || !course) return { errors, warnings, test: null, stats };
  return { errors, warnings, test: { courseId: course.id, courseName: course.name, testName, questions }, stats };
}

function uniqueName(courseId: number, name: string) {
  let candidate = name, n = 2;
  while (sqlite.prepare("SELECT 1 FROM test WHERE course_id = ? AND lower(name) = lower(?)").get(courseId, candidate)) candidate = `${name} (${n++})`;
  return candidate;
}

/** Create the test from a parsed (and error-free) workbook. Returns the new test's id. */
export function commitParsedTest(t: ParsedTest): number {
  const insTest = sqlite.prepare("INSERT INTO test (course_id, name) VALUES (?, ?)");
  const insQ = sqlite.prepare("INSERT INTO question (test_id, number) VALUES (?, ?)");
  const insPart = sqlite.prepare("INSERT INTO part (question_id, label) VALUES (?, ?)");
  const insPoint = sqlite.prepare("INSERT INTO point (part_id, position, description, topic_id) VALUES (?, ?, ?, ?)");
  const insReason = sqlite.prepare("INSERT INTO reason (point_id, position, text) VALUES (?, ?, ?)");
  return sqlite.transaction(() => {
    const testId = Number(insTest.run(t.courseId, uniqueName(t.courseId, t.testName)).lastInsertRowid);
    for (const q of t.questions) {
      const qid = Number(insQ.run(testId, q.number).lastInsertRowid);
      for (const p of q.parts) {
        const pid = Number(insPart.run(qid, p.label).lastInsertRowid);
        p.points.forEach((pt, i) => {
          const ptid = Number(insPoint.run(pid, i + 1, pt.description, pt.topicId).lastInsertRowid);
          pt.reasons.forEach((r, k) => insReason.run(ptid, k + 1, r));
        });
      }
    }
    return testId;
  })();
}

// ---------------------------------------------------------------------------------------------
// The downloadable template
// ---------------------------------------------------------------------------------------------

const INSTRUCTIONS = [
  "TEST IMPORT TEMPLATE",
  "",
  "This workbook turns a test into a scoring-sheet template in the Test Scoring Tracker app. Fill in the \"Questions\" sheet (and the \"Test Info\" sheet), save as .xlsx, and upload it in the app under Tests & templates > Import a test.",
  "",
  "HOW TO FILL IT IN",
  "1. Test Info: type the Test Name. The Course is already filled in; do not change it.",
  "2. Questions: add ONE ROW PER POINT. A point is one thing a student can earn credit for. Each point becomes one row on the printed scoring sheet.",
  "3. Do not rename the sheets, reorder the columns, or change the header row.",
  "",
  "COLUMNS (Questions sheet)",
  "Question     Required. The question number: 1, 2, 3... Repeat it on every row of that question.",
  "Part         Only if the question has lettered parts (A, B, C). Leave blank on every row if it has no parts. Do not mix: a question either has Part letters on all its rows or on none.",
  "Point        Optional. 1, 2, 3 within the part (or question). Rows are numbered in order if left blank.",
  "Description  Optional. A short note shown on the sheet saying what earns the point (about 40 characters or fewer).",
  "Topic        Optional. The topic code from the \"Topic Reference\" sheet, for example 4.2. Format this column as Text. Use a code only if it appears in the reference sheet.",
  "Reason 1-6   Optional. The COMMON WRONG ANSWERS for that point (see also the Reasons sheet below). Optional but important. The COMMON WRONG ANSWERS for that point: short phrases a student could pick to say why they lost the point (about 50 characters or fewer), for example \"Got the charges wrong\". 2 to 5 per point is ideal. Do NOT add an \"Other\" reason: the app adds it automatically.",
  "",
  "REASONS SHEET (optional): another way to supply the missed-question reasons",
  "Question     The question number.",
  "Part         Leave blank to apply the reason to every part of the question.",
  "Point        Leave blank to apply the reason to every point in that part (or question). Or give a point number (1, 2, 3) for just one point.",
  "Reason       ONE reason per row: a short phrase for why a student lost the point, for example \"Forgot to convert units\". Use this when several points share a mistake, or to list many reasons quickly. Reasons here are added to any in the Reason 1-6 columns. Each point keeps at most 8 reasons.",
  "",
  "RULES",
  `- A part (or a question with no parts) can have at most ${MAX_POINTS_PER_PART} points. If a question is worth more, split it into parts (A, B, C).`,
  "- Every point needs its own row, even if two points share the same reasons: repeat the reasons.",
  "- See the \"Example\" sheet for a filled-in sample. Delete nothing from it; it is ignored on import.",
  "",
  "TIPS FOR CLAUDE",
  "- Read the test PDF, then break each question into the points the answer key awards.",
  "- Choose each point's Topic from the Topic Reference sheet by what skill the point tests.",
  "- Write the Reason columns as realistic student mistakes for that specific point, not generic ones.",
];

export function buildTestTemplate(courseId: number | null): Buffer {
  const course = courseId ? (sqlite.prepare("SELECT id, name FROM course WHERE id = ?").get(courseId) as { id: number; name: string } | undefined) : undefined;
  const wb = XLSX.utils.book_new();

  const ins = XLSX.utils.aoa_to_sheet(INSTRUCTIONS.map((l) => [l]));
  ins["!cols"] = [{ wch: 130 }];
  XLSX.utils.book_append_sheet(wb, ins, SHEET.instructions);

  const info = XLSX.utils.aoa_to_sheet([["Course", course?.name ?? ""], ["Test Name", ""]]);
  info["!cols"] = [{ wch: 14 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, info, SHEET.info);

  const questions = XLSX.utils.aoa_to_sheet([QUESTION_HEADERS]);
  questions["!cols"] = [{ wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 34 }, { wch: 8 }, ...Array.from({ length: REASON_COLUMNS }, () => ({ wch: 30 }))];
  XLSX.utils.book_append_sheet(wb, questions, SHEET.questions);

  const reasonsSheet = XLSX.utils.aoa_to_sheet([REASON_HEADERS]);
  reasonsSheet["!cols"] = [{ wch: 10 }, { wch: 7 }, { wch: 7 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, reasonsSheet, SHEET.reasons);

  // Topic reference + example (uses real codes from the course when it has a curriculum)
  const topics = course
    ? (sqlite
        .prepare("SELECT u.number unit, u.title unitTitle, t.code, t.title FROM topic t JOIN unit u ON u.id = t.unit_id WHERE u.course_id = ? ORDER BY u.number, t.position")
        .all(course.id) as { unit: number; unitTitle: string; code: string; title: string }[])
    : [];
  const c = (i: number) => topics[i % Math.max(1, topics.length)]?.code ?? "";
  const ex: (string | number)[][] = [
    QUESTION_HEADERS,
    [1, "A", 1, "Writes the net ionic equation", c(1), "Got the charges wrong", "Split apart a compound that doesn't ionize", "Left a spectator ion in", "", "", ""],
    [1, "A", 2, "Balances the equation", c(1), "Did not balance charge", "Did not balance atoms", "", "", "", ""],
    [1, "B", 1, "Identifies the precipitate", c(2), "Wrong solubility rule", "Named a soluble compound", "", "", "", ""],
    [1, "C", 1, "Explains the observation", c(2), "Said it was a physical change", "No particle-level explanation", "", "", "", ""],
    [2, "", 1, "Calculates moles of solute", c(0), "Used the wrong molar mass", "Arithmetic error", "Forgot to convert units", "", "", ""],
    [2, "", 2, "Reports answer with units", c(0), "Left off units", "Wrong significant figures", "", "", "", ""],
  ];
  const example = XLSX.utils.aoa_to_sheet(ex);
  example["!cols"] = questions["!cols"];
  XLSX.utils.book_append_sheet(wb, example, SHEET.example);

  const exReasons = XLSX.utils.aoa_to_sheet([
    REASON_HEADERS,
    [1, "", "", "Arithmetic or rounding error"],
    [1, "A", "", "Did not show the setup"],
    [1, "B", 1, "Mixed up reactants and products"],
    [2, "", 2, "Reported the wrong number of significant figures"],
  ]);
  exReasons["!cols"] = reasonsSheet["!cols"];
  XLSX.utils.book_append_sheet(wb, exReasons, SHEET.exampleReasons);

  const ref = XLSX.utils.aoa_to_sheet(
    topics.length
      ? [["Unit", "Unit Title", "Code", "Topic Title"], ...topics.map((t) => [t.unit, t.unitTitle, t.code, t.title])]
      : [["This course has no units or topics yet. Leave the Topic column blank, or build the curriculum in the app first."]],
  );
  ref["!cols"] = [{ wch: 6 }, { wch: 50 }, { wch: 8 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, ref, SHEET.topics);

  // Make sure topic codes in the Example sheet are stored as text.
  for (let r = 1; r < ex.length; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 4 });
    if (example[addr]) example[addr] = { t: "s", v: String(ex[r][4]) };
  }

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export function buildRosterTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([["Last Name", "First Name", "Class Period"]]);
  ws["!cols"] = [{ wch: 22 }, { wch: 22 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, "Roster");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
