// Reads class sections and students from the tracker's tables, so seating charts and tools use the same rosters.
import { sqlite } from "./db";
import type { Student } from "./seating";

export function getSections() {
  return sqlite.prepare("SELECT id, name FROM section ORDER BY name").all() as { id: number; name: string }[];
}
export function getStudents(): Student[] {
  return sqlite.prepare("SELECT id, section_id AS sectionId, first_name AS first, last_name AS last FROM student ORDER BY last_name, first_name").all() as Student[];
}
