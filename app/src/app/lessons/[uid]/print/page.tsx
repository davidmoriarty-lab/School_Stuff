import Link from "next/link";
import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { fmtLong, todayStr } from "@/lib/dates";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintLesson({ params, searchParams }: { params: Promise<{ uid: string }>; searchParams: Promise<{ skip?: string }> }) {
  const { uid } = await params;
  const skip = new Set(((await searchParams).skip ?? "").split(",").filter(Boolean));
  const item = getItem(uid);
  if (!item || item.kind !== "lesson") notFound();
  const s = getSettings();
  const d = item.data;
  const sections = s.lessonSections.filter((x) => x.enabled && !skip.has(x.id));
  const link = (id: string) => `/lessons/${uid}/print?skip=${[...(skip.has(id) ? [...skip].filter((x) => x !== id) : [...skip, id])].join(",")}`;
  return (
    <>
      <style>{`@page { size: ${s.print.paper === "a4" ? "A4" : "letter"}; margin: 0.6in; }`}</style>
      <div className="no-print mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3"><Link href={`/lessons/${uid}`} className="text-sm text-slate-500 hover:text-brand-600">← Back to lesson</Link><div className="ml-auto"><PrintButton /></div></div>
        <div className="mt-3 text-xs font-medium text-slate-600">Sections to print (click to include or leave out, handy for a substitute copy):</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {s.lessonSections.filter((x) => x.enabled).map((x) => (
            <Link key={x.id} href={link(x.id)} className={"rounded-full border px-2.5 py-1 text-xs " + (skip.has(x.id) ? "border-slate-200 text-slate-400 line-through" : "border-brand-600 bg-brand-50 text-brand-700")}>{x.label}</Link>
          ))}
        </div>
      </div>
      <article className="mx-auto max-w-3xl text-[15px] leading-relaxed text-slate-900">
        {s.print.headerText && <div className="mb-1 text-xs text-slate-500">{s.print.headerText}</div>}
        <h1 className="text-2xl font-bold">{item.title || "Lesson plan"}</h1>
        <div className="mb-4 mt-1 flex flex-wrap gap-x-5 text-sm text-slate-600">
          {d.course && <span><b>Course:</b> {d.course}</span>}{d.unit && <span><b>Unit:</b> {d.unit}</span>}
          {d.date && <span><b>Date:</b> {fmtLong(d.date)}</span>}{d.duration ? <span><b>Time:</b> {d.duration} min</span> : null}{d.periods && <span><b>Periods:</b> {d.periods}</span>}
        </div>
        {sections.map((x) => (d.sections?.[x.id] ? (
          <section key={x.id} className="mb-4 break-inside-avoid">
            <h2 className="border-b border-slate-300 pb-0.5 text-sm font-semibold uppercase tracking-wide text-slate-700">{x.label}</h2>
            <p className="mt-1 whitespace-pre-wrap">{d.sections[x.id]}</p>
          </section>
        ) : null))}
        {d.attachments?.length > 0 && !skip.has("attachments") && (
          <section className="mb-4"><h2 className="border-b border-slate-300 pb-0.5 text-sm font-semibold uppercase tracking-wide text-slate-700">Attachments</h2>
            <ul className="mt-1 list-disc pl-5">{d.attachments.map((a: { label: string; ref: string }, i: number) => <li key={i}>{a.label || a.ref}</li>)}</ul></section>
        )}
        <footer className="mt-6 text-xs text-slate-400">{s.print.footerText}{s.print.showDate ? `  Printed ${fmtLong(todayStr())}` : ""}</footer>
      </article>
    </>
  );
}
