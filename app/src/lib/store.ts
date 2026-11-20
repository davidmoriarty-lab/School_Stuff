// Two small tables hold everything new in the app:
//   setting(key, value)  one row per top-level option, value stored as JSON
//   item(uid, kind, ...) one row per worksheet / lesson plan / pacing guide / seating chart / event / to-do
// A single generic "item" table keeps the code simple and makes Share Packages easy: every item is just JSON.
import { randomUUID } from "node:crypto";
import { sqlite } from "./db";
import { mergeSettings, type Settings } from "./settings";

sqlite.exec(`
CREATE TABLE IF NOT EXISTS setting (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS item (
  uid TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS item_kind ON item(kind);
`);

export const ITEM_KINDS = ["worksheet", "seating", "lesson", "pacing", "event", "todo", "subplan", "bell", "question", "exam"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Item<T = any> = { uid: string; kind: ItemKind; title: string; data: T; createdAt: string; updatedAt: string };

type Row = { uid: string; kind: ItemKind; title: string; data: string; created_at: string; updated_at: string };
const toItem = (r: Row): Item => {
  let data = {};
  try { data = JSON.parse(r.data); } catch { /* keep empty */ }
  return { uid: r.uid, kind: r.kind, title: r.title, data, createdAt: r.created_at, updatedAt: r.updated_at };
};

export function getSettings(): Settings {
  const rows = sqlite.prepare("SELECT key, value FROM setting").all() as { key: string; value: string }[];
  const saved: Record<string, unknown> = {};
  for (const r of rows) {
    try { saved[r.key] = JSON.parse(r.value); } catch { /* skip bad row */ }
  }
  return mergeSettings(saved as Partial<Settings>);
}

export function saveSettingsPatch(patch: Partial<Settings>) {
  const put = sqlite.prepare("INSERT INTO setting(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
  sqlite.transaction(() => {
    for (const [k, v] of Object.entries(patch)) put.run(k, JSON.stringify(v));
  })();
}

export function listItems(kind: ItemKind): Item[] {
  return (sqlite.prepare("SELECT * FROM item WHERE kind = ? ORDER BY updated_at DESC").all(kind) as Row[]).map(toItem);
}

export function getItem(uid: string): Item | null {
  const r = sqlite.prepare("SELECT * FROM item WHERE uid = ?").get(uid) as Row | undefined;
  return r ? toItem(r) : null;
}

export function saveItem(input: { uid?: string; kind: ItemKind; title: string; data: unknown; updatedAt?: string }): string {
  if (!ITEM_KINDS.includes(input.kind)) throw new Error("Unknown item kind");
  const now = new Date().toISOString();
  const uid = input.uid || randomUUID();
  sqlite
    .prepare(
      `INSERT INTO item(uid, kind, title, data, created_at, updated_at) VALUES(?,?,?,?,?,?)
       ON CONFLICT(uid) DO UPDATE SET title = excluded.title, data = excluded.data, updated_at = excluded.updated_at`,
    )
    .run(uid, input.kind, input.title, JSON.stringify(input.data ?? {}), now, input.updatedAt ?? now);
  return uid;
}

export function deleteItem(uid: string) {
  sqlite.prepare("DELETE FROM item WHERE uid = ?").run(uid);
}
