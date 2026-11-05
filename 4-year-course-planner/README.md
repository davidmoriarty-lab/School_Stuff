# 4-Year Course Planner

A tool for students at Summit High School (Williamson County Schools, Tennessee) to plan their high school career. It is two self-contained HTML files that run in a browser with no server and no install.

> The planner shows a red **"NOT AN OFFICIAL DOCUMENT"** banner in the header and on every exported PDF. It is a planning aid only. Students are told to meet with their counselor to finalize schedules.

## The two apps
| File | Who uses it | What it is |
|---|---|---|
| `wcs-planner.html` | **Students** | The planner. A sample generated from the current course catalog. |
| `course-builder.html` | **School staff** | The setup tool. Edit courses, prerequisites and which graduation requirement each course satisfies, set school branding, then click **Generate Planner** to produce a fresh `wcs-planner.html`. It auto-saves in the browser and can save/load a project file. |

The builder is the source of truth for course data. Regenerate the planner from it rather than editing the planner by hand.

## What the student planner does
1. The student enters a name, current status (Freshman to Senior) and graduating class.
2. They record classes already **taken** and the grade each was taken.
3. They pick classes for **next school year** (the grade after their current status).
4. The planner checks everything against the Traditional Diploma requirements and shows what is **met**, **on track**, or **still needed**.
5. They **export a PDF** of the plan. Next year they **import that PDF** to restore everything. On import it asks whether the previously planned classes are now finished; Yes moves them to Classes Taken, asks for the Fall and Spring Semester Grade of each, then offers to advance the student's status one year.

### Tabs
| Tab | Purpose |
|---|---|
| **Dashboard** | Name, status, graduating class; credits (earned + planned of 23) with a progress bar; warnings; requirements at a glance. |
| **Classes Taken** | Add completed classes through a split picker (filters and search on the left, running list on the right). For each class the student picks the year taken and enters a **Fall Semester Grade** and **Spring Semester Grade** (A, B, C, D, F or P; blank if not graded yet). Math and World Language classes can be taken as **Middle School** credit (for example Algebra I, Geometry, World Language I). An **Edit grades** button fixes grades later. Removing asks for confirmation. |
| **Future Classes** | Shows only the one upcoming year. A course that can meet more than one requirement (for example AP Physics C as science or math) shows radio buttons so the student chooses. |
| **Requirement Tracker** | Every requirement with a status badge; click to see the classes applied, or to list every class that could meet it. |
| **Class Search** | Search by name or code; filter by department, level (Standard, Honors, AP, Dual Enrollment) and requirement met. |
| **Save / Load** | PDF export and import, with reminders to keep the file. |

### Rules and warnings built in
- Prerequisite warnings (some can be taken "before or with" the course).
- Physical Science must come before Chemistry or Physics (any level); adding it afterward is blocked.
- A completed class cannot be added as a future class.
- Warning at 7 or more courses in a year (no study hall; signed parent request form).
- Warning if math is scheduled in fewer than 3 of the 4 years.
- ACT/SAT reminder (every student takes it in grade 11, TCA 49-6-6001).

### How requirements are matched
Each course lists which requirements it can satisfy. The `evaluate()` function assigns every taken and planned course to a slot: the student's explicit choices first, then specific requirements, then "flex" slots (4th math, 3rd lab science), then "catchall" slots (English, Elective Focus). Courses that satisfy fewer requirements get first claim. Leftover credits go to Elective Focus. A course counts toward only one requirement.

### Saving
- Auto-save in the browser's `localStorage`.
- The exported PDF is a one-page landscape **4 Year Plan of Study** form (layout from `reference/Export Format.pdf`): a 9th to 12th grade grid of courses (Study Hall in the 7th row) with the student's Fall (F) and Spring (S) grades in the boxes, then requirement tables (Elective Focus, Science, Fine Arts / Computer Science, English, Social Studies, PE / Wellness, Math, World Language, and Credits Earned in Middle School, filled from middle school classes) with X marks for fall/spring credit. Student name, class year, a notes line and the NOT AN OFFICIAL DOCUMENT banner are included. School logos are not yet on the form.
- The PDF is hand-built (no libraries) with the plan data hidden in its metadata. Import only works on PDFs this planner made.

## Course catalog
`config/courses.csv` holds **269 courses** across Math, Science, English, Social Studies, World Language, PE, Fine Arts, JROTC and CTE. Levels: Standard, Honors, AP, Dual Enrollment. IB courses are omitted. **124 are marked Offered (`Y`)**, matching the 2026-27 Master Schedule; only those appear in the app.

`config/` contains:
| File | Purpose |
|---|---|
| `courses.csv` | The catalog (one row per course; `Offered`, prerequisites, `Satisfies` keys, flags). |
| `school.json` | School name, district, colors, logo, credit target (23), graduating classes (2027 to 2031). |
| `master-schedule-mapping.csv` | Maps Master Schedule labels to catalog course IDs. |
| `counselor-answers.md` | Counselor answers about Elective Focus and the rules still to be built. |
| `README.md` | Column-by-column guide to the config files and the `Satisfies` keys. |

## Reference documents (`reference/`)
- `HS-Program-Planning-Guide-2627.pdf`: 2026-27 WCS course guide (source of the catalog).
- `02-27-26 VI F Graduation Permissions and Substitutions Policy 3.103 Clean (3).pdf`: TN policy 3.103.
- `Secondary-Science-Course-Sequences.pdf` and `Secondary Math Pathways ... DE.pdf`: course sequences.
- `Master Schedule 2026-27.xlsx`: which courses Summit offers.
- `Export Format.pdf`: layout of the exported form.
- `Counselor Questions - 4 Year Plan.docx`: questions sent to counselors.

## Project plan and status
`PLAN.md` is the full design (draft v0.2): PDF round-trip decision, data model, requirement engine, build phases, risks.

Open items (from `PLAN.md` and `config/counselor-answers.md`):
- **Credit target:** the app uses 23, but counselors and the WCS 6-Year Plan form say 22. Computer Science can be met by substituting for the 3rd lab science or 4th math.
- **Elective Focus** (AP, Fine Arts & Humanities, CCTE, Math & Science) is only partly specified; CTE pathways, approved dual-enrollment courses and the humanities list are undecided.
- The requirement engine does not yet cover the full nuance of Policy 3.103 substitution allocation.
- Math EOC flags need school review. Logo is not yet added (`config/logo.png`).
