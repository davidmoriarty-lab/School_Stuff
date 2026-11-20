import { chemSegs } from "@/lib/chem";

/** Renders text with chemistry formatting (subscripts, superscripts, arrows). No hooks, so it works anywhere. */
export function Chem({ text, auto = true }: { text: string; auto?: boolean }) {
  return (
    <>
      {chemSegs(String(text ?? ""), auto).map((s, i) =>
        s.t === "sub" ? <sub key={i}>{s.s}</sub> : s.t === "sup" ? <sup key={i}>{s.s}</sup> : <span key={i}>{s.s}</span>,
      )}
    </>
  );
}

/** Chemistry formatting plus **bold** and __italic__. Line breaks are kept by the parent (white-space: pre-wrap). */
export function Rich({ text, auto = true }: { text: string; auto?: boolean }) {
  const parts = String(text ?? "").split(/(\*\*[^*]+\*\*|__[^_]+__)/);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <b key={i}><Chem text={p.slice(2, -2)} auto={auto} /></b>
          : p.startsWith("__") && p.endsWith("__") && p.length > 4 ? <i key={i}><Chem text={p.slice(2, -2)} auto={auto} /></i>
          : <Chem key={i} text={p} auto={auto} />,
      )}
    </>
  );
}
