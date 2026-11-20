// The worksheet data model. A worksheet is pages; a page is positioned blocks (x, y, width, height in pixels at 96 dpi).
// Each kind of block is described once here (BLOCK_DEFS): its name, default size, default content and the fields
// the Inspector shows. Adding a new kind of block = one entry here + one renderer in BlockView.tsx.
import { CONSTANTS } from "./chem";

export type BlockType =
  | "header" | "text" | "question" | "mcq" | "matching" | "wordbank" | "lines" | "table"
  | "balance" | "nomen" | "molarmass" | "factor" | "lewis" | "molemap" | "periodic" | "reference" | "ions"
  | "graph" | "image" | "shape";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Props = Record<string, any>;
export type Block = { id: string; type: BlockType; x: number; y: number; w: number; h: number; props: Props; fit?: boolean };
export type Page = { blocks: Block[] };
export type Sheet = {
  paper: "letter" | "a4";
  font: "sans" | "serif";
  margin: number;
  grid: number;
  snap: boolean;
  course: string;
  pages: Page[];
};

export const PAPER = { letter: { w: 816, h: 1056 }, a4: { w: 794, h: 1123 } } as const;
export const uid = () => Math.random().toString(36).slice(2, 10);

export type Field =
  | { key: string; label: string; kind: "text" | "textarea" | "image"; hint?: string; rows?: number }
  | { key: string; label: string; kind: "number"; min?: number; max?: number; hint?: string }
  | { key: string; label: string; kind: "bool"; hint?: string }
  | { key: string; label: string; kind: "select"; options: [string, string][]; hint?: string }
  | { key: string; label: string; kind: "lines"; hint?: string; rows?: number }
  | { key: string; label: string; kind: "pairs"; cols: { key: string; label: string }[]; add: string; hint?: string }
  | { key: string; label: string; kind: "multi"; options: [string, string][]; hint?: string }
  | { key: string; label: string; kind: "grid"; hint?: string };

export type BlockDef = {
  label: string; group: "Basics" | "Chemistry" | "Visual"; hint: string;
  w: number; h: number; props: Props; fields: Field[];
};

const YES_NO: [string, string][] = [["true", "Yes"], ["false", "No"]];
void YES_NO;

