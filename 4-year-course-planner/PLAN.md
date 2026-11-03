# WCS 4-Year Course Planner - Project Plan

_Draft v0.2._

## Status (working prototype)

Two files now exist and have been smoke-tested in Chrome:

- **`course-builder.html`** - the setup tool. Pre-loaded with 46 Math + Science courses at
  TN 3.103 / WCS defaults (33 marked Offered, incl. Organic Chemistry Honors). Edit any field,
  prerequisites (structured "any of these courses, optionally concurrent"), and which
  graduation requirement each course can satisfy. Add new courses. Save/load a project file;
  auto-saves in the browser. "Generate Planner" writes `wcs-planner.html`.
  Class Search also has a "Meets: <requirement>" filter, and Requirement Tracker rows link
  to it ("Show all N classes that can meet this").
- **`wcs-planner.html`** - a sample student planner generated from the current defaults.
  Regenerate it any time from the builder. Tabs: Dashboard, Classes Taken, Future Classes,
  Requirement Tracker (click-to-expand), Class Search. Course modal with contextual
  "would count as…". PDF export + re-import round-trip verified (state hidden in PDF metadata,
  no external libraries). Times New Roman, Auburn colors, no emoji, no em dashes. A red
  "NOT AN OFFICIAL DOCUMENT" box sits in the header (top right) on every screen and prints at
  the top of the exported PDF. School name set to "Summit High School".
  - Dashboard has a **Current high school status** dropdown (Freshman..Senior). It drives the
    Future Classes tab, which now shows only the ONE upcoming school year (a sophomore sees
    their junior-year plan). Future rows are one column: class on the left, the requirement it
    meets on the right; a course that can satisfy more than one requirement (AP Physics C =
    science or math) shows radio buttons so the student picks which one it covers. The choice
    is stored in `plan.assign` and honored first by the requirement engine.
  - Classes Taken keeps its layout; "Add a completed class" opens a split picker modal (subject
    filter + search + course list on the left, running list of what you are adding on the
    right); the "+" on a course opens a small grade picker for the year it was completed.
    Removing a completed class asks for confirmation first.
  - Export / import lives on its own **Save / Load** tab with per-button descriptions and a
    "save the file, import it next year" reminder.
  - On import, a prompt asks whether the previously-planned classes are now finished. **Yes**
    moves every planned class into Classes Taken (at its planned grade) and offers to advance
    the student's status one year (Sophomore -> Junior, etc.); **No** keeps them as planned
    classes, so re-loading a plan made the same year needs no cleanup.
  - Eligibility rules: a class already in Classes Taken cannot be re-added as a future class;
    Physical Science cannot be added when a Chemistry or Physics course (any level, incl.
    Honors/AP) sits in an earlier year - it must come before, never after.

**Catalog update (Oct 2026):** the builder and planner now carry the full 2026-27 WCS guide:
269 courses (251 marked Offered) across Math, Science, English, Social Studies, World Language,
PE, Fine Arts, JROTC and CTE (all clusters). IB courses (16) are omitted. `Satisfies` follows the
TSBE 3.103 policy plus the WCS CTE substitution table; prerequisites are resolved to course IDs
where the printed text names a course, otherwise kept as a note. Needs school review: which
courses Summit actually offers, EOC flags on Math, and the items listed in the hand-off notes.

**Offered baseline (Oct 2026):** the Offered flag now matches the 2026-27 Master Schedule (Sheet1
of `Master Schedule 2026-27.xlsx`): 124 of 269 courses. The label-to-course mapping is in
`config/master-schedule-mapping.csv`. To change next year, toggle Offered in the course builder.

Known limitations to iterate on: requirement engine covers credit counting, specific-course
matching, one-course-one-requirement, prereq warnings, 7th-course warning, math-3-of-4-years,
ACT/SAT reminder - but not the full nuance of Policy 3.103 substitution allocation (a
multi-purpose course is assigned greedily, preferring courses with fewer eligible
requirements). Only Math + Science courses so far. No logo wired into the PDF yet (app header
only). Sections below are the fuller design and remain the reference.

## 1. What we're building

A self-contained HTML application that a WCS high-school student downloads, opens locally
(`file://`) in a browser, and uses to plan all four years of high school. It:

