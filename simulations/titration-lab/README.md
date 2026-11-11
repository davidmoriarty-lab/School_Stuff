# Titration Lab

An acid–base titration you can run on a projector: accurate glassware on the bench, a titration curve that draws
itself drop by drop, and zoomed-in particle views of what is in the flask and the buret. Built for Honors Chemistry
and AP Chemistry.

Open `index.html` in a browser. No libraries, no network, no install: it works offline and on a school Chromebook.
(On GitHub Pages: `.../simulations/titration-lab/index.html`.)

## What is on screen

- **The bench.** A 50 mL buret on a ring stand, a 125 mL Erlenmeyer flask on a magnetic stirrer, and a pH meter.
  Add titrant one drop (0.05 mL) at a time, in measured amounts, by holding **Hold to pour**, or with **Auto**,
  which slows down by itself near each equivalence point.
- **Zoom in.** Three magnified views can be switched on:
  - *Particles in the flask*: the sample starts as 20 particles. Each white bump is an acidic hydrogen. As titrant
    arrives you see OH⁻ fly in, take a hydrogen, and leave water behind. Spectator ions pile up untouched.
  - *Particles in the buret*: the titrant's ions.
  - *Buret scale*: the meniscus against 0.1 mL markings, for practice reading to 0.01 mL.
- **Titration curve.** pH against volume added, with optional markers for the equivalence point, the
  half-equivalence point (pH = pKₐ), the buffer region, the indicator's color-change range and pH 7. A slope graph
  underneath shows where the pH is changing fastest.
- **What's in the flask.** Bars for the amount (mmol) of every species.
- **The math.** The worked calculation for the stage you are at, with this experiment's numbers in it: strong acid
  alone, weak acid ICE setup, before/change/after table, Henderson–Hasselbalch, conjugate base at equivalence,
  excess titrant.

## What you can teach with it

| Idea | How |
| --- | --- |
| What a titration is, and the equipment | Guided lesson steps 1 to 3 |
| Strong acid + strong base, equivalence at pH 7 | HCl in the flask. Watch H₃O⁺ disappear one for one. |
| Why the curve is flat, then jumps | Count the H₃O⁺ left in the flask view at 10, 20, 24 and 25 mL |
| Equivalence point vs. endpoint | Pick an indicator and compare where it changes with the marked equivalence point |
| Choosing an indicator | The indicator panel says whether its range falls inside the jump. Try methyl orange with acetic acid. |
| The color flash near the endpoint | Go drop by drop for the last 0.5 mL. Turn the stirrer off to see it linger. |
| Strong vs. weak acid | Switch HCl to CH₃COOH at the same concentration: same equivalence volume, different curve, different particles |
| Buffer region and pH = pKₐ (AP) | Stop at half the equivalence volume: equal numbers of HA and A⁻ in the flask view |
| Why a weak acid's equivalence point is above 7 (AP) | "The math" at the equivalence point |
| Comparing Kₐ values (AP) | HF, HCOOH, CH₃COOH and HClO at the same concentration |
| Weak base with strong acid (AP) | NH₃ or CH₃NH₂ in the flask |
| Polyprotic acids (AP) | H₃PO₄ (two clear equivalence points, and why the third does not show) and Na₂CO₃ |
| Finding an unknown concentration | **Mystery sample** |
| Reading a buret | The buret-scale zoom, with the volume read-out switched off |

## Mystery sample

Press **Mystery sample** and the flask gets a hidden concentration, the buret starts at a random reading, and the
volume read-out is switched off, as in a real lab. Students read the buret before and after, titrate to a faint
permanent color, calculate the concentration and type it into the lab report in the side panel. **Check my answer**
accepts anything within 1.5% and otherwise says what went wrong: a misread buret, stopping early, overshooting the
endpoint, or a calculation that does not match the readings.

## Using it in front of a class

