# Chirality and Chair Conformations

A practice set of 12 problems for organic chemistry. Open `index.html` in a browser. Nothing to install, no internet needed.

## The problems
**Problems 1–8: chirality.** A molecule is drawn as a skeletal structure with wedges and dashes. The student:
1. clicks a **chiral center** on the drawing (or ticks "no chiral centers"),
2. in the **window that opens for that one center**, clicks its four groups from highest priority to lowest (the groups get the numbers 1 to 4), then chooses **R or S**, and
3. repeats for every chiral center.

The window also draws the hydrogen that the skeletal structure leaves out, as a real **wedge or dash** bond to an H (it points opposite to the drawn wedge/dash, so it is a dash when the substituent is a wedge). Each center gets its own window with only its own four groups numbered, so two chiral centers next to each other never share (or overlap) priority numbers. The priorities are graded, not just the letter.

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
- No hints. A wrong answer gets a specific message (for example, "Center 1 is not a chiral center: it has two hydrogen atoms", "Center 2: the priority order is not right", "your priorities are right, but R/S is wrong", or "Cl and CH₃ are two carbons apart in the flat ring but neighbors on your chair"). If the letter does not even match the order the student numbered, the message says so.
- The worked solution unlocks after **3 wrong attempts**. It shows the CIP priorities with numbers on the drawing (one center at a time, with a tab for each center), or a correct chair and ring flip.
- Using the solution means that problem does **not count**: the spot gets a **similar problem** (a different molecule of the same difficulty, or the same chair pattern with new groups) that must be answered correctly.
- The set is complete when all 12 spots are answered correctly. A results page lists each problem.
- Progress saves automatically in the browser, plus a **Save progress** button. Each set has a number; `index.html?set=12345` rebuilds the same set.

## SCORM package (for Schoology, Canvas, Moodle, Blackboard...)
`dist/chirality-chairs-scorm12.zip` is a SCORM 1.2 package. In Schoology: Add Materials, then Add File/Link/External Tool, then **SCORM Package**, and upload the zip.

- **Completion:** reported as **completed** only when all 12 problems have been **answered correctly**. Looking at a worked solution never counts: that spot is replaced by a similar problem that must be answered correctly. Completion is never taken back.
- **Grade (score):** reported after every answer, as the share of the 12 spots completed (0 to 100). It reaches **100 when the set is complete**, whether or not solutions were used along the way. The printable results page shows how many were correct on the first try.
- **Save progress:** the set number, the place, tries, solutions shown and the work in progress are stored with the class (SCORM `suspend_data`, plus `lesson_location`), so a student can close the page and continue later on any computer. That includes a half-finished chiral center (which groups are numbered), and chips already placed on a chair or a ring flip. The red feedback messages are not saved. The packed data stays well under the 4096-character limit (worst case about a third of it).
- **One set per student:** inside a class the "New set" and "Try a new set" buttons are hidden.
- Opened on its own, the page works the same and keeps progress in the browser.

After changing any file, rebuild the zip with `sh build-scorm.sh`.

## How the chemistry works
`js/cip.js` follows the real Cahn–Ingold–Prelog procedure: each group is a tree growing outward from the center, compared one sphere at a time (atomic number first, then the set of atoms attached, and so on), with duplicate atoms for double bonds, ring closures followed around, and undrawn hydrogens added back. R or S comes from the 3D positions that the wedges and dashes give (an undrawn hydrogen points opposite to the other three groups). Answers are never stored: they are worked out from the drawing, so changing a molecule can never leave a wrong key.

`js/chair.js` holds the chair model: six carbons alternately above and below the ring plane, an axial and an equatorial direction at each, and the ring-flip rule.

### How the chair checking was verified
The checker uses the rule "axial points the way its carbon points; equatorial points the other way". Three separate checks make sure that rule is right:
1. **The textbook table.** For 1,2 / 1,3 / 1,4, cis and trans, in both chairs, the placements the checker accepts are exactly the textbook ones (cis-1,2 is axial/equatorial, trans-1,2 is diaxial or diequatorial, and so on).
2. **Real 3D geometry.** The chair is built from 3D coordinates. For all six carbons in both chairs the tests confirm that the axial bond is vertical and on its carbon's side of the ring, the equatorial bond tilts to the opposite side and points outward, and each equatorial bond is parallel to the two ring bonds one step away.
3. **An independent re-computation.** A second checker that uses only the 3D vectors (the sign of each bond's height above the ring plane, no parity rule) is compared with the real one on more than 100,000 placements (every combination for hundreds of random problems, both chairs, ring flip included). They agree on every one.

What is accepted on purpose: any carbons, and either face of the ring (the same chair turned over), as long as the distances and cis/trans relationships match. The mirror-image arrangement is also accepted, because the check is about relationships, not handedness.

## Files
| File | Job |
|---|---|
| `js/cip.js` | CIP priorities, chiral centers, R/S, and the reasons |
| `js/molecules.js` | the pool of 21 molecules and the turn/flip transforms |
| `js/chair.js` | chair geometry, the cis/trans and distance checks, the ring flip |
| `js/draw.js` | skeletal structures, the flat ring, the chair template (SVG) |
| `js/set.js` | builds each student's 12 problems from the set number |
| `js/scorm.js` | reports score and completion to the learning system |
| `js/app.js` | the page: one problem at a time, clicking, dragging, saving |

## Tests
```bash
node tests/cip.test.js     # priorities and R/S against textbook facts (L-amino acids, D-glucose, cysteine...), and R/S from a student's own ranking
node tests/chair.test.js   # the chair rules: the textbook table, the 3D geometry, and an independent 3D checker
node tests/set.test.js     # 2,500 sets: distinct molecules, solvable chairs, R and S balanced
node tests/ui.test.js      # a whole set in a real browser with real mouse drags (Playwright)
node tests/scorm.test.js   # runs it inside a pretend learning system: score, completion, saving, resuming
```
