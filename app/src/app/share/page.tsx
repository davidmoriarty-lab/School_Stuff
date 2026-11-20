import { getSettings, listItems } from "@/lib/store";
import { searchFiles } from "@/lib/library";
import { PageHeader } from "@/components/ui";
import { SHAREABLE, KIND_LABEL } from "@/lib/share";
import { SharePanel } from "./SharePanel";

export const dynamic = "force-dynamic";

export default function Share() {
  const items = SHAREABLE.flatMap((k) => listItems(k).map((i) => ({
    uid: i.uid, title: i.title || "Untitled", kind: KIND_LABEL[k],
    // Worksheets, lessons and pacing guides carry a course; worksheets and lessons also carry a unit.
    course: String(i.data.course ?? "").trim(), unit: k === "pacing" ? "" : String(i.data.unit ?? "").trim(),
  })));
  const files = searchFiles("", ["mine"], 1000).map(({ e }) => e.rel);
  return (
    <>
      <PageHeader title="Share packages" subtitle="Send worksheets, lesson plans, pacing guides and files to another teacher as one file. They import it into their own copy of this app." />
      <SharePanel items={items} files={files} teacher={getSettings().teacherName} courseOrder={getSettings().courses} />
    </>
  );
}
