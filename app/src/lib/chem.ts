// Chemistry helpers used by the worksheet builder: the periodic table, molar masses,
// automatic subscripts/superscripts, equation parsing and common reference data.

const RAW = `H Hydrogen 1.008|He Helium 4.0026|Li Lithium 6.94|Be Beryllium 9.0122|B Boron 10.81|C Carbon 12.011|N Nitrogen 14.007|O Oxygen 15.999|F Fluorine 18.998|Ne Neon 20.180|Na Sodium 22.990|Mg Magnesium 24.305|Al Aluminum 26.982|Si Silicon 28.085|P Phosphorus 30.974|S Sulfur 32.06|Cl Chlorine 35.45|Ar Argon 39.95|K Potassium 39.098|Ca Calcium 40.078|Sc Scandium 44.956|Ti Titanium 47.867|V Vanadium 50.942|Cr Chromium 51.996|Mn Manganese 54.938|Fe Iron 55.845|Co Cobalt 58.933|Ni Nickel 58.693|Cu Copper 63.546|Zn Zinc 65.38|Ga Gallium 69.723|Ge Germanium 72.630|As Arsenic 74.922|Se Selenium 78.971|Br Bromine 79.904|Kr Krypton 83.798|Rb Rubidium 85.468|Sr Strontium 87.62|Y Yttrium 88.906|Zr Zirconium 91.224|Nb Niobium 92.906|Mo Molybdenum 95.95|Tc Technetium 98|Ru Ruthenium 101.07|Rh Rhodium 102.91|Pd Palladium 106.42|Ag Silver 107.87|Cd Cadmium 112.41|In Indium 114.82|Sn Tin 118.71|Sb Antimony 121.76|Te Tellurium 127.60|I Iodine 126.90|Xe Xenon 131.29|Cs Cesium 132.91|Ba Barium 137.33|La Lanthanum 138.91|Ce Cerium 140.12|Pr Praseodymium 140.91|Nd Neodymium 144.24|Pm Promethium 145|Sm Samarium 150.36|Eu Europium 151.96|Gd Gadolinium 157.25|Tb Terbium 158.93|Dy Dysprosium 162.50|Ho Holmium 164.93|Er Erbium 167.26|Tm Thulium 168.93|Yb Ytterbium 173.05|Lu Lutetium 174.97|Hf Hafnium 178.49|Ta Tantalum 180.95|W Tungsten 183.84|Re Rhenium 186.21|Os Osmium 190.23|Ir Iridium 192.22|Pt Platinum 195.08|Au Gold 196.97|Hg Mercury 200.59|Tl Thallium 204.38|Pb Lead 207.2|Bi Bismuth 208.98|Po Polonium 209|At Astatine 210|Rn Radon 222|Fr Francium 223|Ra Radium 226|Ac Actinium 227|Th Thorium 232.04|Pa Protactinium 231.04|U Uranium 238.03|Np Neptunium 237|Pu Plutonium 244|Am Americium 243|Cm Curium 247|Bk Berkelium 247|Cf Californium 251|Es Einsteinium 252|Fm Fermium 257|Md Mendelevium 258|No Nobelium 259|Lr Lawrencium 266|Rf Rutherfordium 267|Db Dubnium 268|Sg Seaborgium 269|Bh Bohrium 270|Hs Hassium 277|Mt Meitnerium 278|Ds Darmstadtium 281|Rg Roentgenium 282|Cn Copernicium 285|Nh Nihonium 286|Fl Flerovium 289|Mc Moscovium 290|Lv Livermorium 293|Ts Tennessine 294|Og Oganesson 294`;

export type Element = { z: number; sym: string; name: string; mass: number; row: number; col: number; cat: Category };
export type Category = "alkali" | "alkaline" | "transition" | "post" | "metalloid" | "nonmetal" | "halogen" | "noble" | "lanthanide" | "actinide";

const set = (...n: number[]) => new Set(n);
const ALKALI = set(3, 11, 19, 37, 55, 87), ALKALINE = set(4, 12, 20, 38, 56, 88);
const METALLOID = set(5, 14, 32, 33, 51, 52), HALOGEN = set(9, 17, 35, 53, 85, 117), NOBLE = set(2, 10, 18, 36, 54, 86, 118);
const NONMETAL = set(1, 6, 7, 8, 15, 16, 34);

