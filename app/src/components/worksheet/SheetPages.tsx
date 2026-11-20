// Read-only pages for the print view. No hooks, so it renders on the server.
import { BlockView } from "./BlockView";
import { PAPER, type Sheet } from "@/lib/worksheet";

export function SheetPages({ sheet, showKey }: { sheet: Sheet; showKey: boolean }) {
  const { w, h } = PAPER[sheet.paper];
  const font = sheet.font === "serif" ? "Georgia, 'Times New Roman', serif" : "system-ui, 'Segoe UI', Arial, sans-serif";
  return (
    <>
      {sheet.pages.map((page, i) => (
        <div key={i} className="ws-page keep-colors" style={{ width: w, height: h, position: "relative", background: "#fff", fontFamily: font, fontSize: 13, lineHeight: 1.4, color: "#111", overflow: "hidden" }}>
          {page.blocks.map((b) => (
            <div key={b.id} style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h }}>
              <BlockView block={b} showKey={showKey} />
            </div>
          ))}
          {showKey && <div style={{ position: "absolute", right: 14, top: 10, color: "#c81e1e", fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>ANSWER KEY</div>}
        </div>
      ))}
    </>
  );
}
