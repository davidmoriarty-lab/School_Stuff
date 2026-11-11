/* qbank.js: the multiple-choice question bank.
 *
 *   CONCEPT         84 hand-written conceptual questions (12 per topic)
 *   mcFromProblem   turns any generated problem into a multiple-choice question whose wrong choices are
 *                   real mistakes (a flipped factor, a skipped step, a power of ten...), each explained
 *   randomMC        picks a question from either source, never repeating one you already saw
 *
 * Text uses [[formula]] for subscripts and Unicode superscripts for scientific notation.
 */
(function (root) {
  'use strict';
  const C = root.MolesChem || require('./chem.js'), S = root.MolesSteps || require('./steps.js'), P = root.MolesProblems || require('./problems.js'), D = root.MolesData || require('./data.js');
  const EL = D.ELEMENTS;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(P.rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* [topic, question, right answer, [three wrong answers], why] */
  const RAW = [
    // ---------------- 5.1 The mole and Avogadro's number ----------------
    ['5.1', 'A dozen is 12 things. How many things is a mole?', '6.022 × 10²³', ['6.022 × 10⁻²³', '12 × 10²³', '602.2'], 'A mole is 6.022 × 10²³ of anything: Avogadro’s number.'],
    ['5.1', 'Which sample has MORE particles?', '2.00 mol of sodium atoms', ['1.00 mol of iron atoms', '1.00 mol of lead atoms', 'They are equal'], 'The number of particles depends only on the number of moles, not on the kind of atom. 2.00 mol is more than 1.00 mol.'],
    ['5.1', 'How many atoms are in ONE molecule of [[C6H12O6]]?', '24', ['6', '12', '3'], '6 C + 12 H + 6 O = 24 atoms.'],
    ['5.1', 'Which statement about 1.00 mol of [[O2]] and 1.00 mol of O atoms is true?', 'The O₂ sample has twice as many atoms.', ['They have the same number of atoms.', 'The O-atom sample has twice as many atoms.', 'The O₂ sample has twice as many molecules.'], 'Each O₂ molecule is two atoms, so 1.00 mol of O₂ has 2.00 mol of atoms.'],
    ['5.1', 'Which substance is made of formula units?', '[[CaCl2]]', ['[[CO2]]', '[[O2]]', 'Ne'], 'Ionic compounds (a metal plus nonmetals) are made of formula units.'],
    ['5.1', 'Which substance is made of molecules?', '[[NH3]]', ['[[KBr]]', 'Mg', '[[Na2O]]'], 'NH₃ contains only nonmetals, so it is covalent and made of molecules.'],
    ['5.1', 'Why do chemists count atoms in moles instead of one at a time?', 'Atoms are far too small and too many to count individually, so a mole is a convenient group.', ['A mole is heavier than an atom.', 'A mole is exactly 12 atoms.', 'Atoms cannot be counted at all.'], 'A mole is a convenient group, like a dozen, for tiny particles.'],
    ['5.1', 'How many moles are 3.011 × 10²³ atoms of copper?', '0.5000 mol', ['2.000 mol', '1.000 mol', '1.81 × 10⁴⁷ mol'], '3.011 × 10²³ ÷ 6.022 × 10²³ = 0.5000 mol.'],
    ['5.1', 'Which of these is a number of particles rather than a mass?', '1 mol', ['1 g', '1 amu', '1 kg'], 'A mole is a count. Grams, amu and kilograms are masses.'],
    ['5.1', 'How many hydrogen atoms are in 1.00 mol of [[H2O]]?', '1.204 × 10²⁴', ['6.022 × 10²³', '3.011 × 10²³', '1.807 × 10²⁴'], 'Two H per molecule: 2 × 6.022 × 10²³ = 1.204 × 10²⁴.'],
    ['5.1', 'A student says “a mole of marbles has the same mass as a mole of feathers”. What is wrong?', 'The numbers of items are equal, but their masses are not.', ['A mole of marbles has more items than a mole of feathers.', 'A mole only applies to marbles.', 'Nothing: the masses must be equal.'], 'A mole is a number, not a mass. Equal numbers of heavy and light things have different masses.'],
    ['5.1', 'Which is the best estimate for the number of atoms in 0.50 mol of copper?', '3.0 × 10²³', ['6.0 × 10²³', '3.0 × 10²⁴', '0.50'], 'Half a mole is half of 6.022 × 10²³, about 3.0 × 10²³.'],
    // ---------------- 5.2 Molar mass ----------------
    ['5.2', 'What does the number 63.55 under copper on the periodic table tell you?', 'One mole of copper has a mass of 63.55 g.', ['Copper has 63.55 protons.', 'One copper atom has a mass of 63.55 g.', 'Copper has 63.55 neutrons.'], 'The atomic mass in amu per atom is the same number as the molar mass in g/mol.'],
    ['5.2', 'What is the molar mass of [[Cl2]]?', '70.90 g/mol', ['35.45 g/mol', '17.73 g/mol', '106.35 g/mol'], 'Chlorine is diatomic: 2 × 35.45 = 70.90 g/mol.'],
    ['5.2', 'How many hydrogen atoms are in one formula unit of [[Ca(OH)2]]?', '2', ['1', '3', '4'], 'The 2 outside the parentheses multiplies the OH group: 2 O and 2 H.'],
    ['5.2', 'Which compound has the largest molar mass?', '[[CO2]]', ['[[H2O]]', '[[CH4]]', '[[NH3]]'], 'CO₂ is 44.01; H₂O is 18.02; CH₄ is 16.05; NH₃ is 17.04.'],
    ['5.2', 'How many oxygen atoms are in one formula unit of [[Al2(SO4)3]]?', '12', ['4', '7', '3'], 'Each SO₄ has 4 O, and there are 3 SO₄ groups: 12.'],
    ['5.2', 'Which list contains only diatomic elements?', 'H₂, O₂, Cl₂', ['H₂, He, O₂', 'C, N₂, O₂', 'Na, Cl₂, Br₂'], 'The seven diatomic elements are H, N, O, F, Cl, Br and I. Helium, carbon and sodium are not.'],
    ['5.2', 'Which unit does molar mass have?', 'g/mol', ['g', 'mol/g', 'amu/mol'], 'Molar mass is grams per mole.'],
    ['5.2', 'The atomic number of carbon is 6. Which number do you use to find the molar mass of [[CO2]]?', '12.01', ['6', '6.02', '18'], 'Use the decimal atomic mass (12.01), not the atomic number.'],
    ['5.2', 'A student finds the molar mass of [[Mg(OH)2]] as 24.31 + 16.00 + 1.01. What did the student forget?', 'To multiply the O and the H by 2', ['To add the magnesium', 'To use the atomic number', 'To divide by 2'], 'The 2 outside the parentheses applies to both the O and the H.'],
    ['5.2', 'Which has the greater molar mass: [[N2]] or nitrogen counted as single atoms?', '[[N2]]: 28.02 g/mol versus 14.01 g/mol', ['They are equal', 'Single N atoms', 'Cannot be told'], 'A mole of N₂ molecules contains two moles of N atoms.'],
    ['5.2', 'What is the molar mass of [[CaCO3]]?', '100.09 g/mol', ['84.09 g/mol', '68.09 g/mol', '56.08 g/mol'], '40.08 + 12.01 + 3(16.00) = 100.09. The other values leave out one or two oxygens.'],
    ['5.2', 'When should you round a molar mass?', 'Once, at the end, to two decimal places', ['To a whole number first', 'After each atomic mass', 'Never'], 'Keep all digits through the sum, then round once to 0.01 g/mol.'],
    // ---------------- 5.3 Mole conversions ----------------
    ['5.3', 'Which factor converts grams of [[H2O]] to moles?', '1 mol ÷ 18.02 g', ['18.02 g ÷ 1 mol', '6.022 × 10²³ ÷ 1 mol', '22.4 L ÷ 1 mol'], 'Put the unit you want to cancel (grams) on the bottom.'],
    ['5.3', 'To change molecules into grams, which order is correct?', 'molecules → moles → grams', ['molecules → grams directly', 'grams → moles → molecules', 'moles → liters → grams'], 'Particles never convert directly to grams. Go through moles.'],
    ['5.3', 'Why can a conversion factor like 1 mol / 18.02 g be multiplied without changing the amount?', 'The top and bottom are equal, so the fraction equals 1.', ['It makes the number bigger', 'It turns water into moles', 'It is only a rule with no reason'], 'A conversion factor is a ratio of equal amounts, so it equals 1 and changes only the unit.'],
    ['5.3', 'You set up a conversion and the units do NOT cancel to the unit you want. What does that tell you?', 'A factor is upside down or a step is missing.', ['The answer must be correct', 'You used too many sig figs', 'The molar mass is wrong'], 'The leftover unit must be the unit asked for. If not, fix the setup before calculating.'],
    ['5.3', 'How many moles of chlorine ATOMS are in 1.00 mol of [[CaCl2]]?', '2.00 mol', ['1.00 mol', '3.00 mol', '0.500 mol'], 'The subscript 2 means two Cl per formula unit.'],
    ['5.3', 'A problem asks for the grams of oxygen in a sample of [[Al2O3]]. Which factor is needed besides the molar mass of the compound?', '3 mol O per 1 mol Al₂O₃', ['2 mol Al per 1 mol Al₂O₃', '6.022 × 10²³ per mol', '22.4 L per mol'], 'The subscript 3 is the mole ratio from compound to oxygen.'],
    ['5.3', 'You are given a mass in grams and asked for the number of molecules. At least how many conversion factors do you need?', '2', ['1', '3', '4'], 'Grams → moles (molar mass), then moles → molecules (Avogadro’s number).'],
    ['5.3', 'Why keep extra digits in the calculator until the final step?', 'Rounding early adds error to the final answer.', ['Extra digits make the answer more precise than the data.', 'Calculators cannot round.', 'It is only a classroom rule.'], 'Round once, at the end, to the sig figs of the given data.'],
    ['5.3', 'Which has more molecules: 18.02 g of [[H2O]] or 44.01 g of [[CO2]]?', 'They have the same number (1 mol each).', ['[[H2O]], because it is lighter', '[[CO2]], because it is heavier', 'Cannot be determined'], 'Each sample is exactly one molar mass, so each has 6.022 × 10²³ molecules.'],
    ['5.3', 'Which has more molecules: 10.0 g of [[H2O]] or 10.0 g of [[CO2]]?', '[[H2O]]', ['[[CO2]]', 'They have the same number', 'Cannot be determined'], 'The same mass of the lighter molecule is more moles: 0.555 mol of H₂O versus 0.227 mol of CO₂.'],
    ['5.3', 'When you convert moles to particles, your answer should be…', 'a very large number', ['a small decimal', 'the same as the moles', 'negative'], 'Each mole is 6.022 × 10²³ particles, so the number gets huge.'],
    ['5.3', 'A student multiplies grams by the molar mass to find moles. What should they have done?', 'Divide the grams by the molar mass', ['Multiply by 22.4', 'Divide by Avogadro’s number', 'Nothing: it is correct'], 'Moles = grams ÷ (g/mol). Let the units cancel.'],
    // ---------------- 5.4 Gas volume at STP ----------------
    ['5.4', 'What does STP stand for?', 'Standard temperature and pressure', ['Standard time and place', 'Stable temperature and pressure', 'Standard temperature and particles'], 'STP means 0 °C and 1 atm.'],
    ['5.4', 'At STP, 1 mol of ANY gas occupies…', '22.4 L', ['22.4 g', '24.5 L', '6.022 × 10²³ L'], 'The molar volume of a gas at STP is 22.4 L/mol.'],
    ['5.4', 'Which sample occupies 22.4 L at STP?', '1.00 mol of He gas', ['1.00 mol of liquid water', '1.00 mol of solid iron', '22.4 g of any gas'], 'Only a mole of a GAS at STP. Liquids and solids take far less room, and 22.4 g of gas is not always one mole.'],
    ['5.4', 'Which has the greater volume at STP: 1.00 mol of [[H2]] or 1.00 mol of [[CO2]]?', 'They have the same volume.', ['[[CO2]], because it is heavier', '[[H2]], because it is lighter', 'Cannot be determined'], 'Equal moles of gas have equal volumes at STP, whatever the gas.'],
    ['5.4', 'Which has the greater volume at STP: 10.0 g of [[H2]] or 10.0 g of [[O2]]?', '[[H2]]', ['[[O2]]', 'They are equal', 'Cannot be determined'], 'H₂ has far more moles in 10.0 g (4.95 mol versus 0.313 mol), and volume follows moles.'],
    ['5.4', 'Which conversion factor changes liters of gas at STP into moles?', '1 mol ÷ 22.4 L', ['22.4 L ÷ 1 mol', '1 mol ÷ 18.02 g', '6.022 × 10²³ ÷ 1 mol'], 'Liters go on the bottom so they cancel.'],
    ['5.4', 'Why can’t 22.4 L/mol be used for liquid water?', 'Water is not a gas: a mole of liquid water is only about 18 mL.', ['Water has no molar mass', 'STP does not exist for liquids', 'Liquids have no volume'], 'The molar volume of 22.4 L describes gases at STP only.'],
    ['5.4', 'How many molecules are in 22.4 L of [[CH4]] gas at STP?', '6.022 × 10²³', ['22.4', '1.35 × 10²⁵', '16.05'], '22.4 L at STP is exactly one mole.'],
    ['5.4', 'A gas is at 25 °C and 1 atm. Which statement is true?', 'You cannot use 22.4 L/mol, because that is not STP.', ['22.4 L/mol still applies', 'The gas has no volume', 'The volume is always 22.4 L'], 'STP requires 0 °C. At 25 °C a mole of gas takes up about 24.5 L.'],
    ['5.4', 'What is the first step in finding the volume at STP of 8.00 g of [[CH4]]?', 'Convert 8.00 g to moles using the molar mass', ['Multiply 8.00 by 22.4', 'Divide 8.00 by 22.4', 'Multiply by 6.022 × 10²³'], 'Grams → moles → liters.'],
    ['5.4', 'Two balloons each hold 5.0 L of gas at STP: one He, one Ar. Which statement is true?', 'They hold the same number of atoms.', ['The Ar balloon holds more atoms.', 'The He balloon holds more atoms.', 'The Ar balloon holds more moles.'], 'The same volume of gas at the same temperature and pressure holds the same number of particles.'],
    ['5.4', 'What is the volume of 2.00 mol of gas at STP?', '44.8 L', ['11.2 L', '22.4 L', '0.0893 L'], '2.00 mol × 22.4 L/mol = 44.8 L.'],
    // ---------------- 5.5 Percent composition ----------------
    ['5.5', 'The percents by mass of all the elements in a compound should add to…', '100 % (within rounding)', ['50 %', 'the molar mass', '1 %'], 'The elements are the parts of one whole.'],
    ['5.5', 'Which is the correct setup for the percent nitrogen in [[NH3]]?', '14.01 ÷ 17.04 × 100', ['14.01 ÷ 14.01 × 100', '1.01 ÷ 17.04 × 100', '17.04 ÷ 14.01 × 100'], 'Part (mass of N in one mole) over whole (molar mass of the compound), × 100.'],
    ['5.5', 'What mass of nitrogen is in 1 mole of [[Ca(NO3)2]]?', '28.02 g', ['14.01 g', '42.03 g', '84.00 g'], 'There are 2 N atoms: 2 × 14.01 = 28.02 g.'],
    ['5.5', 'A compound is 40.0 % carbon by mass. How many grams of carbon are in 50.0 g of the compound?', '20.0 g', ['40.0 g', '2.00 g', '12.5 g'], '0.400 × 50.0 g = 20.0 g.'],
    ['5.5', 'Which has the greater percent oxygen by mass: [[CO]] or [[CO2]]?', '[[CO2]]', ['[[CO]]', 'They are equal', 'Cannot be determined'], 'CO₂ is 32.00 ÷ 44.01 = 72.7 % oxygen; CO is 16.00 ÷ 28.01 = 57.1 %.'],
    ['5.5', 'What is the denominator when finding percent composition?', 'The molar mass of the whole compound', ['The atomic mass of the element', 'The mass of the other elements', '100'], 'Whole = the molar mass of the compound.'],
    ['5.5', 'Which has the greater percent hydrogen by mass: [[CH4]] or [[C2H6]]?', '[[CH4]]', ['[[C2H6]]', 'They are equal', 'Cannot be determined'], 'CH₄ is 4.04 ÷ 16.05 = 25.2 % H; C₂H₆ is 6.06 ÷ 30.07 = 20.2 % H.'],
    ['5.5', 'A student finds the percents for a compound to be 40 %, 20 % and 30 %. What should they do?', 'Recheck: the percents should add to 100 %.', ['Nothing, it is fine', 'Divide each by 2', 'Report 30 % for all'], 'A total of 90 % means an atom was missed or miscounted.'],
    ['5.5', 'Which statement about [[H2O]] and [[H2O2]] is correct?', '[[H2O2]] has the higher percent oxygen.', ['They have the same percent oxygen', '[[H2O]] has the higher percent oxygen', 'Percent oxygen depends on the sample size'], 'H₂O₂ is 94.06 % oxygen; H₂O is 88.79 %.'],
    ['5.5', 'Does the percent composition of a compound change with the size of the sample?', 'No: it is the same for a given compound.', ['Yes: larger samples have a bigger percent', 'Only for gases', 'Only for ionic compounds'], 'Percent composition is a property of the compound.'],
    ['5.5', 'Which expression gives the mass of oxygen in 1 mole of [[Al2(SO4)3]]?', '12 × 16.00 g', ['4 × 16.00 g', '3 × 16.00 g', '16.00 g'], 'There are 12 oxygen atoms per formula unit (4 × 3).'],
    ['5.5', 'How many hydrogen atoms are counted in the percent composition of [[(NH4)2SO4]]?', '8', ['2', '4', '6'], '2 × 4 = 8 hydrogen atoms in one formula unit.'],
    // ---------------- 5.6 Empirical and molecular formulas ----------------
    ['5.6', 'An empirical formula shows…', 'the simplest whole-number ratio of atoms', ['the actual number of atoms in a molecule', 'the molar mass', 'the shape of the molecule'], 'Empirical = simplest whole-number ratio.'],
    ['5.6', 'Which pair of compounds shares the empirical formula [[CH2]]?', '[[C2H4]] and [[C3H6]]', ['[[C2H6]] and [[C3H8]]', '[[CH4]] and [[C2H4]]', '[[C2H2]] and [[C6H6]]'], 'Both C₂H₄ and C₃H₆ have a 1 : 2 ratio of carbon to hydrogen.'],
    ['5.6', 'What is the empirical formula of [[C4H8]]?', '[[CH2]]', ['[[C4H8]]', '[[C2H4]]', '[[C4H2]]'], 'Divide every subscript by 4.'],
    ['5.6', 'What is the empirical formula of [[C6H6]]?', '[[CH]]', ['[[C6H6]]', '[[C3H3]]', '[[C2H2]]'], 'Divide every subscript by 6.'],
    ['5.6', 'Why do we change grams to moles when finding an empirical formula?', 'Atoms combine in whole-number ratios of moles, not of grams.', ['Moles are easier to weigh', 'Grams cannot be divided', 'To get the molar mass'], 'The ratio of atoms equals the ratio of moles.'],
    ['5.6', 'After dividing by the smallest, the ratio is 1 : 1.5. What should you do?', 'Multiply both numbers by 2 to get 2 : 3', ['Round 1.5 up to 2', 'Round 1.5 down to 1', 'Divide by 1.5'], 'A ratio of 1 : 1.5 is really 2 : 3. Rounding changes the compound.'],
    ['5.6', 'After dividing by the smallest, the ratio is 1 : 1.33. Which multiplier fixes it?', '3', ['2', '4', '5'], '1.33 × 3 is about 4, so 1 : 1.33 is 3 : 4.'],
    ['5.6', 'After dividing by the smallest, the ratio is 1 : 2.98. What should you do?', 'Round to 1 : 3', ['Multiply by 2', 'Multiply by 3', 'Divide by 3'], '2.98 is within rounding error of 3.'],
    ['5.6', 'A compound has the empirical formula [[CH2O]] and a molar mass of 90.08 g/mol. What is n?', '3', ['2', '1', '6'], '90.08 ÷ 30.03 = 3.'],
    ['5.6', 'How is the molecular formula related to the empirical formula?', 'The molecular formula is a whole-number multiple of the empirical formula.', ['They are always identical', 'The molecular formula is smaller', 'They are unrelated'], 'molecular = n × empirical.'],
    ['5.6', 'Which of these could be an empirical formula?', '[[Fe2O3]]', ['[[C2H4]]', '[[H2O2]]', '[[C6H6]]'], 'Fe₂O₃ cannot be simplified. C₂H₄ is CH₂, H₂O₂ is HO and C₆H₆ is CH.'],
    ['5.6', 'You are given percent composition. What is the first step?', 'Assume a 100 g sample so the percents become grams.', ['Divide each percent by 100 only', 'Multiply by Avogadro’s number', 'Find the molar mass'], '40.0 % becomes 40.0 g in a 100 g sample.'],
    // ---------------- 5.7 Hydrates ----------------
    ['5.7', 'What does the dot in [[CuSO4·5H2O]] mean?', 'Five water molecules are part of the crystal for each CuSO₄.', ['CuSO₄ is multiplied by 5', 'CuSO₄ and water are just mixed', '5 grams of water are added'], 'A hydrate has water built into its crystal.'],
    ['5.7', 'What is left after a hydrate is heated until its mass stops changing?', 'The anhydrous salt', ['Pure water', 'A different element', 'The original hydrate'], 'Anhydrous means “without water”.'],
    ['5.7', 'Which prefix means 6 water molecules?', 'hexa-', ['penta-', 'hepta-', 'tetra-'], '1 mono, 2 di, 3 tri, 4 tetra, 5 penta, 6 hexa, 7 hepta, 8 octa, 9 nona, 10 deca.'],
    ['5.7', 'What is the correct name for [[MgSO4·7H2O]]?', 'magnesium sulfate heptahydrate', ['magnesium sulfate sevenhydrate', 'magnesium(II) sulfate heptahydrate', 'magnesium sulfate hydrate seven'], 'Magnesium only forms 2+, so it needs no Roman numeral. The prefix for 7 is hepta-.'],
    ['5.7', 'Why is the mass of water divided by 18.02?', '18.02 g/mol is the molar mass of water.', ['It is the molar mass of the salt', 'It is Avogadro’s number', 'It is a rule with no reason'], 'Convert each substance with its own molar mass.'],
    ['5.7', 'A hydrate loses 36 % of its mass on heating. What is the percent water in the hydrate?', '36 %', ['64 %', '100 %', '18 %'], 'The mass that disappears is the water.'],
    ['5.7', 'Which is the correct formula for cobalt(II) chloride hexahydrate?', '[[CoCl2·6H2O]]', ['[[CoCl2·6H]]', '[[Co2Cl·6H2O]]', '[[CoCl2·H2O6]]'], 'Salt, a dot, the number of waters, then H₂O.'],
    ['5.7', 'A student stops heating while some water is still in the crucible. What happens to the calculated x?', 'It comes out too low.', ['It comes out too high', 'It is unchanged', 'It becomes negative'], 'Less mass is lost, so less water is counted.'],
    ['5.7', 'The mole ratio of water to salt is 4.97. What is x?', '5', ['4', '4.97', '6'], 'Round to the nearest whole number.'],
    ['5.7', 'The mole ratio of water to salt comes out as 4.2. What should the student do?', 'Check the data or reheat: the ratio should be almost a whole number.', ['Round to 4 and move on', 'Round to 5', 'Divide by 4.2'], '4.2 is not close to a whole number, so something is off.'],
    ['5.7', 'In a hydrate experiment, which gives the mass of water?', 'mass of hydrate − mass of anhydrous salt', ['mass of the crucible alone', 'mass of hydrate + mass of salt', 'mass of the anhydrous salt alone'], 'Heating drives off only the water.'],
    ['5.7', 'Which molar mass do you use for the salt in [[CuSO4·5H2O]] when finding the moles of salt?', '159.61 g/mol (CuSO₄ only)', ['249.71 g/mol', '18.02 g/mol', '90.10 g/mol'], 'Use the anhydrous salt. The water is counted separately.']
  ];
  const CONCEPT = RAW.map((r, i) => ({ id: 'c' + r[0].replace('.', '') + '-' + String(i % 12 + 1).padStart(2, '0'), topic: r[0], q: r[1], a: r[2], d: r[3], why: r[4], concept: true }));

  /* a concept question, with its choices shuffled */
  function conceptToMC(c) {
    const order = shuffle([c.a].concat(c.d)), answer = order.indexOf(c.a);
    return { id: c.id, topic: c.topic, q: c.q, choices: order, answer, why: c.why, concept: true, notes: order.map((x, i) => (i === answer ? 'Correct: ' + c.why : 'Not this one. ' + c.why)) };
  }

  /* ---------- multiple choice built from a generated problem ---------- */
  const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
  function pickDistinct(cands, correct, key, n) {
    const out = [];
    for (const c of cands) {
      if (!(isFinite(c.v) && c.v > 0)) continue;
      if (rel(c.v, correct) < 0.04) continue;
      if (out.some((o) => rel(o.v, c.v) < 0.04)) continue;
      out.push(c); if (out.length >= n) break;
    }
    return out;
  }
  function numericDistractors(p, b) {
    // returns { correct:number, fmt:(v)=>string, cands:[{v, note}] }
    const a = p.answer, sf = a.sf;
    if (b.route) {
      const route = b.route, v0 = C.parseNumber(b.spec.given.v), c = [];
      route.forEach((e, i) => {
        let flip = v0, skip = v0; route.forEach((f, j) => { flip *= j === i ? f.den.v / f.num.v : f.num.v / f.den.v; if (j !== i) skip *= f.num.v / f.den.v; });
        c.push({ v: flip, note: 'The ' + e.label + ' factor was upside down (multiplied instead of divided, or the reverse).' });
        if (route.length > 1) c.push({ v: skip, note: 'The ' + e.label + ' step was left out.' });
      });
      c.push({ v: b.raw * 10, note: 'The digits are right but the power of ten is off.' }, { v: b.raw / 10, note: 'The digits are right but the power of ten is off.' }, { v: b.raw * 2, note: 'A plausible number, but the units do not cancel to give it.' }, { v: b.raw / 2, note: 'A plausible number, but the units do not cancel to give it.' });
      return { correct: b.raw, fmt: (v) => C.fmtVal(v, sf).text + ' ' + a.unit, cands: c };
    }
    if (b.mb) {
      const c = [], tot = b.mb.total; b.mb.rows.forEach((r) => { c.push({ v: tot - r.sub, note: 'The ' + r.el + ' was left out.' }); if (r.n > 1) c.push({ v: tot - r.atomic, note: 'One ' + r.el + ' atom was lost: the subscript ' + r.n + ' must multiply the atomic mass.' }); c.push({ v: tot + r.atomic, note: 'An extra ' + r.el + ' atom was counted.' }); });
      if (b.groups && b.groups.length) { let t = 0; const walk = (k) => k.forEach((x) => { if (x.type === 'el') t += EL[x.el].mass * x.n; else walk(x.kids); }); walk(C.parseFormula(p.built.spec.f).parts[0].tree); c.unshift({ v: t, note: 'The number outside the parentheses was not multiplied through.' }); }
      c.push({ v: b.mb.rows.reduce((t, r) => t + r.atomic, 0), note: 'The subscripts were ignored: each element was counted once.' });
      return { correct: tot, fmt: (v) => C.roundDp(v, 2).toFixed(2) + ' g/mol', cands: c };
    }
    if (b.rows && b.comp && p.built.spec.only) {
      const t = b.rows.find((r) => r.el === p.built.spec.only), c = [];
      b.rows.filter((r) => r !== t).forEach((r) => c.push({ v: r.pct, note: 'That is the percent of ' + r.el + ', not ' + t.el + '.' }));
      if (t.n > 1) c.push({ v: t.atomic / b.comp.total * 100, note: 'Only ONE ' + t.el + ' atom was used; all ' + t.n + ' must be counted.' });
      c.push({ v: 100 - t.pct, note: 'That is the percent of everything except ' + t.el + '.' });
      return { correct: t.pct, fmt: (v) => C.roundDp(v, 2).toFixed(2) + ' %', cands: c };
    }
    if (b.spec && b.spec.mass !== undefined) {
      const m = C.parseNumber(b.spec.mass), pc = C.parseNumber(b.spec.pct), v = m * pc / 100;
      return { correct: v, fmt: (x) => C.fmtVal(x, sf).text + ' ' + a.unit, cands: [{ v: m * pc, note: 'The percent was not divided by 100.' }, { v: m * (100 - pc) / 100, note: 'That is the rest of the sample, not this element.' }, { v: m / pc, note: 'The sample was divided by the percent instead of multiplied by the decimal.' }, { v: pc / 100, note: 'That is just the decimal fraction; multiply by the mass of the sample.' }] };
    }
    if (b.xRaw !== undefined && a.unit === '%') return { correct: a.value, fmt: (v) => C.fmtVal(v, 3).text + ' %', cands: [{ v: 100 - a.value, note: 'That is the percent of anhydrous salt, not of water.' }, { v: b.mWater / b.mAnh * 100, note: 'The water was divided by the salt instead of the whole hydrate.' }, { v: a.value / 2, note: 'Only part of the water was counted.' }, { v: a.value * 1.5, note: 'Too much water was counted.' }] };
    if (b.xRaw !== undefined) { const x = a.value, c = []; [-1, 1, -2, 2].forEach((d) => { if (x + d >= 1) c.push({ v: x + d, note: 'x must be the NEAREST whole number to ' + b.xRaw.toFixed(2) + '.' }); }); c.push({ v: b.mWater / b.mAnh, note: 'It looks like grams of water were divided by grams of salt. Compare moles instead.' }); return { correct: x, fmt: (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(2)), cands: c, whole: true }; }
    if (b.pct !== undefined && b.steps) return { correct: b.pct, fmt: (v) => C.fmtVal(v, 3).text + ' %', cands: [{ v: 100 - b.pct, note: 'That is the percent of the anhydrous salt.' }, { v: b.pct / 2, note: 'Only half of the water was counted.' }, { v: b.pct * 1.4, note: 'Too much water was counted.' }] };
    return null;
  }
  function formulaDistractors(p, b) {
    const a = p.answer, want = a.formula, f = C.parseFormula(want), out = [];
    const mk = (pairs, note) => { const t = C.formulaString(pairs); if (t && !C.sameFormula(t, want) && !out.some((o) => C.sameFormula(o.f, t))) out.push({ f: t, note }); };
    const pairs = f.order.map((e) => ({ el: e, n: f.counts[e] }));
    if (b.res && b.res.mult > 1) mk(pairs.map((q, i) => ({ el: q.el, n: Math.max(1, Math.round(b.res.ratios[i])) })), 'A decimal like .5 was rounded to the next whole number instead of multiplying every ratio.');
    if (b.mol && b.mol.n > 1 && b.answer.empirical) { const e = C.parseFormula(b.answer.empirical); mk(e.order.map((x) => ({ el: x, n: e.counts[x] })), 'That is the empirical formula. Multiply every subscript by n = molar mass ÷ empirical mass.'); }
    if (b.mol) { [-1, 1].forEach((d) => { const n2 = b.mol.n + d; if (n2 >= 1) { const e = C.parseFormula(b.answer.empirical || C.formulaString(b.pairs)); mk(e.order.map((x) => ({ el: x, n: e.counts[x] * n2 })), 'n was ' + n2 + ' here; the molar mass divided by the empirical mass gives n = ' + b.mol.n + '.'); } }); }
    if (b.xRaw !== undefined) { [-1, 1, 2].forEach((d) => { if (b.x + d >= 1) out.push({ f: b.salt + '·' + (b.x + d > 1 ? b.x + d : '') + 'H2O', note: 'x was rounded wrongly: the ratio is ' + b.xRaw.toFixed(2) + ', so x = ' + b.x + '.' }); }); }
    pairs.forEach((q, i) => { if (pairs.length > 1) { const sw = pairs.map((z) => Object.assign({}, z)); sw[i].n = pairs[(i + 1) % pairs.length].n; sw[(i + 1) % pairs.length].n = pairs[i].n; mk(sw, 'The subscripts were swapped between two elements.'); } });
    mk(pairs.map((q) => ({ el: q.el, n: q.n * 2 })), 'Every subscript was doubled by mistake.');
    pairs.forEach((q, i) => { const p2 = pairs.map((z) => Object.assign({}, z)); p2[i].n += 1; mk(p2, 'The ratio for ' + q.el + ' is off by one.'); });
    return out;
  }
  const fmtF = (t) => C.fmtFormula(t);

  /* Turn a generated problem into a multiple-choice question (or null if it cannot be done well). */
  function mcFromProblem(p) {
    const b = p.built; let choices, answer, notes;
    if (p.kind === 'formula') {
      const ds = formulaDistractors(p, b).slice(0, 3); if (ds.length < 3) return null;
      const right = p.answer.formula, items = shuffle([{ f: right, note: null }].concat(ds));
      choices = items.map((x) => fmtF(x.f)); answer = items.findIndex((x) => x.note === null);
      notes = items.map((x) => (x.note === null ? 'Correct: ' + fmtF(right) + (b.name ? ' (' + b.name + ')' : '') : x.note));
    } else {
      const nd = numericDistractors(p, b); if (!nd) return null;
      const ds = pickDistinct(nd.cands, nd.correct, null, 3); if (ds.length < 3) return null;
      const fmt = nd.fmt, rightTxt = fmt(nd.correct); const items = shuffle([{ v: nd.correct, note: null }].concat(ds)), seen = {};
      for (const it of items) { it.txt = fmt(it.v); if (seen[it.txt]) return null; seen[it.txt] = 1; }
      choices = items.map((x) => x.txt); answer = items.findIndex((x) => x.note === null);
      notes = items.map((x) => (x.note === null ? 'Correct: ' + x.txt : x.note));
    }
    return { id: 'g:' + p.skill + ':' + p.statement.replace(/<[^>]+>/g, '').slice(0, 60), topic: p.topic, skill: p.skill, q: p.statement, choices, answer, notes, generated: true, steps: p.steps };
  }

  /* ---------- picking questions ---------- */
  const seen = new Set();
  function randomMC(o) {
    o = o || {}; const topics = o.topics && o.topics.length ? o.topics : ['5.1', '5.2', '5.3', '5.4', '5.5', '5.6', '5.7'], skip = o.exclude || seen;
    for (let guard = 0; guard < 40; guard++) {
      const useConcept = P.rng() < (o.conceptShare === undefined ? 0.4 : o.conceptShare);
      if (useConcept) {
        const pool = CONCEPT.filter((c) => topics.indexOf(c.topic) >= 0 && !skip.has(c.id));
        if (pool.length) { const c = pool[Math.floor(P.rng() * pool.length)]; skip.add(c.id); return conceptToMC(c); }
      }
      const skills = P.SKILL_LIST.filter((k) => topics.indexOf(P.SKILLS[k].topic) >= 0); if (!skills.length) break;
      const mc = mcFromProblem(P.generate(skills[Math.floor(P.rng() * skills.length)]));
      if (mc && !skip.has(mc.id)) { skip.add(mc.id); return mc; }
    }
    return null;
  }
  const forTopic = (topic, n, exclude) => { const out = [], ex = exclude || new Set(); for (let i = 0; i < n; i++) { const q = randomMC({ topics: [topic], exclude: ex }); if (q) out.push(q); } return out; };
  const info = () => ({ concept: CONCEPT.length, perTopic: 12, skills: P.SKILL_LIST.length, packet: Object.values(P.PACKET).reduce((t, l) => t + l.length, 0), compounds: new Set([].concat(D.POOL.molarMass, D.POOL.molecules, D.POOL.ionic, D.POOL.pct, D.POOL.gases)).size, hydrates: D.POOL.hydrates.length, formulas: D.POOL.empirical.length });

  const api = { CONCEPT, conceptToMC, mcFromProblem, randomMC, forTopic, info, resetSeen: () => seen.clear() };
  root.MolesBank = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
