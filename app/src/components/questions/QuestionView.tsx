// Draws one question for the bank preview, the test builder and the printout. No hooks, so it also renders on the server.
// Pass `order` (from buildVersion) to show a version's shuffled choices; leave it out to show the question as written.
import type { CSSProperties, ReactNode } from "react";
import { Chem, Rich } from "@/components/Chem";
import { BlockView } from "@/components/worksheet/BlockView";
import { LETTERS, normalizeQuestion, type Attach, type Order, type Question } from "@/lib/questions";

const INK = "#111";
const RED = "#c81e1e";
const Key = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <span style={{ color: RED, fontWeight: 600, ...style }}>{children}</span>;
const Lines = ({ n, h = 26 }: { n: number; h?: number }) => <>{Array.from({ length: Math.max(0, n) }).map((_, i) => <div key={i} style={{ height: h, borderBottom: "1px solid #555" }} />)}</>;
const synth = (type: "balance" | "nomen", props: Record<string, unknown>) => ({ id: "q", type, x: 0, y: 0, w: 640, h: 0, props } as Parameters<typeof BlockView>[0]["block"]);

function Attachment({ a }: { a: Attach }) {
  if (a.kind === "image") {
    return (
      <div style={{ margin: "6px 0" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={a.src} alt={a.caption || ""} style={{ width: a.width || 360, maxWidth: "100%", display: "block" }} />
        {a.caption ? <div style={{ fontSize: "0.85em", color: "#444", marginTop: 2 }}>{a.caption}</div> : null}
      </div>
    );
  }
  return (
    <div style={{ margin: "6px 0" }}>
      <table style={{ borderCollapse: "collapse", minWidth: "50%" }}>
        <tbody>
          {Array.from({ length: a.rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: a.cols }).map((_, c) => {
                const head = a.header && r === 0;
                return <td key={c} style={{ border: `1px solid ${INK}`, padding: "2px 8px", fontWeight: head ? 700 : 400, background: head ? "#e5e7eb" : "transparent", minWidth: 56, height: 24, textAlign: head ? "center" : "left" }}><Chem text={a.cells?.[r]?.[c] ?? ""} /></td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {a.caption ? <div style={{ fontSize: "0.85em", color: "#444", marginTop: 2 }}>{a.caption}</div> : null}
    </div>
  );
}

export function QuestionView({
  q: raw, number, showKey, order, points, showPoints = true, numbering = "plain",
}: { q: Question; number?: number | string; showKey: boolean; order?: Order; points?: number; showPoints?: boolean; numbering?: "plain" | "q" }) {
  const q = normalizeQuestion(raw);
  const auto = q.auto !== false;
  const label = number == null ? "" : numbering === "q" ? `Q${number}.` : `${number}.`;
  const pts = points ?? 0;
  const ptsTag = showPoints && pts > 0 ? <i style={{ color: "#555" }}> ({pts} {pts === 1 ? "pt" : "pts"})</i> : null;
  const visible = (a: Attach) => showKey || !a.keyOnly;
  const above = q.attachments.filter((a) => a.pos === "above" && visible(a));
  const below = q.attachments.filter((a) => a.pos !== "above" && visible(a));

  const stem = (extra?: ReactNode) => (
    <div style={{ whiteSpace: "pre-wrap" }}>{q.stem ? <Rich text={q.stem} auto={auto} /> : <span style={{ color: "#999" }}>(question text)</span>}{ptsTag}{extra}</div>
  );

  let body: ReactNode = null;
  let stemNode: ReactNode = stem();
  switch (q.type) {
    case "mcq": case "multi": {
      const ids = order?.choices ?? q.choices.map((c) => c.id);
      const list = ids.map((id) => q.choices.find((c) => c.id === id)).filter(Boolean) as Question["choices"];
      body = (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${q.cols || 1}, minmax(0, 1fr))`, gap: "3px 18px", marginTop: 4 }}>
          {list.map((c, i) => {
            const hit = showKey && c.correct;
            return (
              <div key={c.id} data-choice={i} data-correct={hit ? "1" : "0"} style={{ display: "flex", gap: 6, alignItems: "flex-start", ...(hit ? { color: RED, fontWeight: 700 } : {}) }}>
                <span style={{ minWidth: 22 }}>{q.type === "multi" ? "☐" : `${LETTERS[i]}.`}{q.type === "multi" ? ` ${LETTERS[i]}.` : ""}</span>
                <span>{c.img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.img} alt="" style={{ maxWidth: 190, maxHeight: 150, display: "block" }} /> : null}{c.text ? <Chem text={c.text} auto={auto} /> : c.img ? null : <span style={{ color: "#bbb" }}>(choice)</span>}{hit ? " ✔" : ""}</span>
              </div>
            );
          })}
        </div>
      );
      if (q.type === "multi") stemNode = stem(<i style={{ color: "#555" }}> Select all that apply.</i>);
      break;
    }
    case "tf":
      body = (
        <div style={{ marginTop: 4 }}>
          <span style={{ marginRight: 28, ...(showKey && q.answer !== "False" ? { color: RED, fontWeight: 700 } : {}) }}>○ True</span>
          <span style={showKey && q.answer === "False" ? { color: RED, fontWeight: 700 } : undefined}>○ False</span>
          {q.tfCorrection && <div style={{ marginTop: 6, fontSize: "0.92em" }}>If false, rewrite the statement so it is true:<Lines n={1} /></div>}
        </div>
      );
      break;
    case "short":
      body = <div style={{ marginTop: 2 }}><Lines n={q.lines || 2} />{showKey && q.answer ? <div style={{ marginTop: 3, whiteSpace: "pre-wrap" }}><Key><Rich text={q.answer} /></Key></div> : null}</div>;
      break;
    case "free": {
      const parts = q.parts;
      body = (
        <div>
          {parts.length > 0 ? parts.map((p) => (
            <div key={p.id} style={{ marginTop: 8, display: "flex", gap: 6 }}>
              <b style={{ minWidth: 26 }}>{p.label}</b>
              <div style={{ flex: 1 }}>
                <div style={{ whiteSpace: "pre-wrap" }}><Rich text={p.stem} auto={auto} />{showPoints && p.points ? <i style={{ color: "#555" }}> ({p.points} {p.points === 1 ? "pt" : "pts"})</i> : null}</div>
                <Lines n={p.lines} />
                {showKey && p.answer ? <div style={{ marginTop: 3, whiteSpace: "pre-wrap" }}><Key><Rich text={p.answer} /></Key></div> : null}
              </div>
            </div>
          )) : (
            <div style={{ marginTop: 4 }}>
              {q.workSpace > 0 ? <div style={{ height: q.workSpace, border: "1px dashed #999" }} /> : <Lines n={q.lines || 6} />}
              {showKey && q.answer ? <div style={{ marginTop: 3, whiteSpace: "pre-wrap" }}><Key><Rich text={q.answer} /></Key></div> : null}
            </div>
          )}
          {showKey && q.rubric.some((r) => r.text) && (
            <div style={{ marginTop: 6, border: "1px solid #c81e1e", padding: "4px 8px", fontSize: "0.9em" }}>
              <b style={{ color: RED }}>Scoring</b>
              {q.rubric.filter((r) => r.text).map((r, i) => <div key={i} style={{ color: RED }}>{r.points ? `${r.points} pt${Number(r.points) === 1 ? "" : "s"}: ` : ""}{r.text}</div>)}
            </div>
          )}
        </div>
      );
      break;
    }
    case "fill": {
      const pieces = (q.stem || "").split(/_{3,}/);
      stemNode = (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.9 }}>
          {pieces.map((t, i) => (
            <span key={i}>
              <Rich text={t} auto={auto} />
              {i < pieces.length - 1 && (showKey
                ? <Key style={{ borderBottom: `1.5px solid ${RED}`, padding: "0 6px" }}><Chem text={q.blanks[i] ?? ""} /></Key>
                : <span style={{ display: "inline-block", width: 120, borderBottom: `1px solid ${INK}`, height: "1em", verticalAlign: "baseline", margin: "0 4px" }} />)}
            </span>
          ))}
          {ptsTag}
        </div>
      );
      break;
    }
    case "matching": {
      const right = order?.right ?? q.pairs.map((_, i) => i);
      body = (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 26px", marginTop: 6 }}>
          {q.pairs.map((p, i) => (
            <div key={i} style={{ display: "contents" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ display: "inline-block", width: 34, borderBottom: `1px solid ${INK}`, textAlign: "center", height: 18 }}>{showKey ? <Key>{LETTERS[right.indexOf(i)]}</Key> : ""}</span>
                {i + 1}. <span><Chem text={p.a} auto={auto} /></span>
              </div>
              <div>{LETTERS[i]}.&nbsp; <Chem text={q.pairs[right[i]]?.b ?? ""} auto={auto} /></div>
            </div>
          ))}
        </div>
      );
      break;
    }
    case "numeric":
      body = (
        <div style={{ marginTop: 6 }}>
          {q.workSpace > 0 && <div style={{ height: q.workSpace, border: "1px dashed #999", padding: 4, fontSize: "0.75em", color: "#888" }}>Show your work</div>}
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "baseline" }}>
            <b>Answer:</b>
            {showKey ? <Key style={{ borderBottom: `1.5px solid ${RED}` }}><Chem text={[q.answer, q.unitsLabel].filter(Boolean).join(" ")} /></Key>
              : <><span style={{ display: "inline-block", width: 130, borderBottom: `1px solid ${INK}` }} /><span><Chem text={q.unitsLabel} /></span></>}
            {q.sigfigs ? <i style={{ fontSize: "0.85em", color: "#555" }}>({q.sigfigs} significant figures)</i> : null}
          </div>
          {showKey && q.tolerance ? <div style={{ marginTop: 2, color: RED, fontSize: "0.85em" }}>Accept {q.tolerance}</div> : null}
        </div>
      );
      break;
    case "balance": body = <BlockView block={synth("balance", { title: "", size: 15, items: q.eqs, startLetter: q.eqs.length > 1 })} showKey={showKey} />; break;
    case "nomen": body = <BlockView block={synth("nomen", { title: "", mode: q.nomenMode, rowH: 28, items: q.nomen })} showKey={showKey} />; break;
    case "ordering": {
      const steps = order?.steps ?? q.steps.map((_, i) => i);
      body = (
        <div style={{ marginTop: 6 }}>
          {steps.map((i, k) => (
            <div key={k} style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4 }}>
              <span style={{ display: "inline-block", width: 34, borderBottom: `1px solid ${INK}`, textAlign: "center", height: 18 }}>{showKey ? <Key>{i + 1}</Key> : ""}</span>
              <span><Chem text={q.steps[i]} auto={auto} /></span>
            </div>
          ))}
        </div>
      );
      break;
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {label && <b style={{ minWidth: numbering === "q" ? 34 : 24 }}>{label}</b>}
      <div style={{ flex: 1, minWidth: 0 }}>
        {stemNode}
        {above.map((a) => <Attachment key={a.id} a={a} />)}
        {body}
        {below.map((a) => <Attachment key={a.id} a={a} />)}
        {showKey && q.explanation ? <div style={{ marginTop: 5, color: RED, fontSize: "0.92em", whiteSpace: "pre-wrap" }}><b>Explanation:</b> <Rich text={q.explanation} /></div> : null}
      </div>
    </div>
  );
}
