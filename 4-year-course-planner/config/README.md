# Configuration files

Edit these two files to control what the planner app contains. You do **not** edit the app
HTML directly. After editing, the build step regenerates `dist/wcs-planner.html`.

## `courses.csv` - the course catalog

One row per course. Open it in Excel or Google Sheets.

**To choose what your school offers: set the `Offered` column to `Y` or `N`.**
Only `Y` rows appear in the app. `N` rows are ignored (you can also delete the row).

Current defaults: common on-campus Math and Science courses are set to `Y`. Dual Enrollment
courses, Organic Chemistry Honors, and Astronomy are set to `N` - turn on the ones you offer.

| Column | What it is | Safe to edit? |
|---|---|---|
| `Offered` | `Y` = include in the app, `N` = leave out | **Yes - this is the main one** |
| `ID` | Unique internal id. Keep it unique; don't reuse. | Only when adding a new row |
| `Code` | WCS course code from the planning guide | Yes |
| `Name` | Course name shown to students | Yes |
| `Department` | `Math`, `Science`, … (drives the Class Search department filter) | Yes |
| `Level` | One of: `Standard`, `Honors`, `AP`, `DualEnrollment` (drives the level filter) | Yes |
| `Grades` | Comma-separated grade levels, e.g. `10,11,12` | Yes |
| `Credit` | Credit value, e.g. `1.0` or `0.5` | Yes |
| `Prerequisites` | Plain-English rule. Use course names, `AND`, `OR`, and `(concurrent OK)`. Example: `Geometry AND Algebra II (Algebra II may be concurrent)` | Yes |
| `Satisfies` | Which graduation requirement this course counts toward. One or more keys separated by `;` (see list below) | Yes - check carefully |
| `EPSO` | `Yes` / `No` - early postsecondary opportunity flag | Yes |
| `NCAA` | `Yes` / `No` - NCAA-approved course flag | Yes |
| `EOC` | `Yes` / `No` - has a state End-of-Course exam | Yes |
| `Description` | Text shown in the course pop-up window | Yes |
| `Notes` | Extra note shown in the course pop-up (optional) | Yes |
| `SourcePage` | Page in the planning guide the data came from (reference only) | Yes |

### `Satisfies` keys

| Key | Requirement |
|---|---|
| `math.algebra1` | Algebra I credit |
| `math.geometry` | Geometry credit |
| `math.algebra2` | Algebra II credit |
| `math.fourth` | 4th math credit (a course beyond Algebra II) |
| `science.biology` | Biology credit |
| `science.chemphys` | Chemistry or Physics credit |
| `science.lab` | 3rd lab science credit |
| `ss.world` | World History / AP Human Geography / AP European History |
| `ss.ushistory` | U.S. History |
| `ss.gov` | U.S. Government & Civics (0.5) |
| `ss.econ` | Economics (0.5) |
| `pe` | Physical Education (0.5) |
| `wellness` | Lifetime Wellness (1) |
| `finance` | Personal Finance (0.5) |
| `worldlang` | World Language (2, same language) |
| `finearts` | Fine Arts (1) |
| `compsci` | Computer Science (1) |
| `electivefocus` | Elective Focus (3) |

If a course can count as more than one thing (per TN Policy 3.103), list every key it is
eligible for, separated by `;`. The app enforces the "one course counts for only one
requirement" rule automatically.

### Adding a course not in the guide

Add a new row and fill in **every** column. Give it a unique `ID`.

## `school.json` - branding and settings

| Field | What to put |
|---|---|
| `schoolName` | Your school's name (shown in the app header and on the exported PDF) |
| `colors.primary` / `colors.secondary` | Auburn navy and orange are pre-filled - replace with exact hex if you have official values |
| `logoFile` | Leave as is; drop the Spartan head logo in at `config/logo.png` when ready |
| `creditTarget` | Total credits for the Traditional Diploma (currently 23) |
| `gradYears` | The graduating-class years offered in the student's dropdown - update yearly |

## After editing

Re-run the build (command TBD once the app is built) to produce a fresh
`dist/wcs-planner.html`. The build validates every `Y` row and reports any bad value
(unknown `Satisfies` key, missing field, malformed `Grades`) instead of shipping a broken app.