function position(z: number): [number, number] {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  if (z <= 4) return [2, z - 2];
  if (z <= 10) return [2, z + 8];
  if (z <= 12) return [3, z - 10];
  if (z <= 18) return [3, z];
  if (z <= 36) return [4, z - 18];
  if (z <= 54) return [5, z - 36];
  if (z <= 56) return [6, z - 54];
  if (z <= 71) return [9, z - 54];
  if (z <= 86) return [6, z - 68];
  if (z <= 88) return [7, z - 86];
  if (z <= 103) return [10, z - 86];
  return [7, z - 100];
}
function category(z: number): Category {
  if (ALKALI.has(z)) return "alkali";
  if (ALKALINE.has(z)) return "alkaline";
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  if (METALLOID.has(z)) return "metalloid";
  if (HALOGEN.has(z)) return "halogen";
  if (NOBLE.has(z)) return "noble";
  if (NONMETAL.has(z)) return "nonmetal";
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112)) return "transition";
  return "post";
}

export const ELEMENTS: Element[] = RAW.split("|").map((s, i) => {
  const [sym, name, mass] = s.split(" ");
  const [row, col] = position(i + 1);
  return { z: i + 1, sym, name, mass: Number(mass), row, col, cat: category(i + 1) };
});
export const BY_SYMBOL: Record<string, Element> = Object.fromEntries(ELEMENTS.map((e) => [e.sym, e]));

export const CATEGORY_COLOR: Record<Category, string> = {
  alkali: "#fca5a5", alkaline: "#fdba74", transition: "#fde68a", post: "#bef264", metalloid: "#6ee7b7",
  nonmetal: "#7dd3fc", halogen: "#c4b5fd", noble: "#f0abfc", lanthanide: "#fda4af", actinide: "#d8b4fe",
};

// ---- Formula parsing and molar mass -------------------------------------------------------------------------------

export type Term = { sym: string; count: number; mass: number };

/** Parse a formula such as Ca(OH)2 or CuSO4·5H2O into element counts. Returns null if it cannot be read. */
export function parseFormula(input: string): Record<string, number> | null {
  const f = input.replace(/\s+/g, "").replace(/[_{}]/g, "");
  if (!f) return null;
  // Hydrates: split on a dot or middle dot, each part may start with a coefficient.
  const parts = f.split(/[·•.*]/);
  const total: Record<string, number> = {};
  for (const part of parts) {
    const m = /^(\d+)?(.+)$/.exec(part);
    if (!m) return null;
    const mult = m[1] && parts.length > 1 ? Number(m[1]) : 1;
    const body = parts.length > 1 ? m[2] : part;
    const counts = parseBody(body);
    if (!counts) return null;
    for (const [k, v] of Object.entries(counts)) total[k] = (total[k] ?? 0) + v * mult;
  }
  return Object.keys(total).length ? total : null;
}

function parseBody(s: string): Record<string, number> | null {
  const stack: Record<string, number>[] = [{}];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "(" || c === "[") { stack.push({}); i++; continue; }
    if (c === ")" || c === "]") {
      i++;
      const m = /^\d+/.exec(s.slice(i));
      const n = m ? Number(m[0]) : 1;
      i += m ? m[0].length : 0;
      const top = stack.pop();
      if (!top || !stack.length) return null;
      for (const [k, v] of Object.entries(top)) stack[stack.length - 1][k] = (stack[stack.length - 1][k] ?? 0) + v * n;
      continue;
    }
    const em = /^[A-Z][a-z]?/.exec(s.slice(i));
    if (!em || !BY_SYMBOL[em[0]]) {
      const one = /^[A-Z]/.exec(s.slice(i));
      if (!one || !BY_SYMBOL[one[0]]) return null;
      em![0] = one[0];
    }
    const sym = BY_SYMBOL[em![0]] ? em![0] : em![0][0];
    i += sym.length;
    const m = /^\d+/.exec(s.slice(i));
    const n = m ? Number(m[0]) : 1;
    i += m ? m[0].length : 0;
    const top = stack[stack.length - 1];
    top[sym] = (top[sym] ?? 0) + n;
  }
  return stack.length === 1 ? stack[0] : null;
}

export function molarBreakdown(formula: string): Term[] | null {
  const c = parseFormula(formula);
  if (!c) return null;
  // Keep the order elements appear in the formula text.
  const order = Object.keys(c).sort((a, b) => formula.indexOf(a) - formula.indexOf(b));
  return order.map((sym) => ({ sym, count: c[sym], mass: BY_SYMBOL[sym].mass }));
}

