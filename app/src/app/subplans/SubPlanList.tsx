"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Copy, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { Button, Card, EmptyState, Input, Select } from "@/components/ui";
import { deleteItemAction, duplicateItemAction, getItemAction, saveItemAction } from "@/lib/storeActions";
import { fmtShort, todayStr } from "@/lib/dates";
import { defaultBlocks, syncRows, type Bell, type SubPlan } from "@/lib/subplan";

type Row = { uid: string; title: string; date: string; bell: string; updatedAt: string };
type BellItem = { uid: string; title: string; data: Bell };

export function SubPlanList({ items, bells }: { items: Row[]; bells: BellItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayStr());
  const [bellId, setBellId] = useState(bells.find((b) => b.data.isDefault)?.uid ?? bells[0]?.uid ?? "");
  const [from, setFrom] = useState("standard");
  const [show, setShow] = useState("upcoming");
  const today = todayStr();

  async function create() {
    const bell = bells.find((b) => b.uid === bellId);
    let data: SubPlan;
    if (from === "standard") {
      data = { date, bellId, blocks: defaultBlocks() };
    } else {
      const src = await getItemAction(from);
      const old = (src?.data ?? { blocks: [] }) as SubPlan;
      data = { date, bellId, blocks: JSON.parse(JSON.stringify(old.blocks ?? [])) };
    }
    if (bell) data.blocks = data.blocks.map((b) => (b.type === "day" ? { ...b, props: { ...b.props, rows: syncRows(bell.data, b.props.rows ?? []) } } : b));
    const uid = await saveItemAction({ kind: "subplan", title: title.trim() || "Sub plans", data });
    router.push(`/subplans/${uid}`);
  }
  const shown = items.filter((i) => show === "all" || (show === "upcoming" ? !i.date || i.date >= today : i.date && i.date < today))
    .sort((a, b) => (show === "past" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select className="!w-40" value={show} onChange={(e) => setShow(e.target.value)}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All</option></Select>
        <Link href="/bell-schedules" className="text-sm text-brand-600 hover:underline">Bell schedules</Link>
        <Button className="ml-auto" onClick={() => setOpen(true)}><Plus className="size-4" /> New sub plan</Button>
      </div>
      {shown.length === 0 ? <Card><EmptyState icon={ClipboardList} title={items.length ? "Nothing in this view" : "No sub plans yet"} description="Create one for a day you will be out. You can copy an earlier plan to save time." action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New sub plan</Button>} /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <Card key={i.uid} className="p-4">
              <Link href={`/subplans/${i.uid}`} className="block font-medium text-slate-900 hover:text-brand-600">{i.title || "Sub plans"}</Link>
              <div className="mt-1 text-xs text-slate-500">{i.date ? fmtShort(i.date) : "No date"}{i.bell ? ` · ${i.bell}` : ""}</div>
              <div className="mt-3 flex gap-1">
                <Link href={`/subplans/${i.uid}`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50">Open</Link>
                <Link href={`/subplans/${i.uid}/print`} className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">Print</Link>
                <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" title="Duplicate" onClick={async () => { await duplicateItemAction(i.uid); router.refresh(); }}><Copy className="size-4" /></button>
                <button className="ml-auto rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete" onClick={async () => { if (window.confirm(`Delete "${i.title}"?`)) { await deleteItemAction(i.uid); router.refresh(); } }}><Trash2 className="size-4" /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="New sub plan" footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></>}>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-800">Title<Input autoFocus className="mt-1" placeholder="Sub plans for Friday" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-800">Date<Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="block text-sm font-medium text-slate-800">Bell schedule
              <Select className="mt-1" value={bellId} onChange={(e) => setBellId(e.target.value)}>{bells.length === 0 && <option value="">(none yet)</option>}{bells.map((b) => <option key={b.uid} value={b.uid}>{b.title}</option>)}</Select></label>
          </div>
          {bells.length === 0 && <p className="text-xs text-amber-700">You have no bell schedules yet. <Link href="/bell-schedules" className="underline">Create one</Link> first so the day fills in for you.</p>}
          <label className="block text-sm font-medium text-slate-800">Start from
            <Select className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
              <option value="standard">Standard sections (attendance, behavior, emergency...)</option>
              {items.map((i) => <option key={i.uid} value={i.uid}>A copy of: {i.title}{i.date ? ` (${fmtShort(i.date)})` : ""}</option>)}
            </Select></label>
        </div>
      </Modal>
    </>
  );
}
