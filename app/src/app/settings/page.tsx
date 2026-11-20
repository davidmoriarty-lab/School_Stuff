import { getSettings } from "@/lib/store";
import { listBackups } from "@/lib/backup";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Everything here changes the whole app. Changes save automatically." />
      <SettingsForm initial={getSettings()} backups={listBackups()} />
    </>
  );
}
