"use client";
// The test builder. Left: your question bank (filter, then add). Middle: the test as an outline you can reorder.
// "Settings" holds the versions (A to D) and shuffling options; "Print" opens the printable copies and answer keys.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronRight, ClipboardCheck, Dices, Eye, GripVertical, Heading, Pencil, Pin, PinOff, Plus, Printer, RefreshCw, Scissors, Settings2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Select, inputClass } from "@/components/ui";
import { BankFilters } from "@/components/questions/BankFilters";
import { NO_FILTERS, TYPE_COLOR, applyFilters, type BankItem, type Filters } from "@/components/questions/bank";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { QuestionView } from "@/components/questions/QuestionView";
import { deleteItemAction, getItemAction, saveItemAction } from "@/lib/storeActions";
import { createGradebookTest } from "@/lib/examActions";
import { QTYPES, VERSION_LETTERS, normalizeQuestion, questionPoints, questionSummary, totalPoints, uid, type Exam, type ExamItem, type Question } from "@/lib/questions";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function ExamEditor({ uid: examUid, initialTitle, initial, bank, courses, units, gradeCourses }: {
  uid: string; initialTitle: string; initial: Exam; bank: BankItem[]; courses: string[]; units: string[]; gradeCourses: { id: number; name: string }[];
}) {
  const [title, setTitle] = useState(initialTitle);
  const [exam, setExam] = useState<Exam>(initial);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [pick, setPick] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<string | null>(null);
  const dragRef = useRef<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [rand, setRand] = useState(false);
  const [randN, setRandN] = useState(5);
  const [editing, setEditing] = useState<{ id: string; q: Question } | null>(null);
  const [gb, setGb] = useState(false);
  const [gbCourse, setGbCourse] = useState<number | "">(gradeCourses[0]?.id ?? "");
  const [gbMc, setGbMc] = useState(true);
  const [gbMsg, setGbMsg] = useState<{ ok: boolean; text: string; id?: number } | null>(null);
  const [note, setNote] = useState("");
  const ref = useRef({ title, exam }); ref.current = { title, exam };

  const save = useCallback(async () => {
    setStatus("saving");
    try { await saveItemAction({ uid: examUid, kind: "exam", title: ref.current.title, data: ref.current.exam }); setStatus("saved"); } catch { setStatus("error"); }
  }, [examUid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 900);
    return () => clearTimeout(t);
  }, [title, exam, save]);

  const items = exam.items;
  const setItems = (next: ExamItem[]) => setExam((e) => ({ ...e, items: next }));
  const opt = (p: Partial<Exam["options"]>) => setExam((e) => ({ ...e, options: { ...e.options, ...p } }));
  const inExam = useMemo(() => new Set(items.map((i) => i.qid).filter(Boolean) as string[]), [items]);
  const shown = useMemo(() => applyFilters(bank, f), [bank, f]);
  const total = totalPoints(exam);
  const qCount = items.filter((i) => i.kind === "question").length;

  const addFrom = (b: BankItem) => ({ id: uid(), kind: "question" as const, qid: b.uid, q: clone(b.q) });
  const addQuestions = (list: BankItem[]) => { if (list.length) setItems([...items, ...list.map(addFrom)]); };
  function addRandom() {
    const pool = shown.filter((b) => !inExam.has(b.uid));
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, randN);
    addQuestions(picked); setRand(false);
    setNote(picked.length < randN ? `Only ${picked.length} matching questions were available.` : `Added ${picked.length} random questions.`);
  }
  const patch = (id: string, p: Partial<ExamItem>) => setItems(items.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const move = (id: string, d: number) => { const a = [...items]; const i = a.findIndex((x) => x.id === id); const k = i + d; if (k < 0 || k >= a.length) return; [a[i], a[k]] = [a[k], a[i]]; setItems(a); };
  const dropOn = (targetId: string) => {
    const id = dragRef.current; dragRef.current = null; setDrag(null);
    if (!id || id === targetId) return;
    const moving = items.find((i) => i.id === id); if (!moving) return;
    const a = items.filter((i) => i.id !== id); a.splice(a.findIndex((i) => i.id === targetId), 0, moving); setItems(a);
  };
  async function refreshFromBank(it: ExamItem) {
    if (!it.qid) return;
    const r = await getItemAction(it.qid);
    if (!r) { setNote("That question is no longer in the bank."); return; }
    if (window.confirm("Replace this test's copy with the current version from the bank? Any edits you made in the test will be lost.")) patch(it.id, { q: normalizeQuestion(r.data as Partial<Question>) });
  }

  // numbers as they will print in Version A
  let n = 0;
  const numbers = new Map(items.map((i) => [i.id, i.kind === "question" ? ++n : 0]));
  const letters = VERSION_LETTERS.slice(0, exam.options.versions).split("");
  const printUrl = (v: string[], mode: string) => `/testbuilder/${examUid}/print?v=${v.join(",")}&mode=${mode}`;
  async function printNow(v: string[], mode: string) { await save(); window.open(printUrl(v, mode), "_blank"); }

  async function runGradebook() {
    if (gbCourse === "") return;
    try { await save(); const r = await createGradebookTest(examUid, Number(gbCourse), gbMc); setGbMsg({ ok: true, text: `Created a scoring template with ${r.questions} questions and ${r.points} points.`, id: r.testId }); }
    catch (e) { setGbMsg({ ok: false, text: (e as Error).message }); }
  }

  return (
    <div className="no-print fixed inset-y-0 right-0 left-0 z-20 flex flex-col bg-slate-100 md:left-60">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Link href="/testbuilder" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="All tests"><ArrowLeft className="size-4" /></Link>
        <Input className="w-72 !py-1.5 font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Test title" />
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? <span className="text-red-600">Could not save</span> : "Saved"}</span>
        <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{qCount} questions · {total} points · {exam.options.versions} version{exam.options.versions === 1 ? "" : "s"}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setGb(true)} title="Create a scoring template in the Gradebook"><ClipboardCheck className="size-4" /> Gradebook</Button>
          <Button variant="ghost" size="sm" onClick={() => setSettings(true)}><Settings2 className="size-4" /> Settings</Button>
          <div className="group relative">
            <Button size="sm"><Printer className="size-4" /> Print</Button>
            <div className="invisible absolute right-0 z-30 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg group-focus-within:visible group-hover:visible">
              {letters.map((l) => <button key={l} onClick={() => printNow([l], "student")} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100">Student copy, Version {l}</button>)}
              {letters.length > 1 && <button onClick={() => printNow(letters, "student")} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100">All student copies</button>}
              <div className="my-1 border-t border-slate-100" />
              <button onClick={() => printNow(letters, "key")} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100">Answer keys{letters.length > 1 ? " (all versions)" : ""}</button>
              <button onClick={() => printNow(letters, "both")} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100">Everything: copies, then keys</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* the bank */}
        <aside className="flex w-[22rem] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="text-sm font-semibold text-slate-900">Question bank</div>
            <BankFilters items={bank} f={f} set={setF} compact />
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" disabled={pick.size === 0} onClick={() => { addQuestions(bank.filter((b) => pick.has(b.uid))); setPick(new Set()); }}><Plus className="size-3.5" /> Add selected ({pick.size})</Button>
              <Button variant="secondary" size="sm" onClick={() => setRand(true)}><Dices className="size-3.5" /> Random…</Button>
              <Button variant="ghost" size="sm" onClick={() => setPick(new Set(shown.filter((b) => !inExam.has(b.uid)).map((b) => b.uid)))}>Select shown</Button>
            </div>
            <div className="text-[11px] text-slate-400">{shown.length} shown · <Link href="/questions" target="_blank" className="text-brand-600 hover:underline">open the bank</Link> to write new ones</div>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {shown.map((b) => {
              const used = inExam.has(b.uid);
              return (
                <li key={b.uid} className="flex items-start gap-2 px-3 py-2">
                  <input type="checkbox" className="mt-1 size-4 accent-[var(--color-brand-600)]" disabled={used} checked={pick.has(b.uid)} onChange={() => setPick((s) => { const x = new Set(s); x.has(b.uid) ? x.delete(b.uid) : x.add(b.uid); return x; })} aria-label="Select" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-xs text-slate-800">{questionSummary(b.q, 140)}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500"><span className="rounded-full px-1.5 py-px font-medium text-white" style={{ background: TYPE_COLOR[b.q.type] }}>{QTYPES[b.q.type].label}</span>{questionPoints(b.q)} pts{b.q.unit && <span className="truncate">· {b.q.unit}</span>}</div>
                  </div>
                  {used ? <span className="mt-0.5 text-[10px] text-emerald-600">Added</span> : <button className="rounded-lg border border-slate-200 px-2 py-1 text-xs hover:border-brand-500 hover:bg-brand-50" onClick={() => addQuestions([b])}>Add</button>}
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-8 text-center text-xs text-slate-500">{bank.length === 0 ? "The bank is empty. Write or import questions first." : "No questions match."}</li>}
          </ul>
        </aside>

        {/* the test */}
        <div className="min-w-0 flex-1 overflow-y-auto p-5">
          <div className="mx-auto max-w-3xl space-y-3">
            {note && <p className="text-sm text-emerald-700">{note}</p>}
            <label className="block rounded-xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-600">Instructions printed at the top
              <textarea className={inputClass + " mt-1 w-full"} rows={2} placeholder="Show all work. Calculators and the periodic table are allowed." value={exam.instructions} onChange={(e) => setExam({ ...exam, instructions: e.target.value })} /></label>

            {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Add questions from the bank on the left. They will appear here in the order you build.</div>}

            {items.map((it, idx) => {
              const dropProps = { onDragOver: (e: React.DragEvent) => dragRef.current && e.preventDefault(), onDrop: (e: React.DragEvent) => { e.preventDefault(); dropOn(it.id); } };
              const handle = <span draggable onDragStart={(e) => { dragRef.current = it.id; setDrag(it.id); e.dataTransfer.setData("text/plain", it.id); }} onDragEnd={() => { dragRef.current = null; setDrag(null); }} className="cursor-grab rounded p-1 text-slate-400 hover:bg-slate-100" title="Drag to reorder"><GripVertical className="size-4" /></span>;
              const arrows = (<>
                <button className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={idx === 0} onClick={() => move(it.id, -1)} aria-label="Move up"><ArrowUp className="size-4" /></button>
                <button className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={idx === items.length - 1} onClick={() => move(it.id, 1)} aria-label="Move down"><ArrowDown className="size-4" /></button>
                <button className="rounded p-1 text-red-400 hover:bg-red-50" onClick={() => setItems(items.filter((x) => x.id !== it.id))} aria-label="Remove"><Trash2 className="size-4" /></button>
              </>);
              if (it.kind === "section") return (
                <div key={it.id} {...dropProps} className={"rounded-xl border border-slate-300 bg-slate-50 p-3 " + (drag === it.id ? "opacity-50" : "")}>
                  <div className="flex items-center gap-2">{handle}<Heading className="size-4 text-slate-400" />
                    <input className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" aria-label="Section title" placeholder="Section title, for example Part A: Multiple choice" value={it.title ?? ""} onChange={(e) => patch(it.id, { title: e.target.value })} />
                    <label className="flex items-center gap-1 text-xs text-slate-500" title="Questions in this section are reordered in other versions"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={it.shuffle !== false} onChange={(e) => patch(it.id, { shuffle: e.target.checked })} /> shuffle</label>
                    {arrows}</div>
                  <textarea className={inputClass + " mt-2 w-full text-sm"} rows={2} placeholder="Directions for this section (optional)" value={it.text ?? ""} onChange={(e) => patch(it.id, { text: e.target.value })} />
                </div>
              );
              if (it.kind === "pagebreak") return (
                <div key={it.id} {...dropProps} className={"flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 " + (drag === it.id ? "opacity-50" : "")}>{handle}<Scissors className="size-3.5" /> Page break<span className="flex-1" />{arrows}</div>
              );
              const q = normalizeQuestion(it.q ?? {});
              const pts = it.points ?? questionPoints(q);
              const expanded = open.has(it.id);
              return (
                <div key={it.id} {...dropProps} className={"rounded-xl border bg-white " + (drag === it.id ? "opacity-50 " : "") + (it.locked ? "border-amber-300" : "border-slate-200")}>
                  <div className="flex items-start gap-2 p-3">
                    {handle}
                    <span className="mt-0.5 w-7 shrink-0 text-right text-sm font-bold text-slate-700">{numbers.get(it.id)}.</span>
                    <div className="min-w-0 flex-1">
                      <div className={"text-sm text-slate-900 " + (expanded ? "" : "line-clamp-2")}>{questionSummary(q, 260)}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="rounded-full px-2 py-0.5 font-medium text-white" style={{ background: TYPE_COLOR[q.type] }}>{QTYPES[q.type].label}</span>
                        <label className="flex items-center gap-1">pts<input type="number" min={0} className={inputClass + " !w-16 !px-1.5 !py-0.5 text-xs"} value={pts} onChange={(e) => patch(it.id, { points: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
                        {it.locked && <span className="text-amber-700">pinned in place</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button className="rounded p-1 text-slate-500 hover:bg-slate-100" title={expanded ? "Hide preview" : "Show preview"} onClick={() => setOpen((s) => { const x = new Set(s); x.has(it.id) ? x.delete(it.id) : x.add(it.id); return x; })}>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button>
                      <button className="rounded p-1 text-slate-500 hover:bg-slate-100" title="Edit this test's copy of the question" onClick={() => setEditing({ id: it.id, q: clone(q) })}><Pencil className="size-4" /></button>
                      {it.qid && <button className="rounded p-1 text-slate-500 hover:bg-slate-100" title="Update from the bank" onClick={() => refreshFromBank(it)}><RefreshCw className="size-4" /></button>}
                      <button className={"rounded p-1 hover:bg-slate-100 " + (it.locked ? "text-amber-600" : "text-slate-500")} title={it.locked ? "Pinned: stays at this position in every version. Click to unpin" : "Pin: keep this question at this position in every version"} onClick={() => patch(it.id, { locked: !it.locked })}>{it.locked ? <Pin className="size-4" /> : <PinOff className="size-4" />}</button>
                      {arrows}
                    </div>
                  </div>
                  {expanded && <div className="keep-colors border-t border-slate-100 bg-white p-4 text-[13px] leading-snug text-slate-900"><QuestionView q={q} number={numbers.get(it.id)} showKey points={pts} /></div>}
                </div>
              );
            })}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setItems([...items, { id: uid(), kind: "section", title: "", text: "", shuffle: true }])}><Heading className="size-3.5" /> Add section heading</Button>
              <Button variant="secondary" size="sm" onClick={() => setItems([...items, { id: uid(), kind: "pagebreak" }])}><Scissors className="size-3.5" /> Add page break</Button>
              <Link href={`/testbuilder/${examUid}/print?v=A&mode=student`} target="_blank" onClick={() => save()} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><Eye className="size-3.5" /> Preview Version A</Link>
            </div>
          </div>
        </div>
      </div>

      <Modal open={settings} onClose={() => setSettings(false)} wide title="Test settings" footer={<Button onClick={() => setSettings(false)}>Done</Button>}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">Course<Select className="mt-1" value={exam.course} onChange={(e) => setExam({ ...exam, course: e.target.value })}><option value="">(none)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">Unit<Input list="exam-units" className="mt-1" value={exam.unit} onChange={(e) => setExam({ ...exam, unit: e.target.value })} /><datalist id="exam-units">{units.map((u) => <option key={u} value={u} />)}</datalist></label>
          <label className="block text-sm font-medium text-slate-800">Versions<Select className="mt-1" value={exam.options.versions} onChange={(e) => opt({ versions: Number(e.target.value) })}>{[1, 2, 3, 4].map((v) => <option key={v} value={v}>{v === 1 ? "1 (one version)" : `${v} (A to ${VERSION_LETTERS[v - 1]})`}</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">Date (optional)<Input className="mt-1" type="date" value={exam.date} onChange={(e) => setExam({ ...exam, date: e.target.value })} /></label>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="text-sm font-medium text-slate-800">Shuffling (applies to Versions B to D)</div>
            {([["shuffleQuestions", "Shuffle the order of the questions (headings and pinned questions stay put)"], ["shuffleChoices", "Shuffle multiple choice answers, matching columns and ordering items"], ["shuffleFirst", "Shuffle Version A too (otherwise A is exactly the order you built)"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={Boolean(exam.options[k])} onChange={(e) => opt({ [k]: e.target.checked })} />{l}</label>
            ))}
            <Button variant="secondary" size="sm" onClick={() => { opt({ seed: uid() }); setNote("New shuffle: Versions B to D now have a different order."); }}><Dices className="size-3.5" /> Make a different shuffle</Button>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="text-sm font-medium text-slate-800">Printing</div>
            {([["showHeader", "Name, date and period lines"], ["showPoints", "Show points next to each question"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={Boolean(exam.options[k])} onChange={(e) => opt({ [k]: e.target.checked })} />{l}</label>
            ))}
          </div>
          <label className="block text-sm font-medium text-slate-800">Question numbers<Select className="mt-1" value={exam.options.numbering} onChange={(e) => opt({ numbering: e.target.value as "plain" | "q" })}><option value="plain">1. 2. 3.</option><option value="q">Q1. Q2. Q3.</option></Select></label>
          <label className="block text-sm font-medium text-slate-800">Paper<Select className="mt-1" value={exam.options.paper} onChange={(e) => opt({ paper: e.target.value as "letter" | "a4" })}><option value="letter">Letter</option><option value="a4">A4</option></Select></label>
          <label className="block text-sm font-medium text-slate-800">Font<Select className="mt-1" value={exam.options.font} onChange={(e) => opt({ font: e.target.value as "sans" | "serif" })}><option value="sans">Clean sans-serif</option><option value="serif">Classic serif</option></Select></label>
          <label className="block text-sm font-medium text-slate-800">Text size<Select className="mt-1" value={exam.options.fontSize} onChange={(e) => opt({ fontSize: Number(e.target.value) })}>{[11, 12, 13, 14, 16].map((s) => <option key={s} value={s}>{s} px</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">Space between questions<Select className="mt-1" value={exam.options.gap} onChange={(e) => opt({ gap: Number(e.target.value) })}>{[8, 12, 18, 26, 36].map((s) => <option key={s} value={s}>{s} px</option>)}</Select></label>
        </div>
      </Modal>

      <Modal open={rand} onClose={() => setRand(false)} title="Add random questions" footer={<><Button variant="ghost" onClick={() => setRand(false)}>Cancel</Button><Button onClick={addRandom}>Add</Button></>}>
        <p className="mb-3 text-sm text-slate-600">Picks at random from the questions currently shown on the left ({shown.filter((b) => !inExam.has(b.uid)).length} not yet in this test). Use the filters first: for example, Unit 5, multiple choice, difficulty 2.</p>
        <label className="block text-sm font-medium text-slate-800">How many?<Input className="mt-1 !w-28" type="number" min={1} max={100} value={randN} onChange={(e) => setRandN(Number(e.target.value))} /></label>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} wide title="Edit this test's copy of the question" footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => { if (editing) patch(editing.id, { q: editing.q }); setEditing(null); }}>Save changes to this test</Button></>}>
        {editing && <><p className="mb-3 text-xs text-slate-500">Changes here affect only this test, not the question in your bank.</p><QuestionForm q={editing.q} onChange={(q) => setEditing({ ...editing, q })} courses={courses} unitSuggestions={units} /></>}
      </Modal>

      <Modal open={gb} onClose={() => { setGb(false); setGbMsg(null); }} title="Create a scoring template in the Gradebook" footer={<><Button variant="ghost" onClick={() => { setGb(false); setGbMsg(null); }}>Close</Button><Button onClick={runGradebook} disabled={gbCourse === ""}>Create</Button></>}>
        <p className="mb-3 text-sm text-slate-600">Turns this test (Version A) into a test in the Gradebook, so you can print scoring sheets, scan results and see error reports. Questions worth more than 3 points are split into parts, which is how the scoring sheets work.</p>
        {gradeCourses.length === 0 ? <p className="text-sm text-amber-700">There are no courses in the Gradebook yet. Create one under Gradebook → Tests &amp; templates first.</p> : (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800">Gradebook course<Select className="mt-1" value={gbCourse} onChange={(e) => setGbCourse(Number(e.target.value))}>{gradeCourses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></label>
            <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={gbMc} onChange={(e) => setGbMc(e.target.checked)} /> Include multiple choice and true/false questions</label>
          </div>
        )}
        {gbMsg && <p className={"mt-3 text-sm " + (gbMsg.ok ? "text-emerald-700" : "text-red-600")}>{gbMsg.text} {gbMsg.ok && gbMsg.id ? <Link href={`/tests/${gbMsg.id}`} className="underline">Open it</Link> : null}</p>}
      </Modal>
    </div>
  );
}
void deleteItemAction;
