"""Drawing kit for the Thermochemistry and Free Energy slide deck: theme, text, equation rows, molecules, thermometers, curves."""
import re, math
from lxml import etree
from PIL import ImageFont
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.dml import MSO_LINE

NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
W, H = 13.333, 7.5
FONT = "Calibri"

# ------------------------------------------------------------------ theme
NAVY, INK, MUTE, CARD, LINE, WHITE = "14213D", "1F2933", "52606D", "F1F4F8", "CBD2D9", "FFFFFF"
EMBER, ICE, GOLD, GREEN, VIOLET, RED, TEAL, PINK, INDIGO = "E8590C", "1C7ED6", "F08C00", "2F9E44", "7048E8", "E03131", "0C8599", "D6336C", "4263EB"
SOFT = {EMBER: "FFE8DC", ICE: "DCEBFA", GOLD: "FFF1D6", GREEN: "DDF3E1", VIOLET: "E9E2FB", RED: "FBE0E0", TEAL: "D9F0F4", PINK: "FADCE7", INDIGO: "DFE5FD", "087F5B": "D3F4E8", "868E96": "E9ECEF"}
SECTION_COLORS = {1: EMBER, 2: GOLD, 3: TEAL, 4: ICE, 5: GREEN, 6: INDIGO, 7: VIOLET, 8: PINK, 9: "087F5B"}
SECTION_SHORT = {1: "Endo / Exothermic", 2: "Heat Capacity", 3: "Phase Changes", 4: "Enthalpy of Reaction", 5: "Formation and Bonds",
                 6: "Hess's Law", 7: "Entropy", 8: "Gibbs Free Energy", 9: "Free Energy and K"}
SECTION_NAMES = {1: "Endothermic and Exothermic Processes", 2: "Heat Transfer and Heat Capacity", 3: "Phase Changes and Heating Curves",
                 4: "Enthalpy of Reaction and Calorimetry", 5: "Enthalpy of Formation and Bond Enthalpies", 6: "Hess's Law",
                 7: "Entropy", 8: "Gibbs Free Energy and Favorability", 9: "Free Energy, Equilibrium and Coupled Reactions"}
ATOM = {"C": ("495057", WHITE, 0.62), "H": (WHITE, INK, 0.40), "O": (RED, WHITE, 0.58), "N": (ICE, WHITE, 0.58), "Cl": (GREEN, WHITE, 0.66)}

TCOL = {EMBER: "C2410C", GOLD: "B45309", TEAL: "0B7285", GREEN: "2B8A3E", ICE: "1864AB", VIOLET: "5F3DC4", PINK: "C2255C", INDIGO: "3B5BDB", RED: "C92A2A"}
tcol = lambda c: TCOL.get(c, c)
E = lambda v: int(round(v * 914400))
rgb = lambda h: RGBColor.from_string(h)

_FONTS = {}


def _font(bold=False, italic=False):
    key = (bold, italic)
    if key not in _FONTS:
        name = "Carlito-" + ("BoldItalic" if bold and italic else "Bold" if bold else "Italic" if italic else "Regular") + ".ttf"
        _FONTS[key] = ImageFont.truetype("/usr/share/fonts/truetype/crosextra/" + name, 200)
    return _FONTS[key]


def text_width_pt(text, size, bold=False, italic=False):
    return _font(bold, italic).getlength(text) * size / 200.0


# ------------------------------------------------------------------ presentation and slides
def new_prs():
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(W), Inches(H)
    return prs


def set_bg(slide, color):
    f = slide.background.fill
    f.solid(); f.fore_color.rgb = rgb(color)


def nostyle(shape):
    st = shape._element.find("{http://schemas.openxmlformats.org/presentationml/2006/main}style")
    if st is not None:
        shape._element.remove(st)
    return shape


def soft_shadow(shape, blur=9, dist=3, alpha=18):
    spPr = shape._element.spPr
    for old in spPr.findall("{%s}effectLst" % NS_A):
        spPr.remove(old)
    eff = etree.SubElement(spPr, "{%s}effectLst" % NS_A)
    sh = etree.SubElement(eff, "{%s}outerShdw" % NS_A, blurRad=str(blur * 12700), dist=str(dist * 12700), dir="5400000", algn="t", rotWithShape="0")
    clr = etree.SubElement(sh, "{%s}srgbClr" % NS_A, val="000000")
    etree.SubElement(clr, "{%s}alpha" % NS_A, val=str(alpha * 1000))


