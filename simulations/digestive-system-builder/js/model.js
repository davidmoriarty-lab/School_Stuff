/* model.js: the logic behind the Digestive System Builder. No drawing happens here.
 *
 * 1. THE BOARD. A build is a list of placed parts: { uid, type, c, r } where (c, r) is the
 *    top-left grid cell. canPlace() says whether a part fits (on the board, not on top of another).
 *
 * 2. TRACING THE TUBE. analyze() starts at the mouth and follows the tube like a pipe: a part's
 *    exit opening must sit against the next part's entry opening. That gives the PATH food takes.
 *    It also works out which organ each gland / cell group / vessel is touching (its HOST).
 *
 * 3. DIGESTION. simulate() walks the food along the path. Inside each organ, for every tick,
 *    a small fraction of each nutrient is converted or absorbed, depending on what is attached:
 *
 *      complex carbs --amylase--> sugars        --capillaries--> blood
 *      protein       --pepsin, proteases--> amino acids --capillaries--> blood
 *      fats          --bile + lipase--> fatty acids     --lymphatic vessels--> lymph
 *      water                                            --capillaries--> blood
 *
 *    Water follows solutes: while a lot of unabsorbed nutrient is still in the gut it holds water
 *    there by osmosis, so water absorption slows down. That is what turns a bad build into diarrhea.
 *
 * 4. THE REPORT. findings() compares the build with a working digestive system and explains, in
 *    cause-and-effect form, everything that is missing, out of order or attached in the wrong place.
 */