- Tracks **classes already completed** (imported from a PDF the tool generated the prior year, or entered by hand).
- Lets the student **build a future schedule** year by year (grades 9-12).
- Continuously **checks progress toward the Tennessee / WCS Traditional Diploma** and shows what is met vs. still needed.
- Provides a **Class Search** with filtering by department and by course level (Standard / Honors / AP / Dual Enrollment).
- Opens a **course detail modal** from anywhere a course appears: description, prerequisites, credit, which graduation requirement it would satisfy _given this student's current plan_, and an **Add to future schedule** action.
- **Exports a PDF** that is both a human-readable plan and a machine-readable save file, so next year the student re-uploads it and picks up where they left off.

Source documents this is built from (in this folder):

| File | Use |
|---|---|
| `HS-Program-Planning-Guide-2627.pdf` (88 pp) | WCS course catalog + WCS graduation requirements (p.3) + substitution appendix (pp.85-87) |
| `02-27-26 VI F Graduation Permissions and Substitutions Policy 3.103 Clean (3).pdf` (9 pp) | TN State Board approved permissions & substitutions (4th math, 3rd lab science, econ, English III/IV, fine arts, wellness, personal finance, PE, US Gov) |
| `Secondary Math Pathways (Updated 2023, 2025).xlsx - DE.pdf` | Recommended math sequence by starting point, + dual-enrollment follow-ons |
| `Secondary-Science-Course-Sequences.pdf` | Recommended science sequence by grade + prerequisite key |

---

## 2. Hard constraints

1. **One file for the student.** Students download and run a single `.html` locally. No web server, no install, and we should assume **no internet at runtime** (all libraries and data inlined).
2. **We can still develop in multiple files.** We keep `src/` split into modules (data, engine, UI, styles) and a ~20-line build script concatenates them into one `dist/wcs-planner.html`. Students only ever get the `dist` file. This keeps a large codebase maintainable without breaking the single-file requirement.
3. **PDF in, PDF out, offline.** Both PDF generation and PDF reading happen in the browser with no network.
4. **No login, no cloud.** The PDF is the portable record. `localStorage` is a per-browser convenience cache only.
5. **No emojis; Times New Roman; readable.** Plain-language status labels and Times New Roman
   throughout the app and PDF, sized for easy reading. See section 4.1.

---

## 3. The PDF round-trip (most important design decision)

The student uses this once per year. Each spring they export a PDF; next spring they upload
last year's PDF so the tool knows their completed classes. That means the PDF must carry the
full plan state in a form we can read back reliably, **and** be readable by a human/counselor.

### Approach: readable pages + hidden data payload

The exported PDF has two parts:

1. **Human pages** - cover page with student name / grad year / diploma type, a requirement
   checklist (met / planned / still needed), and the 4-year grid. This is all the student and
   counselor ever see.
2. **Hidden data payload** - `base64( gzip( JSON of full plan state ) )` wrapped in
   `<<<WCSPLAN:v1>>> ... <<<END>>>` markers, stored **in the PDF's document metadata**
   (the Keywords/Subject field of the Info dictionary), not on any page. It does not render,
   does not appear in the page text, and is not visible when the student opens, reads, prints,
   or selects text in the PDF. On re-upload, our small metadata reader pulls it back out.

Fallback order on re-upload: (a) decode the metadata payload; (b) if a viewer or tool stripped
the metadata, look for the same marked block placed as **white-on-white text on a trailing
page** (a secondary hidden copy we also write); (c) if both fail, parse the printed
completed-courses table; (d) if that fails, prompt for manual entry.

Size: a full four-year plan gzips to roughly 1-3 KB base64 - comfortably within a PDF string
field.

### Libraries (inlined into the single file)

| Need | Library | Approx size (min) | Notes |
|---|---|---|---|
| Generate PDF | **jsPDF** + jspdf-autotable | ~360 KB | mature, pure client-side, no network |
| Read the PDF back | **custom ~150-line metadata reader** | ~5 KB | We only need to pull our own payload out of the PDF's metadata field, not render or parse page content. A small parser that finds the Info dictionary / marked block is enough. **Avoids pulling in pdf.js (~1.5 MB), which is 80% of the potential bundle weight.** |
| Compress state | **pako** (gzip) | ~45 KB | keeps the hidden payload to 1-3 KB |

