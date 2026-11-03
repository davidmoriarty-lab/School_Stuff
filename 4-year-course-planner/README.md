# 4-Year Course Planner

A single-page HTML tool (no server, no install) that helps students plan their high school career. This README describes **version 1.1** (the "WCS Student Planner" for Summit High School, Williamson County Schools, Tennessee).

> The planner shows a red **"NOT AN OFFICIAL DOCUMENT"** banner in the header and on every exported PDF. It is a planning aid only. Students are told to meet with their counselor to finalize schedules.

## What it does
1. The student enters a name, current status (Freshman, Sophomore, Junior, Senior) and graduating class.
2. They record classes they have **already taken** and the grade they took each in.
3. They pick classes for **next school year** (the grade after their current status).
4. The planner checks everything against the graduation requirements and shows what is **met**, **on track**, or **still needed**.
5. They **export a PDF** of the plan. Next year they can **import that PDF** to restore everything.

## Tabs
| Tab | Purpose |
|---|---|
| **Dashboard** | Name, status and graduating-class settings; total credits (earned + planned out of 23) with a progress bar; warnings; requirements at a glance; PDF export and import. |
| **Classes Taken** | Add completed classes (choose the course and the grade it was taken), grouped by grade. Remove classes. |
| **Future Classes** | Shows the single upcoming year only. If a class can count toward more than one requirement, the student picks which one it counts toward. Seniors see a note that there is no next year to plan. |
| **Requirement Tracker** | Every requirement with a status badge. Click one to see which classes are applied to it, or to list all classes that could meet it. |
| **Class Search** | Search by name or code; filter by department, level (Standard, Honors, AP, Dual Enrollment) and graduation requirement. Click a course for its description, prerequisites and an add button. |

## Graduation requirements tracked (23 credits)
English I-IV (4), Math (Algebra I, Geometry, Algebra II, plus a 4th math), Science (Biology, Chemistry or Physics, a 3rd lab science), Social Studies (World History/AP Human Geo/AP Euro, U.S. History, Government & Civics, Economics), Physical Education, Lifetime Wellness, Personal Finance, World Language (2 credits, same language), Fine Arts, Computer Science, and Elective Focus (3 credits).

## Rules and warnings built in
- **Prerequisites:** warns when a prerequisite is not met (some may be taken "before or with" the course). It warns but still allows adding completed classes.
- **Physical Science before Chemistry/Physics:** blocks adding Physical Science after a Chemistry or Physics course (any level) and warns if the plan has it out of order.
- **Course load:** a normal load is 6 courses plus a study hall; 7 or more courses triggers a warning (signed parent request form needed).
- **Math:** warns if math is scheduled in fewer than 3 of the 4 years.
- **Already completed:** a completed class cannot be added as a future class.
- **ACT/SAT:** a standing reminder that every student takes the ACT or SAT in grade 11 (TCA 49-6-6001).

## How requirements are matched (the logic)
Each course lists which requirement(s) it can `satisfy`. The `evaluate()` function in the file assigns every taken and planned course to a requirement slot:
1. Courses the student explicitly assigned (the radio buttons in Future Classes) are placed first.
2. Then specific requirements are filled in order, with "flex" slots (4th math, 3rd lab science) after them and "catchall" slots (English, Elective Focus) last. Courses that can satisfy fewer requirements get first claim, so a dedicated course fills its own slot before a multi-purpose course does.
3. Leftover credits flow into **Elective Focus**.
4. Each slot is **met** (earned credits are enough), **on track** (earned plus planned are enough) or **gap** (still short).

## Data and saving
- **Auto-save:** the plan is stored in the browser's `localStorage` (key `wcs_student_plan`), so it persists on that device and browser.
- **PDF export/import:** the PDF is a hand-built text PDF (no libraries). The plan data is encoded and hidden in the PDF's keywords field with a `WCSPLANv1:` marker. Import only works on PDFs exported by this planner, not on transcripts.
- The exported PDF lists credits, each requirement with its status, classes taken by grade, and planned classes.

## Where the content lives
Everything is in one file. A `window.__CONFIG__` object near the top of the script holds the school name, district, colors, logo, credit target (23), graduating classes (2027 to 2031), the requirement list, and the course catalog. To change courses or requirements, edit that object; the rest of the code reads from it.

Version 1.1 catalog: **33 courses**, all in **Math (14)** and **Science (19)**, at Standard (11), Honors (12) and AP (10) levels. Other departments' courses still need to be added. Each course has an id, code, name, department, level, allowed grades, credit, the requirements it satisfies, prerequisites, a description, and flags for EPSO, NCAA and EOC.

## Folder layout
| Path | Purpose |
|---|---|
| `index.html` | The planner itself (newer version to be uploaded) |
| `reference/` | Source documents: course catalog, graduation requirements, sample forms, etc. |

## Status
The newer HTML file and reference documents are still to be added, so details above may change once they are.