export function molarMass(formula: string): number | null {
  const t = molarBreakdown(formula);
  return t ? t.reduce((a, x) => a + x.count * x.mass, 0) : null;
}

// ---- Automatic subscripts and superscripts -------------------------------------------------------------------------

export type Seg = { t: "text" | "sub" | "sup"; s: string };

// A whitespace-separated word that looks like a chemical formula: optional coefficient, elements with counts,
// parentheses, and an optional charge such as ^2+ or Na+.
const FORMULA = /^(\d*)((?:[A-Z][a-z]?\d*|\((?:[A-Z][a-z]?\d*)+\)\d*)+)(?:\^?(\d*[+-]))?([.,;:?!)]*)$/;

function formulaSegs(word: string): Seg[] | null {
  const m = FORMULA.exec(word);
  if (!m) return null;
  const [, coef, body, charge, trail] = m;
  if (!/\d/.test(body) && !charge) return null;
  const out: Seg[] = [];
  if (coef) out.push({ t: "text", s: coef });
  const re = /(\d+)|([^\d]+)/g;
  let prev = "";
  for (let r = re.exec(body); r; r = re.exec(body)) {
    if (r[1] && prev) out.push({ t: "sub", s: r[1] });
    else out.push({ t: "text", s: r[0] });
    prev = r[0];
  }
  if (charge) out.push({ t: "sup", s: charge.replace("-", "−") });
  if (trail) out.push({ t: "text", s: trail });
  return out;
}

/**
 * Convert plain typing into chemistry text.
 *   H2O -> H₂O      Ca^2+ -> Ca²⁺      SO4^2- -> SO₄²⁻      -> => arrow      <=> equilibrium arrow
 * Explicit markup always works too:  x_{2}  for a subscript and  x^{2}  for a superscript.
 * Pass auto=false to leave a block's text exactly as typed.
 */
export function chemSegs(text: string, auto = true): Seg[] {
  const out: Seg[] = [];
  const push = (s: Seg) => {
    const last = out[out.length - 1];
    if (last && last.t === s.t) last.s += s.s; else out.push({ ...s });
  };
  const withArrows = text
    .replace(/<=>|<->/g, "⇌").replace(/->|-->/g, "→").replace(/\+-/g, "±")
    .replace(/\bdeg\b/g, "°").replace(/\bDelta\b/g, "Δ").replace(/\bdelta\b/g, "δ");
  const markup = /(_\{[^}]*\}|\^\{[^}]*\})/g;
  for (const chunk of withArrows.split(markup)) {
    if (!chunk) continue;
    if (chunk.startsWith("_{")) { push({ t: "sub", s: chunk.slice(2, -1) }); continue; }
    if (chunk.startsWith("^{")) { push({ t: "sup", s: chunk.slice(2, -1) }); continue; }
    if (!auto) { push({ t: "text", s: chunk }); continue; }
    for (const w of chunk.split(/(\s+)/)) {
      const segs = w && !/^\s+$/.test(w) ? formulaSegs(w) : null;
      if (segs) segs.forEach(push); else push({ t: "text", s: w });
    }
  }
  return out;
}

// ---- Equations ------------------------------------------------------------------------------------------------------

export type EqTerm = { formula: string; side: 0 | 1 };

/** "H2 + O2 -> H2O" => terms with the arrow position. */
export function parseEquation(eq: string): { terms: EqTerm[]; arrow: string } | null {
  const m = /(<=>|<->|⇌|-->|->|=>|→)/.exec(eq);
  if (!m) return null;
  const arrow = /<|⇌/.test(m[0]) ? "⇌" : "→";
  const [l, r] = [eq.slice(0, m.index), eq.slice(m.index + m[0].length)];
  const split = (s: string, side: 0 | 1) =>
    s.split(/\s+\+\s+/).map((t) => t.trim().replace(/^\d+\s*/, "")).filter(Boolean).map((formula) => ({ formula, side }));
  const terms = [...split(l, 0), ...split(r, 1)];
  return terms.length ? { terms, arrow } : null;
}

// ---- Reference data ------------------------------------------------------------------------------------------------

