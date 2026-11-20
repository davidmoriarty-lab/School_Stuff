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
