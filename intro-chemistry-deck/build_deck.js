// Builds the "Intro to Chemistry" deck.
//   node build_deck.js         -> deck_raw.pptx, anim.json, script.json
//   python3 add_animations.py  -> Intro_to_Chemistry.pptx (adds animations + transitions)
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const fa = require("react-icons/fa");
const SKILL = "/root/.claude/skills/synced/3502a2cc-8e63-45b7-b58f-57a9c498ef8e_bad45074-8b43-4c1a-8313-13d84e2fd9a5/pptx";
const { applyTheme } = require(SKILL + "/scripts/apply_theme.js");

const IMG = (f) => path.join(__dirname, "img", f);
const META = JSON.parse(fs.readFileSync(IMG("meta.json")));
const SW = 13.333, SH = 7.5;

const THEME = {
  name: "Chem Intro", headFontFace: "Calibri", bodyFontFace: "Calibri",
  colors: { dk1: "0B1030", lt1: "FFFFFF", dk2: "1B2255", lt2: "C9D2FF", accent1: "22D3EE", accent2: "FF7A1A",
    accent3: "FFD23F", accent4: "B66DFF", accent5: "5BE584", accent6: "FF4D6D", hlink: "22D3EE", folHlink: "B66DFF" },
};
const HEX = { navy: "0B1030", card: "1B2255", cardLine: "34408F", cyan: "22D3EE", orange: "FF7A1A", yellow: "FFD23F",
  violet: "B66DFF", green: "5BE584", pink: "FF4D6D", white: "FFFFFF", muted: "9AA7E0", lav: "C9D2FF" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Intro to Chemistry: Why Does Anything Do Anything?";
pres.subject = "First-day chemistry talk";
const C = pres.SchemeColor;
const ST = pres.ShapeType;

// ---------------------------------------------------------------- layouts
function defLayout(name, bgImage, titleOpts) {
  pres.defineSlideMaster({
    title: name, background: { path: IMG(bgImage) },
    objects: [{ placeholder: { options: Object.assign({ name: "title", type: "title", color: C.background1, bold: true, align: "left", valign: "middle", margin: 0 }, titleOpts), text: "" } }],
  });
}
defLayout("TITLE", "bg_navy.png", { x: 0.8, y: 2.0, w: 6.4, h: 1.9, fontSize: 88 });
defLayout("CONTENT", "bg_navy.png", { x: 0.6, y: 0.35, w: 12.1, h: 0.95, fontSize: 38 });
defLayout("DEMO", "bg_demo.png", { x: 0.7, y: 1.55, w: 7.6, h: 1.2, fontSize: 60 });

// ---------------------------------------------------------------- helpers
let slideNo = 0;
let curSlide = null;
const ANIMS = {}; const SCRIPT = [];
function newSlide(layout, section, title, titleName) {
  slideNo++;
  const s = pres.addSlide({ masterName: layout, sectionTitle: section });
  curSlide = s;
  if (title !== undefined) s.addText(runs(title), { placeholder: "title", objectName: titleName || "title" });
  return s;
}
function A(trig, fx, targets, o) {          // animation step for the current slide
  (ANIMS[slideNo] = ANIMS[slideNo] || []).push(Object.assign({ trig, fx, t: [].concat(targets) }, o || {}));
}
const click = (fx, t, o) => A("click", fx, t, o);
const withp = (fx, t, o) => A("with", fx, t, o);
const after = (fx, t, o) => A("after", fx, t, o);
const auto = (fx, t, o) => A("auto", fx, t, o);

// "H_2O" -> H + subscript 2;  "Na^+" -> Na + superscript +
function runs(str, base) {
  base = base || {};
  const out = []; const lines = String(str).split("\n");
  lines.forEach((line, li) => {
    const parts = line.split(/(_[0-9]+|\^[0-9+\-−]+)/g).filter((p) => p !== "");
    parts.forEach((p, pi) => {
      const o = Object.assign({}, base); let t = p;
      if (/^_[0-9]+$/.test(p)) { t = p.slice(1); o.subscript = true; }
      else if (/^\^[0-9+\-−]+$/.test(p)) { t = p.slice(1); o.superscript = true; }
      if (li < lines.length - 1 && pi === parts.length - 1) o.breakLine = true;
      out.push({ text: t, options: o });
    });
  });
  return out;
}
// lines: [[text, {opts}], ...]  -> runs with a paragraph break after each line
function P(lines) {
  const out = [];
  lines.forEach(([t, o], i) => {
    const r = runs(t, o);
    if (i < lines.length - 1) r[r.length - 1].options.breakLine = true;
    out.push(...r);
  });
  return out;
}
function txt(s, name, content, x, y, w, h, o) {
  o = o || {};
  const content2 = typeof content === "string" ? runs(content) : content;
  s.addText(content2, Object.assign({ x, y, w, h, isTextBox: true, margin: 0, objectName: name, color: C.background1, fontSize: 20, valign: "middle" }, o));
}
function shp(s, type, name, x, y, w, h, o) {
  o = o || {};
  const opt = { x, y, w, h, objectName: name };
  if (o.fill) opt.fill = { color: o.fill, transparency: o.tr || 0 };
  opt.line = o.line || { type: "none" };
  ["rectRadius", "shadow", "flipH", "flipV", "rotate"].forEach((k) => { if (o[k] !== undefined) opt[k] = o[k]; });
  s.addShape(type, opt);
}
function ln(s, name, x1, y1, x2, y2, o) {
  o = o || {};
  s.addShape(ST.line, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipV: (y2 < y1) !== (x2 < x1), objectName: name,
    line: { color: o.color || C.background1, width: o.w || 2, dashType: o.dash || "solid", endArrowType: o.arrow ? "triangle" : undefined } });
}
function chip(s, name, text, x, y, w, h, fill, color, o) {
  o = o || {};
  s.addText(runs(text), Object.assign({ shape: ST.roundRect, rectRadius: 0.12, x, y, w, h, fill: { color: fill }, objectName: name,
    color: color || C.text1, fontSize: 16, bold: true, align: "center", valign: "middle", margin: 0.05 }, o));
}
function card(s, name, x, y, w, h, o) {
  shp(s, ST.roundRect, name, x, y, w, h, Object.assign({ fill: C.text2, rectRadius: 0.18, line: { color: HEX.cardLine, width: 1.25 } }, o || {}));
}
function speech(s, name, text, x, y, w, h, o) {
  s.addText(runs(text), Object.assign({ shape: ST.wedgeRoundRectCallout, x, y, w, h, fill: { color: "FFFFFF" }, line: { color: HEX.navy, width: 2 },
    objectName: name, color: C.text1, fontSize: 20, bold: true, align: "center", valign: "middle", margin: 0.1 }, o || {}));
}
function glowShadow(hex, blur) { return { type: "outer", color: hex, blur: blur || 14, offset: 0, angle: 0, opacity: 0.65 }; }
function note(text, title, extra) {
  curSlide.addNotes(text.trim());
  SCRIPT.push(Object.assign({ n: slideNo, title, notes: text.trim() }, extra || {}));
}
const ICONS = {};
async function loadIcons(list) {
  for (const [key, comp, color] of list) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(fa[comp], { color: "#" + color, size: "256" }));
    const buf = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    ICONS[key] = "image/png;base64," + buf.toString("base64");
  }
}
function icon(s, name, key, x, y, size) { s.addImage({ data: ICONS[key], x, y, w: size, h: size, objectName: name }); }

