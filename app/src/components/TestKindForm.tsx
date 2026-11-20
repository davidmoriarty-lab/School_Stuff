"use client";

import { useState } from "react";
import { Save, Check } from "lucide-react";
import { Button, inputClass } from "./ui";

/** Choose whether a test is a regular self-scored test or a midterm (teacher-graded FRQ sheet + typed MCQ score). */
export function TestKindForm({
  action, testId, initialKind, initialMcqTotal,
}: { action: (f: FormData) => void | Promise<void>; testId: number; initialKind: "standard" | "midterm"; initialMcqTotal: number }) {
  const [kind, setKind] = useState(initialKind);
  const [mcq, setMcq] = useState(initialMcqTotal || 40);
  const [saved, setSaved] = useState(false);

  const opt = (k: "standard" | "midterm", title: string, text: string) => (
    <label className={"flex cursor-pointer items-start gap-3 rounded-lg border p-3 " + (kind === k ? "border-brand-500 bg-brand-50/50" : "border-slate-200 hover:bg-slate-50")}>
      <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => { setKind(k); setSaved(false); }} className="mt-0.5 size-4 accent-brand-600" />
      <span>
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-500">{text}</span>
      </span>
    </label>
  );

  return (
    <form action={async (f) => { await action(f); setSaved(true); }} className="space-y-3 px-5 py-4">
      <input type="hidden" name="testId" value={testId} />
      <div className="grid gap-3 md:grid-cols-2">
        {opt("standard", "Regular test", "Students score a copy of the test themselves and pick a reason for each missed point.")}
        {opt("midterm", "Midterm (teacher-graded)", "You grade the free-response packet. The sheet has Earned / Missed bubbles only, and you type in each student's multiple-choice score.")}
      </div>
      {kind === "midterm" && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          Multiple choice is worth
          <input name="mcqTotal" type="number" min={0} max={500} value={mcq} onChange={(e) => { setMcq(Number(e.target.value)); setSaved(false); }} className={`${inputClass} w-24`} />
          points (the free-response points come from the questions below)
        </label>
      )}
      <div className="flex items-center gap-3">
        <Button size="sm"><Save className="size-3.5" /> Save</Button>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-700"><Check className="size-3.5" /> Saved.</span>}
      </div>
    </form>
  );
}
