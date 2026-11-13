# Mole Conversions Practice

A practice set of eight problems that is different for every student. Open `index.html` in a browser. Nothing to install, no internet needed.

## What each student gets
Thirteen problems, shown **one at a time**:
- **Problems 1–10: mole conversions** between particles (atoms and molecules), moles, grams, and liters of gas at STP. There are 12 possible conversions (6 one-step, 6 two-step). Each set has 5 one-step and 5 two-step conversions, in random order, and never the same conversion twice. Each problem uses a different substance.
- **Problem 11: empirical and molecular formula** where the mole ratio comes out in whole numbers.
- **Problem 12: empirical and molecular formula** where the ratio comes out as 1 : 1.5, so everything has to be multiplied by 2.
- **Problem 13: an iron oxide lab.** A data table gives crucible-and-lid readings (empty, with iron powder, and after three heatings). The student works through five parts: (a) the mass of iron, (b) the mass of iron oxide, (c) the mass of oxygen, (d) the moles of iron and of oxygen, and (e) the empirical formula. Masses come from subtracting the empty crucible, and the oxide uses the last reading, when the mass stopped changing (heating #1 is a trap on purpose).
  The oxide is FeO, Fe₂O₃ or Fe₃O₄, picked per student, and the crucible and iron masses are random, so about every student has different numbers. Each part is checked on its own: correct parts lock with a check mark, a correct partial check costs no attempt, and each wrong part gets its own note (for example, "That is the crucible and the iron together").

## How it works for the student
- Type an answer and press **Check**. Answers are accepted to the correct significant figures (a small rounding difference is fine).
- There are no hints. A wrong answer gets a specific message when the mistake is recognizable (a flipped factor, a power of ten, 1.5 rounded to 2, the empirical formula typed as the molecular formula).
- **Show solution** unlocks only after 3 wrong attempts on a problem. **Using it means that problem does not count.** The student then gets a **similar problem** in the same spot (the same kind of problem with a new substance and new numbers, or a new oxide and new lab data for problem 13) and has to answer that one correctly to get credit for the spot. If they use the solution again, they get another similar problem, and so on. The set is complete only when all 13 spots are answered correctly.
- After a problem is answered correctly, **Next problem** shows the next one. The numbered dots at the top let a student go back to finished problems, but not ahead.
- No constants or atomic masses are shown. A short reminder tells students to use the mole conversion chart in their notes.
- After problem 13, a results panel shows how many were correct on the first try, how many needed a similar problem after a solution was shown, and the tries per problem, with a name box and a print button.
- **Save progress:** work is saved automatically after every answer, and a **Save progress** button under each problem saves on demand and says when it saved. Without a learning system the work is kept in the browser; inside a class it is kept with the class (see below). A reload or a return visit brings back the same set, the same problem, the answers typed so far and the tries used. **New set** makes a fresh set (outside a class).

## Set numbers
Every set has a number, shown under the title. The same number always rebuilds the same eight problems. To see a student's exact set, open `index.html?set=12345` with their number.

To change how many conversions a set has, edit `NCONV` in `js/assignment.js` (it must be an even number up to 12). The wrong-attempts gate is `REVEAL`.

## SCORM package (for Schoology, Canvas, Moodle, Blackboard...)
`dist/mole-conversions-practice-scorm12.zip` is a SCORM 1.2 package. In Schoology: Add Materials, then Add File/Link/External Tool, then **SCORM Package**, and upload the zip.

- **Completion:** reported as **completed** only when all 13 problems have been **answered correctly**. Looking at a worked solution never counts: that spot is replaced by a similar problem that must be answered correctly. Completion is never taken back.
- **Score:** reported after every answer, as the share of the 13 spots completed (0 to 100). It reaches 100 when the set is complete, whether or not solutions were used along the way; the printable results page shows how many problems needed a similar problem.
- **Save progress:** the student's set number, place, answers and tries are stored with the class (SCORM `suspend_data`, plus `lesson_location`), so they can close the page and continue later on any computer. The packed answers stay well under the 4096-character limit.
- **One set per student:** inside a class the "New set" and "Try a new set" buttons are hidden, so a student cannot redraw problems to chase a better score.
- Opened on its own (not inside a learning system), the page works the same and keeps progress in the browser.

After changing any file, rebuild the zip with `sh build-scorm.sh`.

## Files
| File | Job |
|---|---|
| `js/assignment.js` | builds the set from the set number, checks answers, runs the page |
| `js/data.js`, `js/chem.js`, `js/steps.js`, `js/problems.js`, `js/diagrams.js`, `js/ui.js`, `css/base.css` | the chemistry engine and step-by-step display, copied from `simulations/moles-study-guide` so this folder works on its own |
| `js/scorm.js` | reports score and completion to the learning system, and stores the saved work |
| `css/practice.css` | layout of this page |

## Tests
```bash
node tests/set.test.js   # 2,500 sets: distinct conversions, answers re-calculated independently, formula ratios
node tests/ui.test.js    # works a whole set in a real browser (Playwright)
node tests/scorm.test.js # runs it inside a pretend learning system: score, completion, saving, resuming
```
