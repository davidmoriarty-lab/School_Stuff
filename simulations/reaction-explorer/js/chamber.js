/* chamber.js: many particles in a box. Shows how temperature, concentration, orientation and a
 * catalyst change the rate, with a live Maxwell–Boltzmann distribution and amounts vs. time.
 *
 * Each particle carries a full 3-D velocity (the screen shows the x–y part), so kinetic
 * energies follow the real 3-D Maxwell–Boltzmann distribution. A + BC react when the
 * energy along the line of centres is at least Ea (and the orientation is right).
 * Speeds are in km/s, energies in kJ/mol, masses in amu, so KE = ½ m v² needs no factors.
 */
(function (root) {
  'use strict';
  const M = root.Model, EL = root.ChemData.ELEMENTS;
  const R = M.R_GAS;
  const SPECIES = ['A', 'BC', 'AB', 'C'];
  const atomPx = (el) => 5 + 9 * EL[el].rcov;

  function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  class Chamber {
    constructor(sys, opts) {
      this.sys = sys; this.opts = opts; this.w = 900; this.h = 320;
      const ra = atomPx(sys.A.el), rb = atomPx(sys.B.el), rc = atomPx(sys.C.el);
      this.shape = {
        A: { m: sys.mA, r: ra, atoms: [[sys.A.el, 0, ra]] },
        C: { m: sys.mC, r: rc, atoms: [[sys.C.el, 0, rc]] },
        // molecules: the B end points along +x of the particle's own frame
        BC: { m: sys.mB + sys.mC, r: (rb + rc) * 0.78, atoms: [[sys.B.el, (rb + rc) * 0.42 * (rc / (rb + rc)) * 2, rb], [sys.C.el, -(rb + rc) * 0.42 * (rb / (rb + rc)) * 2, rc]] },
        AB: { m: sys.mA + sys.mB, r: (ra + rb) * 0.78, atoms: [[sys.B.el, (ra + rb) * 0.42 * (ra / (ra + rb)) * 2, rb], [sys.A.el, -(ra + rb) * 0.42 * (rb / (ra + rb)) * 2, ra]] }
      };
      this.T0 = Chamber.defaultT(sys);
      const mMin = Math.min(sys.mA, sys.mC, sys.mB + sys.mC, sys.mA + sys.mB);
      this.pxPerKm = 170 / Math.sqrt(3 * R * this.T0 / mMin);   // lightest particle crosses ~170 px/s at T0
      this.reset(30, 30, this.T0);
    }
    static defaultT(sys) {
      return Math.max(300, Math.min(2500, Math.round(Math.max(sys.Ea, 1) / (R * 2.6) / 50) * 50));
    }
    setSystem(sys) { this.sys = sys; }   // e.g. catalyst switched on: same particles, new Ea

    spawn(sp, T) {
      const s = this.shape[sp], sd = Math.sqrt(R * T / s.m);
      return { sp, m: s.m, r: s.r, x: s.r + Math.random() * (this.w - 2 * s.r), y: s.r + Math.random() * (this.h - 2 * s.r),
        vx: gauss() * sd, vy: gauss() * sd, vz: gauss() * sd, ang: Math.random() * 6.283, spin: (Math.random() - 0.5) * 5 };
    }
    reset(nA, nBC, T) {
      this.targetT = T; this.t = 0; this.parts = [];
      for (let i = 0; i < nA; i++) this.parts.push(this.spawn('A', T));
      for (let i = 0; i < nBC; i++) this.parts.push(this.spawn('BC', T));
      this.flashes = []; this.history = []; this.lastSample = -1;
      this.stats = { coll: 0, energy: 0, eff: 0, rev: 0 };
      this.last = null; this.hist = null; this.histT = -1; this.tempAvg = T;
      this.sample();
    }
    counts() { const c = { A: 0, BC: 0, AB: 0, C: 0 }; for (const p of this.parts) c[p.sp]++; return c; }
    temperature() {
      let ke = 0; for (const p of this.parts) ke += 0.5 * p.m * (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      return this.parts.length ? (2 / 3) * ke / this.parts.length / R : this.targetT;
    }
    setTemperature(T) {
      const now = this.temperature(), k = Math.sqrt(T / Math.max(now, 1));
      for (const p of this.parts) { p.vx *= k; p.vy *= k; p.vz *= k; }
      this.targetT = T;
    }
    setCount(sp, n) {
      const have = this.parts.filter(p => p.sp === sp);
      if (have.length > n) { let drop = have.length - n; this.parts = this.parts.filter(p => !(p.sp === sp && drop-- > 0)); }
      else for (let i = have.length; i < n; i++) this.parts.push(this.spawn(sp, this.temperature()));
    }
    sample() {
      const c = this.counts(); this.history.push({ t: this.t, A: c.A, BC: c.BC, AB: c.AB, C: c.C, T: this.temperature() });
      if (this.history.length > 4000) this.history.splice(0, 2);
      this.lastSample = this.t;
    }

    /* Advance by dt seconds of screen time. */
    step(dt) {
      const o = this.opts;
      const vmax = this.parts.reduce((a, p) => Math.max(a, Math.hypot(p.vx, p.vy)), 0.001) * this.pxPerKm;
      const sub = Math.min(40, Math.max(1, Math.ceil(vmax * dt / 1.5)));   // small steps: particles never jump far into each other
      const h = dt / sub;
      for (let s = 0; s < sub; s++) {
        for (const p of this.parts) {
          p.x += p.vx * this.pxPerKm * h; p.y += p.vy * this.pxPerKm * h; p.ang += p.spin * h;
          if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); } else if (p.x > this.w - p.r) { p.x = this.w - p.r; p.vx = -Math.abs(p.vx); }
          if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); } else if (p.y > this.h - p.r) { p.y = this.h - p.r; p.vy = -Math.abs(p.vy); }
        }
        const P = this.parts, n = P.length;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
          const a = P[i], b = P[j], dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
          if (dx * dx + dy * dy < rr * rr) this.collide(a, b, dx, dy);
        }
        this.t += h;
      }
      if (o.thermostat) {
        const T = this.temperature(), lam = Math.sqrt(1 + Math.min(1, dt / 0.35) * (this.targetT / Math.max(T, 1) - 1));
        for (const p of this.parts) { p.vx *= lam; p.vy *= lam; p.vz *= lam; }
      }
      this.tempAvg += (this.temperature() - this.tempAvg) * Math.min(1, dt * 3);
      if (this.t - this.lastSample >= 0.2) this.sample();
      if (this.t - this.histT >= 0.1) this.updateHist();
      this.flashes = this.flashes.filter(f => this.t - f.t < 0.9);
    }

    collide(a, b, dx, dy) {
      const d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
      const rvx = b.vx - a.vx, rvy = b.vy - a.vy, rvz = b.vz - a.vz;
      if (rvx * nx + rvy * ny >= 0) return;                 // already moving apart on screen
      const n3 = [nx, ny, 0], vn = rvx * nx + rvy * ny;
      const mu = a.m * b.m / (a.m + b.m);
      const Eloc = 0.5 * mu * vn * vn;
      // separate the pair so they do not stick
      const ov = (a.r + b.r - d) / 2 + 0.01;
      a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;

      const sys = this.sys, o = this.opts;
      let atom = null, mol = null;
      if ((a.sp === 'A' && b.sp === 'BC') || (a.sp === 'C' && b.sp === 'AB')) { atom = a; mol = b; }
      else if ((b.sp === 'A' && a.sp === 'BC') || (b.sp === 'C' && a.sp === 'AB')) { atom = b; mol = a; }
      if (atom) {
        const fwd = atom.sp === 'A';
        const Ea = fwd ? sys.Ea : sys.EaRev, dH = fwd ? sys.dH : -sys.dH;
        const tx = atom.x - mol.x, ty = atom.y - mol.y, tl = Math.hypot(tx, ty) || 1;
        let cosB = (Math.cos(mol.ang) * tx + Math.sin(mol.ang) * ty) / tl;   // +1: atom hit the B end
        const homo = fwd ? sys.homonuclear : (sys.A.el === sys.B.el && !sys.A.deco && !sys.B.deco);
        if (homo) cosB = Math.abs(cosB);
        const okE = Eloc >= Math.max(Ea, 0), okO = !o.orient || cosB > 0.5;
        const allowed = fwd || o.allowReverse;
        if (fwd) {
          this.stats.coll++; if (okE) this.stats.energy++;
          this.last = { Eloc, angle: Math.round(Math.acos(Math.max(-1, Math.min(1, cosB))) * 180 / Math.PI / 5) * 5, reacted: okE && okO };
        }
        if (okE && okO && allowed && !o.countOnly) {     // countOnly: used by the tests
          if (fwd) this.stats.eff++; else this.stats.rev++;
          this.react(atom, mol, fwd, dH, n3, vn, atom === a ? 1 : -1);
          this.flashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: this.t, kind: fwd ? 'ok' : 'rev' });
          return;
        }
        if (fwd) this.flashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: this.t, kind: okE ? 'orient' : 'energy' });
      }
      // ordinary bounce along the line of centres...
      const J = 2 * mu * vn;
      a.vx += J / a.m * nx; a.vy += J / a.m * ny;
      b.vx -= J / b.m * nx; b.vy -= J / b.m * ny;
      // ...then a random twist about that line, which shares energy with the hidden third
      // dimension (the part of the motion toward and away from the viewer)
      const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty, phi = Math.random() * 6.2832, cs = Math.cos(phi), sn = Math.sin(phi);
      const dt2 = (vt * cs - rvz * sn) - vt, dz = (vt * sn + rvz * cs) - rvz;
      const fa = b.m / (a.m + b.m), fb = a.m / (a.m + b.m);
      a.vx -= fa * dt2 * tx; a.vy -= fa * dt2 * ty; a.vz -= fa * dz;
      b.vx += fb * dt2 * tx; b.vy += fb * dt2 * ty; b.vz += fb * dz;
      a.spin += (Math.random() - 0.5) * 2; b.spin += (Math.random() - 0.5) * 2;
    }

    /* atom + molecule → new molecule + new atom. Momentum and total energy are conserved:
     * the heat of reaction goes into (or comes out of) the motion of the two products. */
    react(atom, mol, fwd, dH, n3, vn, sign) {
      const sys = this.sys;
      const Mt = atom.m + mol.m;
      const Vx = (atom.m * atom.vx + mol.m * mol.vx) / Mt, Vy = (atom.m * atom.vy + mol.m * mol.vy) / Mt, Vz = (atom.m * atom.vz + mol.m * mol.vz) / Mt;
      // relative velocity (molecule minus atom), reflected off the contact normal
      let rx = mol.vx - atom.vx, ry = mol.vy - atom.vy, rz = mol.vz - atom.vz;
      const vnn = rx * n3[0] + ry * n3[1] + rz * n3[2];
      const mu = atom.m * mol.m / Mt, Erel = 0.5 * mu * (rx * rx + ry * ry + rz * rz);
      rx -= 2 * vnn * n3[0]; ry -= 2 * vnn * n3[1]; rz -= 2 * vnn * n3[2];
      const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
      const newMol = this.shape[fwd ? 'AB' : 'BC'], newAtom = this.shape[fwd ? 'C' : 'A'];
      const mu2 = newMol.m * newAtom.m / Mt, sp = Math.sqrt(2 * Math.max(0, Erel - dH) / mu2);
      // the new atom leaves from the far side of the molecule
      const ux = mol.x - atom.x, uy = mol.y - atom.y, ul = Math.hypot(ux, uy) || 1;
      const far = { x: mol.x + ux / ul * (newMol.r * 0.4 + newAtom.r), y: mol.y + uy / ul * (newMol.r * 0.4 + newAtom.r) };
      const mid = { x: (atom.x + mol.x) / 2, y: (atom.y + mol.y) / 2 };
      Object.assign(mol, { sp: fwd ? 'C' : 'A', m: newAtom.m, r: newAtom.r, x: far.x, y: far.y,
        vx: Vx + newMol.m / Mt * rx * sp, vy: Vy + newMol.m / Mt * ry * sp, vz: Vz + newMol.m / Mt * rz * sp });
      Object.assign(atom, { sp: fwd ? 'AB' : 'BC', m: newMol.m, r: newMol.r, x: mid.x, y: mid.y,
        vx: Vx - newAtom.m / Mt * rx * sp, vy: Vy - newAtom.m / Mt * ry * sp, vz: Vz - newAtom.m / Mt * rz * sp });
      // in the new molecule the B end faces where the old molecule was
      atom.ang = Math.atan2(uy, ux);
      for (const p of [atom, mol]) { p.x = Math.max(p.r, Math.min(this.w - p.r, p.x)); p.y = Math.max(p.r, Math.min(this.h - p.r, p.y)); }
    }

    energyMax() { return Math.max(30, Math.min(420, Math.round(Math.max(this.sys.Ea, this.sys.EaUncat || 0) * 1.7 / 10) * 10)); }
    updateHist() {
      const nb = 32, Emax = this.energyMax(), h = new Float32Array(nb);
      for (const p of this.parts) {
        const ke = 0.5 * p.m * (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz), k = Math.floor(ke / Emax * nb);
        if (k < nb) h[k] += 1;
      }
      const norm = this.parts.length * (Emax / nb) || 1;
      if (!this.hist || this.hist.length !== nb || this.histEmax !== Emax) { this.hist = h.map(v => v / norm); this.histEmax = Emax; }
      else for (let i = 0; i < nb; i++) this.hist[i] += (h[i] / norm - this.hist[i]) * 0.08;
      this.histT = this.t;
    }
  }

  /* ---------- drawing ---------- */
  const D = root.Draw, G = root.Graphs;
  const spColor = (th) => ({ A: th.ke, BC: th.brk, AB: th.form, C: th.cc });

  function drawBox(canvas, ch, opts) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), ts = th.scale;
    const top = 46 * ts;                                    // room for the legend
    ch.w = w; ch.h = Math.max(60, h - top);
    ctx.save(); ctx.translate(0, top);
    ctx.strokeStyle = th.line; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, ch.h - 2);
    const cols = spColor(th), Ea = ch.sys.Ea;
    for (const p of ch.parts) {
      const ke = 0.5 * p.m * (p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      if (opts.trails && ke >= Ea) {
        const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.6, p.x, p.y, p.r * 2.3);
        g.addColorStop(0, D.rgba(th.ke, 0.55)); g.addColorStop(1, D.rgba(th.ke, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.3, 0, 7); ctx.fill();
      }
      const c = Math.cos(p.ang), s = Math.sin(p.ang);
      for (const [el, off, r] of ch.shape[p.sp].atoms) {
        const x = p.x + c * off, y = p.y + s * off;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = EL[el].color; ctx.fill();
        ctx.lineWidth = 2.2; ctx.strokeStyle = cols[p.sp]; ctx.stroke();
      }
    }
    if (opts.flashes) for (const f of ch.flashes) {
      const age = (ch.t - f.t) / 0.9, a = 1 - age;
      ctx.lineWidth = f.kind === 'ok' || f.kind === 'rev' ? 3.5 : 1.5;
      ctx.strokeStyle = D.rgba(f.kind === 'ok' ? th.good : f.kind === 'rev' ? th.accent : th.muted, a * (f.kind === 'ok' || f.kind === 'rev' ? 1 : 0.6));
      ctx.beginPath(); ctx.arc(f.x, f.y, (f.kind === 'ok' || f.kind === 'rev' ? 10 + 34 * age : 6 + 12 * age), 0, 7); ctx.stroke();
      if (f.kind === 'ok' && age < 0.7) D.text(ctx, '✔ reacted', f.x, f.y - 22 - 14 * age, { size: 12 * ts, weight: 700, align: 'center', color: D.rgba(th.good, a), halo: D.rgba(th.panel, a * 0.8) });
    }
    ctx.restore();
  }

  /* Maxwell–Boltzmann: bars = the particles on screen right now, curve = theory. */
  function mb(canvas, ch, st) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), sys = ch.sys, T = ch.tempAvg, Emax = ch.energyMax();
    const peak = (TT) => M.mbEnergyPdf(0.5 * R * TT, TT);
    st.ymax = Math.max(st.ymax || 0, peak(T) * 1.2, st.pin ? peak(st.pin) * 1.2 : 0);
    const xr = [0, Emax], yr = [0, st.ymax];
    const f = G.frame(ctx, w, h, th, { l: 30, r: 16, t: 12, b: 32 }, xr, yr), ts = f.ts;
    const halo = D.rgba(th.panel, 0.9);
    ctx.save(); ctx.strokeStyle = th.ink2; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(f.L, f.T); ctx.lineTo(f.L, f.B); ctx.lineTo(f.R, f.B); ctx.stroke(); ctx.restore();
    for (const v of D.ticks(0, Emax, 6)) D.text(ctx, D.fmt(v, 0), f.x(v), f.B + 13 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
    D.text(ctx, 'Kinetic energy of a molecule (kJ/mol)', (f.L + f.R) / 2, f.B + 27 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    ctx.save(); ctx.translate(13 * ts, (f.T + f.B) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, 'Number of molecules', 0, 0, { size: 11.5 * ts, align: 'center', base: 'middle', color: th.ink2, fixed: true }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(f.L, f.T - 4, f.R - f.L, f.B - f.T + 4); ctx.clip();
    // live histogram
    if (ch.hist) {
      const nb = ch.hist.length, bw = (f.R - f.L) / nb;
      ctx.fillStyle = D.rgba(th.muted, 0.35);
      for (let i = 0; i < nb; i++) { const y = f.y(ch.hist[i]); ctx.fillRect(f.L + i * bw + 1, y, bw - 2, f.B - y); }
    }
    const trace = (TT, from) => { ctx.beginPath(); for (let i = 0; i <= 240; i++) { const E = from + (Emax - from) * i / 240, y = f.y(M.mbEnergyPdf(E, TT)); if (i) ctx.lineTo(f.x(E), y); else ctx.moveTo(f.x(E), y); } };
    // shaded tail: molecules with at least Ea
    if (sys.Ea < Emax) {
      trace(T, Math.max(0, sys.Ea)); ctx.lineTo(f.R, f.B); ctx.lineTo(f.x(Math.max(0, sys.Ea)), f.B); ctx.closePath();
      ctx.fillStyle = D.rgba(th.ke, 0.55); ctx.fill();
    }
    if (st.pin) { trace(st.pin, 0); ctx.strokeStyle = th.muted; ctx.lineWidth = 2 * ts; ctx.setLineDash([6 * ts, 5 * ts]); ctx.stroke(); ctx.setLineDash([]); }
    trace(T, 0); ctx.strokeStyle = th.pe; ctx.lineWidth = 2.8 * ts; ctx.stroke();
    ctx.restore();
    // labels
    const pkE = 0.5 * R * T;
    D.text(ctx, 'T = ' + D.fmt(T, 0) + ' K', Math.min(f.R - 70 * ts, f.x(pkE) + 12 * ts), Math.max(f.T + 12 * ts, f.y(peak(T)) - 4 * ts), { size: 12 * ts, weight: 700, color: th.ink, halo });
    if (st.pin) D.text(ctx, D.fmt(st.pin, 0) + ' K (pinned)', Math.min(f.R - 90 * ts, f.x(0.5 * R * st.pin) + 12 * ts), Math.max(f.T + 26 * ts, f.y(peak(st.pin)) + 12 * ts), { size: 11 * ts, color: th.ink2, halo });
    const mark = (Ea, col, label, row) => {
      if (Ea > Emax) return;
      const x = f.x(Math.max(0, Ea));
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2 * ts; ctx.setLineDash([5 * ts, 4 * ts]); ctx.beginPath(); ctx.moveTo(x, f.T + 2); ctx.lineTo(x, f.B); ctx.stroke(); ctx.restore();
      const right = x < (f.L + f.R) * 0.62;
      D.text(ctx, label, x + (right ? 6 : -6) * ts, f.T + (12 + 30 * row) * ts, { size: 12 * ts, weight: 700, align: right ? 'left' : 'right', color: th.ink, halo });
      return { x, right };
    };
    if (sys.EaUncat) mark(sys.EaUncat, th.muted, 'Eₐ without catalyst', 1.1);
    const m = mark(sys.Ea, th.ke, 'Eₐ = ' + D.fmt(sys.Ea, 0) + (sys.catalyst ? ' (catalyst)' : ''), 0);
    const frac = M.mbFractionAbove(Math.max(0, sys.Ea), T);
    const pct = frac >= 0.1 ? D.fmt(frac * 100, 0) : frac >= 0.001 ? D.fmt(frac * 100, 1) : frac >= 1e-5 ? D.fmt(frac * 100, 3) : 'almost 0';
    if (m) D.text(ctx, pct + '% of molecules have E ≥ Eₐ', m.x + (m.right ? 6 : -6) * ts, f.T + 27 * ts, { size: 11.5 * ts, align: m.right ? 'left' : 'right', color: th.ink2, halo });
    else D.text(ctx, 'Eₐ = ' + D.fmt(sys.Ea, 0) + ' is off the chart to the right →', f.R - 4, f.T + 12 * ts, { size: 11.5 * ts, align: 'right', weight: 700, color: th.ink, halo });
    canvas._hover = (mx) => {
      if (mx < f.L || mx > f.R) return null;
      const E = f.xInv(mx);
      return 'KE = ' + D.fmt(E, 0) + ' kJ/mol\n' + D.fmt(M.mbFractionAbove(E, T) * 100, 1) + '% of molecules have at least this much\nBars: the particles on screen. Curve: theory.';
    };
  }

  /* Amounts of each species against time. */
  function conc(canvas, ch) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), H = ch.history, sys = ch.sys;
    const tmax = Math.max(10, H.length ? H[H.length - 1].t * 1.08 : 10);
    let nmax = 5; for (const p of H) nmax = Math.max(nmax, p.A, p.BC, p.AB, p.C);
    const xr = [0, tmax], yr = [0, nmax * 1.12];
    const f = G.frame(ctx, w, h, th, { l: 46, r: 62, t: 12, b: 32 }, xr, yr), ts = f.ts;
    G.yAxis(ctx, f, th, yr, 'Number of particles', 4);
    for (const v of D.ticks(0, tmax, 5)) D.text(ctx, D.fmt(v, 0), f.x(v), f.B + 13 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
    D.text(ctx, 'Time (s)', (f.L + f.R) / 2, f.B + 27 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    const cols = spColor(th), dash = { A: null, BC: [7, 3], AB: null, C: [2, 3] };
    const ends = [];
    for (const sp of SPECIES) {
      ctx.save(); ctx.beginPath();
      H.forEach((p, i) => { const x = f.x(p.t), y = f.y(p[sp]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.strokeStyle = cols[sp]; ctx.lineWidth = 2.4 * ts; ctx.lineJoin = 'round'; if (dash[sp]) ctx.setLineDash(dash[sp]); ctx.stroke(); ctx.restore();
      if (H.length) ends.push({ sp, y: f.y(H[H.length - 1][sp]), x: f.x(H[H.length - 1].t) });
    }
    // direct labels at the line ends, nudged apart
    ends.sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13 * ts) ends[i].y = ends[i - 1].y + 13 * ts;
    for (const e of ends) {
      ctx.fillStyle = cols[e.sp]; ctx.beginPath(); ctx.arc(e.x, Math.min(e.y, f.B), 3.5 * ts, 0, 7); ctx.fill();
      D.text(ctx, sys.formulas[e.sp], e.x + 8 * ts, Math.min(e.y, f.B + 6 * ts), { size: 11.5 * ts, weight: 700, base: 'middle', color: th.ink });
    }
    canvas._hover = (mx) => {
      if (mx < f.L || mx > f.R || !H.length) return null;
      const t = f.xInv(mx); let p = H[0]; for (const q of H) if (Math.abs(q.t - t) < Math.abs(p.t - t)) p = q;
      return 't = ' + D.fmt(p.t, 1) + ' s\n' + SPECIES.map(s => sys.formulas[s] + ': ' + p[s]).join('\n');
    };
  }

  /* Arrhenius: how the fraction of energetic-enough collisions (and so the rate constant) grows with T. */
  function arr(canvas, ch, st) {
    const { ctx, w, h } = D.fit(canvas);
    const th = D.theme(), sys = ch.sys, T = ch.tempAvg, ln = st.arrMode === 'ln';
    const halo = D.rgba(th.panel, 0.9);
    const series = [[sys.Ea, th.pe, null, sys.catalyst ? 'with catalyst' : null]];
    if (sys.EaUncat) series.unshift([sys.EaUncat, th.muted, [6, 5], 'no catalyst']);
    const Tlo = 100, Thi = 3000;
    let xr, yr, fx, fy;
    if (ln) {
      xr = [1000 / Thi, 1000 / 250];
      const lo = -Math.max(sys.Ea, sys.EaUncat || 0, 1) / (R * 250);
      yr = [lo * 1.05, 0]; fx = (TT) => 1000 / TT; fy = (Ea, TT) => -Ea / (R * TT);
    } else {
      xr = [Tlo, Thi]; yr = [0, Math.max(1e-6, M.arrhenius(Math.max(0, sys.Ea), Thi) * 1.15)];
      fx = (TT) => TT; fy = (Ea, TT) => M.arrhenius(Math.max(0, Ea), TT);
    }
    const f = G.frame(ctx, w, h, th, { l: ln ? 48 : 52, r: 20, t: 12, b: 32 }, xr, yr), ts = f.ts;
    ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 1;
    for (const v of D.ticks(yr[0], yr[1], 4)) {
      const y = Math.round(f.y(v)) + 0.5; ctx.beginPath(); ctx.moveTo(f.L, y); ctx.lineTo(f.R, y); ctx.stroke();
      D.text(ctx, ln ? D.fmt(v, 0) : (yr[1] < 0.02 ? (v * 100).toPrecision(1) + '%' : D.fmt(v * 100, 0) + '%'), f.L - 5 * ts, y, { size: 10.5 * ts, align: 'right', base: 'middle', color: th.muted, fixed: true });
    }
    ctx.restore();
    for (const v of D.ticks(xr[0], xr[1], 5)) D.text(ctx, D.fmt(v, ln ? 1 : 0), f.x(v), f.B + 13 * ts, { size: 11 * ts, align: 'center', color: th.muted, fixed: true });
    D.text(ctx, ln ? '1000 / T  (1/K)   ← hotter' : 'Temperature (K)', (f.L + f.R) / 2, f.B + 27 * ts, { size: 11.5 * ts, align: 'center', color: th.ink2, fixed: true });
    ctx.save(); ctx.translate(11 * ts, (f.T + f.B) / 2); ctx.rotate(-Math.PI / 2);
    D.text(ctx, ln ? 'ln (k / A)' : 'Collisions with E ≥ Eₐ', 0, 0, { size: 11.5 * ts, align: 'center', base: 'middle', color: th.ink2, fixed: true }); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(f.L, f.T - 3, f.R - f.L, f.B - f.T + 6); ctx.clip();
    for (const [Ea, col, dash] of series) {
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const TT = 250 + (Thi - 250) * i / 200, x = f.x(fx(TT)), y = f.y(fy(Ea, TT)); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.strokeStyle = col; ctx.lineWidth = 2.6 * ts; if (dash) ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.restore();
    const Tc = Math.max(250, Math.min(Thi, T)), px = f.x(fx(Tc)), py = f.y(fy(sys.Ea, Tc));
    G.dot(ctx, px, py, 6 * ts, th.ink, th);
    const val = M.arrhenius(Math.max(0, sys.Ea), T);
    const right = px < (f.L + f.R) / 2;
    D.text(ctx, 'now: ' + D.fmt(T, 0) + ' K', px + (right ? 10 : -10) * ts, py - 14 * ts, { size: 12 * ts, weight: 700, align: right ? 'left' : 'right', color: th.ink, halo });
    D.text(ctx, (val >= 0.001 ? D.fmt(val * 100, val >= 0.1 ? 0 : 1) + '%' : (val * 100).toExponential(0) + '%') + ' can react', px + (right ? 10 : -10) * ts, py, { size: 11 * ts, align: right ? 'left' : 'right', color: th.ink2, halo });
    if (ln) D.text(ctx, 'straight line, slope = −Eₐ/R', f.R - 6 * ts, f.T + 12 * ts, { size: 11 * ts, align: 'right', color: th.ink2, halo });
    else D.text(ctx, 'k = A·e^(−Eₐ/RT)', f.L + 8 * ts, f.T + 12 * ts, { size: 11.5 * ts, weight: 700, color: th.ink, halo });
    if (sys.EaUncat) D.text(ctx, 'dashed: no catalyst', f.L + 8 * ts, f.T + 27 * ts, { size: 11 * ts, color: th.ink2, halo });
    canvas._hover = (mx) => {
      if (mx < f.L || mx > f.R) return null;
      const TT = ln ? 1000 / f.xInv(mx) : f.xInv(mx);
      return 'T = ' + D.fmt(TT, 0) + ' K\ne^(−Eₐ/RT) = ' + M.arrhenius(Math.max(0, sys.Ea), TT).toExponential(2) + '\nA small rise in T gives a big rise in rate.';
    };
  }

  root.ChamberSim = { Chamber, drawBox, mb, conc, arr, SPECIES, spColor, atomPx };
})(typeof self !== 'undefined' ? self : this);