Estimated final single file: **~900 KB - 1.3 MB** with Math + Science courses; roughly
**1.3-1.8 MB** once the full catalog is added. See section 11 for the size breakdown and why
this is a normal size for a downloaded local tool.

### Decision: PDF only, payload hidden in metadata

No separate `.wcsplan` JSON file for students - the PDF is the single artifact. The state
payload lives in the PDF metadata so students cannot see it. A JSON import/export may still
exist as a hidden/dev-only tool for our own testing, but it is not in the student-facing UI.

### Alternatives considered

- _QR code in the PDF_ - capacity (~2-3 KB) is too small for a full multi-year plan; rejected.
- _pdf.js only, re-parsing our own visual layout_ - fragile if we ever change the layout; kept only as the fallback path, not the primary.
- _PDF file attachment (embedded file stream)_ - not well supported in jsPDF; rejected.

---

## 4. Tabs / navigation

| Tab | Purpose |
|---|---|
| **Dashboard** | At-a-glance: credits earned / planned / remaining, requirement checklist, warnings (prereq gaps, sequence issues, over-loaded year, missing ACT/SAT note). Entry point. |
| **Classes Taken** | Import prior-year PDF; or add past courses with the same "Add a class" flow as Future Classes (course + year taken + optional grade + credit). Shows completed credits by department. |
| **Future Classes** | The 4-year builder. One column per grade (9-12). Add/remove courses per year; running credit total and course-count check per year; dropdown to move a course between years. |
| **Requirement Tracker** | Full breakdown per requirement bucket: what's required, what this student has **earned** (from past classes), what's **planned** (from future classes), and what is **still needed**, plus which allowed substitutions apply. Each requirement row shows a met / on-track / gap indicator and **expands as a dropdown** to list the specific courses (taken and planned, each labeled) being applied to that requirement. Also reachable as a summary panel on the Dashboard. |
| **Class Search** | Filter by **department** (Math, Science, English, Social Studies, World Language, Fine Arts, Wellness/PE, Computer Science, CTE, …), then by **level** (Standard, Honors, AP, Dual Enrollment). Free-text search on name/code. Each result row opens the course modal. |

