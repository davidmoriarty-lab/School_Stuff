# Reaction Explorer

A classroom demo that shows what actually happens during a chemical reaction, from one pair of particles colliding
in slow motion up to a container full of them. Built for Honors Chemistry, AP Chemistry and Organic Chemistry.

Open `index.html` in a browser. No libraries, no network, no install: it works offline and on a school Chromebook.
(On GitHub Pages: `.../simulations/reaction-explorer/index.html`.)

## The two views

**① One collision (slow motion).** A particle A hits a molecule B–C, slowed down about 40 trillion times. Set the
collision energy and the orientation, press **Launch**, and watch the old bond break while the new one forms. Every
graph has a live dot that is the atoms on screen, so students can connect the picture with the graph.

**② Many particles (rates and temperature).** A box of moving particles. Change the temperature, the amounts, add a
catalyst, and see how the rate changes and why.

## What you can show

| Idea | Where to find it |
| --- | --- |
| The collision itself, frame by frame | View ①. Play, pause, step, or drag the slider under the picture. Four speeds. |
| Electron clouds merging into a bond | "Electron clouds". Where two clouds join, electrons are shared. |
| The electron cloud shifting to the new atom | "Bonding electrons" (dots that move from the old bond to the new one), "Partial charges δ", "Charge colors" (red = electron rich, blue = electron poor), "Curved arrows". |
| Push and pull between atoms | "Push / pull forces": arrows pointing apart are repulsion, arrows pointing together are attraction, with the size in nanonewtons. |
| Activation energy, transition state | Energy diagram. The hill height is Eₐ. "Pause at top" stops at the transition state. |
| Exothermic or endothermic | ΔH on the energy diagram, plus the energy bars: products leave with more or less kinetic energy than the reactants brought. |
| Conservation of energy | "Where is the energy?" bars: potential, kinetic and vibration always add to the same total. |
| Bond energy and covalent bond length | "Bond energy curves": one potential energy well per bond, with a dot sliding out of the old well and into the new one. |
| Why orientation matters | Orientation slider. A tilted molecule has a higher hill; the wrong end has no route at all. |
| Potential energy surface (AP) | "Energy map": the reaction as a path through a mountain pass, seen from above. |
| Hammond postulate (Organic) | Compare Cl• + CH₄ (early transition state) with Br• + CH₄ (late). |
| SN2 backside attack and inversion (Organic) | HO⁻ + CH₃Br: the three hydrogens flip like an umbrella. |
| Maxwell–Boltzmann distribution | View ②. Bars are the particles on screen, the curve is theory, the shaded tail is the fraction with E ≥ Eₐ. "Pin curve" keeps one temperature on screen to compare with another. |
| Effect of temperature, concentration, catalyst on rate | View ② sliders and the Catalyst box. The tally under the box counts all collisions, those with enough energy, and those that reacted. |
| Arrhenius equation (AP) | "Rate vs. temperature", as k against T or as ln k against 1/T. |
| Equilibrium | View ② with "Reverse reaction allowed": the amounts level off. |
| Exothermic reactions heat their surroundings | View ② with "Hold temperature constant" switched off. |
| Link between the two views | "Watch the last collision up close" opens the most recent collision from the box in slow motion. |

**Reverse it** runs any reaction backwards, and **Build your own** lets you set Eₐ and ΔH with sliders.

## Using it in front of a class

- **Honors / AP / Organic** buttons switch on a sensible set of displays for each course. Every item can still be
  turned on or off on its own in the side panel.
