"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, ArrowDown, ArrowUp, Copy, Plus, Star, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select, inputClass } from "@/components/ui";
import { deleteItemAction, saveItemAction } from "@/lib/storeActions";
import { minutes, uid, type Bell, type BellRow } from "@/lib/subplan";
import type { Period } from "@/lib/settings";

type Sched = { uid: string; title: string; data: Bell };

export function BellEditor({ initial, periods, courses }: { initial: Sched[]; periods: Period[]; courses: string[] }) {
  const router = useRouter();
  const [list, setList] = useState<Sched[]>(initial);
  const [sel, setSel] = useState<string>(initial.find((b) => b.data.isDefault)?.uid ?? initial[0]?.uid ?? "");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [from, setFrom] = useState("periods");
  const [status, setStatus] = useState<"saved" | "dirty" | "saving">("saved");
  const dirty = useRef<Set<string>>(new Set());
  const ref = useRef(list); ref.current = list;

  const cur = list.find((b) => b.uid === sel);
  const edit = (uidv: string, fn: (b: Sched) => Sched) => { dirty.current.add(uidv); setStatus("dirty"); setList((l) => l.map((b) => (b.uid === uidv ? fn(b) : b))); };
  const setRows = (rows: BellRow[]) => cur && edit(cur.uid, (b) => ({ ...b, data: { ...b.data, rows } }));
  const patchRow = (i: number, p: Partial<BellRow>) => cur && setRows(cur.data.rows.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const flush = useCallback(async () => {
    const ids = [...dirty.current]; dirty.current = new Set();
    if (!ids.length) return;
    setStatus("saving");
    for (const id of ids) { const b = ref.current.find((x) => x.uid === id); if (b) await saveItemAction({ uid: b.uid, kind: "bell", title: b.title, data: b.data }); }
    setStatus("saved");
  }, []);
  useEffect(() => {
    if (status !== "dirty") return;
    const t = setTimeout(flush, 800);
    return () => clearTimeout(t);
  }, [list, status, flush]);

  async function create() {
    const base: BellRow[] = from === "periods"
      ? periods.map((p) => ({ id: uid(), label: p.name, start: p.start, end: p.end, course: "" }))
      : from === "blank" ? [] : (list.find((b) => b.uid === from)?.data.rows ?? []).map((r) => ({ ...r }));
    const data: Bell = { rows: base, note: "", isDefault: list.length === 0 };
    const title = name.trim() || "Regular day";
    const id = await saveItemAction({ kind: "bell", title, data });
    setList((l) => [...l, { uid: id, title, data }]); setSel(id); setOpen(false); setName("");
  }
  async function makeDefault(id: string) {
    const next = list.map((b) => ({ ...b, data: { ...b.data, isDefault: b.uid === id } }));
    setList(next);
    for (const b of next) await saveItemAction({ uid: b.uid, kind: "bell", title: b.title, data: b.data });
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this bell schedule? Sub plans that used it keep their rows.")) return;
    await deleteItemAction(id);
    const rest = list.filter((b) => b.uid !== id);
    setList(rest); setSel(rest[0]?.uid ?? ""); router.refresh();
  }
  async function duplicate(b: Sched) {
    const data: Bell = { ...b.data, isDefault: false, rows: b.data.rows.map((r) => ({ ...r })) };
    const title = b.title + " (copy)";
    const id = await saveItemAction({ kind: "bell", title, data });
    setList((l) => [...l, { uid: id, title, data }]); setSel(id);
  }
  const addRow = () => {
    if (!cur) return;
    const last = cur.data.rows[cur.data.rows.length - 1];
    setRows([...cur.data.rows, { id: uid(), label: `Period ${cur.data.rows.length + 1}`, start: last?.end ?? "", end: "", course: "" }]);
  };
  const move = (i: number, d: number) => { if (!cur) return; const a = [...cur.data.rows]; const k = i + d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; setRows(a); };

  if (list.length === 0) {
    return (<>
      <Card><EmptyState icon={AlarmClock} title="No bell schedules yet" description="Create your regular day first. You can start from the class periods in Settings." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New bell schedule</Button>} /></Card>
      {modal()}
    </>);
  }

  function modal() {
    return (
      <Modal open={open} onClose={() => setOpen(false)} title="New bell schedule" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">Name<Input autoFocus className="mt-1" placeholder="Regular day, Early release, Assembly" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm font-medium text-slate-800">Start from
            <Select className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="periods">My class periods (from Settings)</option><option value="blank">A blank schedule</option>
              {list.map((b) => <option key={b.uid} value={b.uid}>A copy of: {b.title}</option>)}
            </Select></label>
        </div>
      </Modal>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
      <div className="space-y-2">
        {list.map((b) => (
          <button key={b.uid} onClick={() => setSel(b.uid)} className={"flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm " + (b.uid === sel ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50")}>
            <span className="min-w-0 flex-1 truncate font-medium">{b.title}</span>{b.data.isDefault && <Star className="size-3.5 fill-amber-400 text-amber-400" />}
          </button>
        ))}
        <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}><Plus className="size-4" /> New schedule</Button>
      </div>

      {cur && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input className="min-w-48 flex-1 !text-base font-semibold" value={cur.title} onChange={(e) => edit(cur.uid, (b) => ({ ...b, title: e.target.value }))} />
            <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : "Saved"}</span>
            <Button variant={cur.data.isDefault ? "secondary" : "ghost"} size="sm" onClick={() => makeDefault(cur.uid)} title="New sub plans start with the default schedule"><Star className={"size-4 " + (cur.data.isDefault ? "fill-amber-400 text-amber-400" : "")} /> {cur.data.isDefault ? "Default" : "Make default"}</Button>
            <Button variant="ghost" size="sm" onClick={() => duplicate(cur)}><Copy className="size-4" /></Button>
            <Button variant="danger" size="sm" onClick={() => remove(cur.uid)}><Trash2 className="size-4" /></Button>
          </div>
          <div className="mt-4 space-y-2">
            <div className="hidden grid-cols-[1fr_7.5rem_7.5rem_4rem_1fr_auto] gap-2 text-xs font-medium text-slate-500 sm:grid"><span>Name</span><span>Starts</span><span>Ends</span><span>Min</span><span>Your class</span><span /></div>
            {cur.data.rows.map((r, i) => {
              const mins = minutes(r.start, r.end);
              const prev = cur.data.rows[i - 1];
              const overlap = prev && prev.end && r.start && r.start < prev.end;
              return (
                <div key={r.id} className="grid items-center gap-2 sm:grid-cols-[1fr_7.5rem_7.5rem_4rem_1fr_auto]">
                  <Input value={r.label} onChange={(e) => patchRow(i, { label: e.target.value })} />
                  <Input type="time" value={r.start} onChange={(e) => patchRow(i, { start: e.target.value })} />
                  <Input type="time" value={r.end} onChange={(e) => patchRow(i, { end: e.target.value })} />
                  <span className={"text-xs " + (r.start && r.end && !mins ? "text-red-600" : overlap ? "text-amber-600" : "text-slate-500")} title={overlap ? "Starts before the previous slot ends" : undefined}>{mins ? `${mins}` : r.start && r.end ? "check" : ""}</span>
                  <Input list="bell-courses" placeholder="Course (leave blank for lunch, advisory)" value={r.course} onChange={(e) => patchRow(i, { course: e.target.value })} />
                  <div className="flex">
                    <Button variant="ghost" size="sm" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                    <Button variant="danger" size="sm" onClick={() => setRows(cur.data.rows.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              );
            })}
            <datalist id="bell-courses">{courses.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={addRow}><Plus className="size-3.5" /> Add a slot</Button>
              <Button variant="ghost" size="sm" onClick={() => cur && setRows([...cur.data.rows, { id: uid(), label: "Lunch", start: cur.data.rows[cur.data.rows.length - 1]?.end ?? "", end: "", course: "" }])}>+ Lunch</Button>
              <Button variant="ghost" size="sm" onClick={() => cur && setRows([...cur.data.rows, { id: uid(), label: "Advisory", start: cur.data.rows[cur.data.rows.length - 1]?.end ?? "", end: "", course: "" }])}>+ Advisory</Button>
            </div>
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-800">Note about this schedule
            <textarea className={inputClass + " mt-1 w-full"} rows={2} placeholder="For example: Early release, students leave at 12:30" value={cur.data.note} onChange={(e) => edit(cur.uid, (b) => ({ ...b, data: { ...b.data, note: e.target.value } }))} /></label>
        </Card>
      )}
      {modal()}
    </div>
  );
}
