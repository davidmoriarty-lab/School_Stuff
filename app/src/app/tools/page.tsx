import { getSections, getStudents } from "@/lib/roster";
import { PageHeader } from "@/components/ui";
import { Tools } from "./Tools";

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <>
      <PageHeader title="Classroom tools" subtitle="Pick a student, make groups, run a timer. Uses your rosters from the Gradebook." />
      <Tools sections={getSections()} students={getStudents()} />
    </>
  );
}
