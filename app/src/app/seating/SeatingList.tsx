"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, LayoutGrid, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { PRESETS, emptyChart } from "@/lib/seating";

type Row = { uid: string; title: string; section: string; seated: number; updatedAt: string };

export function SeatingList({ items, sections }: { items: Row[]; sections: { id: number; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [sectionId, setSectionId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function create(presetId: string) {
    setBusy(true);
    const c = emptyChart(sectionId ? Number(sectionId) : null);
    c.objs = PRESETS.find((p) => p.id === presetId)!.build(c);
    const sec = sections.find((s) => String(s.id) === sectionId)?.name;
    const uid = await saveItemAction({ kind: "seating", title: name.trim() || (sec ? `${sec} seating` : "New seating chart"), data: c });
    router.push(`/seating/${uid}`);
  }
  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="size-4" /> New seating chart</Button></div>
      {items.length === 0 ? <Card><EmptyState icon={LayoutGrid} title="No seating charts yet" description="Pick a layout (rows, pairs, groups of four, horseshoe or lab benches) and seat a class." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New seating chart</Button>} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.uid} className="p-4">
              <Link href={`/seating/${c.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{c.title}</Link>
              <div className="mt-1 text-xs text-slate-500">{c.section || "No class chosen"} · {c.seated} seated</div>
              <div className="mt-3 flex gap-1">
                <Link href={`/seating/${c.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</Link>
                <Link href={`/seating/${c.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={async () => { await duplicateItemAction(c.uid); router.refresh(); }} title="Duplicate"><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" onClick={async () => { if (window.confirm(`Delete "${c.title}"?`)) { await deleteItemAction(c.uid); router.refresh(); } }} title="Delete"><Trash2 className="size-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} wide title="New seating chart">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">Name<Input className="mt-1" placeholder="Period 3 seating" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm font-medium text-slate-800">Class
            <Select className="mt-1" value={sectionId} onChange={(e) => setSectionId(e.target.value)}><option value="">Choose later…</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></label>
        </div>
        {sections.length === 0 && <p className="mb-3 text-xs text-slate-500">No classes yet. Import rosters under Gradebook → Rosters and they will show up here.</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button key={p.id} disabled={busy} onClick={() => create(p.id)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50">
              <div className="text-sm font-semibold text-slate-900">{p.label}</div><div className="text-xs text-slate-500">{p.hint}</div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