- **Honors / AP** buttons switch on a sensible set of displays. Every item can be turned on or off by itself.
- **Guided lesson** is a 9-step walkthrough that sets the screen up for each idea and gives a question to ask.
- **Full screen** (`F`) enlarges the text for a projector. `H` hides the control panel.
- The ⤢ button on a graph or on "The math" enlarges it to fill the screen.
- **Undo** takes back the last addition, which is handy when a demonstration overshoots.

| Key | Action |
| --- | --- |
| `D` | Add one drop |
| `Space` (hold) | Pour |
| `A` | Auto-titrate on / off |
| `Z` | Undo |
| `R` | New flask |
| `H` | Hide / show the control panel |
| `F` | Full screen |
| `Esc` | Close an enlarged card or the help window |

## How real is it?

- **pH.** Every pH on screen comes from solving the full charge-balance equation for the mixture
  (K<sub>w</sub> = 1.0 × 10⁻¹⁴, 25 °C). Nothing is looked up or interpolated, and the same method handles strong and
  weak acids and bases, buffers and polyprotic acids. "The math" shows the classroom method next to it and says so
  when the usual approximation is off by more than 0.03 pH (for example phosphoric acid's first proton).
- **Constants.** Textbook values: CH₃COOH 1.8 × 10⁻⁵, HCOOH 1.8 × 10⁻⁴, HF 6.8 × 10⁻⁴, HClO 3.0 × 10⁻⁸,
  NH₃ K<sub>b</sub> 1.8 × 10⁻⁵, CH₃NH₂ K<sub>b</sub> 4.4 × 10⁻⁴, H₃PO₄ 7.5 × 10⁻³ / 6.2 × 10⁻⁸ / 4.2 × 10⁻¹³,
  H₂CO₃ 4.3 × 10⁻⁷ / 5.6 × 10⁻¹¹. Your textbook's table may differ in the last digit.
- **Indicators.** Phenolphthalein 8.2 to 10.0, bromothymol blue 6.0 to 7.6, methyl red 4.4 to 6.2, methyl orange
  3.1 to 4.4, bromocresol green 3.8 to 5.4, and universal indicator.
- **Glassware.** One drop is 0.05 mL. The buret holds 50.00 mL with a mark every 0.1 mL in the zoomed view. The flask
  is a 125 mL Erlenmeyer drawn to scale, and the liquid level rises by the true volume for that shape.
- **Particles.** The counts are proportional to moles. A species too scarce to earn one whole particle is listed as
  "trace" instead of being rounded up.

What is simplified, so you can tell students:

- The buret is drawn shorter than a real one so that it fits the screen.
- Activity effects are ignored, so real measurements in concentrated solutions differ slightly.
- The pH meter responds instantly and never needs calibrating.
- Carbonic acid stays in solution; in a real carbonate titration some escapes as CO₂.
- Water molecules are hidden unless you ask for them, and then only a token number is drawn. A real 0.1 M solution
  has more than 500 water molecules for every solute particle.
- Mixing is instant once a drop has landed, apart from the brief color flash.

## Files

| File | What it holds |
| --- | --- |
| `index.html`, `css/style.css` | The page and its styles (light and dark themes) |
| `js/chem.js` | Substances, constants, indicators and the pH solver. No drawing. Add a substance here. |
| `js/explain.js` | The worked math and the captions for each stage |
| `js/draw.js` | Canvas helpers, including the label placer that stops labels overlapping |
| `js/scene.js` | The bench, the glassware and the three zoomed views |
| `js/graphs.js` | Titration curve, slope graph and species bars |
| `js/app.js` | Controls, delivery of titrant, levels, mystery sample, guided lesson |

## Tests

```bash
node simulations/titration-lab/tests/model.test.js
```

```bash
node simulations/titration-lab/tests/ui.test.js
```

The first needs only Node. It checks pH values against worked textbook answers, charge and mass balance for every
substance and volume, the indicators, and the worked math (about 8,400 checks). The second needs Playwright and
drives the page in a real browser: every control, every substance, the mystery sample, the guided lesson, and a scan
that fails if any two labels overlap or any text is cut off. `TL_FULL=1` before the second command widens the scan
to every option set, indicator, theme and four screen sizes.
