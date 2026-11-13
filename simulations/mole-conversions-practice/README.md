# Mole Conversions Practice

A practice set of eight problems that is different for every student. Open `index.html` in a browser. Nothing to install, no internet needed.

## What each student gets
- **Problems 1–6: mole conversions** between particles (atoms, molecules, formula units), moles, grams, and liters of gas at STP. There are 12 possible conversions (6 one-step, 6 two-step). Each set has 3 one-step and 3 two-step conversions, in random order, and never the same conversion twice. Each problem uses a different substance.
- **Problem 7: empirical and molecular formula** where the mole ratio comes out in whole numbers.
- **Problem 8: empirical and molecular formula** where the ratio comes out as 1 : 1.5, so everything has to be multiplied by 2.

## How it works for the student
- Type an answer and press **Check**. Answers are accepted to the correct significant figures (a small rounding difference is fine).
- Wrong answers get a specific message when the mistake is recognizable (a flipped factor, a skipped step, a power of ten, 1.5 rounded to 2, the empirical formula typed as the molecular formula).
- **Hint** unlocks after the first try (what to do first), **More help** after the second (the setup, without the arithmetic), and **Show solution** after the third. A problem whose solution was shown does not count as correct.
- A reference box lists Avogadro's number, 22.4 L/mol and the atomic masses needed for that set.
- When all eight are finished, a results panel shows the score and the tries per problem, with a name box and a print button.
- Work is saved in the browser, so a reload keeps the same set and progress. **New set** makes a fresh one.

## Set numbers
Every set has a number, shown under the title. The same number always rebuilds the same eight problems. To see a student's exact set, open `index.html?set=12345` with their number.

## Files
| File | Job |
|---|---|
| `js/assignment.js` | builds the set from the set number, checks answers, runs the page |
| `js/data.js`, `js/chem.js`, `js/steps.js`, `js/problems.js`, `js/diagrams.js`, `js/ui.js`, `css/base.css` | the chemistry engine and step-by-step display, copied from `simulations/moles-study-guide` so this folder works on its own |
| `css/practice.css` | layout of this page |

## Tests
```bash
node tests/set.test.js   # 2,500 sets: distinct conversions, answers re-calculated independently, formula ratios
node tests/ui.test.js    # works a whole set in a real browser (Playwright)
```
