import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { fmtShort, fmtLong, todayStr } from "@/lib/dates";
import { PrintButton } from "@/components/PrintButton";
import type { Guide } from "@/lib/pacing";

export const dynamic = "force-dynamic";

export default async function PrintPacing({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "pacing") notFound();
  const s = getSettings();
  const g = item.data as Guide;
  return (
    <>
      <style>{`@page { size: ${s.print.paper === "a4" ? "A4" : "letter"} landscape; margin: 0.5in; }`}</style>
      <div className="no-print mb-4 flex items-center gap-3"><Link href={`/pacing/${uid}`} className="text-sm text-slate-500 hover:text-brand-600">← Back</Link><PrintButton /></div>
      {s.print.headerText && <div className="text-xs text-slate-500">{s.print.headerText}</div>}
      <h1 className="text-2xl font-bold text-slate-900">{item.title}</h1>
      <div className="mb-3 text-sm text-slate-600">{g.course}{s.schoolYear ? ` · ${s.schoolYear}` : ""}</div>
      <table className="w-full border-collapse text-[13px]">
        <thead><tr className="bg-slate-100 text-left">{["Unit", "Dates", "Days", "Topics", "Standards", "Assessments"].map((h) => <th key={h} className="border border-slate-400 px-2 py-1.5">{h}</th>)}</tr></thead>
        <tbody>
          {g.units.map((u) => (
            <tr key={u.id} className="break-inside-avoid align-top">
              <td className="border border-slate-400 px-2 py-1.5 font-semibold" style={{ borderLeft: `6px solid ${u.color}` }}>{u.title}</td>
              <td className="whitespace-nowrap border border-slate-400 px-2 py-1.5">{u.start ? `${fmtShort(u.start)} – ${fmtShort(u.end)}` : ""}</td>
              <td className="border border-slate-400 px-2 py-1.5 text-center">{u.days}</td>
              <td className="whitespace-pre-wrap border border-slate-400 px-2 py-1.5">{u.topics}</td>
              <td className="whitespace-pre-wrap border border-slate-400 px-2 py-1.5">{u.standards}</td>
              <td className="whitespace-pre-wrap border border-slate-400 px-2 py-1.5">{u.assessments}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 text-xs text-slate-400">{s.print.footerText}{s.print.showDate ? `  Printed ${fmtLong(todayStr())}` : ""}</div>
    </>
  );
}
