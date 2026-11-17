"""Tiny builder for real Word equations (OMML): stacked fractions, exponents, subscripts, square roots.

Markup (used in the notes and the key):
    {top|bottom}   stacked fraction          sqrt{...}   square root
    ^{...}  superscript     _{...}  subscript          **text**   bold
    ( ) are real brackets that grow around fractions; [ ] stay plain unless they carry an exponent or hold a fraction.
"""
import re
from lxml import etree

M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
_CLOSE = {"(": ")", "[": "]"}


def _m(tag, **attrs):
    e = etree.Element("{%s}%s" % (M_NS, tag), nsmap={"m": M_NS})
    for k, v in attrs.items():
        e.set("{%s}%s" % (M_NS, k), v)
    return e


def _w(tag, **attrs):
    e = etree.Element("{%s}%s" % (W_NS, tag))
    for k, v in attrs.items():
        e.set("{%s}%s" % (W_NS, k), v)
    return e


def _mrun(text, bold, size):
    text = re.sub(r"(?<![A-Za-z0-9])-(?=\d)", "\u2212", text)      # a hyphen before a number is a minus sign
    r = _m("r")
    rpr = _m("rPr"); rpr.append(_m("nor")); r.append(rpr)
    wr = _w("rPr")
    wr.append(_w("rFonts", ascii="Cambria Math", hAnsi="Cambria Math", cs="Cambria Math"))
    if bold:
        wr.append(_w("b"))
    wr.append(_w("sz", val=str(int(size * 2))))
    r.append(wr)
    t = _m("t"); t.text = text; t.set("{%s}space" % XML_NS, "preserve"); r.append(t)
    return r


def _match(s, i, o, c):
    depth = 0
    for j in range(i, len(s)):
        if s[j] == o:
            depth += 1
        elif s[j] == c:
            depth -= 1
            if depth == 0:
                return j
    raise ValueError("unbalanced %r in %r" % (o, s))


def _split_top(s):
    depth = 0
    for j, ch in enumerate(s):
        if ch in "{([":
            depth += 1
        elif ch in "})]":
            depth -= 1
        elif ch == "|" and depth == 0:
            return s[:j], s[j + 1:]
    raise ValueError("fraction needs a | in %r" % s)


def _parse(s, size, fd=False):
    items, buf, bold = [], "", False

    def flush():
        nonlocal buf
        if buf:
            items.append(_mrun(buf, bold, size))
            buf = ""

    i = 0
    while i < len(s):
        c = s[i]
        if s.startswith("**", i):
            flush(); bold = not bold; i += 2
        elif c == "{":
            j = _match(s, i, "{", "}")
            a, b = _split_top(s[i + 1:j]); flush()
            f = _m("f"); n = _m("num"); n.extend(_parse(a, size, fd)); dn = _m("den"); dn.extend(_parse(b, size, fd))
            f.append(n); f.append(dn); items.append(f); i = j + 1
        elif s.startswith("sqrt{", i):
            j = _match(s, i + 4, "{", "}"); flush()
            rad = _m("rad"); pr = _m("radPr"); pr.append(_m("degHide", val="1")); rad.append(pr); rad.append(_m("deg"))
            e = _m("e"); e.extend(_parse(s[i + 5:j], size, True)); rad.append(e); items.append(rad); i = j + 1
        elif c in _CLOSE:
            cl = _CLOSE[c]; j = _match(s, i, c, cl); flush()
            inner = _parse(s[i + 1:j], size, fd)
            takes_script = s[j + 1:j + 2] in ("^", "_") and s[j + 2:j + 3] == "{"
            tall = any(el.tag in ("{%s}f" % M_NS, "{%s}rad" % M_NS) for el in inner)
            if takes_script or tall or fd or c == "(":
                dl = _m("d"); pr = _m("dPr"); pr.append(_m("begChr", val=c)); pr.append(_m("endChr", val=cl)); dl.append(pr)
                e = _m("e"); e.extend(inner); dl.append(e); items.append(dl)
            else:
                items.append(_mrun(c, bold, size)); items.extend(inner); items.append(_mrun(cl, bold, size))
            i = j + 1
        elif c in "^_" and s[i + 1:i + 2] == "{":
            j = _match(s, i + 1, "{", "}")
            arg = _parse(s[i + 2:j], size, fd)
            m = re.search(r"[A-Za-z0-9.₀-₉ΔΣ°]+$", buf)
            if m:
                base, buf = buf[m.start():], buf[:m.start()]
                flush(); base_el = _mrun(base, bold, size)
            elif not buf and items:
                base_el = items.pop()
            else:
                raise ValueError("nothing to attach %s to in %r" % (c, s))
            up = c == "^"
            sc = _m("sSup" if up else "sSub"); e = _m("e"); e.append(base_el); sc.append(e)
            sp = _m("sup" if up else "sub"); sp.extend(arg); sc.append(sp); items.append(sc); i = j + 1
        else:
            buf += c; i += 1
    flush()
    return items


def add_math(paragraph, markup, size=10.5, left_align=True):
    """Append a display equation to an existing python-docx paragraph."""
    omp = _m("oMathPara"); pr = _m("oMathParaPr"); pr.append(_m("jc", val="left" if left_align else "center")); omp.append(pr)
    om = _m("oMath"); om.extend(_parse(markup, size)); omp.append(om)
    paragraph._p.append(omp)
    return paragraph
