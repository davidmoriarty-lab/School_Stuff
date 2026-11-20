import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { getStudents } from "@/lib/roster";
import { emptyChart, type Chart } from "@/lib/seating";
import { ChartView } from "@/components/seating/ChartView";
import { PrintButton } from "@/components/PrintButton";
import { fmtLong, todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PrintSeating({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "seating") notFound();
  const chart = { ...emptyChart(), ...(item.data as Partial<Chart>) } as Chart;
  const s = getSettings();
  const students = new Map(getStudents().map((x) => [x.id, x]));
  const landscapeW = s.print.paper === "a4" ? 1000 : 1010;
  const scale = Math.min(1, landscapeW / chart.w);
  return (
    <>
      <style>{`@page { size: ${s.print.paper === "a4" ? "A4" : "letter"} landscape; margin: 0.4in; }`}</style>
      <div className="no-print mb-4 flex items-center gap-3">
        <Link href={`/seating/${uid}`} className="text-sm text-slate-500 hover:text-brand-600">← Back to editor</Link>
        <PrintButton />
      </div>
      <div style={{ width: chart.w * scale }}>
        <div className="mb-2 flex items-baseline justify-between"><h1 className="text-xl font-bold">{item.title}</h1><span className="text-xs text-slate-500">{s.print.showDate ? fmtLong(todayStr()) : ""}</span></div>
        {s.print.headerText && <div className="mb-1 text-xs text-slate-500">{s.print.headerText}</div>}
        <div style={{ width: chart.w * scale, height: chart.h * scale, border: "1px solid #94a3b8" }} className="keep-colors"><ChartView chart={chart} students={students} scale={scale} /></div>
        {chart.note && <p className="mt-2 text-sm">{chart.note}</p>}
        {s.print.footerText && <div className="mt-2 text-xs text-slate-500">{s.print.footerText}</div>}
      </div>
    </>
  );
}
