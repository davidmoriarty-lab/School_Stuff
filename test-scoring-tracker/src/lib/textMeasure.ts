import { Font, FontNames, Encodings } from "@pdf-lib/standard-fonts";
import { clean } from "./pdfUtil";

// Synchronous Helvetica text measurement (the same font the PDFs use), so the sheet layout can wrap long
// reasons onto several lines instead of cutting them off.

const helv = Font.load(FontNames.Helvetica);

export function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) {
    let glyph: { name: string } | null = null;
    try { glyph = Encodings.WinAnsi.encodeUnicodeCodePoint(ch.codePointAt(0)!); } catch { glyph = null; }
    w += (glyph && helv.getWidthOfGlyph(glyph.name)) || 556;
  }
  return (w * size) / 1000;
}

/** Break text into lines that fit `maxW`. Anything beyond `maxLines` is ended with "...". */
export function wrapLines(text: string, size: number, maxW: number, maxLines = 3): string[] {
  const fits = (s: string) => textWidth(s, size) * 1.03 <= maxW; // small safety margin
  const lines: string[] = [];
  let line = "";
  for (let w of clean(text).split(/\s+/).filter(Boolean)) {
    // A single word wider than the line gets broken by letters.
    while (!fits(w) && w.length > 1) {
      let k = w.length - 1;
      while (k > 1 && !fits(w.slice(0, k))) k--;
      if (line) { lines.push(line); line = ""; }
      lines.push(w.slice(0, k));
      w = w.slice(k);
    }
    const next = line ? `${line} ${w}` : w;
    if (fits(next) || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (!lines.length) return [""];
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && !fits(`${last}...`)) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}...`;
    return kept;
  }
  return lines;
}
