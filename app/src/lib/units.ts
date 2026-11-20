// Unit names already used somewhere (pacing guide units, lesson plans, worksheets), offered as suggestions
// so the same unit is spelled the same way everywhere.
import { listItems } from "./store";
import type { Guide } from "./pacing";

export function getUnitSuggestions(): string[] {
  const set = new Set<string>();
  for (const g of listItems("pacing")) for (const u of (g.data as Guide).units ?? []) if (u.title?.trim()) set.add(u.title.trim());
  for (const l of listItems("lesson")) if (l.data.unit?.trim()) set.add(String(l.data.unit).trim());
  for (const w of listItems("worksheet")) if (w.data.unit?.trim()) set.add(String(w.data.unit).trim());
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
