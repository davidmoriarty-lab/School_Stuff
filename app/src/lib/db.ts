import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";
import { AP_CHEM_CED } from "./apChemCED";

const dir = path.join(process.cwd(), "data");
fs.mkdirSync(dir, { recursive: true });

const sqlite = new Database(path.join(dir, "scoring.db"));
sqlite.pragma("busy_timeout = 15000");
try {
  sqlite.pragma("journal_mode = WAL");
} catch {
  // Another build worker holds the file; the existing journal mode is fine.
}
sqlite.pragma("foreign_keys = ON");

// Tables are created on first run so there is no separate migration step.
sqlite.exec(`
CREATE TABLE IF NOT EXISTS course (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS test (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS question (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER NOT NULL REFERENCES test(id) ON DELETE CASCADE,
  number INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS part (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id INTEGER NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS point (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL REFERENCES part(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit INTEGER,
  subunit TEXT
);
CREATE TABLE IF NOT EXISTS reason (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_id INTEGER NOT NULL REFERENCES point(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS section (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS student (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS topic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL REFERENCES unit(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL
);
`);

sqlite.exec(`
CREATE TABLE IF NOT EXISTS scan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES test(id) ON DELETE CASCADE,
  page INTEGER NOT NULL,
  image_file TEXT,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, test_id, page)
);
-- One row per point per student: the saved result of a scanned scoring sheet.
CREATE TABLE IF NOT EXISTS response (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  test_id INTEGER NOT NULL REFERENCES test(id) ON DELETE CASCADE,
  point_id INTEGER NOT NULL REFERENCES point(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('earned','missed','unknown')),
  reason_id INTEGER REFERENCES reason(id) ON DELETE SET NULL,
  is_other INTEGER NOT NULL DEFAULT 0,
  scanned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(student_id, point_id)
);
`);

// Points reference a curriculum topic (the older unit/subunit text columns are no longer used).
const pointCols = sqlite.prepare("PRAGMA table_info(point)").all() as { name: string }[];
if (!pointCols.some((c) => c.name === "topic_id")) {
  sqlite.exec("ALTER TABLE point ADD COLUMN topic_id INTEGER REFERENCES topic(id) ON DELETE SET NULL");
}

// A test can carry a grade curve: none, square root, or a number of points added.
const testCols = sqlite.prepare("PRAGMA table_info(test)").all() as { name: string }[];
if (!testCols.some((c) => c.name === "curve_type")) {
  sqlite.exec("ALTER TABLE test ADD COLUMN curve_type TEXT NOT NULL DEFAULT 'none'");
  sqlite.exec("ALTER TABLE test ADD COLUMN curve_value REAL NOT NULL DEFAULT 0");
}

// A test is "standard" (students self-score with reasons) or a "midterm" (teacher-graded FRQ sheet with no
// reason bubbles, plus a separately entered multiple-choice score out of mcq_total points).
if (!(sqlite.prepare("PRAGMA table_info(test)").all() as { name: string }[]).some((c) => c.name === "kind")) {
  sqlite.exec("ALTER TABLE test ADD COLUMN kind TEXT NOT NULL DEFAULT 'standard'");
  sqlite.exec("ALTER TABLE test ADD COLUMN mcq_total INTEGER NOT NULL DEFAULT 0");
}
sqlite.exec(`
CREATE TABLE IF NOT EXISTS midterm_mcq (
  test_id INTEGER NOT NULL REFERENCES test(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  PRIMARY KEY (test_id, student_id)
);
`);

// Pre-fill the AP Chemistry CED the first time, without touching anything the teacher has already built.
function seedApChem() {
  const existing = sqlite.prepare("SELECT id FROM course WHERE name = 'AP Chemistry'").get() as { id: number } | undefined;
  const courseId = existing ? existing.id : Number(sqlite.prepare("INSERT INTO course(name) VALUES('AP Chemistry')").run().lastInsertRowid);
  if (sqlite.prepare("SELECT 1 FROM unit WHERE course_id = ?").get(courseId)) return;
  const addUnit = sqlite.prepare("INSERT INTO unit(course_id, number, title) VALUES(?,?,?)");
  const addTopic = sqlite.prepare("INSERT INTO topic(unit_id, position, code, title) VALUES(?,?,?,?)");
  sqlite.transaction(() => {
    for (const u of AP_CHEM_CED) {
      const uid = Number(addUnit.run(courseId, u.number, u.title).lastInsertRowid);
      u.topics.forEach(([code, title], i) => addTopic.run(uid, i + 1, code, title));
    }
  })();
}
seedApChem();

export const db = drizzle(sqlite, { schema });
export { sqlite };
