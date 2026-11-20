// Draws one worksheet block. Used by the editor, the preview and the print page, so what you design is what prints.
// This file has no hooks and no browser-only code, so it can render on the server as well.
import type { CSSProperties, ReactNode } from "react";
import { Chem } from "@/components/Chem";
import { BY_SYMBOL, CATEGORY_COLOR, CONSTANTS, ELEMENTS, IONS, molarBreakdown, molarMass, parseEquation } from "@/lib/chem";
import type { Block, Props } from "@/lib/worksheet";

const INK = "#111";
const RED = "#c81e1e";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : d);

const Line = ({ h = 26 }: { h?: number }) => <div style={{ height: h, borderBottom: "1px solid #555" }} />;
const Blank = ({ w = 160 }: { w?: number }) => <span style={{ display: "inline-block", width: w, borderBottom: `1px solid ${INK}`, height: "1em", verticalAlign: "bottom" }} />;
const Key = ({ children, style }: { children: ReactNode; style?: CSSProperties }) => <span style={{ color: RED, fontWeight: 600, ...style }}>{children}</span>;

export function BlockView({ block, showKey, editing }: { block: Block; showKey: boolean; editing?: boolean }) {
  const p = block.props;
  const { w, h } = block;
  switch (block.type) {
    case "header": return <Header p={p} />;
    case "text": return (
      <div style={{ fontSize: num(p.size, 13), fontWeight: p.bold ? 700 : 400, fontStyle: p.italic ? "italic" : "normal", textAlign: p.align, whiteSpace: "pre-wrap", lineHeight: 1.4, ...(p.boxed ? { border: `1.5px solid ${INK}`, padding: 8, borderRadius: 4 } : {}) }}>
        <Chem text={p.text} auto={p.auto !== false} />
      </div>
    );
    case "question": return (
      <div style={{ display: "flex", gap: 8 }}>
        <b>{p.num}.</b>
        <div style={{ flex: 1 }}>
          <div style={{ whiteSpace: "pre-wrap" }}><Chem text={p.text} auto={p.auto !== false} />{p.pts ? <i style={{ color: "#555" }}> ({p.pts} {Number(p.pts) === 1 ? "pt" : "pts"})</i> : null}</div>
          {num(p.workH, 0) > 0 && <div style={{ height: num(p.workH, 0), border: "1px dashed #888", marginTop: 6, padding: 4, fontSize: 10, color: "#888" }}>Show your work</div>}
          {Array.from({ length: num(p.lines, 0) }).map((_, i) => <Line key={i} h={num(p.spacing, 26)} />)}
          {showKey && p.answer ? <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}><Key><Chem text={p.answer} /></Key></div> : null}
        </div>
      </div>
    );
    case "mcq": {
      const cols = num(p.cols, 1);
      const correct = String(p.answer ?? "").trim().toUpperCase();
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <b>{p.num}.</b>
          <div style={{ flex: 1 }}>
            <div style={{ whiteSpace: "pre-wrap" }}><Chem text={p.text} auto={p.auto !== false} /></div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "3px 16px", marginTop: 4 }}>
              {arr(p.choices).map((c, i) => {
                const hit = showKey && LETTERS[i] === correct;
                return <div key={i} style={hit ? { color: RED, fontWeight: 700 } : undefined}>{LETTERS[i]}.&nbsp; <Chem text={c} auto={p.auto !== false} />{hit ? " ✔" : ""}</div>;
              })}
            </div>
          </div>
        </div>
      );
    }
    case "matching": {
      const ans = String(p.answers ?? "").split(/[,\s]+/).filter(Boolean);
      return (
        <div>
          {p.title ? <div style={{ fontStyle: "italic", marginBottom: 6 }}><Chem text={p.title} /></div> : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 28px" }}>
            {Array.from({ length: Math.max(arr(p.left).length, arr(p.right).length) }).map((_, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  {i < arr(p.left).length && <><span style={{ display: "inline-block", width: 34, borderBottom: `1px solid ${INK}`, textAlign: "center", height: 18 }}>{showKey ? <Key>{ans[i]}</Key> : ""}</span>{i + 1}. <span><Chem text={arr(p.left)[i]} /></span></>}
                </div>
                <div>{i < arr(p.right).length && <>{LETTERS[i]}.&nbsp; <Chem text={arr(p.right)[i]} /></>}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "wordbank": return (
      <div style={{ border: `1.5px solid ${INK}`, borderRadius: 4, padding: "6px 10px" }}>
        <b>{p.title}</b>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${num(p.cols, 4)}, 1fr)`, gap: "2px 12px", marginTop: 4 }}>{arr(p.words).map((x, i) => <span key={i}><Chem text={x} /></span>)}</div>
      </div>
    );
    case "lines": return (
      <div>{p.label ? <div style={{ fontWeight: 600 }}>{p.label}</div> : null}{Array.from({ length: num(p.count, 5) }).map((_, i) => <Line key={i} h={num(p.spacing, 26)} />)}</div>
    );
    case "table": return <TableBlock p={p} showKey={showKey} />;
    case "balance": return <Balance p={p} showKey={showKey} />;
    case "nomen": return <Nomen p={p} showKey={showKey} />;
    case "molarmass": return <MolarMass p={p} showKey={showKey} />;
    case "factor": return <Factor p={p} showKey={showKey} />;
    case "lewis": return (
      <div>
        {p.title ? <div style={{ fontStyle: "italic", marginBottom: 6 }}>{p.title}</div> : null}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${num(p.cols, 4)}, 1fr)`, gap: 10 }}>
          {arr(p.items).map((x, i) => <div key={i} style={{ border: `1.5px solid ${INK}`, height: num(p.boxH, 120), padding: 5, borderRadius: 4, fontWeight: 600 }}><Chem text={x} /></div>)}
        </div>
      </div>
    );
    case "molemap": return <MoleMap w={w} h={h} title={p.title} />;
    case "periodic": return p.style === "color"
      // Worksheets made before the College Board table was added have no "style" and keep the colored table.
      ? <Periodic p={p} w={w} h={h} />
      : p.style === undefined ? <Periodic p={p} w={w} h={h} />
      : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/ap-periodic-table.svg" width={613} height={413} alt="Periodic table of the elements" style={{ display: "block", width: "100%", height: "auto" }} />
      );
    case "reference": {
      const items = CONSTANTS.filter((c) => arr(p.items).includes(c.id));
      return (
        <div style={{ border: "1px solid #888", borderRadius: 4, padding: "6px 10px", fontSize: 12 }}>
          {p.title ? <div style={{ fontWeight: 700, marginBottom: 3 }}>{p.title}</div> : null}
          <div style={{ columnCount: num(p.cols, 1), columnGap: 24 }}>{items.map((c) => <div key={c.id} style={{ breakInside: "avoid", marginBottom: 2 }}><Chem text={c.text} /></div>)}</div>
        </div>
      );
    }
    case "ions": {
      const list = IONS.filter((i) => p.set === "all" || i.group === p.set);
      return (
        <div style={{ fontSize: num(p.size, 12) }}>
          {p.title ? <div style={{ fontWeight: 700, marginBottom: 3 }}>{p.title}</div> : null}
          <div style={{ columnCount: num(p.cols, 3), columnGap: 20 }}>
            {list.map((i) => <div key={i.name} style={{ breakInside: "avoid", display: "flex", justifyContent: "space-between", borderBottom: "1px dotted #bbb", padding: "1px 0" }}><span>{i.name}</span><b><Chem text={i.formula} /></b></div>)}
          </div>
        </div>
      );
    }
    case "graph": return <Graph p={p} w={w} h={h} />;
    case "image": return (
      <div style={{ width: "100%", height: h }}>
        {p.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.src} alt={p.caption || ""} style={{ width: "100%", height: p.caption ? h - 18 : h, objectFit: p.fit }} />
        ) : editing ? <div style={{ height: "100%", border: "2px dashed #bbb", display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>Add a picture in the panel on the right</div> : null}
        {p.caption ? <div style={{ fontSize: 11, textAlign: "center", color: "#444" }}>{p.caption}</div> : null}
      </div>
    );
    case "shape": return p.kind === "box"
      ? <div style={{ width: "100%", height: h, border: `${num(p.thick, 1)}px ${p.dashed ? "dashed" : "solid"} ${INK}`, borderRadius: 4 }} />
      : <div style={{ borderTop: `${num(p.thick, 1)}px ${p.dashed ? "dashed" : "solid"} ${INK}`, width: "100%", marginTop: 0 }} />;
    default: return null;
  }
}

