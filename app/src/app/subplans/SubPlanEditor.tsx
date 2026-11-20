"use client";
// The sub plan editor: an ordered list of sections. Drag a section's handle (or use the arrows) to reorder,
// the eye hides it from the printout, and "Add a section" offers ready-made ones. Saves itself.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, GripVertical, Plus, Printer, RefreshCw, Trash2 } from "lucide-react";
import { Button, Card, Input, Select, inputClass } from "@/components/ui";
import { saveItemAction } from "@/lib/storeActions";
import { fmtLong } from "@/lib/dates";
import { PRESETS, TYPE_LABEL, fmtTime, makeBlock, minutes, syncRows, type Bell, type DayRow, type SubBlock, type SubPlan, type SubType } from "@/lib/subplan";

type BellItem = { uid: string; title: string; data: Bell };

export function SubPlanEditor({ uid, initialTitle, initial, bells, worksheets, courses, teacher }: {
  uid: string; initialTitle: string; initial: SubPlan; bells: BellItem[]; worksheets: { uid: string; title: string }[]; courses: string[]; teacher: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [plan, setPlan] = useState<SubPlan>(initial);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [drag, setDrag] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null); // read synchronously by the drop handlers (state may not have updated yet)
  const [menu, setMenu] = useState(false);
  const ref = useRef({ title, plan }); ref.current = { title, plan };

  const save = useCallback(async () => {
    setStatus("saving");
    try { await saveItemAction({ uid, kind: "subplan", title: ref.current.title, data: ref.current.plan }); setStatus("saved"); } catch { setStatus("error"); }
  }, [uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 800);
    return () => clearTimeout(t);
  }, [title, plan, save]);

  const bell = bells.find((b) => b.uid === plan.bellId);
  const setBlocks = (blocks: SubBlock[]) => setPlan((p) => ({ ...p, blocks }));
  const patch = (id: string, p: Partial<SubBlock>) => setBlocks(plan.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const props = (id: string, p: SubBlock["props"]) => setBlocks(plan.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...p } } : b)));
  const move = (id: string, d: number) => { const a = [...plan.blocks]; const i = a.findIndex((b) => b.id === id); const k = i + d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; setBlocks(a); };
  const dropOn = (targetId: string) => {
    const id = dragRef.current;
    dragRef.current = null; setDrag(null);
    if (!id || id === targetId) return;
    const a = plan.blocks.filter((b) => b.id !== id); const moving = plan.blocks.find((b) => b.id === id);
    if (!moving) return;
    a.splice(a.findIndex((b) => b.id === targetId), 0, moving); setBlocks(a);
  };
  function chooseBell(id: string) {
    const b = bells.find((x) => x.uid === id);
    setPlan((p) => ({ ...p, bellId: id, blocks: b ? p.blocks.map((blk) => (blk.type === "day" ? { ...blk, props: { ...blk.props, rows: syncRows(b.data, blk.props.rows ?? []) } } : blk)) : p.blocks }));
  }
  const add = (b: SubBlock) => { setBlocks([...plan.blocks, bell && b.type === "day" ? { ...b, props: { ...b.props, rows: syncRows(bell.data, []) } } : b]); setMenu(false); };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/subplans" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"><ArrowLeft className="size-4" /> All sub plans</Link>
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? <span className="text-red-600">Could not save</span> : "Saved"}</span>
        <Link href={`/subplans/${uid}/print`} onClick={save} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"><Printer className="size-4" /> Print</Link>
      </div>

      <Card className="mb-5 p-5">
        <Input className="!border-0 !px-0 text-2xl font-semibold !shadow-none" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sub plan title" />
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-600">Date<Input className="mt-1" type="date" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} />{plan.date && <span className="text-[11px] text-slate-400">{fmtLong(plan.date)}</span>}</label>
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">Bell schedule for this day
            <Select className="mt-1" value={plan.bellId} onChange={(e) => chooseBell(e.target.value)}><option value="">(choose one)</option>{bells.map((b) => <option key={b.uid} value={b.uid}>{b.title}{b.data.isDefault ? " (default)" : ""}</option>)}</Select>
            {bell?.data.note && <span className="text-[11px] text-slate-500">{bell.data.note}</span>}
            {bells.length === 0 && <span className="text-[11px] text-amber-700"> No bell schedules yet. <Link href="/bell-schedules" className="underline">Set one up</Link>.</span>}</label>
        </div>
      </Card>

      <div className="space-y-4">
        {plan.blocks.map((b, bi) => (
          <Card key={b.id} className={(drag === b.id ? "opacity-50 " : "") + (b.hidden ? "bg-slate-50 " : "")}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2" onDragOver={(e) => dragRef.current && e.preventDefault()} onDrop={(e) => { e.preventDefault(); dropOn(b.id); }}>
              <span draggable onDragStart={(e) => { dragRef.current = b.id; setDrag(b.id); e.dataTransfer.setData("text/plain", b.id); }} onDragEnd={() => { dragRef.current = null; setDrag(null); }} className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100" title="Drag to reorder"><GripVertical className="size-4" /></span>
              <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none" value={b.title} onChange={(e) => patch(b.id, { title: e.target.value })} aria-label="Section title" />
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 sm:inline">{TYPE_LABEL[b.type]}</span>
              <button className="rounded p-1 text-slate-500 hover:bg-slate-100" title={b.hidden ? "Hidden from the printout. Click to show" : "Shown on the printout. Click to hide"} onClick={() => patch(b.id, { hidden: !b.hidden })}>{b.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              <button className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={bi === 0} onClick={() => move(b.id, -1)} aria-label="Move up"><ArrowUp className="size-4" /></button>
              <button className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={bi === plan.blocks.length - 1} onClick={() => move(b.id, 1)} aria-label="Move down"><ArrowDown className="size-4" /></button>
              <button className="rounded p-1 text-red-400 hover:bg-red-50" onClick={() => { if (window.confirm(`Remove "${b.title}"?`)) setBlocks(plan.blocks.filter((x) => x.id !== b.id)); }} aria-label="Remove section"><Trash2 className="size-4" /></button>
            </div>
            <div className="p-4">{body(b)}</div>
          </Card>
        ))}
      </div>

      <div className="relative mt-5">
        <Button variant="secondary" onClick={() => setMenu((m) => !m)}><Plus className="size-4" /> Add a section</Button>
        {menu && (
          <div className="absolute z-10 mt-1 grid w-80 gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg sm:grid-cols-2">
            {PRESETS.map((p) => <button key={p.id} className="rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => add(p.make())}>{p.label}</button>)}
            <button className="rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => add(makeBlock("day", "Day schedule"))}>Another day schedule</button>
            <button className="rounded-md px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100" onClick={() => add(makeBlock("info"))}>Teacher &amp; room info</button>
          </div>
        )}
      </div>
    </div>
  );

  function body(b: SubBlock) {
    const p = b.props;
    switch (b.type as SubType) {
      case "info": return (
        <div className="grid gap-3 sm:grid-cols-2">
          {([["teacher", "Teacher", teacher || "Your name"], ["room", "Room", ""], ["phone", "Phone / extension", ""], ["buddy", "Neighbor teacher (who to ask)", ""], ["office", "Office / main desk", ""]] as const).map(([k, l, ph]) => (
            <label key={k} className="text-xs font-medium text-slate-600">{l}<Input className="mt-1" placeholder={ph} value={p[k] ?? ""} onChange={(e) => props(b.id, { [k]: e.target.value })} /></label>
          ))}
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">Anything else<textarea className={inputClass + " mt-1 w-full"} rows={2} value={p.extra ?? ""} onChange={(e) => props(b.id, { extra: e.target.value })} /></label>
        </div>
      );
      case "day": {
        const rows: DayRow[] = p.rows ?? [];
        const set = (i: number, patchRow: Partial<DayRow>) => props(b.id, { rows: rows.map((r, j) => (j === i ? { ...r, ...patchRow } : r)) });
        return (
          <div className="space-y-3">
            {!bell && <p className="text-sm text-amber-700">Choose a bell schedule at the top and your day fills in here.</p>}
            {bell && <div className="flex items-center gap-2 text-xs text-slate-500"><span>Using: {bell.title}</span><Button variant="ghost" size="sm" onClick={() => props(b.id, { rows: syncRows(bell.data, rows) })}><RefreshCw className="size-3.5" /> Update times from schedule</Button></div>}
            {rows.map((r, i) => (
              <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Input className="!w-36 font-semibold" value={r.label} onChange={(e) => set(i, { label: e.target.value })} />
                  <span className="text-xs text-slate-500">{fmtTime(r.start)}{r.end ? ` to ${fmtTime(r.end)}` : ""}{minutes(r.start, r.end) ? ` · ${minutes(r.start, r.end)} min` : ""}</span>
                  <Input list="sub-courses" className="min-w-40 flex-1" placeholder="Class (blank for lunch, advisory)" value={r.course} onChange={(e) => set(i, { course: e.target.value })} />
                  <button className="rounded p-1 text-red-400 hover:bg-red-50" onClick={() => props(b.id, { rows: rows.filter((_, j) => j !== i) })} aria-label="Remove row"><Trash2 className="size-3.5" /></button>
                </div>
                <label className="mt-2 block text-xs font-medium text-slate-600">What this class is doing<textarea className={inputClass + " mt-1 w-full"} rows={3} value={r.plan} onChange={(e) => set(i, { plan: e.target.value })} /></label>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_6rem]">
                  <label className="text-xs font-medium text-slate-600">Worksheet<Select className="mt-1" value={r.worksheet} onChange={(e) => set(i, { worksheet: e.target.value })}><option value="">(none)</option>{worksheets.map((w) => <option key={w.uid} value={w.uid}>{w.title}</option>)}</Select></label>
                  <label className="text-xs font-medium text-slate-600">Other materials / where they are<Input className="mt-1" value={r.materials} onChange={(e) => set(i, { materials: e.target.value })} /></label>
                  <label className="text-xs font-medium text-slate-600">Copies<Input className="mt-1" value={r.copies} onChange={(e) => set(i, { copies: e.target.value })} /></label>
                </div>
              </div>
            ))}
            <datalist id="sub-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
            <Button variant="secondary" size="sm" onClick={() => props(b.id, { rows: [...rows, { id: Math.random().toString(36).slice(2, 8), label: "Extra", start: "", end: "", course: "", plan: "", materials: "", worksheet: "", copies: "" }] })}><Plus className="size-3.5" /> Add a row</Button>
          </div>
        );
      }
      case "text": return <textarea className={inputClass + " w-full"} rows={5} value={p.body ?? ""} onChange={(e) => props(b.id, { body: e.target.value })} />;
      case "checklist": return (
        <label className="block text-xs font-medium text-slate-600">One item per line
          <textarea className={inputClass + " mt-1 w-full"} rows={5} value={(p.items ?? []).join("\n")} onChange={(e) => props(b.id, { items: e.target.value.split("\n") })} /></label>
      );
      case "materials": {
        const items: { kind: "worksheet" | "link"; ref: string; label: string; copies: string }[] = p.items ?? [];
        const set = (i: number, q: Partial<(typeof items)[number]>) => props(b.id, { items: items.map((x, j) => (j === i ? { ...x, ...q } : x)) });
        return (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <Select className="!w-32" value={it.kind} onChange={(e) => set(i, { kind: e.target.value as "worksheet" | "link", ref: "", label: "" })}><option value="worksheet">Worksheet</option><option value="link">Other</option></Select>
                {it.kind === "worksheet"
                  ? <Select className="min-w-48 flex-1" value={it.ref} onChange={(e) => set(i, { ref: e.target.value, label: worksheets.find((w) => w.uid === e.target.value)?.title ?? "" })}><option value="">Choose…</option>{worksheets.map((w) => <option key={w.uid} value={w.uid}>{w.title}</option>)}</Select>
                  : <Input className="min-w-48 flex-1" placeholder="What it is and where to find it" value={it.label} onChange={(e) => set(i, { label: e.target.value })} />}
                <Input className="!w-24" placeholder="Copies" value={it.copies} onChange={(e) => set(i, { copies: e.target.value })} />
                <Button variant="danger" size="sm" onClick={() => props(b.id, { items: items.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => props(b.id, { items: [...items, { kind: "worksheet", ref: "", label: "", copies: "" }] })}><Plus className="size-3.5" /> Add</Button>
          </div>
        );
      }
      case "contacts": {
        const rows: { name: string; role: string; where: string }[] = p.rows ?? [];
        const set = (i: number, q: Partial<(typeof rows)[number]>) => props(b.id, { rows: rows.map((x, j) => (j === i ? { ...x, ...q } : x)) });
        return (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex flex-wrap gap-2">
                <Input className="min-w-36 flex-1" placeholder="Name" value={r.name} onChange={(e) => set(i, { name: e.target.value })} />
                <Input className="min-w-36 flex-1" placeholder="Role / why" value={r.role} onChange={(e) => set(i, { role: e.target.value })} />
                <Input className="min-w-36 flex-1" placeholder="Room / phone" value={r.where} onChange={(e) => set(i, { where: e.target.value })} />
                <Button variant="danger" size="sm" onClick={() => props(b.id, { rows: rows.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => props(b.id, { rows: [...rows, { name: "", role: "", where: "" }] })}><Plus className="size-3.5" /> Add</Button>
          </div>
        );
      }
      case "lines": return <label className="flex items-center gap-2 text-sm text-slate-700">Blank lines to print<Input className="!w-24" type="number" min={1} max={40} value={p.count ?? 6} onChange={(e) => props(b.id, { count: Number(e.target.value) })} /></label>;
    }
  }
}
