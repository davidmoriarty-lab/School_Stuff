"use client";
// The worksheet editor. Three parts: the block palette (left), the paper (middle), the Inspector (right).
// Key ideas, in plain terms:
//  * Every block has x, y, width, height. Dragging changes x and y; the corner handles change width and height.
//  * "Snap" rounds positions to a grid, and also pulls edges toward other blocks and the page margins (pink guide lines).
//  * Every change is saved automatically a moment after you stop; Undo/Redo keep a history of recent changes.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Eye, FilePlus2, Grid3x3, KeyRound, LayoutTemplate, Printer, Redo2, Settings2, Trash2, Undo2, ZoomIn, ZoomOut,
} from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Input, Select } from "@/components/ui";
import { saveItemAction } from "@/lib/storeActions";
import { BLOCK_DEFS, BLOCK_ORDER, PAPER, newBlock, uid, type Block, type BlockType, type Props, type Sheet } from "@/lib/worksheet";
import { imageToDataUrl, isImageFile } from "@/lib/imageUtil";
import { BlockView } from "./BlockView";
import { Inspector } from "./Inspector";

type Guide = { page: number; x?: number; y?: number };
const THRESH = 6;

function snapAxis(start: number, size: number, targets: number[]) {
  let best: { d: number; t: number } | null = null;
  for (const e of [start, start + size / 2, start + size]) {
    for (const t of targets) {
      const d = t - e;
      if (Math.abs(d) <= THRESH && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, t };
    }
  }
  return best;
}

