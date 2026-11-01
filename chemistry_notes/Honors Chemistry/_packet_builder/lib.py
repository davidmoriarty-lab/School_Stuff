"""Small XML helpers that reproduce the Unit 5 packet look (python-docx + raw WordprocessingML)."""
import math, re
from xml.sax.saxutils import escape
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

NS = nsdecls("w", "wp", "a", "pic", "r")
INK, DARK, GRAY_T = "191919", "262626", "6E6E6E"
BORD = "".join(
    '<w:%s w:val="single" w:sz="6" w:space="0" w:color="8C8C8C"/>' % s for s in ("top", "left", "bottom", "right")
)
USABLE_IN = 7.0
PAGE_IN = 9.72      # usable body height used for the layout estimate


class Flow:
    """Rough page-fill estimate so we can see where pages break before rendering."""

    def __init__(self):
        self.cur = 0.0
        self.page = 1
        self.marks = []

    def add(self, h):
        if self.cur + h > PAGE_IN:
            self.page += 1
            self.cur = 0
        self.cur += h

    def hard_break(self):
        self.page += 1
        self.cur = 0

    def mark(self, name):
        self.marks.append((name, self.page, round(self.cur, 2)))


FLOW = Flow()


def txt_h(text, pt, width_in, line_mult=1.0):
    plain = re.sub(r"\*\*", "", text)
    cpl = max(10, width_in * 72 / (pt * 0.50))
    lines = 0
    for seg in plain.split("\n"):
        lines += max(1, math.ceil(len(seg) / cpl))
    return lines * pt * 1.22 * line_mult / 72


class Hint(str):
    """Italic gray prompt text shown in a student cell (e.g. the vocabulary prompts)."""


class Ans(str):
    """Marks text that only appears in the teacher edition (shaded gray)."""


def runs(text, sz=20, color=INK, b=False, i=False):
    out = []
    parts = re.split(r"(\*\*)", text)
    bold = b
    for p in parts:
        if p == "**":
            bold = not bold
            continue
        if p == "":
            continue
        chunks = p.split("\n")
        rpr = "<w:rPr>%s%s<w:color w:val=\"%s\"/><w:sz w:val=\"%d\"/></w:rPr>" % (
            "<w:b/>" if bold else "", "<w:i/>" if i else "", color, sz)
        inner = ""
        for k, c in enumerate(chunks):
            if k:
                inner += "<w:br/>"
            inner += '<w:t xml:space="preserve">%s</w:t>' % escape(c)
        out.append("<w:r>%s%s</w:r>" % (rpr, inner))
    return "".join(out)


def para(text="", sz=20, color=INK, b=False, i=False, before=0, after=60, line=None, left=None, hanging=None,
         keep=False, jc=None, shade=None, tabs=None):
    ppr = ""
    if keep:
        ppr += "<w:keepNext/>"
    if shade:
        ppr += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % shade
    ppr += '<w:spacing w:before="%d" w:after="%d"%s/>' % (
        before, after, ' w:line="%d" w:lineRule="auto"' % line if line else "")
    if left is not None:
        ppr += '<w:ind w:left="%d"%s/>' % (left, ' w:hanging="%d"' % hanging if hanging else "")
    if jc:
        ppr += '<w:jc w:val="%s"/>' % jc
    return "<w:p><w:pPr>%s</w:pPr>%s</w:p>" % (ppr, runs(text, sz, color, b, i) if text else "")


def spacer(h_in=0.05):
    FLOW.add(h_in)
    return '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="%d" w:lineRule="exact"/></w:pPr></w:p>' % int(
        h_in * 1440)


def tc(w, content, fill=None, borders=BORD, mar=(50, 90, 50, 80), valign=None, span=None):
    pr = '<w:tcW w:w="%d" w:type="dxa"/>' % w
    if span:
        pr += '<w:gridSpan w:val="%d"/>' % span
    pr += "<w:tcBorders>%s</w:tcBorders>" % borders
    if fill:
        pr += '<w:shd w:val="clear" w:color="auto" w:fill="%s"/>' % fill
    pr += '<w:tcMar><w:top w:w="%d" w:type="dxa"/><w:left w:w="%d" w:type="dxa"/><w:bottom w:w="%d" w:type="dxa"/>' \
          '<w:right w:w="%d" w:type="dxa"/></w:tcMar>' % mar
    if valign:
        pr += '<w:vAlign w:val="%s"/>' % valign
    if not content:
        content = "<w:p/>"
    return "<w:tc><w:tcPr>%s</w:tcPr>%s</w:tc>" % (pr, content)


def tr(cells, h=None, header=False, cant=True, exact=False):
    pr = ""
    if cant:
        pr += "<w:cantSplit/>"
    if h:
        pr += '<w:trHeight w:val="%d"%s/>' % (int(h * 1440), ' w:hRule="exact"' if exact else "")
    if header:
        pr += "<w:tblHeader/>"
    return "<w:tr><w:trPr>%s</w:trPr>%s</w:tr>" % (pr, "".join(cells))


def tbl(grid, rows, jc=None):
    return ('<w:tbl><w:tblPr><w:tblW w:w="%d" w:type="dxa"/>%s<w:tblLayout w:type="fixed"/>'
            '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" '
            'w:noHBand="0" w:noVBand="1"/></w:tblPr><w:tblGrid>%s</w:tblGrid>%s</w:tbl>') % (
        sum(grid), '<w:jc w:val="%s"/>' % jc if jc else "",
        "".join('<w:gridCol w:w="%d"/>' % g for g in grid), "".join(rows))


NOBORD = "".join('<w:%s w:val="nil"/>' % s for s in ("top", "left", "bottom", "right"))


def left_bar(color, sz=24):
    return ('<w:top w:val="nil"/><w:left w:val="single" w:sz="%d" w:space="0" w:color="%s"/>'
            '<w:bottom w:val="nil"/><w:right w:val="nil"/>') % (sz, color)