function Header({ p }: { p: Props }) {
  return (
    <div style={{ borderBottom: p.rule ? `2px solid ${INK}` : "none", paddingBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div>
          {p.course ? <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#555" }}>{p.course}</div> : null}
          <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.15 }}><Chem text={p.title} /></div>
          {p.subtitle ? <div style={{ color: "#444" }}>{p.subtitle}</div> : null}
        </div>
        <div style={{ textAlign: "right", fontSize: 13, display: "flex", flexDirection: "column", gap: 6 }}>
          {p.showName && <div>Name: <Blank w={190} /></div>}
          <div style={{ display: "flex", gap: 14, justifyContent: "flex-end" }}>
            {p.showDate && <span>Date: <Blank w={90} /></span>}
            {p.showPeriod && <span>Period: <Blank w={40} /></span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TableBlock({ p, showKey }: { p: Props; showKey: boolean }) {
  const rows = num(p.rows, 3), cols = num(p.cols, 3);
  const cell = (r: number, c: number) => {
    const k = showKey ? p.key?.[r]?.[c] : "";
    return { text: String(p.cells?.[r]?.[c] ?? ""), key: String(k ?? "") };
  };
  return (
    <div>
      {p.title ? <div style={{ fontWeight: 600, marginBottom: 3 }}>{p.title}</div> : null}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} style={{ height: num(p.rowH, 32) }}>
              {Array.from({ length: cols }).map((_, c) => {
                const { text, key } = cell(r, c);
                const head = p.headerRow && r === 0;
                return (
                  <td key={c} style={{ border: `1px solid ${INK}`, padding: "2px 6px", fontWeight: head ? 700 : 400, background: head ? "#e5e7eb" : "transparent", textAlign: head ? "center" : "left", verticalAlign: "middle", overflow: "hidden" }}>
                    {key ? <Key><Chem text={key} /></Key> : <Chem text={text} auto={p.auto !== false} />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Balance({ p, showKey }: { p: Props; showKey: boolean }) {
  const items: { eq: string; ans: string }[] = Array.isArray(p.items) ? p.items : [];
  const size = num(p.size, 16);
  return (
    <div>
      {p.title ? <div style={{ fontStyle: "italic", marginBottom: 8 }}><Chem text={p.title} /></div> : null}
      {items.map((it, i) => {
        const parsed = parseEquation(it.eq || "");
        const coefs = String(it.ans ?? "").split(/[,\s]+/).filter(Boolean);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, fontSize: size, marginBottom: 12 }}>
            {p.startLetter && <b style={{ width: 22 }}>{String.fromCharCode(97 + i)}.</b>}
            {parsed ? parsed.terms.map((t, j) => (
              <span key={j} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {j > 0 && <span>{parsed.terms[j - 1].side === t.side ? "+" : parsed.arrow}</span>}
                <span style={{ display: "inline-flex", width: 38, height: size + 12, border: `1.5px solid ${INK}`, alignItems: "center", justifyContent: "center", color: RED, fontWeight: 700 }}>{showKey ? coefs[j] ?? "" : ""}</span>
                <span><Chem text={t.formula} /></span>
              </span>
            )) : <span><Chem text={it.eq} /></span>}
          </div>
        );
      })}
    </div>
  );
}

function Nomen({ p, showKey }: { p: Props; showKey: boolean }) {
  const items: { formula: string; name: string }[] = Array.isArray(p.items) ? p.items : [];
  const hideName = (i: number) => p.mode === "name" || (p.mode === "alternate" && i % 2 === 0);
  const cell: CSSProperties = { border: `1px solid ${INK}`, padding: "2px 8px", height: num(p.rowH, 32) };
  return (
    <div>
      {p.title ? <div style={{ fontStyle: "italic", marginBottom: 6 }}>{p.title}</div> : null}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={{ ...cell, width: "35%", background: "#e5e7eb", height: 24 }}>Formula</th><th style={{ ...cell, background: "#e5e7eb", height: 24 }}>Name</th></tr></thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td style={cell}>{hideName(i) ? <Chem text={it.formula} /> : showKey ? <Key><Chem text={it.formula} /></Key> : null}</td>
              <td style={cell}>{hideName(i) ? (showKey ? <Key>{it.name}</Key> : null) : <span>{it.name}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MolarMass({ p, showKey }: { p: Props; showKey: boolean }) {
  const d = num(p.decimals, 2);
  const cell: CSSProperties = { border: `1px solid ${INK}`, padding: "2px 8px", height: num(p.rowH, 44), verticalAlign: "middle" };
  return (
    <div>
      {p.title ? <div style={{ fontStyle: "italic", marginBottom: 6 }}>{p.title}</div> : null}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Compound", "Show your work", "Molar mass (g/mol)"].map((h, i) => <th key={h} style={{ ...cell, height: 24, background: "#e5e7eb", width: i === 0 ? "20%" : i === 2 ? "26%" : "auto" }}>{h}</th>)}</tr></thead>
        <tbody>
          {arr(p.compounds).map((f, i) => {
            const t = molarBreakdown(f), m = molarMass(f);
            return (
              <tr key={i}>
                <td style={{ ...cell, fontWeight: 600 }}><Chem text={f} /></td>
                <td style={{ ...cell, fontSize: 11 }}>{showKey && t ? <Key style={{ fontWeight: 500 }}>{t.map((x) => `${x.count}(${x.mass})`).join(" + ")}</Key> : null}</td>
                <td style={cell}>{showKey && m != null ? <Key>{m.toFixed(d)} g/mol</Key> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Factor({ p, showKey }: { p: Props; showKey: boolean }) {
  const slots = Math.max(1, Math.min(5, num(p.slots, 2)));
  const caps = arr(p.captions);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <b>{p.num}.</b>
      <div style={{ flex: 1 }}>
        <div style={{ whiteSpace: "pre-wrap", marginBottom: 6 }}><Chem text={p.problem} auto={p.auto !== false} /></div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
          <div style={{ paddingTop: 14, fontWeight: 600 }}><Chem text={p.given} /></div>
          {Array.from({ length: slots }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ paddingTop: 12, fontSize: 18 }}>×</span>
              <div style={{ width: 92, textAlign: "center" }}>
                <div style={{ height: 28, borderBottom: `1.5px solid ${INK}` }} />
                <div style={{ height: 28 }} />
                {caps[i] ? <div style={{ fontSize: 9, color: "#666", marginTop: -4 }}>{caps[i]}</div> : null}
              </div>
            </div>
          ))}
          <span style={{ paddingTop: 12, fontSize: 18 }}>=</span>
          <div style={{ paddingTop: 12, display: "flex", gap: 6, alignItems: "baseline" }}>
            {showKey && p.answer ? <Key style={{ borderBottom: `1.5px solid ${RED}` }}><Chem text={p.answer} /></Key> : <><Blank w={90} /> <span><Chem text={p.target} /></span></>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoleMap({ w, h, title }: { w: number; h: number; title?: string }) {
  const box = (x: number, y: number, t: string, sub: string) => (
    <g key={t}>
      <rect x={x} y={y} width={150} height={54} rx={10} fill="#fff" stroke={INK} strokeWidth={2} />
      <text x={x + 75} y={y + 24} textAnchor="middle" fontWeight={700} fontSize={16}>{t}</text>
      <text x={x + 75} y={y + 43} textAnchor="middle" fontSize={11} fill="#444">{sub}</text>
    </g>
  );
  const harrow = (x1: number, x2: number, y: number, label: string, above: boolean) => (
    <g key={label}>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={INK} strokeWidth={1.8} markerEnd="url(#ah)" />
      <text x={(x1 + x2) / 2} y={above ? y - 6 : y + 15} textAnchor="middle" fontSize={11}>{label}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 720 240" width={w} height={h} style={{ display: "block" }}>
      <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill={INK} /></marker></defs>
      {title ? <text x={360} y={18} textAnchor="middle" fontWeight={700} fontSize={15}>{title}</text> : null}
      {box(20, 56, "Particles", "atoms / molecules / ions")}
      {box(285, 56, "Moles", "mol")}
      {box(550, 56, "Mass", "grams")}
      {box(285, 176, "Volume of gas", "liters at STP")}
      {harrow(172, 283, 74, "÷ 6.022 × 10²³", true)}
      {harrow(283, 172, 96, "× 6.022 × 10²³", false)}
      {harrow(437, 548, 74, "× molar mass", true)}
      {harrow(548, 437, 96, "÷ molar mass", false)}
      <line x1={330} y1={112} x2={330} y2={174} stroke={INK} strokeWidth={1.8} markerEnd="url(#ah)" />
      <text x={322} y={148} textAnchor="end" fontSize={11}>× 22.4 L/mol</text>
      <line x1={390} y1={174} x2={390} y2={112} stroke={INK} strokeWidth={1.8} markerEnd="url(#ah)" />
      <text x={398} y={148} textAnchor="start" fontSize={11}>÷ 22.4 L/mol</text>
    </svg>
  );
}

function Periodic({ p, w, h }: { p: Props; w: number; h: number }) {
  const cw = w / 18;
  const fs = cw * 0.34;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(18, 1fr)", gridTemplateRows: "repeat(10, 1fr)", width: w, height: h, gap: 1 }}>
      {ELEMENTS.map((e) => (
        <div key={e.z} style={{ gridColumn: e.col, gridRow: e.row, border: "0.75px solid #444", background: p.color ? CATEGORY_COLOR[e.cat] : "#fff", textAlign: "center", lineHeight: 1.05, overflow: "hidden", fontSize: fs, display: "flex", flexDirection: "column", justifyContent: "center", color: INK }}>
          {p.showNumber && <div style={{ fontSize: fs * 0.72 }}>{e.z}</div>}
          {!p.blankSymbols && <div style={{ fontWeight: 700, fontSize: fs * 1.25 }}>{e.sym}</div>}
          {p.showName && <div style={{ fontSize: fs * 0.55 }}>{e.name}</div>}
          {p.showMass && <div style={{ fontSize: fs * 0.6 }}>{e.mass < 10 ? e.mass.toFixed(3) : e.mass.toFixed(2)}</div>}
        </div>
      ))}
    </div>
  );
}
void BY_SYMBOL;

function Graph({ p, w, h }: { p: Props; w: number; h: number }) {
  const cols = num(p.cols, 20), rows = num(p.rows, 15), major = Math.max(1, num(p.major, 5));
  const L = 38, B = 32, T = p.title ? 24 : 8, R = 8;
  const pw = w - L - R, ph = h - T - B;
  const cx = pw / cols, cy = ph / rows;
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      {p.title ? <text x={L + pw / 2} y={16} textAnchor="middle" fontWeight={700} fontSize={13}>{p.title}</text> : null}
      {Array.from({ length: cols + 1 }).map((_, i) => <line key={"v" + i} x1={L + i * cx} y1={T} x2={L + i * cx} y2={T + ph} stroke={i % major === 0 ? "#555" : "#c7c7c7"} strokeWidth={i % major === 0 ? 1 : 0.6} />)}
      {Array.from({ length: rows + 1 }).map((_, i) => <line key={"h" + i} x1={L} y1={T + i * cy} x2={L + pw} y2={T + i * cy} stroke={i % major === 0 ? "#555" : "#c7c7c7"} strokeWidth={i % major === 0 ? 1 : 0.6} />)}
      <rect x={L} y={T} width={pw} height={ph} fill="none" stroke={INK} strokeWidth={1.8} />
      <text x={L + pw / 2} y={h - 8} textAnchor="middle" fontSize={12}>{p.xLabel}</text>
      <text transform={`translate(12 ${T + ph / 2}) rotate(-90)`} textAnchor="middle" fontSize={12}>{p.yLabel}</text>
    </svg>
  );
}
