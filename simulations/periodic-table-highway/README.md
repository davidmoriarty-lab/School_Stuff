# Periodic Table Highway

A driving game that teaches element symbols. An element **name** appears at the top of the screen. Signs with
**symbols** come down a three-lane highway. Steer into the lane with the right symbol before the signs reach you.
One wrong lane and the game stops and starts over.

Open `index.html` in a browser. It is one self-contained file: no libraries, no network, no WebGL, so it works offline and on a
school Chromebook. (On GitHub Pages: `.../simulations/periodic-table-highway/index.html`.)

## Playing

| Action | Keys and touch |
| --- | --- |
| Change lane | Left and right arrow keys, or `A` and `D`. On a touch screen, tap the left or right side, or use the arrow buttons. |
| Pause | `Space`, `P` or `Esc` |
| Sound | `M` (off by default) |
| Start again | `Enter` on the game-over screen |

Pick the elements and the speed on the menu:

- **By atomic number:** first 20, first 36, first 54, 1 to 88 without the lanthanoids, or all 118.
- **By family or period:** alkali metals, alkaline earth metals, halogens, noble gases, metalloids, transition metals, periods 2, 3 and 4.
- **Speed:** Relaxed, Normal or Fast. The road starts slow and speeds up with every right answer, up to a top speed for that setting.

The goal is to get **every element in the set right in a row** (each one comes up once). The best streak for each set and speed is kept in the
browser, and a star appears on a set you have finished.

## What it does to help students learn

- **The wrong signs look like the right one.** Each wrong sign is chosen as a lookalike: the same first letter, shared letters, a nearby
  element or the same family. For neon the wrong signs might be Na and N, so guessing by first letter does not work.
- **A mistake shows the answer.** The game stops with the right sign in green and the chosen one in red, then says, for example,
  "Iodine is I (atomic number 53)".
- **Missed elements come back first.** An element missed in one run is the first question of the next run, and stays on the list until it is
  answered correctly.
- **Never the same lane three times in a row**, so students have to keep reading the signs.

## Accessibility

- Everything works from the keyboard. Colour is never the only signal: signs always show the symbol, and the result is shown with a tick or a cross.
- A screen reader hears each question ("Find the symbol for Sodium. Left lane N. Middle lane Na. Right lane Ne.") and each result.
- With `prefers-reduced-motion` the camera bob and the screen shake are switched off. The **Relaxed** speed gives more time to read the signs.
- The game pauses by itself if the window loses focus.

## For teachers and developers

- **The element table** is at the top of the script in `index.html` (atomic number, symbol, name, family), with US spellings (aluminum, sulfur,
  cesium). The levels are listed just below it; to add one, add a line with a `pick` function.
- **Teacher links** (all optional, added after `index.html`): `?seed=12` makes the questions repeat exactly; `?manual` stops the animation so a test can
  control time.
- **The rules and the picture are separate.** `makeGame()` holds the game (questions, lanes, judging, speed). `draw()` only draws what the game
  says. The test uses a small handle, `window.PTH`.

### Tests

```bash
node simulations/periodic-table-highway/tests/test.js
PTH_REF=elements.json node simulations/periodic-table-highway/tests/test.js   # also compare the element table with a list
```

Needs Playwright. It plays the game in a real browser on a clock it controls, so a whole round takes milliseconds. It checks: the element table
(118 elements, unique symbols and names, spot checks, and the size of every level); every question the game makes (three different signs, the
right one in the right lane, lookalike wrong signs); a perfect round of every level; a wrong lane (the game stops, shows the answer, and the
element comes back first); the speed ramp; the arrow keys, `A` and `D`, held keys, taps and buttons; pause; the screen reader announcement;
reduced motion; and that the page fits a 1366 x 520 Chromebook window without scrolling. The element table was also compared against the
118-element list in the periodic table speed drill (symbols and names agree).