def slide_number(slide, color=MUTE):
    tb = slide.shapes.add_textbox(E(W - 1.2), E(H - 0.5), E(0.7), E(0.3))
    tf = tb.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.RIGHT
    fld = etree.SubElement(p._p, "{%s}fld" % NS_A, id="{B6F15528-21DE-4FAA-801E-634DDDAF4B2B}", type="slidenum")
    rpr = etree.SubElement(fld, "{%s}rPr" % NS_A, lang="en-US", sz="1000")
    sf = etree.SubElement(rpr, "{%s}solidFill" % NS_A); etree.SubElement(sf, "{%s}srgbClr" % NS_A, val=color)
    etree.SubElement(rpr, "{%s}latin" % NS_A, typeface=FONT)
    t = etree.SubElement(fld, "{%s}t" % NS_A); t.text = "‹#›"
    tb.name = "Slide number"
    return tb


def new_slide(prs, title, section=None, dark=False, size=32):
    """A 'Title Only' slide with the title placeholder placed and styled (kept as a real title for the outline view)."""
    s = prs.slides.add_slide(prs.slide_layouts[5])
    if dark:
        set_bg(s, NAVY)
    t = s.shapes.title
    t.left, t.top, t.width, t.height = E(0.55), E(0.32), E(W - 3.9), E(0.85)
    tf = t.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.LEFT
    for r in list(p.runs):
        r._r.getparent().remove(r._r)
    avail = (W - 3.9) * 72 - 4
    if size < 40:
        while text_width_pt(title, size, bold=True) > avail and size > 26:
            size -= 1
    r = p.add_run(); r.text = title
    r.font.size = Pt(size); r.font.bold = True; r.font.name = FONT; r.font.color.rgb = rgb(WHITE if dark else NAVY)
    if section:
        col = SECTION_COLORS[section]
        chip(s, W - 3.2, 0.5, 2.65, 0.4, "%d  ·  %s" % (section, SECTION_SHORT[section]),
             SOFT[col] if not dark else col, tcol(col) if not dark else WHITE, 12)
    slide_number(s, "9AA5B1" if dark else MUTE)
    return s


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


# ------------------------------------------------------------------ text
def parse_rs(s, color=INK, bold=False):
    """Rich string -> [(text, {color,bold,sup,sub,italic})]   markup: **bold**  ^{sup}  _{sub}  [#RRGGBB|colored text]  *italic*"""
    s = re.sub(r"(?<![A-Za-z0-9])-(?=\d)", "\u2212", s)          # a hyphen before a number is a minus sign
    runs, i, buf = [], 0, ""
    st = {"color": color, "bold": bold, "sup": False, "sub": False, "italic": False}

    def flush():
        nonlocal buf
        if buf:
            runs.append((buf, dict(st))); buf = ""

    while i < len(s):
        c = s[i]
        if s.startswith("**", i):
            flush(); st["bold"] = not st["bold"]; i += 2
        elif c in "^_" and s[i + 1:i + 2] == "{":
            j = s.index("}", i)
            flush()
            sub = dict(st); sub["sup" if c == "^" else "sub"] = True
            runs.append((s[i + 2:j], sub)); i = j + 1
        elif c == "_" and i > 0 and s[i - 1].isalpha() and re.match(r"[A-Za-z]+", s[i + 1:]):      # q_metal, T_f ...
            m = re.match(r"[A-Za-z]+", s[i + 1:]).group()
            flush()
            sub = dict(st); sub["sub"] = True
            runs.append((m, sub)); i += 1 + len(m)
        elif c == "[" and s[i + 1:i + 2] == "#" and "|" in s[i:i + 12]:
            bar = s.index("|", i); end = s.index("]", bar)
            flush()
            inner = parse_rs(s[bar + 1:end], s[i + 2:bar], st["bold"])
            for t, ss in inner:
                ss2 = dict(ss); ss2["bold"] = ss2["bold"] or st["bold"]
                runs.append((t, ss2))
            i = end + 1
        else:
            buf += c; i += 1
    flush()
    return runs


