import { notFound } from "next/navigation";
import { getSettings } from "@/lib/store";
import { getProfileRow } from "@/lib/profiles";
import { ProfileEditor } from "../ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const row = getProfileRow(Number((await params).id));
  if (!row) notFound();
  const s = getSettings();
  return <ProfileEditor row={row} tags={s.studentTags} fields={s.studentFields} show={s.profileFields} />;
}
