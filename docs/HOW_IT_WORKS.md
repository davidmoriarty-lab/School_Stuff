# How the Classroom app works

Written for someone who can read a little code and wants to know the logic behind it.

## The big picture

```
 your browser  ──►  http://127.0.0.1:3000  ──►  Node server (Next.js)  ──►  data/scoring.db   (SQLite file)
                                                       │
                                                       └─►  library/   (read-only class files)   data/my-files/  (your uploads)
```

* Everything runs on **one computer**. The server only answers to `127.0.0.1` (`src/proxy.ts` refuses anything else),
  because the app has no login and holds student data.
* All your data is in the `data/` folder next to the app. Copy that folder to back it up or move it.
* The page you see is built by **React** components. Pages that need data are built on the server
  (`src/app/**/page.tsx`); interactive parts run in the browser (files starting with `"use client"`).

## Where things live (`app/src`)

| Folder | What it holds |
|---|---|
| `app/` | One folder per page (`worksheets`, `seating`, `calendar`, `todos`, `lessons`, `pacing`, `library`, `share`, `tools`, `settings`, and the original tracker pages). `api/` has the download/upload endpoints, `files/` serves Library files. |
| `components/` | Reusable pieces: the sidebar, pop-up `Modal`, `QuickSettings` (the gear on each page), and the `worksheet/` and `seating/` editors. |
| `lib/` | Logic with no screen: `settings.ts` (every option and its default), `store.ts` (saving and loading), `chem.ts` (periodic table, molar mass, subscripts), `worksheet.ts` (block types and templates), `seating.ts`, `pacing.ts`, `share.ts`, `library.ts`. |

## Saving data: two small tables

* `setting(key, value)`: one row per option (accent color, course list, ...). Stored as JSON.
* `item(uid, kind, title, data, ...)`: **every** worksheet, lesson plan, pacing guide, seating chart, calendar event and
  to-do is one row, with its contents as JSON in `data`. `kind` says which it is.

Using one generic table means new features need no database changes, and **Share Packages are trivial**: an item is already
just JSON, so a package is a list of items written to a file.

The scoring tracker keeps its own tables (`course`, `test`, `student`, ...) in the same database file.

## Customization

* **Settings page** (`app/settings`): app name, accent color (one color is turned into five shades in `settings.ts`),
  light/dark, text size, which sections show, courses, periods, event types, to-do lists, the lesson plan template,
  print options and backups.
* **Quick settings**: the gear/"Options" button on a page opens a small pop-up with only that page's options.
  They are saved under `settings.prefs.<page>`.
* **Dark mode** flips the page colors with a CSS filter, then flips pictures and worksheet paper back.

## The worksheet builder

A worksheet is **pages**; a page is **blocks** with `x, y, width, height` in pixels (96 per inch, so Letter is 816 x 1056).
Each kind of block is defined once in `lib/worksheet.ts` (`BLOCK_DEFS`): its name, default size, default content and the
fields the right-hand panel shows. The panel is generated from that list, so a new block type needs one entry there and one
drawing function in `components/worksheet/BlockView.tsx`.

* **Dragging** changes `x`/`y`. **Snap** first rounds to the grid, then pulls edges toward other blocks and the page
  margins when within 6 px (the pink lines).
* **Chemistry text**: `lib/chem.ts` turns `H2SO4` into H₂SO₄, `Ca^2+` into Ca²⁺ and `->` into an arrow. It only changes
  words that look like formulas, and you can switch that off per block.
* **Answer key**: blocks that have answers draw them in red when "key" is on. The molar-mass block computes its own key
  from the periodic table data.
* **Print** is a separate page (`/worksheets/<id>/print`) that draws the same blocks with no editing chrome and
  `@page` rules for paper size.
* The editor saves itself a second after you stop changing things. Undo keeps the last 80 states.

## Student profiles

Every student on a roster gets a profile (created when a roster is imported or a student is added, and filled in later by you):
preferred name, pronouns, name pronunciation, flags (IEP, 504, ELL, ... editable in Settings), accommodations, health notes, guardian
contact, a note "for a substitute", private notes, a dated log, and any extra fields you define.

