"use client";
// The question editor. Left: the fields for this kind of question (generated from QTYPES, like the worksheet Inspector),
// a symbol palette, pictures and tables, and tags. Right: a live preview, as a student sees it or with the answer key.
// Used on the question's own page and inside a pop-up when editing a copy within a test.
import { useRef, useState } from "react";
import { Image as ImageIcon, Table2, Trash2 } from "lucide-react";
import { Button, Input, Select, inputClass } from "@/components/ui";
import { FieldEditor } from "@/components/worksheet/Inspector";
import { imageToDataUrl, isImageFile } from "@/lib/imageUtil";
import { QTYPES, QTYPE_ORDER, questionPoints, uid, type Attach, type Question, type QType } from "@/lib/questions";
import { QuestionView } from "./QuestionView";

type Wrap = [string, string];
const SYMBOLS = ["→", "⇌", "Δ", "°", "±", "×", "÷", "·", "²", "³", "⁻", "⁺", "₂", "₃", "₄", "π", "λ", "ν", "σ", "θ", "μ", "α", "β", "≈", "≠", "≤", "≥", "∞", "√", "½"];

function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, text: string, wrap?: Wrap) {
  const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? s;
  const chosen = el.value.slice(s, e);
  const out = wrap ? `${wrap[0]}${chosen}${wrap[1]}` : text;
  el.setRangeText(out, s, e, "end");
  if (wrap && !chosen) { const pos = s + wrap[0].length; el.setSelectionRange(pos, pos); }
  el.dispatchEvent(new Event("input", { bubbles: true })); // lets React see the change
  el.focus();
}

const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-1"><div className="text-xs font-medium text-slate-700">{children}</div>{hint && <div className="text-[11px] leading-snug text-slate-400">{hint}</div>}</div>
);