export function Editor({ uid: itemUid, initialTitle, initial, courses, unitSuggestions }: { uid: string; initialTitle: string; initial: Sheet; courses: string[]; unitSuggestions: string[] }) {
  const [title, setTitle] = useState(initialTitle);
  const [sheet, setSheet] = useState<Sheet>(initial);
  const [sel, setSel] = useState<string | null>(null);
  const [curPage, setCurPage] = useState(0);
  const [zoom, setZoom] = useState(0.85);
  const [showKey, setShowKey] = useState(false);
  const [guideLines, setGuideLines] = useState<Guide[]>([]);
  const [marginGuides, setMarginGuides] = useState(true);
  const [status, setStatus] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const sheetRef = useRef(sheet); sheetRef.current = sheet;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const titleRef = useRef(title); titleRef.current = title;
  const past = useRef<Sheet[]>([]);
  const future = useRef<Sheet[]>([]);
  const lastSnap = useRef(0);

  const { w: W, h: H } = PAPER[sheet.paper];
  const margin = sheet.margin;

  // ---- history and updates ------------------------------------------------------------------------------------------
  const snapshot = useCallback(() => {
    const now = Date.now();
    if (now - lastSnap.current < 700) return; // typing in a field counts as one undo step
    lastSnap.current = now;
    past.current.push(sheetRef.current);
    if (past.current.length > 80) past.current.shift();
    future.current = [];
  }, []);
  const mutate = useCallback((fn: (s: Sheet) => Sheet, snap = true) => {
    if (snap) snapshot();
    setSheet((cur) => fn(cur));
  }, [snapshot]);
  const undo = () => { const p = past.current.pop(); if (p) { future.current.push(sheetRef.current); setSheet(p); } };
  const redo = () => { const f = future.current.pop(); if (f) { past.current.push(sheetRef.current); setSheet(f); } };

  const locate = (s: Sheet, id: string | null) => {
    if (!id) return null;
    for (let pi = 0; pi < s.pages.length; pi++) {
      const block = s.pages[pi].blocks.find((b) => b.id === id);
      if (block) return { pi, block };
    }
    return null;
  };
  const selected = locate(sheet, sel);

  const updateBlock = useCallback((id: string, patch: Partial<Block> | ((b: Block) => Block), snap = true) =>
    mutate((s) => ({ ...s, pages: s.pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === id ? (typeof patch === "function" ? patch(b) : { ...b, ...patch }) : b)) })) }), snap), [mutate]);
  const updateProps = (id: string, patch: Props) => updateBlock(id, (b) => ({ ...b, props: { ...b.props, ...patch } }));

  const clampPos = (b: { x: number; y: number; w: number; h: number }) => ({ ...b, x: Math.max(0, Math.min(W - 24, b.x)), y: Math.max(0, Math.min(H - 8, b.y)) });

  function addBlock(type: BlockType, at?: { page: number; x: number; y: number }) {
    const page = at?.page ?? Math.min(curPage, sheetRef.current.pages.length - 1);
    const b = newBlock(type, margin, margin);
    b.w = Math.min(b.w, W - margin * 2);
    let pg = page;
    mutate((s) => {
      let pages = s.pages;
      if (at) {
        const g = s.snap ? s.grid : 1;
        b.x = Math.round(at.x / g) * g; b.y = Math.round(at.y / g) * g;
      } else {
        const blocks = pages[page].blocks;
        const bottom = blocks.length ? Math.max(...blocks.map((x) => x.y + x.h)) + 14 : margin;
        if (blocks.length && bottom + b.h > H - margin) { pages = [...pages, { blocks: [] }]; pg = pages.length - 1; b.y = margin; }
        else b.y = bottom;
      }
      b.x = Math.max(0, Math.min(b.x, W - margin - b.w)); // keep new blocks on the paper
      Object.assign(b, clampPos(b));
      return { ...s, pages: pages.map((p, i) => (i === pg ? { ...p, blocks: [...p.blocks, b] } : p)) };
    });
    setSel(b.id); setCurPage(pg);
  }

  function deleteSelected() {
    if (!sel) return;
    mutate((s) => ({ ...s, pages: s.pages.map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== sel) })) }));
    setSel(null);
  }
  function duplicateSelected() {
    const loc = locate(sheetRef.current, sel);
    if (!loc) return;
    const copy: Block = { ...loc.block, id: uid(), x: loc.block.x + 16, y: loc.block.y + 16, props: JSON.parse(JSON.stringify(loc.block.props)) };
    mutate((s) => ({ ...s, pages: s.pages.map((p, i) => (i === loc.pi ? { ...p, blocks: [...p.blocks, copy] } : p)) }));
    setSel(copy.id);
  }
  function reorder(front: boolean) {
    const loc = locate(sheetRef.current, sel);
    if (!loc) return;
    mutate((s) => ({ ...s, pages: s.pages.map((p, i) => i !== loc.pi ? p : { ...p, blocks: front ? [...p.blocks.filter((b) => b.id !== sel), loc.block] : [loc.block, ...p.blocks.filter((b) => b.id !== sel)] }) }));
  }
  function align(a: "left" | "center" | "right" | "full") {
    if (!selected) return;
    const b = selected.block;
    if (a === "full") updateBlock(b.id, { x: margin, w: W - margin * 2 });
    else updateBlock(b.id, { x: a === "left" ? margin : a === "right" ? W - margin - b.w : Math.round((W - b.w) / 2) });
  }
  function fitHeight(id: string) {
    const el = document.querySelector<HTMLElement>(`[data-inner="${id}"]`);
    if (el) updateBlock(id, { h: Math.max(8, Math.ceil(el.offsetHeight)) });
  }
  function movePage(to: number) {
    const loc = locate(sheetRef.current, sel);
    if (!loc || to === loc.pi) return;
    mutate((s) => ({ ...s, pages: s.pages.map((p, i) => i === loc.pi ? { ...p, blocks: p.blocks.filter((b) => b.id !== sel) } : i === to ? { ...p, blocks: [...p.blocks, loc.block] } : p) }));
    setCurPage(to);
  }
  const addPage = () => { mutate((s) => ({ ...s, pages: [...s.pages, { blocks: [] }] })); setCurPage(sheetRef.current.pages.length); };
  function deletePage(i: number) {
    if (sheetRef.current.pages.length < 2) return;
    if (sheetRef.current.pages[i].blocks.length && !window.confirm("Delete this page and everything on it?")) return;
    mutate((s) => ({ ...s, pages: s.pages.filter((_, j) => j !== i) }));
    setSel(null); setCurPage(0);
  }
  function autoArrange() {
    const pi = Math.min(curPage, sheetRef.current.pages.length - 1);
    mutate((s) => ({
      ...s,
      pages: s.pages.map((p, i) => {
        if (i !== pi) return p;
        let y = margin;
        const sorted = [...p.blocks].sort((a, b) => a.y - b.y || a.x - b.x);
        const ys = new Map(sorted.map((b) => { const r = [b.id, y] as const; y += b.h + 14; return r; }));
        return { ...p, blocks: p.blocks.map((b) => ({ ...b, y: ys.get(b.id) ?? b.y })) };
      }),
    }));
  }

  // ---- dragging and resizing -----------------------------------------------------------------------------------------
  function startDrag(e: React.PointerEvent, b: Block, pi: number, mode: "move" | "e" | "s" | "se") {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (mode !== "move") e.preventDefault();
    setSel(b.id); setCurPage(pi);
    snapshot();
    const sx = e.clientX, sy = e.clientY;
    const o = { x: b.x, y: b.y, w: b.w, h: b.h };
    const s0 = sheetRef.current;
    const others = s0.pages[pi].blocks.filter((x) => x.id !== b.id);
    const tx = [margin, W / 2, W - margin, ...others.flatMap((x) => [x.x, x.x + x.w / 2, x.x + x.w])];
    const ty = [margin, H - margin, ...others.flatMap((x) => [x.y, x.y + x.h / 2, x.y + x.h])];
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / zoomRef.current, dy = (ev.clientY - sy) / zoomRef.current;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return;
      moved = true;
      const g = sheetRef.current.snap ? sheetRef.current.grid : 1;
      const guides: Guide[] = [];
      let { x, y, w, h } = o;
      if (mode === "move") {
        x = Math.round((o.x + dx) / g) * g; y = Math.round((o.y + dy) / g) * g;
        if (sheetRef.current.snap) {
          const sxn = snapAxis(x, w, tx), syn = snapAxis(y, h, ty);
          if (sxn) { x += sxn.d; guides.push({ page: pi, x: sxn.t }); }
          if (syn) { y += syn.d; guides.push({ page: pi, y: syn.t }); }
        }
      } else {
        if (mode === "e" || mode === "se") {
          w = Math.max(24, Math.round((o.x + o.w + dx) / g) * g - o.x);
          if (sheetRef.current.snap) { const r = snapAxis(o.x + w, 0, tx); if (r) { w += r.d; guides.push({ page: pi, x: r.t }); } }
        }
        if (mode === "s" || mode === "se") {
          h = Math.max(8, Math.round((o.y + o.h + dy) / g) * g - o.y);
          if (sheetRef.current.snap) { const r = snapAxis(o.y + h, 0, ty); if (r) { h += r.d; guides.push({ page: pi, y: r.t }); } }
        }
      }
      updateBlock(b.id, clampPos({ x, y, w, h }), false);
      setGuideLines(guides);
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); setGuideLines([]); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  }

  // ---- pictures: paste (Ctrl+V) or drop a file onto the page --------------------------------------------------------
  async function addImage(file: File, at?: { page: number; x: number; y: number }) {
    try {
      setNotice("");
      const { src, w, h } = await imageToDataUrl(file);
      const cur = locate(sheetRef.current, sel);
      // If an empty picture block is selected, fill it; otherwise make a new picture block.
      if (!at && cur && cur.block.type === "image" && !cur.block.props.src) {
        const k = Math.min(1, cur.block.w / w);
        updateBlock(cur.block.id, (b) => ({ ...b, h: Math.round(h * k), props: { ...b.props, src } }));
        return;
      }
      const maxW = Math.min(420, W - margin * 2), k = Math.min(1, maxW / w);
      const bw = Math.round(w * k), bh = Math.round(h * k);
      const page = at?.page ?? Math.min(curPage, sheetRef.current.pages.length - 1);
      const b = newBlock("image", margin, margin);
      b.w = bw; b.h = bh; b.fit = undefined; b.props = { ...b.props, src };
      let pg = page;
      mutate((s) => {
        let pages = s.pages;
        const g = s.snap ? s.grid : 1;
        if (at) { b.x = Math.round(at.x / g) * g; b.y = Math.round(at.y / g) * g; }
        else {
          const blocks = pages[page].blocks;
          const bottom = blocks.length ? Math.max(...blocks.map((x) => x.y + x.h)) + 14 : margin;
          if (blocks.length && bottom + b.h > H - margin) { pages = [...pages, { blocks: [] }]; pg = pages.length - 1; b.y = margin; } else b.y = bottom;
        }
        b.x = Math.max(0, Math.min(b.x, W - margin - b.w));
        Object.assign(b, clampPos(b));
        return { ...s, pages: pages.map((p, i) => (i === pg ? { ...p, blocks: [...p.blocks, b] } : p)) };
      });
      setSel(b.id); setCurPage(pg);
    } catch (e) { setNotice((e as Error).message); }
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const f = Array.from(e.clipboardData?.files ?? []).find(isImageFile);
      if (!f) return;
      e.preventDefault();
      addImage(f);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  // ---- keyboard ------------------------------------------------------------------------------------------------------
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); deleteSelected(); }
      else if (sel && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? sheetRef.current.grid : 1;
        const loc = locate(sheetRef.current, sel);
        if (!loc) return;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateBlock(sel, clampPos({ x: loc.block.x + dx, y: loc.block.y + dy, w: loc.block.w, h: loc.block.h }));
      } else if (e.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // ---- keep boxes the right height -----------------------------------------------------------------------------------
  // A box grows when its content is taller than the box. Brand-new blocks (flagged "fit") are also trimmed once
  // so there is no empty space left over from the template's size estimate.
  useEffect(() => {
    const set: Record<string, number> = {};
    const unfit: string[] = [];
    document.querySelectorAll<HTMLElement>("[data-inner]").forEach((n) => {
      const id = n.dataset.inner!;
      const loc = locate(sheetRef.current, id);
      if (!loc) return;
      const need = Math.max(8, Math.ceil(n.offsetHeight));
      if (loc.block.fit) { set[id] = need; unfit.push(id); }
      else if (need > loc.block.h + 1) set[id] = need;
    });
    if (Object.keys(set).length) {
      mutate((s) => ({ ...s, pages: s.pages.map((p) => ({ ...p, blocks: p.blocks.map((b) => (set[b.id] ? { ...b, h: set[b.id], fit: undefined } : b)) })) }), false);
    }
  }, [sheet, showKey, mutate]);

  // ---- autosave ------------------------------------------------------------------------------------------------------
  const save = useCallback(async () => {
    setStatus("saving");
    try {
      await saveItemAction({ uid: itemUid, kind: "worksheet", title: titleRef.current, data: sheetRef.current });
      setStatus("saved");
    } catch {
      setStatus("error"); // for example a very large picture; the work is still on screen
    }
  }, [itemUid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("dirty");
    const t = setTimeout(save, 1000);
    return () => clearTimeout(t);
  }, [sheet, title, save]);

  async function printMode(mode: "student" | "key" | "both") {
    await save();
    window.open(`/worksheets/${itemUid}/print?mode=${mode}`, "_blank");
  }

  const fontFamily = sheet.font === "serif" ? "Georgia, 'Times New Roman', serif" : "system-ui, 'Segoe UI', Arial, sans-serif";
  const groups = useMemo(() => (["Basics", "Chemistry", "Visual"] as const).map((g) => ({ g, types: BLOCK_ORDER.filter((t) => BLOCK_DEFS[t].group === g) })), []);

  return (
    <div className="no-print fixed inset-y-0 right-0 left-0 z-20 flex flex-col bg-slate-100 md:left-60">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <Link href="/worksheets" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="All worksheets"><ArrowLeft className="size-4" /></Link>
        <Input className="w-64 !py-1.5 font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Worksheet name" />
        <span className="text-xs text-slate-400">{status === "saving" ? "Saving…" : status === "dirty" ? "Unsaved…" : status === "error" ? <span className="text-red-600">Could not save. Try a smaller picture.</span> : "Saved"}</span>
        {notice && <span className="text-xs text-red-600">{notice}</span>}
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button variant="ghost" size="sm" onClick={undo} title="Undo (Ctrl+Z)"><Undo2 className="size-4" /></Button>
        <Button variant="ghost" size="sm" onClick={redo} title="Redo (Ctrl+Y)"><Redo2 className="size-4" /></Button>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} title="Zoom out"><ZoomOut className="size-4" /></Button>
        <span className="w-9 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} title="Zoom in"><ZoomIn className="size-4" /></Button>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <Button variant={sheet.snap ? "secondary" : "ghost"} size="sm" onClick={() => mutate((s) => ({ ...s, snap: !s.snap }), false)} title="Snap to grid and to other blocks"><Grid3x3 className="size-4" /> Snap {sheet.snap ? "on" : "off"}</Button>
        <Button variant={marginGuides ? "secondary" : "ghost"} size="sm" onClick={() => setMarginGuides((v) => !v)} title="Show page margins"><Eye className="size-4" /> Margins</Button>
        <Button variant={showKey ? "primary" : "secondary"} size="sm" onClick={() => setShowKey((v) => !v)} title="Show or hide the answer key on the page"><KeyRound className="size-4" /> Answer key</Button>
        <Button variant="secondary" size="sm" onClick={autoArrange} title="Stack the blocks on this page neatly from top to bottom"><LayoutTemplate className="size-4" /> Tidy up</Button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" /> Page setup</Button>
          <div className="group relative">
            <Button size="sm"><Printer className="size-4" /> Print</Button>
            <div className="invisible absolute right-0 z-30 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg group-focus-within:visible group-hover:visible">
              {([["student", "Student copy"], ["key", "Answer key"], ["both", "Both (copy, then key)"]] as const).map(([m, l]) => (
                <button key={m} onClick={() => printMode(m)} className="block w-full rounded-md px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100">{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* palette */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3">
          <p className="mb-3 text-[11px] leading-snug text-slate-500">Click a block to add it, or drag it onto the page.</p>
          {groups.map(({ g, types }) => (
            <div key={g} className="mb-4">
              <div className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</div>
              <div className="space-y-1">
                {types.map((t) => (
                  <button key={t} draggable onDragStart={(e) => e.dataTransfer.setData("text/ws-block", t)} onClick={() => addBlock(t)} title={BLOCK_DEFS[t].hint}
                    className="block w-full cursor-grab rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-left text-sm text-slate-700 hover:border-brand-500 hover:bg-brand-50">
                    {BLOCK_DEFS[t].label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* paper */}
        <div className="min-w-0 flex-1 overflow-auto p-6" onPointerDown={(e) => { if (e.target === e.currentTarget) setSel(null); }}>
          {sheet.pages.map((page, pi) => (
            <div key={pi} className="mx-auto mb-8" style={{ width: W * zoom }}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>Page {pi + 1}</span>
                {sheet.pages.length > 1 && <button className="inline-flex items-center gap-1 text-red-500 hover:underline" onClick={() => deletePage(pi)}><Trash2 className="size-3" /> Delete page</button>}
              </div>
              <div style={{ width: W * zoom, height: H * zoom, position: "relative" }}>
                <div
                  className="keep-colors"
                  style={{
                    position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${zoom})`, transformOrigin: "top left",
                    background: "#fff", boxShadow: "0 1px 6px rgba(0,0,0,.18)", fontFamily, fontSize: 13, lineHeight: 1.4, color: "#111",
                    ...(sheet.snap ? { backgroundImage: "radial-gradient(#d4d4d8 1px, transparent 1px)", backgroundSize: `${sheet.grid * 4}px ${sheet.grid * 4}px`, backgroundPosition: "0 0" } : {}),
                  }}
                  onPointerDown={(e) => { if (e.target === e.currentTarget) { setSel(null); setCurPage(pi); } }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    const at = { page: pi, x: (e.clientX - r.left) / zoom, y: (e.clientY - r.top) / zoom };
                    const file = Array.from(e.dataTransfer.files ?? []).find(isImageFile);
                    if (file) { e.preventDefault(); addImage(file, at); return; }
                    const t = e.dataTransfer.getData("text/ws-block") as BlockType;
                    if (!BLOCK_DEFS[t]) return;
                    e.preventDefault();
                    addBlock(t, at);
                  }}
                >
                  {marginGuides && <div style={{ position: "absolute", left: margin, top: margin, right: margin, bottom: margin, border: "1px dashed #cbd5e1", pointerEvents: "none" }} />}
                  {page.blocks.map((b) => {
                    const on = b.id === sel;
                    return (
                      <div key={b.id} className="ws-block" onPointerDown={(e) => startDrag(e, b, pi, "move")}
                        style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h, cursor: "move", outline: on ? "2px solid var(--color-brand-600)" : b.y + b.h > H ? "1.5px dashed #dc2626" : undefined, outlineOffset: 1 }}>
                        <div data-inner={b.id} style={{ width: "100%" }}><BlockView block={b} showKey={showKey} editing /></div>
                        {on && (<>
                          <div onPointerDown={(e) => startDrag(e, b, pi, "e")} style={{ position: "absolute", right: -5, top: "50%", width: 9, height: 22, marginTop: -11, background: "var(--color-brand-600)", borderRadius: 3, cursor: "ew-resize" }} />
                          <div onPointerDown={(e) => startDrag(e, b, pi, "s")} style={{ position: "absolute", bottom: -5, left: "50%", width: 22, height: 9, marginLeft: -11, background: "var(--color-brand-600)", borderRadius: 3, cursor: "ns-resize" }} />
                          <div onPointerDown={(e) => startDrag(e, b, pi, "se")} style={{ position: "absolute", right: -6, bottom: -6, width: 12, height: 12, background: "var(--color-brand-600)", borderRadius: 3, cursor: "nwse-resize" }} />
                        </>)}
                      </div>
                    );
                  })}
                  {guideLines.filter((g) => g.page === pi).map((g, i) => (
                    <div key={i} style={{ position: "absolute", background: "#ec4899", pointerEvents: "none", ...(g.x !== undefined ? { left: g.x, top: 0, bottom: 0, width: 1 } : { top: g.y, left: 0, right: 0, height: 1 }) }} />
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div className="mx-auto mb-10 flex justify-center"><Button variant="secondary" onClick={addPage}><FilePlus2 className="size-4" /> Add page</Button></div>
        </div>

        {/* inspector */}
        <aside className="w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white">
          {selected ? (
            <Inspector block={selected.block} pageCount={sheet.pages.length} pageIndex={selected.pi} grid={sheet.grid}
              onProps={(p) => updateProps(selected.block.id, p)} onGeom={(p) => updateBlock(selected.block.id, p)}
              onDelete={deleteSelected} onDuplicate={duplicateSelected} onZ={reorder} onAlign={align} onFit={() => fitHeight(selected.block.id)} onMovePage={movePage} />
          ) : (
            <div className="space-y-3 p-4 text-sm text-slate-600">
              <div className="font-semibold text-slate-900">Nothing selected</div>
              <p>Click any block on the page to edit it here.</p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-slate-500">
                <li>Drag a block to move it. Pink lines show when it lines up with something.</li>
                <li>Drag the purple handles to resize.</li>
                <li>Arrow keys nudge by 1 pixel (hold Shift for one grid step).</li>
                <li>Ctrl+D copies, Delete removes, Ctrl+Z undoes.</li>
                <li>Type formulas normally: H2SO4 becomes H₂SO₄.</li>
                <li>Copy a picture and press Ctrl+V to add it, or drag an image file onto the page.</li>
                <li>Turn on <b>Answer key</b> to see and print the key.</li>
              </ul>
            </div>
          )}
        </aside>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Page setup" footer={<Button onClick={() => setSettingsOpen(false)}>Done</Button>}>
        <div className="space-y-4">
          <label className="block"><span className="text-sm font-medium text-slate-800">Paper</span>
            <Select className="mt-1" value={sheet.paper} onChange={(e) => mutate((s) => ({ ...s, paper: e.target.value as Sheet["paper"] }))}><option value="letter">Letter (8.5 × 11 in)</option><option value="a4">A4</option></Select></label>
          <label className="block"><span className="text-sm font-medium text-slate-800">Font</span>
            <Select className="mt-1" value={sheet.font} onChange={(e) => mutate((s) => ({ ...s, font: e.target.value as Sheet["font"] }))}><option value="sans">Clean sans-serif</option><option value="serif">Classic serif</option></Select></label>
          <label className="block"><span className="text-sm font-medium text-slate-800">Margin (pixels, 96 = 1 inch)</span>
            <Input className="mt-1" type="number" min={0} max={200} value={sheet.margin} onChange={(e) => mutate((s) => ({ ...s, margin: Number(e.target.value) }))} /></label>
          <label className="block"><span className="text-sm font-medium text-slate-800">Snap grid size</span>
            <Select className="mt-1" value={sheet.grid} onChange={(e) => mutate((s) => ({ ...s, grid: Number(e.target.value) }))}>{[4, 8, 12, 16, 24].map((g) => <option key={g} value={g}>{g} px</option>)}</Select></label>
          <label className="block"><span className="text-sm font-medium text-slate-800">Unit</span>
            <Input className="mt-1" list="ws-units" placeholder="Unit 5: The Mole" value={sheet.unit ?? ""} onChange={(e) => mutate((s) => ({ ...s, unit: e.target.value }))} />
            <datalist id="ws-units">{unitSuggestions.map((u) => <option key={u} value={u} />)}</datalist>
            <span className="text-xs text-slate-500">Used to organize worksheets and to share a whole unit. Suggestions come from your pacing guides.</span></label>
          <label className="block"><span className="text-sm font-medium text-slate-800">Course</span>
            <Select className="mt-1" value={sheet.course} onChange={(e) => mutate((s) => ({ ...s, course: e.target.value }))}><option value="">(none)</option>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
        </div>
      </Modal>
    </div>
  );
}
