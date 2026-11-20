# Classroom App: plan

One local web app for running a class. It runs on the teacher's own computer at http://127.0.0.1:3000.
GitHub holds the code; a GitHub Actions job builds a Windows zip that contains everything needed
(the app, its own portable Node, and the class library), so nothing is downloaded or installed on the work computer.

## Rules
- Runs only on 127.0.0.1 (`app/src/proxy.ts` refuses anything else). No login, so it must stay local.
- Student data lives only in the local `data/` folder (git-ignored, never in the zip).
- Everything customizable: one Settings page for global options, pop-up panels for per-page options,
  modules can be switched off, custom fields.
- Print support everywhere it makes sense (shared print styles + print buttons).
- No attendance (the school uses another system).

## Layout
- `app/`         the Next.js app (started life as the Test Scoring Tracker)
- `packaging/`   launcher (`Start App.bat`) and read-me that go in the zip
- `.github/workflows/build-windows-package.yml`   builds `ClassroomApp-windows.zip`
- everything else (index.html, simulations, chemistry_notes, ...) is the class library; it is copied into the zip's `library/` folder

## Phases
1. Foundation: merge, package build, Settings page, shared shell (done: merge + package build; next: Settings)
2. Library: browse/search/preview worksheets, tests, slides, notes; add your own files; print
3. Gradebook: the existing tracker (tests, scanning, curves, AP tags, reports) inside the shell
4. Classroom: rosters, seating charts (drag-and-drop, saved layouts, print), notes, accommodations flags, parent-contact log
5. Planning: calendar, lesson plans, pacing guides, sub plans, to-do list, Today dashboard
6. Share Packages: export selected items (worksheets, lesson plans, pacing guides, seating layouts) to a `.classpack` file;
   another teacher imports it and it adds or updates their items. Never includes student data; asks before overwriting.
7. Extras: random picker, group maker, timers, printable sheet maker, backup/restore

## Open items
- `xlsx` (SheetJS) has known advisories with no npm fix; replace or isolate it when the import/export code is reviewed.
- GitHub repo is public: it contains teacher editions and answer keys. Consider making it private.
