import { notFound } from "next/navigation";
import { getItem, getSettings } from "@/lib/store";
import { emptySheet, type Sheet } from "@/lib/worksheet";
import { Editor } from "@/components/worksheet/Editor";

export const dynamic = "force-dynamic";

export default async function EditWorksheet({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "worksheet") notFound();
  const s = getSettings();
  const sheet: Sheet = { ...emptySheet("", s.print.paper), ...(item.data as Partial<Sheet>) };
  return <Editor uid={uid} initialTitle={item.title} initial={sheet} courses={s.courses} />;
}
