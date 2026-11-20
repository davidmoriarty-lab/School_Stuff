import type { PDFFont } from "pdf-lib";

/** Standard PDF fonts only cover Latin-1; swap common typographic characters and drop the rest. */
export function clean(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/√/g, "sqrt")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

/** Break text into lines no wider than maxW at the given size. */
export function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxW || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export const safeFile = (s: string) => s.replace(/[^\w .-]/g, "");
