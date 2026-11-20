"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, PencilRuler, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { TEMPLATES } from "@/lib/worksheet";

type Row = { uid: string; title: string; updatedAt: string; blocks: number; pages: number; course: string; unit: string };

export function WorksheetList({ items, courses, paper }: { items: Row[]; courses: string[]; paper: "letter" | "a4" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [courseF, setCourseF] = useState("");
  const [unitF, setUnitF] = useState("");
  const [sort, setSort] = useState("recent");
  const [group, setGroup] = useState("course");
  const [name, setName] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [busy, setBusy] = useState(false);

  const courses2 = [...new Set(items.map((i) => i.course).filter(Boolean))].sort();
  const units2 = [...new Set(items.filter((i) => !courseF || i.course === courseF).map((i) => i.unit).filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const needle = q.trim().toLowerCase();
  const shown = items
    .filter((w) => (!courseF || w.course === courseF) && (!unitF || w.unit === unitF) && (!needle || `${w.title} ${w.course} ${w.unit}`.toLowerCase().includes(needle)))
    .sort((a, b) => sort === "name" ? a.title.localeCompare(b.title, undefined, { numeric: true })
      : sort === "course" ? a.course.localeCompare(b.course) || a.unit.localeCompare(b.unit, undefined, { numeric: true }) || a.title.localeCompare(b.title, undefined, { numeric: true })
      : b.updatedAt.localeCompare(a.updatedAt));
  const key = (w: Row) => (group === "course" ? w.course || "No course" : w.unit || "No unit");
  const groups = group === "none" ? [{ name: "", list: shown }]
    : [...new Set(shown.map(key))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map((name) => ({ name, list: shown.filter((w) => key(w) === name) }));

  async function create(templateId: string) {
    const t = TEMPLATES.find((x) => x.id === templateId)!;
    setBusy(true);
    const uid = await saveItemAction({ kind: "worksheet", title: name.trim() || t.label, data: t.build(course, paper) });
    router.push(`/worksheets/${uid}`);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input className="!w-60" placeholder="Search name, course or unit" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="!w-44" value={courseF} onChange={(e) => { setCourseF(e.target.value); setUnitF(""); }}><option value="">All courses</option>{courses2.map((c) => <option key={c}>{c}</option>)}</Select>
        <Select className="!w-48" value={unitF} onChange={(e) => setUnitF(e.target.value)}><option value="">All units</option>{units2.map((u) => <option key={u}>{u}</option>)}</Select>
        <Select className="!w-44" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Recently edited</option><option value="name">Name A to Z</option><option value="course">Course, unit, name</option></Select>
        <Select className="!w-40" value={group} onChange={(e) => setGroup(e.target.value)}><option value="course">Group by course</option><option value="unit">Group by unit</option><option value="none">No grouping</option></Select>
        {(q || courseF || unitF) && <button className="text-sm text-slate-500 hover:text-brand-600" onClick={() => { setQ(""); setCourseF(""); setUnitF(""); }}>Clear filters</button>}
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" /> New worksheet</Button>
      </div>
      <p className="mb-3 text-xs text-slate-500">{shown.length} of {items.length} worksheets</p>
      {items.length === 0 ? (
        <Card><EmptyState icon={PencilRuler} title="No worksheets yet" description="Start from a chemistry template (balancing equations, molar mass, naming, stoichiometry) or a blank page." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New worksheet</Button>} /></Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.name}>
              {g.name && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.name} <span className="font-normal normal-case text-slate-400">({g.list.length})</span></h2>}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.list.map((w) => (
            <Card key={w.uid} className="p-4">
              <Link href={`/worksheets/${w.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{w.title || "Untitled"}</Link>
              <div className="mt-1 text-xs text-slate-500">{[w.course, w.unit].filter(Boolean).join(" · ") || "No course or unit"}</div>
              <div className="text-xs text-slate-400">{w.pages} page{w.pages === 1 ? "" : "s"} · {w.blocks} blocks · edited {w.updatedAt.slice(0, 10)}</div>
              <div className="mt-3 flex gap-1">
                <Link href={`/worksheets/${w.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</Link>
                <Link href={`/worksheets/${w.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(w.uid); router.refresh(); }}><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm(`Delete "${w.title}"?`)) { await deleteItemAction(w.uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
              </div>
            </Card>
                ))}
              </div>
            </section>
          ))}
          {shown.length === 0 && <Card className="p-8 text-center text-sm text-slate-500">No worksheets match those filters.</Card>}
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
