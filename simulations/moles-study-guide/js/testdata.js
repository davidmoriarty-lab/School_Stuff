/* testdata.js: the packet's own quick-check questions (two per topic). Pure data.
 *
 * Multiple choice: { id, q, choices[4], answer (0-3), notes[4], why }
 * Text uses [[formula]] for subscripts; scientific notation is written with Unicode superscripts.
 */
(function (root) {
  'use strict';
  const QUICK = {
    '5.1': [
      { id: 'q51a', q: 'Which sample contains the most particles?', choices: ['1 mol of iron', '1 mol of water', '1 mol of helium', 'They all contain the same number'], answer: 3, why: '1 mol of anything is 6.022 × 10²³ particles.' },
      { id: 'q51b', q: 'How many oxygen atoms are in 1 mol of [[O2]] molecules?', choices: ['6.022 × 10²³', '1.204 × 10²⁴', '3.011 × 10²³', '32'], answer: 1, why: '2 atoms per molecule × 6.022 × 10²³.' }
    ],
    '5.2': [
      { id: 'q52a', q: 'What is the molar mass of [[Ca(OH)2]]?', choices: ['57.09 g/mol', '74.10 g/mol', '58.10 g/mol', '73.09 g/mol'], answer: 1, why: '40.08 + 2(16.00) + 2(1.01) = 74.10.' },
      { id: 'q52b', q: 'What is the molar mass of [[O2]]?', choices: ['16.00 g/mol', '32.00 g/mol', '8.00 g/mol', '48.00 g/mol'], answer: 1, why: 'Oxygen is diatomic: 2 × 16.00 = 32.00 g/mol.' }
    ],
    '5.3': [
      { id: 'q53a', q: 'To convert grams of [[CO2]] to molecules of [[CO2]], the first step is to…', choices: ['multiply by 6.022 × 10²³', 'divide by the molar mass', 'multiply by 22.4', 'divide by 6.022 × 10²³'], answer: 1, why: 'Grams go to moles first.' },
      { id: 'q53b', q: 'What is the mass of 0.50 mol of [[H2O]]?', choices: ['9.0 g', '18 g', '36 g', '0.50 g'], answer: 0, why: '0.50 × 18.02 = 9.0 g.' }
    ],
    '5.4': [
      { id: 'q54a', q: 'Which has the greatest volume at STP?', choices: ['1.00 mol of [[N2]]', '28.02 g of [[N2]]', '6.022 × 10²³ molecules of [[N2]]', 'All three are the same'], answer: 3, why: 'Each is 1.00 mol of N₂ = 22.4 L.' },
      { id: 'q54b', q: 'Why can’t you use 22.4 L/mol for a gas at 25 °C?', choices: ['22.4 L/mol applies only at 0 °C and 1 atm', 'The gas has no molar mass at 25 °C', 'Moles change with temperature', '22.4 L/mol is only for noble gases'], answer: 0, why: '22.4 L/mol is the molar volume only at STP.' }
    ],
    '5.5': [
      { id: 'q55a', q: 'A 50.0 g sample of a compound is 20.0 % hydrogen by mass. How many grams of hydrogen are in the sample?', choices: ['2.5 g', '10.0 g', '20.0 g', '40.0 g'], answer: 1, why: '0.200 × 50.0 g = 10.0 g.' },
      { id: 'q55b', q: 'Which has the greater percent oxygen by mass?', choices: ['[[H2O]]', '[[H2O2]]', 'They are the same', 'Cannot be told'], answer: 1, why: 'H₂O₂: 32.00/34.02 = 94.06 %; H₂O: 16.00/18.02 = 88.79 %.' }
    ],
    '5.6': [
      { id: 'q56a', q: 'What is the empirical formula of [[C6H12O6]]?', choices: ['[[CHO]]', '[[CH2O]]', '[[C2H4O2]]', '[[C6H12O6]]'], answer: 1, why: 'Divide every subscript by 6.' },
      { id: 'q56b', q: 'A compound has the empirical formula CH and a molar mass of 78 g/mol. Its molecular formula is…', choices: ['CH', '[[C2H2]]', '[[C6H6]]', '[[C6H12]]'], answer: 2, why: '78 ÷ 13.02 = 6.' }
    ],
    '5.7': [
      { id: 'q57a', q: 'After a hydrate is heated, its mass decreases. The mass lost is the mass of…', choices: ['the salt', 'the water', 'the crucible', 'air'], answer: 1, why: 'Heating drives off the water.' },
      { id: 'q57b', q: 'Which is the correct name for [[CoCl2·6H2O]]?', choices: ['cobalt chloride hexahydrate', 'cobalt(II) chloride hexahydrate', 'cobalt(II) chloride sixhydrate', 'cobalt(II) chlorate hexahydrate'], answer: 1, why: 'Name the salt (with the Roman numeral), then the prefix + hydrate.' }
    ]
  };

  /* One question per topic: the quick diagnostic on the start page */
  const api = { QUICK };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.MolesTest = api;
})(typeof self !== 'undefined' ? self : this);