(function (root) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DigestData;
  const { PARTS, FOODS, COLS, ROWS } = D;

  /* Fraction converted or absorbed per tick. Tuned so a correct build absorbs about 98% of the
     Calories and 98% of the water, and each mistake shows up clearly in the numbers. */
  const RATE = {
    salivaAmylase: 0.005,     // mouth, about 10% of starch in total
    pepsin: 0.0056,           // stomach, about 20% of protein in total
    enzyme: 0.060,            // pancreatic amylase / protease / lipase in the small intestine
    absorb: 0.075,            // sugars, amino acids, fatty acids
    waterSmall: 0.034,        // small intestine
    waterLarge: 0.050,        // large intestine
    noBile: 0.10, liverOnly: 0.55,       // lipase efficiency without bile / without a gallbladder
    notDenatured: 0.5,        // protease efficiency if stomach acid never unfolded the protein
    rushed: 0.4               // everything in the small intestine if food arrives as unchurned lumps
  };
  const SOLID = 90, LOOSE = 65;          // % of water absorbed: >= 90 solid, >= 65 loose, below watery

  /* ---------- the board ---------- */

  function cellsOf(p) {
    const d = PARTS[p.type], out = [];
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) out.push([p.c + x, p.r + y]);
    return out;
  }
  function occupancy(placed, ignoreUid) {
    const m = new Map();
    for (const p of placed) { if (p.uid === ignoreUid) continue; for (const [x, y] of cellsOf(p)) m.set(x + ',' + y, p); }
    return m;
  }
  function canPlace(placed, type, c, r, ignoreUid) {
    const d = PARTS[type];
    if (!d || c < 0 || r < 0 || c + d.w > COLS || r + d.h > ROWS) return false;
    const occ = occupancy(placed, ignoreUid);
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) if (occ.has((c + x) + ',' + (r + y))) return false;
    return true;
  }
  const countOf = (placed, type) => placed.filter(p => p.type === type).length;

  /* ---------- tracing the tube and the attachments ---------- */

  function analyze(placed) {
    const occ = occupancy(placed);
    const tract = placed.filter(p => PARTS[p.type].kind === 'tract');

    const path = [];
    let cur = tract.find(p => p.type === 'mouth');
    while (cur) {
      path.push(cur);
      const d = PARTS[cur.type];
      if (d.out == null) break;
      const nx = cur.c + d.w, ny = cur.r + d.out;            // the cell just outside the exit opening
      cur = tract.find(q => PARTS[q.type].in != null && q.c === nx && q.r + PARTS[q.type].in === ny && !path.includes(q));
    }

    /* For every accessory part: which parts share a cell edge with it, and which tract organ it
       touches most (ties go to the organ directly above or below it). */
    const attach = {};
    for (const a of placed) {
      if (PARTS[a.type].kind !== 'accessory') continue;
      const contact = new Map();
      for (const [x, y] of cellsOf(a)) {
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const q = occ.get((x + dx) + ',' + (y + dy));
          if (!q || q === a) continue;
          const e = contact.get(q) || { n: 0, v: 0, edge: { x: x + 0.5 + dx * 0.5, y: y + 0.5 + dy * 0.5 }, dir: [dx, dy] };
          e.n++; if (dy) e.v++;
          contact.set(q, e);
        }
      }
      let host = null, best = null;
      for (const [q, e] of contact) {
        if (PARTS[q.type].kind !== 'tract') continue;
        if (!best || e.n > best.n || (e.n === best.n && e.v > best.v)) { host = q; best = e; }
      }
      attach[a.uid] = { host, edge: best ? best.edge : null, dir: best ? best.dir : null, contact };
    }
    /* The liver may also deliver its bile through a gallbladder it touches. */
    for (const a of placed) {
      if (a.type !== 'liver') continue;
      for (const [q, e] of attach[a.uid].contact) {
        if (q.type === 'gallbladder') { attach[a.uid].viaGallbladder = q; attach[a.uid].gbEdge = e.edge; attach[a.uid].gbDir = e.dir; break; }
      }
    }
    return { path, attach, tract };
  }

  /* ---------- digestion ---------- */

  const KEYS = ['cc', 'su', 'pr', 'aa', 'fa', 'fy', 'w'];
  const lumenCal = s => s.cc + s.su + s.pr + s.aa + s.fa + s.fy;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  /* How freely water can be absorbed, from 0 (gut still full of unabsorbed nutrient) to 1. */
  const osmoticFactor = unabsorbedFraction => clamp01(1 - (unabsorbedFraction - 0.10) / 0.35);

  function simulate(placed, foodId) {
    const food = FOODS[foodId];
    const A = analyze(placed);
    if (!food) return { ok: false, error: 'no-food' };
    if (!A.path.length) return { ok: false, error: 'no-mouth' };

    /* what is attached to each organ on the path */
    const acc = {};
    for (const a of placed) {
      if (PARTS[a.type].kind !== 'accessory') continue;
      const h = A.attach[a.uid].host;
      if (h) { const o = acc[h.uid] = acc[h.uid] || {}; (o[a.type] = o[a.type] || []).push(a); }
    }
    const on = (host, type) => (acc[host.uid] && acc[host.uid][type]) || [];
    const liversFor = host => placed.filter(a => a.type === 'liver' && (A.attach[a.uid].host === host ||
      (A.attach[a.uid].viaGallbladder && A.attach[A.attach[a.uid].viaGallbladder.uid].host === host)));

    const s = { cc: food.cc, su: food.su, pr: food.pr, aa: 0, fa: food.fa, fy: 0, w: food.w, A_su: 0, A_aa: 0, A_fy: 0, A_w: 0 };
    const initial = Object.assign({}, s);
    const cal0 = lumenCal(s);
    const flags = { chyme: false, denatured: false, pepsin: false };
    const frames = [Object.assign({ seg: 0 }, s)];
    const segments = [];
    const move = (from, to, rate) => { const x = s[from] * rate; s[from] -= x; s[to] += x; };

    A.path.forEach((part, i) => {
      const d = PARTS[part.type];
      const seg = { uid: part.uid, type: part.type, start: frames.length - 1, ticks: d.ticks, notes: [], secretors: [], blood: [], lymph: [] };
      let step = () => {};

      if (part.type === 'mouth') {
        const sal = on(part, 'salivary');
        seg.notes.push('Mouth: teeth grind the food into small pieces (mechanical digestion).');
        if (sal.length) { seg.secretors.push(...sal); seg.notes.push('Saliva moistens it and salivary amylase starts breaking complex carbohydrates into sugars.'); }
        else seg.notes.push('No saliva: the food stays dry and no starch is digested here.');
        step = t => { if (sal.length && t > d.ticks * 0.3) move('cc', 'su', RATE.salivaAmylase * 1.45); };
      } else if (part.type === 'esophagus') {
        seg.notes.push('Esophagus: peristalsis squeezes the bolus along. No digestion happens here.');
      } else if (part.type === 'stomach') {
        const chief = on(part, 'chief'), par = on(part, 'parietal');
        const pepsin = chief.length && par.length;
        flags.chyme = true;
        if (par.length) flags.denatured = true;
        if (pepsin) flags.pepsin = true;
        seg.secretors.push(...chief, ...par);
        seg.notes.push('Stomach: muscular churning turns the food into liquid chyme.');
        seg.notes.push(pepsin ? 'HCl from the parietal cells activates pepsinogen from the chief cells: pepsin starts cutting up protein.'
          : chief.length ? 'Chief cells release pepsinogen, but with no acid it is never activated.'
          : par.length ? 'Parietal cells add acid, which unfolds proteins, but there is no pepsin to cut them.'
          : 'No chief or parietal cells: no acid and no pepsin, so no chemical digestion.');
        step = () => { if (pepsin) move('pr', 'aa', RATE.pepsin); };
      } else if (part.type === 'small') {
        const pan = on(part, 'pancreas'), gb = on(part, 'gallbladder'), liv = liversFor(part);
        const cap = on(part, 'capillaries'), lym = on(part, 'lymph');
        const bile = liv.length ? (gb.length ? 1 : RATE.liverOnly) : RATE.noBile;
        const speed = flags.chyme ? 1 : RATE.rushed;
        seg.secretors.push(...pan, ...(liv.length ? gb.concat(gb.length ? [] : liv) : []));
        seg.blood = cap; seg.lymph = lym;
        seg.notes.push('Small intestine: ' + (pan.length ? 'pancreatic amylase, proteases and lipase break nutrients into absorbable units'
          + (liv.length ? ', helped by bile, which emulsifies fat.' : '. No bile arrives, so fat is barely touched.')
          : 'no pancreatic enzymes arrive, so large molecules stay large.'));
        seg.notes.push((cap.length ? 'Capillaries take up sugars, amino acids and water. ' : 'No capillaries: sugars, amino acids and water stay in the gut. ')
          + (lym.length ? 'Lymphatic vessels take up fatty acids.' : 'No lymphatic vessels: fatty acids stay in the gut.'));
        if (!flags.chyme) seg.notes.push('The food arrived as unchurned lumps, so everything here works slowly.');
        step = () => {
          if (pan.length) {
            move('cc', 'su', RATE.enzyme * speed);
            move('pr', 'aa', RATE.enzyme * speed * (flags.denatured ? 1 : RATE.notDenatured));
            move('fa', 'fy', RATE.enzyme * speed * bile);
          }
          if (cap.length) {
            move('su', 'A_su', RATE.absorb * speed); move('aa', 'A_aa', RATE.absorb * speed);
            move('w', 'A_w', RATE.waterSmall * speed * osmoticFactor(cal0 ? lumenCal(s) / cal0 : 0));
          }
          if (lym.length) move('fy', 'A_fy', RATE.absorb * speed);
        };
      } else if (part.type === 'large') {
        const cap = on(part, 'capillaries');
        seg.blood = cap;
        seg.notes.push('Large intestine: ' + (cap.length ? 'water is reclaimed into the capillaries and the residue is compacted into feces.'
          : 'with no capillaries attached, no water can be reclaimed.'));
        step = () => { if (cap.length) move('w', 'A_w', RATE.waterLarge * osmoticFactor(cal0 ? lumenCal(s) / cal0 : 0)); };
      } else if (part.type === 'anus') {
        seg.notes.push('Rectum and anus: what is left is stored, then leaves the body.');
      }

      for (let t = 0; t < d.ticks; t++) { step(t); frames.push(Object.assign({ seg: i }, s)); }
      segments.push(seg);
    });

    const last = A.path[A.path.length - 1];
    const pct = (a, b) => b > 0 ? 100 * a / b : null;
    const result = {
      ok: true, food: foodId, path: A.path, segments, frames, initial, final: Object.assign({}, s),
      ended: last.type === 'anus' ? 'anus' : 'spill', lastType: last.type,
      pctCal: pct(s.A_su + s.A_aa + s.A_fy, cal0), pctWater: pct(s.A_w, food.w),
      groups: {
        carb: pct(s.A_su, food.cc + food.su), protein: pct(s.A_aa, food.pr),
        fat: pct(s.A_fy, food.fa), water: pct(s.A_w, food.w)
      }
    };
    result.stool = result.pctWater >= SOLID ? 'solid' : result.pctWater >= LOOSE ? 'loose' : 'watery';
    result.findings = findings(placed, A, acc, food, liversFor);
    const problems = result.findings.filter(f => f.level !== 'info').length;
    result.outcome = result.ended === 'spill' ? 'spill' : result.stool !== 'solid' ? 'diarrhea' : problems ? 'solid-problems' : 'healthy';
    result.why = explain(result, food);
    return result;
  }

  /* ---------- the report ---------- */

  function findings(placed, A, acc, food, liversFor) {
    const out = [];
    const cal0 = food.cc + food.su + food.pr + food.fa;
    const share = { carb: cal0 ? (food.cc + food.su) / cal0 : 0, starch: cal0 ? food.cc / cal0 : 0, protein: cal0 ? food.pr / cal0 : 0, fat: cal0 ? food.fa / cal0 : 0 };
    const NAMES = { carb: 'carbohydrate', starch: 'complex carbohydrate', protein: 'protein', fat: 'fat' };
    /* about: which nutrients the problem affects; 'all' and 'water' always matter */
    const add = (level, title, text, about) => {
      const f = { level, title, text, mattered: true };
      if (about && about !== 'all' && about !== 'water') {
        const list = [].concat(about);
        f.mattered = list.some(k => share[k] >= 0.05);
        if (!f.mattered) f.note = food.name + ' has almost no ' + list.map(k => NAMES[k]).join(' or ') + ', so this made little difference this time. Try a food that does.';
      }
      out.push(f);
    };
    const name = t => PARTS[t].name.toLowerCase();
    const types = A.path.map(p => p.type);
    const idx = t => types.indexOf(t);
    const onPath = new Set(A.path.map(p => p.uid));
    const last = A.path[A.path.length - 1];
    const on = (host, type) => (host && acc[host.uid] && acc[host.uid][type]) || [];
    const part = t => A.path.find(p => p.type === t);

    /* --- the tube --- */
    if (last.type !== 'anus') {
      add('major', 'The tube is open after the ' + name(last.type),
        'Nothing is joined to the exit of the ' + name(last.type) + ', so its contents spilled out there. Every organ must connect end to end, finishing with the rectum and anus.', 'all');
    }
    for (const p of A.tract) {
      if (!onPath.has(p.uid)) add('major', 'The ' + name(p.type) + ' is not connected',
        'It is on the board, but food never reached it. Its entry opening has to sit against the exit opening of the organ before it.', 'all');
    }
    if (idx('esophagus') < 0) {
      add('minor', 'No esophagus between the mouth and the rest of the tract',
        'The esophagus carries each swallowed bolus down by peristalsis, and its lower sphincter keeps stomach acid from splashing back up (reflux). It does no digestion, so the numbers barely change, but the body cannot work this way.', 'all');
    } else if (idx('esophagus') !== 1) {
      add('minor', 'The esophagus is out of place',
        'It is a transport tube that belongs directly after the mouth. Where it is now it does nothing useful.', 'all');
    }
    const si = idx('small'), st = idx('stomach'), li = idx('large');
    if (si >= 0 && (st < 0 || st > si)) {
      add('major', st < 0 ? 'No stomach before the small intestine' : 'The stomach comes after the small intestine',
        'Food reached the small intestine as unchurned lumps instead of liquid chyme, and all at once instead of a little at a time. Enzymes could only reach the outside of the lumps and the food was rushed through (as in dumping syndrome).'
        + (st > si ? ' Anything the stomach digests afterwards is too late to be absorbed.' : ''), 'all');
    } else if (si < 0 && st < 0 && onPath.size > 1) {
      add('major', 'No stomach', 'Nothing churned the food into chyme or began protein digestion.', 'all');
    }
    if (si < 0) {
      add('major', 'No small intestine',
        'Most chemical digestion and almost all absorption of nutrients happen in the small intestine. Without it the nutrients stayed in the gut and held water there.', 'all');
    }
    if (li < 0) {
      add('major', 'No large intestine',
        'The large intestine reclaims most of the water the small intestine leaves behind and compacts the residue into formed stool.', 'water');
    } else if (si > li) {
      add('major', 'The large intestine comes before the small intestine',
        'Food reached the large intestine still full of unabsorbed nutrients. Those hold water in the gut by osmosis, so very little water could be reclaimed, and the large intestine never gets a second chance once the nutrients are finally absorbed.', 'water');
    }

    /* --- glands, cells and vessels --- */
    const where = a => {
      const h = A.attach[a.uid].host;
      if (a.type === 'liver' && A.attach[a.uid].viaGallbladder) return 'touching a gallbladder';
      return h ? 'attached to the ' + name(h.type) : 'not touching any organ';
    };
    const stray = (type, hostType, why) => {          // copies that are not on a working host
      for (const a of placed.filter(p => p.type === type)) {
        const h = A.attach[a.uid].host;
        if (type === 'liver' && A.attach[a.uid].viaGallbladder) continue;
        const be = /s$/.test(type === 'lymph' ? 'vessels' : name(type)) ? ' are ' : ' is ';
        if (!h || !hostType.includes(h.type)) add('info', 'The ' + name(type) + be + where(a), why);
        else if (!onPath.has(h.uid)) add('info', 'The ' + name(type) + be + 'on an organ that food never reached', 'Connect the ' + name(h.type) + ' into the tube first.');
      }
    };
    const mouth = part('mouth'), stomach = part('stomach'), small = part('small'), large = part('large');

    if (!on(mouth, 'salivary').length) {
      add('minor', countOf(placed, 'salivary') ? 'The salivary gland is in the wrong place' : 'No salivary gland',
        'Saliva has to enter the mouth. It moistens the bolus for swallowing and its amylase begins starch digestion; stomach acid inactivates that enzyme further down. Here starch digestion did not begin until the small intestine.', 'starch');
    }
    if (stomach) {
      const c = on(stomach, 'chief').length, p = on(stomach, 'parietal').length;
      if (!c || !p) {
        add('minor', 'Pepsin was not active in the stomach',
          (!c && !p ? 'The stomach has neither chief cells nor parietal cells. ' : !c ? 'There are no chief cells on the stomach. ' : 'There are no parietal cells on the stomach. ')
          + 'Chief cells secrete pepsinogen, the inactive form of pepsin. Parietal cells secrete HCl, which converts pepsinogen into active pepsin and unfolds (denatures) proteins.'
          + (!p ? ' Without acid the proteins also stayed folded, which slows the pancreatic proteases later.' : ''), 'protein');
      }
    }
    if (small) {
      if (!on(small, 'pancreas').length) {
        add('major', countOf(placed, 'pancreas') ? 'The pancreas is not attached to the small intestine' : 'No pancreas',
          'Pancreatic amylase, proteases (trypsin, chymotrypsin) and lipase do most of the chemical digestion, and they only work at the near-neutral pH of the small intestine. Without them starch, protein and fat stayed as large molecules that cannot cross the intestinal wall.', ['starch', 'protein', 'fat']);
      }
      const liv = liversFor(small).length, gb = on(small, 'gallbladder').length;
      if (!liv) {
        add('major', gb ? 'The gallbladder has no liver to fill it' : 'No bile reached the small intestine',
          (gb ? 'The gallbladder only stores and concentrates bile; the liver makes it. With no liver touching the gallbladder or the small intestine, the gallbladder is empty. ' : '')
          + 'Bile salts emulsify fat into tiny droplets so that lipase can reach it. Without bile only a little of the fat was digested.', 'fat');
      } else if (!gb) {
        add('minor', 'No gallbladder on the small intestine',
          'Bile trickled in straight from the liver instead of being stored, concentrated and released when the meal arrived, so fat digestion was less complete.', 'fat');
      }
      if (!on(small, 'capillaries').length) {
        add('major', 'No capillaries on the small intestine',
          'Sugars, amino acids and water leave the villi through blood capillaries (on their way to the hepatic portal vein). With none attached they stayed in the gut.', 'all');
      }
      if (!on(small, 'lymph').length) {
        add('major', 'No lymphatic vessels on the small intestine',
          'Digested fats are packaged into chylomicrons, which are too large to enter blood capillaries. They leave through lymphatic vessels (lacteals) instead. Here the fat was digested but could not be absorbed.', 'fat');
      }
    }
    if (large && !on(large, 'capillaries').length) {
      add('major', 'No capillaries on the large intestine',
        'Water reclaimed by the large intestine has to pass into blood capillaries. With none attached, the water stayed in the stool.', 'water');
    }
    stray('salivary', ['mouth'], 'Saliva only works in the mouth.');
    stray('chief', ['stomach'], 'Chief cells are part of the stomach lining; pepsin only works in acid.');
    stray('parietal', ['stomach'], 'Parietal cells are part of the stomach lining.');
    stray('pancreas', ['small'], 'Pancreatic juice enters the first part of the small intestine (the duodenum).');
    stray('gallbladder', ['small'], 'Bile enters the first part of the small intestine (the duodenum).');
    stray('liver', ['small'], 'Bile from the liver has to reach the small intestine, directly or through the gallbladder.');
    stray('capillaries', ['small', 'large'], 'Almost all absorption into the blood happens in the small and large intestines.');
    stray('lymph', ['small'], 'Fat is only absorbed in the small intestine.');
    return out;
  }

  function explain(r, food) {
    const cal = r.pctCal == null ? null : Math.round(r.pctCal), water = Math.round(r.pctWater);
    if (r.outcome === 'healthy') return 'Every organ is connected in order, and every gland, cell group and vessel is where it can do its job.';
    if (r.outcome === 'solid-problems') return 'The stool was solid for this food, but the build is not a complete digestive system. Check the list below, then try a different food.';
    const stoolWord = r.stool === 'solid' ? 'fairly solid' : r.stool === 'loose' ? 'loose' : 'watery';
    const lead = r.outcome === 'spill' ? 'The food never made it to the end of the tract. What spilled out was ' + stoolWord + '. ' : '';
    if (r.stool === 'solid') return lead;
    if (cal != null && cal < 80) {
      return lead + (100 - cal) + '% of the Calories were still in the gut at the end. Unabsorbed nutrients hold water in the gut by osmosis, so only ' + water + '% of the water could be reclaimed: osmotic diarrhea.';
    }
    return lead + 'The nutrients were absorbed, but only ' + water + '% of the water was reclaimed, so the stool stayed ' + stoolWord + '.';
  }

  const api = { RATE, SOLID, LOOSE, KEYS, cellsOf, canPlace, countOf, analyze, simulate, osmoticFactor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DigestModel = api;
})(typeof self !== 'undefined' ? self : this);
