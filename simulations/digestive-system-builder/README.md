# Digestive System Builder

Students build a digestive system on a snapping grid, feed it, and watch what happens to the food. Built for a
high school Anatomy & Physiology class.

Open `index.html` in a browser. No libraries, no network, no install: it works offline and on a school Chromebook,
with a mouse, a touch screen or the keyboard. (On GitHub Pages: `.../simulations/digestive-system-builder/index.html`.)

## What students do

1. **Build.** Drag parts from the two trays onto the grid. Parts snap to the squares. It is a free build: any part
   can go anywhere there is room, including the wrong place.
2. **Feed it.** Choose a food (apple, bread, chicken, cheese, pizza or a glass of water) and press **Play**.
3. **Watch.** The food is chewed to crumbs, swallowed, churned, digested and absorbed, with a sound for each stage.
   The **Analysis** table updates as it goes: *Initial*, *In the gut now* and *Absorbed* for each nutrient.
4. **Read the report.** A correct build ends in solid stool. A faulty one ends in diarrhea (or a spill, if the tube
   has a gap) with a list of what went wrong and why. Fix it and run it again.

| Tray | Parts |
| --- | --- |
| Organs of the digestive tract | Mouth, esophagus, stomach, small intestine, large intestine, rectum & anus |
| Glands, cells and vessels | Salivary gland, chief cells, parietal cells, liver, gallbladder, pancreas, capillaries (×3), lymphatic vessels (×2) |

## The rules behind it

**Joining the tube.** Food enters the mouth and travels left to right. Two organs are joined when the open end of
one sits against the open end of the next. The program starts at the mouth and follows the joins like a pipe; where
nothing is joined, the food spills out.

**Attaching the helpers.** A gland, group of cells or vessel works on the tract organ it shares an edge with. A
short connector is drawn when it is attached to something (it does not say whether that is the *right* something).
The liver may touch the small intestine directly or drain through a gallbladder that does.

**Digestion.** Inside each organ, a little of each nutrient is converted or absorbed on every step:

| Where | What happens | Needs |
| --- | --- | --- |
| Mouth | Food is ground up; about 10% of complex carbs become sugars | Salivary gland on the mouth |
| Stomach | Food becomes chyme; about 20% of protein becomes amino acids; acid unfolds proteins | Chief cells **and** parietal cells on the stomach |
| Small intestine | Complex carbs → sugars, protein → amino acids, fats → fatty acids | Pancreas; bile (liver + gallbladder) for fats |
| Small intestine | Sugars, amino acids and water are absorbed | Capillaries |
| Small intestine | Fatty acids are absorbed | Lymphatic vessels |
| Large intestine | Water is absorbed | Capillaries |

**Why a bad build causes diarrhea.** Water follows solutes. While unabsorbed nutrients are still in the gut they hold
water there by osmosis, so the model slows water absorption in proportion. Stool is *solid* if at least 90% of the
water was absorbed, *loose* from 65 to 90%, and *watery* below that. So a missing pancreas, missing capillaries, a
missing or misplaced large intestine and so on all end in diarrhea, for real physiological reasons.

**Food matters.** A build with no gallbladder handles an apple perfectly well and fails badly on cheese. The report
says when a fault made no difference for the food chosen and suggests trying another. Two faults never cause
diarrhea on their own, because in the body they would not: a missing salivary gland and a missing esophagus. They
are still reported ("Solid stool, but the build has problems").

## A correct build (answer key)

Along one row, left to right: mouth, esophagus, stomach, small intestine, large intestine, rectum & anus. Then:
salivary gland touching the mouth; chief cells and parietal cells touching the stomach; pancreas and gallbladder
touching the small intestine, with the liver touching the gallbladder (or the small intestine); capillaries and
lymphatic vessels touching the small intestine; a second set of capillaries touching the large intestine.

To see it on screen, open the browser console and type `DSB.loadExample()`.

## Simplifications to mention in class

- Proteins are shown going straight to amino acids (peptides are skipped), and brush-border enzymes are folded
  into "pancreatic enzymes".
- Fibre, gut bacteria, and the water added by digestive juices are left out, so that every column of the table
  adds up: *Initial = In the gut now + Absorbed*.
- The tract is laid out in a straight line, not in its real position in the abdomen.
- Food values are rounded from USDA data.

## Files

| File | What it holds |
| --- | --- |
| `js/data.js` | The parts (size, openings, time food spends inside) and the foods. Add a food here. |
| `js/model.js` | The rules: fitting parts on the grid, tracing the tube, digestion, and the report. No drawing. |
| `js/art.js` | The picture of each part and the route food follows inside it. |
| `js/sound.js` | The sound effects, generated by the browser (no audio files). Swap in recordings here. |
| `js/app.js` | The page: dragging and snapping, the animation, the table and the report. |

## Tests

```
node simulations/digestive-system-builder/tests/model.test.js   # the rules, no browser needed
node simulations/digestive-system-builder/tests/ui.test.js      # the page in a real browser (needs Playwright)
```
