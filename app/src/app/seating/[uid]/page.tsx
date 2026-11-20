import { notFound } from "next/navigation";
import { getItem } from "@/lib/store";
import { getSections, getStudents } from "@/lib/roster";
import { emptyChart, type Chart } from "@/lib/seating";
import { SeatingEditor } from "@/components/seating/SeatingEditor";

export const dynamic = "force-dynamic";

export default async function EditSeating({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const item = getItem(uid);
  if (!item || item.kind !== "seating") notFound();
  return <SeatingEditor uid={uid} initialTitle={item.title} initial={{ ...emptyChart(), ...(item.data as Partial<Chart>) }} sections={getSections()} students={getStudents()} />;
}