export function QuestionForm({ q, onChange, courses, unitSuggestions }: { q: Question; onChange: (q: Question) => void; courses: string[]; unitSuggestions: string[] }) {
  const def = QTYPES[q.type];
  const last = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [key, setKey] = useState(false);
  const [err, setErr] = useState("");
  const set = (patch: Partial<Question>) => onChange({ ...q, ...patch });

  function changeType(t: QType) {
    // Keep what the two kinds share (stem, tags, pictures); give the new kind its starting content if it has none yet.
    const seed = QTYPES[t].seed ?? {};
    const next: Question = { ...q, type: t, points: q.points || QTYPES[t].points };
    for (const [k, v] of Object.entries(seed)) {
      const cur = (q as unknown as Record<string, unknown>)[k];
      const empty = cur == null || (Array.isArray(cur) && cur.length === 0) || cur === "";
      if (empty) (next as unknown as Record<string, unknown>)[k] = JSON.parse(JSON.stringify(v));
    }
    onChange(next);
  }

  async function addImage(file: File) {
    try {
      setErr("");
      const { src, w } = await imageToDataUrl(file);
      const a: Attach = { id: uid(), kind: "image", pos: "below", src, width: Math.min(w, 380), caption: "", rows: 0, cols: 0, cells: [], header: false };
      set({ attachments: [...q.attachments, a] });
    } catch (e) { setErr((e as Error).message); }
  }
  const addTable = () => set({ attachments: [...q.attachments, { id: uid(), kind: "table", pos: "below", src: "", width: 0, caption: "", rows: 3, cols: 3, cells: [["", "", ""], ["", "", ""], ["", "", ""]], header: true }] });
  const patchAttach = (id: string, p: Partial<Attach>) => set({ attachments: q.attachments.map((a) => (a.id === id ? { ...a, ...p } : a)) });

  const onPaste = (e: React.ClipboardEvent) => {
    const f = Array.from(e.clipboardData?.files ?? []).find(isImageFile);
    if (f) { e.preventDefault(); addImage(f); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onPaste={onPaste}>
      <div className="space-y-5" onFocusCapture={(e) => { const t = e.target as HTMLElement; if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") last.current = t as HTMLInputElement | HTMLTextAreaElement; }}>
        {/* symbols and formatting */}
        <div className="sticky top-0 z-10 -mx-1 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur">
          <div className="mb-1 text-[11px] text-slate-500">Click where you are typing, then pick a symbol. You can also type H2SO4, Ca^2+, -&gt; and they format themselves.</div>
          <div className="flex flex-wrap gap-1">
            {([["B", ["**", "**"]], ["I", ["__", "__"]], ["x₂", ["_{", "}"]], ["x²", ["^{", "}"]]] as [string, Wrap][]).map(([l, w]) => (
              <button key={l} onMouseDown={(e) => e.preventDefault()} onClick={() => last.current && insertAtCursor(last.current, "", w)} title={l === "B" ? "Bold" : l === "I" ? "Italic" : l === "x₂" ? "Subscript" : "Superscript"}
                className={"min-w-8 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-brand-50 " + (l === "B" ? "font-bold" : l === "I" ? "italic" : "")}>{l}</button>
            ))}
            <span className="mx-1 w-px bg-slate-200" />
            {SYMBOLS.map((s) => <button key={s} onMouseDown={(e) => e.preventDefault()} onClick={() => last.current && insertAtCursor(last.current, s)} className="min-w-7 rounded border border-slate-200 px-1.5 py-1 text-sm hover:bg-brand-50">{s}</button>)}
          </div>
        </div>

        <div>
          <Label>Kind of question</Label>
          <Select value={q.type} onChange={(e) => changeType(e.target.value as QType)}>{QTYPE_ORDER.map((t) => <option key={t} value={t}>{QTYPES[t].label} ({QTYPES[t].hint})</option>)}</Select>
        </div>

        {def.fields.map((f) => <div key={f.key}><Label hint={f.hint}>{f.label}</Label><FieldEditor f={f} props={q as unknown as Record<string, unknown>} set={(p) => set(p as Partial<Question>)} /></div>)}
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={q.auto !== false} onChange={(e) => set({ auto: e.target.checked })} /> Auto subscripts (H2O becomes H₂O)</label>

        {/* pictures and tables */}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">Pictures and tables</div>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"><ImageIcon className="size-3.5" /> Add picture<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = ""; }} /></label>
            <Button variant="secondary" size="sm" onClick={addTable}><Table2 className="size-3.5" /> Add table</Button>
          </div>
          <p className="mb-2 text-[11px] text-slate-400">Tip: copy a picture and press Ctrl+V anywhere on this form.</p>
          {err && <p className="mb-2 text-xs text-red-600">{err}</p>}
          <div className="space-y-2">
            {q.attachments.map((a) => (
              <div key={a.id} className="rounded-lg border border-slate-200 p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{a.kind === "image" ? "Picture" : "Table"}</span>
                  <Select className="!w-28 !py-1 text-xs" value={a.pos} onChange={(e) => patchAttach(a.id, { pos: e.target.value as Attach["pos"] })}><option value="above">Above</option><option value="below">Below</option></Select>
                  <label className="flex items-center gap-1 text-xs text-slate-600"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={Boolean(a.keyOnly)} onChange={(e) => patchAttach(a.id, { keyOnly: e.target.checked })} /> Key only</label>
                  <button className="ml-auto rounded p-1 text-red-400 hover:bg-red-50" onClick={() => set({ attachments: q.attachments.filter((x) => x.id !== a.id) })} aria-label="Remove"><Trash2 className="size-3.5" /></button>
                </div>
                {a.kind === "image" ? (
                  <div className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.src} alt="" className="max-h-16 rounded border border-slate-200" />
                    <label className="flex flex-1 items-center gap-2 text-xs text-slate-600">Width<input type="range" min={60} max={700} value={a.width || 360} onChange={(e) => patchAttach(a.id, { width: Number(e.target.value) })} className="flex-1 accent-[var(--color-brand-600)]" /><span className="w-10 text-right">{a.width || 360}</span></label>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <label className="flex items-center gap-1">Rows<input type="number" min={1} max={20} className={inputClass + " !w-16 !px-2 !py-1"} value={a.rows} onChange={(e) => { const rows = Math.max(1, Math.min(20, Number(e.target.value))); patchAttach(a.id, { rows, cells: Array.from({ length: rows }, (_, r) => Array.from({ length: a.cols }, (_, c) => a.cells[r]?.[c] ?? "")) }); }} /></label>
                      <label className="flex items-center gap-1">Columns<input type="number" min={1} max={8} className={inputClass + " !w-16 !px-2 !py-1"} value={a.cols} onChange={(e) => { const cols = Math.max(1, Math.min(8, Number(e.target.value))); patchAttach(a.id, { cols, cells: Array.from({ length: a.rows }, (_, r) => Array.from({ length: cols }, (_, c) => a.cells[r]?.[c] ?? "")) }); }} /></label>
                      <label className="flex items-center gap-1"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={a.header} onChange={(e) => patchAttach(a.id, { header: e.target.checked })} /> Header row</label>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="border-collapse"><tbody>
                        {Array.from({ length: a.rows }).map((_, r) => (
                          <tr key={r}>{Array.from({ length: a.cols }).map((_, c) => (
                            <td key={c} className="p-0.5"><input className={inputClass + " w-24 !px-1.5 !py-1 text-xs"} value={a.cells[r]?.[c] ?? ""} onChange={(e) => patchAttach(a.id, { cells: Array.from({ length: a.rows }, (_, i) => Array.from({ length: a.cols }, (_, j) => (i === r && j === c ? e.target.value : a.cells[i]?.[j] ?? ""))) })} /></td>
                          ))}</tr>
                        ))}
                      </tbody></table>
                    </div>
                  </div>
                )}
                <input className={inputClass + " mt-2 w-full !py-1 text-xs"} placeholder="Caption (optional)" value={a.caption} onChange={(e) => patchAttach(a.id, { caption: e.target.value })} />
              </div>
            ))}
            {q.attachments.length === 0 && <p className="text-xs text-slate-400">No pictures or tables yet.</p>}
          </div>
        </div>

        {/* tags */}
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-sm font-semibold text-slate-900">Organize</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Course</Label><Select value={q.course} onChange={(e) => set({ course: e.target.value })}><option value="">(none)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></div>
            <div><Label>Unit</Label><Input list="q-units" value={q.unit} onChange={(e) => set({ unit: e.target.value })} /><datalist id="q-units">{unitSuggestions.map((u) => <option key={u} value={u} />)}</datalist></div>
            <div><Label>Topic</Label><Input value={q.topic} placeholder="Limiting reagent" onChange={(e) => set({ topic: e.target.value })} /></div>
            <div><Label>Difficulty</Label><Select value={q.difficulty} onChange={(e) => set({ difficulty: Number(e.target.value) })}>{["1 (easy)", "2", "3 (medium)", "4", "5 (hard)"].map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</Select></div>
            <div><Label>Source</Label><Input value={q.source} placeholder="Textbook ch. 4, AP 2019 FRQ 2..." onChange={(e) => set({ source: e.target.value })} /></div>
            <div><Label hint="separate with commas">Tags</Label><Input value={q.tags} placeholder="calculation, lab, AP" onChange={(e) => set({ tags: e.target.value })} /></div>
          </div>
        </div>
      </div>

      {/* live preview */}
      <div>
        <div className="sticky top-2">
          <div className="mb-2 flex items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">Preview</div>
            <div className="ml-auto flex gap-1">
              {([[false, "Student"], [true, "Answer key"]] as const).map(([k, l]) => <button key={l} onClick={() => setKey(k)} className={"rounded-lg px-3 py-1 text-xs font-medium " + (key === k ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100")}>{l}</button>)}
            </div>
          </div>
          <div className="keep-colors rounded-lg border border-slate-200 bg-white p-5 text-[13px] leading-snug text-slate-900 shadow-sm" style={{ fontFamily: "system-ui, 'Segoe UI', Arial, sans-serif" }}>
            <QuestionView q={q} number={1} showKey={key} points={questionPoints(q)} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{q.type === "mcq" || q.type === "multi" ? "In shuffled versions the choices are reordered and the key letter changes with them." : q.type === "matching" || q.type === "ordering" ? "In shuffled versions the right-hand column (or the steps) is reordered." : ""}</p>
        </div>
      </div>
    </div>
  );
}
