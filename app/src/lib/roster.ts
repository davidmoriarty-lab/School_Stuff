// Reads class sections and students from the tracker's tables, so seating charts and tools use the same rosters.
import { sqlite } from "./db";
import type { Student } from "./seating";
import "./profiles"; // makes sure the profile table exists

export function getSections() {
  return sqlite.prepare("SELECT id, name FROM section ORDER BY name").all() as { id: number; name: string }[];
}
export function getStudents(): Student[] {
  // "first" is the preferred name when the teacher has set one, so it shows everywhere a first name is shown.
  return sqlite.prepare(`
    SELECT s.id, s.section_id AS sectionId,
           COALESCE(NULLIF(TRIM(json_extract(p.data, '$.preferred')), ''), s.first_name) AS first, s.last_name AS last
    FROM student s LEFT JOIN student_profile p ON p.student_id = s.id ORDER BY s.last_name, s.first_name`).all() as Student[];
}
