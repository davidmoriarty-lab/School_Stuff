# Chemistry notes

Guided notes for the courses, as Word documents, with the code that builds the honors packets.

| Folder | What is in it |
| --- | --- |
| `Honors Chemistry/Student Notes Packets/` | Units 0 to 8, each as a `STUDENT NOTES` packet (blank, to fill in) and a `TEACHER EDITION` (same pages, answers filled in, teacher notes). Unit numbers follow the course order: 0 Measurement and Math Skills, 1 Atomic Structure, 2 Electrons and Periodic Trends, 3 Chemical Bonding, 4 Chemical Reactions, 5 Moles and Molar Quantities, 6 Stoichiometry, 7 Gases, 8 Intermolecular Forces. Only Reactions (4) and Moles (5) are confirmed; Gases and IMFs may move again. |
| `Honors Chemistry/NOTES-PACKET-GUIDE.md` | The rules for building a packet: length, layout, building blocks, writing space, teacher edition, style. Includes the plan for the Gases unit. |
| `Honors Chemistry/Sample Tests/` | The review test given right before a unit test: 20 multiple choice (two columns) plus 4 free-response questions, 4 pages, with a separate teacher key. Unit 4 (Reactions) is the original example; Unit 5 (Moles) is built by `_packet_builder/make_unit5_test.py`, which computes every answer. |
| `Honors Chemistry/_packet_builder/` | The Python scripts that build a packet (`lib.py` helpers, `make.py` and `build_gases.py` for Gases, `make_moles.py`, `build_moles.py` and `figs_moles.py` for Moles, `figs.py` for the figures, `img/` for the images). They use the Unit 5 packet as a template and compute every answer in code. Needs python-docx, Pillow, NumPy and Matplotlib. |
| `Honors Chemistry/PDF Sources/` | The topic homework PDFs the packets follow. |
| `Honors Chemistry/Nomenclature/` | Nomenclature notes. |
| `AP Chemistry/Equilibrium/` | Equilibrium guided notes (student and key), a notes outline, ICE tables and K, and Le Chatelier's principle. |

**This repository is public.** The teacher editions and keys are readable by anyone who finds them. If the packets are meant to be seen
only by teachers, keep them out of a public repository.