export const BLOCK_DEFS: Record<BlockType, BlockDef> = {
  header: {
    label: "Title & name line", group: "Basics", hint: "Worksheet title with Name / Date / Period",
    w: 720, h: 64, props: { title: "Worksheet Title", subtitle: "", course: "", showName: true, showDate: true, showPeriod: true, rule: true },
    fields: [
      { key: "course", label: "Course (small, above title)", kind: "text" },
      { key: "title", label: "Title", kind: "text" },
      { key: "subtitle", label: "Subtitle", kind: "text" },
      { key: "showName", label: "Name line", kind: "bool" }, { key: "showDate", label: "Date line", kind: "bool" },
      { key: "showPeriod", label: "Period line", kind: "bool" }, { key: "rule", label: "Line under title", kind: "bool" },
    ],
  },
  text: {
    label: "Text", group: "Basics", hint: "Instructions or notes. H2O becomes H₂O automatically",
    w: 720, h: 48, props: { text: "Directions: ", size: 13, bold: false, italic: false, align: "left", boxed: false, auto: true },
    fields: [
      { key: "text", label: "Text", kind: "textarea", rows: 5, hint: "Type formulas normally: H2SO4, Ca^2+, ->, <=>. Use x_{2} and x^{2} for other sub/superscripts." },
      { key: "size", label: "Font size", kind: "number", min: 8, max: 40 },
      { key: "bold", label: "Bold", kind: "bool" }, { key: "italic", label: "Italic", kind: "bool" },
      { key: "align", label: "Align", kind: "select", options: [["left", "Left"], ["center", "Center"], ["right", "Right"]] },
      { key: "boxed", label: "Draw a box around it", kind: "bool" },
      { key: "auto", label: "Auto subscripts (H2O → H₂O)", kind: "bool" },
    ],
  },
  question: {
    label: "Question", group: "Basics", hint: "Numbered question with answer lines or work space",
    w: 720, h: 120, props: { num: "1", text: "Question text", pts: "", lines: 2, spacing: 26, workH: 0, answer: "", auto: true },
    fields: [
      { key: "num", label: "Number", kind: "text" }, { key: "text", label: "Question", kind: "textarea", rows: 4 },
      { key: "pts", label: "Points (optional)", kind: "text" },
      { key: "lines", label: "Answer lines", kind: "number", min: 0, max: 20 },
      { key: "spacing", label: "Line spacing (px)", kind: "number", min: 16, max: 60 },
      { key: "workH", label: "'Show your work' box height (0 = none)", kind: "number", min: 0, max: 600 },
      { key: "answer", label: "Answer (shows on the key)", kind: "textarea", rows: 3 },
      { key: "auto", label: "Auto subscripts", kind: "bool" },
    ],
  },
  mcq: {
    label: "Multiple choice", group: "Basics", hint: "Question with lettered choices",
    w: 720, h: 130, props: { num: "1", text: "Question text", choices: ["Choice A", "Choice B", "Choice C", "Choice D"], answer: "A", cols: 1, auto: true },
    fields: [
      { key: "num", label: "Number", kind: "text" }, { key: "text", label: "Question", kind: "textarea", rows: 3 },
      { key: "choices", label: "Choices (one per line)", kind: "lines", rows: 5 },
      { key: "answer", label: "Correct letter (key)", kind: "text" },
      { key: "cols", label: "Choice columns", kind: "select", options: [["1", "1"], ["2", "2"], ["4", "4 (across)"]] },
      { key: "auto", label: "Auto subscripts", kind: "bool" },
    ],
  },
  matching: {
    label: "Matching", group: "Basics", hint: "Terms on the left, lettered choices on the right",
    w: 720, h: 170, props: { title: "Match each term with its description.", left: ["Term 1", "Term 2", "Term 3"], right: ["Description A", "Description B", "Description C"], answers: "A,B,C" },
    fields: [
      { key: "title", label: "Directions", kind: "text" },
      { key: "left", label: "Left column (one per line)", kind: "lines", rows: 5 },
      { key: "right", label: "Right column (one per line)", kind: "lines", rows: 5 },
      { key: "answers", label: "Answer letters, in order (key)", kind: "text", hint: "Example: C,A,B" },
    ],
  },
  wordbank: {
    label: "Word bank", group: "Basics", hint: "Boxed list of words to use",
    w: 720, h: 70, props: { title: "Word bank", words: ["atom", "molecule", "ion"], cols: 5 },
    fields: [
      { key: "title", label: "Title", kind: "text" }, { key: "words", label: "Words (one per line)", kind: "lines", rows: 6 },
      { key: "cols", label: "Columns", kind: "number", min: 1, max: 8 },
    ],
  },
  lines: {
    label: "Blank lines", group: "Basics", hint: "Ruled writing lines",
    w: 720, h: 130, props: { count: 5, spacing: 26, label: "" },
    fields: [
      { key: "label", label: "Label (optional)", kind: "text" },
      { key: "count", label: "Number of lines", kind: "number", min: 1, max: 40 },
      { key: "spacing", label: "Line spacing (px)", kind: "number", min: 16, max: 60 },
    ],
  },
  table: {
    label: "Table", group: "Basics", hint: "Data table, any size. Fill cells or leave blank",
    w: 720, h: 140, props: { rows: 4, cols: 3, headerRow: true, rowH: 32, cells: [["Trial", "Mass (g)", "Volume (mL)"], ["1", "", ""], ["2", "", ""], ["3", "", ""]], key: [], auto: true, title: "" },
    fields: [
      { key: "title", label: "Caption (optional)", kind: "text" },
      { key: "rows", label: "Rows", kind: "number", min: 1, max: 30 }, { key: "cols", label: "Columns", kind: "number", min: 1, max: 10 },
      { key: "rowH", label: "Row height (px)", kind: "number", min: 20, max: 120 },
      { key: "headerRow", label: "Shaded header row", kind: "bool" },
      { key: "auto", label: "Auto subscripts", kind: "bool" },
      { key: "cells", label: "Cells", kind: "grid", hint: "Click a cell to type. Use the Key tab to add answers that only show on the answer key." },
    ],
  },
  balance: {
    label: "Balance equations", group: "Chemistry", hint: "Equations with coefficient boxes",
    w: 720, h: 190, props: { title: "Balance each equation by writing coefficients in the boxes.", size: 16, items: [{ eq: "H2 + O2 -> H2O", ans: "2,1,2" }, { eq: "N2 + H2 -> NH3", ans: "1,3,2" }, { eq: "Fe + O2 -> Fe2O3", ans: "4,3,2" }], startLetter: true },
    fields: [
      { key: "title", label: "Directions", kind: "text" },
      { key: "items", label: "Equations", kind: "pairs", cols: [{ key: "eq", label: "Unbalanced equation" }, { key: "ans", label: "Coefficients (key)" }], add: "Add equation", hint: "Write H2 + O2 -> H2O. Key coefficients in order, like 2,1,2." },
      { key: "size", label: "Font size", kind: "number", min: 10, max: 28 },
      { key: "startLetter", label: "Label a, b, c…", kind: "bool" },
    ],
  },
  nomen: {
    label: "Names & formulas", group: "Chemistry", hint: "Name ↔ formula practice table",
    w: 720, h: 200, props: { title: "Write the missing name or formula.", mode: "alternate", rowH: 32, items: [{ formula: "NaCl", name: "sodium chloride" }, { formula: "CaCO3", name: "calcium carbonate" }, { formula: "Mg(OH)2", name: "magnesium hydroxide" }, { formula: "Al2O3", name: "aluminum oxide" }] },
    fields: [
      { key: "title", label: "Directions", kind: "text" },
      { key: "mode", label: "Blank out", kind: "select", options: [["name", "The name (write the name)"], ["formula", "The formula (write the formula)"], ["alternate", "Alternate rows"]] },
      { key: "items", label: "Compounds", kind: "pairs", cols: [{ key: "formula", label: "Formula" }, { key: "name", label: "Name" }], add: "Add compound" },
      { key: "rowH", label: "Row height (px)", kind: "number", min: 22, max: 80 },
    ],
  },
  molarmass: {
    label: "Molar mass practice", group: "Chemistry", hint: "Compounds with work space; the key is computed for you",
    w: 720, h: 200, props: { title: "Calculate the molar mass of each compound.", compounds: ["NaCl", "H2O", "Ca(OH)2", "Al2(SO4)3"], decimals: 2, workWidth: 300, rowH: 44 },
    fields: [
      { key: "title", label: "Directions", kind: "text" },
      { key: "compounds", label: "Compounds (one per line)", kind: "lines", rows: 6, hint: "Hydrates work: CuSO4·5H2O" },
      { key: "decimals", label: "Decimal places in the key", kind: "number", min: 0, max: 4 },
      { key: "rowH", label: "Row height (px)", kind: "number", min: 28, max: 120 },
    ],
  },
  factor: {
    label: "Dimensional analysis", group: "Chemistry", hint: "Factor-label setup with blank fractions",
    w: 720, h: 130, props: { num: "1", problem: "How many moles are in 25.0 g of NaCl?", given: "25.0 g NaCl", slots: 2, captions: ["", ""], target: "mol NaCl", answer: "0.428 mol NaCl", auto: true },
    fields: [
      { key: "num", label: "Number", kind: "text" }, { key: "problem", label: "Problem", kind: "textarea", rows: 3 },
      { key: "given", label: "Given (start)", kind: "text" },
      { key: "slots", label: "Number of conversion fractions", kind: "number", min: 1, max: 5 },
      { key: "captions", label: "Fraction hints (one per line, optional)", kind: "lines", rows: 4, hint: "Example: molar mass" },
      { key: "target", label: "Answer units", kind: "text" },
      { key: "answer", label: "Answer (key)", kind: "text" },
      { key: "auto", label: "Auto subscripts", kind: "bool" },
    ],
  },
  lewis: {
    label: "Draw structures", group: "Chemistry", hint: "Boxes to draw Lewis structures",
    w: 720, h: 150, props: { title: "Draw the Lewis structure for each molecule.", items: ["H2O", "CO2", "NH3", "CH4"], cols: 4, boxH: 120 },
    fields: [
      { key: "title", label: "Directions", kind: "text" }, { key: "items", label: "Molecules (one per line)", kind: "lines", rows: 6 },
      { key: "cols", label: "Boxes per row", kind: "number", min: 1, max: 6 }, { key: "boxH", label: "Box height (px)", kind: "number", min: 60, max: 400 },
    ],
  },
  molemap: {
    label: "Mole map", group: "Chemistry", hint: "Particles ↔ moles ↔ grams ↔ liters diagram",
    w: 720, h: 240, props: { title: "The Mole Map" }, fields: [{ key: "title", label: "Title", kind: "text" }],
  },
  periodic: {
    label: "Periodic table", group: "Chemistry", hint: "Full colored periodic table",
    w: 720, h: 330, props: { showMass: true, showNumber: true, showName: false, blankSymbols: false, color: true },
    fields: [
      { key: "color", label: "Color by group", kind: "bool" }, { key: "showNumber", label: "Atomic number", kind: "bool" },
      { key: "showMass", label: "Atomic mass", kind: "bool" }, { key: "showName", label: "Element name", kind: "bool" },
      { key: "blankSymbols", label: "Hide symbols (students fill in)", kind: "bool" },
    ],
  },
  reference: {
    label: "Constants & formulas", group: "Chemistry", hint: "Pick the formulas students may use",
    w: 720, h: 130, props: { title: "Reference", items: ["NA", "molarvol", "R", "gaslaw", "kelvin"], cols: 1 },
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "items", label: "Include", kind: "multi", options: CONSTANTS.map((c) => [c.id, c.label]) },
      { key: "cols", label: "Columns", kind: "select", options: [["1", "1"], ["2", "2"]] },
    ],
  },
  ions: {
    label: "Polyatomic ions", group: "Chemistry", hint: "Reference chart of common ions",
    w: 720, h: 220, props: { title: "Common polyatomic ions", set: "all", cols: 3, size: 12 },
    fields: [
      { key: "title", label: "Title", kind: "text" },
      { key: "set", label: "Show", kind: "select", options: [["all", "All"], ["cations", "Cations only"], ["anions", "Anions only"]] },
      { key: "cols", label: "Columns", kind: "number", min: 1, max: 4 }, { key: "size", label: "Font size", kind: "number", min: 8, max: 18 },
    ],
  },
  graph: {
    label: "Graph paper", group: "Visual", hint: "Labeled grid for plotting",
    w: 480, h: 360, props: { title: "", xLabel: "x-axis", yLabel: "y-axis", cols: 20, rows: 15, major: 5 },
    fields: [
      { key: "title", label: "Graph title", kind: "text" }, { key: "xLabel", label: "x-axis label", kind: "text" }, { key: "yLabel", label: "y-axis label", kind: "text" },
      { key: "cols", label: "Columns", kind: "number", min: 2, max: 60 }, { key: "rows", label: "Rows", kind: "number", min: 2, max: 60 },
      { key: "major", label: "Dark line every", kind: "number", min: 1, max: 20 },
    ],
  },
  image: {
    label: "Image", group: "Visual", hint: "Add a picture or diagram",
    w: 300, h: 200, props: { src: "", fit: "contain", caption: "" },
    fields: [
      { key: "src", label: "Picture", kind: "image" }, { key: "caption", label: "Caption", kind: "text" },
      { key: "fit", label: "Fit", kind: "select", options: [["contain", "Fit inside"], ["cover", "Fill and crop"]] },
    ],
  },
  shape: {
    label: "Line / box", group: "Visual", hint: "Divider line or outlined box",
    w: 720, h: 2, props: { kind: "line", thick: 1, dashed: false },
    fields: [
      { key: "kind", label: "Shape", kind: "select", options: [["line", "Horizontal line"], ["box", "Empty box"]] },
      { key: "thick", label: "Thickness", kind: "number", min: 1, max: 8 }, { key: "dashed", label: "Dashed", kind: "bool" },
    ],
  },
};

