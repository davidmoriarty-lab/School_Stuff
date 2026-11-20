"use client";
// A list of saved items (lesson plans, pacing guides) with a "New" pop-up, duplicate and delete.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2, type LucideIcon } from "lucide-react";
import { Modal } from "./Modal";
import { Button, Card, EmptyState, Input, Select } from "./ui";
import { deleteItemAction, duplicateItemAction, saveItemAction } from "@/lib/storeActions";
import { todayStr } from "@/lib/dates";

type Row = { uid: string; title: string; meta: string; updatedAt: string };

export function SimpleList({ kind, base, items, courses, noun, icon: Icon, sections }: {
  kind: "lesson" | "pacing"; base: string; items: Row[]; courses: string[]; noun: string; icon: LucideIcon; sections?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState(courses[0] ?? "");
  const [date, setDate] = useState(todayStr());
  const [q, setQ] = useState("");

  async function create() {
    const data = kind === "lesson"
      ? { course, unit: "", date, duration: 50, periods: "", sections: {}, attachments: [] }
      : { course, startDate: date, skipWeekends: true, units: [] };
    const uid = await saveItemAction({ kind, title: title.trim() || `New ${noun}`, data });
    router.push(`${base}/${uid}`);
  }
  const shown = items.filter((i) => (i.title + " " + i.meta).toLowerCase().includes(q.toLowerCase()));
  void sections;
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input className="!w-64" placeholder={`Search ${noun}s`} value={q} onChange={(e) => setQ(e.target.value)} />
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" /> New {noun}</Button>
      </div>
      {shown.length === 0 ? <Card><EmptyState icon={Icon} title={items.length ? "No matches" : `No ${noun}s yet`} description={`Create your first ${noun}.`} action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New {noun}</Button>} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <Card key={i.uid} className="p-4">
              <Link href={`${base}/${i.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{i.title || "Untitled"}</Link>
              <div className="mt-1 text-xs text-slate-500">{i.meta}</div>
              <div className="mt-3 flex gap-1">
                <Link href={`${base}/${i.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Open</Link>
                <Link href={`${base}/${i.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(i.uid); router.refresh(); }}><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm(`Delete "${i.title}"?`)) { await deleteItemAction(i.uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={`New ${noun}`} footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">Title<Input autoFocus className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "lesson" ? "Intro to the mole" : "Honors Chemistry 2026-27"} /></label>
          <label className="block text-sm font-medium text-slate-800">Course<Select className="mt-1" value={course} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c}>{c}</option>)}</Select></label>
          <label className="block text-sm font-medium text-slate-800">{kind === "lesson" ? "Date" : "First day of the guide"}<Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
      </Modal>
    </>
  );
}
