/* data.js: the periodic table (atomic masses to 0.01 g/mol, as in the Unit 5 packet), constants,
 * names of common substances, and the substance pools the practice generators draw from. */
(function (root) {
  'use strict';

  // symbol, name, atomic mass, metal? (1 = metal). Atomic number = position in the list.
  const TABLE = ('H,Hydrogen,1.01,0;He,Helium,4.00,0;Li,Lithium,6.94,1;Be,Beryllium,9.01,1;B,Boron,10.81,0;C,Carbon,12.01,0;N,Nitrogen,14.01,0;O,Oxygen,16.00,0;F,Fluorine,19.00,0;Ne,Neon,20.18,0;' +
    'Na,Sodium,22.99,1;Mg,Magnesium,24.31,1;Al,Aluminum,26.98,1;Si,Silicon,28.09,0;P,Phosphorus,30.97,0;S,Sulfur,32.06,0;Cl,Chlorine,35.45,0;Ar,Argon,39.95,0;K,Potassium,39.10,1;Ca,Calcium,40.08,1;' +
    'Sc,Scandium,44.96,1;Ti,Titanium,47.87,1;V,Vanadium,50.94,1;Cr,Chromium,52.00,1;Mn,Manganese,54.94,1;Fe,Iron,55.85,1;Co,Cobalt,58.93,1;Ni,Nickel,58.69,1;Cu,Copper,63.55,1;Zn,Zinc,65.38,1;' +
    'Ga,Gallium,69.72,1;Ge,Germanium,72.63,0;As,Arsenic,74.92,0;Se,Selenium,78.97,0;Br,Bromine,79.90,0;Kr,Krypton,83.80,0;Rb,Rubidium,85.47,1;Sr,Strontium,87.62,1;Y,Yttrium,88.91,1;Zr,Zirconium,91.22,1;' +
    'Nb,Niobium,92.91,1;Mo,Molybdenum,95.95,1;Tc,Technetium,98.00,1;Ru,Ruthenium,101.07,1;Rh,Rhodium,102.91,1;Pd,Palladium,106.42,1;Ag,Silver,107.87,1;Cd,Cadmium,112.41,1;In,Indium,114.82,1;' +
    'Sn,Tin,118.71,1;Sb,Antimony,121.76,0;Te,Tellurium,127.60,0;I,Iodine,126.90,0;Xe,Xenon,131.29,0;Cs,Cesium,132.91,1;Ba,Barium,137.33,1;La,Lanthanum,138.91,1;Ce,Cerium,140.12,1;' +
    'W,Tungsten,183.84,1;Pt,Platinum,195.08,1;Au,Gold,196.97,1;Hg,Mercury,200.59,1;Tl,Thallium,204.38,1;Pb,Lead,207.20,1;Bi,Bismuth,208.98,1;Rn,Radon,222.00,0;Ra,Radium,226.00,1;U,Uranium,238.03,1').split(';');
  const ELEMENTS = {};
  TABLE.forEach((row) => { const [sym, name, mass, metal] = row.split(','); ELEMENTS[sym] = { sym, name, mass: parseFloat(mass), metal: metal === '1' }; });
  // atomic numbers for the ones in the table above (needed for the periodic-table tiles)
  const Z = { H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10, Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18, K: 19, Ca: 20, Sc: 21, Ti: 22, V: 23, Cr: 24, Mn: 25, Fe: 26, Co: 27, Ni: 28, Cu: 29, Zn: 30,
    Ga: 31, Ge: 32, As: 33, Se: 34, Br: 35, Kr: 36, Rb: 37, Sr: 38, Y: 39, Zr: 40, Nb: 41, Mo: 42, Tc: 43, Ru: 44, Rh: 45, Pd: 46, Ag: 47, Cd: 48, In: 49, Sn: 50, Sb: 51, Te: 52, I: 53, Xe: 54, Cs: 55, Ba: 56, La: 57, Ce: 58,
    W: 74, Pt: 78, Au: 79, Hg: 80, Tl: 81, Pb: 82, Bi: 83, Rn: 86, Ra: 88, U: 92 };
  for (const s in Z) ELEMENTS[s].z = Z[s];

  // colours of atoms in the pictures (not the highlight colours; these only identify elements)
  const ATOM_COLOR = { H: '#e9edf5', C: '#5d6677', N: '#4f74e3', O: '#e2493f', F: '#8fd14f', Cl: '#35b86b', Br: '#b0553a', I: '#7a4fb0', S: '#e6c02a', P: '#e08a2a',
    Na: '#9b7fd6', K: '#8e6bd0', Mg: '#58b87a', Ca: '#5fa8a0', Al: '#9aa7b8', Fe: '#c9742f', Cu: '#d9825b', Zn: '#8aa0b8', Ag: '#bfc6d0', Ni: '#6faa8c', Co: '#d96a8a', Ba: '#4fa86a',
    Pb: '#6f7685', He: '#d6f0f5', Ne: '#f5c6e8', Ar: '#c4a0f0', Xe: '#9bd0e8', Li: '#c07be0', Be: '#8fcf8f', Bi: '#9a72a0', Au: '#e5b93a', Hg: '#9fb0c0', Si: '#b89a78', B: '#e8a89a' };

  const NA = 6.022e23;               // particles per mole
  const MOLAR_VOLUME = 22.4;         // L per mole of gas at STP
  const DIATOMIC = ['H', 'N', 'O', 'F', 'Cl', 'Br', 'I'];

  const PREFIX = ['mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];

  // Names of substances (keys are formulas as typed, no spaces). Ionic names include Roman numerals where needed.
  const NAMES = {
    H2O: 'water', CO2: 'carbon dioxide', CO: 'carbon monoxide', NH3: 'ammonia', CH4: 'methane', C2H6: 'ethane', C3H8: 'propane', C4H10: 'butane', C2H4: 'ethene', C6H6: 'benzene',
    O2: 'oxygen gas', N2: 'nitrogen gas', H2: 'hydrogen gas', Cl2: 'chlorine gas', F2: 'fluorine gas', Br2: 'bromine', I2: 'iodine', O3: 'ozone',
    He: 'helium', Ne: 'neon', Ar: 'argon', Xe: 'xenon', Kr: 'krypton',
    SO2: 'sulfur dioxide', SO3: 'sulfur trioxide', NO2: 'nitrogen dioxide', NO: 'nitric oxide', N2O: 'dinitrogen monoxide', H2O2: 'hydrogen peroxide', CF4: 'carbon tetrafluoride', CCl4: 'carbon tetrachloride',
    HCl: 'hydrogen chloride', H2S: 'hydrogen sulfide', H2SO4: 'sulfuric acid', HNO3: 'nitric acid', H3PO4: 'phosphoric acid', C6H12O6: 'glucose', C12H22O11: 'sucrose', C2H5OH: 'ethanol', CH3COOH: 'acetic acid',
    NaCl: 'sodium chloride', NaOH: 'sodium hydroxide', KBr: 'potassium bromide', KCl: 'potassium chloride', LiI: 'lithium iodide', MgO: 'magnesium oxide', MgCl2: 'magnesium chloride', CaCl2: 'calcium chloride',
    CaCO3: 'calcium carbonate', CaO: 'calcium oxide', Na2CO3: 'sodium carbonate', NaHCO3: 'sodium hydrogen carbonate', Na2SO4: 'sodium sulfate', K2SO4: 'potassium sulfate', K3PO4: 'potassium phosphate',
    'Mg(OH)2': 'magnesium hydroxide', 'Ca(OH)2': 'calcium hydroxide', 'Al(OH)3': 'aluminum hydroxide', Al2O3: 'aluminum oxide', 'Al2(SO4)3': 'aluminum sulfate',
    'Ca3(PO4)2': 'calcium phosphate', '(NH4)2SO4': 'ammonium sulfate', '(NH4)3PO4': 'ammonium phosphate', '(NH4)2S': 'ammonium sulfide', '(NH4)2CO3': 'ammonium carbonate', NH4NO3: 'ammonium nitrate', NH4Cl: 'ammonium chloride',
    'Ca(NO3)2': 'calcium nitrate', 'Mg(NO3)2': 'magnesium nitrate', AgNO3: 'silver nitrate', 'Fe2O3': 'iron(III) oxide', FeO: 'iron(II) oxide', 'Fe2(SO4)3': 'iron(III) sulfate', CuO: 'copper(II) oxide', Cu2O: 'copper(I) oxide',
    Cu2O3: 'copper(III) oxide', CuBr2: 'copper(II) bromide', CuSO4: 'copper(II) sulfate', MgSO4: 'magnesium sulfate', CaSO4: 'calcium sulfate', BaCl2: 'barium chloride', CoCl2: 'cobalt(II) chloride',
    PbCO3: 'lead(II) carbonate', BiOF: 'bismuth oxyfluoride', Na2S2O3: 'sodium thiosulfate', N2S2: 'dinitrogen disulfide', NiCl2: 'nickel(II) chloride', ZnO: 'zinc oxide', ZnCl2: 'zinc chloride', Li2CO3: 'lithium carbonate',
    Al: 'aluminum', Mg: 'magnesium', Fe: 'iron', Cu: 'copper', Zn: 'zinc', Ag: 'silver', Ni: 'nickel', Au: 'gold', Na: 'sodium', K: 'potassium', Ca: 'calcium', Pb: 'lead', Sn: 'tin', Li: 'lithium', C: 'carbon', S: 'sulfur'
  };

  // formulas the generators draw from -------------------------------------------------------------
  const POOL = {
    molarMass: ['NaCl', 'MgO', 'CaCO3', 'H2SO4', 'NaOH', 'KBr', 'CH4', 'C2H6', 'C3H8', 'CO2', 'NH3', 'SO2', 'Mg(OH)2', 'Ca(OH)2', 'Al(OH)3', 'Ca(NO3)2', 'Al2(SO4)3', '(NH4)2SO4', '(NH4)3PO4', 'Ca3(PO4)2',
      'K3PO4', 'Fe2O3', 'C6H12O6', 'C12H22O11', 'NH4NO3', '(NH4)2CO3', 'Mg(NO3)2', 'Na2CO3', 'CuSO4', 'Fe2(SO4)3', 'N2', 'Cl2', 'O2', 'Br2', 'AgNO3', 'Li2CO3', 'ZnCl2', 'Al2O3', 'HNO3', 'H3PO4'],
    molecules: ['H2O', 'CO2', 'NH3', 'CH4', 'SO2', 'C3H8', 'C6H12O6', 'C12H22O11', 'CF4', 'CCl4', 'H2O2', 'N2O', 'C2H6', 'HCl', 'H2S', 'CO'],
    ionic: ['NaCl', 'CaCl2', 'MgO', 'KBr', 'CaCO3', 'NaOH', 'Mg(OH)2', 'Al2O3', 'Fe2O3', 'K3PO4', 'Na2CO3', 'Ca(NO3)2', 'LiI', 'AgNO3', 'ZnCl2'],
    metals: ['Al', 'Mg', 'Fe', 'Cu', 'Zn', 'Ag', 'Ni', 'Na', 'Ca', 'Pb', 'Au', 'Sn'],
    diatomic: ['O2', 'N2', 'H2', 'Cl2', 'F2'],
    gases: ['O2', 'N2', 'H2', 'He', 'Ne', 'Ar', 'Cl2', 'CO2', 'CO', 'NH3', 'CH4', 'SO2', 'C3H8', 'C2H6', 'Xe', 'F2', 'H2S', 'N2O'],
    insideCompound: [['Cu2O3', 'Cu'], ['C6H12O6', 'O'], ['CaCl2', 'Cl'], ['Al2(SO4)3', 'O'], ['Fe2O3', 'Fe'], ['Mg(OH)2', 'H'], ['Ca3(PO4)2', 'P'], ['(NH4)2SO4', 'N'], ['Al2O3', 'Al'], ['K3PO4', 'K'], ['C3H8', 'H'], ['Na2CO3', 'O'],
      ['C12H22O11', 'C'], ['Fe2(SO4)3', 'S'], ['Al(OH)3', 'O'], ['NH4NO3', 'N']],
    pct: ['NaOH', 'CuBr2', '(NH4)2S', '(NH4)3PO4', 'CaCO3', 'H2O', 'CO2', 'Fe2O3', 'Al2(SO4)3', 'NH4NO3', 'C6H12O6', 'MgSO4', 'Ca(OH)2', 'C2H6', 'K2SO4', 'Na2CO3', 'Mg(NO3)2', 'H2SO4', 'Al2O3', 'CH4', 'SO3', 'Ca3(PO4)2'],
    // formulas whose subscripts have a common factor or give a fractional ratio: good for empirical-formula practice
    empirical: ['C2H6', 'C6H12O6', 'C2H4', 'C6H6', 'H2O2', 'C2H4O2', 'C4H10', 'C8H18', 'N2O4', 'C3H6', 'Na2S2O3', 'P4O10', 'C6H12', 'C4H8O2', 'Fe2O3', 'Al2O3', 'Na2SO4', 'K2Cr2O7', 'CaCO3', 'MgSO4', 'C5H10O5', 'Cu2O', 'Fe3O4', 'C10H8', 'N2O5', 'C2H2', 'C8H8'],
    hydrates: [['CuSO4', 5], ['MgSO4', 7], ['CaCl2', 2], ['CoCl2', 6], ['Na2CO3', 1], ['BaCl2', 2], ['CaSO4', 2], ['Na2CO3', 10], ['CuSO4', 3], ['MgCl2', 6], ['Na2SO4', 10], ['NiCl2', 6], ['ZnSO4', 7], ['FeSO4', 7], ['Na2S2O3', 5]]
  };
  NAMES.ZnSO4 = 'zinc sulfate'; NAMES.FeSO4 = 'iron(II) sulfate'; NAMES.K2Cr2O7 = 'potassium dichromate'; NAMES.P4O10 = 'tetraphosphorus decoxide'; NAMES.N2O4 = 'dinitrogen tetroxide'; NAMES.N2O5 = 'dinitrogen pentoxide';
  NAMES.C2H4O2 = 'acetic acid'; NAMES.C8H18 = 'octane'; NAMES.C2H2 = 'ethyne'; NAMES.C3H6 = 'propene'; NAMES.Fe3O4 = 'iron(II,III) oxide'; NAMES.C10H8 = 'naphthalene'; NAMES.C8H8 = 'styrene';
  NAMES.C6H12 = 'cyclohexane'; NAMES.C4H8O2 = 'butanoic acid'; NAMES.C5H10O5 = 'ribose'; NAMES.Na2S2O3 = 'sodium thiosulfate';

  // hydrates: what they look like (hydrated colour -> anhydrous colour) for the heating picture
  const HYDRATE_LOOK = {
    CuSO4: { hyd: '#3b8fe0', anh: '#f2f3f4', hydName: 'blue', anhName: 'white' },
    CoCl2: { hyd: '#d9638a', anh: '#3c5fd0', hydName: 'pink', anhName: 'blue' },
    MgSO4: { hyd: '#f4f6f8', anh: '#f6f6f4', hydName: 'white', anhName: 'white' },
    CaCl2: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    BaCl2: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    CaSO4: { hyd: '#f0eeea', anh: '#f6f5f2', hydName: 'white', anhName: 'white' },
    Na2CO3: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    NiCl2: { hyd: '#5fbf78', anh: '#d9b84a', hydName: 'green', anhName: 'yellow' },
    FeSO4: { hyd: '#7fcf9a', anh: '#e8e6d8', hydName: 'pale green', anhName: 'off-white' },
    ZnSO4: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    MgCl2: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    Na2SO4: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' },
    Na2S2O3: { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' }
  };


  /* ---------- a much bigger bank: more substances, names, gases, hydrates and formulas ---------- */
  Object.assign(NAMES, {
    CaF2: 'calcium fluoride', NaNO3: 'sodium nitrate', KNO3: 'potassium nitrate', K2CO3: 'potassium carbonate', Na3PO4: 'sodium phosphate', BaSO4: 'barium sulfate', Li2O: 'lithium oxide', SrCl2: 'strontium chloride',
    FeCl3: 'iron(III) chloride', FeCl2: 'iron(II) chloride', CuCl2: 'copper(II) chloride', AlCl3: 'aluminum chloride', Na2O: 'sodium oxide', K2O: 'potassium oxide', MgS: 'magnesium sulfide', PbCl2: 'lead(II) chloride',
    'Pb(NO3)2': 'lead(II) nitrate', AgCl: 'silver chloride', Ag2O: 'silver oxide', HBr: 'hydrogen bromide', HI: 'hydrogen iodide', H2CO3: 'carbonic acid', HCN: 'hydrogen cyanide', CH3OH: 'methanol', C5H12: 'pentane',
    C6H14: 'hexane', KMnO4: 'potassium permanganate', K2CrO4: 'potassium chromate', Na2SiO3: 'sodium silicate', 'Mg3(PO4)2': 'magnesium phosphate', 'Al(NO3)3': 'aluminum nitrate', 'Fe(OH)3': 'iron(III) hydroxide',
    'Cu(OH)2': 'copper(II) hydroxide', 'Ba(OH)2': 'barium hydroxide', LiOH: 'lithium hydroxide', KOH: 'potassium hydroxide', NH4Br: 'ammonium bromide', 'Zn(NO3)2': 'zinc nitrate', 'Ca(ClO3)2': 'calcium chlorate',
    Co: 'cobalt', Cr: 'chromium', Mn: 'manganese', Ti: 'titanium', Pt: 'platinum', Sr: 'strontium', Ba: 'barium', Rb: 'rubidium', 'Fe3(PO4)2': 'iron(II) phosphate', 'Al(HCO3)3': 'aluminum hydrogen carbonate',
    'Mg(HCO3)2': 'magnesium hydrogen carbonate', 'CaH2': 'calcium hydride', 'NaHSO4': 'sodium hydrogen sulfate', Na2S: 'sodium sulfide', 'K2S': 'potassium sulfide', CaS: 'calcium sulfide', BaCl2: 'barium chloride', MgF2: 'magnesium fluoride',
    SiO2: 'silicon dioxide', P2O5: 'diphosphorus pentoxide', PCl3: 'phosphorus trichloride', SF6: 'sulfur hexafluoride', CS2: 'carbon disulfide', 'N2H4': 'hydrazine', NF3: 'nitrogen trifluoride', 'C3H7OH': 'propanol',
    'C2H5Cl': 'chloroethane', 'CH3Cl': 'chloromethane', 'CH2Cl2': 'dichloromethane', 'CHCl3': 'chloroform', 'C6H5OH': 'phenol', 'C7H8': 'toluene', 'C3H6O': 'acetone', 'C2H4O': 'ethylene oxide', 'C6H8O6': 'vitamin C (ascorbic acid)',
    'C9H8O4': 'aspirin', 'C8H10N4O2': 'caffeine', 'C27H46O': 'cholesterol', 'C2H6O': 'ethanol', 'C3H8O3': 'glycerol', 'C4H4': 'vinylacetylene', 'C3H4': 'propyne', 'C4H8': 'butene', 'C5H10': 'pentene',
    CaSO3: 'calcium sulfite', Na2SO3: 'sodium sulfite', 'Fe2(CO3)3': 'iron(III) carbonate', 'Ca(CN)2': 'calcium cyanide', 'Li3N': 'lithium nitride', 'Mg3N2': 'magnesium nitride', 'Ca3N2': 'calcium nitride', AlN: 'aluminum nitride', ZnS: 'zinc sulfide'
  });
  const addTo = (arr, items) => items.forEach((x) => { if (!arr.some((y) => JSON.stringify(y) === JSON.stringify(x))) arr.push(x); });
  addTo(POOL.molarMass, ['CaF2', 'NaNO3', 'KNO3', 'K2CO3', 'Na3PO4', 'BaSO4', 'Li2O', 'SrCl2', 'FeCl3', 'CuCl2', 'AlCl3', 'Na2O', 'K2O', 'MgS', 'PbCl2', 'Pb(NO3)2', 'AgCl', 'HBr', 'H2CO3', 'HCN', 'CH3OH', 'C5H12', 'C6H14', 'KMnO4', 'K2CrO4', 'Na2SiO3', 'Mg3(PO4)2', 'Al(NO3)3', 'Fe(OH)3', 'Cu(OH)2', 'Ba(OH)2',
    'LiOH', 'KOH', 'NH4Br', 'Zn(NO3)2', 'Ca(ClO3)2', 'MgF2', 'SiO2', 'P2O5', 'PCl3', 'SF6', 'CS2', 'N2H4', 'NF3', 'C2H5Cl', 'CH2Cl2', 'CHCl3', 'C6H5OH', 'C7H8', 'C3H6O', 'C9H8O4', 'C8H10N4O2', 'C27H46O', 'C3H8O3', 'C6H8O6', 'Al(HCO3)3', 'Mg(HCO3)2', 'Na2S', 'CaS', 'Li3N', 'Mg3N2',
    'Ca3N2', 'AlN', 'ZnS', 'Fe2(CO3)3', 'Ca(CN)2', 'Na2SO3', 'CaSO3', 'NaHSO4', 'Fe3(PO4)2', 'I2', 'F2', 'H2', 'P4', 'S8']);
  NAMES.P4 = 'white phosphorus'; NAMES.S8 = 'sulfur (S₈ molecules)';
  addTo(POOL.molecules, ['CH3OH', 'C5H12', 'C6H14', 'HBr', 'HCN', 'SO3', 'PCl3', 'SF6', 'CS2', 'N2H4', 'NF3', 'C2H5Cl', 'CH2Cl2', 'CHCl3', 'C6H5OH', 'C7H8', 'C3H6O', 'C9H8O4', 'C3H8O3', 'C6H8O6', 'P2O5', 'SiO2', 'C4H10', 'C2H4', 'C2H2', 'HI']);
  addTo(POOL.ionic, ['NaNO3', 'KNO3', 'K2CO3', 'Na3PO4', 'BaSO4', 'Li2O', 'SrCl2', 'FeCl3', 'CuCl2', 'AlCl3', 'Na2O', 'MgS', 'PbCl2', 'Pb(NO3)2', 'AgCl', 'KMnO4', 'K2CrO4', 'Ba(OH)2', 'LiOH', 'KOH', 'Al(NO3)3', 'Fe(OH)3', 'Cu(OH)2', 'CaF2', 'MgF2', 'NH4Br', 'Zn(NO3)2', 'Li3N', 'Mg3N2', 'ZnS', 'Ca(ClO3)2', 'Mg3(PO4)2']);
  addTo(POOL.metals, ['Co', 'Cr', 'Mn', 'Ti', 'Pt', 'Sr', 'Ba', 'Li', 'K', 'Au', 'Mg', 'Al']);
  addTo(POOL.gases, ['Kr', 'SO3', 'C4H10', 'C2H4', 'C2H2', 'HCl', 'HBr', 'O3', 'NF3', 'N2H4', 'SF6', 'CS2']);
  addTo(POOL.insideCompound, [['Fe(OH)3', 'O'], ['Ca(NO3)2', 'N'], ['Mg3(PO4)2', 'O'], ['Al2(SO4)3', 'S'], ['C9H8O4', 'O'], ['C8H10N4O2', 'N'], ['K2CrO4', 'Cr'], ['Pb(NO3)2', 'O'], ['(NH4)3PO4', 'H'], ['Ca(OH)2', 'O'], ['NaHSO4', 'O'], ['CuSO4', 'O'], ['Fe3(PO4)2', 'Fe'], ['Ba(OH)2', 'H'],
    ['C3H8O3', 'H'], ['C6H8O6', 'C'], ['Al(NO3)3', 'N'], ['Mg(NO3)2', 'O'], ['Na3PO4', 'Na'], ['AlCl3', 'Cl'], ['FeCl3', 'Cl'], ['C12H22O11', 'H'], ['C27H46O', 'C'], ['Fe2(CO3)3', 'C'], ['(NH4)2CO3', 'H'], ['Ca3(PO4)2', 'O'], ['K2SO4', 'K'], ['Na2SO4', 'O']]);
  addTo(POOL.pct, ['KCl', 'MgCl2', 'CaF2', 'NaNO3', 'KNO3', 'K2CO3', 'BaSO4', 'Li2O', 'FeCl3', 'CuCl2', 'AlCl3', 'Na2O', 'MgS', 'Pb(NO3)2', 'AgCl', 'HBr', 'H2CO3', 'CH3OH', 'C5H12', 'KMnO4', 'K2CrO4', 'Mg3(PO4)2', 'Al(NO3)3', 'Fe(OH)3', 'Cu(OH)2', 'Ba(OH)2', 'LiOH', 'KOH', 'Zn(NO3)2', 'Ca(ClO3)2', 'SiO2',
    'P2O5', 'PCl3', 'SF6', 'CS2', 'N2H4', 'CHCl3', 'C6H5OH', 'C9H8O4', 'C8H10N4O2', 'C3H8O3', 'C6H8O6', 'Al(HCO3)3', 'Fe2(CO3)3', 'Na2SO3', 'NaHSO4', 'Ca(NO3)2', 'Mg(OH)2', 'Fe3(PO4)2', 'C12H22O11']);
  addTo(POOL.empirical, ['C3H8', 'C4H8', 'C5H10', 'C6H14', 'C2H5Cl', 'CH2Cl2', 'C3H6O', 'C7H8', 'C2H6O', 'C3H8O3', 'C6H8O6', 'C9H8O4', 'C4H10O', 'P2O5', 'N2O3', 'Cl2O7', 'SO3', 'Fe2O3', 'CuO', 'Cu2O', 'MnO2', 'Mn2O7', 'V2O5', 'Cr2O3', 'TiO2', 'PbO2', 'Pb3O4', 'Na2O2', 'K2O2', 'BaO2', 'H2O2', 'C2H4O', 'C4H6O3', 'C3H4O3', 'C4H4O4',
    'C2H2O4', 'C5H8O4', 'N2H4', 'NH2Cl', 'B2H6', 'Si2H6', 'S2Cl2', 'S2O3', 'S4N4', 'C6H12O2', 'C8H16O2', 'C10H14N2', 'C5H4N', 'C10H16', 'CH3COOH', 'C2H5OH', 'CH3OH', 'C6H6O2', 'C8H18', 'C12H26', 'C12H24O12', 'Fe3O4']);
  // hydrates: [salt, x]; every salt has a name and every x is 1..10, so the prefix exists
  addTo(POOL.hydrates, [['CaCl2', 6], ['SrCl2', 6], ['FeCl3', 6], ['CoCl2', 2], ['NiSO4', 6], ['MnSO4', 4], ['Mg(NO3)2', 6], ['Ba(OH)2', 8], ['CuCl2', 2], ['ZnCl2', 4], ['MgSO4', 1], ['Na2CO3', 7], ['CuSO4', 1], ['CaSO4', 1], ['FeCl2', 4], ['Na2SO3', 7], ['Co(NO3)2', 6], ['Cu(NO3)2', 3], ['Zn(NO3)2', 6], ['Al(NO3)3', 9], ['KAl(SO4)2', 12]]);
  Object.assign(NAMES, { NiSO4: 'nickel(II) sulfate', MnSO4: 'manganese(II) sulfate', 'Co(NO3)2': 'cobalt(II) nitrate', 'Cu(NO3)2': 'copper(II) nitrate' });
  POOL.hydrates = POOL.hydrates.filter((h) => h[1] <= 10 && NAMES[h[0]]);       // names and prefixes must exist (KAl(SO4)2 is dropped: no simple name)
  const MORE_LOOK = { SrCl2: ['#f2f4f6', '#f7f7f5', 'white', 'white'], FeCl3: ['#d6a032', '#8a6a2c', 'yellow-orange', 'brown'], NiSO4: ['#4fb88a', '#d8c85a', 'green', 'yellow'], MnSO4: ['#f2c2d2', '#f4f4ef', 'pale pink', 'off-white'], 'Mg(NO3)2': ['#f2f4f6', '#f7f7f5', 'white', 'white'],
    'Ba(OH)2': ['#f2f4f6', '#f7f7f5', 'white', 'white'], CuCl2: ['#4fa0b8', '#b88a4a', 'blue-green', 'brown'], ZnCl2: ['#f2f4f6', '#f7f7f5', 'white', 'white'], 'Co(NO3)2': ['#d9638a', '#a05080', 'pink-red', 'purple'], 'Cu(NO3)2': ['#3b8fe0', '#7fb0e0', 'blue', 'pale blue'],
    'Zn(NO3)2': ['#f2f4f6', '#f7f7f5', 'white', 'white'], 'Al(NO3)3': ['#f2f4f6', '#f7f7f5', 'white', 'white'], Na2SO3: ['#f2f4f6', '#f7f7f5', 'white', 'white'], FeCl2: ['#9fd0a0', '#e8e6d8', 'pale green', 'off-white'] };
  Object.keys(MORE_LOOK).forEach((k) => { const v = MORE_LOOK[k]; HYDRATE_LOOK[k] = { hyd: v[0], anh: v[1], hydName: v[2], anhName: v[3] }; });
  POOL.hydrates.forEach((h) => { if (!HYDRATE_LOOK[h[0]]) HYDRATE_LOOK[h[0]] = { hyd: '#f2f4f6', anh: '#f7f7f5', hydName: 'white', anhName: 'white' }; });
  POOL.molarMass = POOL.molarMass.filter((f) => f !== 'S8' && f !== 'P4' || true);

  const api = { ELEMENTS, ATOM_COLOR, NA, MOLAR_VOLUME, DIATOMIC, PREFIX, NAMES, POOL, HYDRATE_LOOK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MolesData = api;
})(typeof self !== 'undefined' ? self : this);
