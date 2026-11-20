"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, PencilRuler, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { TEMPLATES } from "@/lib/worksheet";

type Row = { uid: string; title: string; updatedAt: string; blocks: number; pages: number };

export function WorksheetList({ items, courses, paper }: { items: Row[]; courses: string[]; paper: "letter" | "a4" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [busy, setBusy] = useState(false);

  async function create(templateId: string) {
    const t = TEMPLATES.find((x) => x.id === templateId)!;
    setBusy(true);
    const uid = await saveItemAction({ kind: "worksheet", title: name.trim() || t.label, data: t.build(course, paper) });
    router.push(`/worksheets/${uid}`);
  }

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="size-4" /> New worksheet</Button></div>
      {items.length === 0 ? (
        <Card><EmptyState icon={PencilRuler} title="No worksheets yet" description="Start from a chemistry template (balancing equations, molar mass, naming, stoichiometry) or a blank page." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New worksheet</Button>} /></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <Card key={w.uid} className="p-4">
              <Link href={`/worksheets/${w.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{w.title || "Untitled"}</Link>
              <div className="mt-1 text-xs text-slate-500">{w.pages} page{w.pages === 1 ? "" : "s"} · {w.blocks} blocks · edited {w.updatedAt.slice(0, 10)}</div>
              <div className="mt-3 flex gap-1">
                <Link href={`/worksheets/${w.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</Link>
                <Link href={`/worksheets/${w.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(w.uid); router.refresh(); }}><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm(`Delete "${w.title}"?`)) { await deleteItemAction(w.uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} wide title="New worksheet">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">Name<Input className="mt-1" placeholder="Unit 5 Mole Conversions" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="block text-sm font-medium text-slate-800">Course
            <Select className="mt-1" value={course} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => (
            <button key={t.id} disabled={busy} onClick={() => create(t.id)} className="rounded-lg border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50">
              <div className="text-sm font-semibold text-slate-900">{t.label}</div><div className="text-xs text-slate-500">{t.hint}</div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
