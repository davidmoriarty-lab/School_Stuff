# Intro to Chemistry: first-day talk

A 25-slide animated PowerPoint (`Intro_to_Chemistry.pptx`) that tours the whole course in one story, from atoms to nuclei,
with a click-by-click script (`Intro_to_Chemistry_Script.docx`, also stored as speaker notes in the .pptx).
Two demo slides are built in: methane bubbles (slide 14) and thermite (slide 20).

## Story order (each slide sets up the next)
Atoms and their sizes, protons, **states of matter** (how do atoms behave?), **what holds them together** (attractions),
**atoms approaching** (the bond valley), **who bonds** (periodic table, party gag, alkali metals, sodium gag), **why**
(electron levels, flame tests, outer electrons), bond types, "two ways to study chemistry" gag, reactions, **methane demo**, the mole,
stoichiometry, energy in and out, **thermite demo**, "this is fine" gag, acids and bases, **batteries**
(harnessing the energy), nuclear, wrap-up. 29 slides.

## Motion and memes
- Animated GIFs (orbiting atom, flickering flame tests and demo flames, sodium racing on water, pulsing sun) are drawn by `build_images.py`.
- Cartoon atom mascots (love, shocked, sunglasses, grumpy, sweating) star in the gag slides and cameo on others.
- Native PowerPoint animations include looping jitter (states of matter, nervous halogens, shaking phone), motion paths and click reveals.

## Rebuilding
```
npm install          # once: pptxgenjs, react-icons, sharp
./build_all.sh       # pictures -> slides -> animations -> script document
```
| File | What it does |
|---|---|
| `build_images.py` | Draws the flames, nucleus, electron cloud, energy curves, sun, pH bar and backgrounds (Pillow + NumPy, no photos) |
| `build_deck.js` | Builds the slides, speaker notes and an animation plan (`anim.json`) with pptxgenjs |
| `add_animations.py` | Turns `anim.json` into PowerPoint animation XML (entrance effects, motion paths, looping particles) and adds slide transitions |
| `build_script_doc.py` | Builds the printable script from `script.json` |
| `render.sh` | Renders the deck to `.render/` contact sheets for a visual check |

## Notes
- Animations only play in Slide Show mode. In the editing view and in PDF exports, every shape that appears on a click shows at once (slide 7 looks stacked for this reason).
- The pictures are generated illustrations, so there are no photo licences to track. To use real flame-test photos on slide 10, replace the five `flame_*.png` pictures in PowerPoint.
- To change the talk, edit the text in `build_deck.js` (slide text and the script are side by side) and run `./build_all.sh`.
