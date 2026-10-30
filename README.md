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
| `honors-chemistry/`, `ap-chemistry/` | Reserved for those courses |
| `tools/build_index.py` | Rebuilds the master `index.html` |

## Keeping the index current
After adding or regenerating content, run `python3 tools/build_index.py`. It reads each collection's JSON
(`molecules.json`, `problems.json`, `questions.json`). To index a new collection, add a loader function in
`tools/build_index.py` that yields items in the same shape and list it in `LOADERS`.

## Publishing
GitHub Pages must be set to deploy the branch that contains `index.html` (Settings, Pages, Branch).
