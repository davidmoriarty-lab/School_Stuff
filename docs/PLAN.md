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

## Phases (status)
1. Foundation: merge, package build, Settings page, shell, backups. **Done**
2. Library: browse/search/preview/print, My files uploads, pinning. **Done**
3. Gradebook: the original tracker (tests, scanning, curves, AP tags, reports) inside the shell. **Done**
4. Classroom: seating charts (presets, snap, assign, print), random picker, group maker, timer. **Done**
5. Planning: calendar, lesson plans (customizable template), pacing guides (auto dates), to-do, Today page. **Done**
6. Worksheet builder: drag-and-snap, 20 chemistry block types, templates, answer key, print. **Done**
7. Share Packages (`.classpack`). **Done**
8. Ideas for later: question bank blocks drawn from the molecule/problem JSON files, rubric builder, seating by group
   history, standards tracking, sub-plan packet, calendar import (.ics), restore-from-backup button.

## Open items
- `xlsx` (SheetJS) has known advisories with no npm fix; replace or isolate it when the import/export code is reviewed.
- GitHub repo is public: it contains teacher editions and answer keys. Consider making it private.