Course detail modal (global, not a tab): title, code, level, credit (min/max), grade levels,
description, structured prerequisites/corequisites (with "may be taken concurrently" noted),
EPSO / NCAA / EOC flags, **"Satisfies: …"** computed against the current plan (e.g. "would
count as your 3rd lab science" or "already satisfied - would count as elective focus"),
recommended-sequence context, and **Add to future schedule** (pick the year; validates grade
level and prerequisites, warns rather than blocks).

### 4.1 Visual design

- **No emojis anywhere** - not in the app UI, tooltips, buttons, warnings, or the exported PDF.
  Status is shown with plain words ("Met", "On track", "Still needed") and simple shapes/color
  (a filled vs. open square, green/amber/grey), never icon characters or emoji.
- **Font: Times New Roman** (serif) as the primary typeface across the app and the PDF, with a
  fallback stack of `"Times New Roman", Times, Georgia, serif`. Times New Roman is available on
  effectively all school Windows/Mac devices, so this renders offline with no web font.
- **Readability first:** minimum 16px body text in the app, generous line spacing (~1.5),
  high-contrast dark text on a light background, wide-enough content column, clear section
  headings, and visible focus outlines for keyboard use. The PDF uses 11-12pt Times with
  similar spacing.
- The Requirement Tracker uses **click-to-expand dropdown rows** (not hover tooltips) to reveal
  the courses applied to each requirement - works the same with mouse, touch, and keyboard.

---

## 5. Data model

### 5.1 Course record

```jsonc
{
  "id": "G03H20",              // WCS course code where available
  "name": "Physics I",
  "department": "Science",
  "level": "Standard",         // Standard | Honors | AP | DualEnrollment  (no IB - WCS at this school does not offer it)
  "creditMin": 1.0,
  "creditMax": 1.0,
  "gradeLevels": [10, 11, 12],
  "description": "…",
  "prerequisites": {            // boolean tree, leaves are course ids or tags
    "allOf": [
      { "course": "G02H11", "concurrentOk": false },   // Geometry
      { "course": "G02H05", "concurrentOk": true }      // Algebra II (may be concurrent)
    ]
  },
  "corequisites": [],
  "teacherRecRequired": true,
  "eoc": false,
  "epso": false,
  "ncaa": true,
  "satisfies": ["science.lab"],       // requirement bucket keys it can fill
  "substitutionFor": ["math.fourth", "science.thirdLab"],  // per TN 3.103 / WCS appendix, if applicable
  "sequenceNotes": "Recommended science sequence: 10-12",
  "sourcePage": 35
}
```

### 5.2 Requirement buckets (Traditional Diploma - WCS Planning Guide p.3)

| Key | Label | Credits | Specific / rule |
|---|---|---|---|
| `english` | English | 4 | English I, II, III, IV (III/IV substitutions per 3.103 §III.2) |
| `math` | Mathematics | 4 | Algebra I, Geometry, Algebra II + 1 beyond Alg II; **also** must take a math course ≥3 of 4 years; 4th-credit substitutions per 3.103 §II.1 |
| `science` | Science | 3 | Biology + (Chemistry **or** Physics) + 1 more **lab** science; 3rd-lab substitutions per 3.103 §II.2. (Physics used as 4th math cannot double as science.) |
| `ss_world` | Social Studies: World | 1 | World History **or** AP Human Geography **or** AP European History |
| `ss_ushist` | Social Studies: US History | 1 | US History (AP US History allowed) |
| `ss_gov` | US Government & Civics | 0.5 | substitutions per 3.103 §III.7 (incl. JROTC III for ½) |
| `ss_econ` | Economics | 0.5 | substitutions per 3.103 §III.1 |
| `pe` | Physical Education | 0.5 | JROTC II or documented activity (band, athletics, cheer…) per 3.103 §III.6 |
| `wellness` | Lifetime Wellness | 1 | JROTC I / Basic Training per 3.103 §III.4 |
| `finance` | Personal Finance | 0.5 | substitutions per 3.103 §III.5 (incl. JROTC III for ½) |
| `world_lang` | World Language | 2 | 2 credits, same language |
| `fine_arts` | Fine Arts | 1 | substitutions per 3.103 §III.3 |
| `comp_sci` | Computer Science | 1 | required for 24-25 freshmen onward |
| `elective_focus` | Elective Focus | 3 | 3 credits in a coherent focus area |
| **Total** | | **23** | + must sit for ACT or SAT in grade 11 (TCA 49-6-6001) |

Each bucket stores: `creditsRequired`, `requiredCourses[]` (with OR-groups),
`allowedSubstitutions[]`, and a note string. The appendix (guide pp.85-87) and Policy 3.103
give the substitution lists - these get encoded as data, not logic.

### 5.3 Student plan

```jsonc
{
  "meta": { "name": "", "gradYear": 2030, "diplomaType": "Traditional", "startingMath": "Algebra I Honors" },
  "pastCourses": [
    { "courseId": "G01H00", "name": "Algebra I Honors", "yearTaken": 9, "term": "Year", "grade": "A", "credit": 1.0, "creditRecovery": false }
  ],
  "futurePlan": {
    "9":  [], "10": [], "11": [], "12": []
  },
  "overrides": [],          // e.g. counselor-approved prereq waivers
  "savedAt": "2026-09-02T00:00:00Z",
  "appVersion": "1.0"
}
```

### 5.4 Requirement engine

Pure function: `evaluate(pastCourses, futurePlan, courseDB, requirementDB) -> report`.

For each bucket it computes `earned`, `planned`, `remaining`, `status`
(`met` / `on-track` / `gap`), the specific courses applied, and which substitution (if any)
was used - and it enforces the "one substitution course counts for only one requirement"
rule from Policy 3.103 §I.4 (with the stated exceptions). It also emits plan-wide **warnings**:

- prerequisite not met / not scheduled before the course (respecting `concurrentOk`);
- science/math sequence violations (e.g. Physical Science after Chemistry; Calculus without Precalculus);
- **7th course in a year:** the normal load is 6 credit courses + 1 study hall (7 hrs/day, Planning Guide p.3). If a year holds 7 credit courses, warn: "This year has no study hall. A 7th course requires a parent-signed request form and is only granted if the master schedule permits." (Advisory, not a block.)
- math not scheduled in ≥3 of 4 years;
- no ACT/SAT reminder for grade 11;
- Physics counted as both 4th math and a science.

Warnings are **advisory** (yellow), not hard blocks - students can get a teacher
recommendation or parent override.

---

## 6. Course data - build order

Start with **Math** and **Science**. **No IB courses** (this school does not offer IB).

**Phase 1 master catalog (from Planning Guide pp.28-37):**

- _Math:_ Algebra I, Algebra I Honors, Geometry, Geometry Honors, Algebra II, Algebra II
  Honors, Mathematical Reasoning for Decision Making, Precalculus Honors, AP Precalculus,
  Calculus Honors, Statistics, AP Statistics, AP Calculus AB, AP Calculus BC. Plus the
  Dual Enrollment follow-on courses from the math pathway PDF (College Algebra, Intro to
  Statistics, Precalculus, College Trigonometry, Calculus & Analytic Geometry I/II/III,
  Differential Equations, Linear Algebra, Applied Calculus).
- _Science:_ Biology I, Biology I Honors, AP Biology, Physical Science, Physical Science
  Honors, Chemistry I, Chemistry I Honors, AP Chemistry, Organic Chemistry Honors, Ecology,
  AP Environmental Science, Human Anatomy & Physiology, Human Anatomy & Physiology Honors,
  Physics I, Physics I Honors, AP Physics 1, AP Physics 2, AP Physics C, Scientific Research
  Honors, Astronomy / Astronomy Honors (elective credit only, **not** a lab science).

Every course above goes into the **master catalog** (see section 6.1). The school then marks
which ones it actually offers, and the build produces an app containing only those.

Even in Phase 1 we encode **all 14 requirement buckets** so the tracker is meaningful - the
non-Math/Science buckets just won't have searchable courses yet. Later phases add English,
Social Studies, World Language, Fine Arts, Wellness/PE, Computer Science, and CTE courses.

### 6.1 Configuration file (school picks the courses)

Before the build, the school edits two config files. **You never edit the app HTML directly.**

**`config/courses.csv`** - the master catalog, one row per course, opened in Excel / Google
Sheets. Columns:

| Column | Meaning | Who fills it |
|---|---|---|
| `Offered` | `Y` / `N` - include this course in the app? | **School** |
| `Code` | WCS course code (e.g. `G03H20`) | pre-filled |
| `Name` | Course name | pre-filled |
| `Department` | Math, Science, ... | pre-filled |
| `Level` | Standard / Honors / AP / DualEnrollment | pre-filled, school may adjust |
| `Grades` | e.g. `10,11,12` | pre-filled, school may adjust |
| `Credit` | e.g. `1.0` | pre-filled |
| `Prerequisites` | plain-text rule, e.g. `Geometry AND Algebra II (concurrent OK)` | pre-filled, school may adjust |
| `Satisfies` | requirement key(s), e.g. `science.lab` | pre-filled |
| `Description` | catalog description | pre-filled |
| `Notes` | anything the school wants shown in the modal | **School** (optional) |
| `SourcePage` | page in the planning guide | pre-filled |

To offer a course, set `Offered` to `Y`. To hide one, set `N` (or delete the row). To add a
course that is not in the guide, add a new row and fill every column.

**`config/school.json`** - branding and settings:

```jsonc
{
  "schoolName": "",                     // e.g. "Spartan High School"
  "colors": {
    "primary":   "#0C2340",            // Auburn navy blue (confirm exact hex)
    "secondary": "#E87722"             // Auburn burnt orange (confirm exact hex)
  },
  "logoFile": "config/logo.png",        // Spartan head logo, added later; optional until then
  "creditTarget": 23,                   // Traditional Diploma total
  "gradYears": [2027, 2028, 2029, 2030, 2031]
}
```

The 14 requirement buckets and the state/WCS substitution tables are **fixed in code**, not in
config - they come from law and policy, not local choice.

### 6.2 Build step

`build.js` (run by us, or by the school with one command):

1. read `config/courses.csv`, keep rows where `Offered = Y`, convert to the course-record
   shape in section 5.1;
2. read `config/school.json` for name, colors, logo;
3. inline the logo as a base64 data URI if present;
4. concatenate the vendored libraries and `src/` modules into `src/index.html`;
5. write `dist/wcs-planner.html` - the single file students download.

Re-running the build after editing the CSV regenerates the app. No code changes needed to
change the course list.

---

## 7. Proposed file / module layout (dev)

```
config/
  courses.csv                # master catalog; school sets Offered = Y/N
  school.json                # name, colors, logo path, credit target, grad years
  logo.png                   # Spartan head (added later)
src/
  index.html                 # shell: <head>, tab bar, mount points
  styles/app.css             # Times New Roman, color variables from school.json
  data/
    requirements.js          # 14 buckets, required courses, substitution tables (fixed)
    substitutions.js         # TN 3.103 + WCS appendix lists as data (fixed)
    sequences.js             # recommended math/science pathway data + helpers
  core/
    engine.js                # evaluate(), warnings, substitution allocation
    prereq.js                # prerequisite tree resolver
    state.js                 # load/save, localStorage, migrations
  io/
    pdf-export.js            # jsPDF: readable pages + hidden metadata payload
    pdf-import.js            # custom metadata reader + white-text fallback + manual entry
  ui/
    tabs.js  dashboard.js  classes-taken.js  future-classes.js
    requirement-tracker.js  class-search.js  course-modal.js
  vendor/                    # jspdf, jspdf-autotable, pako (pinned versions) - no pdf.js
build.js                     # read config + inline vendor/src -> dist/wcs-planner.html
dist/
  wcs-planner.html           # the one file students download
```

`build.js`: read the config, filter the catalog, inline each `vendor/*` and `src/*` into
`index.html` in order, embed the logo as a data URI, write `dist/wcs-planner.html`. No
framework; vanilla JS plus small render helpers keeps the bundle lean and the single-file
output debuggable.

---

## 8. Build phases

| Phase | Deliverable |
|---|---|
| **0. This plan** | Agree scope, data model, PDF strategy, remaining open items below. |
| **1. Config + master catalog** | `config/courses.csv` filled with the Math + Science catalog, `config/school.json`, `build.js` filtering by `Offered`. **You review the CSV and pick courses.** |
| **2. Data foundation** | `requirements.js`, `substitutions.js`, `sequences.js`. |
| **3. Engine** | `prereq.js`, `engine.js` + a test page proving requirement math and substitution allocation on hand-built sample plans. |
| **4. Shell + Future Classes + Course Modal** | Tab nav, 4-year grid, add/remove, modal with "satisfies" + add action. localStorage autosave. Times New Roman, school colors. |
| **5. Requirement Tracker + Dashboard** | Full bucket breakdown with click-to-expand course lists, warnings, credit totals. |
| **6. Class Search** | Department then level filtering, text search, result rows open the modal. |
| **7. PDF export** | jsPDF readable pages + hidden metadata payload. |
| **8. PDF import** | Custom metadata reader, white-text fallback, manual-entry path. Round-trip test: export, re-import, identical state. Test on `file://` in all four browsers here (pulled forward). |
| **9. Polish** | Print styling, empty states, error messages, help text, accessibility, cross-browser check. |
| **10. Expand catalog** | Add remaining departments to `courses.csv`, one at a time, each reviewed by you. |

---

## 9. Decisions & open questions

### Decided

- **Diploma type:** v1 models the **Traditional Diploma (23 credits)** only. Data model stays
  extensible; Honors / State Distinction / Industry 4.0 are out of scope for now.
- **Year scheduling:** simple **list of courses per year** with a running credit total. Normal
  load = 6 credit courses + 1 study hall. A **7th credit course** triggers an advisory warning
  (no study hall that year; needs a parent-signed request form; granted only if the master
  schedule permits). No period grid. Not a block.
- **Prerequisite enforcement:** **warn only.** When a student adds a course whose prerequisites
  aren't completed/scheduled earlier, show a warning naming the missing prerequisite(s):
  "You haven't met the prerequisite for this class: _<course>_." Adding is still allowed.
- **Past classes entry:** the **Classes Taken** tab has an **"Add a class" option that works
  the same way as the Future Classes tab** - search/pick a course, choose the year it was
  taken, optionally record a grade/credit. This is available regardless of whether a prior-year
  PDF was imported (freshmen, transfers, or anyone correcting an import).

- **PDF save data:** PDF only. The state payload is **hidden in the PDF's metadata** (not on
  any page, not visible when opening/reading/printing/selecting text). A white-on-white
  trailing-page copy is a secondary fallback. Confirmed acceptable.
