"use client";
import { Input, Select } from "@/components/ui";
import { QTYPES, QTYPE_ORDER } from "@/lib/questions";
import type { BankItem, Filters } from "./bank";
import { NO_FILTERS } from "./bank";

export function BankFilters({ items, f, set, compact }: { items: BankItem[]; f: Filters; set: (f: Filters) => void; compact?: boolean }) {
  const courses = [...new Set(items.map((i) => i.q.course).filter(Boolean))].sort();
  const units = [...new Set(items.filter((i) => !f.course || i.q.course === f.course).map((i) => i.q.unit).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const w = compact ? "!w-full" : "";
  const dirty = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
  return (
    <div className={"flex flex-wrap items-center gap-2 " + (compact ? "" : "")}>
      <Input className={compact ? "!w-full" : "!w-60"} placeholder="Search question text, topic or tag" value={f.text} onChange={(e) => set({ ...f, text: e.target.value })} />
      <Select className={compact ? "!w-[48%]" : "!w-44"} value={f.course} onChange={(e) => set({ ...f, course: e.target.value, unit: "" })}><option value="">All courses</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select>
      <Select className={compact ? "!w-[48%]" : "!w-48"} value={f.unit} onChange={(e) => set({ ...f, unit: e.target.value })}><option value="">All units</option>{units.map((u) => <option key={u}>{u}</option>)}</Select>
      <Select className={compact ? "!w-[48%]" : "!w-44"} value={f.type} onChange={(e) => set({ ...f, type: e.target.value })}><option value="">All kinds</option>{QTYPE_ORDER.map((t) => <option key={t} value={t}>{QTYPES[t].label}</option>)}</Select>
      <Select className={compact ? "!w-[48%]" : "!w-40"} value={f.difficulty} onChange={(e) => set({ ...f, difficulty: e.target.value })}><option value="">Any difficulty</option>{["1 (easy)", "2", "3", "4", "5 (hard)"].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</Select>
      {!compact && <Select className="!w-44" value={f.sort} onChange={(e) => set({ ...f, sort: e.target.value })}><option value="recent">Recently edited</option><option value="unit">Course and unit</option><option value="type">Kind</option><option value="difficulty">Difficulty</option></Select>}
      {dirty && <button className={"text-sm text-slate-500 hover:text-brand-600 " + w} onClick={() => set(NO_FILTERS)}>Clear filters</button>}
    </div>
  );
}
