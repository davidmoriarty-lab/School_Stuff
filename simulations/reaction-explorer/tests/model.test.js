/* tests/model.test.js: checks the chemistry and physics with no browser.
 *
 *   node simulations/reaction-explorer/tests/model.test.js
 *
 * It checks, for every reaction (forwards, reversed and catalysed):
 *   - the surface gives the intended activation energy and ΔH = bonds broken − bonds made;
 *   - Ea(reverse) = Ea − ΔH, and a catalyst lowers Ea without changing ΔH;
 *   - the reaction path is continuous and starts and ends on the right bond lengths;
 *   - a collision reacts if and only if it has more energy than the barrier;
 *   - energy is conserved in every frame;
 *   - a tilted molecule has a higher barrier, and the wrong end never reacts;
 *   - the transition state is early for exothermic and late for endothermic reactions;
 * and for the gas of many particles:
 *   - kinetic energy is shared equally between the three directions;
 *   - the kinetic energies follow the Maxwell–Boltzmann distribution;
 *   - the share of collisions with E ≥ Ea matches exp(−Ea/RT);
 *   - reactions conserve atoms, momentum and total energy.
 */
const path = require('path');
const js = (f) => path.join(__dirname, '..', 'js', f);
const M = require(js('model.js')), CD = require(js('chem-data.js'));
global.self = global; global.ChemData = CD; global.Model = M; global.Draw = {}; global.Graphs = {};
require(js('chamber.js'));
const { Chamber } = global.ChamberSim;

const problems = []; let checks = 0;
const expect = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
const near = (a, b, tol, msg) => expect(Math.abs(a - b) <= tol, msg + ' (got ' + a.toFixed(3) + ', wanted ' + b + ' ± ' + tol + ')');

// literature values the presets are meant to reproduce (kJ/mol)
const KNOWN = { F_H2: [6, -131], H_H2: [40, 0], Cl_H2: [23, 5], Br_H2: [76, 70], H_Cl2: [8, -188], CO_NO2: [134, -226], Cl_CH4: [16, 8], Br_CH4: [78, 73], SN2: [95, -77] };

