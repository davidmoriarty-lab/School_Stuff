import { PageHeader } from "@/components/ui";
import { Scanner } from "@/components/Scanner";

export default function ScanPage() {
  return (
    <>
      <PageHeader
        title="Scan sheets"
        subtitle="Capture completed scoring sheets with the document camera. Each sheet is matched to its student and test by the QR code."
      />
      <Scanner />
    </>
  );
}
