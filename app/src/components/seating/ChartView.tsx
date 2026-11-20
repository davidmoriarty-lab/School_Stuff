// Draws a seating chart. No hooks, so the print page can render it on the server.
// The editor passes handlers (drag, select, drop); the print page passes none.
import type { PointerEvent, DragEvent } from "react";
import { OBJ_DEFS, seatGrid, studentName, type Chart, type Student } from "@/lib/seating";

export type ChartHandlers = {
  selId?: string | null;
  onObjDown?: (e: PointerEvent, id: string) => void;
  onSeatDrop?: (e: DragEvent, objId: string, seat: number) => void;
  onSeatClick?: (objId: string, seat: number) => void;
  pickId?: number | null;
};

export function ChartView({ chart, students, h = {}, scale = 1 }: { chart: Chart; students: Map<number, Student>; h?: ChartHandlers; scale?: number }) {
  return (
    <div style={{ position: "relative", width: chart.w, height: chart.h, background: "#fff", transform: `scale(${scale})`, transformOrigin: "top left", fontFamily: "system-ui, 'Segoe UI', Arial, sans-serif", color: "#0f172a" }}>
      {chart.objs.map((o) => {
        const d = OBJ_DEFS[o.type];
        const { rows, cols } = seatGrid(o);
        const hasSeats = o.students.length > 0;
        return (
          <div key={o.id} onPointerDown={h.onObjDown ? (e) => h.onObjDown!(e, o.id) : undefined}
            style={{
              position: "absolute", left: o.x, top: o.y, width: o.w, height: o.h, background: d.color, color: d.text,
              border: o.type === "label" ? (h.onObjDown ? "1px dashed #cbd5e1" : "none") : "1.5px solid #334155", borderRadius: o.type === "board" ? 3 : 8,
              outline: h.selId === o.id ? "2px solid var(--color-brand-600, #4f46e5)" : undefined, outlineOffset: 2, cursor: h.onObjDown ? "move" : undefined,
              display: "grid", gridTemplateColumns: hasSeats ? `repeat(${cols}, 1fr)` : "1fr", gridTemplateRows: hasSeats ? `repeat(${rows}, 1fr)` : "1fr", overflow: "hidden",
            }}>
            {hasSeats ? o.students.map((sid, i) => {
              const st = sid != null ? students.get(sid) : undefined;
              return (
                <div key={i}
                  onDragOver={h.onSeatDrop ? (e) => e.preventDefault() : undefined}
                  onDrop={h.onSeatDrop ? (e) => h.onSeatDrop!(e, o.id, i) : undefined}
                  onClick={h.onSeatClick ? () => h.onSeatClick!(o.id, i) : undefined}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 2, fontSize: chart.fontSize, fontWeight: 600, lineHeight: 1.1, borderLeft: i % cols ? "1px dashed #cbd5e1" : undefined, borderTop: i >= cols ? "1px dashed #cbd5e1" : undefined, background: st ? undefined : h.pickId != null ? "#eef2ff" : undefined, overflow: "hidden", wordBreak: "break-word" }}>
                  {st ? studentName(st, chart.nameFormat) : h.onObjDown ? <span style={{ color: "#cbd5e1", fontWeight: 400 }}>empty</span> : null}
                </div>
              );
            }) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: o.type === "label" ? chart.fontSize + 2 : 11, fontWeight: 600, textAlign: "center", padding: "0 4px" }}>{o.label}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
