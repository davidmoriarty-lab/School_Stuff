# Honors Chemistry Notes Packets: Build Guide

Rules for building the student and teacher notes packets from the homework PDFs in `PDF Sources/`.
Reverse-engineered from the finished Unit 4 packet (`Unit 4 - Chemical Reactions`), which is the model to copy.
Rules marked *(inferred)* were read off the file, not remembered from the earlier session. Confirm or edit them.

## Deliverables (per unit)

| File | Location | Purpose |
|---|---|---|
| `Unit N - <Title> - STUDENT NOTES.docx` | `Student Notes Packets/` | Blank fill-in packet |
| `Unit N - <Title> - TEACHER EDITION.docx` | `Student Notes Packets/` | Same pages, answers filled in, plus teacher notes |

Numbering: the homework PDFs use their own unit numbers (Reactions is "Unit 4", Gases is "Unit 8"). The notes sequence is
0 Measurement, 1 Atomic, 2 Electrons, 3 Bonding, 4 Reactions, 5 Moles, 6 Stoichiometry, **7 Gases**, 8 IMF, then Thermo, Nuclear, etc. (the Gases and later numbers may still change; the teacher has only confirmed Reactions 4 and Moles 5).
State the mapping in the teacher overview, as Unit 4 does.

## Length and layout

- **Target 18–22 pages; hard cap 25.** Unit 4 is 18 pages for 7 topics. A unit with fewer topics should land well under that.
- US Letter, margins 0.75" left/right, 0.55" top/bottom. Calibri throughout.
- Font sizes (pt): body/table text 10, box text 9.5–10.5, topic headings 12.5–14, captions 9, big title ~34. Small type is fine, but never at the expense of writing room.
- **Header:** `Name: ____  Date: ____  Period: ____`. **Footer:** `Honors Chemistry • Unit N: <Title> • page X`.
- Page 1: title banner, "How to use this packet" box, "What we will learn" topic table, and "By the end of this unit I can…" checklist (about 7 bullets, one per skill). Then a page break.
- Topics are numbered `N.1, N.2, …`, one banner per topic (number cell + title + a short italic subtitle of 3–4 key ideas).
- Each topic runs about 2 pages. Keep topics from straddling a page awkwardly; a nearly empty page is better than a split table.
- Last page: **Extra Practice**, with lettered sections A, B, C, D (balance/compute, classify/predict, data or lab, think/explain). It ends with a few MC items.

## Building blocks, in the order they usually appear in a topic

1. **Banner** with topic number, title, and key ideas.
2. **BIG IDEA** box (1–3 sentences, plain language). Use a **PREDICTION RULES / STEPS / HOW TO … (numbered)** box wherever there is a procedure.
3. **Key vocabulary table**: `Term | Definition (your words) | Example / sketch`. The prompt in column 2 is a question, not the answer. Four rows at most.
4. **Reasoning prompt(s)** with a framed blank answer box.
5. **Figure** (particle diagram, apparatus, graph) with a 9 pt caption. Unit 4 has 5 images in total. Keep figures small.
6. **Worked example** box (title + a "Work it out here:" box under it).
7. **Practice table**: numbered rows, a blank column to fill. Unit 4 uses 8–12 rows per table; the blank cell is tall enough to write in.
8. **1–3 multiple-choice** items, with the options on one line (`A)  …        B)  …`).
9. **LAB CORNER** box (data or an apparatus scenario) with a "show your reasoning" answer box, at most one every second topic.

## Writing-space rules