* Stored in its own table, `student_profile` (see `lib/profiles.ts`), **not** as a shareable item, so profile data can never end
  up in a Share Package. It is deleted automatically if the student is deleted.
* The **preferred name** replaces the first name on seating charts, the random picker and group maker (`lib/roster.ts`).
  A roster file with a "Preferred Name" column fills it in on import.
* **Substitute roster** (`/profiles/print`): pick a class, table or card layout, which fields to include, and an optional seating
  chart. Your **private notes are left off unless you tick them**. Every choice is stored in the web address, so the printout
  always matches the screen.

## Sub plans and bell schedules

* A **bell schedule** (`/bell-schedules`) is a named list of time slots such as "Period 1, 8:00 to 8:50, Honors Chemistry". Make one per
  kind of day (regular, early release, assembly) and star one as the default.
* A **sub plan** (`/subplans`) has a date, a bell schedule and an ordered list of sections: teacher and room info, the **day schedule**
  (one row per slot with what the class is doing, a worksheet from the builder, other materials and copies), plus ready-made
  sections (attendance, behavior, emergency, passes, technology, early finishers, helpful students, contacts, checklist, space for the
  sub to write). Drag a section's handle to reorder, use the eye to leave one off the printout, or copy an earlier sub plan.
* Changing the bell schedule updates the times but **keeps your notes**: slots are matched by id and then by name ("Period 1").
* Sub plans do not include a roster. Print rosters from Student profiles: one class, several, or all classes at once.
* Sub plans appear on the calendar on their date. Both kinds can be shared in a package.

## Question bank and test builder

* **Question bank** (`/questions`): every question is one item of any kind: multiple choice, select-all, true/false, short answer,
  free response (with parts and a rubric), fill in the blank, matching, calculation, balance equations, names and formulas, and
  put-in-order. Each kind's fields are listed once in `lib/questions.ts` (`QTYPES`) and the editor builds itself from that list,
  the same way the worksheet builder's right-hand panel does. Any question can carry pictures (paste with Ctrl+V) and tables,
  a symbol palette helps with chemistry characters, and questions are tagged by course, unit, topic, difficulty and tags.
  "Import from class materials" brings in the acids and bases quiz and the SN1/SN2/E1/E2 problems, pictures included.
* **Test builder** (`/testbuilder`): pick questions from the bank (filter, select, or add random ones), add section headings and page
  breaks, pin a question in place, override points. A test keeps **its own copy** of each question, so changing the bank later never
  alters a test you already gave (the refresh button pulls the latest if you want it).
* **Versions A to D**: `buildVersion()` in `lib/questions.ts` shuffles with a seeded random generator, so a version is
  reproducible and its answer key always matches its own paper. Questions move only inside their section, pinned ones stay put,
  "All of the above" stays last, and matching columns and ordering steps are shuffled too. Answer keys print with a quick-key grid,
  and a cross-reference table lists each question's number on every version.
* **Gradebook**: "Gradebook" turns Version A into a test in the Gradebook, so you can print scoring sheets and scan results.
  Questions worth more than 3 points are split into parts, which is how the scoring sheets work.

## Periodic table

The worksheet "Periodic table" block uses the College Board AP Chemistry table (`app/public/ap-periodic-table.svg`, cropped from
their 2020 PDF; (c) College Board). A vector file, so it stays sharp at any size. The block can also show a colored table that the
app draws itself from `lib/chem.ts`.

## Share packages

A `.classpack` file is plain JSON: `{ format, version, from, items: [...], files: [...] }`.
Rules enforced in `lib/share.ts`: seating charts are exported with every seat emptied (student data never leaves),
executables and path tricks are rejected on import, files are placed under `My files/Imported/<sender>`, and
those files are served with a sandbox header so they cannot touch the rest of the app. Importing shows what would change
first and makes a backup before replacing anything.

## Packaging (how the Windows zip is made)

`.github/workflows/build-windows-package.yml` runs on a Windows machine at GitHub:
build the app in "standalone" mode, copy in the exact `node.exe` that built it (so the database engine matches),
add the class library and `Start App.bat`, start the result and check pages answer, then zip it.
