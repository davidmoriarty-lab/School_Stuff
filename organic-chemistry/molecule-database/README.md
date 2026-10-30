# Molecule Database (500 structures)

> These molecules are included in the repo-wide searchable index (`index.html` at the repo root; rebuild with `python3 tools/build_index.py`).

500 acyclic organic molecules, each with a drawn skeletal structure (PNG), verified IUPAC names, and properties.
Built for nomenclature practice and as a reference library for example problems.

| Class | Count | Notes |
|---|---|---|
| alkane | 80 | all straight chains C1–C10 plus all branched isomers through C8 and a sample of C9–C10 |
| alkene | 65 | includes (E)/(Z) pairs |
| alkyne | 40 | terminal and internal |
| alcohol | 80 | primary, secondary, tertiary |
| aldehyde | 35 | |
| ketone | 45 | |
| carboxylic acid | 40 | |
| ester | 35 | |
| ether | 30 | |
| amine | 50 | 30 primary, 12 secondary, 8 tertiary |

## Files
- `index.html` – searchable gallery (open in a browser; filter by class, search by name/formula/ID)
- `molecules.csv`, `molecules.json` – the records
- `images/M001.png … M500.png` – structure drawings
- `molecules.py` – small lookup helper (`get`, `find`, `by_class`, `image`)
- `build/` – the scripts that generate everything (`generate.py` then `export.py`)

## Columns
`id`, `class`, `subclass`, `name` (current IUPAC, e.g. `pentan-2-ol`), `name_classic` (locant-first, e.g. `2-pentanol`),
`common_name` (only where a widely used one exists), `formula`, `mol_weight`, `carbons`, `smiles`, `inchikey`,
`stereocenters` (count of unspecified stereocenters), `ez_isomer` (name carries an E/Z descriptor), `image`.

## How the names were checked
Names come from a rule-based namer (`build/namer.py`: longest chain → most substituents → lowest locants for the
principal group, then multiple bonds, then substituents → alphabetical order). Every name, in both styles, was converted
back to a structure with OPSIN and compared to the molecule's SMILES: 1,000 of 1,000 matched.
Stereocenters are left unspecified (no R/S) except E/Z double bonds.
Branches are limited to methyl, ethyl, propyl and isopropyl; molecules are single-functional-group.

## Regenerating
```
cd build
python3 generate.py     # picks and names the molecules (seeded, so the set is reproducible)
python3 export.py       # draws images, writes CSV/JSON/gallery
```
Requires `rdkit`, `cairosvg`, `py2opsin` (Java needed by OPSIN); drawing code is in `../_shared/chemdraw.py`.