- **Course levels:** **Standard / Honors / AP / Dual Enrollment.** No IB (not offered). That is
  the complete filter set.
- **Course review:** the school reviews every course row in `config/courses.csv` manually.
- **Branding:** school colors are **Auburn University blue and orange** (navy `#0C2340`,
  burnt orange `#E87722` - exact hex to confirm). Spartan-head logo to be supplied later and
  dropped in as `config/logo.png`. School name to be entered in `config/school.json`.
- **No emojis; Times New Roman; large readable text** across app and PDF.

- **Elective focus (partial counselor answers, Oct 2026):** see `config/counselor-answers.md`.
  Four areas (AP, Fine Arts & Humanities, CCTE, Math & Science); AP = any 3 AP courses; CCTE = 3
  courses in one pathway; Fine Arts & Humanities = mix-and-match but beyond the fine arts
  requirement; extras are general electives; graduation total is 22 credits.

### Still open

1. **Exact brand hex values** - confirm the navy and orange, or send the values the school
   already uses on other materials.
2. **`config/school.json` values** - school name and the list of graduating-class years to
   offer in the dropdown.
3. Anything needed for **SAILS / credit-recovery / pass-fail** courses, or are those out of
   scope? (They can still be entered as past classes with a credit value; they just would not
   be their own filter.)

