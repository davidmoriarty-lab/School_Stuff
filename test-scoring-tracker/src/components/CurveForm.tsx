"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";
import { applyCurve, type CurveType } from "@/lib/curve";
import { Button, inputClass } from "./ui";

const round = (n: number) => Math.round(n);

/** Pick a test's grade curve: none, square root, or a number of points added. Shows what it does in plain numbers. */
export function CurveForm({
  action, testId, initialType, initialValue,
}: { action: (f: FormData) => void | Promise<void>; testId: number; initialType: CurveType; initialValue: number }) {
  const [type, setType] = useState<CurveType>(initialType);
  const [value, setValue] = useState(initialValue || 5);
  const [saved, setSaved] = useState(false);

  const example =
    type === "sqrt"
      ? [49, 64, 81].map((p) => `${p}% becomes ${round(applyCurve(p, { type, value: 0 }))}%`).join(" · ")
      : type === "add"
        ? `A raw 70% becomes ${round(applyCurve(70, { type, value }))}%, and 85% becomes ${round(applyCurve(85, { type, value }))}%. Scores stop at 100%.`
        : "Scores are shown exactly as earned.";

  const opt = (t: CurveType, title: string, text: string) => (
    <label className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 " + (type === t ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50")}>
      <input type="radio" name="curveType" value={t} checked={type === t} onChange={() => { setType(t); setSaved(false); }} className="mt-0.5 size-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </label>
  );

  return (
    <form action={async (f) => { await action(f); setSaved(true); }} className="space-y-3 px-5 py-4">
      <input type="hidden" name="testId" value={testId} />
      <div className="grid gap-3 md:grid-cols-3">
        {opt("none", "No curve", "Use the raw score.")}
        {opt("sqrt", "Square root curve", "Curved % = 10 × √(raw %).")}
        {opt("add", "Add to the percent", "Adds a set number of percentage points after the raw score is worked out.")}
      </div>
      {type === "add" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Add
          <input
            name="curveValue" type="number" min={0.5} step={0.5} value={value}
            onChange={(e) => { setValue(Math.max(0, Number(e.target.value))); setSaved(false); }}
            className={`${inputClass} w-24`}
          />
          percentage point{value === 1 ? "" : "s"} to every student&apos;s percent score
        </label>
      )}
      <p className="text-xs text-slate-500"><b className="font-semibold text-slate-700">Example:</b> {example}</p>
      <div className="flex items-center gap-3">
        <Button size="sm"><Save className="size-3.5" /> Save curve</Button>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" /> Saved. Scores update automatically.</span>}
      </div>
    </form>
  );
}
