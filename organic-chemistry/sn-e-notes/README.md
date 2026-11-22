# Substitution and Elimination notes (Klein, Chapter 7)

Guided notes, a teacher edition and an animated slide deck for SN2, E2, SN1, E1 and how to choose between them.
Organized by the chapter's own sections (7.1 to 7.12), with the textbook's SkillBuilder problem numbers listed after each topic.

| File | What it is |
|---|---|
| `Substitution and Elimination - STUDENT NOTES.docx` | 16-page fill-in packet, one reaction at a time: set-up, Part 1 (SN2, E2), Part 2 (SN1, E1), Part 3 (choosing the mechanism, solvents, alcohols and synthesis). Short paragraphs and fill-in sentences, no summary tables; original practice problems with drawn structures; 20 ACS-style multiple-choice questions at the back |
| `Substitution and Elimination - TEACHER EDITION.docx` | Same pages with answers (gray) and teacher notes (19 pages) |
| `Substitution and Elimination - SLIDES.pptx` | (older version, not updated with the new notes: its SN1 picture still shows the original drawing error) 45 slides, 133 click steps: mechanisms drawn in stages with curved arrows, the 3 x 4 reagent/substrate grid, then the 20 warm-ups (vote, then reveal) |
| `build/` | Generators: `skel.py` (skeletal structures, matplotlib only), `mech.py` (mechanism pictures built from real molecules), `sne_figs.py` (energy diagrams, practice schemes), `questions.py` (the 20 questions), `make_notes.py` (the two Word files) |
| `slides/` | `deck.py` plus the animation engine (`anim.py`, `kit.py`) |
| `build/verify_structures.py` | Checks every drawn structure with RDKit: connectivity, R/S, E/Z, names, valid valences and charges in the mechanism pictures, and atom/charge balance across every arrow. Run it after changing any drawing. |
| `img/` | The generated pictures |

Rebuild: `cd build && python3 make_notes.py` then `cd ../slides && python3 deck.py` (needs python-docx, python-pptx, matplotlib, Pillow, lxml).

Notes
- The practice problems are original and mirror the book's SkillBuilders and ACS-style problems; the book's own problems are cited by number, not copied.
- The repository is public: the teacher edition and answers are readable by anyone.
