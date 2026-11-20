import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { Rich } from "@/components/Chem";
import { QuestionView } from "@/components/questions/QuestionView";
import { VERSION_LETTERS, buildVersion, normalizeExam, type Exam, type Rendered } from "@/lib/questions";
import { fmtLong } from "@/lib/dates";
import { PrintBar } from "./PrintBar";

export const dynamic = "force-dynamic";

const css = (s: string) => s.replace(/["\\\n]/g, " ");
const named = (n: string) => ({ page: n } as CSSProperties);

function Paper({ exam, title, letter, vIndex, showKey, rendered, many, first }: { exam: Exam; title: string; letter: string; vIndex: number; showKey: boolean; rendered: Rendered[]; many: boolean; first: boolean }) {
  const o = exam.options;
  const total = rendered.reduce((n, r) => n + r.points, 0);
  const font = o.font === "serif" ? "Georgia, 'Times New Roman', serif" : "system-ui, 'Segoe UI', Arial, sans-serif";
  // points per section, for the section headings
  const sectionPoints = new Map<string, number>();
  let cur: string | null = null;
  for (const r of rendered) { if (r.item.kind === "section") { cur = r.item.id; sectionPoints.set(cur, 0); } else if (r.item.kind === "question" && cur) sectionPoints.set(cur, (sectionPoints.get(cur) ?? 0) + r.points); }
  const quick = rendered.filter((r) => r.q);
  return (
    <section className="exam-version" data-version={letter} data-key={showKey ? "1" : "0"} style={{ ...named(`${showKey ? "key" : "ver"}${letter}`), fontFamily: font, fontSize: o.fontSize, lineHeight: 1.4, color: "#111", background: "#fff", breakBefore: first ? "auto" : "page" }}>
      <header style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, borderBottom: "2px solid #111", paddingBottom: 6 }}>
          <div>
            {(exam.course || exam.unit) && <div style={{ fontSize: "0.78em", letterSpacing: 1, textTransform: "uppercase", color: "#555" }}>{[exam.course, exam.unit].filter(Boolean).join(" · ")}</div>}
            <h1 style={{ fontSize: "1.9em", fontWeight: 700, lineHeight: 1.15, margin: 0 }}>{title || "Test"}</h1>
            <div style={{ fontSize: "0.85em", color: "#555" }}>{exam.date ? fmtLong(exam.date) + " · " : ""}{total} points</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {many && <div style={{ border: "2px solid #111", borderRadius: 6, padding: "2px 12px", fontWeight: 800, fontSize: "1.3em", letterSpacing: 1 }}>VERSION {letter}</div>}
            {showKey && <div style={{ color: "#c81e1e", fontWeight: 800, letterSpacing: 1.5, marginTop: 4 }}>ANSWER KEY</div>}
          </div>
        </div>
        {o.showHeader && !showKey && (
          <div style={{ display: "flex", gap: 22, marginTop: 10, alignItems: "flex-end" }}>
            <span>Name: <span style={{ display: "inline-block", width: 230, borderBottom: "1px solid #111" }} /></span>
            <span>Date: <span style={{ display: "inline-block", width: 100, borderBottom: "1px solid #111" }} /></span>
            <span>Period: <span style={{ display: "inline-block", width: 44, borderBottom: "1px solid #111" }} /></span>
          </div>
        )}
        {exam.instructions.trim() && <div style={{ marginTop: 10, border: "1px solid #666", borderRadius: 4, padding: "6px 10px", whiteSpace: "pre-wrap" }}><b>Directions:</b> <Rich text={exam.instructions} /></div>}
        {showKey && quick.length > 0 && (
          <div style={{ marginTop: 10, border: "1.5px solid #c81e1e", borderRadius: 4, padding: "6px 10px" }}>
            <div style={{ color: "#c81e1e", fontWeight: 700, marginBottom: 3 }}>Quick key, Version {letter}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "2px 12px", fontSize: "0.92em" }}>
              {quick.map((r) => <div key={r.item.id}><b>{r.number}.</b> {r.key}</div>)}
            </div>
          </div>
        )}
      </header>
      <div>
        {rendered.map((r) => {
          if (r.item.kind === "section") return (
            <div key={r.item.id} style={{ margin: `${o.gap}px 0 ${o.gap / 2}px`, breakAfter: "avoid" }}>
              <div style={{ fontWeight: 800, fontSize: "1.1em", borderBottom: "1px solid #888", paddingBottom: 2 }}>{r.item.title}{o.showPoints && sectionPoints.get(r.item.id) ? <span style={{ fontWeight: 400, color: "#555" }}> ({sectionPoints.get(r.item.id)} points)</span> : null}</div>
              {r.item.text?.trim() && <div style={{ marginTop: 3, whiteSpace: "pre-wrap", fontStyle: "italic" }}><Rich text={r.item.text} /></div>}
            </div>
          );
          if (r.item.kind === "pagebreak") return <div key={r.item.id} style={{ breakAfter: "page" }} />;
          return (
            <div key={r.item.id} data-q={r.number} data-itemid={r.item.id} style={{ marginBottom: o.gap, breakInside: r.q?.type === "free" ? "auto" : "avoid" }}>
              <QuestionView q={r.q!} number={r.number} showKey={showKey} order={r.order} points={r.points} showPoints={o.showPoints} numbering={o.numbering} />
            </div>
          );
        })}
      </div>
      {vIndex < 0 && null}
    </section>
  );
}