export const BLOCK_ORDER = Object.keys(BLOCK_DEFS) as BlockType[];

export function newBlock(type: BlockType, x: number, y: number): Block {
  const d = BLOCK_DEFS[type];
  return { id: uid(), type, x, y, w: d.w, h: d.h, props: JSON.parse(JSON.stringify(d.props)), fit: true };
}

export function emptySheet(course = "", paper: "letter" | "a4" = "letter"): Sheet {
  return { paper, font: "sans", margin: 48, grid: 8, snap: true, course, pages: [{ blocks: [] }] };
}

// ---- Starter templates -----------------------------------------------------------------------------------------------

type Stack = { blocks: Block[]; y: number };
function add(st: Stack, type: BlockType, props: Props = {}, h?: number, w?: number) {
  const b = newBlock(type, 48, st.y);
  b.props = { ...b.props, ...props };
  if (h) b.h = h;
  if (w) b.w = w;
  st.blocks.push(b);
  st.y += b.h + 14;
  return b;
}

export const TEMPLATES: { id: string; label: string; hint: string; build: (course: string, paper: "letter" | "a4") => Sheet }[] = [
  {
    id: "blank", label: "Blank worksheet", hint: "Just a title and name line",
    build: (course, paper) => { const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 }; add(st, "header", { course }); return s; },
  },
  {
    id: "balancing", label: "Balancing equations", hint: "Coefficient boxes with answer key",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Balancing Chemical Equations" });
      add(st, "balance", { items: [
        { eq: "H2 + O2 -> H2O", ans: "2,1,2" }, { eq: "N2 + H2 -> NH3", ans: "1,3,2" }, { eq: "Fe + O2 -> Fe2O3", ans: "4,3,2" },
        { eq: "C3H8 + O2 -> CO2 + H2O", ans: "1,5,3,4" }, { eq: "Al + HCl -> AlCl3 + H2", ans: "2,6,2,3" }, { eq: "KClO3 -> KCl + O2", ans: "2,2,3" },
        { eq: "Na + H2O -> NaOH + H2", ans: "2,2,2,1" }, { eq: "Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O", ans: "3,2,1,6" },
      ] }, 420);
      return s;
    },
  },
  {
    id: "molarmass", label: "Molar mass practice", hint: "Compounds, work space, computed key",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Molar Mass" });
      add(st, "reference", { items: ["NA", "molarvol"] }, 70);
      add(st, "molarmass", { compounds: ["NaCl", "H2O", "CO2", "Ca(OH)2", "Al2(SO4)3", "C6H12O6", "Mg(NO3)2", "CuSO4·5H2O"] }, 440);
      return s;
    },
  },
  {
    id: "nomenclature", label: "Naming compounds", hint: "Formula-to-name and name-to-formula tables",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Naming Ionic Compounds" });
      add(st, "nomen", { mode: "name", title: "Part A: Write the name.", items: [{ formula: "NaCl", name: "sodium chloride" }, { formula: "CaBr2", name: "calcium bromide" }, { formula: "K2O", name: "potassium oxide" }, { formula: "Al2S3", name: "aluminum sulfide" }, { formula: "Mg3N2", name: "magnesium nitride" }] }, 250);
      add(st, "nomen", { mode: "formula", title: "Part B: Write the formula.", items: [{ formula: "LiF", name: "lithium fluoride" }, { formula: "BaCl2", name: "barium chloride" }, { formula: "Fe2O3", name: "iron(III) oxide" }, { formula: "Cu(NO3)2", name: "copper(II) nitrate" }, { formula: "(NH4)2SO4", name: "ammonium sulfate" }] }, 250);
      add(st, "ions", { cols: 3 }, 230);
      return s;
    },
  },
  {
    id: "stoich", label: "Stoichiometry", hint: "Dimensional analysis problems with mole map",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Mole Conversions" });
      add(st, "molemap", {}, 240);
      add(st, "factor", { num: "1", problem: "How many moles are in 25.0 g of NaCl?", given: "25.0 g NaCl", slots: 1, captions: ["molar mass"], target: "mol NaCl", answer: "0.428 mol NaCl" }, 120);
      add(st, "factor", { num: "2", problem: "How many molecules are in 2.50 mol of H2O?", given: "2.50 mol H2O", slots: 1, captions: ["Avogadro's number"], target: "molecules H2O", answer: "1.51 × 10^{24} molecules" }, 120);
      add(st, "factor", { num: "3", problem: "What volume does 0.500 mol of CO2 occupy at STP?", given: "0.500 mol CO2", slots: 1, captions: ["molar volume"], target: "L CO2", answer: "11.2 L CO2" }, 120);
      add(st, "factor", { num: "4", problem: "How many grams of H2O form when 4.00 g of H2 react completely with O2?", given: "4.00 g H2", slots: 3, captions: ["molar mass", "mole ratio", "molar mass"], target: "g H2O", answer: "35.7 g H2O" }, 130);
      return s;
    },
  },
  {
    id: "quiz", label: "Multiple-choice quiz", hint: "Header, choices and free-response",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Quiz" });
      add(st, "mcq", { num: "1", text: "What is the molar mass of H2O?", choices: ["16.00 g/mol", "18.02 g/mol", "17.01 g/mol", "34.01 g/mol"], answer: "B" }, 120);
      add(st, "mcq", { num: "2", text: "Which of the following is a polyatomic ion?", choices: ["Na^+", "Cl^-", "SO4^2-", "O^2-"], answer: "C", cols: 2 }, 90);
      add(st, "mcq", { num: "3", text: "How many atoms are in one formula unit of Ca(OH)2?", choices: ["3", "4", "5", "6"], answer: "C", cols: 4 }, 80);
      add(st, "question", { num: "4", text: "Explain the difference between a subscript and a coefficient in a chemical formula.", lines: 3, answer: "A subscript tells how many atoms of an element are in one particle; a coefficient tells how many particles." }, 150);
      return s;
    },
  },
  {
    id: "lab", label: "Lab report starter", hint: "Purpose, data table, graph, conclusion",
    build: (course, paper) => {
      const s = emptySheet(course, paper); const st = { blocks: s.pages[0].blocks, y: 48 };
      add(st, "header", { course, title: "Lab: ____________________" });
      add(st, "text", { text: "Purpose:", bold: true, size: 14 }, 24);
      add(st, "lines", { count: 2 }, 60);
      add(st, "text", { text: "Hypothesis:", bold: true, size: 14 }, 24);
      add(st, "lines", { count: 2 }, 60);
      add(st, "text", { text: "Data table", bold: true, size: 14 }, 24);
      add(st, "table", { rows: 6, cols: 4, cells: [["Trial", "Mass (g)", "Volume (mL)", "Density (g/mL)"], ["1", "", "", ""], ["2", "", "", ""], ["3", "", "", ""], ["4", "", "", ""], ["5", "", "", ""]] }, 190);
      s.pages.push({ blocks: [] });
      const st2 = { blocks: s.pages[1].blocks, y: 48 };
      add(st2, "graph", { title: "", xLabel: "Independent variable", yLabel: "Dependent variable" }, 400, 720);
      add(st2, "text", { text: "Conclusion (claim, evidence, reasoning):", bold: true, size: 14 }, 24);
      add(st2, "lines", { count: 6 }, 170);
      return s;
    },
  },
];

export const countBlocks = (s: Sheet) => s.pages.reduce((n, p) => n + p.blocks.length, 0);
