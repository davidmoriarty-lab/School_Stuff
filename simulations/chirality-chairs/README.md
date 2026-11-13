# Chirality and Chair Conformations

A practice set of 12 problems for organic chemistry. Open `index.html` in a browser. Nothing to install, no internet needed.

## The problems
**Problems 1–8: chirality.** A molecule is drawn as a skeletal structure with wedges and dashes. The student:
1. clicks every **chiral center** on the drawing (or ticks "no chiral centers"), and
2. chooses **R or S** for each one.

Each set uses 8 different molecules, from easy to hard: simple chains, amino and hydroxy acids (including cysteine, where the CIP rules give a surprise), a drug (ibuprofen), rings with double bonds (carvone, limonene), and molecules with two or three chiral centers (tartaric acid, threonine, ephedrine, menthol). The molecule is shown turned 180° half the time, and each chiral center has a coin-flip chance of being drawn as its mirror image, so R and S come up equally often and students rarely see the same answer.

**Problems 9–12: cyclohexane chairs.** A flat ring is shown with 2 or 3 substituents on wedges (up) and dashes (down). The student:
1. **builds the chair** by dragging each substituent onto an axial (blue) or equatorial (orange) position of a template that already has all 12 positions drawn in, and then
2. does the **ring flip** on a second, flipped template.

The four chair problems are a 1,2-pattern, a 1,3-pattern, a 1,4-pattern and a three-substituent pattern. Cis or trans, the groups, and the carbons are random.

## How the chairs are checked
Students may put the groups on **any carbon**, so the answer is not one fixed set of positions. The check asks:
- Are the two groups the right number of carbons apart (1,2 / 1,3 / 1,4)? This is done for every pair.
- Are they on the right sides? Wedge + wedge (or dash + dash) is **cis**: both pointing up (or both down). Wedge + dash is **trans**: one up, one down. An axial bond points the way its carbon points (the carbons alternate up, down, up, down); an equatorial bond points the other way. So whether a cis pair is axial/equatorial or axial/axial depends on how far apart they are, exactly as in the textbook table.
- In the ring flip: the same checks, plus **every group must switch** between axial and equatorial.

Identical groups (two CH₃, for example) can be placed either way round. Where there are three groups, the mirror-image arrangement is accepted.

You can drag a chip onto a position, drag a placed chip to another position, or drag it off the chair to put it back. Tapping a chip and then a position also works (for touch screens), and so does the keyboard (Enter on a chip, then Enter on a position).

## Rules for students
- No hints. A wrong answer gets a specific message (for example, "Center 1 is not a chiral center: it has two hydrogen atoms", or "Cl and CH₃ are two carbons apart in the flat ring but neighbors on your chair").
- The worked solution unlocks after **3 wrong attempts**. It shows the CIP priorities with numbers on the drawing, or a correct chair and ring flip.
- Using the solution means that problem does **not count**: the spot gets a **similar problem** (a different molecule of the same difficulty, or the same chair pattern with new groups) that must be answered correctly.
- The set is complete when all 12 spots are answered correctly. A results page lists each problem.
- Progress saves automatically in the browser, plus a **Save progress** button. Each set has a number; `index.html?set=12345` rebuilds the same set.

## How the chemistry works
`js/cip.js` follows the real Cahn–Ingold–Prelog procedure: each group is a tree growing outward from the center, compared one sphere at a time (atomic number first, then the set of atoms attached, and so on), with duplicate atoms for double bonds, ring closures followed around, and undrawn hydrogens added back. R or S comes from the 3D positions that the wedges and dashes give (an undrawn hydrogen points opposite to the other three groups). Answers are never stored: they are worked out from the drawing, so changing a molecule can never leave a wrong key.

`js/chair.js` holds the chair model: six carbons alternately above and below the ring plane, an axial and an equatorial direction at each, and the ring-flip rule.

## Files
| File | Job |
|---|---|
| `js/cip.js` | CIP priorities, chiral centers, R/S, and the reasons |
| `js/molecules.js` | the pool of 21 molecules and the turn/flip transforms |
| `js/chair.js` | chair geometry, the cis/trans and distance checks, the ring flip |
| `js/draw.js` | skeletal structures, the flat ring, the chair template (SVG) |
| `js/set.js` | builds each student's 12 problems from the set number |
| `js/app.js` | the page: one problem at a time, clicking, dragging, saving |

## Tests
```bash
node tests/cip.test.js     # priorities and R/S against textbook facts (L-amino acids, D-glucose, cysteine...)
node tests/chair.test.js   # the chair rules against the axial/equatorial table for 1,2 / 1,3 / 1,4
node tests/set.test.js     # 2,500 sets: distinct molecules, solvable chairs, R and S balanced
node tests/ui.test.js      # a whole set in a real browser with real mouse drags (Playwright)
```