---

## 10. Risks

- **`file://` quirks:** blob URLs and `fetch` of local assets behave differently under
  `file://`. Mitigation: inline everything, no `fetch`, no pdf.js worker, test on `file://`
  early (Phase 8 test pulled forward).
- **Students editing/renaming the PDF** before re-upload: mitigated by the white-text fallback,
  printed-table read, and manual entry, plus a clear "upload the PDF this tool made" instruction.
- **Metadata stripping:** some PDF tools drop metadata on save. Mitigated by the secondary
  white-on-white payload copy on a trailing page.
- **Catalog drift:** WCS updates the guide yearly. The catalog is a CSV with `SourcePage`
  refs, so the annual update is a contained edit and re-build, not a code change.
- **Substitution complexity:** Policy 3.103's "one course, one requirement" rule with
  exceptions needs careful allocation logic and test cases; its own review item in Phase 3.
- **Hand-editing the CSV:** a stray comma or wrong `Satisfies` key breaks a row. Mitigation:
  `build.js` validates every row and prints a clear per-row error instead of shipping a broken app.

---

## 11. Will the HTML file be abnormally large?

No. Estimated `dist/wcs-planner.html`:

| Part | Size (uncompressed on disk) |
|---|---|
| jsPDF + jspdf-autotable (PDF export) | ~360 KB |
| pako (gzip for the hidden payload) | ~45 KB |
| Custom PDF metadata reader | ~5 KB |
| Our app code (engine, UI, styles) | ~200-300 KB |
| Course data - Math + Science only | ~40-70 KB |
| Course data - full catalog (later) | ~300-500 KB |
| Spartan logo (PNG, embedded as data URI) | ~30-100 KB depending on the file |
| **Total, Math + Science build** | **~0.9-1.3 MB** |
| **Total, full catalog build** | **~1.3-1.8 MB** |

For comparison that is smaller than a typical phone photo and far smaller than a PowerPoint.
Because it runs from local disk there is no download-speed concern after the first save, and
browsers open a 1-2 MB HTML file instantly.

The one deliberate choice that keeps it small: **not bundling pdf.js** (~1.5 MB on its own).
We only need to read our own payload out of the PDF's metadata, which a ~150-line parser does.
If we later needed to import arbitrary third-party transcripts, adding pdf.js would roughly
double the file - worth revisiting only if that requirement appears.