for (const rx of CD.REACTIONS) {
  const sys = M.buildSystem(rx, CD.ELEMENTS, {});
  const id = rx.id;
  if (KNOWN[id]) { near(sys.Ea, KNOWN[id][0], 0.5, id + ': Ea'); near(sys.dH, KNOWN[id][1], 0.01, id + ': ΔH'); }
  near(sys.dH, sys.surface.BC.D - sys.surface.AB.D, 1e-9, id + ': ΔH = broken − made');
  near(sys.EaRev, sys.Ea - sys.dH, 1e-9, id + ': Ea(rev) = Ea − ΔH');

  const rev = M.buildSystem(rx, CD.ELEMENTS, { reverse: true });
  near(rev.Ea, sys.EaRev, 1.5, id + ': reversed reaction has Ea(rev)');
  near(rev.dH, -sys.dH, 1e-9, id + ': reversed ΔH flips sign');

  const cat = M.buildSystem(rx, CD.ELEMENTS, { catalyst: true });
  expect(cat.Ea < sys.Ea - 0.5, id + ': catalyst lowers Ea');
  near(cat.dH, sys.dH, 1e-9, id + ': catalyst leaves ΔH alone');
  expect(cat.Ea >= Math.max(0, sys.dH) - 0.5, id + ': catalysed Ea is not below ΔH');
  near(cat.EaUncat, sys.Ea, 0.01, id + ': catalysed system remembers the uncatalysed Ea');

  for (const s of [sys, rev, cat]) {
    const tag = id + (s.reversed ? ' (rev)' : s.catalyst ? ' (cat)' : '');
    const p = M.buildPath(s, 0);
    let jump = 0;
    for (let i = 1; i < p.N; i++) jump = Math.max(jump, Math.hypot(p.r1[i] - p.r1[i - 1], p.r2[i] - p.r2[i - 1]));
    expect(jump < 0.08, tag + ': path is continuous (largest step ' + jump.toFixed(3) + ' Å)');
    near(p.r2[0], s.surface.BC.re, 0.03, tag + ': starts with B–C at its bond length');
    near(p.r1[p.N - 1], s.surface.AB.re, 0.03, tag + ': ends with A–B at its bond length');
    near(p.V[0], 0, 4, tag + ': reactants at zero');
    near(p.vEnd, s.dH, 4, tag + ': products at ΔH');
    near(p.barrier, s.Ea, 0.3, tag + ': path barrier = Ea');

    // reacts if and only if the energy clears the barrier, and energy is conserved throughout
    for (const f of [0.3, 0.9, 1.1, 2.5]) {
      const E = Math.max(0.6, s.Ea * f + (f > 1 ? 1.5 : -0.5));
      const run = M.runCollision(p, E);
      expect(run.reacted === (E > s.Ea), tag + ': E = ' + E.toFixed(1) + ' vs Ea = ' + s.Ea.toFixed(1) + ' → reacted ' + run.reacted);
      let worst = 0;
      for (const fr of run.frames) worst = Math.max(worst, Math.abs(fr.V + fr.Evib + fr.KE - (run.E - p.V[0] + p.V[0])));
      expect(worst < 0.02 * Math.max(run.E, 10) + 1.5, tag + ': energy conserved (worst error ' + worst.toFixed(2) + ' kJ/mol)');
      expect(run.frames.length > 20 && run.frames.length < 6000, tag + ': sensible number of frames (' + run.frames.length + ')');
      expect(run.duration > 20 && run.duration < 3000, tag + ': lasts a believable time (' + run.duration.toFixed(0) + ' fs)');
      for (const fr of [run.frames[0], run.frames[run.iTop], run.frames[run.frames.length - 1]]) {
        const d = M.describe(p, fr);
        expect([d.rAB, d.rBC, d.rAC, d.nAB, d.nBC, d.F.AB, d.F.BC, d.F.AC, d.pos.A.x, d.pos.C.y].every(Number.isFinite), tag + ': frame values are finite');
        expect(d.nAB >= 0 && d.nAB <= 1 && d.nBC >= 0 && d.nBC <= 1, tag + ': bond orders between 0 and 1');
      }
      const d0 = M.describe(p, run.frames[0]), d1 = M.describe(p, run.frames[run.frames.length - 1]);
      expect(d0.nBC > 0.95 && d0.nAB < 0.05, tag + ': starts as A + B–C');
      if (run.reacted) expect(d1.nAB > 0.35 && d1.nBC < 0.05, tag + ': ends as A–B + C');   // the new bond is vibrating, so it may be caught stretched else expect(d1.nBC > 0.95, tag + ': a failed collision leaves B–C intact');
    }
    // orientation
    const b30 = M.barrierOf(s.surface, 30), b60 = M.barrierOf(s.surface, 60), b90 = M.barrierOf(s.surface, 90);
    expect(b30 >= s.Ea - 0.01 && b60 > b30 && b90 > b60, tag + ': barrier rises as the molecule is tilted (' + [s.Ea, b30, b60, b90].map(v => v.toFixed(0)).join(' < ') + ')');
    if (!s.homonuclear) {
      const wrong = M.buildPath(s, 180);
      expect(!M.runCollision(wrong, Math.max(s.Ea, 20) * 4).reacted, tag + ': hitting the wrong end never reacts');
    } else {
      const other = M.buildPath(M.swapEnds(s), 0);
      expect(M.runCollision(other, s.Ea * 1.3 + 2).reacted, tag + ': identical ends both react');
    }
  }
}

