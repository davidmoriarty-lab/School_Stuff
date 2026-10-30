# Substitution and Elimination Problem Bank (100 problems)

Free-response problems on SN1, SN2, E1 and E2 in **21 different question types**, each with a drawn scheme and a worked answer.

## Files
- `SN_E_Problems.docx` – student set (question, structure scheme, answer lines)
- `SN_E_Answer_Key.docx` – answers, explanations and the answer scheme for each problem
- `problems.json`, `problems.csv` – the full database (type, mechanism tag, difficulty 1-3, question, answer, explanation, source, image paths, SMILES)
- `images/` – question and answer schemes (`P001_q.png`, `P001_a.png`, ...)
- `build/` – generator (`engine.py` rules, `problems.py` problem definitions, `build.py` outputs)

## Question types
| Type | Count |
|---|---|
| Choose the reagents | 10 |
| Predict the product | 10 |
| Identify the mechanism | 9 |
| Stereochemistry | 8 |
| Draw the mechanism | 8 |
| What went wrong | 7 |
| Compare two conditions | 6 |
| Functional group conversion | 6 |
| Carbocation rearrangement | 5 |
| Regiochemistry of elimination | 5 |
| Elimination (E1) | 4 |
| Kinetics | 4 |
| Synthesis design | 3 |
| Intramolecular substitution | 2 |
| Nucleophile strength | 2 |
| Substrate reactivity | 2 |
| Leaving groups | 2 |
| Solvent effects | 2 |
| Classify the substrate | 2 |
| Energy diagrams | 2 |
| Which reacts faster? | 1 |

## How the answers are produced
Every product, mechanism and stereochemical outcome is computed by a small rule engine (`build/engine.py`, RDKit) that
encodes the four factors from Klein Ch. 7 (substrate, nucleophile, leaving group, solvent), SN2 inversion, SN1
racemization, carbocation rearrangements (hydride and methyl shifts), Zaitsev vs. Hofmann elimination and alcohol
activation (HX, PBr3, SOCl2, TsCl/pyridine). Each curated reaction has its expected mechanism asserted against the engine,
and IUPAC names come from the validated namer in `../molecule-database/build/namer.py`.

## Please review
- **Elimination content is not from your textbook.** Substitution items follow the provided Chapter 7 PDF; E1/E2,
  Zaitsev/Hofmann and dehydration items use standard textbook conventions. They are tagged in the `source` field and noted
  in the answer key. Compare them with your Chapter 8 once you have it.
- Conditions are idealized textbook cases (for example, secondary halide + strong base = E2). Edge cases where real
  reactions give mixtures are described as "major" with the minor pathway noted.
- The (R)/(S) labels are in the answer text; the drawings show configuration with wedges and dashes.

## Regenerating
```
cd build && python3 build.py
```
Requires `rdkit`, `cairosvg`, `python-docx`, `pillow` (drawing code is in `../_shared/chemdraw.py`).