export default async function PrintExam({ params, searchParams }: { params: Promise<{ uid: string }>; searchParams: Promise<{ v?: string; mode?: string }> }) {
  const { uid } = await params;
  const sp = await searchParams;
  const item = getItem(uid);
  if (!item || item.kind !== "exam") notFound();
  const exam = normalizeExam(item.data as Partial<Exam>);
  const s = getSettings();
  const mode = sp.mode === "key" ? "key" : sp.mode === "both" ? "both" : "student";
  const wanted = (sp.v ?? "A").split(",").filter((l) => VERSION_LETTERS.includes(l) && VERSION_LETTERS.indexOf(l) < exam.options.versions);
  const letters = wanted.length ? [...new Set(wanted)].sort() : ["A"];
  const built = new Map(letters.map((l) => [l, buildVersion(exam, VERSION_LETTERS.indexOf(l))]));
  const many = exam.options.versions > 1;
  const title = item.title;

  // cross reference: where each question sits in every version (for grading mixed versions)
  const all = Array.from({ length: exam.options.versions }, (_, i) => buildVersion(exam, i));
  const numberIn = (vi: number, id: string) => all[vi].find((r) => r.item.id === id)?.number;
  const base = all[0].filter((r) => r.q);

  const pagesCss = letters.map((l) => `
    @page ver${l} { size: ${s.print.paper === "a4" || exam.options.paper === "a4" ? "A4" : "letter"}; margin: 0.6in; @top-right { content: "Version ${l}"; font: 10px sans-serif; color: #666; } @bottom-left { content: "${css(title)}"; font: 10px sans-serif; color: #666; } @bottom-right { content: "Page " counter(page); font: 10px sans-serif; color: #666; } }
    @page key${l} { size: ${exam.options.paper === "a4" ? "A4" : "letter"}; margin: 0.6in; @top-right { content: "ANSWER KEY, Version ${l}"; font: 10px sans-serif; color: #c81e1e; } @bottom-left { content: "${css(title)}"; font: 10px sans-serif; color: #666; } @bottom-right { content: "Page " counter(page); font: 10px sans-serif; color: #666; } }`).join("\n");

  return (
    <>
      <style>{`
        @page { size: ${exam.options.paper === "a4" ? "A4" : "letter"}; margin: 0.6in; }
        ${pagesCss}
        .exam-version { max-width: 8.5in; margin: 0 auto 24px; padding: 0.4in 0.5in; box-shadow: 0 1px 6px rgba(0,0,0,.18); }
        @media print { .exam-version { max-width: none; margin: 0; padding: 0; box-shadow: none; } }
      `}</style>
      <PrintBar uid={uid} versions={exam.options.versions} selected={letters} mode={mode} />
      <div className="keep-colors">
        {mode !== "key" && letters.map((l, i) => <Paper key={"s" + l} exam={exam} title={title} letter={l} vIndex={i} showKey={false} rendered={built.get(l)!} many={many} first={i === 0} />)}
        {mode !== "student" && letters.map((l, i) => <Paper key={"k" + l} exam={exam} title={title} letter={l} vIndex={i} showKey rendered={built.get(l)!} many={many} first={mode === "key" && i === 0} />)}
        {mode !== "student" && many && (
          <section className="exam-version" style={{ breakBefore: "page", fontFamily: "system-ui, sans-serif", fontSize: 13, background: "#fff", color: "#111" }}>
            <h2 style={{ fontSize: "1.3em", fontWeight: 700, borderBottom: "1px solid #888", marginBottom: 8 }}>Version cross-reference: {title}</h2>
            <p style={{ fontSize: "0.9em", color: "#555", marginBottom: 8 }}>Find a question once, see its number on every version. Use it to grade mixed versions with one key.</p>
            <table style={{ borderCollapse: "collapse", fontSize: "0.95em" }}>
              <thead><tr>{VERSION_LETTERS.slice(0, exam.options.versions).split("").map((l) => <th key={l} style={{ border: "1px solid #666", background: "#eee", padding: "2px 14px" }}>Version {l}</th>)}<th style={{ border: "1px solid #666", background: "#eee", padding: "2px 14px", textAlign: "left" }}>Question</th></tr></thead>
              <tbody>
                {base.map((r) => (
                  <tr key={r.item.id}>
                    {Array.from({ length: exam.options.versions }).map((_, vi) => <td key={vi} style={{ border: "1px solid #666", padding: "2px 14px", textAlign: "center", fontWeight: vi === 0 ? 700 : 400 }}>{numberIn(vi, r.item.id)}</td>)}
                    <td style={{ border: "1px solid #666", padding: "2px 10px", maxWidth: 420, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{(r.q!.stem || r.q!.parts[0]?.stem || "").slice(0, 70)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
