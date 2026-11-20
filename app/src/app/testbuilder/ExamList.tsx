"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileCheck2, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { emptyExam } from "@/lib/questions";

type Row = { uid: string; title: string; course: string; unit: string; questions: number; points: number; versions: number; updatedAt: string };

export function ExamList({ items, courses }: { items: Row[]; courses: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [unit, setUnit] = useState("");
  const [versions, setVersions] = useState(2);
  const [q, setQ] = useState("");
  const [courseF, setCourseF] = useState("");

  async function create() {
    const exam = emptyExam(course, unit); exam.options.versions = versions;
    const uid = await saveItemAction({ kind: "exam", title: title.trim() || "New test", data: exam });
    router.push(`/testbuilder/${uid}`);
  }
  const shown = items.filter((i) => (!courseF || i.course === courseF) && `${i.title} ${i.course} ${i.unit}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="!w-60" placeholder="Search tests" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select className="!w-44" value={courseF} onChange={(e) => setCourseF(e.target.value)}><option value="">All courses</option>{[...new Set(items.map((i) => i.course).filter(Boolean))].map((c) => <option key={c}>{c}</option>)}</Select>
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" /> New test</Button>
      </div>
      {shown.length === 0 ? <Card><EmptyState icon={FileCheck2} title={items.length ? "No tests match" : "No tests yet"} description="Create a test, then add questions from your bank. Write questions first in the Question bank, or import the ones that came with your class materials." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New test</Button>} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <Card key={i.uid} className="p-4">
              <Link href={`/testbuilder/${i.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{i.title || "Untitled test"}</Link>
              <div className="mt-1 text-xs text-slate-500">{[i.course, i.unit].filter(Boolean).join(" · ") || "No course or unit"}</div>
              <div className="text-xs text-slate-400">{i.questions} questions · {i.points} points · {i.versions} version{i.versions === 1 ? "" : "s"}</div>
              <div className="mt-3 flex gap-1">
                <Link href={`/testbuilder/${i.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Edit</Link>
                <Link href={`/testbuilder/${i.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(i.uid); router.refresh(); }}><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm(`Delete "${i.title}"?`)) { await deleteItemAction(i.uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New test" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">Title<Input autoFocus className="mt-1" placeholder="Unit 5 Test: The Mole" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-800">Course<Select className="mt-1" value={course} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
            <label className="block text-sm font-medium text-slate-800">Unit<Input className="mt-1" value={unit} onChange={(e) => setUnit(e.target.value)} /></label>
          </div>
          <label className="block text-sm font-medium text-slate-800">How many versions?<Select className="mt-1" value={versions} onChange={(e) => setVersions(Number(e.target.value))}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 1 ? "1 (no shuffling)" : `${n} (A to ${"ABCD"[n - 1]})`}</option>)}</Select></label>
        </div>
      </Modal>
    </>
  );
}
