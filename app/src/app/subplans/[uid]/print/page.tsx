import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { PrintButton } from "@/components/PrintButton";
import { fmtLong, todayStr } from "@/lib/dates";
import { fmtTime, type DayRow, type SubBlock, type SubPlan } from "@/lib/subplan";

export const dynamic = "force-dynamic";

const th = "border border-slate-400 bg-slate-100 px-2 py-1 text-left";
const td = "border border-slate-400 px-2 py-1 align-top";

export default async function PrintSubPlan({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "subplan") notFound();
  const s = getSettings();
  const plan = item.data as SubPlan;
  const blocks = (plan.blocks ?? []).filter((b) => !b.hidden);
  const worksheetIds = new Set<string>();
  for (const b of plan.blocks ?? []) {
    if (b.hidden) continue;
    if (b.type === "day") for (const r of (b.props.rows ?? []) as DayRow[]) if (r.worksheet) worksheetIds.add(r.worksheet);
    if (b.type === "materials") for (const m of b.props.items ?? []) if (m.kind === "worksheet" && m.ref) worksheetIds.add(m.ref);
  }
  const sheets = [...worksheetIds].map((id) => getItem(id)).filter(Boolean);
  const titleOf = (id: string) => getItem(id)?.title ?? "";

  const render = (b: SubBlock) => {
    const p = b.props;
    switch (b.type) {
      case "info": {
        const cells = ([["Teacher", p.teacher || s.teacherName], ["Room", p.room], ["Phone", p.phone], ["Neighbor teacher", p.buddy], ["Office", p.office]] as const).filter(([, v]) => v);
        if (!cells.length && !p.extra) return null;
        return <div className="text-sm"><div className="grid grid-cols-2 gap-x-6 gap-y-0.5">{cells.map(([l, v]) => <div key={l}><b>{l}:</b> {v}</div>)}</div>{p.extra && <div className="mt-1 whitespace-pre-wrap">{p.extra}</div>}</div>;
      }
      case "day": {
        const rows = ((p.rows ?? []) as DayRow[]);
        if (!rows.length) return null;
        return (
          <table className="w-full border-collapse text-[13px]">
            <thead><tr><th className={th + " w-28"}>Time</th><th className={th + " w-40"}>Class</th><th className={th}>What we are doing</th><th className={th + " w-48"}>Materials</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="break-inside-avoid">
                  <td className={td + " whitespace-nowrap"}><b>{r.label}</b><div className="text-xs text-slate-600">{fmtTime(r.start)}{r.end ? ` to ${fmtTime(r.end)}` : ""}</div></td>
                  <td className={td}>{r.course}</td>
                  <td className={td + " whitespace-pre-wrap"}>{r.plan}</td>
                  <td className={td + " whitespace-pre-wrap"}>{[r.worksheet ? `${titleOf(r.worksheet)}${r.copies ? ` (${r.copies} copies)` : ""}` : "", r.materials].filter(Boolean).join("\n")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }
      case "text": return p.body?.trim() ? <div className="whitespace-pre-wrap text-sm">{p.body}</div> : null;
      case "checklist": { const it = (p.items ?? []).filter((x: string) => x.trim()); return it.length ? <ul className="space-y-0.5 text-sm">{it.map((x: string, i: number) => <li key={i}>☐ {x}</li>)}</ul> : null; }
      case "materials": {
        const it = (p.items ?? []).filter((m: { ref: string; label: string }) => m.ref || m.label);
        return it.length ? <table className="w-full border-collapse text-sm"><tbody>{it.map((m: { kind: string; ref: string; label: string; copies: string }, i: number) => <tr key={i}><td className={td}>{m.kind === "worksheet" ? titleOf(m.ref) || m.label : m.label}</td><td className={td + " w-28"}>{m.copies ? `${m.copies} copies` : ""}</td></tr>)}</tbody></table> : null;
      }
      case "contacts": {
        const rows = (p.rows ?? []).filter((r: { name: string; role: string; where: string }) => r.name || r.role || r.where);
        return rows.length ? <table className="w-full border-collapse text-sm"><tbody>{rows.map((r: { name: string; role: string; where: string }, i: number) => <tr key={i}><td className={td + " font-semibold"}>{r.name}</td><td className={td}>{r.role}</td><td className={td}>{r.where}</td></tr>)}</tbody></table> : null;
      }
      case "lines": return <div>{Array.from({ length: Number(p.count ?? 6) }).map((_, i) => <div key={i} style={{ height: 28, borderBottom: "1px solid #555" }} />)}</div>;
    }
  };

  return (
    <>
      <style>{`@page { size: ${s.print.paper === "a4" ? "A4" : "letter"}; margin: 0.6in; }`}</style>
      <div className="no-print mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3"><Link href={`/subplans/${uid}`} className="text-sm text-slate-500 hover:text-brand-600">← Back to the sub plan</Link><div className="ml-auto"><PrintButton /></div></div>
        {sheets.length > 0 && (
          <div className="mt-3 text-sm"><div className="text-xs font-medium text-slate-600">Worksheets this plan uses (print the copies separately):</div>
            <div className="mt-1 flex flex-wrap gap-2">{sheets.map((w) => <Link key={w!.uid} href={`/worksheets/${w!.uid}/print`} target="_blank" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-brand-700 hover:bg-brand-50">{w!.title}</Link>)}</div></div>
        )}
        <p className="mt-2 text-xs text-slate-400">Sections you hid in the editor are left off. Rosters print from Student profiles.</p>
      </div>
      <article className="mx-auto max-w-3xl text-slate-900">
        {s.print.headerText && <div className="text-xs text-slate-500">{s.print.headerText}</div>}
        <div className="flex items-baseline justify-between border-b-2 border-slate-900 pb-1">
          <h1 className="text-2xl font-bold">{item.title || "Sub plans"}</h1>
          <div className="text-sm text-slate-600">{plan.date ? fmtLong(plan.date) : ""}</div>
        </div>
        <div className="mt-3 space-y-4">
          {blocks.map((b) => { const c = render(b); return c ? (
            <section key={b.id} className={b.type === "day" ? "" : "break-inside-avoid"}>
              <h2 className="mb-1 border-b border-slate-300 text-sm font-semibold uppercase tracking-wide text-slate-700">{b.title}</h2>
              {c}
            </section>
          ) : null; })}
        </div>
        <footer className="mt-6 text-[11px] text-slate-400">{s.print.footerText}{s.print.showDate ? `  Printed ${fmtLong(todayStr())}` : ""}</footer>
      </article>
    </>
  );
}
