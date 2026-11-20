# Classroom app

A local web app for running a class: worksheet builder, library, seating charts, calendar, to-dos, lesson plans,
pacing guides, test scoring/scanning (the original Test Scoring Tracker), classroom tools and share packages.
It runs on your own computer and is opened at <http://127.0.0.1:3000>. See `../docs/HOW_IT_WORKS.md` for how it is put together.

## Run it while developing

```bash
cd app
npm ci
npm run dev        # http://127.0.0.1:3000
```

Teachers do not do this. They download the ready-made Windows zip built by GitHub Actions (see `../docs/PLAN.md`).

## Check it

```bash
npx tsc --noEmit   # type check
npm run build      # full production build
```
