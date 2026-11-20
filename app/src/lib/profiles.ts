// Student profiles: one row per student with the teacher's own information (preferred name, notes, flags...).
// Kept in its own table, never as a shareable "item", so it can never end up in a Share Package.
// Deleting a student from the roster deletes their profile too (ON DELETE CASCADE).
import { sqlite } from "./db";

sqlite.exec(`
CREATE TABLE IF NOT EXISTS student_profile (
  student_id INTEGER PRIMARY KEY REFERENCES student(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export type LogEntry = { id: string; date: string; text: string };
export type Profile = {
  preferred: string; pronouns: string; pronunciation: string; tags: string[];
  accommodations: string; medical: string; guardian: string; strengths: string;
  sub: string;      // "what a substitute should know"; this is what the sub roster prints
  notes: string;    // private general notes
  custom: Record<string, string>; log: LogEntry[];
};
export const EMPTY_PROFILE: Profile = {
  preferred: "", pronouns: "", pronunciation: "", tags: [], accommodations: "", medical: "", guardian: "",
  strengths: "", sub: "", notes: "", custom: {}, log: [],
};
export const parseProfile = (json: string | null | undefined): Profile => {
  let d: Partial<Profile> = {};
  try { d = JSON.parse(json ?? "{}"); } catch { /* start empty */ }
  return { ...EMPTY_PROFILE, ...d, tags: d.tags ?? [], custom: d.custom ?? {}, log: d.log ?? [] };
};

/** Make sure every student has a profile row. Safe to call any time; it only adds what is missing. */
export function ensureProfiles() {
  return sqlite.prepare("INSERT OR IGNORE INTO student_profile(student_id) SELECT id FROM student").run().changes;
}

export type ProfileRow = { id: number; sectionId: number; sectionName: string; first: string; last: string; profile: Profile };

export function listProfiles(): ProfileRow[] {
  ensureProfiles();
  const rows = sqlite.prepare(`
    SELECT s.id, s.section_id AS sectionId, sec.name AS sectionName, s.first_name AS first, s.last_name AS last, p.data
    FROM student s JOIN section sec ON sec.id = s.section_id JOIN student_profile p ON p.student_id = s.id
    ORDER BY sec.name, s.last_name, s.first_name`).all() as (Omit<ProfileRow, "profile"> & { data: string })[];
  return rows.map(({ data, ...r }) => ({ ...r, profile: parseProfile(data) }));
}

export function getProfileRow(id: number): ProfileRow | null {
  ensureProfiles();
  const r = sqlite.prepare(`
    SELECT s.id, s.section_id AS sectionId, sec.name AS sectionName, s.first_name AS first, s.last_name AS last, p.data
    FROM student s JOIN section sec ON sec.id = s.section_id JOIN student_profile p ON p.student_id = s.id WHERE s.id = ?`).get(id) as (Omit<ProfileRow, "profile"> & { data: string }) | undefined;
  if (!r) return null;
  const { data, ...rest } = r;
  return { ...rest, profile: parseProfile(data) };
}

export function saveProfile(id: number, p: Profile) {
  const clean: Profile = {
    ...EMPTY_PROFILE, ...p,
    tags: Array.isArray(p.tags) ? p.tags.map(String).slice(0, 50) : [],
    custom: Object.fromEntries(Object.entries(p.custom ?? {}).map(([k, v]) => [k, String(v)])),
    log: (Array.isArray(p.log) ? p.log : []).slice(0, 500).map((l) => ({ id: String(l.id), date: String(l.date), text: String(l.text) })),
  };
  sqlite.prepare(`INSERT INTO student_profile(student_id, data, updated_at) VALUES(?, ?, datetime('now'))
    ON CONFLICT(student_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).run(id, JSON.stringify(clean));
}

/** Used by the roster import: fill a preferred name only when none has been set yet. */
export function setPreferredIfEmpty(id: number, name: string) {
  ensureProfiles();
  const row = sqlite.prepare("SELECT data FROM student_profile WHERE student_id = ?").get(id) as { data: string } | undefined;
  const p = parseProfile(row?.data);
  if (!p.preferred && name) { p.preferred = name; saveProfile(id, p); }
}
