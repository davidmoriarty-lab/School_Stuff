/* model.js: the physics behind the Reaction Explorer. No drawing happens here.
 *
 * 1. LEPS potential energy surface (London–Eyring–Polanyi–Sato) for three particles A, B, C.
 *    It is built from one Morse curve per pair, so reactant and product bond energies and
 *    bond lengths are exact, and a barrier appears between them on its own.
 * 2. Minimum-energy path: the easiest route over the surface from A + BC to AB + C.
 * 3. Calibration: one number (the Sato parameter S) is tuned so the barrier on the path
 *    equals the activation energy we want for that reaction.
 * 4. Reaction-path dynamics: the system moves along the path under Newton's laws,
 *    trading kinetic for potential energy. It crosses only if it has enough energy.
 *
 * Units: energy kJ/mol, distance Å, mass amu. That makes the time unit exactly 100 fs.
 */
(function (root) {
  'use strict';

  const TIME_UNIT_FS = 100;
  const R_GAS = 0.008314462;            // kJ/(mol K)
  const FORCE_NN = 0.0166054;           // 1 kJ/mol/Å in nanonewtons
  const R_FAR = 4.5;                    // Å: where a collision starts and ends
  const R_MIN = 0.35;
  const PAULING = 0.30;                 // Å: bond order n = exp(-(r - re)/PAULING)

  /* ---------- LEPS surface ---------- */

  function morseSinglet(m, r) {
    const e = Math.exp(-m.beta * (r - m.re));
    return m.D * (e * e - 2 * e);
  }
  function morseTriplet(m, r) {
    const e = Math.exp(-m.beta * (r - m.re));
    return 0.5 * m.D * (e * e + 2 * e);
  }

  /* Potential energy of the three particles (kJ/mol; zero = all three far apart). */
  function leps(sf, r1, r2, r3) {
    const k = sf.k;
    const s1 = morseSinglet(sf.AB, r1), t1 = k * morseTriplet(sf.AB, r1);
    const s2 = morseSinglet(sf.BC, r2), t2 = k * morseTriplet(sf.BC, r2);
    const s3 = morseSinglet(sf.AC, r3), t3 = k * morseTriplet(sf.AC, r3);
    const Q = 0.5 * (s1 + t1 + s2 + t2 + s3 + t3);
    const J1 = 0.5 * (s1 - t1), J2 = 0.5 * (s2 - t2), J3 = 0.5 * (s3 - t3);
    const ex = 0.5 * ((J1 - J2) * (J1 - J2) + (J2 - J3) * (J2 - J3) + (J3 - J1) * (J3 - J1));
    return Q - Math.sqrt(ex);
  }

  /* A–C distance when A–B–C is bent by theta degrees away from a straight line. */
  function r3of(r1, r2, thetaDeg) {
    const c = Math.cos(thetaDeg * Math.PI / 180);
    return Math.sqrt(Math.max(1e-6, r1 * r1 + r2 * r2 + 2 * r1 * r2 * c));
  }

  /* Energy relative to the reactants A + BC (so reactants sit at 0). */
  function energy(sf, r1, r2, thetaDeg) {
    return leps(sf, r1, r2, r3of(r1, r2, thetaDeg)) + sf.BC.D;
  }

  /* ---------- minimum-energy path ---------- */

  /* Sweep rays out of the far corner (R_FAR, R_FAR) of the (r1, r2) map. The lowest point
   * on each ray lies on the valley floor, so the collected points trace the path. */
  function rawPath(sf, thetaDeg) {
    const NRAY = 150, NSCAN = 110;
    const pts = [];
    let tPrev = null;
    for (let i = 0; i <= NRAY; i++) {
      const phi = (i / NRAY) * Math.PI / 2;
      const dx = -Math.sin(phi), dy = -Math.cos(phi);
      const tmax = (R_FAR - R_MIN) / Math.max(-dx, -dy);
      const f = (t) => energy(sf, R_FAR + dx * t, R_FAR + dy * t, thetaDeg);
      // coarse scan: take the local minimum closest to the previous ray's (keeps the path continuous)
      let best = -1, bestScore = Infinity;
      let prev = f(0), cur = f(tmax / NSCAN);
      for (let j = 1; j < NSCAN; j++) {
        const nxt = f(tmax * (j + 1) / NSCAN);
        if (cur <= prev && cur <= nxt) {
          const t = tmax * j / NSCAN;
          const score = tPrev === null ? cur : Math.abs(t - tPrev) * 1e3 + cur * 1e-3;
          if (score < bestScore) { bestScore = score; best = j; }
        }
        prev = cur; cur = nxt;
      }
      if (best < 0) best = NSCAN - 1;
      // golden-section refine
      let a = tmax * (best - 1) / NSCAN, b = tmax * (best + 1) / NSCAN;
      const g = 0.6180339887;
      let c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
      for (let it = 0; it < 22; it++) {
        if (fc < fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
        else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
      }
      const t = 0.5 * (a + b);
      tPrev = t;
      pts.push({ r1: R_FAR + dx * t, r2: R_FAR + dy * t, V: f(t) });
    }
    return pts;
  }

  /* Height of the barrier on the path (kJ/mol above the reactants). */
  function barrierOf(sf, thetaDeg) {
    const pts = rawPath(sf, thetaDeg || 0);
    let vmax = -Infinity;
    for (const p of pts) if (p.V > vmax) vmax = p.V;
    return vmax;
  }

  /* ---------- building a surface for a reaction ---------- */

  function makeSurface(AB, BC, AC, S) {
    return { AB, BC, AC, S, k: (1 - S) / (1 + S) };
  }

  /* Tune S so that the straight-line barrier equals EaTarget. A bigger S means a lower barrier. */
  function calibrate(AB, BC, AC, EaTarget) {
    let lo = -0.55, hi = 0.92;
    const fLo = barrierOf(makeSurface(AB, BC, AC, lo), 0);
    const fHi = barrierOf(makeSurface(AB, BC, AC, hi), 0);
    if (EaTarget >= fLo) return lo;
    if (EaTarget <= fHi) return hi;
    for (let i = 0; i < 26; i++) {
      const mid = 0.5 * (lo + hi);
      const f = barrierOf(makeSurface(AB, BC, AC, mid), 0);
      if (f > EaTarget) lo = mid; else hi = mid;
    }
    return 0.5 * (lo + hi);
  }

  const particleMass = (p, EL) => p.mass || EL[p.el].mass;
  const sameParticle = (p, q) => p.el === q.el && !p.deco && !q.deco;

  /* Turn a preset into a ready-to-use system.
   * opts: { reverse, catalyst, customEa, customDH }  */
  function buildSystem(rx, EL, opts) {
    opts = opts || {};
    let AB = rx.AB, BC = rx.BC, AC = rx.AC, EaT = rx.EaTarget;
    if (rx.custom) {
      const dH = opts.customDH === undefined ? -60 : opts.customDH;
      AB = Object.assign({}, AB, { D: BC.D - dH });
      EaT = Math.max(opts.customEa === undefined ? 40 : opts.customEa, Math.max(0, dH) + 2);
    }
    const dH = BC.D - AB.D;
    const floor = Math.max(0, dH);
    const S0 = calibrate(AB, BC, AC, EaT);
    let S = S0;
    if (opts.catalyst) S = calibrate(AB, BC, AC, floor + 0.45 * (EaT - floor));

    let sys = {
      id: rx.id, rx, mech: rx.mech, approx: !!rx.approx,
      A: rx.A, B: rx.B, C: rx.C,
      formulas: rx.formulas,
      chargeA0: rx.A.charge0 || 0, chargeC1: rx.C.charge1 || 0,
      surface: makeSurface(AB, BC, AC, S),
      reversed: !!opts.reverse, catalyst: !!opts.catalyst
    };
    if (opts.reverse) {
      sys.A = rx.C; sys.C = rx.A;
      sys.formulas = { A: rx.formulas.C, BC: rx.formulas.AB, AB: rx.formulas.BC, C: rx.formulas.A };
      sys.chargeA0 = rx.C.charge1 || 0; sys.chargeC1 = rx.A.charge0 || 0;
      sys.surface = makeSurface(BC, AB, AC, S);
    }
    sys.mA = particleMass(sys.A, EL); sys.mB = particleMass(sys.B, EL); sys.mC = particleMass(sys.C, EL);
    sys.homonuclear = sameParticle(sys.B, sys.C);
    sys.dH = sys.surface.BC.D - sys.surface.AB.D;
    sys.Ea = barrierOf(sys.surface, 0);
    sys.EaRev = sys.Ea - sys.dH;
    if (opts.catalyst) {
      const un = makeSurface(sys.surface.AB, sys.surface.BC, sys.surface.AC, S0);
      sys.EaUncat = barrierOf(un, 0);
      sys.uncatSurface = un;
    }
    sys.equation = sys.formulas.A + ' + ' + sys.formulas.BC + ' → ' + sys.formulas.AB + ' + ' + sys.formulas.C;
    return sys;
  }

  /* The same system with B and C trading names (used when A hits the other end of a
   * molecule whose two atoms are identical, like H–H). */
  function swapEnds(sys) {
    const s = Object.assign({}, sys);
    s.B = sys.C; s.C = sys.B; s.mB = sys.mC; s.mC = sys.mB;
    s.swapped = true;
    return s;
  }

  /* ---------- a path ready for dynamics ---------- */

  function resample(xs, cols, n) {
    // xs is increasing; returns n evenly spaced samples of each column
    const out = cols.map(() => new Float64Array(n));
    const x0 = xs[0], x1 = xs[xs.length - 1];
    let j = 0;
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * i / (n - 1);
      while (j < xs.length - 2 && xs[j + 1] < x) j++;
      const span = xs[j + 1] - xs[j];
      const f = span > 0 ? Math.min(1, Math.max(0, (x - xs[j]) / span)) : 0;
      for (let c = 0; c < cols.length; c++) out[c][i] = cols[c][j] + f * (cols[c][j + 1] - cols[c][j]);
    }
    return out;
  }

  /* thetaDeg: how far the B–C molecule is turned away from "B end facing A" (0 to 180).
   * Returns the route the atoms will follow and the energy along it. */
  function buildPath(sys, thetaDeg, opts) {
    opts = opts || {};
    const sf = sys.surface;
    const N = 500;
    const wrongEnd = thetaDeg > 90;   // caller has already swapped ends for homonuclear molecules
    let raw;
    if (!wrongEnd) {
      raw = rawPath(sf, thetaDeg);
    } else {
      // A runs into atom C: B–C keeps its length and A is simply pushed back.
      const tc = 180 - thetaDeg;
      raw = [];
      for (let i = 0; i <= 200; i++) {
        const rac = R_FAR - (R_FAR - 0.6) * i / 200;
        const rab = r3of(rac, sf.BC.re, tc);
        const V = leps(sf, rab, sf.BC.re, rac) + sf.BC.D;
        raw.push({ r1: rac, r2: sf.BC.re, V });
        if (V > 900) break;
      }
    }
    // plain arc length (for plotting) and mass-weighted arc length (for the dynamics)
    const M = sys.mA + sys.mB + sys.mC;
    const n = raw.length;
    const arc = new Float64Array(n), sm = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      const d1 = raw[i].r1 - raw[i - 1].r1, d2 = raw[i].r2 - raw[i - 1].r2;
      arc[i] = arc[i - 1] + Math.hypot(d1, d2);
      const mu = wrongEnd
        ? (sys.mA * (sys.mB + sys.mC) / M) * d1 * d1
        : (sys.mA * (sys.mB + sys.mC) * d1 * d1 + 2 * sys.mA * sys.mC * d1 * d2 + sys.mC * (sys.mA + sys.mB) * d2 * d2) / M;
      sm[i] = sm[i - 1] + Math.sqrt(Math.max(mu, 1e-12));
    }
    const [r1, r2, V, x] = resample(sm, [raw.map(p => p.r1), raw.map(p => p.r2), raw.map(p => p.V), arc], N);
    const sMax = sm[n - 1], ds = sMax / (N - 1);
    let iTS = 0;
    for (let i = 1; i < N; i++) if (V[i] > V[iTS]) iTS = i;
    const xMax = x[N - 1];
    const path = {
      sys, theta: thetaDeg, wrongEnd, N, ds, sMax, r1, r2, V, x, xMax, iTS,
      barrier: V[iTS], sTS: iTS * ds,
      reactive: !wrongEnd,
      vEnd: wrongEnd ? null : V[N - 1]
    };
    // Share of the downhill energy that ends up as vibration of the new bond.
    // Early barrier (reactant-like transition state) → more vibration (Polanyi's rule).
    let fv = 0;
    if (!wrongEnd && opts.vibration !== false) {
      const n1 = Math.min(1, Math.exp(-(r1[iTS] - sf.AB.re) / PAULING));
      const n2 = Math.min(1, Math.exp(-(r2[iTS] - sf.BC.re) / PAULING));
      const p = n1 / (n1 + n2);
      fv = 0.15 + 0.5 * (1 - p);
    }
    path.fv = fv;
    const Veff = new Float64Array(N), Ev = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      Ev[i] = (!wrongEnd && i > iTS) ? fv * Math.max(0, V[iTS] - V[i]) : 0;
      Veff[i] = V[i] + Ev[i];
    }
    path.Veff = Veff; path.Ev = Ev;
    return path;
  }

  function sample(arr, path, s) {
    const u = Math.min(path.N - 1, Math.max(0, s / path.ds));
    const i = Math.min(path.N - 2, Math.floor(u)), f = u - i;
    return arr[i] + f * (arr[i + 1] - arr[i]);
  }

  /* ---------- the collision itself ---------- */

  /* Run one collision with relative kinetic energy Ecoll (kJ/mol). The whole run is
   * computed up front so the animation can be paused, stepped and scrubbed.
   * Returns frames every dtOut time units, plus the outcome. */
  function runCollision(path, Ecoll, dtOutFs) {
    const dtOut = (dtOutFs || 0.5) / TIME_UNIT_FS;
    const h = dtOut / 10;
    const sf = path.sys.surface;
    const E = path.Veff[0] + Math.max(0.2, Ecoll);
    let s = 0, v = Math.sqrt(2 * (E - path.Veff[0]));
    const force = (ss) => {
      const e = path.ds * 0.5;
      return -(sample(path.Veff, path, ss + e) - sample(path.Veff, path, ss - e)) / (2 * e);
    };
    const kvib = 2 * sf.AB.D * sf.AB.beta * sf.AB.beta;          // Morse force constant of the new bond
    const muAB = path.sys.mA * path.sys.mB / (path.sys.mA + path.sys.mB);
    const omega = Math.sqrt(kvib / muAB);
    const frames = [];
    let t = 0, phase = 0, a = force(s), crossed = false, tTS = null, sMin = 0, done = false;
    const maxFrames = 6000;
    while (!done && frames.length < maxFrames) {
      const sc = Math.min(path.sMax, Math.max(0, s));
      const Vp = sample(path.V, path, sc), Evib = sample(path.Ev, path, sc);
      const amp = Math.min(0.3 * sf.AB.re, Math.sqrt(2 * Evib / kvib));
      frames.push({
        t: t * TIME_UNIT_FS, s: sc, v,
        r1: sample(path.r1, path, sc) + amp * Math.sin(phase),
        r2: sample(path.r2, path, sc),
        x: sample(path.x, path, sc) / path.xMax,
        V: Vp, Evib, KE: Math.max(0, E - Vp - Evib), amp
      });
      for (let k = 0; k < 10; k++) {
        const vh = v + 0.5 * h * a;
        s += h * vh;
        if (s <= 0 && vh < 0) { done = true; break; }
        if (s >= path.sMax) { done = true; break; }
        a = force(s);
        v = vh + 0.5 * h * a;
        t += h;
        if (s > path.sTS) { phase += omega * h; if (!crossed) { crossed = true; tTS = t * TIME_UNIT_FS; } }
        if (s > sMin) sMin = s;
      }
    }
    const reacted = path.reactive && s >= path.sMax * 0.98;
    let iClosest = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i].s > frames[iClosest].s) iClosest = i;
    // frame nearest the top of the hill (the transition state, or the turning point)
    let iTop = 0;
    for (let i = 1; i < frames.length; i++) if (frames[i].V > frames[iTop].V) iTop = i;
    let reason = 'reacted';
    if (!reacted) reason = path.wrongEnd ? 'orientation' : (path.theta > 25 && Ecoll >= path.sys.Ea ? 'orientation' : 'energy');
    return { frames, reacted, reason, E, Ecoll, iTop, iClosest, tTS, duration: frames[frames.length - 1].t, path };
  }

  /* ---------- geometry and derived quantities for one frame ---------- */

  /* Positions (Å) in the centre-of-mass frame. A always comes in from the left. */
  function positions(path, r1, r2) {
    const sys = path.sys, th = path.theta * Math.PI / 180;
    let A, B, C;
    if (!path.wrongEnd) {
      B = { x: 0, y: 0 }; A = { x: -r1, y: 0 };
      C = { x: r2 * Math.cos(th), y: r2 * Math.sin(th) };
    } else {
      const tc = Math.PI - th;
      C = { x: 0, y: 0 }; A = { x: -r1, y: 0 };
      B = { x: r2 * Math.cos(tc), y: -r2 * Math.sin(tc) };
    }
    const M = sys.mA + sys.mB + sys.mC;
    const cx = (sys.mA * A.x + sys.mB * B.x + sys.mC * C.x) / M;
    const cy = (sys.mA * A.y + sys.mB * B.y + sys.mC * C.y) / M;
    for (const p of [A, B, C]) { p.x -= cx; p.y -= cy; }
    return { A, B, C };
  }

  /* Everything the displays need to know about one instant. */
  function describe(path, fr) {
    const sf = path.sys.surface;
    let rAB, rBC, rAC;
    if (!path.wrongEnd) { rAB = fr.r1; rBC = fr.r2; rAC = r3of(fr.r1, fr.r2, path.theta); }
    else { rAC = fr.r1; rBC = fr.r2; rAB = r3of(fr.r1, fr.r2, 180 - path.theta); }
    const nAB = Math.min(1, Math.exp(-(rAB - sf.AB.re) / PAULING));
    const nBC = Math.min(1, Math.exp(-(rBC - sf.BC.re) / PAULING));
    const progress = path.wrongEnd ? 0 : nAB / (nAB + nBC);
    // push (+) or pull (−) along each pair of particles
    const e = 1e-4;
    const dV = (a, b, c) => leps(sf, a, b, c);
    const F = {
      AB: -(dV(rAB + e, rBC, rAC) - dV(rAB - e, rBC, rAC)) / (2 * e),
      BC: -(dV(rAB, rBC + e, rAC) - dV(rAB, rBC - e, rAC)) / (2 * e),
      AC: -(dV(rAB, rBC, rAC + e) - dV(rAB, rBC, rAC - e)) / (2 * e)
    };
    return { rAB, rBC, rAC, nAB, nBC, progress, F, pos: positions(path, fr.r1, fr.r2) };
  }

  /* Grid of energies for the contour map (relative to reactants). */
  function surfaceGrid(sys, thetaDeg, n, rmin, rmax) {
    const g = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      const r2 = rmin + (rmax - rmin) * j / (n - 1);
      for (let i = 0; i < n; i++) {
        const r1 = rmin + (rmax - rmin) * i / (n - 1);
        g[j * n + i] = energy(sys.surface, r1, r2, thetaDeg);
      }
    }
    return g;
  }

  /* ---------- Maxwell–Boltzmann helpers ---------- */

  function erfc(x) {
    const t = 1 / (1 + 0.3275911 * x);
    const y = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
    return y * Math.exp(-x * x);
  }
  /* Probability density of molecular kinetic energy E (kJ/mol) at temperature T (3-D gas). */
  function mbEnergyPdf(E, T) {
    const kT = R_GAS * T;
    return 2 / Math.sqrt(Math.PI) * Math.sqrt(E) / Math.pow(kT, 1.5) * Math.exp(-E / kT);
  }
  /* Fraction of molecules with kinetic energy of at least E. */
  function mbFractionAbove(E, T) {
    const x = E / (R_GAS * T);
    return erfc(Math.sqrt(x)) + 2 * Math.sqrt(x / Math.PI) * Math.exp(-x);
  }
  /* Fraction of collisions with at least Ea along the line of centres (the Arrhenius factor). */
  const arrhenius = (Ea, T) => Math.exp(-Ea / (R_GAS * T));

  const api = {
    TIME_UNIT_FS, R_GAS, FORCE_NN, R_FAR, R_MIN, PAULING,
    morseSinglet, leps, energy, r3of, rawPath, barrierOf, makeSurface, calibrate,
    buildSystem, swapEnds, buildPath, runCollision, positions, describe, surfaceGrid,
    mbEnergyPdf, mbFractionAbove, arrhenius
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Model = api;
})(typeof self !== 'undefined' ? self : this);
