// The Library reads real folders on this computer:
//   "class"  the class materials that ship with the app (read-only here)
//   "mine"   data/my-files, where you can upload your own files
// Every path from the browser is checked so it can never escape these two folders.
import fs from "node:fs";
import path from "node:path";

import type { Entry, RootKey } from "./libraryShared";
export { ROOT_LABEL, PREVIEWABLE, filesUrl } from "./libraryShared";
export type { Entry, RootKey } from "./libraryShared";

const CLASS_TOP = new Set(["index.html", "simulations", "chemistry_notes", "organic-chemistry", "4-year-course-planner", "ap-chemistry", "honors-chemistry"]);
const SKIP = new Set(["node_modules", ".git", "dist", ".next", "__pycache__"]);

export const rootDir = (r: RootKey) =>
  r === "mine"
    ? path.join(process.cwd(), "data", "my-files")
    : process.env.CLASSROOM_LIBRARY_DIR || path.resolve(process.cwd(), "..");

export const isRoot = (r: string): r is RootKey => r === "class" || r === "mine";

/** Turn a root + relative path into a real path, or null if it would leave the root. */
export function resolveSafe(root: RootKey, rel: string): string | null {
  const base = path.resolve(rootDir(root));
  const full = path.resolve(base, rel || ".");
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  if (root === "class") {
    const top = path.relative(base, full).split(path.sep)[0];
    if (top && !CLASS_TOP.has(top)) return null;
  }
  return full;
}

const hidden = (n: string) => n.startsWith(".") || SKIP.has(n);

export function listDir(root: RootKey, rel: string): Entry[] {
  const full = resolveSafe(root, rel);
  if (!full) return [];
  if (root === "mine") fs.mkdirSync(full, { recursive: true });
  let names: string[] = [];
  try { names = fs.readdirSync(full); } catch { return []; }
  const out: Entry[] = [];
  for (const name of names) {
    if (hidden(name)) continue;
    if (root === "class" && !rel && !CLASS_TOP.has(name)) continue;
    try {
      const st = fs.statSync(path.join(full, name));
      out.push({ name, rel: rel ? `${rel}/${name}` : name, isDir: st.isDirectory(), size: st.size, mtime: st.mtimeMs, ext: path.extname(name).slice(1).toLowerCase() });
    } catch { /* unreadable entry */ }
  }
  return out.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true }));
}

const DOC_EXTS = new Set(["html", "htm", "pdf", "docx", "doc", "pptx", "ppt", "xlsx", "xls", "csv", "md", "txt", "png", "jpg", "jpeg", "svg", "gif"]);
const cache: Partial<Record<RootKey, { at: number; files: Entry[] }>> = {};

function walk(root: RootKey, rel: string, depth: number, out: Entry[]) {
  if (depth > 8 || out.length > 20000) return;
  for (const e of listDir(root, rel)) {
    if (e.isDir) walk(root, e.rel, depth + 1, out);
    else if (DOC_EXTS.has(e.ext)) out.push(e);
  }
}

export function searchFiles(q: string, roots: RootKey[] = ["class", "mine"], limit = 200) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits: { root: RootKey; e: Entry }[] = [];
  for (const root of roots) {
    let c = cache[root];
    if (!c || Date.now() - c.at > 60_000) {
      const files: Entry[] = [];
      walk(root, "", 0, files);
      c = cache[root] = { at: Date.now(), files };
    }
    for (const e of c.files) {
      const hay = e.rel.toLowerCase();
      if (terms.every((t) => hay.includes(t))) hits.push({ root, e });
      if (hits.length >= limit) return hits;
    }
  }
  return hits;
}

export function clearSearchCache() { delete cache.class; delete cache.mine; }

export const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", mjs: "text/javascript",
  json: "application/json", csv: "text/csv", txt: "text/plain; charset=utf-8", md: "text/plain; charset=utf-8",
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml",
  webp: "image/webp", ico: "image/x-icon", mp3: "audio/mpeg", mp4: "video/mp4", wav: "audio/wav", woff: "font/woff", woff2: "font/woff2",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

