"""Textbook-style organic structure drawing.

RDKit draws the skeletal structure (bonds, heteroatom labels). This module adds
what RDKit cannot: lone-pair dots, circled charges, subscript letters on labeled
hydrogens, curved arrows, and layouts such as "A + B <=> C + D".

Atoms are referenced by SMILES atom-map numbers, e.g. [O-:1] or [H:3].
"""
import math
import re
import cairosvg
from rdkit import Chem
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D

BOND_LEN = 48
FONT = "DejaVu Sans, Arial, sans-serif"
H_RED = (0.84, 0.0, 0.0)
ARROW_COLOR = "#d00000"
VALENCE_E = {6: 4, 7: 5, 8: 6, 16: 6, 9: 7, 17: 7, 35: 7, 53: 7}


def _ang_dist(a, b):
    d = abs(a - b) % 360
    return min(d, 360 - d)


class Struct:
    def __init__(self, smiles, hlabels=None, lone=(), rotate=0, atomlabels=None,
                 flip=False, redh=True, charge_pref=315):
        """hlabels: {map: 'a'} puts a subscript letter on a labeled H.
        lone: map numbers of uncharged atoms that should also show lone pairs.
        Charged atoms always get a circled charge and their lone pairs.
        atomlabels: {map: 'CF3'} text for dummy atoms ([*:n])."""
        self.hlabels = hlabels or {}
        self.charge_pref = charge_pref
        ps = Chem.SmilesParserParams()
        ps.removeHs = False
        ps.sanitize = False
        mol = Chem.MolFromSmiles(smiles, ps)
        assert mol is not None, smiles
        mol.UpdatePropertyCache(strict=False)
        Chem.SanitizeMol(mol, sanitizeOps=Chem.SANITIZE_ALL ^ Chem.SANITIZE_SETAROMATICITY)
        for a in mol.GetAtoms():
            if a.GetNumRadicalElectrons() or (a.GetNoImplicit() and a.GetAtomicNum() == 6 and a.GetTotalValence() + a.GetFormalCharge() * -1 < 4 and a.GetFormalCharge() == 0):
                raise ValueError(f'unintended radical/missing H on atom {a.GetIdx()} ({a.GetSymbol()}) in {smiles}')
        self.idx = {a.GetAtomMapNum(): a.GetIdx() for a in mol.GetAtoms() if a.GetAtomMapNum()}

        # lone pair counts and charges come from the real molecule
        self.charge = {}
        self.lp_count = {}
        for a in mol.GetAtoms():
            i = a.GetIdx()
            chg = a.GetFormalCharge()
            show = chg != 0 or a.GetAtomMapNum() in lone
            if chg != 0:
                self.charge[i] = chg
            if show and a.GetAtomicNum() in VALENCE_E:
                n = (VALENCE_E[a.GetAtomicNum()] - chg - a.GetTotalValence()) // 2
                if n > 0:
                    self.lp_count[i] = n

        # display copy: charges removed (we draw circled charges ourselves)
        dm = Chem.Mol(mol)
        for a in dm.GetAtoms():
            if a.GetFormalCharge() != 0:
                nh = a.GetTotalNumHs()
                a.SetFormalCharge(0)
                a.SetNoImplicit(True)
                a.SetNumExplicitHs(nh)
                a.SetNumRadicalElectrons(0)
            if a.GetAtomicNum() == 0:
                lab = (atomlabels or {}).get(a.GetAtomMapNum(), "R")
                a.SetProp("atomLabel", lab)
            a.SetAtomMapNum(0)
        dm.UpdatePropertyCache(strict=False)
        Chem.FastFindRings(dm)
        rdDepictor.SetPreferCoordGen(True)
        rdDepictor.Compute2DCoords(dm)

        d = rdMolDraw2D.MolDraw2DSVG(900, 900)
        o = d.drawOptions()
        o.fixedBondLength = BOND_LEN
        o.bondLineWidth = 1.8
        o.clearBackground = False
        o.rotate = rotate
        o.padding = 0.2
        o.fixedFontSize = 20
        o.useBWAtomPalette()
        if redh:
            o.updateAtomPalette({1: H_RED})
        o.multipleBondOffset = 0.14
        d.DrawMolecule(dm)
        d.FinishDrawing()
        svg = d.GetDrawingText()
        self.inner = svg[svg.index(">", svg.index("<svg")) + 1: svg.rindex("</svg>")]
        self.inner = re.sub(r"stroke:#D60000", "stroke:#000000", self.inner, flags=re.I)
        self.mol = mol
        self.dm = dm
        self.pos = {}
        for a in dm.GetAtoms():
            p = d.GetDrawCoords(a.GetIdx())
            x, y = p.x, p.y
            if flip:
                x = 900 - x
            self.pos[a.GetIdx()] = (x, y)
        if flip:
            # mirror the RDKit drawing as well
            self.inner = f'<g transform="translate(900,0) scale(-1,1)">{self.inner}</g>'
            # text is mirrored too, so flipping is only safe for label-free regions
        self.arrows = []
        self._extras = []
        self._compute_lone_pairs()
        self._build_extras()

    # ---- geometry helpers -------------------------------------------------
    def p(self, m):
        return self.pos[self.idx[m]]

    def _label_atom(self, i):
        a = self.dm.GetAtomWithIdx(i)
        if a.GetAtomicNum() != 6:
            return True
        return False

    def _compute_lone_pairs(self):
        self.lp_pts = {}
        self.charge_pt = {}
        for i, n in self.lp_count.items():
            px, py = self.pos[i]
            nb = []
            for nbr in self.dm.GetAtomWithIdx(i).GetNeighbors():
                qx, qy = self.pos[nbr.GetIdx()]
                nb.append(math.degrees(math.atan2(qy - py, qx - px)) % 360)
            nb.sort()
            if not nb:
                nb = [90.0]
            gaps = []
            for k in range(len(nb)):
                a0 = nb[k]
                a1 = nb[(k + 1) % len(nb)]
                g = (a1 - a0) % 360 or 360
                gaps.append([a0, g, 0])
            for _ in range(n):
                best = max(range(len(gaps)), key=lambda k: gaps[k][1] / (gaps[k][2] + 1))
                gaps[best][2] += 1
            angles = []
            for a0, g, c in gaps:
                for j in range(c):
                    angles.append((a0 + g * (j + 1) / (c + 1)) % 360)
            r = 15 if self._label_atom(i) else 10
            pts = []
            for ang in angles:
                th = math.radians(ang)
                cx, cy = px + r * math.cos(th), py + r * math.sin(th)
                pts.append((ang, cx, cy))
            self.lp_pts[i] = pts
            if i in self.charge:
                occupied = nb + angles
                best_ang, best_score = None, -1
                for cand in range(0, 360, 15):
                    md = min(_ang_dist(cand, o) for o in occupied)
                    score = min(md, 40) * 10 - _ang_dist(cand, self.charge_pref) * 0.1
                    if score > best_score:
                        best_ang, best_score = cand, score
                rc = 21 if self._label_atom(i) else 17
                th = math.radians(best_ang)
                self.charge_pt[i] = (px + rc * math.cos(th), py + rc * math.sin(th))

    def _build_extras(self):
        out = []
        for i, pts in self.lp_pts.items():
            for ang, cx, cy in pts:
                th = math.radians(ang)
                nx, ny = -math.sin(th), math.cos(th)
                for s in (-1, 1):
                    out.append(f'<circle cx="{cx + s * 2.6 * nx:.1f}" cy="{cy + s * 2.6 * ny:.1f}" r="1.7" fill="black"/>')
        for i, (cx, cy) in self.charge_pt.items():
            out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5.6" fill="white" stroke="black" stroke-width="1.2"/>')
            out.append(f'<line x1="{cx - 3:.1f}" y1="{cy:.1f}" x2="{cx + 3:.1f}" y2="{cy:.1f}" stroke="black" stroke-width="1.3"/>')
            if self.charge[i] > 0:
                out.append(f'<line x1="{cx:.1f}" y1="{cy - 3:.1f}" x2="{cx:.1f}" y2="{cy + 3:.1f}" stroke="black" stroke-width="1.3"/>')
        for m, letter in self.hlabels.items():
            if letter:
                x, y = self.p(m)
                nb = self.dm.GetAtomWithIdx(self.idx[m]).GetNeighbors()[0].GetIdx()
                bx, by = self.pos[nb]
                if bx > x + 4 and abs(by - y) < abs(bx - x) * 2:
                    tx = x - 13.5
                else:
                    tx = x + 6.5
                out.append(f'<text x="{tx:.1f}" y="{y + 7:.1f}" font-family="{FONT}" font-size="11" '
                           f'fill="rgb(214,0,0)">{letter}</text>')
        self._extras = out

    # ---- curved arrows ----------------------------------------------------
    def _anchor(self, spec, toward=None, is_head=False):
        kind = spec[0]
        if kind == "bond":
            (x1, y1), (x2, y2) = self.p(spec[1]), self.p(spec[2])
            return ((x1 + x2) / 2, (y1 + y2) / 2)
        if kind == "bondf":
            (x1, y1), (x2, y2) = self.p(spec[1]), self.p(spec[2])
            f = spec[3]
            return (x1 + (x2 - x1) * f, y1 + (y2 - y1) * f)
        if kind == "atom":
            x, y = self.p(spec[1])
            if is_head and toward is not None:
                dx, dy = toward[0] - x, toward[1] - y
                L = math.hypot(dx, dy) or 1
                r = 10 if self._label_atom(self.idx[spec[1]]) else 6
                return (x + dx / L * r, y + dy / L * r)
            return (x, y)
        if kind == "lpa":
            i = self.idx[spec[1]]
            ang, cx, cy = min(self.lp_pts[i], key=lambda t: _ang_dist(t[0], spec[2]))
            th = math.radians(ang)
            return (cx + 3.5 * math.cos(th), cy + 3.5 * math.sin(th))
        if kind == "lp":
            i = self.idx[spec[1]]
            pts = self.lp_pts[i]
            px, py = self.pos[i]
            if len(spec) > 2:
                ang, cx, cy = pts[spec[2]]
            else:
                tx, ty = toward
                want = math.degrees(math.atan2(ty - py, tx - px)) % 360
                ang, cx, cy = min(pts, key=lambda t: math.hypot(t[1] - tx, t[2] - ty))
            th = math.radians(ang)
            return (cx + 3.5 * math.cos(th), cy + 3.5 * math.sin(th))
        raise ValueError(spec)

    def _center(self, spec):
        if spec[0] in ("bond", "bondf"):
            return self._anchor(spec)
        return self.p(spec[1])

    def arrow(self, frm, to, bend=0.35, s_off=0.0, e_off=0.0):
        """s_off shifts the tail sideways off a bond (use for pi-bond arrows);
        e_off shifts the head sideways when it lands on an atom."""
        S = self._anchor(frm, toward=self._center(to))
        if frm[0] == "bond" and s_off:
            (x1, y1), (x2, y2) = self.p(frm[1]), self.p(frm[2])
            L = math.hypot(x2 - x1, y2 - y1) or 1
            S = (S[0] - (y2 - y1) / L * s_off, S[1] + (x2 - x1) / L * s_off)
        if to[0] == "atom" and e_off:
            cx, cy = self.p(to[1])
            vx, vy = cx - S[0], cy - S[1]
            L = math.hypot(vx, vy) or 1
            nx, ny = -vy / L, vx / L
            tx, ty = cx + nx * e_off, cy + ny * e_off
            dx, dy = tx - S[0], ty - S[1]
            D = math.hypot(dx, dy) or 1
            r = 9 if self._label_atom(self.idx[to[1]]) else 5
            E = (tx - dx / D * r, ty - dy / D * r)
        else:
            E = self._anchor(to, toward=S, is_head=True)
        self.arrows.append((S, E, bend))
        return self

    def _arrow_svg(self):
        return arrow_svg(self.arrows)

    def _arrow_svg_old(self):
        out = []
        for (sx, sy), (ex, ey), bend in self.arrows:
            dx, dy = ex - sx, ey - sy
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            cx, cy = (sx + ex) / 2 + nx * bend * L, (sy + ey) / 2 + ny * bend * L
            tx, ty = ex - cx, ey - cy
            tl = math.hypot(tx, ty) or 1
            tx, ty = tx / tl, ty / tl
            hl, hw = 9.5, 4.0
            bx, by = ex - tx * hl, ey - ty * hl
            out.append(f'<path d="M{sx:.1f},{sy:.1f} Q{cx:.1f},{cy:.1f} {bx:.1f},{by:.1f}" fill="none" '
                       f'stroke="{ARROW_COLOR}" stroke-width="1.9" stroke-linecap="round"/>')
            px_, py_ = -ty, tx
            out.append(f'<polygon points="{ex:.1f},{ey:.1f} {bx + px_ * hw:.1f},{by + py_ * hw:.1f} '
                       f'{bx - px_ * hw:.1f},{by - py_ * hw:.1f}" fill="{ARROW_COLOR}"/>')
        return out

    # ---- output -----------------------------------------------------------
    def bbox(self):
        xs, ys = [], []
        for (x, y) in self.pos.values():
            xs += [x - 15, x + 15]
            ys += [y - 15, y + 15]
        for pts in self.lp_pts.values():
            for _, cx, cy in pts:
                xs.append(cx)
                ys.append(cy)
        for cx, cy in self.charge_pt.values():
            xs += [cx - 7, cx + 7]
            ys += [cy - 7, cy + 7]
        for (sx, sy), (ex, ey), bend in self.arrows:
            L = math.hypot(ex - sx, ey - sy)
            xs += [sx, ex]
            ys += [sy, ey]
            nx, ny = -(ey - sy) / (L or 1), (ex - sx) / (L or 1)
            xs.append((sx + ex) / 2 + nx * bend * L * 0.6)
            ys.append((sy + ey) / 2 + ny * bend * L * 0.6)
        pad = 6
        return min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad

    def svg_group(self):
        return self.inner + "".join(self._extras) + "".join(self._arrow_svg())

    # layout protocol
    def layout(self):
        x0, y0, x1, y1 = self.bbox()
        return (x1 - x0, y1 - y0, self._render(x0, y0, x1, y1))

    def _render(self, x0, y0, x1, y1):
        grp = self.svg_group()

        def render(x, y):
            return (f'<svg x="{x:.1f}" y="{y:.1f}" width="{x1 - x0:.1f}" height="{y1 - y0:.1f}" '
                    f'viewBox="{x0:.1f} {y0:.1f} {x1 - x0:.1f} {y1 - y0:.1f}" overflow="hidden">{grp}</svg>')
        return render


