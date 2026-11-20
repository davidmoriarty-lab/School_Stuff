"use client";
// Controls for the substitute roster. Every choice lives in the web address, so the printout is always what you see.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Select, inputClass } from "@/components/ui";

type State = { section: string; fields: string[]; layout: string; sort: string; blank: boolean; note: string; seating: string };

export function SubBar({ sections, charts, custom, state, builtin }: {
  sections: { id: number; name: string }[]; charts: { uid: string; title: string }[]; custom: { id: string; label: string }[]; state: State; builtin: [string, string][];
}) {
  const router = useRouter();
  const [note, setNote] = useState(state.note);
  const go = (patch: Partial<State>) => {
    const n = { ...state, ...patch };
    const q = new URLSearchParams({ section: n.section, fields: n.fields.join(","), layout: n.layout, sort: n.sort, blank: n.blank ? "1" : "0", note: n.note });
    if (n.seating) q.set("seating", n.seating);
    router.replace(`/profiles/print?${q.toString()}`);
  };
  useEffect(() => { // wait until typing pauses before updating the page
    if (note === state.note) return;
    const t = setTimeout(() => go({ note }), 600);
    return () => clearTimeout(t);
  });
  const toggle = (k: string) => go({ fields: state.fields.includes(k) ? state.fields.filter((x) => x !== k) : [...state.fields, k] });
  return (
    <div className="no-print mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select className="!w-52" value={state.section} onChange={(e) => go({ section: e.target.value, seating: "" })}>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select className="!w-40" value={state.layout} onChange={(e) => go({ layout: e.target.value })}><option value="table">Table (landscape)</option><option value="cards">Cards (portrait)</option></Select>
        <Select className="!w-44" value={state.sort} onChange={(e) => go({ sort: e.target.value })}><option value="last">Sort by last name</option><option value="first">Sort by first name</option></Select>
        <Select className="!w-52" value={state.seating} onChange={(e) => go({ seating: e.target.value })}><option value="">No seating chart</option>{charts.map((c) => <option key={c.uid} value={c.uid}>Add: {c.title}</option>)}</Select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={state.blank} onChange={(e) => go({ blank: e.target.checked })} /> Blank notes column</label>
        <button onClick={() => window.print()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Printer className="size-4" /> Print</button>
      </div>
      <div>
        <div className="mb-1 text-xs font-medium text-slate-600">Include on the roster</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {builtin.map(([k, l]) => <label key={k} className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={state.fields.includes(k)} onChange={() => toggle(k)} />{l}</label>)}
          {custom.map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm text-slate-700"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={state.fields.includes("c:" + c.id)} onChange={() => toggle("c:" + c.id)} />{c.label}</label>)}
        </div>
      </div>
      <label className="block text-xs font-medium text-slate-600">Notes for today (bell schedule, lesson, where things are)
        <textarea className={inputClass + " mt-1 w-full"} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
    </div>
  );
}
