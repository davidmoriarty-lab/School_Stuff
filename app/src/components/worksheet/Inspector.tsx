"use client";
// The right-hand panel: edit the selected block. Its fields come straight from BLOCK_DEFS, so every block type
// gets a panel automatically. Tiny field components below handle each kind of field.
import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDownToLine, ArrowUpToLine, Copy, MoveHorizontal, Plus, Ruler, Trash2, X } from "lucide-react";
import { Button, Input, Select, inputClass } from "@/components/ui";
import { BLOCK_DEFS, type Block, type Field, type Props } from "@/lib/worksheet";
import { imageToDataUrl } from "@/lib/imageUtil";

const Label = ({ children, hint }: { children: React.ReactNode; hint?: string }) => (
  <div className="mb-1"><div className="text-xs font-medium text-slate-700">{children}</div>{hint && <div className="text-[11px] leading-snug text-slate-400">{hint}</div>}</div>
);

function LinesField({ value, onChange, rows }: { value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  // Keep the raw text while typing so Enter makes a new line; save the non-empty lines.
  const [text, setText] = useState((value ?? []).join("\n"));
  return <textarea className={inputClass + " w-full"} rows={rows ?? 4} value={text}
    onChange={(e) => { setText(e.target.value); onChange(e.target.value.split("\n").filter((l) => l.trim() !== "")); }} />;
}

function GridField({ props, set }: { props: Props; set: (p: Props) => void }) {
  const [tab, setTab] = useState<"cells" | "key">("cells");
  const rows = Number(props.rows) || 1, cols = Number(props.cols) || 1;
  const grid: string[][] = props[tab] ?? [];
  const put = (r: number, c: number, v: string) => {
    const next = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => String(grid[i]?.[j] ?? "")));
    next[r][c] = v;
    set({ [tab]: next });
  };
  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        {(["cells", "key"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={"rounded-md px-2 py-1 text-xs font-medium " + (tab === t ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100")}>{t === "cells" ? "Cells" : "Answer key"}</button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>{Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="p-0.5"><input className={inputClass + " w-24 !px-1.5 !py-1 text-xs"} value={String(grid[r]?.[c] ?? "")} onChange={(e) => put(r, c, e.target.value)} /></td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {tab === "key" && <p className="mt-1 text-[11px] text-slate-400">Only shows when the answer key is on. It replaces the cell text.</p>}
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [err, setErr] = useState("");
  async function pick(file: File | undefined) {
    if (!file) return;
    try { setErr(""); onChange((await imageToDataUrl(file)).src); } catch (e) { setErr((e as Error).message); }
  }
  return (
    <div className="space-y-2">
      {value && /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" className="max-h-24 rounded border border-slate-200" />}
      <input type="file" accept="image/*" className="block w-full text-xs" onChange={(e) => pick(e.target.files?.[0])} />
      <p className="text-[11px] text-slate-400">Tip: you can also copy a picture and press Ctrl+V on the page.</p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {value && <Button variant="ghost" size="sm" onClick={() => onChange("")}><X className="size-3" /> Remove picture</Button>}
    </div>
  );
}

function FieldEditor({ f, props, set }: { f: Field; props: Props; set: (p: Props) => void }) {
  const v = props[f.key];
  const put = (x: unknown) => set({ [f.key]: x });
  switch (f.kind) {
    case "text": return <Input value={String(v ?? "")} onChange={(e) => put(e.target.value)} />;
    case "textarea": return <textarea className={inputClass + " w-full"} rows={f.rows ?? 3} value={String(v ?? "")} onChange={(e) => put(e.target.value)} />;
    case "number": return <Input type="number" min={f.min} max={f.max} value={Number(v ?? 0)} onChange={(e) => put(e.target.value === "" ? 0 : Number(e.target.value))} />;
    case "bool": return <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className="size-4 accent-[var(--color-brand-600)]" checked={Boolean(v)} onChange={(e) => put(e.target.checked)} /> On</label>;
    case "select": return <Select value={String(v ?? "")} onChange={(e) => put(typeof v === "number" ? Number(e.target.value) : e.target.value)}>{f.options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>;
    case "lines": return <LinesField value={Array.isArray(v) ? v : []} onChange={put} rows={f.rows} />;
    case "image": return <ImageField value={String(v ?? "")} onChange={put} />;
    case "multi": {
      const cur: string[] = Array.isArray(v) ? v : [];
      return <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">{f.options.map(([k, l]) => (
        <label key={k} className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" className="accent-[var(--color-brand-600)]" checked={cur.includes(k)} onChange={(e) => put(e.target.checked ? [...cur, k] : cur.filter((x) => x !== k))} />{l}</label>
      ))}</div>;
    }
    case "pairs": {
      const rows: Record<string, string>[] = Array.isArray(v) ? v : [];
      return (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5 rounded-lg border border-slate-200 p-1.5">
              <div className="flex-1 space-y-1">{f.cols.map((c) => (
                <input key={c.key} placeholder={c.label} className={inputClass + " w-full !px-2 !py-1 text-xs"} value={r[c.key] ?? ""} onChange={(e) => put(rows.map((x, j) => (j === i ? { ...x, [c.key]: e.target.value } : x)))} />
              ))}</div>
              <button className="rounded p-1 text-red-500 hover:bg-red-50" onClick={() => put(rows.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="size-3.5" /></button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => put([...rows, Object.fromEntries(f.cols.map((c) => [c.key, ""]))])}><Plus className="size-3.5" /> {f.add}</Button>
        </div>
      );
    }
    case "grid": return <GridField props={props} set={set} />;
  }
}

export function Inspector({
  block, pageCount, pageIndex, grid, onProps, onGeom, onDelete, onDuplicate, onZ, onAlign, onFit, onMovePage,
}: {
  block: Block; pageCount: number; pageIndex: number; grid: number;
  onProps: (p: Props) => void; onGeom: (p: Partial<Block>) => void; onDelete: () => void; onDuplicate: () => void;
  onZ: (front: boolean) => void; onAlign: (a: "left" | "center" | "right" | "full") => void; onFit: () => void; onMovePage: (i: number) => void;
}) {
  const def = BLOCK_DEFS[block.type];
  return (
    <div key={block.id} className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-900">{def.label}</div>
        <div className="flex gap-0.5">
          <button title="Duplicate (Ctrl+D)" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={onDuplicate}><Copy className="size-4" /></button>
          <button title="Bring to front" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => onZ(true)}><ArrowUpToLine className="size-4" /></button>
          <button title="Send to back" className="rounded p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => onZ(false)}><ArrowDownToLine className="size-4" /></button>
          <button title="Delete (Del)" className="rounded p-1.5 text-red-500 hover:bg-red-50" onClick={onDelete}><Trash2 className="size-4" /></button>
        </div>
      </div>

      {def.fields.map((f) => (
        <div key={f.key}><Label hint={f.hint}>{f.label}</Label><FieldEditor f={f} props={block.props} set={onProps} /></div>
      ))}

      <div className="border-t border-slate-100 pt-3">
        <Label>Position and size</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {(["x", "y", "w", "h"] as const).map((k) => (
            <label key={k} className="text-[11px] uppercase text-slate-400">{k}
              <input type="number" step={grid} className={inputClass + " mt-0.5 w-full !px-1.5 !py-1 text-xs"} value={Math.round(block[k])} onChange={(e) => onGeom({ [k]: Number(e.target.value) })} />
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          <Button variant="secondary" size="sm" onClick={() => onAlign("left")} title="Align left"><AlignLeft className="size-3.5" /></Button>
          <Button variant="secondary" size="sm" onClick={() => onAlign("center")} title="Center on page"><AlignCenter className="size-3.5" /></Button>
          <Button variant="secondary" size="sm" onClick={() => onAlign("right")} title="Align right"><AlignRight className="size-3.5" /></Button>
          <Button variant="secondary" size="sm" onClick={() => onAlign("full")} title="Full width between margins"><MoveHorizontal className="size-3.5" /></Button>
          <Button variant="secondary" size="sm" onClick={onFit} title="Shrink or grow the box to fit its content"><Ruler className="size-3.5" /> Fit height</Button>
        </div>
        {pageCount > 1 && (
          <div className="mt-2"><Label>Page</Label>
            <Select value={pageIndex} onChange={(e) => onMovePage(Number(e.target.value))}>{Array.from({ length: pageCount }).map((_, i) => <option key={i} value={i}>Page {i + 1}</option>)}</Select>
          </div>
        )}
      </div>
    </div>
  );
}