class Text:
    def __init__(self, s, size=20, bold=False):
        self.s, self.size, self.bold = s, size, bold

    def layout(self):
        w = len(self.s) * self.size * 0.62 + 4
        h = self.size * 1.2

        def render(x, y):
            wt = ' font-weight="bold"' if self.bold else ""
            return (f'<text x="{x:.1f}" y="{y + self.size * 0.95:.1f}" font-family="{FONT}" '
                    f'font-size="{self.size}"{wt}>{self.s}</text>')
        return (w, h, render)


class Plus:
    def layout(self):
        def render(x, y):
            return (f'<line x1="{x + 2}" y1="{y + 8}" x2="{x + 18}" y2="{y + 8}" stroke="black" stroke-width="1.8"/>'
                    f'<line x1="{x + 10}" y1="{y}" x2="{x + 10}" y2="{y + 16}" stroke="black" stroke-width="1.8"/>')
        return (20, 16, render)


class Equil:
    """Equilibrium arrows."""
    def layout(self):
        L = 46

        def render(x, y):
            return (
                f'<line x1="{x}" y1="{y + 4}" x2="{x + L}" y2="{y + 4}" stroke="black" stroke-width="1.8"/>'
                f'<polygon points="{x + L + 1},{y + 4} {x + L - 9},{y - 1} {x + L - 9},{y + 4}" fill="black"/>'
                f'<line x1="{x}" y1="{y + 14}" x2="{x + L}" y2="{y + 14}" stroke="black" stroke-width="1.8"/>'
                f'<polygon points="{x - 1},{y + 14} {x + 9},{y + 14} {x + 9},{y + 19}" fill="black"/>')
        return (L + 2, 19, render)