def _style_run(r, size, st, font=FONT):
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bool(st["bold"]); r.font.italic = bool(st["italic"])
    r.font.color.rgb = rgb(st["color"])
    if st["sup"]:
        r._r.get_or_add_rPr().set("baseline", "30000")
    if st["sub"]:
        r._r.get_or_add_rPr().set("baseline", "-25000")


def fill_text(tf, markup, size=16, color=INK, bold=False, align="l", spacing=None, bullet_gap=4, font=FONT):
    """Paragraphs split on newline.  A line starting with '- ' becomes a bullet."""
    lines = markup.split("\n")
    for k, line in enumerate(lines):
        p = tf.paragraphs[0] if k == 0 else tf.add_paragraph()
        p.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[align]
        if spacing:
            p.line_spacing = spacing
        if k > 0:
            p.space_before = Pt(bullet_gap)
        is_b = line.startswith("- ")
        if is_b:
            line = line[2:]
            pPr = p._p.get_or_add_pPr()
            pPr.set("marL", str(E(0.24))); pPr.set("indent", str(-E(0.24)))
            bu = etree.SubElement(pPr, "{%s}buChar" % NS_A, char="•")
        for t, st in parse_rs(line, color, bold):
            r = p.add_run(); r.text = t; _style_run(r, size, st, font)


def txt(slide, x, y, w, h, markup, size=16, color=INK, bold=False, align="l", anchor="t", spacing=None, name=None, margins=0.0):
    tb = slide.shapes.add_textbox(E(x), E(y), E(w), E(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = E(margins)
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    fill_text(tf, markup, size, color, bold, align, spacing)
    if name:
        tb.name = name
    return tb


def card(slide, x, y, w, h, fill=CARD, radius=0.07, shadow=False, line=None, name=None):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, E(x), E(y), E(w), E(h))
    s.adjustments[0] = min(0.5, radius / max(min(w, h), 0.01) * 1.0) if radius < 0.5 else 0.5
    s.fill.solid(); s.fill.fore_color.rgb = rgb(fill)
    if line:
        s.line.color.rgb = rgb(line); s.line.width = Pt(1.25)
    else:
        s.line.fill.background()
    nostyle(s)
    if shadow:
        soft_shadow(s)
    if name:
        s.name = name
    return s


def card_text(slide, x, y, w, h, markup, size=16, fill=CARD, color=INK, align="l", anchor="m", line=None, shadow=False, pad=0.15, bold=False, radius=0.1):
    s = card(slide, x, y, w, h, fill, radius, shadow, line)
    tf = s.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = E(pad); tf.margin_top = tf.margin_bottom = E(pad * 0.6)
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    fill_text(tf, markup, size, color, bold, align)
    return s


def chip(slide, x, y, w, h, text, fill, color=WHITE, size=12, bold=True):
    return card_text(slide, x, y, w, h, text, size, fill, color, "c", "m", pad=0.08, bold=bold, radius=h / 2)


def circle(slide, cx, cy, r, fill, line=None, lw=1.25):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, E(cx - r), E(cy - r), E(2 * r), E(2 * r))
    s.fill.solid(); s.fill.fore_color.rgb = rgb(fill)
    if line:
        s.line.color.rgb = rgb(line); s.line.width = Pt(lw)
    else:
        s.line.fill.background()
    nostyle(s)
    return s


def badge(slide, cx, cy, r, label, fill, color=WHITE, size=16):
    s = circle(slide, cx, cy, r, fill)
    tf = s.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    fill_text(tf, label, size, color, True, "c")
    return s