export const CONSTANTS: { id: string; label: string; text: string }[] = [
  { id: "NA", label: "Avogadro's number", text: "N_{A} = 6.022 × 10^{23} particles/mol" },
  { id: "molarvol", label: "Molar volume at STP", text: "1 mol gas = 22.4 L at STP (0 °C, 1 atm)" },
  { id: "R", label: "Gas constant", text: "R = 0.08206 L·atm/(mol·K) = 8.314 J/(mol·K)" },
  { id: "gaslaw", label: "Ideal gas law", text: "PV = nRT" },
  { id: "combined", label: "Combined gas law", text: "P_{1}V_{1}/T_{1} = P_{2}V_{2}/T_{2}" },
  { id: "kelvin", label: "Kelvin", text: "K = °C + 273.15" },
  { id: "molarity", label: "Molarity", text: "M = mol solute / L solution" },
  { id: "dilution", label: "Dilution", text: "M_{1}V_{1} = M_{2}V_{2}" },
  { id: "density", label: "Density", text: "D = m / V" },
  { id: "heat", label: "Heat", text: "q = mcΔT" },
  { id: "cwater", label: "Specific heat of water", text: "c_{water} = 4.184 J/(g·°C)" },
  { id: "percent", label: "Percent yield", text: "% yield = (actual / theoretical) × 100" },
  { id: "pcomp", label: "Percent composition", text: "% element = (mass of element / molar mass) × 100" },
  { id: "pH", label: "pH", text: "pH = −log[H^{+}]    pOH = −log[OH^{−}]    pH + pOH = 14" },
  { id: "Kw", label: "Water constant", text: "K_{w} = [H^{+}][OH^{−}] = 1.0 × 10^{−14}" },
  { id: "dh", label: "Enthalpy", text: "ΔH°_{rxn} = ΣΔH°_{f}(products) − ΣΔH°_{f}(reactants)" },
  { id: "dg", label: "Gibbs free energy", text: "ΔG = ΔH − TΔS" },
  { id: "nernst", label: "Faraday", text: "F = 96,485 C/mol e^{−}" },
  { id: "c", label: "Speed of light / Planck", text: "c = 3.00 × 10^{8} m/s    h = 6.626 × 10^{−34} J·s" },
  { id: "metric", label: "Metric prefixes", text: "kilo (k) 10^{3}   centi (c) 10^{−2}   milli (m) 10^{−3}   micro (μ) 10^{−6}   nano (n) 10^{−9}" },
];

export const IONS: { group: "cations" | "anions" | "other"; name: string; formula: string }[] = [
  { group: "cations", name: "ammonium", formula: "NH4^+" }, { group: "cations", name: "hydronium", formula: "H3O^+" },
  { group: "cations", name: "mercury(I)", formula: "Hg2^2+" },
  { group: "anions", name: "hydroxide", formula: "OH^-" }, { group: "anions", name: "nitrate", formula: "NO3^-" },
  { group: "anions", name: "nitrite", formula: "NO2^-" }, { group: "anions", name: "sulfate", formula: "SO4^2-" },
  { group: "anions", name: "sulfite", formula: "SO3^2-" }, { group: "anions", name: "phosphate", formula: "PO4^3-" },
  { group: "anions", name: "phosphite", formula: "PO3^3-" }, { group: "anions", name: "carbonate", formula: "CO3^2-" },
  { group: "anions", name: "hydrogen carbonate (bicarbonate)", formula: "HCO3^-" }, { group: "anions", name: "acetate", formula: "C2H3O2^-" },
  { group: "anions", name: "cyanide", formula: "CN^-" }, { group: "anions", name: "chlorate", formula: "ClO3^-" },
  { group: "anions", name: "perchlorate", formula: "ClO4^-" }, { group: "anions", name: "chlorite", formula: "ClO2^-" },
  { group: "anions", name: "hypochlorite", formula: "ClO^-" }, { group: "anions", name: "permanganate", formula: "MnO4^-" },
  { group: "anions", name: "chromate", formula: "CrO4^2-" }, { group: "anions", name: "dichromate", formula: "Cr2O7^2-" },
  { group: "anions", name: "peroxide", formula: "O2^2-" }, { group: "anions", name: "oxalate", formula: "C2O4^2-" },
  { group: "anions", name: "thiosulfate", formula: "S2O3^2-" }, { group: "anions", name: "hydrogen sulfate", formula: "HSO4^-" },
  { group: "anions", name: "dihydrogen phosphate", formula: "H2PO4^-" }, { group: "anions", name: "hydrogen phosphate", formula: "HPO4^2-" },
  { group: "anions", name: "thiocyanate", formula: "SCN^-" }, { group: "anions", name: "borate", formula: "BO3^3-" },
];

export const PREFIXES = ["mono", "di", "tri", "tetra", "penta", "hexa", "hepta", "octa", "nona", "deca"];
