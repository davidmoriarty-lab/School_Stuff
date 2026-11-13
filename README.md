# Teaching Materials

**Searchable index of everything:** https://davidmoriarty-lab.github.io/School_Stuff/ (GitHub Pages; open `index.html` locally to preview).
One page searches all molecules, problems and quiz questions, with filters by collection and type and answers hidden until you expand a card.

| Folder | Contents |
|---|---|
| `organic-chemistry/acids-bases/` | 40-question quiz (acids and bases via ARIO, plus branched-alkane nomenclature) and answer key |
| `organic-chemistry/molecule-database/` | 500 drawn molecules with verified IUPAC names, CSV/JSON, and a molecule-only gallery |
| `organic-chemistry/substitution-elimination/` | 100 SN1/SN2/E1/E2 free-response problems with schemes and answer key |
| `organic-chemistry/_shared/` | Structure-drawing code shared by the organic projects |
| `simulations/enthalpy-dissolution-lab/` | Enthalpy of Dissolution Virtual Lab (moved from the repo root) |
| `simulations/periodic-table-highway/` | Periodic Table Highway: a lane-switching driving game for learning element symbols (single page, with tests) |
| `simulations/reaction-explorer/` | Reaction Explorer: slow-motion particle collisions with electron clouds, forces, energy diagrams, bond energy curves, Maxwell–Boltzmann distributions and kinetics, for Honors, AP and Organic (classroom demo, with tests) |
| `simulations/titration-lab/` | Titration Lab: acid–base titrations with accurate glassware, zoomed-in particle views of the flask and buret, a live titration curve, worked math and a mystery-sample mode, for Honors and AP (classroom demo, with tests) |
| `simulations/moles-study-guide/` | Moles Study Guide: Honors Chemistry Unit 5 (the mole, molar mass, conversions, gases at STP, percent composition, empirical/molecular formulas, hydrates) with color-coded step-by-step worked examples, hint ladders, a large generated practice bank and multiple-choice quizzes (open `index.html`, no install) |
| `simulations/buffers-lab/` | Buffers Lab: drag-and-drop virtual lab for AP Chemistry. Make two pH 4.75 acetate buffers (with sodium acetate, and with NaOH) using scaled glassware, a meniscus you read yourself, a 0.01 g balance and a pH meter, with a lab notebook that checks the data (open `index.html`, no install) |
| `simulations/mole-conversions-practice/` | Mole Conversions Practice: a different set of 13 problems for every student, one at a time (10 distinct conversions among particles, moles, grams and liters at STP, 2 empirical/molecular formula problems, one with a 1.5 ratio, and an iron oxide lab-data problem), with answer checking and a solution that unlocks after 3 wrong attempts (open `index.html`, no install) |
| `simulations/chirality-chairs/` | Chirality and Chairs: 8 chirality problems (find the chiral centers, assign R/S, with a real CIP engine) and 4 cyclohexane problems (drag substituents onto a chair template, then the ring flip), different for every student (open `index.html`, no install) |
| `simulations/digestive-system-builder/` | Digestive System Builder: students build a digestive system on a snapping grid, feed it, and get a nutrient analysis and a report of what went wrong, for Anatomy & Physiology (with sound effects and tests) |
| `chemistry_notes/` | Guided notes: honors packets (units 0 to 7, student and teacher editions) with the packet builder, nomenclature notes, and AP equilibrium notes |
| `4-year-course-planner/` | Student course planner (`wcs-planner.html`) and school setup tool (`course-builder.html`), with course catalog config, plan and reference documents |
| `honors-chemistry/`, `ap-chemistry/` | Reserved for those courses |
| `tools/build_index.py` | Rebuilds the master `index.html` |

## Keeping the index current
After adding or regenerating content, run `python3 tools/build_index.py`. It reads each collection's JSON
(`molecules.json`, `problems.json`, `questions.json`). To index a new collection, add a loader function in
`tools/build_index.py` that yields items in the same shape and list it in `LOADERS`.

## Publishing
GitHub Pages must be set to deploy the branch that contains `index.html` (Settings, Pages, Branch).
