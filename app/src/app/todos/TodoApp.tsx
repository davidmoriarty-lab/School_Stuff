"use client";
import { useMemo, useState } from "react";
import { Flag, Pencil, Plus, Printer, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, Input, Select, inputClass } from "@/components/ui";
import { deleteItemAction, saveItemAction } from "@/lib/storeActions";
import { fmtShort, addDays } from "@/lib/dates";

export type Todo = { uid: string; title: string; done: boolean; due?: string; list: string; priority: number; notes?: string };
const PRI = ["Normal", "High", "Urgent"];

export function TodoApp({ initial, lists, today, group, showDoneDefault }: { initial: Todo[]; lists: string[]; today: string; group: string; showDoneDefault: boolean }) {
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [title, setTitle] = useState("");
  const [list, setList] = useState(lists[0] ?? "");
  const [due, setDue] = useState("");
  const [showDone, setShowDone] = useState(showDoneDefault);
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<Todo | null>(null);

  async function persist(t: Todo) {
    const { uid, title: ti, ...data } = t;
    return saveItemAction({ uid: uid || undefined, kind: "todo", title: ti, data });
  }
  async function add() {
    if (!title.trim()) return;
    const t: Todo = { uid: "", title: title.trim(), done: false, due: due || undefined, list, priority: 0 };
    const uid = await persist(t);
    setTodos((x) => [...x, { ...t, uid }]); setTitle(""); setDue("");
  }
  async function toggle(t: Todo) {
    const n = { ...t, done: !t.done };
    setTodos((x) => x.map((y) => (y.uid === t.uid ? n : y))); await persist(n);
  }
  async function saveEdit() {
    if (!edit) return;
    setTodos((x) => x.map((y) => (y.uid === edit.uid ? edit : y))); setEdit(null); await persist(edit);
  }
  async function remove(t: Todo) { setTodos((x) => x.filter((y) => y.uid !== t.uid)); await deleteItemAction(t.uid); }

  const visible = useMemo(() => todos.filter((t) => (showDone || !t.done) && (filter === "all" || t.list === filter))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.priority - a.priority), [todos, showDone, filter]);

  const week = addDays(today, 7);
  const sections: { name: string; items: Todo[] }[] = group === "due"
    ? [
      { name: "Overdue", items: visible.filter((t) => !t.done && t.due && t.due < today) },
      { name: "Today", items: visible.filter((t) => !t.done && t.due === today) },
      { name: "This week", items: visible.filter((t) => !t.done && t.due && t.due > today && t.due <= week) },
      { name: "Later", items: visible.filter((t) => !t.done && t.due && t.due > week) },
      { name: "No date", items: visible.filter((t) => !t.done && !t.due) },
      { name: "Done", items: visible.filter((t) => t.done) },
    ].filter((s) => s.items.length)
    : group === "none" ? [{ name: "", items: visible }]
    : [...new Set([...lists, ...visible.map((t) => t.list)])].map((l) => ({ name: l || "No list", items: visible.filter((t) => t.list === l) })).filter((s) => s.items.length);

  return (
    <>
      <Card className="no-print mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="min-w-48 flex-1" placeholder="Add a task and press Enter" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <Select className="!w-36" value={list} onChange={(e) => setList(e.target.value)}>{lists.map((l) => <option key={l}>{l}</option>)}<option value="">No list</option></Select>
          <Input className="!w-40" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          <Button onClick={add}><Plus className="size-4" /> Add</Button>
        </div>
      </Card>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Select className="!w-44 !py-1.5" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All lists</option>{lists.map((l) => <option key={l}>{l}</option>)}</Select>
        <label className="flex items-center gap-1.5 text-slate-600"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed</label>
        <Button className="ml-auto" variant="secondary" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Print</Button>
      </div>
      {sections.length === 0 && <Card className="p-8 text-center text-sm text-slate-500">Nothing to do. Add a task above.</Card>}
      <div className="space-y-4">
        {sections.map((s) => (
          <Card key={s.name}>
            {s.name && <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{s.name} <span className="font-normal normal-case">({s.items.length})</span></div>}
            <ul className="divide-y divide-slate-100">
              {s.items.map((t) => {
                const late = !t.done && t.due && t.due < today;
                return (
                  <li key={t.uid} className="flex items-center gap-3 px-4 py-2.5">
                    <input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={t.done} onChange={() => toggle(t)} />
                    <div className="min-w-0 flex-1">
                      <div className={"text-sm " + (t.done ? "text-slate-400 line-through" : "text-slate-900")}>{t.title}</div>
                      {t.notes && <div className="truncate text-xs text-slate-500">{t.notes}</div>}
                    </div>
                    {t.priority > 0 && <Flag className={"size-3.5 " + (t.priority > 1 ? "text-red-500" : "text-amber-500")} />}
                    {group !== "list" && t.list && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t.list}</span>}
                    {t.due && <span className={"text-xs " + (late ? "font-semibold text-red-600" : "text-slate-500")}>{fmtShort(t.due)}</span>}
                    <button className="no-print rounded p-1 text-slate-400 hover:bg-slate-100" onClick={() => setEdit(t)} aria-label="Edit"><Pencil className="size-3.5" /></button>
                    <button className="no-print rounded p-1 text-red-400 hover:bg-red-50" onClick={() => remove(t)} aria-label="Delete"><Trash2 className="size-3.5" /></button>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Edit task" footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={saveEdit}>Save</Button></>}>
        {edit && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">Task<Input className="mt-1" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
            <div className="grid grid-cols-3 gap-3">
              <label className="block text-sm font-medium text-slate-800">List<Select className="mt-1" value={edit.list} onChange={(e) => setEdit({ ...edit, list: e.target.value })}>{lists.map((l) => <option key={l}>{l}</option>)}<option value="">No list</option></Select></label>
              <label className="block text-sm font-medium text-slate-800">Due<Input className="mt-1" type="date" value={edit.due ?? ""} onChange={(e) => setEdit({ ...edit, due: e.target.value || undefined })} /></label>
              <label className="block text-sm font-medium text-slate-800">Priority<Select className="mt-1" value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) })}>{PRI.map((p, i) => <option key={p} value={i}>{p}</option>)}</Select></label>
            </div>
            <label className="block text-sm font-medium text-slate-800">Notes<textarea className={inputClass + " mt-1 w-full"} rows={3} value={edit.notes ?? ""} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          </div>
        )}
      </Modal>
    </>
  );
}
