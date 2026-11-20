// Grade curves. A curve is set on a test and applied on the fly to scanned results, so changing it updates
// every score. Raw results are never altered.

export type CurveType = "none" | "sqrt" | "add";
export type Curve = { type: CurveType; value: number };
export type ScoreMode = "raw" | "curved";

export const NO_CURVE: Curve = { type: "none", value: 0 };

/**
 * Turn a raw percent (0-100) into a curved percent.
 *  - sqrt: 10 x the square root of the raw percent (64% becomes 80%, 81% becomes 90%).
 *  - add:  add `value` percentage points to the percent score, after the raw score is worked out
 *          (+5 turns 70% into 75%).
 * Curved scores are capped at 100%.
 */
export function applyCurve(pct: number, curve: Curve): number {
  if (curve.type === "sqrt") return Math.min(100, 10 * Math.sqrt(Math.max(0, pct)));
  if (curve.type === "add") return Math.min(100, pct + curve.value);
  return pct;
}

export function curveLabel(c: Curve): string {
  if (c.type === "sqrt") return "Square root curve";
  if (c.type === "add") return `+${c.value} added to the %`;
  return "No curve";
}

export function parseCurve(type: string | null | undefined, value: number | null | undefined): Curve {
  if (type === "sqrt") return { type: "sqrt", value: 0 };
  if (type === "add" && value && value > 0) return { type: "add", value };
  return NO_CURVE;
}
