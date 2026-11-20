"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, inputClass } from "./ui";
import { TopicField } from "./TopicPicker";
import { MAX_POINTS_PER_PART } from "@/lib/limits";

const letters = (n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

/** One-step "add a question" form with a plain-language preview of what will be created. */
export function AddQuestionForm({
  action, testId, nextNumber,
}: { action: (f: FormData) => void | Promise<void>; testId: number; nextNumber: number }) {
  const [points, setPoints] = useState(1);
  const [parts, setParts] = useState(0);

  const total = points * Math.max(1, parts);
  const summary = parts
    ? `Question ${nextNumber} with parts ${letters(parts).join(", ")} — ${points} point${points === 1 ? "" : "s"} in each (${total} total)`
    : `Question ${nextNumber} with ${points} point${points === 1 ? "" : "s"}`;

  return (
    <form action={action} className="space-y-4 px-5 py-5">
      <input type="hidden" name="testId" value={testId} />
      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">{parts ? "Points in each part" : "How many points?"} <span className="font-normal text-slate-400">(max {MAX_POINTS_PER_PART})</span></span>
          <input
            name="points" type="number" min={1} max={MAX_POINTS_PER_PART} value={points}
            onChange={(e) => setPoints(Math.max(1, Math.min(MAX_POINTS_PER_PART, Number(e.target.value) || 1)))}
            className={`${inputClass} w-24`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Split into lettered parts?</span>
          <select name="parts" value={parts} onChange={(e) => setParts(Number(e.target.value))} className={`${inputClass} w-44 pr-8`}>
            <option value={0}>No, just points</option>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Yes: {letters(n).join(", ")}</option>)}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">Topic (optional)</span>
          <TopicField />
        </div>
        <Button><Plus className="size-4" /> Add question</Button>
      </div>
      <p className="text-sm text-slate-500">This will add: <b className="text-slate-700">{summary}</b>. You can change anything afterward.</p>
    </form>
  );
}
