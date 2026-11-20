"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarClock, Plus, Printer, Trash2 } from "lucide-react";
import { Button, Card, Input, Select, inputClass } from "@/components/ui";
import { saveItemAction } from "@/lib/storeActions";
import { fmtShort, parseYmd } from "@/lib/dates";
import { UNIT_COLORS, schedule, type Guide, type Unit } from "@/lib/pacing";

export function PacingEditor({ uid, initialTitle, initial, courses, noSchool }: { uid: string; initialTitle: string; initial: Partial<Guide>; courses: string[]; noSchool: string[] }) {
  const [title, setTitle] = useState(initialTitle);
  const [g, setG] = useState<Guide>({ course: "", startDate: "", skipWeekends: true, units: [], ...initial });
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const skip = useMemo(() => new Set(noSchool), [noSchool]);
  const ref = useRef({ title, g }); ref.current = { title, g };
  const save = useCallback(async () => {
    setStatus("saving");
    await saveItemAction({ uid, kind: "pacing", title: ref.current.title, data: ref.current.g });
    setStatus("saved");
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [title, g, save]);

  // Whenever the days, order or start date change, the dates are recalculated.
  const setUnits = (units: Unit[], startDate = g.startDate, skipWeekends = g.skipWeekends) =>
    setG((x) => ({ ...x, startDate, skipWeekends, units: startDate ? schedule(startDate, units, skip, skipWeekends) : units }));
  const patch = (i: number, p: Partial<Unit>) => setUnits(g.units.map((u, j) => (j === i ? { ...u, ...p } : u)));
  const move = (i: number, d: number) => { const a = [...g.units]; const k = i + d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; setUnits(a); };
  const add = () => setUnits([...g.units, { id: Math.random().toString(36).slice(2, 8), title: `Unit ${g.units.length + 1}`, days: 15, start: "", end: "", topics: "", standards: "", assessments: "", notes: "", color: UNIT_COLORS[g.units.length % UNIT_COLORS.length] }]);

  const total = g.units.reduce((n, u) => n + u.days, 0);
  const first0 = g.units[0]?.start, last = g.units[g.units.length - 1]?.end;
  const span = first0 && last ? (parseYmd(last).getTime() - parseYmd(first0).getTime()) / 864e5 + 1 : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/pacing" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> All pacing guides</Link>
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : "Saved"}</span>
        <Link href={`/pacing/${uid}/print`} onClick={save} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Printer className="size-4" /> Print</Link>
      </div>
      <Card className="mb-5 p-5">
        <Input className="!border-0 !px-0 text-2xl font-semibold !shadow-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pacing guide name" />
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="text-xs font-medium text-slate-600">Course<Select className="mt-1" value={g.course} onChange={(e) => setG({ ...g, course: e.target.value })}><option value="">(none)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="text-xs font-medium text-slate-600">First day<Input className="mt-1" type="date" value={g.startDate} onChange={(e) => setUnits(g.units, e.target.value)} /></label>
          <label className="flex items-end gap-2 pb-2 text-xs font-medium text-slate-600"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={g.skipWeekends} onChange={(e) => setUnits(g.units, g.startDate, e.target.checked)} /> Skip weekends</label>
          <div className="flex items-end pb-2 text-xs text-slate-500"><CalendarClock className="mr-1.5 size-4" /> {total} school days{span ? ` · ${Math.ceil(span / 7)} weeks` : ""}{noSchool.length ? ` · skips ${noSchool.length} no-school days` : ""}</div>
        </div>
        {last && first0 && (
          <div className="mt-4 flex h-7 overflow-hidden rounded-lg border border-slate-200">
            {g.units.map((u) => <div key={u.id} title={`${u.title}: ${fmtShort(u.start)} to ${fmtShort(u.end)}`} className="truncate px-1.5 text-[11px] font-medium leading-7 text-white" style={{ background: u.color, width: `${(u.days / Math.max(1, total)) * 100}%` }}>{u.title}</div>)}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {g.units.map((u, i) => (
          <Card key={u.id} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <input type="color" value={u.color} onChange={(e) => patch(i, { color: e.target.value })} className="h-9 w-9 cursor-pointer rounded border border-slate-300" aria-label="Color" />
              <Input className="min-w-48 flex-1 font-semibold" value={u.title} onChange={(e) => patch(i, { title: e.target.value })} />
              <label className="flex items-center gap-1.5 text-xs text-slate-600">Days<Input className="!w-20" type="number" min={1} value={u.days} onChange={(e) => patch(i, { days: Math.max(1, Number(e.target.value)) })} /></label>
              <span className="w-40 text-xs text-slate-500">{u.start ? `${fmtShort(u.start)} – ${fmtShort(u.end)}` : "set a first day"}</span>
              <Button variant="ghost" size="sm" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
              <Button variant="danger" size="sm" onClick={() => setUnits(g.units.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([["topics", "Topics / lessons"], ["standards", "Standards"], ["assessments", "Assessments"], ["notes", "Notes"]] as const).map(([k, l]) => (
                <label key={k} className="text-xs font-medium text-slate-600">{l}<textarea className={inputClass + " mt-1 w-full"} rows={2} value={u[k]} onChange={(e) => patch(i, { [k]: e.target.value })} /></label>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4"><Button variant="secondary" onClick={add}><Plus className="size-4" /> Add unit</Button></div>
    </div>
  );
}
