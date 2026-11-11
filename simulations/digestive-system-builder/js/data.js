/* data.js: the parts students can place and the foods they can feed the system.
 *
 * PARTS
 *   kind 'tract'      a piece of the food tube. Food comes in through the left opening ("in") and
 *                     leaves through the right opening ("out"). The number is which row of the part
 *                     the opening is on (0 = top row). null means no opening on that side.
 *   kind 'accessory'  a gland, a group of cells or a vessel. It has no openings: it works on
 *                     whichever tract organ it is touching.
 *   w, h              size in grid cells.
 *   ticks             how long food spends inside (one tick is one step of the digestion model).
 *   max               how many copies the tray holds.
 *
 * FOODS: Calories from each nutrient, and grams of water, in one serving (rounded USDA values;
 * fibre is left out because humans cannot digest it).
 */
(function (root) {
  'use strict';

  const COLS = 18, ROWS = 6;

  const PARTS = {
    mouth:       { name: 'Mouth', kind: 'tract', w: 2, h: 2, in: null, out: 1, ticks: 24, max: 1,
                   info: 'Mouth: teeth grind food into small pieces (mechanical digestion) so enzymes have more surface to work on.' },
    esophagus:   { name: 'Esophagus', kind: 'tract', w: 2, h: 1, in: 0, out: 0, ticks: 10, max: 1,
                   info: 'Esophagus: a muscular tube that moves each swallowed bolus along by peristalsis. No digestion happens here.' },
    stomach:     { name: 'Stomach', kind: 'tract', w: 3, h: 2, in: 0, out: 0, ticks: 40, max: 1,
                   info: 'Stomach: churns food into liquid chyme and releases it a little at a time. Its lining holds chief cells and parietal cells.' },
    small:       { name: 'Small intestine', kind: 'tract', w: 4, h: 2, in: 0, out: 0, ticks: 80, max: 1,
                   info: 'Small intestine: where most chemical digestion and almost all nutrient absorption take place.' },
    large:       { name: 'Large intestine', kind: 'tract', w: 3, h: 2, in: 0, out: 0, ticks: 50, max: 1,
                   info: 'Large intestine: reclaims water from what is left over and compacts it into feces.' },
    anus:        { name: 'Rectum & anus', kind: 'tract', w: 1, h: 1, in: 0, out: null, ticks: 8, max: 1,
                   info: 'Rectum and anus: store feces and control when they leave the body.' },

    salivary:    { name: 'Salivary gland', kind: 'accessory', w: 1, h: 1, max: 1,
                   info: 'Salivary gland: secretes saliva, which moistens food and contains salivary amylase (starts starch digestion).' },
    chief:       { name: 'Chief cells', kind: 'accessory', w: 1, h: 1, max: 1,
                   info: 'Chief cells: secrete pepsinogen, the inactive form of the protein-digesting enzyme pepsin.' },
    parietal:    { name: 'Parietal cells', kind: 'accessory', w: 1, h: 1, max: 1,
                   info: 'Parietal cells: secrete hydrochloric acid (HCl), which unfolds proteins and activates pepsinogen.' },
    liver:       { name: 'Liver', kind: 'accessory', w: 2, h: 1, max: 1,
                   info: 'Liver: makes bile. Bile salts break fat into tiny droplets (emulsification).' },
    gallbladder: { name: 'Gallbladder', kind: 'accessory', w: 1, h: 1, max: 1,
                   info: 'Gallbladder: stores and concentrates bile from the liver, then releases it when a meal arrives.' },
    pancreas:    { name: 'Pancreas', kind: 'accessory', w: 2, h: 1, max: 1,
                   info: 'Pancreas: secretes pancreatic amylase, proteases (trypsin) and lipase, plus bicarbonate to neutralise acid.' },
    capillaries: { name: 'Capillaries', kind: 'accessory', w: 1, h: 1, max: 3,
                   info: 'Blood capillaries: carry absorbed sugars, amino acids and water away from the gut wall.' },
    lymph:       { name: 'Lymphatic vessels', kind: 'accessory', w: 1, h: 1, max: 2,
                   info: 'Lymphatic vessels (lacteals): carry absorbed fats, which are too large to enter blood capillaries.' }
  };
  const TRACT = ['mouth', 'esophagus', 'stomach', 'small', 'large', 'anus'];
  const ACCESSORY = ['salivary', 'chief', 'parietal', 'liver', 'gallbladder', 'pancreas', 'capillaries', 'lymph'];

  /* cc complex carbohydrate, su sugars, pr protein, fa fats (all Calories); w water (grams) */
  const FOODS = {
    apple:   { name: 'Apple',          icon: '🍎', color: '#d8433b', serving: '1 medium',        cc: 12,  su: 76, pr: 2,   fa: 3,   w: 156 },
    bread:   { name: 'Bread',          icon: '🍞', color: '#d9a55b', serving: '2 slices',        cc: 100, su: 12, pr: 20,  fa: 18,  w: 20 },
    chicken: { name: 'Chicken',        icon: '🍗', color: '#c98a4b', serving: '100 g, grilled',  cc: 0,   su: 0,  pr: 124, fa: 32,  w: 65 },
    cheese:  { name: 'Cheese',         icon: '🧀', color: '#f0b93a', serving: '50 g cheddar',    cc: 0,   su: 2,  pr: 50,  fa: 149, w: 18 },
    pizza:   { name: 'Pizza',          icon: '🍕', color: '#e0783c', serving: '1 slice',         cc: 128, su: 16, pr: 48,  fa: 90,  w: 50 },
    water:   { name: 'Glass of water', icon: '🥛', color: '#8fc7ee', serving: '240 mL',          cc: 0,   su: 0,  pr: 0,   fa: 0,   w: 240 }
  };

  /* a correct build, used by the tests and by the README (tube along row 2) */
  const EXAMPLE = [
    ['mouth', 0, 1], ['esophagus', 2, 2], ['stomach', 4, 2], ['small', 7, 2], ['large', 11, 2], ['anus', 14, 2],
    ['salivary', 0, 0], ['chief', 4, 1], ['parietal', 5, 1], ['pancreas', 7, 1], ['gallbladder', 9, 1], ['liver', 9, 0],
    ['capillaries', 7, 4], ['lymph', 8, 4], ['capillaries', 11, 4]
  ];

  const api = { COLS, ROWS, PARTS, TRACT, ACCESSORY, FOODS, EXAMPLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DigestData = api;
})(typeof self !== 'undefined' ? self : this);