def line(slide, x1, y1, x2, y2, color=INK, width=2.0, dash=False, head=False, tail=False):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, E(x1), E(y1), E(x2), E(y2))
    c.line.color.rgb = rgb(color); c.line.width = Pt(width)
    nostyle(c)
    if dash:
        c.line.dash_style = MSO_LINE.DASH
    ln = c.line._get_or_add_ln()
    if head:
        etree.SubElement(ln, "{%s}headEnd" % NS_A, type="triangle", w="med", len="med")
    if tail:
        etree.SubElement(ln, "{%s}tailEnd" % NS_A, type="triangle", w="med", len="med")
    return c


def arrow(slide, x1, y1, x2, y2, color=INK, width=2.5, dash=False):
    return line(slide, x1, y1, x2, y2, color, width, dash, tail=True)


def poly(slide, pts, color=INK, width=3.0, fill=None, closed=False):
    """Freeform polyline through points given in inches."""
    fb = slide.shapes.build_freeform(E(pts[0][0]), E(pts[0][1]), scale=1.0)
    fb.add_line_segments([(E(x), E(y)) for x, y in pts[1:]], close=closed)
    s = fb.convert_to_shape()
    if fill:
        s.fill.solid(); s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    s.line.color.rgb = rgb(color); s.line.width = Pt(width)
    nostyle(s)
    return s


def smooth(points, n=80):
    """Dense smooth path (PCHIP) through (x, y) points in inches."""
    from scipy.interpolate import PchipInterpolator
    import numpy as np
    xs, ys = zip(*points)
    f = PchipInterpolator(xs, ys)
    t = np.linspace(xs[0], xs[-1], n)
    return [(float(a), float(f(a))) for a in t]


def axes(slide, x, y, w, h, xlabel="", ylabel="", color=MUTE):
    """Left and bottom axes with arrowheads; (x, y) is the top-left of the plot area."""
    a = arrow(slide, x, y + h, x + w, y + h, color, 2.0)
    b = arrow(slide, x, y + h, x, y, color, 2.0)
    out = [a, b]
    if xlabel:
        out.append(txt(slide, x, y + h + 0.06, w, 0.3, xlabel, 12, color, align="c"))
    if ylabel:
        t = txt(slide, x - 0.62 - h / 2 + 0.3, y + h / 2 - 0.15, h, 0.3, ylabel, 12, color, align="c")
        t.rotation = -90
        out.append(t)
    return out


# ------------------------------------------------------------------ equation rows with stacked fractions
def _split_row(s):
    """'a {n|d} b' -> [('t', 'a '), ('f', 'n', 'd'), ('t', ' b')]"""
    items, i, buf = [], 0, ""
    while i < len(s):
        if s[i] == "{" and i > 0 and s[i - 1] in "^_":          # a sub/superscript brace, not a fraction
            j = s.index("}", i)
            buf += s[i:j + 1]; i = j + 1
        elif s[i] == "{":
            depth, j = 0, i
            while True:
                if s[j] == "{": depth += 1
                elif s[j] == "}":
                    depth -= 1
                    if depth == 0:
                        break
                j += 1
            inner = s[i + 1:j]
            d2, k = 0, None
            for q, ch in enumerate(inner):
                if ch in "{[(": d2 += 1
                elif ch in "}])": d2 -= 1
                elif ch == "|" and d2 == 0:
                    k = q; break
            if buf:
                items.append(("t", buf)); buf = ""
            items.append(("f", inner[:k], inner[k + 1:]))
            i = j + 1
        else:
            buf += s[i]; i += 1
    if buf:
        items.append(("t", buf))
    return items


def _runs_width(runs, size):
    return sum(text_width_pt(t, size * (0.66 if (st["sup"] or st["sub"]) else 1), st["bold"], st["italic"]) for t, st in runs)


def _row_metrics(items, size, color, bold):
    out, total = [], 0.0
    for it in items:
        if it[0] == "t":
            runs = parse_rs(it[1], color, bold)
            w = _runs_width(runs, size)
            out.append(("t", runs, w)); total += w
        else:
            n, d = parse_rs(it[1], color, bold), parse_rs(it[2], color, bold)
            w = max(_runs_width(n, size), _runs_width(d, size)) + 0.30 * size
            out.append(("f", n, d, w)); total += w
    return out, total


