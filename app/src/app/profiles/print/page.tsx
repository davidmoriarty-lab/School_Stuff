import Link from "next/link";
import { getSettings, listItems } from "@/lib/store";
import { listProfiles, type ProfileRow } from "@/lib/profiles";
import { getStudents } from "@/lib/roster";
import { emptyChart, type Chart } from "@/lib/seating";
import { ChartView } from "@/components/seating/ChartView";
import { fmtLong, fmtShort, todayStr } from "@/lib/dates";
import { SubBar } from "./SubBar";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | undefined>>;
const BUILTIN: [string, string][] = [
  ["pronunciation", "Pronunciation"], ["pronouns", "Pronouns"], ["tags", "Flags"], ["sub", "Note for sub"], ["accommodations", "Accommodations"],
  ["medical", "Health / medical"], ["guardian", "Guardian contact"], ["strengths", "Strengths"], ["notes", "Private notes"], ["latest", "Latest log entry"],
];
const DEFAULT_FIELDS = "tags,sub,accommodations,medical";

export default async function SubRoster({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const s = getSettings();
  const all = listProfiles();
  const sections = [...new Map(all.map((r) => [r.sectionId, r.sectionName])).entries()].map(([id, name]) => ({ id, name }));
  const sectionId = Number(sp.section) || sections[0]?.id;
  const fields = (sp.fields ?? DEFAULT_FIELDS).split(",").filter(Boolean);
  const layout = sp.layout === "cards" ? "cards" : "table";
  const sort = sp.sort === "first" ? "first" : "last";
  const blank = sp.blank !== "0";
  const note = sp.note ?? "";
  const rows = all.filter((r) => r.sectionId === sectionId).sort((a, b) => {
    const A = sort === "first" ? (a.profile.preferred || a.first) : a.last, B = sort === "first" ? (b.profile.preferred || b.first) : b.last;
    return A.localeCompare(B) || a.last.localeCompare(b.last);
  });
  const charts = listItems("seating").filter((c) => (c.data as Chart).sectionId === sectionId).map((c) => ({ uid: c.uid, title: c.title }));
  const chartItem = sp.seating ? listItems("seating").find((c) => c.uid === sp.seating) : undefined;
  const chart = chartItem ? ({ ...emptyChart(), ...(chartItem.data as Partial<Chart>) } as Chart) : null;
  const studentMap = new Map(getStudents().map((x) => [x.id, x]));
  const sectionName = sections.find((x) => x.id === sectionId)?.name ?? "";
  const customOn = s.studentFields.filter((f) => f.label.trim() && fields.includes("c:" + f.id));
  const tagLabel = (id: string) => s.studentTags.find((t) => t.id === id)?.label;

  const cell = (r: ProfileRow, f: string): string => {
    const p = r.profile;
    switch (f) {
      case "pronunciation": return p.pronunciation;
      case "pronouns": return p.pronouns;
      case "tags": return p.tags.map(tagLabel).filter(Boolean).join(", ");
      case "latest": return p.log[0] ? `${fmtShort(p.log[0].date)}: ${p.log[0].text}` : "";
      default: return String((p as unknown as Record<string, string>)[f] ?? "");
    }
  };
  const label = (f: string) => BUILTIN.find((b) => b[0] === f)?.[1] ?? f;
  const cols = [...fields.filter((f) => BUILTIN.some((b) => b[0] === f)).map((f) => ({ key: f, label: label(f), get: (r: ProfileRow) => cell(r, f) })),
    ...customOn.map((f) => ({ key: "c:" + f.id, label: f.label, get: (r: ProfileRow) => r.profile.custom[f.id] ?? "" }))];
  const nameOf = (r: ProfileRow) => (r.profile.preferred && r.profile.preferred !== r.first ? `${r.profile.preferred} (${r.first}) ${r.last}` : `${r.first} ${r.last}`);

  return (
    <>
      <style>{`@page { size: ${s.print.paper === "a4" ? "A4" : "letter"} ${layout === "table" ? "landscape" : "portrait"}; margin: 0.5in; } @media print { .sub-page { break-after: page; } }`}</style>
      <SubBar sections={sections} charts={charts} custom={s.studentFields.filter((f) => f.label.trim()).map((f) => ({ id: f.id, label: f.label }))}
        state={{ section: String(sectionId ?? ""), fields, layout, sort, blank, note, seating: sp.seating ?? "" }} builtin={BUILTIN} />
      <article className="sub-page mx-auto max-w-[1000px] text-slate-900">
        {s.print.headerText && <div className="text-xs text-slate-500">{s.print.headerText}</div>}
        <div className="flex items-baseline justify-between border-b-2 border-slate-900 pb-1">
          <h1 className="text-xl font-bold">Substitute roster: {sectionName}</h1>
          <div className="text-xs text-slate-600">{s.teacherName ? `${s.teacherName} · ` : ""}{fmtLong(todayStr())}</div>
        </div>
        {note && <div className="mt-2 whitespace-pre-wrap rounded border border-slate-400 p-2 text-sm"><b>Notes for today:</b> {note}</div>}
        {rows.length === 0 && <p className="mt-6 text-sm text-slate-500">No students in this class.</p>}
        {layout === "table" ? (
          <table className="mt-3 w-full border-collapse text-[12px]">
            <thead><tr className="bg-slate-100 text-left">
              <th className="w-6 border border-slate-400 px-1.5 py-1">#</th><th className="border border-slate-400 px-1.5 py-1">Student</th>
              {cols.map((c) => <th key={c.key} className="border border-slate-400 px-1.5 py-1">{c.label}</th>)}
              {blank && <th className="w-40 border border-slate-400 px-1.5 py-1">Sub notes</th>}
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="break-inside-avoid align-top">
                  <td className="border border-slate-400 px-1.5 py-1 text-slate-500">{i + 1}</td>
                  <td className="whitespace-nowrap border border-slate-400 px-1.5 py-1 font-semibold">{nameOf(r)}</td>
                  {cols.map((c) => <td key={c.key} className="whitespace-pre-wrap border border-slate-400 px-1.5 py-1">{c.get(r)}</td>)}
                  {blank && <td className="h-8 border border-slate-400" />}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {rows.map((r) => (
              <div key={r.id} className="break-inside-avoid rounded border border-slate-400 p-2 text-[12px]">
                <div className="text-sm font-bold">{nameOf(r)}</div>
                {cols.map((c) => c.get(r) ? <div key={c.key}><b>{c.label}:</b> <span className="whitespace-pre-wrap">{c.get(r)}</span></div> : null)}
                {blank && <div className="mt-2 border-t border-dashed border-slate-400 pt-5 text-[10px] text-slate-400">Sub notes</div>}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 text-[10px] text-slate-500">Confidential student information. Keep secure and shred when finished. {s.print.footerText}</div>
      </article>
      {chart && (
        <div className="sub-page mx-auto mt-6 max-w-[1000px]" style={{ breakBefore: "page" }}>
          <h2 className="mb-2 text-lg font-bold">Seating chart: {chartItem?.title}</h2>
          <div className="keep-colors border border-slate-400" style={{ width: chart.w * Math.min(1, 980 / chart.w), height: chart.h * Math.min(1, 980 / chart.w) }}>
            <ChartView chart={chart} students={studentMap} scale={Math.min(1, 980 / chart.w)} />
          </div>
        </div>
      )}
      <div className="no-print mt-6 text-center text-xs text-slate-400"><Link href="/profiles" className="hover:text-brand-600">← Back to profiles</Link></div>
    </>
  );
}
