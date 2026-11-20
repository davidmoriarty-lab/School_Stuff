import { notFound } from "next/navigation";
import { getItem } from "@/lib/store";
import { PAPER, type Sheet } from "@/lib/worksheet";
import { SheetPages } from "@/components/worksheet/SheetPages";
import { PrintBar } from "./PrintBar";

export const dynamic = "force-dynamic";

export default async function PrintWorksheet({ params, searchParams }: { params: Promise<{ uid: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { uid } = await params;
  const mode = (await searchParams).mode ?? "student";
  const item = getItem(uid);
  if (!item || item.kind !== "worksheet") notFound();
  const sheet = item.data as Sheet;
  const { w, h } = PAPER[sheet.paper];
  const css = `
    @page { size: ${sheet.paper === "a4" ? "A4" : "letter"}; margin: 0; }
    .ws-page { margin: 0 auto 24px; box-shadow: 0 1px 6px rgba(0,0,0,.18); }
    @media print {
      .ws-page { margin: 0 !important; box-shadow: none !important; break-after: page; page-break-after: always; width: ${w}px; height: ${h}px; }
      .ws-pages > .ws-page:last-child { break-after: auto; page-break-after: auto; }
      body { margin: 0; }
    }`;
  return (
    <>
      <style>{css}</style>
      <PrintBar uid={uid} mode={mode} />
      <div className="ws-pages overflow-x-auto">
        {mode !== "key" && <SheetPages sheet={sheet} showKey={false} />}
        {(mode === "key" || mode === "both") && <SheetPages sheet={sheet} showKey />}
      </div>
    </>
  );
}