def eqrow(slide, x, y, markup, size=22, color=INK, bold=False, max_w=None, min_size=13, name=None):
    """A line of math with real stacked fractions, built as one group (so one animation reveals it).
    Returns (group, width_in, height_in)."""
    items = _split_row(markup)
    while True:
        metrics, total = _row_metrics(items, size, color, bold)
        if max_w is None or total / 72.0 <= max_w or size <= min_size:
            break
        size -= 0.5
    has_frac = any(m[0] == "f" for m in metrics)
    rh = size * (2.7 if has_frac else 1.45) / 72.0
    g = slide.shapes.add_group_shape()
    cx = x
    mid = y + rh / 2
    th = size * 1.35 / 72.0
    for m in metrics:
        if m[0] == "t":
            w = m[2] / 72.0 + 0.02
            tb = g.shapes.add_textbox(E(cx), E(mid - th / 2), E(w), E(th))
            tf = tb.text_frame; tf.word_wrap = False
            tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            fill_text(tf, "", size, color)       # placeholder paragraph
            p = tf.paragraphs[0]
            for r in list(p.runs):
                r._r.getparent().remove(r._r)
            for t, st in m[1]:
                r = p.add_run(); r.text = t; _style_run(r, size, st)
            cx += w
        else:
            w = m[3] / 72.0
            n, d = m[1], m[2]
            for runs, yy in ((n, mid - th - 0.035), (d, mid + 0.035)):
                tb = g.shapes.add_textbox(E(cx), E(yy), E(w), E(th))
                tf = tb.text_frame; tf.word_wrap = False
                tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
                tf.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
                for t, st in runs:
                    r = p.add_run(); r.text = t; _style_run(r, size, st)
            bar = g.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, E(cx + 0.03), E(mid), E(cx + w - 0.03), E(mid))
            bar.line.color.rgb = rgb(color); bar.line.width = Pt(max(1.0, size / 16)); nostyle(bar)
            cx += w
    if name:
        g.name = name
    return g, (cx - x), rh


# ------------------------------------------------------------------ molecules
def atom(slide, sym, cx, cy, scale=1.0):
    fill, tc, d = ATOM[sym]
    r = d * scale / 2
    s = circle(slide, cx, cy, r, fill, line=("868E96" if fill == WHITE else None), lw=1.5)
    tf = s.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    fill_text(tf, sym, 15 * scale, tc, True, "c")
    s.name = "atom " + sym
    return s


class Molecule:
    """atoms: [(symbol, dx, dy)], bonds: [(i, j, order)], centered at (cx, cy) in inches."""
    def __init__(self, slide, atoms, bonds, cx, cy, scale=1.0, bond_color="6C757D"):
        self.cx, self.cy = cx, cy
        self.centers = [(cx + dx * scale, cy + dy * scale) for _, dx, dy in atoms]
        self.bonds = []
        for i, j, order in bonds:
            (x1, y1), (x2, y2) = self.centers[i], self.centers[j]
            L = math.hypot(x2 - x1, y2 - y1)
            nx, ny = -(y2 - y1) / L, (x2 - x1) / L
            offs = [0.0] if order == 1 else [-0.055, 0.055] if order == 2 else [-0.09, 0, 0.09]
            for o in offs:
                self.bonds.append(line(slide, x1 + nx * o, y1 + ny * o, x2 + nx * o, y2 + ny * o, bond_color, 4.0))
        self.atoms = [atom(slide, a[0], c[0], c[1], scale) for a, c in zip(atoms, self.centers)]


MOLS = {
    "CH4": ([("C", 0, 0), ("H", 0, -0.82), ("H", 0, 0.82), ("H", -0.82, 0), ("H", 0.82, 0)], [(0, 1, 1), (0, 2, 1), (0, 3, 1), (0, 4, 1)]),
    "O2": ([("O", -0.4, 0), ("O", 0.4, 0)], [(0, 1, 2)]),
    "CO2": ([("O", -1.15, 0), ("C", 0, 0), ("O", 1.15, 0)], [(0, 1, 2), (1, 2, 2)]),
    "H2O": ([("O", 0, 0), ("H", -0.62, 0.5), ("H", 0.62, 0.5)], [(0, 1, 1), (0, 2, 1)]),
    "H2": ([("H", -0.32, 0), ("H", 0.32, 0)], [(0, 1, 1)]),
    "Cl2": ([("Cl", -0.45, 0), ("Cl", 0.45, 0)], [(0, 1, 1)]),
    "HCl": ([("H", -0.55, 0), ("Cl", 0.5, 0)], [(0, 1, 1)]),
    "N2": ([("N", -0.4, 0), ("N", 0.4, 0)], [(0, 1, 3)]),
    "NO": ([("N", -0.4, 0), ("O", 0.4, 0)], [(0, 1, 2)]),
}


