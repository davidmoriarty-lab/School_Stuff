// Automatic backups: once a day, when the app starts, the database is copied into data/backups (last 14 kept).
import fs from "node:fs";
import path from "node:path";
import { sqlite } from "./db";

export const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

export function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".db")).sort().reverse()
      .map((f) => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size }));
  } catch { return []; }
}

export function makeBackup(label = "auto") {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const file = path.join(BACKUP_DIR, `scoring-${label}-${stamp}.db`);
  sqlite.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  return file;
}

let done = false;
export function dailyBackup() {
  if (done || process.env.NEXT_PHASE === "phase-production-build") return;
  done = true;
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (!listBackups().some((b) => b.name.includes(`-auto-${today}`))) makeBackup("auto");
    for (const b of listBackups().slice(14)) fs.rmSync(path.join(BACKUP_DIR, b.name), { force: true });
  } catch { /* a failed backup must never stop the app */ }
}
