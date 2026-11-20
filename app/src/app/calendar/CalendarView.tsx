"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Printer } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Select, inputClass } from "@/components/ui";
import { deleteItemAction, saveItemAction } from "@/lib/storeActions";
import { monthTitle, monthWeeks, parseYmd } from "@/lib/dates";
import type { EventType } from "@/lib/settings";

export type CalEvent = { uid: string; title: string; date: string; endDate?: string; time?: string; type: string; course?: string; notes?: string };
type Prefs = { weekStart: 0 | 1; showWeekends: boolean; showLessons: boolean; showTodos: boolean; showUnits: boolean };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({ ym, prev, next, today, events, lessons, subs, todos, units, eventTypes, courses, prefs, header }: {
  ym: string; prev: string; next: string; today: string; events: CalEvent[];
  lessons: { uid: string; title: string; date: string }[]; subs: { uid: string; title: string; date: string }[]; todos: { uid: string; title: string; date: string }[];
  units: { title: string; start: string; end: string; color: string }[]; eventTypes: EventType[]; courses: string[]; prefs: Prefs; header: string;
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<CalEvent | null>(null);
  const weeks = monthWeeks(ym, prefs.weekStart);
  const order = prefs.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const cols = order.filter((d) => prefs.showWeekends || (d !== 0 && d !== 6));
  const color = (t: string) => eventTypes.find((e) => e.id === t)?.color ?? "#2563eb";
  const blank = (date: string): CalEvent => ({ uid: "", title: "", date, type: eventTypes[0]?.id ?? "other", time: "", endDate: "", course: "", notes: "" });

  async function save() {
    if (!edit || !edit.title.trim()) return;
    const { uid, title, ...data } = edit;
    await saveItemAction({ uid: uid || undefined, kind: "event", title: title.trim(), data });
    setEdit(null); router.refresh();
  }
  async function del() { if (edit?.uid) { await deleteItemAction(edit.uid); setEdit(null); router.refresh(); } }

  return (
    <>
      <div className="no-print mb-3 flex items-center gap-2">
        <Link href={`/calendar?m=${prev}`} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="size-4" /></Link>
        <Link href={`/calendar?m=${next}`} className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"><ChevronRight className="size-4" /></Link>
        <Link href="/calendar" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Today</Link>
        <Button className="ml-auto" variant="secondary" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
        <Button onClick={() => setEdit(blank(today))}><Plus className="size-4" /> Add event</Button>
      </div>
      <style>{`@media print { @page { size: landscape; margin: 0.4in; } }`}</style>
      {header && <div className="mb-1 hidden text-xs text-slate-500 print:block">{header}</div>}
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{monthTitle(ym)}</h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase text-slate-500" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
          {cols.map((d) => <div key={d} className="py-2">{DAYS[d]}</div>)}
        </div>
        {weeks.map((w, wi) => (
          <div key={wi} className="grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
            {w.filter((d) => cols.includes(parseYmd(d).getDay())).map((d) => {
              const inMonth = d.slice(0, 7) === ym;
              const evs = events.filter((e) => e.date <= d && (e.endDate || e.date) >= d);
              const ls = prefs.showLessons ? lessons.filter((l) => l.date === d) : [];
              const ss = subs.filter((l) => l.date === d);
              const ts = prefs.showTodos ? todos.filter((t) => t.date === d) : [];
              const us = prefs.showUnits ? units.filter((u) => u.start === d) : [];
              return (
                <div key={d} onClick={() => setEdit(blank(d))} className={"min-h-28 cursor-pointer border-b border-r border-slate-100 p-1.5 hover:bg-slate-50 " + (inMonth ? "" : "bg-slate-50/60 text-slate-400")}>
                  <div className={"mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs " + (d === today ? "bg-brand-600 font-semibold text-white" : "text-slate-600")}>{Number(d.slice(8))}</div>
                  <div className="space-y-0.5">
                    {us.map((u, i) => <div key={i} className="truncate rounded px-1 py-0.5 text-[11px] font-medium text-white" style={{ background: u.color }}>▶ {u.title}</div>)}
                    {evs.map((e) => <button key={e.uid} onClick={(ev) => { ev.stopPropagation(); setEdit(e); }} className="block w-full truncate rounded px-1 py-0.5 text-left text-[11px] font-medium text-white" style={{ background: color(e.type) }}>{e.time ? e.time + " " : ""}{e.title}</button>)}
                    {ls.map((l) => <Link key={l.uid} href={`/lessons/${l.uid}`} onClick={(e) => e.stopPropagation()} className="block truncate rounded border border-brand-500 px-1 py-0.5 text-[11px] text-brand-700">📖 {l.title}</Link>)}
                    {ss.map((l) => <Link key={l.uid} href={`/subplans/${l.uid}`} onClick={(e) => e.stopPropagation()} className="block truncate rounded bg-amber-100 px-1 py-0.5 text-[11px] font-medium text-amber-900">Sub plan: {l.title}</Link>)}
                    {ts.map((t) => <div key={t.uid} className="truncate rounded border border-dashed border-slate-300 px-1 py-0.5 text-[11px] text-slate-600">☐ {t.title}</div>)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="no-print mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {eventTypes.map((t) => <span key={t.id} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: t.color }} />{t.label}</span>)}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.uid ? "Edit event" : "Add event"}
        footer={<>{edit?.uid && <Button variant="danger" className="mr-auto" onClick={del}>Delete</Button>}<Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">Title<Input autoFocus className="mt-1" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && save()} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-800">Type<Select className="mt-1" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{eventTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></label>
              <label className="block text-sm font-medium text-slate-800">Course<Select className="mt-1" value={edit.course ?? ""} onChange={(e) => setEdit({ ...edit, course: e.target.value })}><option value="">(any)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
              <label className="block text-sm font-medium text-slate-800">Date<Input className="mt-1" type="date" value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></label>
              <label className="block text-sm font-medium text-slate-800">Through (optional)<Input className="mt-1" type="date" value={edit.endDate ?? ""} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} /></label>
              <label className="block text-sm font-medium text-slate-800">Time (optional)<Input className="mt-1" type="time" value={edit.time ?? ""} onChange={(e) => setEdit({ ...edit, time: e.target.value })} /></label>
            </div>
            <label className="block text-sm font-medium text-slate-800">Notes<textarea className={inputClass + " mt-1 w-full"} rows={3} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          </div>
        )}
      </Modal>
    </>
  );
}