def mol(slide, name, cx, cy, scale=1.0):
    a, b = MOLS[name]
    return Molecule(slide, a, b, cx, cy, scale)


def delta(a, b):
    """(dx, dy) EMU from point a to point b, both in inches."""
    return (E(b[0] - a[0]), E(b[1] - a[1]))


# ------------------------------------------------------------------ thermometer (mercury rises with a wipe, falls with a white cover)
class Thermometer:
    def __init__(self, slide, x, y, h, start, end, color=RED, label_start="", label_end="", w=0.34):
        """start/end are fractions (0..1) of the tube height.  Parts for animation: .rise (wipe from bottom) or .cover (wipe from top)."""
        self.tube = card(slide, x, y, w, h, WHITE, radius=w / 2, line="868E96")
        pad = w * 0.28
        self.base = card(slide, x + pad, y + h * (1 - start) if start > 0 else y + h - 0.02, w - 2 * pad, max(h * start, 0.02), color, radius=0.02)
        self.rise = self.cover = None
        if end > start:
            top = y + h * (1 - end)
            self.rise = card(slide, x + pad, top, w - 2 * pad, h * (end - start) + 0.02, color, radius=0.02)
        elif end < start:
            top = y + h * (1 - start)
            self.cover = card(slide, x + pad - 0.01, top - 0.01, w - 2 * pad + 0.02, h * (start - end) + 0.02, WHITE, radius=0.0)
        self.bulb = circle(slide, x + w / 2, y + h + w * 0.28, w * 0.78, color, "868E96", 1.5)
        self.parts_static = [self.tube, self.base, self.bulb]
        self.x, self.y, self.h, self.w = x, y, h, w
        # stacking: the bulb sits over the tube bottom so it reads as one piece
        sp = self.tube._element.getparent()
        sp.remove(self.bulb._element); sp.append(self.bulb._element)


# ------------------------------------------------------------------ small helpers for slides
def particles_grid(slide, x, y, cols, rows, gap, r, fill, line_c="495057"):
    out = []
    for j in range(rows):
        for i in range(cols):
            out.append(circle(slide, x + i * gap, y + j * gap, r, fill, line_c, 1.0))
    return out


def step_badge(slide, cx, cy, n, color):
    return badge(slide, cx, cy, 0.22, str(n), color, WHITE, 15)


def measure_row(markup, size=22, max_w=None, min_size=13, color=INK, bold=False):
    """(size_used, height_in, width_in) of an eqrow without drawing it."""
    items = _split_row(markup)
    while True:
        metrics, total = _row_metrics(items, size, color, bold)
        if max_w is None or total / 72.0 <= max_w or size <= min_size:
            break
        size -= 0.5
    has_frac = any(m[0] == "f" for m in metrics)
    return size, size * (2.7 if has_frac else 1.45) / 72.0, total / 72.0


def wrap_height(markup, size, width_in, line=1.22):
    """Estimated height in inches of wrapped text (markup stripped to plain runs)."""
    total = 0.0
    for para in markup.split("\n"):
        words = "".join(t for t, _ in parse_rs(para[2:] if para.startswith("- ") else para)).split(" ")
        w_avail = (width_in - (0.24 if para.startswith("- ") else 0)) * 72.0
        lines, cur = 1, 0.0
        for wd in words:
            ww = text_width_pt(wd + " ", size)
            if cur + ww > w_avail and cur > 0:
                lines += 1; cur = ww
            else:
                cur += ww
        total += lines * size * line / 72.0 + 0.04
    return total
