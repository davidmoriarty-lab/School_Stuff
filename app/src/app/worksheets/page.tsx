import { getSettings, listItems } from "@/lib/store";
import { PageHeader } from "@/components/ui";
import { countBlocks, type Sheet } from "@/lib/worksheet";
import { WorksheetList } from "./WorksheetList";

export const dynamic = "force-dynamic";

export default function Worksheets() {
  const s = getSettings();
  const items = listItems("worksheet").map((w) => ({ uid: w.uid, title: w.title, updatedAt: w.updatedAt, blocks: countBlocks(w.data as Sheet), course: (w.data as Sheet).course ?? "", unit: (w.data as Sheet).unit ?? "", pages: (w.data as Sheet).pages?.length ?? 1 }));
  return (
    <>
      <PageHeader title="Worksheet builder" subtitle="Drag-and-snap chemistry worksheets with balancing boxes, molar mass tables, factor-label setups, graph paper and an automatic answer key." />
      <WorksheetList items={items} courses={s.courses} paper={s.print.paper} />
    </>
  );
}
