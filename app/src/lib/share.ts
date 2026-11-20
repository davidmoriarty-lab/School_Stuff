// Share Packages: one ".classpack" file (plain JSON) carrying worksheets, lesson plans, pacing guides, seating layouts
// and uploaded files from one teacher's app to another's.
//   * Student data never goes in a package: seating charts are exported with all seats emptied.
//   * Importing shows what would change first, takes a backup, and never runs anything from the package.
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { getItem, getSettings, saveItem, type Item, type ItemKind } from "./store";
import { makeBackup } from "./backup";
import { clearSearchCache, resolveSafe } from "./library";
import type { Chart } from "./seating";

export const SHAREABLE: ItemKind[] = ["worksheet", "lesson", "pacing", "seating"];
export const KIND_LABEL: Record<string, string> = { worksheet: "Worksheet", lesson: "Lesson plan", pacing: "Pacing guide", seating: "Seating layout" };

export type PackItem = { uid: string; kind: ItemKind; title: string; updatedAt: string; data: unknown };
export type PackFile = { path: string; base64: string };
export type Pack = { format: "classpack"; version: 1; createdAt: string; from: string; name: string; items: PackItem[]; files: PackFile[] };
export type Status = "new" | "same" | "pack-newer" | "here-newer";

const BLOCKED_EXT = new Set(["exe", "bat", "cmd", "com", "scr", "msi", "ps1", "vbs", "vbe", "jar", "dll", "sh", "app", "lnk", "reg", "hta", "cpl"]);
const MAX_FILE = 40 * 1024 * 1024, MAX_TOTAL = 150 * 1024 * 1024;

function stripStudents(data: unknown) {
  const c = JSON.parse(JSON.stringify(data)) as Chart;
  c.sectionId = null;
  for (const o of c.objs ?? []) o.students = (o.students ?? []).map(() => null);
  return c;
}

export function buildPack(uids: string[], files: string[], name: string): Pack {
  const items: PackItem[] = [];
  for (const uid of uids) {
    const it = getItem(uid);
    if (!it || !SHAREABLE.includes(it.kind)) continue;
    items.push({ uid: it.uid, kind: it.kind, title: it.title, updatedAt: it.updatedAt, data: it.kind === "seating" ? stripStudents(it.data) : it.data });
  }
  const out: PackFile[] = [];
  let total = 0;
  for (const rel of files) {
    const full = resolveSafe("mine", rel);
    if (!full || !fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const ext = path.extname(full).slice(1).toLowerCase();
    const size = fs.statSync(full).size;
    if (BLOCKED_EXT.has(ext) || size > MAX_FILE || total + size > MAX_TOTAL) continue;
    total += size;
    out.push({ path: rel, base64: fs.readFileSync(full).toString("base64") });
  }
  return { format: "classpack", version: 1, createdAt: new Date().toISOString(), from: getSettings().teacherName || "A colleague", name: name || "Shared package", items, files: out };
}

export function validatePack(x: unknown): Pack {
  const p = x as Pack;
  if (!p || p.format !== "classpack" || p.version !== 1 || !Array.isArray(p.items)) throw new Error("This is not a valid class package file.");
  for (const it of p.items) {
    if (!SHAREABLE.includes(it.kind)) throw new Error(`Unsupported item type: ${String(it.kind)}`);
    if (typeof it.uid !== "string" || !/^[A-Za-z0-9-]{6,64}$/.test(it.uid)) throw new Error("Bad item id in package.");
  }
  p.files = Array.isArray(p.files) ? p.files : [];
  return p;
}

export function previewPack(pack: Pack) {
  return {
    name: pack.name, from: pack.from, createdAt: pack.createdAt, fileCount: pack.files.length,
    items: pack.items.map((it) => {
      const here: Item | null = getItem(it.uid);
      let status: Status = "new";
      if (here) {
        const same = here.title === it.title && JSON.stringify(here.data) === JSON.stringify(it.data);
        status = same ? "same" : it.updatedAt > here.updatedAt ? "pack-newer" : "here-newer";
      }
      return { uid: it.uid, kind: it.kind, title: it.title, status, label: KIND_LABEL[it.kind] };
    }),
  };
}

export type Choice = { uid: string; mode: "update" | "copy" | "skip" };

export function applyPack(pack: Pack, choices: Choice[]) {
  const needsBackup = choices.some((c) => c.mode === "update" && getItem(c.uid));
  if (needsBackup) makeBackup("pre-import");
  let added = 0, updated = 0, copied = 0;
  for (const c of choices) {
    const it = pack.items.find((x) => x.uid === c.uid);
    if (!it || c.mode === "skip") continue;
    const data = it.kind === "seating" ? stripStudents(it.data) : it.data;
    const exists = !!getItem(it.uid);
    if (c.mode === "copy") { saveItem({ uid: randomUUID(), kind: it.kind, title: `${it.title} (from ${pack.from})`, data }); copied++; }
    else { saveItem({ uid: it.uid, kind: it.kind, title: it.title, data, updatedAt: it.updatedAt }); exists ? updated++ : added++; }
  }
  let files = 0;
  const safe = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/^\.+/, "_").slice(0, 100);
  for (const f of pack.files) {
    const ext = path.extname(f.path).slice(1).toLowerCase();
    if (BLOCKED_EXT.has(ext)) continue;
    const rel = ["Imported", safe(pack.from), ...f.path.split("/").map(safe)].join("/");
    const full = resolveSafe("mine", rel);
    if (!full) continue;
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from(f.base64, "base64"));
    files++;
  }
  if (files) clearSearchCache();
  return { added, updated, copied, files };
}
