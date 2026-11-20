import { getSettings } from "@/lib/store";
import { listProfiles } from "@/lib/profiles";
import { PageHeader } from "@/components/ui";
import { ProfilesList } from "./ProfilesList";

export const dynamic = "force-dynamic";

export default async function Profiles({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  const s = getSettings();
  const rows = listProfiles();
  const sections = [...new Map(rows.map((r) => [r.sectionId, r.sectionName])).entries()].map(([id, name]) => ({ id, name }));
  return (
    <>
      <PageHeader title="Student profiles" subtitle="A profile is created for every student on your rosters. Add a preferred name, flags and notes, then print a roster for a substitute." />
      <ProfilesList rows={rows} sections={sections} tags={s.studentTags} initialSection={(await searchParams).section ?? ""} />
    </>
  );
}