// Hammond postulate falls out of the surface: exothermic → early, reactant-like transition state
const ts = (id, o) => { const s = M.buildSystem(CD.REACTIONS.find(r => r.id === id), CD.ELEMENTS, o || {}); const p = M.buildPath(s, 0); return M.describe(p, { r1: p.r1[p.iTS], r2: p.r2[p.iTS] }).progress; };
expect(ts('F_H2') < 0.25, 'F + H₂ has an early transition state');
expect(ts('Br_H2') > 0.6, 'Br + H₂ has a late transition state');
near(ts('H_H2'), 0.5, 0.03, 'H + H₂ transition state is symmetric');
expect(ts('Cl_CH4') < ts('Br_CH4'), 'chlorination has an earlier transition state than bromination');
{ // H + H2 saddle point: both H–H distances about 0.93 Å in the literature
  const s = M.buildSystem(CD.REACTIONS.find(r => r.id === 'H_H2'), CD.ELEMENTS, {}), p = M.buildPath(s, 0);
  near(p.r1[p.iTS], 0.93, 0.03, 'H + H₂ transition-state bond length');
}
// custom reaction follows its sliders
for (const [Ea, dH] of [[20, -100], [60, 0], [120, 80], [10, -150], [150, 120]]) {
  const s = M.buildSystem(CD.REACTIONS.find(r => r.custom), CD.ELEMENTS, { customEa: Ea, customDH: dH });
  near(s.dH, dH, 1e-9, 'custom ΔH ' + dH); near(s.Ea, Math.max(Ea, Math.max(0, dH) + 2), 1, 'custom Ea ' + Ea);
}
// Maxwell–Boltzmann maths
{ let sum = 0; for (let E = 0.005; E < 200; E += 0.01) sum += M.mbEnergyPdf(E, 500) * 0.01; near(sum, 1, 0.01, 'MB distribution integrates to 1');
  let tail = 0; for (let E = 10.005; E < 300; E += 0.01) tail += M.mbEnergyPdf(E, 500) * 0.01; near(M.mbFractionAbove(10, 500), tail, 0.003, 'MB tail fraction'); }

// ---- the gas of many particles ----
{
  const sys = M.buildSystem(CD.REACTIONS.find(r => r.id === 'Cl_H2'), CD.ELEMENTS, {});
  const ch = new Chamber(sys, { thermostat: false, orient: false, allowReverse: false, countOnly: true });
  for (const p of ch.parts) p.vz = 0;                       // start with nothing in the hidden direction
  const T0 = ch.temperature();
  let kxy = 0, kz = 0, above = 0, tot = 0; const Etest = M.R_GAS * T0 * 2.5;
  for (let i = 0; i < 24000; i++) {
    ch.step(1 / 60);
    if (i > 4000) for (const p of ch.parts) { kxy += p.m * (p.vx * p.vx + p.vy * p.vy) / 2; kz += p.m * p.vz * p.vz; tot++; if (0.5 * p.m * (p.vx ** 2 + p.vy ** 2 + p.vz ** 2) >= Etest) above++; }
  }
  near(ch.temperature(), T0, 0.5, 'gas: energy conserved by collisions');
  near(kxy / kz, 1, 0.15, 'gas: equal energy in each direction');
  near(above / tot, M.mbFractionAbove(Etest, T0), 0.02, 'gas: Maxwell–Boltzmann tail');
  const frac = ch.stats.energy / ch.stats.coll, want = M.arrhenius(sys.Ea, T0);
  expect(ch.stats.coll > 2000 && frac > want * 0.65 && frac < want * 1.35, 'gas: collisions with E ≥ Ea ≈ exp(−Ea/RT) (' + frac.toFixed(4) + ' vs ' + want.toFixed(4) + ')');
}
for (const id of ['F_H2', 'Br_H2', 'SN2']) {
  const sys = M.buildSystem(CD.REACTIONS.find(r => r.id === id), CD.ELEMENTS, {});
  const ch = new Chamber(sys, { thermostat: false, orient: true, allowReverse: true });
  ch.reset(30, 30, 2500);
  const total = () => { let ke = 0, px = 0, py = 0; for (const p of ch.parts) { ke += 0.5 * p.m * (p.vx ** 2 + p.vy ** 2 + p.vz ** 2); px += p.m * p.vz; } const c = ch.counts(); return { E: ke + c.AB * sys.dH, pz: px, c }; };
  const a = total();
  for (let i = 0; i < 4000; i++) ch.step(1 / 60);
  const b = total();
  expect(ch.stats.eff > 0, id + ' gas: some collisions react (' + ch.stats.eff + ')');
  near(b.E, a.E, Math.abs(a.E) * 1e-6 + 1e-3, id + ' gas: kinetic + chemical energy conserved through reactions');
  near(b.pz, a.pz, 1e-6, id + ' gas: momentum conserved');
  expect(b.c.A + b.c.AB === 30 && b.c.BC + b.c.AB === 30 && b.c.C === b.c.AB, id + ' gas: atoms conserved');
  expect(ch.parts.every(p => p.x >= 0 && p.x <= ch.w && p.y >= 0 && p.y <= ch.h && Number.isFinite(p.vx)), id + ' gas: particles stay in the box');
}

if (problems.length) { console.error(problems.length + ' of ' + checks + ' checks FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('model: all ' + checks + ' checks passed');
