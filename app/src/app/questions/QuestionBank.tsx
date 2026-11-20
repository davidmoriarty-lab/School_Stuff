"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, DownloadCloud, HelpCircle, Plus, Tags, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Badge, Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { BankFilters } from "@/components/questions/BankFilters";
import { NO_FILTERS, TYPE_COLOR, applyFilters, type BankItem, type Filters } from "@/components/questions/bank";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { bulkUpdateQuestions, importClassQuestions } from "@/lib/questionActions";
import { QTYPES, QTYPE_ORDER, emptyQuestion, questionPoints, questionSummary, type QType } from "@/lib/questions";

export function QuestionBank({ items, courses, units }: { items: BankItem[]; courses: string[]; units: string[] }) {
  const router = useRouter();
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [newOpen, setNewOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [tag, setTag] = useState({ course: "", unit: "", difficulty: "", addTags: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => applyFilters(items, f), [items, f]);
  const toggle = (id: string) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function create(t: QType) {
    const q = emptyQuestion(t, f.course || courses[0] || "", f.unit);
    const uid = await saveItemAction({ kind: "question", title: "New question", data: q });
    router.push(`/questions/${uid}`);
  }
  async function runImport() {
    setBusy(true); setMsg("");
    const r = await importClassQuestions();
    setBusy(false); setMsg(`Imported ${r.added} questions${r.skipped ? ` (${r.skipped} were already in the bank)` : ""}.`); router.refresh();
  }
  async function applyTags() {
    await bulkUpdateQuestions([...pick], { course: tag.course || undefined, unit: tag.unit || undefined, difficulty: tag.difficulty ? Number(tag.difficulty) : undefined, addTags: tag.addTags || undefined });
    setTagOpen(false); setPick(new Set()); router.refresh();
  }
  async function removeSelected() {
    if (!window.confirm(`Delete ${pick.size} question${pick.size === 1 ? "" : "s"}? Tests that already use them keep their own copy.`)) return;
    for (const id of pick) await deleteItemAction(id);
    setPick(new Set()); router.refresh();
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BankFilters items={items} f={f} set={setF} />
        <Button className="ml-auto" onClick={() => setNewOpen(true)}><Plus className="size-4" /> New question</Button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-slate-500">{shown.length} of {items.length} questions</span>
        <Button variant="ghost" size="sm" onClick={() => setPick(new Set(shown.map((i) => i.uid)))}>Select all shown</Button>
        {pick.size > 0 && (<>
          <span className="text-xs font-medium text-brand-700">{pick.size} selected</span>
          <Button variant="secondary" size="sm" onClick={() => setTagOpen(true)}><Tags className="size-3.5" /> Tag selected</Button>
          <Button variant="danger" size="sm" onClick={removeSelected}><Trash2 className="size-3.5" /> Delete</Button>
          <Button variant="ghost" size="sm" onClick={() => setPick(new Set())}>Clear</Button>
        </>)}
        <Button className="ml-auto" variant="secondary" size="sm" disabled={busy} onClick={runImport} title="Adds the acids and bases quiz and the SN1/SN2/E1/E2 problems from your class materials"><DownloadCloud className="size-3.5" /> Import from class materials</Button>
      </div>
      {msg && <p className="mb-3 text-sm text-emerald-700">{msg}</p>}

      {items.length === 0 ? (
        <Card><EmptyState icon={HelpCircle} title="Your question bank is empty" description="Write a question (multiple choice, free response, matching, calculation and more) or import the questions that came with your class materials." action={<div className="flex gap-2"><Button onClick={() => setNewOpen(true)}><Plus className="size-4" /> New question</Button><Button variant="secondary" onClick={runImport}>Import from class materials</Button></div>} /></Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {shown.map(({ uid, q }) => (
              <li key={uid} className="flex items-start gap-3 px-4 py-3">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand-600)]" checked={pick.has(uid)} onChange={() => toggle(uid)} aria-label="Select" />
                <div className="min-w-0 flex-1">
                  <Link href={`/questions/${uid}`} className="line-clamp-2 text-sm text-slate-900 hover:text-brand-600">{questionSummary(q, 220)}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="rounded-full px-2 py-0.5 font-medium text-white" style={{ background: TYPE_COLOR[q.type] }}>{QTYPES[q.type].label}</span>
                    <span>{questionPoints(q)} pt{questionPoints(q) === 1 ? "" : "s"}</span><span>·</span><span>{"●".repeat(q.difficulty)}<span className="text-slate-300">{"●".repeat(5 - q.difficulty)}</span></span>
                    {(q.course || q.unit) && <Badge>{[q.course, q.unit].filter(Boolean).join(" · ")}</Badge>}
                    {q.topic && <span>{q.topic}</span>}
                    {q.attachments.length > 0 && <span>· {q.attachments.length} picture/table</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Link href={`/questions/${uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</Link>
                  <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(uid); router.refresh(); }}><Copy className="size-4" /></button>
                  <button className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm("Delete this question?")) { await deleteItemAction(uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
            {shown.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-500">No questions match those filters.</li>}
          </ul>
        </Card>
      )}

      <Modal open={newOpen} onClose={() => setNewOpen(false)} wide title="What kind of question?">
        <div className="grid gap-2 sm:grid-cols-2">
          {QTYPE_ORDER.map((t) => (
            <button key={t} onClick={() => create(t)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="size-2.5 rounded-full" style={{ background: TYPE_COLOR[t] }} />{QTYPES[t].label}</div>
              <div className="text-xs text-slate-500">{QTYPES[t].hint}</div>
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={tagOpen} onClose={() => setTagOpen(false)} title={`Tag ${pick.size} question${pick.size === 1 ? "" : "s"}`} footer={<><Button variant="ghost" onClick={() => setTagOpen(false)}>Cancel</Button><Button onClick={applyTags}>Apply</Button></>}>
        <p className="mb-3 text-xs text-slate-500">Leave a box empty to leave that setting alone.</p>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">Course<Select className="mt-1" value={tag.course} onChange={(e) => setTag({ ...tag, course: e.target.value })}><option value="">(leave as is)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">Unit<Input list="bank-units" className="mt-1" value={tag.unit} onChange={(e) => setTag({ ...tag, unit: e.target.value })} /><datalist id="bank-units">{units.map((u) => <option key={u} value={u} />)}</datalist></label>
          <label className="block text-sm font-medium text-slate-800">Difficulty<Select className="mt-1" value={tag.difficulty} onChange={(e) => setTag({ ...tag, difficulty: e.target.value })}><option value="">(leave as is)</option>{["1 (easy)", "2", "3", "4", "5 (hard)"].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">Add tags<Input className="mt-1" placeholder="review, lab" value={tag.addTags} onChange={(e) => setTag({ ...tag, addTags: e.target.value })} /></label>
        </div>
      </Modal>
    </>
  );
}