def compose(items, gap=16, pad=10, path=None, scale=3):
    """Lay items out left to right, vertically centered, and write a PNG."""
    laid = [it.layout() for it in items]
    H = max(h for _, h, _ in laid) + 2 * pad
    W = sum(w for w, _, _ in laid) + gap * (len(laid) - 1) + 2 * pad
    parts, x = [], pad
    for (w, h, render) in laid:
        parts.append(render(x, (H - h) / 2))
        x += w + gap
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
           f'viewBox="0 0 {W:.1f} {H:.1f}"><rect width="100%" height="100%" fill="white"/>'
           + "".join(parts) + "</svg>")
    if path:
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path, scale=scale)
    return svg, (W, H)


def arrow_svg(arrows):
    out = []
    for (sx, sy), (ex, ey), bend in arrows:
        dx, dy = ex - sx, ey - sy
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        cx, cy = (sx + ex) / 2 + nx * bend * L, (sy + ey) / 2 + ny * bend * L
        tx, ty = ex - cx, ey - cy
        tl = math.hypot(tx, ty) or 1
        tx, ty = tx / tl, ty / tl
        hl, hw = 9.5, 4.0
        bx, by = ex - tx * hl, ey - ty * hl
        out.append(f'<path d="M{sx:.1f},{sy:.1f} Q{cx:.1f},{cy:.1f} {bx:.1f},{by:.1f}" fill="none" '
                   f'stroke="{ARROW_COLOR}" stroke-width="1.9" stroke-linecap="round"/>')
        px_, py_ = -ty, tx
        out.append(f'<polygon points="{ex:.1f},{ey:.1f} {bx + px_ * hw:.1f},{by + py_ * hw:.1f} '
                   f'{bx - px_ * hw:.1f},{by - py_ * hw:.1f}" fill="{ARROW_COLOR}"/>')
    return out


