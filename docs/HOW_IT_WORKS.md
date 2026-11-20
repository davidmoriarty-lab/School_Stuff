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