- Fill-in tables: the blank column is the work space. Row heights in Unit 4 range from about 0.3" for names and short answers up to 1.6" for multi-step problems.
- Any calculation row needs about 1.0–1.5" of height so the student can show given, formula, substitution, and answer with units.
- Free-response answer boxes: at least 5 blank lines (about 1.2"). Graph or sketch boxes: about 2".
- Leave the MC items compact; they do not need blank space.
- If the page budget is tight, cut practice rows or merge topics before shrinking answer space.

## Content rules

- **Source fidelity:** use the homework PDF's problems and order, so each topic maps to one PDF section. Keep the PDF's numbers and wording.
- **Fix homework errors rather than copy them.** Unit 4 corrected typos and impossible formulas, and flagged each correction in a TEACHER NOTE — CORRECTIONS box. Do the same.
- **Teach the method before the problems:** a box with the procedure, then the worked example, then the practice.
- Use the "(your words)" vocabulary pattern for definitions rather than handing students the text.
- Add state symbols, units, and sig figs where the homework leaves them out; say so in the teacher overview.
- Add 1–2 conceptual MC items per topic for review (they are not in the homework).

## Teacher edition rules

- Identical page layout to the student packet, so pages line up.
- **Answers appear in light-gray (`#D9D9D9` / `#F5F5F5`) boxes or cells** in the same blanks the students fill. Explain this in a "TEACHER EDITION" box on page 1.
- Add a **TEACHER OVERVIEW** box on page 1: numbering map, how answers were computed and checked, homework quirks fixed, and likely misconceptions.
- Add heavy-bordered **TEACHER NOTE** boxes next to the relevant section for misconceptions, demo ideas, discussion prompts, and corrections.
- **Compute and verify every numerical answer in code**, not by hand, then proofread. State this in the overview.
- Show worked steps (with units) in the key for multi-step problems, not just final answers.

## Style

- Black/dark-gray text (`#191919`), light-gray shading only. Print-friendly, no color dependence.
- Use proper subscripts/superscripts and unicode symbols (H₂O, Δ, →, °C).
- Student packet: no answers visible anywhere, including in alt text or hidden text.

---

# Unit 7 — Gases (draft plan)

Source: `PDF Sources/Unit 8 Gases Homework.pdf` (4 worksheets, 4 pages).
Estimated length: 12–16 pages student, same for teacher. Gases is one of the units where the practice is calculation-heavy, so most of the budget goes to work space.

| Topic | Title | Source | Content |
|---|---|---|---|
| 7.1 | Kinetic Molecular Theory & Gas Behavior | WS #1 Q1–3, 5 | KMT postulates, elastic collisions, compressibility, how pressure arises. Particle-diagram prompts: draw the particles when T, V, or n change (the 4-box task in Q5c). |
| 7.2 | Gas Relationships & Unit Conversions | WS #1 Q4, 6 | Direct vs inverse (P–V, P–T, V–T, n–P). Conversion table: 1 atm = 760 torr = 760 mmHg = 101.3 kPa = 14.7 psi; K = °C + 273. Always convert T to K. |
| 7.3 | Combined Gas Law | WS #2 Q1–5 | Boyle, Charles, Gay-Lussac as special cases. Worked example, then 5 solve-for-unknown problems (one solves for T, one for P₁). |
| 7.4 | Ideal Gas Law | WS #3 Q1–4 | PV = nRT, choose R (0.0821 L·atm/mol·K; show how to handle mmHg). Moles, volume, grams-from-moles. Molar-mass experiment (Q4). |
| 7.5 | Gas Stoichiometry | WS #4 Q1–2 | Mass → mol → PV = nRT → L. Octane combustion (CO₂ and O₂ volumes, ΔH energy). NaN₃ airbag (volume in mL, mass of NaN₃ for 75.0 L). |
| — | Extra Practice | new | Sections A–D as in Unit 4: mixed gas-law calcs, "which law?" classification, a data/graph item, think/explain. |

## Open decisions (flag before building)

- **Dalton's law / partial pressures, density, STP, and molar volume** are not in this PDF. Include a short box and 1–2 problems, or stick strictly to the four worksheets?
- **Number of worksheet problems to keep:** the PDF has about 17 problems. Keep all (cheaper on page count, since each needs only about 1.2" of space), or trim?
- **Figures to redraw:** WS #1 Q5 (particles with arrows), WS #3 Q4 (evaporated liquid in a container), WS #4 Q2 (NaN₃ collection apparatus). The PDF has a small image on pages 1 and 4 that may be reusable.
- **WS #4 Q1(d)** uses ΔH of combustion, which belongs to thermo. Keep it as a stretch/connection item?
- **R value convention:** 0.0821 only, or also 8.314? (The homework uses atm, mmHg, and kPa.)