def compose_with_arrows(items, cross, gap=16, pad=10, path=None, scale=3):
    """Like compose, plus arrows between separate Struct items.
    cross: list of dicts {i, frm, j, to, bend, s_off, e_off} (item indices)."""
    laid = [it.layout() for it in items]
    H = max(h for _, h, _ in laid) + 2 * pad
    W = sum(w for w, _, _ in laid) + gap * (len(laid) - 1) + 2 * pad
    parts, x, tr = [], pad, {}
    for k, (it, (w, h, render)) in enumerate(zip(items, laid)):
        y = (H - h) / 2
        parts.append(render(x, y))
        if isinstance(it, Struct):
            x0, y0, _, _ = it.bbox()
            tr[k] = (x - x0, y - y0)
        x += w + gap
    arrows = []
    for c in cross:
        a, b = items[c["i"]], items[c["j"]]
        ta, tb = tr[c["i"]], tr[c["j"]]
        cj = b._center(c["to"])
        cj_g = (cj[0] + tb[0], cj[1] + tb[1])
        S = a._anchor(c["frm"], toward=(cj_g[0] - ta[0], cj_g[1] - ta[1]))
        Sg = (S[0] + ta[0], S[1] + ta[1])
        E = b._anchor(c["to"], toward=(Sg[0] - tb[0], Sg[1] - tb[1]), is_head=True)
        Eg = (E[0] + tb[0], E[1] + tb[1])
        arrows.append((Sg, Eg, c.get("bend", 0.35)))
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W:.0f}" height="{H:.0f}" '
           f'viewBox="0 0 {W:.1f} {H:.1f}"><rect width="100%" height="100%" fill="white"/>'
           + "".join(parts) + "".join(arrow_svg(arrows)) + "</svg>")
    if path:
        cairosvg.svg2png(bytestring=svg.encode(), write_to=path, scale=scale)
    return svg, (W, H)
