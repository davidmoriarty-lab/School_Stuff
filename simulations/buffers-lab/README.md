# Buffers Lab (virtual lab)

A drag-and-drop version of the AP Chemistry Buffers Lab: prepare two buffers with a target pH of 4.75 from 50.0 mL of 0.83 M acetic acid, one with solid sodium acetate and one with 0.50 M NaOH, then measure the pH and find the percent error.

Open `index.html` in a browser. Nothing to install, no internet needed. Best on a computer, Chromebook or tablet (a phone screen is too small to drag comfortably).

## What students do
- **Pour** by dragging a stock bottle onto a graduated cylinder and holding the pour button (slow at first, then faster). Finish to the line with the dropper, one 0.05 mL drop at a time.
- **Read volumes** from the meniscus in the zoom window. The bench never shows a digital volume.
- **Weigh** sodium acetate: weigh boat on the 0.01 g balance, TARE, load the scoop at the jar, tap solid in or take a little out.
- **Mix**: tip the boat into the beaker and stir with the rod until the solid dissolves.
- **Measure pH**: drag the probe in and wait for "reading stable". Rinse the probe between solutions.
- **Notebook**: procedure checklist, pre-lab questions with answer checks (hints, never the answer), the lab's data table with "Check my data", percent error, the analysis questions, and a printable report. Notebook answers are saved in the browser; the bench itself starts fresh on a reload.
- **Optional stress test**: add 1.0 M HCl to each buffer to compare buffer capacity (analysis question 5).

## How the chemistry works
`js/chem.js` finds the pH of whatever is actually in a container by solving the charge balance
`[H+] + [Na+] = [OH-] + [C2H3O2-] + [Cl-]` with `Ka = 1.76 × 10^-5`. That one rule covers the plain acid, a correct buffer, too much NaOH, and every other mistake, so errors in measuring show up in the pH the way they do in a real lab. The model is ideal (no activity corrections), so a perfectly made buffer reads 4.75; the meter adds about ±0.01 of noise.

Things that go wrong on purpose: forgetting to tare, not stirring (the reading keeps drifting), undissolved solid, overfilling a cylinder, pouring straight into the beaker (its marks are only ±5 %), and moving the probe between beakers without rinsing.

## Files
| File | Job |
|---|---|
| `js/chem.js` | mixing, dissolving, pH, pre-lab answers |
| `js/glass.js` | draws the glassware and equipment to one scale (16 px = 1 cm) |
| `js/lab.js` | bench state, drag and drop, pouring, balance, stirring, pH probe |
| `js/notebook.js` | procedure, pre-lab, data table, analysis |

"Teacher view" under the bench shows the exact amounts in every container.

## Tests
```bash
node tests/chem.test.js   # chemistry engine
node tests/ui.test.js     # runs the whole lab in a real browser (Playwright)
```
