# Moles Study Guide

An interactive study guide for Honors Chemistry Unit 5 (Moles and Molar Quantities), built from the teacher's notes packet. Open `index.html` in a browser. There is nothing to install and no internet connection is needed.

## What is in it
- **Seven topics** (5.1 The mole, 5.2 Molar mass, 5.3 Mole conversions, 5.4 Gas volume at STP, 5.5 Percent composition, 5.6 Empirical and molecular formulas, 5.7 Hydrates). Each has six sections: Learn it, The method, Worked examples, Watch out, Practice, Quick check.
- **Color-coded solutions.** Every number has a job and a color: given, find, looked up, count, and canceled units. Worked examples are shown one step at a time with the reason for each step.
- **Practice** with a hint ladder (plan, then setup, then the full solution) and feedback that names the likely mistake (flipped factor, skipped step, parentheses not multiplied, 1.5 rounded to 2, and so on).
- **A large question bank.** 49 problems from the packet, 84 hand-written concept questions, and generators for 9 problem types that mix 140+ compounds, 35 hydrates and 79 formulas with random numbers. In a test of 180,000 generated questions, more than 100,000 were different. Multiple-choice versions of the calculations use realistic wrong answers, each explained.
- **Quiz me** (calculations, multiple choice or both, by topic, with weak-spot focus and no repeats), a 7-question checkup, a Mole Map explorer, a cheat sheet (printable) and search.

## How the code is organized
| File | Job |
|---|---|
| `js/data.js` | periodic table, compound pools, names |
| `js/chem.js` | formula parser, molar mass, composition, sig figs, empirical/hydrate solvers |
| `js/steps.js` | builds the step-by-step solution for each problem type |
| `js/problems.js` | the packet problems and the random problem generators |
| `js/qbank.js` | concept questions and multiple choice built from generated problems |
| `js/ui.js`, `js/widgets.js`, `js/diagrams.js` | steppers, practice cards, small interactive widgets, pictures |
| `js/pages-learn.js`, `js/pages-tools.js`, `js/app.js` | topic pages, start/practice/cheat pages, router |

## Tests
```bash
node tests/chem.test.js   # chemistry engine, every packet answer, generators, question bank
node tests/ui.test.js     # real browser (Playwright): every page, example, quiz and widget
```