// ---------------------------------------------------------------- build
async function main() {
  await loadIcons([
    ["fire", "FaFire", HEX.orange], ["cogs", "FaCogs", HEX.pink], ["snow", "FaSnowflake", HEX.cyan], ["cake", "FaBirthdayCake", HEX.yellow],
    ["user", "FaUser", "FFFFFF"], ["micro", "FaMicroscope", "FFFFFF"], ["dna", "FaDna", "FFFFFF"], ["atom", "FaAtom", "FFFFFF"],
    ["hourglass", "FaHourglassHalf", HEX.yellow], ["drop", "FaTint", HEX.cyan], ["scale", "FaBalanceScale", HEX.green],
    ["paw", "FaPaw", HEX.green], ["bolt", "FaBolt", HEX.yellow], ["radiation", "FaRadiation", HEX.yellow], ["firew", "FaFire", "FFFFFF"],
    ["snowc", "FaSnowflake", HEX.cyan], ["no", "FaTimesCircle", HEX.pink], ["yes", "FaCheckCircle", HEX.green], ["dropc", "FaTint", HEX.cyan], ["flask", "FaFlask", HEX.green],
  ]);

  // ============================================================ 1. old 1
  pres.addSection({ title: "Welcome" });
  let s = newSlide("TITLE", "Welcome", "Chemistry", "title");
  s.addImage({ path: IMG("atom_orbit.gif"), x: 6.9, y: 0.95, w: 5.9, h: 5.9, objectName: "orbits" });
  txt(s, "tag", "DAY ONE", 0.8, 1.45, 3.4, 0.45, { fontSize: 18, bold: true, color: C.accent1, charSpacing: 8 });
  txt(s, "subtitle", "Why does anything\ndo anything?", 0.8, 4.05, 6.2, 1.7, { fontSize: 40, bold: true, color: C.accent3, valign: "top" });
  txt(s, "tagline", "A 15-minute tour of the whole course", 0.8, 6.05, 6.2, 0.5, { fontSize: 20, color: C.background2 });
  auto("fade", "orbits", { dur: 1200 });
  withp("zoom", "title", { dur: 700, delay: 0.5 });
  withp("fade", "tag", { dur: 600, delay: 0.9 });
  click("wipeleft", "subtitle", { dur: 800 });
  withp("fade", "tagline", { dur: 700, delay: 0.7 });
  note(`
Welcome to chemistry! Before we do syllabus, seating charts, or bathroom-pass rules, give me about fifteen minutes to convince you this is the most interesting class in the building.

[CLICK] Here's the question that this whole year is built around: why does anything do anything?

Why does a match burst into flame? Why does iron rust? Why does baking soda fizz in vinegar? By the end of the year you won't just know THAT these things happen. You'll be able to explain why. And I promise: we start with fire. Nobody has ever fallen asleep during fire.
`, "Chemistry: Why does anything do anything?");

  // ============================================================ 2. old 2
  s = newSlide("CONTENT", "Welcome", "Here is the world you already know");
  const macro = [["fire", "Fire burns", HEX.orange], ["cogs", "Iron rusts", HEX.pink], ["snow", "Ice melts", HEX.cyan], ["cake", "Cake rises", HEX.yellow]];
  macro.forEach(([k, label, col], i) => {
    const x = 0.6 + i * 3.1;
    card(s, `m2card${i}`, x, 1.75, 2.85, 2.9);
    icon(s, `m2icon${i}`, k, x + 0.9, 2.0, 1.05);
    txt(s, `m2lab${i}`, label, x + 0.1, 3.4, 2.65, 0.9, { fontSize: 26, bold: true, align: "center", color: col });
    click("zoom", [`m2card${i}`], { dur: 450 });
    withp("zoom", [`m2icon${i}`, `m2lab${i}`], { dur: 450 });
  });
  txt(s, "why", "WHY?", 0.6, 4.75, 12.1, 1.7, { fontSize: 110, bold: true, align: "center", color: C.accent2 });
  txt(s, "whysub", "You have only ever seen the big picture.", 0.6, 6.45, 12.1, 0.6, { fontSize: 24, align: "center", color: C.background2 });
  click("zoom", "why", { dur: 600 });
  withp("fade", "whysub", { dur: 700, delay: 0.5 });
  after("pulse", "why", { dur: 500 });
  note(`
This is your world so far. [CLICK] Fire burns. [CLICK] Iron rusts. [CLICK] Ice melts. [CLICK] Cake rises in the oven.

You've watched all of that your entire life. You know WHAT happens. But, [CLICK] why?

Why does iron rust but gold sits there looking smug for thousands of years? Why does a cake rise but a brick doesn't? You have only ever seen the big picture, the macro level. This class is about what's going on underneath it.

Chemistry is basically the answer to every little kid's favorite question, "but why?", except in here we actually get to answer it.
`, "The world you already know");

  // ============================================================ 3. old 3
  pres.addSection({ title: "Atoms" });
  s = newSlide("CONTENT", "Atoms", "So let's zoom in…");
  const zoomItems = [
    ["user", "You", "about 1 meter", 2.7, HEX.cyan], ["micro", "A skin cell", "10 millionths of a meter", 2.1, HEX.green],
    ["dna", "DNA", "2 billionths of a meter", 1.6, HEX.violet], ["atom", "An atom", "0.1 billionths of a meter", 1.1, HEX.orange]];
  const zx = [1.95, 5.05, 8.0, 10.85];
  zoomItems.forEach(([k, name, size, d, col], i) => {
    const cx = zx[i], cy = 3.35;
    shp(s, ST.ellipse, `z3c${i}`, cx - d / 2, cy - d / 2, d, d, { fill: C.text2, line: { color: col, width: 3.5 } });
    icon(s, `z3i${i}`, k, cx - d * 0.28, cy - d * 0.28, d * 0.56);
    txt(s, `z3l${i}`, P([[name, { fontSize: 26, bold: true }], [size, { fontSize: 16, color: C.background2 }]]), cx - 1.45, 5.25, 2.9, 1.0, { align: "center", valign: "top" });
    if (i > 0) shp(s, ST.chevron, `z3a${i}`, (zx[i - 1] + cx) / 2 - 0.2, cy - 0.35, 0.4, 0.7, { fill: C.accent3 });
    click("zoom", [`z3c${i}`], { dur: 600 });
    withp("zoom", [`z3i${i}`], { dur: 600 });
    withp("fade", [`z3l${i}`], { dur: 600, delay: 0.2 });
    if (i > 0) withp("fade", [`z3a${i}`], { dur: 400 });
  });
  txt(s, "z3end", "Everything you have ever touched is made of atoms.", 0.6, 6.5, 12.1, 0.6, { fontSize: 26, bold: true, align: "center", color: C.accent3 });
  click("fade", "z3end", { dur: 700 });
  note(`
So let's zoom in. [CLICK] Start with you: about a meter tall. [CLICK] Zoom in on your skin and you hit a single cell, about ten millionths of a meter. [CLICK] Zoom in again, through the cell, and there's DNA, a couple of billionths of a meter wide. [CLICK] Keep going and you hit the bottom: the building block of everything, the atom. About a tenth of a billionth of a meter. You could line up hundreds of thousands of atoms across the width of one human hair.

[CLICK] Everything you have ever touched, your phone, your shoes, your lunch, is made of atoms. And yes, that includes the lunch you're hoping this talk doesn't delay.
`, "Zoom in to atoms");

  // ============================================================ 4. old 4
  s = newSlide("CONTENT", "Atoms", "…but not all atoms are alike");
  txt(s, "s4sub", "Relative sizes, drawn to scale", 0.6, 1.3, 12.1, 0.45, { fontSize: 20, color: C.background2 });
  const atoms = [["He", "Helium", 28, "FDE68A"], ["H", "Hydrogen", 31, "7DD3FC"], ["O", "Oxygen", 66, "FF5A6E"], ["C", "Carbon", 76, "B0B6C8"],
    ["Cl", "Chlorine", 102, "5BE584"], ["Na", "Sodium", 166, "C084FC"], ["Cs", "Cesium", 244, "FF9F43"]];
  const k4 = 0.0055, gap4 = 0.62;
  const totW = atoms.reduce((a, b) => a + 2 * b[2] * k4, 0) + gap4 * (atoms.length - 1);
  let ax = (SW - totW) / 2;
  atoms.forEach(([sym, name, r, col], i) => {
    const d = 2 * r * k4;
    shp(s, ST.ellipse, `a4c${i}`, ax, 3.9 - d / 2, d, d, { fill: col, shadow: glowShadow(col, 16) });
    txt(s, `a4l${i}`, P([[sym, { fontSize: 28, bold: true }], [name, { fontSize: 16, color: C.background2 }]]), ax + d / 2 - Math.max(0.46, Math.min(d / 2, 0.7)), 5.45, 2 * Math.max(0.46, Math.min(d / 2, 0.7)), 0.95, { align: "center", valign: "top" });
    if (i === 0) click("zoom", [`a4c${i}`], { dur: 450 }); else after("zoom", [`a4c${i}`], { dur: 450 });
    withp("fade", [`a4l${i}`], { dur: 450, delay: 0.15 });
    ax += d + gap4;
  });
  txt(s, "s4cap", "Cesium is almost 8 times wider than hydrogen, and it behaves like a totally different character.", 0.9, 6.55, 11.5, 0.6, { fontSize: 20, bold: true, align: "center", color: C.accent3 });
  click("fade", "s4cap", { dur: 700 });
  note(`
But here's the twist: not all atoms are the same. [CLICK] Here are a few, drawn to the same scale. Helium and hydrogen are tiny. Oxygen and carbon, the stuff of life and breathing, are medium. Chlorine, sodium, and then... cesium, which is almost eight times wider than hydrogen.

[CLICK] And it's not only size. Different atoms behave differently. Some atoms never react with anything. Some will explode if they so much as meet water. Atoms have personalities, just like you, except with fewer social media accounts.
`, "Not all atoms are alike");

  // ============================================================ 5. old 5
  s = newSlide("CONTENT", "Atoms", "What is an atom made of?");
  s.addImage({ path: IMG("cloud.png"), x: 0.3, y: 1.45, w: 5.6, h: 5.6, objectName: "cloud" });
  chip(s, "chipE", "Electrons (−): a fast, fuzzy cloud", 0.7, 6.55, 4.6, 0.5, HEX.cyan, C.text1);
  ln(s, "zl1", 3.1, 4.25, 8.95, 2.05, { color: HEX.muted, w: 2, dash: "dash" });
  ln(s, "zl2", 3.1, 4.25, 8.95, 5.65, { color: HEX.muted, w: 2, dash: "dash" });
  shp(s, ST.ellipse, "bubble", 7.55, 2.0, 3.7, 3.7, { fill: "10173F", line: { color: C.background1, width: 3 } });
  s.addImage({ path: IMG("nucleus.png"), x: 7.7, y: 2.15, w: 3.4, h: 3.4, objectName: "nucleus" });
  chip(s, "chipP", "Protons (+)", 7.7, 5.95, 1.7, 0.5, HEX.pink, C.text1);
  chip(s, "chipN", "Neutrons (0)", 9.55, 5.95, 1.75, 0.5, "98A2C6", C.text1);
  txt(s, "s5fact", "The nucleus is about 100,000× smaller than the atom.", 7.0, 6.65, 5.8, 0.6, { fontSize: 18, bold: true, align: "center", color: C.accent3 });
  txt(s, "s5mass", "Almost all the mass lives here.", 11.4, 3.2, 1.7, 1.3, { fontSize: 16, color: C.background2, align: "left" });
  click("fade", ["cloud"], { dur: 900 });
  withp("fade", ["chipE"], { dur: 600, delay: 0.4 });
  click("wipeleft", ["zl1", "zl2"], { dur: 700 });
  withp("zoom", ["bubble", "nucleus"], { dur: 700, delay: 0.4 });
  click("fade", ["chipP", "chipN"], { dur: 500 });
  withp("fade", ["s5fact", "s5mass"], { dur: 600, delay: 0.3 });
  note(`
So what IS an atom? [CLICK] Mostly... nothing. The outside of an atom is a fuzzy cloud of electrons zipping around. Electrons have a negative charge, and they are what does almost all the chemistry in this course.

[CLICK] Now zoom into the very center. There's a nucleus, about a hundred thousand times smaller than the whole atom. If the atom were a football stadium, the nucleus would be a grain of sand at midfield. [CLICK] Inside it: protons, which are positive, and neutrons, which have no charge. Almost all of the atom's mass is packed in there.

Which means you, me, and this desk are almost entirely empty space. And yet you can't walk through walls. Hold on to that thought. That's a chemistry question, and we're going to answer it.
`, "What is an atom made of?");

  // ============================================================ 6. old 6
  s = newSlide("CONTENT", "Atoms", "The number of protons decides who you are");
  const els = [["H", "Hydrogen", 1, "lightest atom, fuel of stars", HEX.cyan], ["C", "Carbon", 6, "the backbone of life", "C4B5FD"],
    ["O", "Oxygen", 8, "what you are breathing", HEX.pink], ["Au", "Gold", 79, "worth keeping", HEX.yellow]];
  els.forEach(([sym, name, n, desc, col], i) => {
    const x = 0.6 + i * 3.1;
    card(s, `e6card${i}`, x, 1.6, 2.85, 4.6);
    txt(s, `e6sym${i}`, sym, x, 1.75, 2.85, 1.35, { fontSize: 80, bold: true, align: "center", color: col });
    txt(s, `e6name${i}`, P([[name, { fontSize: 26, bold: true }], [desc, { fontSize: 15, color: C.background2 }]]), x + 0.1, 3.1, 2.65, 1.1, { align: "center", valign: "top" });
    shp(s, ST.ellipse, `e6b${i}`, x + 0.9, 4.45, 1.05, 1.05, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 12) });
    txt(s, `e6n${i}`, String(n), x + 0.9, 4.45, 1.05, 1.05, { fontSize: n > 9 ? 34 : 40, bold: true, align: "center" });
    txt(s, `e6p${i}`, n === 1 ? "proton" : "protons", x, 5.55, 2.85, 0.5, { fontSize: 18, bold: true, align: "center", color: HEX.pink });
    click("zoom", [`e6card${i}`], { dur: 450 });
    withp("zoom", [`e6sym${i}`, `e6name${i}`, `e6b${i}`, `e6n${i}`], { dur: 450 });
    withp("fade", [`e6p${i}`], { dur: 450, delay: 0.2 });
  });
  txt(s, "s6cap", "Count the protons. That is the element. We gave each type a name.", 0.6, 6.45, 12.1, 0.6, { fontSize: 24, bold: true, align: "center", color: C.accent3 });
  click("fade", "s6cap", { dur: 700 });
  note(`
Here's the big idea. Atoms are all built from the same three ingredients: protons, neutrons, electrons. The only difference is the COUNT. The number of protons decides what kind of atom you are.

[CLICK] One proton? Hydrogen. [CLICK] Six protons? Carbon, the backbone of every living thing. [CLICK] Eight? Oxygen, which is what you're breathing right now. [CLICK] Seventy-nine protons? Gold.

[CLICK] Count the protons, and you know the element. Each type of atom got a name, and those names are what we call the elements. It's like LEGO: same bricks, different counts, completely different set. And hang on to this idea, because at the very end of the talk, we're going to break the rule.
`, "Protons decide the element");

  // ============================================================ 7. STATES
  pres.addSection({ title: "How Atoms Behave" });
  s = newSlide("CONTENT", "How Atoms Behave", "So how do these atoms behave?");
  const stPanels = [
    ["LOW ENERGY", "SOLID", "locked in place, just vibrating", HEX.cyan, 0.05, 280, 0.4],
    ["MEDIUM ENERGY", "LIQUID", "slide past each other", HEX.yellow, 0.26, 1300, 0.4],
    ["HIGH ENERGY", "GAS", "fly free in every direction", HEX.orange, 0.55, 850, 0.34],
  ];
  const stPts = [
    [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => [0.625 + c * 0.6, 0.325 + r * 0.6])),
    [[0.25, 1.1], [0.85, 0.95], [1.45, 1.15], [2.05, 0.95], [2.65, 1.1], [0.5, 1.55], [1.1, 1.65], [1.7, 1.5], [2.3, 1.65], [2.8, 1.55], [0.3, 2.0], [0.9, 2.1], [1.55, 2.05], [2.2, 2.1], [2.75, 2.0]],
    [[0.7, 0.5], [1.9, 0.6], [2.6, 1.3], [0.6, 1.5], [1.5, 1.2], [2.2, 2.0], [1.0, 2.0], [2.5, 0.4]],
  ];
  stPanels.forEach(([tag, state, desc, col, amp, dur, pd], bi) => {
    const x = [0.6, 4.7, 8.8][bi];
    card(s, `st${bi}c`, x, 1.55, 3.95, 4.9);
    txt(s, `st${bi}h`, P([[tag, { fontSize: 16, bold: true, color: col }], [state, { fontSize: 38, bold: true }], [desc, { fontSize: 16, color: C.background2 }]]), x + 0.1, 1.65, 3.75, 1.65, { align: "center", valign: "top" });
    shp(s, ST.rect, `st${bi}b`, x + 0.25, 3.4, 3.45, 2.85, { fill: HEX.navy, line: { color: C.background1, width: 2.5 } });
    stPts[bi].forEach(([px, py], i) => shp(s, ST.ellipse, `st${bi}p${i}`, x + 0.25 + px, 3.4 + py, pd, pd, { fill: col, shadow: glowShadow(col, 8) }));
    click("fade", [`st${bi}c`, `st${bi}h`, `st${bi}b`].concat(stPts[bi].map((_, i) => `st${bi}p${i}`)), { dur: 600 });
    stPts[bi].forEach((_, i) => {
      const a = (i * 137.5 * Math.PI) / 180;
      withp("loop", [`st${bi}p${i}`], { dur: dur + (i % 4) * 130, dx: (Math.cos(a) * amp) / SW, dy: (Math.sin(a) * amp * 0.8) / SH, delay: 0.5 });
    });
  });
  txt(s, "stcap", "Same atoms. Different energy. Different behavior.", 0.6, 6.6, 12.1, 0.6, { fontSize: 28, bold: true, align: "center", color: C.accent3 });
  click("zoom", "stcap", { dur: 600 });
  note(`
We know what atoms are. So how do these atoms BEHAVE? It turns out the first thing that decides it is energy. [CLICK] Low-energy atoms barely move. They just vibrate in place, locked into position. That's a solid. [CLICK] Give them more energy and they break out of their spots and slide around each other. That's a liquid. [CLICK] Give them a LOT of energy and they fly off in every direction, around a thousand miles an hour in room air, bumping into each other and the walls billions of times a second. That's a gas, and those bumps on the walls are what you feel as pressure.

[CLICK] Same atoms. Different energy. Different behavior. Ice, water, and steam are all the same H2O.

But that raises a question. If atoms have all this energy to fly around, why does anything ever stay solid or liquid? Something has to be holding them together.
`, "States of matter: how atoms behave");

  // ============================================================ 8. old 18
  s = newSlide("CONTENT", "How Atoms Behave", "What holds them together?");
  const mols = [["A", [2.0, 2.65], [21, 125.5]], ["B", [4.3, 3.55], [-30, 74.5]], ["C", [6.1, 2.35], [20, 124.5]], ["E", [4.9, 5.7], [60, 164.5]]];
  const dirv = (deg) => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
  const Opos = Object.fromEntries(mols.map(([k, p]) => [k, p]));
  const hb = [["A", 0, "B"], ["B", 0, "C"], ["B", 1, "E"]];
  hb.forEach(([k, hi, target], i) => {
    const [ox, oy] = Opos[k]; const [dx, dy] = dirv(mols.find((m) => m[0] === k)[2][hi]);
    const hx = ox + dx * 0.62, hy = oy + dy * 0.62;
    ln(s, `h18l${i}`, hx, hy, Opos[target][0], Opos[target][1], { color: HEX.yellow, w: 3, dash: "dash" });
  });
  mols.forEach(([k, [ox, oy], angs]) => {
    angs.forEach((a, hi) => {
      const [dx, dy] = dirv(a);
      shp(s, ST.ellipse, `h18${k}h${hi}`, ox + dx * 0.62 - 0.26, oy + dy * 0.62 - 0.26, 0.52, 0.52, { fill: "7DD3FC" });
    });
    shp(s, ST.ellipse, `h18${k}o`, ox - 0.45, oy - 0.45, 0.9, 0.9, { fill: "FF5A6E", shadow: glowShadow("FF5A6E", 10) });
  });
  txt(s, "h18lab", "hydrogen bonds", 2.2, 4.55, 2.2, 0.45, { fontSize: 18, bold: true, color: HEX.yellow, align: "center" });
  const imf = [["snowc", "Why ice floats"], ["paw", "Why geckos climb walls"], ["dropc", "Why sweating cools you"]];
  imf.forEach(([k, t], i) => {
    card(s, `i18c${i}`, 7.9, 1.75 + i * 1.7, 4.85, 1.45);
    icon(s, `i18i${i}`, k, 8.2, 2.1 + i * 1.7, 0.75);
    txt(s, `i18t${i}`, t, 9.2, 1.85 + i * 1.7, 3.4, 1.25, { fontSize: 24, bold: true });
  });
  click("fade", ["h18l0", "h18l1", "h18l2", "h18lab"], { dur: 700, stagger: 0.25 });
  imf.forEach((_, i) => { if (i === 0) click("zoom", [`i18c${i}`], { dur: 450 }); else after("zoom", [`i18c${i}`], { dur: 450 }); withp("zoom", [`i18i${i}`, `i18t${i}`], { dur: 450 }); });
  note(`
Something is holding them together: atoms and molecules are attracted to each other. [CLICK] Water is the star example. Each molecule has a slightly positive end and a slightly negative end, like a tiny bent magnet, and they cling to each other along these dashed lines called hydrogen bonds. So there's a tug-of-war going on: the attraction pulls the molecules together, and their energy pulls them apart. Low energy: attraction wins, and you get a solid. Medium energy: it's a draw, a liquid. High energy: the energy wins, and you get a gas.

[CLICK] That one idea explains a pile of everyday mysteries. Why ice floats, which is very unusual for a solid, and is the reason lakes freeze from the top and fish survive the winter. Why geckos can walk up walls: no glue, just tiny attractions between molecules, adding up. And why sweating cools you down: the water has to absorb energy to break those attractions and escape your skin.

So atoms and molecules attract each other. The stronger the attraction, the harder they are to pull apart. Which raises a bigger question: what happens when that attraction gets REALLY strong?
`, "Intermolecular forces");

  // ============================================================ 9. old 11
  pres.addSection({ title: "Bonding and Electrons" });
  s = newSlide("CONTENT", "Bonding and Electrons", "What happens when two atoms get close?");
  s.addImage({ path: IMG("mascot_h.png"), x: 0.35, y: 2.5, w: 2.2, h: 2.2, objectName: "n11a" });
  s.addImage({ path: IMG("mascot_h.png"), x: 3.85, y: 2.5, w: 2.2, h: 2.2, objectName: "n11b" });
  shp(s, ST.heart, "n11heart", 1.8, 1.95, 0.7, 0.65, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 12) });
  txt(s, "n11lab", "Two hydrogen atoms, drifting closer", 0.5, 4.8, 5.5, 0.55, { fontSize: 20, color: C.background2, align: "center" });
  const mw = META.bondwell, cx0 = 6.5, cy0 = 1.7, cw = 6.4, ch = cw * mw.h / mw.w;
  s.addImage({ path: IMG("bondwell.png"), x: cx0, y: cy0, w: cw, h: ch, objectName: "well" });
  txt(s, "wellY", "Energy", cx0 - 0.1, cy0 + 0.05, 0.9, 0.4, { fontSize: 16, bold: true, color: HEX.lav, align: "left" });
  txt(s, "wellX", "Distance between the atoms →", cx0 + 1.2, cy0 + ch - 0.4, 4.9, 0.4, { fontSize: 16, bold: true, color: HEX.lav, align: "center" });
  txt(s, "wellZero", "far apart: zero", cx0 + cw - 2.2, cy0 + mw.zero_y * ch - 0.5, 2.1, 0.4, { fontSize: 15, color: HEX.muted, align: "right" });
  const p0 = mw.path[0];
  const dotX = cx0 + p0[0] * cw - 0.17, dotY = cy0 + p0[1] * ch - 0.17;
  shp(s, ST.ellipse, "dot11", dotX, dotY, 0.34, 0.34, { fill: HEX.yellow, shadow: glowShadow(HEX.yellow, 12) });
  chip(s, "rel11", "ENERGY RELEASED = a BOND", cx0 + 0.9, cy0 + ch + 0.25, 5.0, 0.7, HEX.orange, C.text1, { fontSize: 24 });
  txt(s, "low11", "Lower energy = happier atoms", 0.5, 5.5, 5.5, 0.55, { fontSize: 22, bold: true, color: HEX.yellow, align: "center" });
  const dotPath = mw.path.map(([x, y]) => [(x - p0[0]) * cw / SW, (y - p0[1]) * ch / SH]);
  click("fade", ["well", "wellY", "wellX", "wellZero", "dot11"], { dur: 700 });
  click("movepath", ["dot11"], { dur: 3200, pts: dotPath });
  withp("move", ["n11b"], { dur: 3200, dx: -2.1 / SW, dy: 0 });
  withp("fade", ["low11"], { dur: 600, delay: 2.4 });
  after("zoom", ["rel11"], { dur: 500 });
  after("pulse", ["rel11"], { dur: 400 });
  withp("zoom", ["n11heart"], { dur: 500 });
  after("pulse", ["n11heart"], { dur: 500 });
  note(`
Let's find out. Take two atoms and push them toward each other. [CLICK] This graph tells the story. Energy goes up the side, and the distance between the atoms goes along the bottom. When they're far apart they don't feel each other: zero.

[CLICK] Now push them closer. The electrons of each get pulled toward the nucleus of the other, and the energy DROPS, like a ball rolling down into a valley. At just the right distance, the energy hits the bottom. That's the happiest spot for the pair, and the energy they gave up doesn't vanish: it's released as heat and light. Atoms stuck together at that distance: that is a chemical bond. Push them even closer and they repel, so the energy shoots back up the other side. Collide them with enough energy, and they can fall into that valley and stay.

But here's the thing: not every pair of atoms wants to fall into that valley. Some atoms are desperate to bond. Some want nothing to do with anyone. Who's who? The periodic table can tell you.
`, "Atoms approach: energy is released");

  // ============================================================ 10. old 7
  s = newSlide("CONTENT", "Bonding and Electrons", "Who bonds? The periodic table knows");
  const SYM = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");
  if (SYM.length !== 118) throw new Error("need 118 symbols, got " + SYM.length);
  const pos = (Z) => {
    if (Z === 1) return [1, 1]; if (Z === 2) return [1, 18];
    if (Z <= 4) return [2, Z - 2]; if (Z <= 10) return [2, Z + 6];
    if (Z <= 12) return [3, Z - 10]; if (Z <= 18) return [3, Z - 0];
    if (Z <= 36) return [4, Z - 18]; if (Z <= 54) return [5, Z - 36];
    if (Z <= 56) return [6, Z - 54]; if (Z <= 71) return [8, Z - 54];
    if (Z <= 86) return [6, Z - 68]; if (Z <= 88) return [7, Z - 86];
    if (Z <= 103) return [9, Z - 86]; return [7, Z - 100];
  };
  const PX = 0.675, PY = 0.58, CW = 0.64, CH = 0.55, X0 = (SW - 18 * PX) / 2 + 0.02, Y0 = 1.5;
  const cellXY = (Z) => { const [r, c] = pos(Z); return [X0 + (c - 1) * PX, Y0 + (r - 1) * PY + (r >= 8 ? 0.2 : 0)]; };
  const FAM = { alk: [[3, 11, 19, 37, 55, 87], HEX.pink], hal: [[9, 17, 35, 53, 85, 117], HEX.green], nob: [[2, 10, 18, 36, 54, 86, 118], HEX.violet], trn: [[], HEX.yellow] };
  for (let z = 21; z <= 30; z++) FAM.trn[0].push(z);
  for (let z = 39; z <= 48; z++) FAM.trn[0].push(z);
  for (let z = 72; z <= 80; z++) FAM.trn[0].push(z);
  for (let z = 104; z <= 112; z++) FAM.trn[0].push(z);
  for (let Z = 1; Z <= 118; Z++) {
    const [x, y] = cellXY(Z);
    s.addText(SYM[Z - 1], { shape: ST.roundRect, rectRadius: 0.06, x, y, w: CW, h: CH, fill: { color: "232C6B" }, line: { color: "2E3A80", width: 0.75 }, color: HEX.muted, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0, objectName: `pt${Z}` });
  }
  [[6, "*", "ptstar1"], [7, "**", "ptstar2"]].forEach(([r, t, nm]) => {
    s.addText(t, { shape: ST.roundRect, rectRadius: 0.06, x: X0 + 2 * PX, y: Y0 + (r - 1) * PY, w: CW, h: CH, fill: { color: "10173F" }, line: { color: "2E3A80", width: 0.75, dashType: "dash" }, color: HEX.muted, fontSize: 16, bold: true, align: "center", valign: "middle", margin: 0, objectName: nm });
  });
  [[8, "*", "ptflab1"], [9, "**", "ptflab2"]].forEach(([r, t, nm]) => {
    txt(s, nm, t, X0 + 1 * PX, Y0 + (r - 1) * PY + 0.2, CW, CH, { fontSize: 16, bold: true, align: "right", color: HEX.muted });
  });
  const famNames = { alk: "ov_alk", hal: "ov_hal", nob: "ov_nob", trn: "ov_trn" };
  Object.entries(FAM).forEach(([k, [zs, col]]) => {
    zs.forEach((Z) => {
      const [x, y] = cellXY(Z);
      s.addText(SYM[Z - 1], { shape: ST.roundRect, rectRadius: 0.06, x, y, w: CW, h: CH, fill: { color: col }, line: { color: col, width: 0.75 }, color: C.text1, fontSize: 14, bold: true, align: "center", valign: "middle", margin: 0, objectName: `${famNames[k]}${Z}` });
    });
  });
  const capBox = (name, big, small, col) => txt(s, name, P([[big, { fontSize: 30, bold: true, color: col }], [small, { fontSize: 22, color: C.background1 }]]), 2.0, 1.5, 6.6, 1.65, { valign: "top", align: "left" });
  capBox("cap0", "Some atoms bond eagerly.", "Some never will.", HEX.cyan);
  capBox("cap1", "ALKALI METALS", "Give up 1 electron: bond with almost anything", HEX.pink);
  capBox("cap2", "HALOGENS", "Desperate to grab 1 electron: also eager", HEX.green);
  capBox("cap3", "NOBLE GASES", "Perfectly content: they almost never bond", HEX.violet);
  capBox("cap4", "TRANSITION METALS", "Iron, copper, gold: the metals you know", HEX.yellow);
  capBox("cap5", "Same column, same personality", "Because of their outer electrons", HEX.cyan);
  const famIds = ["alk", "hal", "nob", "trn"];
  famIds.forEach((k, i) => {
    click("fadeout", [`cap${i}`], { dur: 300 });
    withp("fade", FAM[k][0].map((Z) => `${famNames[k]}${Z}`), { dur: 500, stagger: 0.05 });
    withp("fade", [`cap${i + 1}`], { dur: 500, delay: 0.3 });
  });
  click("fadeout", ["cap4"], { dur: 300 });
  withp("fade", ["cap5"], { dur: 600, delay: 0.3 });
  // cap0 is the only caption visible at the start: hide the rest by giving them an entrance
  // (done in add_animations.py via the "initially hidden" rule: every captured target of an entrance effect is hidden at start)
  note(`
Who's who? People noticed something over hundreds of years: if you line the elements up by number of protons, the behavior REPEATS. Mendeleev's version of this table, in 1869, was so good that he left gaps for elements nobody had discovered yet, and he was right. This is the Bible of chemistry: 118 elements on one page, with an enormous amount of information hiding in it.

[CLICK] The far left column: the alkali metals. Each one is eager to give away a single electron, so they bond with almost anything. [CLICK] Near the right: the halogens, desperate to grab one electron. Also eager. [CLICK] The far right: the noble gases. Perfectly content, so they almost never bond with anybody. [CLICK] And the big middle block: the transition metals. Iron, copper, gold, the metals you actually know.

[CLICK] The rule that makes the table so useful: same column, same personality. It's a seating chart arranged so that families with the same attitude sit together. And that attitude comes from their electrons, which we'll get to in a minute. First, let's see that attitude in action.
`, "The periodic table");

  // ============================================================ 11. PARTY
  s = newSlide("CONTENT", "Bonding and Electrons", "Chemistry is basically a party");
  const party = [
    ["alkali", "Alkali metals", "I have an electron I'd GLADLY give away!", HEX.pink, 0.55, 3.0, 3.0],
    ["halogen", "Halogens", "Anybody got a spare electron?!", HEX.green, 4.65, 3.0, 3.0],
    ["noble", "Noble gases", "I'm good.", HEX.cyan, 9.4, 3.9, 2.4],
  ];
  party.forEach(([k, label, line, col, x, my, msz], i) => {
    speech(s, `pty${i}b`, line, x + 0.1, 1.55, i === 2 ? 2.2 : 3.4, i === 2 ? 0.8 : 1.3, { fontSize: i === 2 ? 26 : 21 });
    s.addImage({ path: IMG(`mascot_${k}.png`), x: x + 0.2, y: my, w: msz, h: msz, objectName: `pty${i}m` });
    chip(s, `pty${i}l`, label, x + 0.4, 6.35, 2.6, 0.55, col, C.text1, { fontSize: 20 });
    click("zoom", [`pty${i}m`], { dur: 500 });
    withp("zoom", [`pty${i}b`], { dur: 450, delay: 0.5 });
    withp("fade", [`pty${i}l`], { dur: 500, delay: 0.3 });
  });
  withp("loop", ["pty0m"], { dur: 380, dx: 0, dy: -0.22 / SH, delay: 1.0 });
  withp("loop", ["pty1m"], { dur: 120, dx: 0.06 / SW, dy: 0, delay: 1.0 });
  note(`
Let's put that in party terms. [CLICK] The alkali metals walk in: "I have an electron I would GLADLY give away!" [CLICK] The halogens, right behind them: "Wait, does anybody have a spare electron?!" Instant best friends. Put them together and they bond, and fast. [CLICK] And in the corner, sunglasses on: the noble gases. "I'm good." They already have what they need, so they don't bond with anyone. If you're an introvert at parties, congratulations, you're a noble gas.
`, "Party chemistry");

  // ============================================================ 12. old 8
  s = newSlide("CONTENT", "Bonding and Electrons", "Same family, same personality");
  txt(s, "s8sub", "Alkali metals dropped into water", 0.6, 1.3, 8.0, 0.45, { fontSize: 20, color: C.background2 });
  const alk = [["Li", "Lithium", "calm fizz", 0.9, "FFD23F"], ["Na", "Sodium", "zips and burns", 1.55, "FFB020"], ["K", "Potassium", "lilac flames", 2.2, "FF8A1F"],
    ["Rb", "Rubidium", "violent", 2.85, "FF5A3C"], ["Cs", "Cesium", "explodes", 3.5, "FF2D55"]];
  alk.forEach(([sym, name, what, h, col], i) => {
    const x = 0.9 + i * 1.55, base = 6.15;
    shp(s, ST.roundRect, `b8bar${i}`, x, base - h, 1.2, h, { fill: col, rectRadius: 0.1, shadow: glowShadow(col, 10) });
    txt(s, `b8lab${i}`, what, x - 0.2, base - h - 0.6, 1.6, 0.5, { fontSize: 16, bold: true, align: "center", color: col });
    txt(s, `b8nm${i}`, P([[sym, { fontSize: 24, bold: true }], [name, { fontSize: 14, color: C.background2 }]]), x - 0.2, 6.2, 1.6, 0.95, { align: "center", valign: "top" });
    if (i === 0) click("wipeup", [`b8bar${i}`], { dur: 500 }); else after("wipeup", [`b8bar${i}`], { dur: 500 });
    withp("fade", [`b8lab${i}`], { dur: 500, delay: 0.3 });
  });
  // mini periodic-table column with an arrow
  card(s, "b8card", 9.3, 1.75, 3.4, 4.9);
  txt(s, "b8hd", "Group 1", 9.3, 1.9, 3.4, 0.5, { fontSize: 22, bold: true, align: "center", color: HEX.pink });
  alk.forEach(([sym], i) => {
    s.addText(sym, { shape: ST.roundRect, rectRadius: 0.06, x: 10.0, y: 2.55 + i * 0.7, w: 0.85, h: 0.6, fill: { color: HEX.pink }, color: C.text1, fontSize: 20, bold: true, align: "center", valign: "middle", margin: 0, objectName: `b8cell${i}` });
  });
  shp(s, ST.downArrow, "b8arrow", 11.2, 2.55, 0.7, 3.4, { fill: C.accent2 });
  txt(s, "b8arrowt", "more reactive", 11.95, 3.4, 0.7, 1.7, { fontSize: 15, bold: true, color: C.accent2, rotate: 90, align: "center" });
  click("fade", ["b8card", "b8hd", "b8arrow", "b8arrowt", "b8cell0", "b8cell1", "b8cell2", "b8cell3", "b8cell4"], { dur: 600 });
  note(`
Let's test the word "eager" with the alkali metals. Drop them in water, from the top of the column to the bottom. [CLICK] Lithium: a calm, polite fizz. Sodium: zips around, melts into a ball, and may catch fire. Potassium: lilac flames right away. Rubidium: violent. And cesium: it blows up so hard it can shatter the glass container.

[CLICK] Same family, same kind of reaction, but each step down the column gets more dramatic. It's like a group chat: it escalates. You can predict that just from where they sit on the table. Francium, at the very bottom, should be the wildest of all. We just can't collect enough of it to prove it: it's so radioactive that it falls apart in minutes, and there's estimated to be only about an ounce of it in the entire Earth's crust at any moment.

So why? Why would one more row make the drama worse, and why do the noble gases stay so calm? The answer is the same for everything in this class: the electrons.
`, "Same family, same personality");

  // ============================================================ 13. SODIUM
  s = newSlide("CONTENT", "Bonding and Electrons", "Meanwhile, sodium and water");
  s.addImage({ path: IMG("mascot_sodium.png"), x: 0.5, y: 2.9, w: 3.2, h: 3.2, objectName: "sod_m" });
  speech(s, "sod_b", "Watch this.", 0.7, 1.6, 2.6, 0.9, { fontSize: 28 });
  s.addImage({ path: IMG("sodium_water.gif"), x: 4.2, y: 1.75, w: 8.5, h: 4.72, objectName: "sod_gif" });
  txt(s, "sod_cap", "Do not try this at home. Seriously.", 0.6, 6.6, 12.1, 0.55, { fontSize: 28, bold: true, align: "center", color: C.accent3 });
  click("zoom", ["sod_m"], { dur: 500 });
  withp("zoom", ["sod_b"], { dur: 450, delay: 0.5 });
  click("fade", ["sod_gif"], { dur: 600 });
  click("zoom", ["sod_cap"], { dur: 500 });
  after("pulse", ["sod_cap"], { dur: 400 });
  note(`
Quick sidebar on that alkali family. [CLICK] Sodium: "Watch this." [CLICK] Drop it in water and it skates around the surface, fizzing, melts into a shiny ball, and can burst into flame. It gives up that outer electron to the water so eagerly that the reaction releases a lot of heat. [CLICK] Do not try this at home. Not even a little bit. That's exactly why we have a lab, goggles, and a teacher who has done this before.
`, "Sodium meets water");

  // ============================================================ 14. old 9
  s = newSlide("CONTENT", "Bonding and Electrons", "It all comes down to electrons");
  const lvlY = [6.2, 4.2, 3.1, 2.4];
  lvlY.forEach((y, i) => {
    ln(s, `l9${i}`, 1.5, y, 5.6, y, { color: HEX.lav, w: 3 });
    txt(s, `l9n${i}`, `n = ${i + 1}`, 0.55, y - 0.25, 0.85, 0.5, { fontSize: 16, bold: true, color: HEX.muted, align: "right" });
  });
  txt(s, "s9ladder", "an electron can stand on a level, never between", 1.0, 6.65, 5.2, 0.5, { fontSize: 15, color: HEX.muted, align: "center" });
  shp(s, ST.ellipse, "e9", 3.33, lvlY[0] - 0.36, 0.34, 0.34, { fill: HEX.cyan, shadow: glowShadow(HEX.cyan, 12) });
  icon(s, "heat9", "fire", 5.85, 5.35, 0.7);
  shp(s, ST.star4, "ph9", 3.2, lvlY[1] - 0.62, 0.6, 0.6, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 14) });
  const c9 = [["1  Add energy", "The electron jumps UP", HEX.yellow], ["2  It falls back", "The extra energy leaves as LIGHT", HEX.pink], ["3  Bigger drop", "A different color of light", HEX.cyan]];
  c9.forEach(([h, b, col], i) => {
    card(s, `c9c${i}`, 6.9, 1.8 + i * 1.65, 5.85, 1.45);
    txt(s, `c9t${i}`, P([[h, { fontSize: 24, bold: true, color: col }], [b, { fontSize: 20 }]]), 7.2, 1.85 + i * 1.65, 5.3, 1.35, { valign: "middle" });
  });
  const dyUp = (lvlY[2] - lvlY[0]) / SH;     // n1 -> n3
  const dyDown = (lvlY[1] - lvlY[2]) / SH;   // n3 -> n2
  click("fade", ["c9c0", "c9t0", "heat9"], { dur: 500 });
  withp("move", ["e9"], { dur: 900, dx: 0, dy: dyUp });
  click("fade", ["c9c1", "c9t1"], { dur: 500 });
  withp("fadeout", ["heat9"], { dur: 400 });
  withp("move", ["e9"], { dur: 700, dx: 0, dy: dyDown });
  after("zoom", ["ph9"], { dur: 300 });
  withp("move", ["ph9"], { dur: 1100, dx: 3.0 / SW, dy: 0, delay: 0.2 });
  withp("fadeout", ["ph9"], { dur: 500, delay: 0.8 });
  click("fade", ["c9c2", "c9t2"], { dur: 500 });
  note(`
Remember, electrons are the outside of the atom, so they're what actually meets other atoms. Here's how they behave. Electrons live on energy levels, like floors of a building, with one strange rule: an electron can stand ON a floor, never between floors.

[CLICK] Give an electron some energy, like heat, and it jumps UP a level. [CLICK] But it can't stay up there. It falls back down, and the energy it had to give up leaves as a flash of LIGHT. [CLICK] The bigger the drop, the different the color.

Electrons are the world's worst climbers: they go up, they immediately fall, and then they glow about it. And that gives us one of the best party tricks in all of science.
`, "Electrons live on energy levels");

  // ============================================================ 15. old 10
  s = newSlide("CONTENT", "Bonding and Electrons", "Every element glows its own color");
  const fl = [["li", "Li", "Lithium", "crimson", "FF3355"], ["na", "Na", "Sodium", "yellow-orange", "FFC81E"], ["k", "K", "Potassium", "lilac", "B58CFF"],
    ["ca", "Ca", "Calcium", "orange-red", "FF7A2E"], ["cu", "Cu", "Copper", "green", "2EE08A"]];
  fl.forEach(([key, sym, name, colname, col], i) => {
    const x = 0.75 + i * 2.4;
    s.addImage({ path: IMG(`flame_${key}.gif`), x, y: 1.6, w: 2.0, h: 3.33, objectName: `f10${i}`, altText: `${name} flame test, ${colname}` });
    txt(s, `f10t${i}`, P([[sym, { fontSize: 34, bold: true, color: col }], [name, { fontSize: 18, bold: true }], [colname, { fontSize: 16, color: C.background2 }]]), x - 0.2, 5.0, 2.4, 1.45, { align: "center", valign: "top" });
    if (i === 0) click("fade", [`f10${i}`], { dur: 700 }); else after("fade", [`f10${i}`], { dur: 600 });
    withp("fade", [`f10t${i}`], { dur: 600, delay: 0.2 });
  });
  txt(s, "f10cap", "Fireworks, neon signs, and how we know what stars are made of", 0.6, 6.6, 12.1, 0.55, { fontSize: 22, bold: true, align: "center", color: C.accent3 });
  click("fade", "f10cap", { dur: 700 });
  note(`
Every kind of atom has its own pattern of drops, so every element glows its own color. This is called a flame test. [CLICK] Lithium: crimson. Sodium: the yellow-orange glow of old street lamps. Potassium: a pretty lilac. Calcium: orange-red. Copper: green.

[CLICK] This is exactly how fireworks get their colors, and it's how astronomers figure out what stars are made of: they've never visited a star, they just read its light. You'll be doing flame tests yourselves in this class.

And it proves something important: electrons really do sit on levels, in layers. The outermost layer is the one that touches other atoms. So let's look at that outer layer.
`, "Flame tests");

  // ============================================================ 16. OUTER
  s = newSlide("CONTENT", "Bonding and Electrons", "The outer electrons decide who bonds");
  const OY = 3.35, RR = [0.5, 0.9, 1.3];
  const atomDefs = [
    { key: "na", x: 2.5, sym: "Na", shells: [2, 8, 1], col: "C084FC", name: "Sodium", line: "1 outer electron: wants to GIVE it away", lc: HEX.violet },
    { key: "cl", x: 6.5, sym: "Cl", shells: [2, 8, 7], col: "5BE584", name: "Chlorine", line: "7 outer electrons: wants to GRAB one", lc: HEX.green },
    { key: "ne", x: 10.6, sym: "Ne", shells: [2, 8], col: "7DD3FC", name: "Neon", line: "8 outer electrons: full, needs nothing", lc: HEX.cyan },
  ];
  atomDefs.forEach((a, ai) => {
    const names = [];
    a.shells.forEach((n, si) => {
      const r = RR[si];
      shp(s, ST.ellipse, `o16r_${a.key}${si}`, a.x - r, OY - r, 2 * r, 2 * r, { line: { color: "6C7AC9", width: 1.5 } });
      names.push(`o16r_${a.key}${si}`);
      const outer = si === a.shells.length - 1;
      const slots = outer && a.key === "cl" ? 8 : n;
      for (let k = 0; k < slots; k++) {
        if (outer && a.key === "cl" && k === 4) continue;
        const ang = ((outer ? 0 : (n === 2 ? 90 : 22.5)) + (k * 360) / slots) * Math.PI / 180;
        const nm = `o16e_${a.key}_${si}_${k}`;
        shp(s, ST.ellipse, nm, a.x + r * Math.cos(ang) - 0.085, OY + r * Math.sin(ang) - 0.085, 0.17, 0.17, { fill: outer ? HEX.yellow : HEX.cyan, shadow: glowShadow(outer ? HEX.yellow : HEX.cyan, 6) });
        names.push(nm);
      }
    });
    s.addText(a.sym, { shape: ST.ellipse, x: a.x - 0.31, y: OY - 0.31, w: 0.62, h: 0.62, fill: { color: a.col }, color: C.text1, fontSize: 16, bold: true, align: "center", valign: "middle", margin: 0, objectName: `o16n_${a.key}` });
    names.push(`o16n_${a.key}`);
    txt(s, `o16t_${a.key}`, P([[a.name, { fontSize: 24, bold: true, color: a.lc }], [a.line, { fontSize: 17 }]]), a.x - 1.95, 4.85, 3.9, 1.3, { align: "center", valign: "top" });
    click("zoom", names, { dur: 450, stagger: 0.02 });
    withp("fade", [`o16t_${a.key}`], { dur: 600, delay: 0.5 });
  });
  txt(s, "o16chna", "Na^+", 1.6, 1.35, 1.8, 0.6, { fontSize: 32, bold: true, align: "center", color: HEX.violet });
  txt(s, "o16chcl", "Cl^−", 5.6, 1.35, 1.8, 0.6, { fontSize: 32, bold: true, align: "center", color: HEX.green });
  shp(s, ST.heart, "o16heart", 4.2, 3.05, 0.6, 0.55, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 10) });
  txt(s, "o16cap", "Opposites attract. That is a bond.", 0.6, 6.35, 12.1, 0.6, { fontSize: 28, bold: true, align: "center", color: C.accent3 });
  click("move", ["o16e_na_2_0"], { dur: 1100, dx: 1.4 / SW, dy: 0 });
  withp("fade", ["o16chna", "o16chcl"], { dur: 600, delay: 0.9 });
  after("zoom", ["o16heart"], { dur: 500 });
  withp("fade", ["o16cap"], { dur: 600, delay: 0.3 });
  note(`
Here's the secret behind who bonds. Look at the outermost layer of electrons. [CLICK] Sodium has just one electron out there, all by itself. It would love to get rid of it. [CLICK] Chlorine has seven out there, one short of a full set of eight. It would love to grab one. [CLICK] And neon? Eight. A full outer layer. It needs nothing, so it never bonds. That's your noble gas.

[CLICK] Now put sodium next to chlorine. Sodium hands its electron over. Now sodium is positive, chlorine is negative, and opposites attract. That's a bond, and the result is table salt. So atoms bond to get a full outer layer, and the periodic table tells you who needs what. That's why same column means same personality: same number of outer electrons.
`, "The outer electrons decide who bonds");

  // ============================================================ 17. old 12
  s = newSlide("CONTENT", "Bonding and Electrons", "Three ways atoms stick together");
  const bx = [0.6, 4.7, 8.8];
  const bheads = [["GIVE", "Ionic: table salt", HEX.violet], ["SHARE", "Covalent: water, sugar, you", HEX.cyan], ["POOL", "Metallic: copper, gold", HEX.yellow]];
  bheads.forEach(([h, sub, col], i) => {
    card(s, `b12card${i}`, bx[i], 1.65, 3.95, 5.1);
    txt(s, `b12hd${i}`, P([[h, { fontSize: 38, bold: true, color: col }], [sub, { fontSize: 18 }]]), bx[i] + 0.1, 4.9, 3.75, 1.5, { align: "center", valign: "top" });
  });
  // ionic: Na+ and Cl-
  shp(s, ST.ellipse, "b12na", bx[0] + 0.55, 2.55, 1.15, 1.15, { fill: "C084FC", shadow: glowShadow("C084FC", 12) });
  txt(s, "b12nat", "Na^+", bx[0] + 0.55, 2.55, 1.15, 1.15, { fontSize: 24, bold: true, align: "center", color: C.text1 });
  shp(s, ST.ellipse, "b12cl", bx[0] + 2.1, 2.35, 1.5, 1.5, { fill: "5BE584", shadow: glowShadow("5BE584", 12) });
  txt(s, "b12clt", "Cl^−", bx[0] + 2.1, 2.35, 1.5, 1.5, { fontSize: 28, bold: true, align: "center", color: C.text1 });
  shp(s, ST.ellipse, "b12e", bx[0] + 1.78, 3.0, 0.26, 0.26, { fill: HEX.cyan, shadow: glowShadow(HEX.cyan, 8) });
  txt(s, "b12etxt", "electron moves over", bx[0] + 0.3, 4.1, 3.4, 0.4, { fontSize: 15, color: HEX.muted, align: "center" });
  // covalent: water
  const wx = bx[1] + 1.95, wy = 2.85;
  shp(s, ST.ellipse, "b12h1", wx - 1.05, wy + 0.25, 0.8, 0.8, { fill: "7DD3FC" });
  shp(s, ST.ellipse, "b12h2", wx + 0.25, wy + 0.25, 0.8, 0.8, { fill: "7DD3FC" });
  shp(s, ST.ellipse, "b12o", wx - 0.7, wy - 0.55, 1.4, 1.4, { fill: "FF5A6E", shadow: glowShadow("FF5A6E", 12) });
  txt(s, "b12ot", "O", wx - 0.7, wy - 0.55, 1.4, 1.4, { fontSize: 36, bold: true, align: "center", color: C.text1 });
  txt(s, "b12h1t", "H", wx - 1.05, wy + 0.25, 0.8, 0.8, { fontSize: 22, bold: true, align: "center", color: C.text1 });
  txt(s, "b12h2t", "H", wx + 0.25, wy + 0.25, 0.8, 0.8, { fontSize: 22, bold: true, align: "center", color: C.text1 });
  shp(s, ST.ellipse, "b12s1", wx - 0.5, wy + 0.5, 0.2, 0.2, { fill: HEX.cyan });
  shp(s, ST.ellipse, "b12s2", wx + 0.3, wy + 0.5, 0.2, 0.2, { fill: HEX.cyan });
  txt(s, "b12etxt2", "electrons shared", bx[1] + 0.3, 4.1, 3.4, 0.4, { fontSize: 15, color: HEX.muted, align: "center" });
  // metallic: lattice + sea of electrons
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    shp(s, ST.ellipse, `b12m${r}${c}`, bx[2] + 0.65 + c * 0.9, 2.2 + r * 0.55, 0.55, 0.55, { fill: HEX.yellow });
  }
  [[0.5, 0.35], [1.25, 0.7], [2.15, 0.4], [0.9, 1.15], [1.7, 1.45], [2.6, 1.2], [0.6, 1.7], [2.35, 1.85], [1.4, 0.1], [1.0, 1.9]].forEach(([dx, dy], i) => {
    shp(s, ST.ellipse, `b12d${i}`, bx[2] + 0.55 + dx, 2.1 + dy, 0.17, 0.17, { fill: HEX.cyan });
  });
  txt(s, "b12etxt3", "a sea of shared electrons", bx[2] + 0.3, 4.1, 3.4, 0.4, { fontSize: 15, color: HEX.muted, align: "center" });
  click("zoom", ["b12card0"], { dur: 450 });
  withp("zoom", ["b12na", "b12nat", "b12cl", "b12clt", "b12e", "b12etxt", "b12hd0"], { dur: 450 });
  click("move", ["b12e"], { dur: 1000, dx: 0.9 / SW, dy: 0 });
  click("zoom", ["b12card1"], { dur: 450 });
  withp("zoom", ["b12h1", "b12h2", "b12h1t", "b12h2t", "b12o", "b12ot", "b12s1", "b12s2", "b12etxt2", "b12hd1"], { dur: 450 });
  click("zoom", ["b12card2"], { dur: 450 });
  withp("zoom", ["b12hd2", "b12etxt3"].concat([0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => `b12m${r}${c}`))).concat([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `b12d${i}`)), { dur: 450 });
  note(`
Giving away an electron is only one way to settle things. There are three main ways atoms bond. [CLICK] GIVE: one atom hands an electron over to another, like sodium giving one to chlorine. [CLICK] The result is two oppositely charged particles that cling to each other: that's table salt. [CLICK] SHARE: when both atoms want electrons, nobody can give, so they share. The oxygen and two hydrogens in water share electrons. That's most of the molecules you're made of: sugar, protein, DNA, water. [CLICK] POOL: metal atoms throw their outer electrons into a shared sea. That's why metals are shiny, bendable, and carry electricity.

Same atoms sticking together, completely different properties. Ionic is a one-sided relationship, covalent is a shared Netflix account, and metallic is a commune.
`, "Three ways atoms stick together");

  // ============================================================ 18. TWOWAYS
  s = newSlide("CONTENT", "Bonding and Electrons", "Two ways to study chemistry");
  s.addImage({ path: IMG("mascot_grumpy.png"), x: 0.4, y: 1.45, w: 2.6, h: 2.6, objectName: "tw_m1" });
  card(s, "tw_c1", 3.1, 1.95, 7.3, 1.5);
  txt(s, "tw_t1", "Memorize 10,000 separate facts", 3.4, 2.0, 6.8, 1.4, { fontSize: 32, bold: true });
  icon(s, "tw_i1", "no", 10.8, 2.15, 1.1);
  s.addImage({ path: IMG("mascot_cool.png"), x: 0.4, y: 3.95, w: 2.6, h: 2.6, objectName: "tw_m2" });
  card(s, "tw_c2", 3.1, 4.45, 7.3, 1.5);
  txt(s, "tw_t2", "Learn the electron rules that explain all of them", 3.4, 4.5, 6.8, 1.4, { fontSize: 32, bold: true });
  icon(s, "tw_i2", "yes", 10.8, 4.65, 1.1);
  txt(s, "tw_cap", "Chemistry is a handful of ideas that keep repeating.", 0.6, 6.65, 12.1, 0.55, { fontSize: 26, bold: true, align: "center", color: C.accent3 });
  click("zoom", ["tw_m1"], { dur: 450 });
  withp("zoom", ["tw_c1", "tw_t1"], { dur: 450, delay: 0.3 });
  withp("zoom", ["tw_i1"], { dur: 450, delay: 0.8 });
  click("zoom", ["tw_m2"], { dur: 450 });
  withp("zoom", ["tw_c2", "tw_t2"], { dur: 450, delay: 0.3 });
  withp("zoom", ["tw_i2"], { dur: 450, delay: 0.8 });
  click("fade", ["tw_cap"], { dur: 600 });
  note(`
Here's a quick truth about this class. There are two ways to study chemistry. [CLICK] Option one: memorize ten thousand separate facts. Which things react, what color the flames are, who bonds with who. That's the path of tears. [CLICK] Option two: learn a few rules about electrons, and then every one of those facts becomes predictable. That's what we just walked through. [CLICK] Chemistry is a handful of ideas that keep repeating. And we're about to use those ideas to rearrange atoms on purpose.
`, "Two ways to study chemistry");

  // ============================================================ 19. old 13
  pres.addSection({ title: "Reactions" });
  s = newSlide("CONTENT", "Reactions", "Chemical reaction: atoms swap partners");
  const OD = 1.25, HD = 0.8, sy = 2.9;
  const O1s = [5.85, sy], O2s = [6.85, sy];
  const H1s = [2.1, sy], H2s = [2.8, sy], H3s = [10.5, sy], H4s = [11.2, sy];
  const wA = [4.2, 2.65], wB = [9.0, 2.65];
  const off = 0.95, ang = (52.25 * Math.PI) / 180;
  const hdx = off * Math.sin(ang), hdy = off * Math.cos(ang);
  const targets = {
    O1: wA, O2: wB, H1: [wA[0] - hdx, wA[1] + hdy], H2: [wA[0] + hdx, wA[1] + hdy], H3: [wB[0] - hdx, wB[1] + hdy], H4: [wB[0] + hdx, wB[1] + hdy],
  };
  const atomsR = [["O1", O1s, OD, "FF5A6E", "O"], ["O2", O2s, OD, "FF5A6E", "O"], ["H1", H1s, HD, "7DD3FC", "H"], ["H2", H2s, HD, "7DD3FC", "H"], ["H3", H3s, HD, "7DD3FC", "H"], ["H4", H4s, HD, "7DD3FC", "H"]];
  // draw H first so the big O atoms sit on top where they overlap
  atomsR.slice().sort((a, b) => a[2] - b[2]).forEach(([id, [x, y], d, col, sym]) => {
    shp(s, ST.ellipse, `r13${id}`, x - d / 2, y - d / 2, d, d, { fill: col, shadow: glowShadow(col, 10) });
    txt(s, `r13${id}t`, sym, x - d / 2, y - d / 2, d, d, { fontSize: d > 1 ? 34 : 24, bold: true, align: "center", color: C.text1 });
  });
  txt(s, "r13before", "Before: bonds in the old molecules", 0.8, 4.35, 5.5, 0.5, { fontSize: 18, color: C.background2, align: "left" });
  txt(s, "r13after", "After: new bonds, new molecules", 7.0, 4.35, 5.6, 0.5, { fontSize: 18, bold: true, color: C.accent3, align: "right" });
  txt(s, "r13eq", "2 H_2  +  O_2   →   2 H_2O", 0.6, 5.15, 12.1, 1.0, { fontSize: 54, bold: true, align: "center" });
  txt(s, "r13cap", "Same atoms in. Same atoms out. New partners.", 0.6, 6.3, 12.1, 0.6, { fontSize: 26, bold: true, align: "center", color: C.accent3 });
  click("fade", ["r13before"], { dur: 500 });
  click("fade", ["r13after"], { dur: 500 });
  atomsR.forEach(([id, [x, y]]) => {
    withp("move", [`r13${id}`, `r13${id}t`], { dur: 1800, dx: (targets[id][0] - x) / SW, dy: (targets[id][1] - y) / SH });
  });
  click("fade", ["r13cap"], { dur: 700 });
  note(`
And here's the cool thing: bonds aren't forever. Break the old bonds, make new ones: that's a chemical reaction. [CLICK] Here's hydrogen gas and oxygen gas, each one a pair of atoms stuck together. [CLICK] Watch: the bonds break, the atoms shuffle, and new bonds form. Two waters.

[CLICK] Look at what didn't change: the same six atoms that went in came out. Nothing is created, nothing is destroyed, just rearranged. Chemistry is atom accounting, and the best part is that you can actually balance the books.

And remember the energy valley? When the new bonds sit lower in energy than the old ones, the extra energy comes out. And that is how fire works.
`, "Chemical reactions: atoms swap partners");

  // ============================================================ 20. old 14
  s = newSlide("DEMO", "Reactions", "Methane Bubbles", "title");
  s.addImage({ path: IMG("flame_demo.gif"), x: 8.9, y: 0.4, w: 4.2, h: 7.0, objectName: "demoflame" });
  chip(s, "demotag", "DEMO TIME", 0.7, 0.85, 2.0, 0.55, HEX.orange, C.text1, { fontSize: 20, charSpacing: 4 });
  txt(s, "d14fuel", "CH_4  +  2 O_2", 0.7, 2.95, 7.9, 0.95, { fontSize: 50, bold: true, color: C.accent3 });
  txt(s, "d14fuel2", "methane (fuel)  +  oxygen from the air", 0.7, 4.0, 7.9, 0.45, { fontSize: 20, color: C.background2 });
  txt(s, "d14arrow", "→  CO_2  +  2 H_2O", 0.7, 4.6, 7.9, 0.95, { fontSize: 50, bold: true });
  txt(s, "d14en", "+  ENERGY", 0.7, 5.6, 7.9, 0.95, { fontSize: 60, bold: true, color: C.accent2 });
  txt(s, "d14note", "Fuel + oxygen: new bonds form, the energy valley is deeper, the energy escapes as light and heat.", 0.7, 6.55, 7.9, 0.7, { fontSize: 16, color: C.background2, valign: "top" });
  auto("fade", "demotag", { dur: 600 });
  click("fade", ["d14fuel", "d14fuel2"], { dur: 600 });
  click("fade", ["d14arrow"], { dur: 600 });
  click("zoom", ["d14en"], { dur: 600 });
  withp("fade", ["d14note"], { dur: 700, delay: 0.5 });
  after("pulse", ["d14en"], { dur: 500 });
  note(`
Okay, I think we've earned a little fire. [CLICK] The fuel is methane, the main ingredient in natural gas: one carbon with four hydrogens. [CLICK] Methane plus oxygen from the air gives carbon dioxide and water. That's it. That's what burning IS: atoms swapping partners. [CLICK] And because the new bonds are lower in energy, all that energy comes out as light and heat.

DEMO: methane soap bubbles on my hand. The bubbles are filled with methane, they float up and away, they burn off in an instant, and the water in the soap film soaks up a lot of the heat. That's why it's not the same as just holding a flame to your skin.

(Teacher note: follow your school's safety rules. Hands wet with the soap solution, jewelry off, hair tied back, sleeves clear, gas supply well away from the flame, safety glasses and a spotter, and keep the class back. Run the demo at the speed you're comfortable with, then CLICK past it when you're done.)
`, "DEMO: methane bubbles", { demo: true });

  // ============================================================ 21. old 15
  pres.addSection({ title: "Counting and Amounts" });
  s = newSlide("CONTENT", "Counting and Amounts", "Atoms are too small to count one by one");
  txt(s, "m15a", "So chemists count in a really big bunch called…", 0.6, 1.45, 12.1, 0.55, { fontSize: 22, align: "center", color: C.background2 });
  txt(s, "m15mole", "1 MOLE", 0.6, 2.0, 12.1, 1.3, { fontSize: 80, bold: true, align: "center", color: C.accent3 });
  txt(s, "m15num", "602,214,076,000,000,000,000,000", 0.6, 3.3, 12.1, 0.9, { fontSize: 50, bold: true, align: "center", color: C.accent1 });
  txt(s, "m15unit", "particles (6.02 × 10^23)", 0.6, 4.15, 12.1, 0.5, { fontSize: 22, align: "center", color: C.background2 });
  const mCards = [["hourglass", "A mole of seconds", "about 19 quadrillion years"], ["drop", "A mole of water", "about 18 grams, one big mouthful"], ["scale", "How we count it", "we weigh it on a balance"]];
  mCards.forEach(([k, h, b], i) => {
    const x = 0.6 + i * 4.1;
    card(s, `m15c${i}`, x, 4.95, 3.9, 1.95);
    icon(s, `m15i${i}`, k, x + 0.25, 5.45, 0.9);
    txt(s, `m15t${i}`, P([[h, { fontSize: 22, bold: true }], [b, { fontSize: 18, color: C.background2 }]]), x + 1.35, 5.05, 2.45, 1.75);
  });
  click("fade", ["m15a"], { dur: 500 });
  withp("zoom", ["m15mole"], { dur: 600, delay: 0.3 });
  click("wipeleft", ["m15num"], { dur: 1600 });
  withp("fade", ["m15unit"], { dur: 600, delay: 1.0 });
  mCards.forEach((_, i) => { click("zoom", [`m15c${i}`], { dur: 450 }); withp("zoom", [`m15i${i}`, `m15t${i}`], { dur: 450 }); });
  note(`
A reaction is atoms swapping partners, so the next question is obvious: how MANY atoms? And atoms are crazy small, so you can't count them one at a time. Chemists do what bakers do with eggs: we count in a big bunch. [CLICK] The bunch is called a mole. [CLICK] It's six hundred two sextillion. Or, 6.02 times ten to the twenty-third. Just a ridiculous number.

[CLICK] Just so you get a feel: a mole of seconds is about nineteen quadrillion years. That is over a million times the age of the universe. [CLICK] A mole of water molecules is about 18 grams: one big mouthful. [CLICK] And that's the trick: the number is huge, but we don't count, we weigh. The mass on a balance tells us how many atoms we have.

No, not the animal. No, not the guacamole. Well, a little bit the guacamole: there's a national Mole Day every October 23rd, at 6:02 in the morning. Because 6.02 and 10/23. Chemistry teachers are very proud of this joke.
`, "The mole");

  // ============================================================ 22. old 16
  s = newSlide("CONTENT", "Counting and Amounts", "Reactions are recipes");
  const gx = (n) => n;
  const grahamH = (name, x, y) => { shp(s, ST.roundRect, name, x, y, 1.25, 1.25, { fill: "D9A55B", rectRadius: 0.1, line: { color: "A9742A", width: 2 } }); };
  grahamH("g1", 0.7, 2.35); grahamH("g2", 2.1, 2.35);
  txt(s, "g12", "2 graham", 0.7, 3.7, 2.65, 0.5, { fontSize: 18, bold: true, align: "center" });
  shp(s, ST.roundRect, "ch", 4.35, 2.55, 1.45, 0.9, { fill: "6B3A1C", rectRadius: 0.08, line: { color: "3F200D", width: 2 } });
  txt(s, "cht", "1 chocolate", 4.05, 3.7, 2.05, 0.5, { fontSize: 18, bold: true, align: "center" });
  shp(s, ST.roundRect, "mm", 6.7, 2.55, 1.15, 0.9, { fill: "F8F8FF", rectRadius: 0.3, line: { color: "C9D2FF", width: 2 } });
  txt(s, "mmt", "1 marshmallow", 6.1, 3.7, 2.35, 0.5, { fontSize: 18, bold: true, align: "center" });
  txt(s, "p1", "+", 3.45, 2.55, 0.8, 0.9, { fontSize: 44, bold: true, align: "center" });
  txt(s, "p2", "+", 5.8, 2.55, 0.8, 0.9, { fontSize: 44, bold: true, align: "center" });
  shp(s, ST.rightArrow, "arr16", 8.5, 2.7, 1.2, 0.6, { fill: C.accent3 });
  shp(s, ST.roundRect, "sm1", 10.3, 3.35, 1.8, 0.45, { fill: "D9A55B", rectRadius: 0.08, line: { color: "A9742A", width: 2 } });
  shp(s, ST.roundRect, "sm2", 10.35, 2.95, 1.7, 0.4, { fill: "F8F8FF", rectRadius: 0.2, line: { color: "C9D2FF", width: 2 } });
  shp(s, ST.roundRect, "sm3", 10.4, 2.6, 1.6, 0.35, { fill: "6B3A1C", rectRadius: 0.06, line: { color: "3F200D", width: 2 } });
  shp(s, ST.roundRect, "sm4", 10.3, 2.2, 1.8, 0.4, { fill: "D9A55B", rectRadius: 0.08, line: { color: "A9742A", width: 2 } });
  txt(s, "smt", "1 s'more", 10.0, 3.9, 2.4, 0.5, { fontSize: 18, bold: true, align: "center" });
  txt(s, "s16lim", "Only 3 marshmallows? You can only make 3 s'mores.", 0.6, 4.85, 12.1, 0.7, { fontSize: 30, bold: true, align: "center", color: C.accent3 });
  txt(s, "s16lim2", "The ingredient you run out of first limits the whole reaction.", 0.6, 5.55, 12.1, 0.55, { fontSize: 22, align: "center", color: C.background2 });
  txt(s, "s16use", "Medicines, fertilizer, fuel, food: everything is made from a recipe like this.", 0.6, 6.4, 12.1, 0.6, { fontSize: 22, align: "center", color: HEX.cyan });
  click("zoom", ["g1", "g2", "g12"], { dur: 400, stagger: 0.15 });
  withp("zoom", ["p1", "ch", "cht"], { dur: 400, delay: 0.35 });
  withp("zoom", ["p2", "mm", "mmt"], { dur: 400, delay: 0.7 });
  click("zoom", ["arr16"], { dur: 400 });
  withp("zoom", ["sm1", "sm2", "sm3", "sm4", "smt"], { dur: 450, stagger: 0.12, delay: 0.3 });
  click("fade", ["s16lim", "s16lim2"], { dur: 600, stagger: 0.3 });
  click("fade", ["s16use"], { dur: 600 });
  note(`
Once you can count atoms, you can write recipes. Here's another way to see a reaction: it's a recipe. [CLICK] A s'more takes two graham crackers, one chocolate, one marshmallow. [CLICK] Combine them in exactly those amounts and you get one s'more.

The math of recipes is called stoichiometry, which is a fun word to say five times fast. It answers questions like: if I have this much of each ingredient, how much product can I make? [CLICK] If you have a hundred graham crackers and only three marshmallows, you make three s'mores. The marshmallow runs out first and shuts the whole thing down. Chemists call that the limiting reactant. [CLICK] Companies use this exact thinking to make medicine, fertilizer, and fuel without wasting a drop.

At my house, the chocolate is always the limiting reactant.
`, "Reactions are recipes (stoichiometry)");

  // ============================================================ 23. old 19
  pres.addSection({ title: "Energy and Change" });
  s = newSlide("CONTENT", "Energy and Change", "Every reaction moves energy");
  const exo = META.profile_exo, endo = META.profile_endo;
  const pw = 5.6, ph = pw * exo.h / exo.w, py = 2.6;
  [["EXOTHERMIC", "Energy OUT: fire, hand warmers", HEX.orange, "profile_exo", exo, 0.7, "fire", true], ["ENDOTHERMIC", "Energy IN: cold packs, cooking", HEX.cyan, "profile_endo", endo, 7.0, "snow", false]].forEach(([nm, sub, col, file, m, px, ik, isExo], i) => {
    card(s, `t19card${i}`, px - 0.25, 1.6, 6.1, 5.1, { fill: "10173F" });
    txt(s, `t19h${i}`, P([[nm, { fontSize: 28, bold: true, color: col }], [sub, { fontSize: 18 }]]), px, 1.7, 5.6, 0.95, { align: "center", valign: "top" });
    s.addImage({ path: IMG(file + ".png"), x: px, y: py, w: pw, h: ph, objectName: `t19img${i}` });
    txt(s, `t19r${i}`, "reactants", px + m.x_react * pw - 0.7, py + (isExo ? m.y_start : m.y_start) * ph - 0.5, 1.4, 0.4, { fontSize: 15, bold: true, align: "center", color: HEX.lav });
    txt(s, `t19p${i}`, "products", px + m.x_right * pw - 0.7, py + m.y_end * ph + (isExo ? 0.12 : -0.5), 1.4, 0.4, { fontSize: 15, bold: true, align: "center", color: HEX.lav });
    const ytop = py + Math.min(m.y_start, m.y_end) * ph + 0.1, ybot = py + Math.max(m.y_start, m.y_end) * ph - 0.1;
    shp(s, isExo ? ST.downArrow : ST.upArrow, `t19a${i}`, px + m.x_peak * pw + 0.55, ytop, 0.5, ybot - ytop, { fill: col });
    txt(s, `t19e${i}`, isExo ? "energy released" : "energy absorbed", px + m.x_peak * pw + 1.1, (ytop + ybot) / 2 - 0.25, 1.6, 0.6, { fontSize: 15, bold: true, color: col, align: "left" });
    click("fade", [`t19card${i}`, `t19h${i}`, `t19img${i}`, `t19r${i}`, `t19p${i}`], { dur: 600 });
    withp("zoom", [`t19a${i}`], { dur: 500, delay: 0.5 });
    withp("fade", [`t19e${i}`], { dur: 500, delay: 0.7 });
  });
  note(`
Recipes tell us how MUCH stuff we need. But remember the energy valley? Every reaction also moves energy around, and we sort them into two types. [CLICK] Exothermic: the products end up lower in energy than the reactants, and the difference is released. Fire, hand warmers, and the glow stick you cracked at a school dance: all exothermic. [CLICK] Endothermic: the products end up higher in energy, so the reaction pulls energy in from its surroundings. That's why an instant cold pack feels cold: the reaction inside is stealing heat from your hand.

Thermodynamics is the study of all that energy bookkeeping. How much energy comes out? Which way does it go? Will the reaction even happen? And now it's time for the most energetic demo of the day.
`, "Thermodynamics: energy in and out");

  // ============================================================ 24. old 20
  s = newSlide("DEMO", "Energy and Change", "Thermite", "title");
  s.addImage({ path: IMG("flame_demo.gif"), x: 8.9, y: 0.4, w: 4.2, h: 7.0, objectName: "demoflame2" });
  chip(s, "demotag2", "DEMO TIME", 0.7, 0.85, 2.0, 0.55, HEX.orange, C.text1, { fontSize: 20, charSpacing: 4 });
  txt(s, "d20rust", "Fe_2O_3", 0.7, 2.9, 3.6, 0.95, { fontSize: 50, bold: true, color: C.accent3 });
  txt(s, "d20rustl", "rust", 0.7, 3.8, 3.6, 0.4, { fontSize: 18, color: C.background2 });
  txt(s, "d20plus", "+  2 Al", 3.5, 2.9, 3.0, 0.95, { fontSize: 50, bold: true, color: C.accent3 });
  txt(s, "d20all", "aluminum foil", 3.7, 3.8, 3.0, 0.4, { fontSize: 18, color: C.background2 });
  txt(s, "d20out", "→  Al_2O_3  +  2 Fe", 0.7, 4.5, 7.9, 0.95, { fontSize: 50, bold: true });
  txt(s, "d20big", "MOLTEN IRON", 0.7, 5.5, 7.9, 0.95, { fontSize: 56, bold: true, color: C.accent2 });
  txt(s, "d20why", "Aluminum grabs oxygen away from the iron. Stronger new bonds, so a huge release of energy.", 0.7, 6.5, 7.9, 0.75, { fontSize: 18, color: C.background2, valign: "top" });
  auto("fade", "demotag2", { dur: 600 });
  click("fade", ["d20rust", "d20rustl", "d20plus", "d20all"], { dur: 600, stagger: 0.25 });
  click("fade", ["d20out"], { dur: 600 });
  click("zoom", ["d20big"], { dur: 600 });
  withp("fade", ["d20why"], { dur: 700, delay: 0.5 });
  after("pulse", ["d20big"], { dur: 500 });
  note(`
Remember that energy valley, and the idea that some reactions drop a LOT of energy? [CLICK] Here's the ultimate example. Rust, which is iron oxide, plus aluminum. [CLICK] Aluminum wants oxygen even more than iron does, so it rips the oxygen off the iron and makes aluminum oxide, with much stronger bonds. [CLICK] And the energy difference is enormous: the iron comes out molten, over 2,000 degrees Celsius. That's hotter than lava.

DEMO: two rusted iron balls with aluminum foil wrapped around one. Smash them together and the impact gives the reaction its starting push. Which, by the way, is a good preview of next: reactions don't just happen on their own, they need a kick to get started.

(Teacher note: this one is a flash and a shower of sparks. Follow your school's safety rules: eye protection for everyone, students well back, on a non-flammable surface, away from anything that burns, and do a practice run first. Take as much or as little time with it as you need.)
`, "DEMO: thermite", { demo: true });

  // ============================================================ 25. FINE
  s = newSlide("CONTENT", "Energy and Change", "Exothermic reactions, in a nutshell");
  s.addImage({ path: IMG("flame_demo.gif"), x: 2.3, y: 2.7, w: 2.4, h: 4.0, objectName: "fine_f1" });
  s.addImage({ path: IMG("flame_demo.gif"), x: 8.6, y: 2.7, w: 2.4, h: 4.0, objectName: "fine_f2" });
  s.addImage({ path: IMG("mascot_fine.png"), x: 4.8, y: 3.1, w: 3.7, h: 3.7, objectName: "fine_m" });
  speech(s, "fine_b", "This is fine.", 5.3, 1.55, 3.1, 1.0, { fontSize: 30 });
  txt(s, "fine_cap", "(It was not fine. Goggles, please.)", 0.6, 6.75, 12.1, 0.5, { fontSize: 24, bold: true, align: "center", color: C.accent3 });
  click("fade", ["fine_f1", "fine_f2"], { dur: 700 });
  withp("zoom", ["fine_m"], { dur: 500, delay: 0.4 });
  click("zoom", ["fine_b"], { dur: 450 });
  click("fade", ["fine_cap"], { dur: 600 });
  note(`
So what does an exothermic reaction look like from the chemicals' point of view? [CLICK] Here's an atom, sitting in a room where a LOT of heat is being released all around it. [CLICK] "This is fine." [CLICK] It is not fine. That's why we wear goggles. And it's why the next two questions matter: how fast does a reaction go, and how far does it go?
`, "Exothermic: this is fine", { });

  // ============================================================ 26. old 21
  s = newSlide("CONTENT", "Energy and Change", "How fast? How far?");
  card(s, "k21card0", 0.45, 1.5, 6.3, 5.2, { fill: "10173F" });
  txt(s, "k21h0", P([["HOW FAST?", { fontSize: 28, bold: true, color: HEX.yellow }], ["Even a good reaction needs a push to start", { fontSize: 18 }]]), 0.7, 1.55, 5.8, 0.95, { align: "center", valign: "top" });
  const kx = 0.75, kw = 5.7, kh = kw * exo.h / exo.w, ky = 2.7;
  s.addImage({ path: IMG("profile_exo.png"), x: kx, y: ky, w: kw, h: kh, objectName: "k21img" });
  const kpx = kx + exo.x_peak * kw;
  shp(s, ST.upArrow, "k21ea", kpx - 1.15, ky + exo.y_peak * kh, 0.4, (exo.y_start - exo.y_peak) * kh, { fill: HEX.yellow });
  txt(s, "k21ea1", "activation\nenergy", kx + 0.55, ky + exo.y_peak * kh + 0.05, 1.15, 0.8, { fontSize: 16, bold: true, color: HEX.yellow, align: "right", valign: "top" });
  txt(s, "k21ea2", "the push to get started", kx + 0.55, ky + exo.y_start * kh + 0.3, 2.6, 0.5, { fontSize: 16, color: HEX.lav, align: "left", valign: "top" });
  card(s, "k21card1", 6.95, 1.5, 5.95, 5.2, { fill: "10173F" });
  txt(s, "k21h1", P([["HOW FAR?", { fontSize: 28, bold: true, color: HEX.cyan }], ["Many reactions run both directions", { fontSize: 18 }]]), 7.2, 1.55, 5.45, 0.95, { align: "center", valign: "top" });
  shp(s, ST.ellipse, "k21A", 7.55, 3.1, 1.5, 1.5, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 12) });
  txt(s, "k21At", "A", 7.55, 3.1, 1.5, 1.5, { fontSize: 40, bold: true, align: "center", color: C.text1 });
  shp(s, ST.ellipse, "k21B", 11.0, 3.1, 1.5, 1.5, { fill: HEX.green, shadow: glowShadow(HEX.green, 12) });
  txt(s, "k21Bt", "B", 11.0, 3.1, 1.5, 1.5, { fontSize: 40, bold: true, align: "center", color: C.text1 });
  shp(s, ST.rightArrow, "k21r", 9.3, 3.2, 1.45, 0.55, { fill: C.accent3 });
  shp(s, ST.leftArrow, "k21l", 9.3, 3.95, 1.45, 0.55, { fill: C.accent3 });
  txt(s, "k21eq", P([["Forward rate = reverse rate", { fontSize: 22, bold: true }], ["It looks calm. It is not.", { fontSize: 20, color: C.background2 }]]), 7.2, 5.0, 5.5, 1.5, { align: "center", valign: "top" });
  click("fade", ["k21card0", "k21h0", "k21img"], { dur: 600 });
  click("zoom", ["k21ea"], { dur: 500 });
  withp("fade", ["k21ea1", "k21ea2"], { dur: 600, delay: 0.3 });
  for (let i = 0; i < 3; i++) {
    shp(s, ST.ellipse, `k21f${i}`, 9.1, 3.38, 0.2, 0.2, { fill: HEX.pink });
    shp(s, ST.ellipse, `k21r${i}`, 10.75, 4.13, 0.2, 0.2, { fill: HEX.green });
  }
  click("fade", ["k21card1", "k21h1", "k21A", "k21At", "k21B", "k21Bt", "k21f0", "k21f1", "k21f2", "k21r0", "k21r1", "k21r2"], { dur: 600 });
  for (let i = 0; i < 3; i++) {
    withp("loop1", [`k21f${i}`], { dur: 1500, dx: 1.65 / SW, dy: 0, delay: 0.7 + i * 0.5 });
    withp("loop1", [`k21r${i}`], { dur: 1500, dx: -1.65 / SW, dy: 0, delay: 0.9 + i * 0.5 });
  }
  withp("zoom", ["k21r", "k21l"], { dur: 500, delay: 0.5 });
  click("fade", ["k21eq"], { dur: 700 });
  note(`
Two more big questions, both of which you can ask about any reaction. First: how FAST? [CLICK] Even a reaction that releases a ton of energy has to climb a hill first. [CLICK] That hill is called the activation energy. It's why paper doesn't burst into flames on its own: it's ready to release energy, but it needs a match to get over the hump. Same idea as our thermite demo: the smash got it over the hill.

Second: how FAR does the reaction go? [CLICK] A lot of reactions can run both ways: A turns into B and B turns back into A. [CLICK] Eventually the two directions run at the same speed and nothing seems to change anymore. It looks calm but nothing stopped: it's busy in both directions. Like a crowded two-way hallway between classes: everybody's moving, but the crowd stays the same size. That's equilibrium. And chemists can nudge it to get more of the product they want.
`, "Kinetics and equilibrium");

  // ============================================================ 27. old 22
  s = newSlide("CONTENT", "Energy and Change", "Acids and bases: a tiny particle on the move");
  const bar = { x: 0.7, y: 3.35, w: 11.9, h: 0.84 };
  s.addImage({ path: IMG("phbar.png"), x: bar.x, y: bar.y, w: bar.w, h: bar.h, objectName: "ph22bar" });
  txt(s, "ph22lo", "0", bar.x, bar.y + bar.h + 0.05, 0.4, 0.35, { fontSize: 14, bold: true, color: HEX.muted, align: "left" });
  txt(s, "ph22hi", "14", bar.x + bar.w - 0.5, bar.y + bar.h + 0.05, 0.5, 0.35, { fontSize: 14, bold: true, color: HEX.muted, align: "right" });
  txt(s, "ph22ac", "← more acidic", 0.7, 1.4, 3.0, 0.45, { fontSize: 18, bold: true, color: HEX.pink, align: "left" });
  txt(s, "ph22ba", "more basic →", 9.6, 1.4, 3.0, 0.45, { fontSize: 18, bold: true, color: HEX.violet, align: "right" });
  const phs = [[1, "Stomach acid", true], [3, "Vinegar", false], [5, "Coffee", true], [7, "Pure water", false], [8.5, "Baking soda", true], [10.5, "Soap", false], [12.5, "Bleach", true]];
  phs.forEach(([p, name, up], i) => {
    const x = bar.x + (p / 14) * bar.w;
    const yb = up ? bar.y - 1.3 : bar.y + bar.h + 0.45;
    ln(s, `ph22t${i}`, x, up ? bar.y - 0.5 : bar.y + bar.h, x, up ? bar.y : bar.y + bar.h + 0.45, { color: C.background1, w: 2 });
    txt(s, `ph22n${i}`, P([[name, { fontSize: 18, bold: true }], [`pH ${p}`, { fontSize: 16, color: HEX.yellow }]]), x - 0.85, up ? bar.y - 1.35 : bar.y + bar.h + 0.5, 1.7, 0.85, { align: "center", valign: up ? "bottom" : "top" });
  });
  txt(s, "ph22cap", "pH counts the H^+ ions floating around: tiny protons hopping between molecules.", 0.6, 6.2, 12.1, 0.8, { fontSize: 24, bold: true, align: "center", color: C.accent3 });
  click("wipeleft", ["ph22bar"], { dur: 1000 });
  withp("fade", ["ph22lo", "ph22hi", "ph22ac", "ph22ba"], { dur: 600, delay: 0.4 });
  phs.forEach((_, i) => { after("fade", [`ph22t${i}`, `ph22n${i}`], { dur: 400 }); });
  click("fade", ["ph22cap"], { dur: 700 });
  note(`
That "both directions" idea is happening in your kitchen right now: acids and bases. You already know some. Lemon juice and vinegar are acids, soap and baking soda are bases. [CLICK] Chemists measure it on a scale called pH, from 0 to 14. Stomach acid at the bottom, vinegar, coffee, pure water right in the middle at 7, baking soda, soap, bleach. [CLICK] And all of it comes down to one tiny particle: the hydrogen ion, H plus. It's basically just a proton, hopping from one molecule to the next. More of them floating around means more acidic.

Your stomach sits in a pH 1 to 2 acid bath all day and you're fine, because it covers itself in mucus. Nobody gives stomach mucus any credit.

So protons can hop from molecule to molecule. But protons aren't the only particles that can move. Electrons can too.
`, "Acids and bases");

  // ============================================================ 28. old 23
  s = newSlide("CONTENT", "Energy and Change", "Harnessing the energy: batteries");
  // lemon
  shp(s, ST.ellipse, "lem", 1.0, 3.7, 3.8, 2.4, { fill: "FFD23F", shadow: glowShadow("FFD23F", 16) });
  shp(s, ST.rect, "zn", 2.0, 2.55, 0.28, 2.6, { fill: "AAB4D0", line: { color: "E6ECFF", width: 1 } });
  shp(s, ST.rect, "cu", 3.5, 2.55, 0.28, 2.6, { fill: "D2814A", line: { color: "F2B58A", width: 1 } });
  txt(s, "znl", "zinc", 0.5, 2.75, 1.35, 0.4, { fontSize: 18, bold: true, align: "right", color: "C9D2FF" });
  txt(s, "cul", "copper", 3.95, 2.75, 1.4, 0.4, { fontSize: 18, bold: true, align: "left", color: "F2B58A" });
  txt(s, "lemlab", "lemon juice (an acid)", 1.0, 6.15, 3.8, 0.4, { fontSize: 16, color: HEX.muted, align: "center" });
  // wires
  ln(s, "w1a", 2.14, 2.55, 2.14, 1.75, { color: "AAB4D0", w: 4 });
  ln(s, "w1b", 2.14, 1.75, 9.45, 1.75, { color: "AAB4D0", w: 4 });
  ln(s, "w1c", 9.45, 1.75, 9.45, 2.7, { color: "AAB4D0", w: 4 });
  ln(s, "w2a", 3.64, 2.55, 3.64, 2.3, { color: "D2814A", w: 4 });
  ln(s, "w2b", 3.64, 2.3, 6.9, 2.3, { color: "D2814A", w: 4 });
  ln(s, "w2c", 6.9, 2.3, 6.9, 5.55, { color: "D2814A", w: 4 });
  ln(s, "w2d", 6.9, 5.55, 9.45, 5.55, { color: "D2814A", w: 4 });
  ln(s, "w2e", 9.45, 5.55, 9.45, 5.0, { color: "D2814A", w: 4 });
  // bulb
  shp(s, ST.ellipse, "bulbglow", 8.15, 2.5, 2.6, 2.6, { fill: "FFE66B", tr: 55, shadow: glowShadow("FFE66B", 30) });
  shp(s, ST.ellipse, "bulb", 8.55, 2.7, 1.8, 1.8, { fill: "E8ECFF", line: { color: "AAB4D0", width: 3 } });
  shp(s, ST.rect, "bulbbase", 9.05, 4.45, 0.8, 0.55, { fill: "7F89B0" });
  txt(s, "bulbl", "light", 8.55, 5.65, 1.8, 0.4, { fontSize: 18, bold: true, align: "center", color: HEX.yellow });
  // electrons running around the wires (animated loops)
  const E = (name, x, y) => shp(s, ST.ellipse, name, x - 0.11, y - 0.11, 0.22, 0.22, { fill: HEX.cyan, shadow: glowShadow(HEX.cyan, 8) });
  [0, 1, 2].forEach((i) => { E(`el1_${i}`, 2.14 + 0.0, 1.75); });
  [0, 1, 2].forEach((i) => { E(`el2_${i}`, 6.9, 2.3); });
  txt(s, "s23cap", "A battery is a chemical reaction that pushes electrons through a wire.", 0.6, 6.7, 12.1, 0.5, { fontSize: 22, bold: true, align: "center", color: C.accent3 });
  click("fade", ["bulbglow"], { dur: 800 });
  withp("fade", ["el1_0", "el1_1", "el1_2", "el2_0", "el2_1", "el2_2"], { dur: 300 });
  [0, 1, 2].forEach((i) => {
    withp("loop1", [`el1_${i}`], { dur: 2400, dx: 7.31 / SW, dy: 0, delay: i * 0.8 });
    withp("loop1", [`el2_${i}`], { dur: 2400, dx: -3.26 / SW, dy: 0, delay: i * 0.8 });
  });
  shp(s, ST.roundRect, "ph23body", 11.15, 2.1, 1.4, 2.5, { fill: "151B4A", rectRadius: 0.2, line: { color: C.background1, width: 2.5 } });
  txt(s, "ph23txt", P([["1%", { fontSize: 34, bold: true, color: HEX.pink }], ["battery", { fontSize: 14, color: HEX.muted }]]), 11.15, 2.5, 1.4, 1.6, { align: "center" });
  txt(s, "ph23cap", "me, every afternoon", 10.7, 4.7, 2.3, 0.5, { fontSize: 16, bold: true, color: HEX.yellow, align: "center" });
  click("fade", ["s23cap", "ph23body", "ph23txt", "ph23cap"], { dur: 700 });
  withp("loop", ["ph23body", "ph23txt"], { dur: 110, dx: 0.06 / SW, dy: 0, delay: 0.8 });
  note(`
Remember the energy released when bonds form? In a fire, that energy escapes as heat and light and you can't do much with it. But what if you force the electrons to travel through a wire on their way? Then you can harness that energy. That's electricity. [CLICK] This is a lemon battery: a zinc strip and a copper strip stuck in a lemon. The zinc is happy to give up electrons, the copper is happy to take them, and the only route between them runs through the wire. So the electrons flow, and the light turns on.

[CLICK] That is every battery in your life: your phone, your laptop, an electric car. A chemical reaction pushing electrons around a circuit on purpose. Which is why your phone battery is just a very organized chemical reaction that you complain about at 1 percent.

(Honest footnote: one lemon alone is too weak for a bulb. It takes a few lemons wired together to light a small LED. The idea is the same.)
`, "Electrochemistry");

  // ============================================================ 29. old 24
  pres.addSection({ title: "Nuclear and Wrap-up" });
  s = newSlide("CONTENT", "Nuclear and Wrap-up", "…and sometimes the nucleus itself changes");
  txt(s, "n24top", "Everything so far moved electrons. The nucleus never changed.", 0.6, 1.3, 7.5, 0.8, { fontSize: 22, color: C.background2, valign: "top" });
  // 4 hydrogen nuclei -> helium
  const hpos = [[1.0, 2.5], [1.9, 2.5], [1.0, 3.4], [1.9, 3.4]];
  hpos.forEach(([x, y], i) => shp(s, ST.ellipse, `n24h${i}`, x, y, 0.75, 0.75, { fill: HEX.pink, shadow: glowShadow(HEX.pink, 10) }));
  txt(s, "n24hl", "4 hydrogen nuclei", 0.6, 4.3, 3.2, 0.5, { fontSize: 18, bold: true, align: "center" });
  shp(s, ST.rightArrow, "n24arr", 3.5, 3.1, 1.2, 0.6, { fill: C.accent3 });
  txt(s, "n24fuse", "FUSION", 3.3, 2.5, 1.6, 0.5, { fontSize: 18, bold: true, align: "center", color: HEX.yellow });
  const hep = [[5.3, 2.7, "p"], [6.1, 2.7, "n"], [5.3, 3.5, "n"], [6.1, 3.5, "p"]];
  hep.forEach(([x, y, k], i) => shp(s, ST.ellipse, `n24he${i}`, x, y, 0.75, 0.75, { fill: k === "p" ? HEX.pink : "98A2C6", shadow: glowShadow(k === "p" ? HEX.pink : "98A2C6", 8) }));
  shp(s, ST.star8, "n24flash", 4.95, 2.35, 2.3, 2.3, { fill: HEX.yellow, tr: 25 });
  txt(s, "n24hel", "1 helium nucleus", 4.5, 4.3, 3.2, 0.5, { fontSize: 18, bold: true, align: "center" });
  txt(s, "n24newel", "Change the number of protons and you change the element.", 0.6, 5.2, 7.5, 0.9, { fontSize: 26, bold: true, color: C.accent3, valign: "top" });
  txt(s, "n24alch", "Alchemists spent centuries trying to turn lead into gold. Nuclear chemistry says it is possible.", 0.6, 6.2, 7.5, 0.9, { fontSize: 18, color: C.background2, valign: "top" });
  s.addImage({ path: IMG("sun_pulse.gif"), x: 8.1, y: 1.4, w: 5.0, h: 5.0, objectName: "sun" });
  txt(s, "emc", [{ text: "E = mc", options: {} }, { text: "2", options: { superscript: true } }], 8.4, 3.25, 4.4, 1.3, { fontSize: 54, bold: true, align: "center", color: C.text1 });
  txt(s, "emccap", "a pinch of mass → a mountain of energy", 7.9, 6.5, 5.2, 0.6, { fontSize: 18, bold: true, align: "center", color: C.accent3 });
  click("zoom", ["n24h0", "n24h1", "n24h2", "n24h3", "n24hl"], { dur: 500, stagger: 0.1 });
  click("zoom", ["n24arr", "n24fuse"], { dur: 500 });
  after("zoom", ["n24flash"], { dur: 400 });
  withp("zoom", ["n24he0", "n24he1", "n24he2", "n24he3", "n24hel"], { dur: 500, delay: 0.1 });
  after("fadeout", ["n24flash"], { dur: 700 });
  click("fade", ["n24newel", "n24alch"], { dur: 700, stagger: 0.4 });
  click("zoom", ["sun"], { dur: 800 });
  withp("zoom", ["emc"], { dur: 700, delay: 0.5 });
  withp("fade", ["emccap"], { dur: 700, delay: 0.8 });
  note(`
Everything we've talked about so far was electrons: moving them, sharing them, jumping them, pushing them through wires. The nucleus, the protons, never changed. So the element never changed. A chemical reaction can't turn lead into gold.

[CLICK] But there's a whole other branch of chemistry where the nucleus itself changes. Here are four hydrogen nuclei, which are just single protons. [CLICK] Squeeze them together hard enough and they fuse into one helium nucleus. That is what's happening in the sun right now.

[CLICK] And remember the rule from way back at the beginning? The number of protons decides the element. We just changed the proton count, so we just changed the element. The alchemists spent centuries trying to turn lead into gold. It turns out nuclear chemistry says: totally possible. Just don't ask what the electric bill looks like.

[CLICK] And where does all that energy come from? A tiny bit of the mass vanishes and turns into energy, following Einstein's most famous equation. A pinch of mass, a mountain of energy. It powers the sun, and the same idea, running the other direction by splitting big nuclei, powers nuclear plants.
`, "Nuclear chemistry");

  // ============================================================ 30. old 25
  s = newSlide("CONTENT", "Nuclear and Wrap-up", "So… what is chemistry?");
  txt(s, "w25a", "Atoms, their electrons, and the energy that moves between them.", 0.6, 1.4, 12.1, 0.7, { fontSize: 30, bold: true, align: "center", color: C.accent3 });
  const topics = ["Atoms", "States of matter", "Attractions", "Bonding", "Periodic table", "Electrons", "Reactions", "Moles", "Stoichiometry", "Energy", "Speed", "Equilibrium", "Acids and bases", "Batteries", "Nuclear"];
  const row1 = topics.slice(0, 8), row2 = topics.slice(8);
  const mkRow = (arr, y, offsetIdx) => {
    const wChip = 1.43, g = 0.08; const tot = arr.length * wChip + (arr.length - 1) * g; let x = (SW - tot) / 2;
    arr.forEach((t, i) => {
      chip(s, `w25c${offsetIdx + i}`, t, x, y, wChip, 0.75, ["22D3EE", "B66DFF", "FFD23F", "5BE584", "FF7A1A", "FF4D6D"][(offsetIdx + i) % 6], C.text1, { fontSize: 14, margin: 0.03 });
      x += wChip + g;
    });
  };
  mkRow(row1, 2.4, 0); mkRow(row2, 3.3, 8);
  txt(s, "w25see", "SEE it", 0.9, 4.6, 3.8, 1.0, { fontSize: 54, bold: true, align: "center", color: HEX.cyan });
  txt(s, "w25exp", "EXPLAIN it", 4.7, 4.6, 4.0, 1.0, { fontSize: 54, bold: true, align: "center", color: HEX.yellow });
  txt(s, "w25chg", "CHANGE it", 8.7, 4.6, 3.8, 1.0, { fontSize: 54, bold: true, align: "center", color: HEX.pink });
  txt(s, "w25end", "Welcome to chemistry.", 0.6, 5.95, 12.1, 1.0, { fontSize: 48, bold: true, align: "center" });
  click("fade", ["w25a"], { dur: 700 });
  topics.forEach((_, i) => { if (i === 0) click("zoom", [`w25c${i}`], { dur: 250 }); else after("zoom", [`w25c${i}`], { dur: 220 }); });
  click("zoom", ["w25see"], { dur: 500 });
  click("zoom", ["w25exp"], { dur: 500 });
  click("zoom", ["w25chg"], { dur: 500 });
  s.addImage({ path: IMG("mascot_cool.png"), x: 0.2, y: 5.5, w: 2.0, h: 2.0, objectName: "w25m1" });
  s.addImage({ path: IMG("mascot_h.png"), x: 11.1, y: 5.5, w: 2.0, h: 2.0, objectName: "w25m2" });
  click("zoom", ["w25end"], { dur: 700 });
  withp("zoom", ["w25m1", "w25m2"], { dur: 600, delay: 0.3 });
  withp("loop", ["w25m1"], { dur: 500, dx: 0, dy: -0.3 / SH, delay: 0.9 });
  withp("loop", ["w25m2"], { dur: 640, dx: 0, dy: -0.3 / SH, delay: 0.9 });
  after("pulse", ["w25end"], { dur: 500 });
  note(`
So, what IS chemistry? [CLICK] It's atoms, their electrons, and the energy that moves between them. [CLICK] And look at how it all stacks. Atoms behave differently depending on their energy: solid, liquid, gas. What holds them together is attraction. Make that attraction strong enough and atoms bond. Which atoms bond is decided by their electrons, which is why the periodic table works. Rearrange those bonds and you get reactions. Count them: moles and recipes. Track the energy: how much, how fast, how far. Acids and bases move protons, batteries move electrons, and at the very end, the nuclei themselves. Every idea sits on top of the one before it, and each one answers a "why" about the world you already live in. That's our year.

Three verbs. [CLICK] We'll SEE things, in labs, with fire, with color changes. [CLICK] We'll EXPLAIN them, by going down to the atoms. [CLICK] And eventually you'll be able to CHANGE things: design new materials, new medicines, new ways of making energy. [CLICK] Welcome to chemistry.

Okay. Now we can do the syllabus.
`, "So what is chemistry?");

  // ---------------------------------------------------------------- write
  await pres.writeFile({ fileName: path.join(__dirname, "deck_raw.pptx") });
  await applyTheme(path.join(__dirname, "deck_raw.pptx"), THEME);
  fs.writeFileSync(path.join(__dirname, "anim.json"), JSON.stringify(ANIMS, null, 1));
  const out = SCRIPT.map((e) => Object.assign({}, e, { words: e.notes.replace(/\[CLICK\]/g, "").split(/\s+/).filter(Boolean).length }));
  fs.writeFileSync(path.join(__dirname, "script.json"), JSON.stringify(out, null, 1));
  console.log("slides:", slideNo, "words:", out.reduce((a, b) => a + b.words, 0));
}
main().catch((e) => { console.error(e); process.exit(1); });
