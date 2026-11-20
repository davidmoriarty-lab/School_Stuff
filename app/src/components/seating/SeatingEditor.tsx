"use client";
// Seating chart editor: drag objects (they snap to a grid), then assign students by dragging names onto seats,
// picking from a drop-down, or auto-filling. Saves automatically.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Printer, RotateCw, Shuffle, SortAsc, Trash2, Eraser, Settings2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Select } from "@/components/ui";
import { saveItemAction } from "@/lib/storeActions";
import { OBJ_DEFS, OBJ_ORDER, autoFill, makeObj, studentName, type Chart, type ObjType, type Student } from "@/lib/seating";
import { ChartView } from "./ChartView";

export function SeatingEditor({ uid, initialTitle, initial, sections, students }: { uid: string; initialTitle: string; initial: Chart; sections: { id: number; name: string }[]; students: Student[] }) {
  const [title, setTitle] = useState(initialTitle);
  const [chart, setChart] = useState<Chart>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [scale, setScale] = useState(0.9);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty">("saved");
  const [setup, setSetup] = useState(false);
  const chartRef = useRef(chart); chartRef.current = chart;
  const scaleRef = useRef(scale); scaleRef.current = scale;
  const titleRef = useRef(title); titleRef.current = title;

  const roster = useMemo(() => students.filter((s) => s.sectionId === chart.sectionId).sort((a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first)), [students, chart.sectionId]);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const placed = new Set(chart.objs.flatMap((o) => o.students.filter((x): x is number => x != null)));

  const upd = (fn: (c: Chart) => Chart) => setChart((c) => fn(c));
  const patchObj = (id: string, p: Partial<Chart["objs"][number]>) => upd((c) => ({ ...c, objs: c.objs.map((o) => (o.id === id ? { ...o, ...p } : o)) }));
  const assign = (objId: string, seat: number, sid: number | null) =>
    upd((c) => ({ ...c, objs: c.objs.map((o) => {
      const students = o.students.map((x) => (x === sid && sid != null ? null : x));
      if (o.id === objId) students[seat] = sid;
      return { ...o, students };
    }) }));

  function addObj(t: ObjType) {
    const o = makeObj(t, 40 + (chart.objs.length % 8) * 20, 40 + (chart.objs.length % 8) * 20);
    upd((c) => ({ ...c, objs: [...c.objs, o] })); setSel(o.id);
  }
  function startDrag(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSel(id);
    const o = chartRef.current.objs.find((x) => x.id === id)!;
    const sx = e.clientX, sy = e.clientY, ox = o.x, oy = o.y;
    const move = (ev: PointerEvent) => {
      const c = chartRef.current, g = c.snap ? c.grid : 1;
      const x = Math.round((ox + (ev.clientX - sx) / scaleRef.current) / g) * g, y = Math.round((oy + (ev.clientY - sy) / scaleRef.current) / g) * g;
      patchObj(id, { x: Math.max(0, Math.min(c.w - 20, x)), y: Math.max(0, Math.min(c.h - 20, y)) });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  }
  function rotate(id: string) { const o = chart.objs.find((x) => x.id === id)!; patchObj(id, { w: o.h, h: o.w }); }
  function remove(id: string) { upd((c) => ({ ...c, objs: c.objs.filter((o) => o.id !== id) })); setSel(null); }
  function copy(id: string) {
    const o = chart.objs.find((x) => x.id === id)!;
    const n = { ...o, id: Math.random().toString(36).slice(2, 9), x: o.x + 20, y: o.y + 20, students: o.students.map(() => null) };
    upd((c) => ({ ...c, objs: [...c.objs, n] })); setSel(n.id);
  }
  function fill(mode: "alpha" | "random") {
    const ids = roster.map((s) => s.id);
    if (mode === "random") for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    upd((c) => autoFill(c, ids));
  }
  const clearAll = () => upd((c) => ({ ...c, objs: c.objs.map((o) => ({ ...o, students: o.students.map(() => null) })) }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); remove(sel); }
      if (e.key === "Escape") { setSel(null); setPick(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const save = useCallback(async () => {
    setStatus("saving");
    await saveItemAction({ uid, kind: "seating", title: titleRef.current, data: chartRef.current });
    setStatus("saved");
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [chart, title, save]);

  const so = chart.objs.find((o) => o.id === sel);
  return (
    <div className="no-print fixed inset-y-0 right-0 left-0 z-20 flex flex-col bg-slate-100 md:left-60">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Link href="/seating" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ArrowLeft className="size-4" /></Link>
        <Input className="w-64 !py-1.5 font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} />
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : "Saved"}</span>
        <Select className="!w-44 !py-1.5" value={chart.sectionId ?? ""} onChange={(e) => upd((c) => ({ ...c, sectionId: e.target.value ? Number(e.target.value) : null, objs: c.objs.map((o) => ({ ...o, students: o.students.map(() => null) })) }))}>
          <option value="">Choose a class…</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select className="!w-40 !py-1.5" value={chart.nameFormat} onChange={(e) => upd((c) => ({ ...c, nameFormat: e.target.value as Chart["nameFormat"] }))}>
          <option value="first">First name</option><option value="firstLast1">First + initial</option><option value="full">Full name</option><option value="last">Last name</option>
        </Select>
        <Button variant="secondary" size="sm" onClick={() => fill("alpha")} title="Fill seats A to Z by last name"><SortAsc className="size-4" /> A–Z</Button>
        <Button variant="secondary" size="sm" onClick={() => fill("random")} title="Fill seats in random order"><Shuffle className="size-4" /> Random</Button>
        <Button variant="ghost" size="sm" onClick={clearAll}><Eraser className="size-4" /> Clear names</Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)))}>−</Button>
          <span className="w-10 text-center text-xs text-slate-500">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(2)))}>+</Button>
          <Button variant="ghost" size="sm" onClick={() => setSetup(true)}><Settings2 className="size-4" /> Room setup</Button>
          <Button size="sm" onClick={async () => { await save(); window.open(`/seating/${uid}/print`, "_blank"); }}><Printer className="size-4" /> Print</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Add to room</div>
          <div className="mb-4 grid grid-cols-2 gap-1">
            {OBJ_ORDER.map((t) => <button key={t} onClick={() => addObj(t)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs text-slate-700 hover:border-brand-500 hover:bg-brand-50">{OBJ_DEFS[t].label}</button>)}
          </div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Students ({roster.length - roster.filter((s) => placed.has(s.id)).length} unseated)</div>
          {!chart.sectionId && <p className="text-xs text-slate-500">Choose a class at the top to see its students.</p>}
          <p className="mb-1.5 text-[11px] text-slate-400">Drag a name onto a seat, or click a name then click a seat.</p>
          <div className="space-y-1">
            {roster.map((s) => (
              <button key={s.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/seat-student", String(s.id))} onClick={() => setPick(pick === s.id ? null : s.id)}
                className={"block w-full truncate rounded-md border px-2 py-1 text-left text-xs " + (pick === s.id ? "border-brand-600 bg-brand-50 text-brand-700" : placed.has(s.id) ? "border-slate-100 bg-slate-50 text-slate-400" : "border-slate-200 text-slate-700 hover:bg-slate-50")}>
                {s.last}, {s.first}
              </button>
            ))}
          </div>
        </aside>
        <div className="min-w-0 flex-1 overflow-auto p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          <div style={{ width: chart.w * scale, height: chart.h * scale, boxShadow: "0 1px 6px rgba(0,0,0,.18)" }} className="keep-colors mx-auto bg-white" onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
            <ChartView chart={chart} students={byId} scale={scale} h={{
              selId: sel, pickId: pick, onObjDown: startDrag,
              onSeatDrop: (e, oid, seat) => { const v = e.dataTransfer.getData("text/seat-student"); if (v) { e.preventDefault(); assign(oid, seat, Number(v)); } },
              onSeatClick: (oid, seat) => { if (pick != null) { assign(oid, seat, pick); setPick(null); } },
            }} />
          </div>
        </div>
        <aside className="w-64 shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-4">
          {so ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between"><div className="text-sm font-semibold">{OBJ_DEFS[so.type].label}</div>
                <div className="flex gap-0.5">
                  <button title="Rotate" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => rotate(so.id)}><RotateCw className="size-4" /></button>
                  <button title="Copy" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => copy(so.id)}><Copy className="size-4" /></button>
                  <button title="Delete" className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={() => remove(so.id)}><Trash2 className="size-4" /></button>
                </div></div>
              {!so.students.length && <label className="block text-xs font-medium text-slate-700">Label<Input className="mt-1" value={so.label} onChange={(e) => patchObj(so.id, { label: e.target.value })} /></label>}
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-slate-700">Width<Input className="mt-1" type="number" step={chart.grid} value={so.w} onChange={(e) => patchObj(so.id, { w: Math.max(20, Number(e.target.value)) })} /></label>
                <label className="text-xs font-medium text-slate-700">Height<Input className="mt-1" type="number" step={chart.grid} value={so.h} onChange={(e) => patchObj(so.id, { h: Math.max(20, Number(e.target.value)) })} /></label>
              </div>
              {so.students.length > 0 && (<>
                <label className="block text-xs font-medium text-slate-700">Seats
                  <Input className="mt-1" type="number" min={1} max={12} value={so.students.length} onChange={(e) => { const n = Math.max(1, Math.min(12, Number(e.target.value))); patchObj(so.id, { students: Array.from({ length: n }, (_, i) => so.students[i] ?? null) }); }} /></label>
                {so.students.map((sid, i) => (
                  <label key={i} className="block text-xs font-medium text-slate-700">Seat {i + 1}
                    <Select className="mt-1" value={sid ?? ""} onChange={(e) => assign(so.id, i, e.target.value ? Number(e.target.value) : null)}>
                      <option value="">(empty)</option>{roster.map((s) => <option key={s.id} value={s.id}>{studentName(s, "full")}</option>)}
                    </Select></label>
                ))}
              </>)}
            </div>
          ) : <div className="space-y-2 text-xs text-slate-500"><div className="text-sm font-semibold text-slate-900">Nothing selected</div><p>Click a desk to edit it. Drag desks to move them; they snap to a grid.</p><p>Delete removes the selected item.</p></div>}
        </aside>
      </div>
      <Modal open={setup} onClose={() => setSetup(false)} title="Room setup" footer={<Button onClick={() => setSetup(false)}>Done</Button>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium text-slate-800">Room width<Input className="mt-1" type="number" step={20} value={chart.w} onChange={(e) => upd((c) => ({ ...c, w: Math.max(400, Number(e.target.value)) }))} /></label>
            <label className="text-sm font-medium text-slate-800">Room height<Input className="mt-1" type="number" step={20} value={chart.h} onChange={(e) => upd((c) => ({ ...c, h: Math.max(300, Number(e.target.value)) }))} /></label>
          </div>
          <label className="block text-sm font-medium text-slate-800">Snap grid<Select className="mt-1" value={chart.grid} onChange={(e) => upd((c) => ({ ...c, grid: Number(e.target.value) }))}>{[5, 10, 20, 40].map((g) => <option key={g} value={g}>{g}</option>)}</Select></label>
          <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={chart.snap} onChange={(e) => upd((c) => ({ ...c, snap: e.target.checked }))} /> Snap to grid</label>
          <label className="block text-sm font-medium text-slate-800">Name text size<Input className="mt-1" type="number" min={8} max={30} value={chart.fontSize} onChange={(e) => upd((c) => ({ ...c, fontSize: Number(e.target.value) }))} /></label>
          <label className="block text-sm font-medium text-slate-800">Note printed under the chart<Input className="mt-1" value={chart.note} onChange={(e) => upd((c) => ({ ...c, note: e.target.value }))} /></label>
        </div>
      </Modal>
    </div>
  );
}