- **Guided lesson** is a 12-step walkthrough. Each step sets the screen up for you and gives a question to ask.
- **Full screen** (`F`) enlarges all text for a projector. `H` hides the control panel.
- The ⤢ button on any graph enlarges it to fill the screen.
- Hover over any graph for exact values.

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` `→` | Step backwards / forwards (hold `Shift` for bigger steps) |
| `R` | Restart |
| `T` | Jump to the top of the energy hill |
| `H` | Hide / show the control panel |
| `F` | Full screen |
| `1` `2` | Switch view |
| `Esc` | Close an enlarged graph or the help window |

## The reactions

| Reaction | Eₐ (kJ/mol) | ΔH (kJ/mol) | Good for |
| --- | --- | --- | --- |
| F + H₂ → HF + H | 6 | −131 | Strongly exothermic, almost no barrier |
| H + H₂ → H₂ + H | 40 | 0 | ΔH = 0 but still a hill |
| Cl + H₂ → HCl + H | 23 | +5 | A modest, clear hill |
| Br + H₂ → HBr + H | 76 | +70 | Endothermic |
| H + Cl₂ → HCl + Cl | 8 | −188 | Weak bond traded for a strong one |
| CO + NO₂ → CO₂ + NO | 134 | −226 | The textbook orientation example |
| Cl• + CH₄ → HCl + •CH₃ | 16 | +8 | Radical chlorination |
| Br• + CH₄ → HBr + •CH₃ | 78 | +73 | Radical bromination, selectivity |
| HO⁻ + CH₃Br → CH₃OH + Br⁻ | ≈ 95 | ≈ −77 | SN2 (approximate values, for water) |
| A + BC → AB + C | you choose | you choose | Any shape of energy diagram |

ΔH is bonds broken minus bonds made, using textbook bond enthalpies.

## How real is it?

The numbers are not drawn by hand. They come from a model:

1. **Energy.** The potential energy of the three particles comes from a LEPS surface (London, Eyring, Polanyi and
   Sato), the model chemists first used to study these same reactions. It is built from each bond's energy and length,
   and one parameter is tuned so the hill has the measured activation energy. Things that are not put in by hand come
   out right: the H + H₂ transition state has both bonds at 0.93 Å (the accepted value), exothermic reactions get early
   transition states and endothermic ones late (the Hammond postulate), and a tilted approach has a higher barrier.
2. **Motion.** The atoms follow the lowest-energy route over that surface and obey Newton's laws along it, so
   potential + kinetic energy is constant and times are real femtoseconds.
3. **The gas.** In view ② every particle has a full 3-D velocity, so the kinetic energies follow the true
   Maxwell–Boltzmann distribution. A collision reacts when the energy along the line of centers is at least Eₐ, which
   gives the Arrhenius factor e^(−Eₐ/RT). Reactions conserve atoms, momentum and energy.

What is simplified, so you can tell students:

- The atoms are kept on the lowest-energy route. Real collisions wander off it, tunnel through the hill, and the
  molecule is already rotating and vibrating before it is hit.
- Groups such as CH₃, CO and NO are treated as one particle.
- The SN2 reaction is shown without its solvent, and its energies are approximate.
- The catalyst is shown only as a lower hill. A real catalyst works by a different set of steps.
- The electron clouds are a sketch of where electrons are likely to be, not a quantum calculation.
- Particles in view ② carry no rotational or vibrational energy, so an insulated exothermic box gets hotter than a
  real gas would.

## Files

| File | What it holds |
| --- | --- |
| `index.html`, `css/style.css` | The page and its styles (light and dark themes) |
| `js/chem-data.js` | Elements, bond energies and lengths, and the reaction list. Add a reaction here. |
| `js/model.js` | The physics: energy surface, reaction path, collision, Maxwell–Boltzmann maths. No drawing. |
| `js/draw.js` | Canvas helpers, including the label placer that stops labels overlapping |
| `js/stage.js` | Draws the slow-motion collision |
| `js/graphs.js` | Energy diagram, energy bars, bond energy curves, energy map |
| `js/chamber.js` | The many-particle simulation and its three graphs |
| `js/app.js` | Controls, playback, course levels, guided lesson |

## Tests

```bash
node simulations/reaction-explorer/tests/model.test.js
```

```bash
node simulations/reaction-explorer/tests/ui.test.js
```

The first needs only Node. It checks every reaction's Eₐ and ΔH, that collisions react exactly when they have enough
energy, energy conservation, orientation, and the gas statistics against theory (about 1,750 checks). The second needs
Playwright and drives the page in a real browser: every control, every reaction at every level, the guided lesson,
and a scan that fails if any two labels overlap or any label runs off its graph. `RX_FULL=1` before the second
command widens that scan to every reaction, level, angle, energy, theme and four screen sizes (about ten minutes).
