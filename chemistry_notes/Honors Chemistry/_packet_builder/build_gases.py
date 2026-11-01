import sys, os, copy
sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from docx import Document
from docx.oxml import parse_xml
from lib import *
import figs

HERE = os.path.dirname(__file__)
TEMPLATE = os.path.join(HERE, "..", "Student Notes Packets", "Unit 4 - Chemical Reactions - STUDENT NOTES.docx")  # page setup, styles, header/footer
OUTDIR = os.path.join(HERE, "..", "Student Notes Packets")
R = 0.0821


def sf(x, n):
    """Round half-up to n significant figures and return a plain string."""
    from decimal import Decimal, ROUND_HALF_UP
    if x == 0:
        return "0"
    d = n - int(math.floor(math.log10(abs(x)))) - 1
    q = Decimal(1).scaleb(-d)
    v = Decimal(repr(float(x))).quantize(q, rounding=ROUND_HALF_UP)
    return ("%.*f" % (d, v)) if d > 0 else "%d" % v


# ---------------------------------------------------------------- calculations (the answer key)
def K(c): return c + 273

# 7.2 conversions
c_a = K(35.0)                          # 308 K
c_b = 1.25 * 101.3                     # kPa
c_c = 38.0 / 14.7                      # atm
c_d = 745 / 760                        # atm
c_e = 202.6 / 101.3 * 14.7             # psi
c_f = K(-25)

# 7.3 combined gas law
g1 = 11 * 23 * 300 / (200 * 13)
g2 = 18 * 2.3 * 355 / (299 * 1.5)
g3 = 2.0 * 36 * K(45) / (31 * K(35))
g4 = K(13) * 2.5 / 4.1
g5 = 78.89 * 18 * K(94) / (K(67) * 12)
gw = 1.0 * 2.0 * K(-3) / (K(27) * 0.80)

# 7.4 ideal gas law
i1 = 1.00 * 3.90 / (R * K(40.0))
i2 = 0.921 * R * 316 / 1.38
n3 = (790 / 760) * 35.5 / (R * K(100.0)); i3 = n3 * 70.90
i4n = 1.25 * 5.00 / (R * K(25.0)); i4M = 5.00 / i4n
iw_n = 2.50 * 5.00 / (R * K(25)); iw_m = iw_n * 28.02

# 7.5 stoichiometry
oct_mol = 4000.0 / 114.23
co2_L = oct_mol * 8 * R * K(21.0) / 1.00
o2_L = oct_mol * 12.5 * R * K(21.0) / 1.00
e_kJ = oct_mol / 2 * 5460
az_mol = 10.0 / 65.01
n2_mL = az_mol * 1.5 * R * K(32.0) / 0.98 * 1000
az_n2 = 1.0 * 75.0 / (R * 350)
az_g = az_n2 * 2 / 3 * 65.01
zn_mol = 3.27 / 65.38
zn_L = zn_mol * R * K(25) / 1.00

# extra practice
e_c1 = 1.20 * 6.50 * K(60) / (K(25) * 2.00)
e_c2n = 3.00 * 2.50 / (R * K(27)); e_c2 = e_c2n * 44.01
e_c3n = 5.00 / 100.09; e_c3 = e_c3n * R * K(25) / 1.00
e_a = (0.850 * 760, 215 / 101.3, K(-40.0), 29.4 / 14.7 * 101.3)

if __name__ == "__main__":
    pass


class Packet:
    def __init__(self, teacher):
        self.T = teacher
        self.doc = Document(TEMPLATE)
        body = self.doc.element.body
        self.sect = body.sectPr
        for el in list(body):
            if el is not self.sect:
                body.remove(el)
        self.body = body
        self.imgs = {}

    # ------------------------------------------------------------ low-level
    def emit(self, xml):
        el = parse_xml(xml.replace("<w:tbl>", "<w:tbl %s>" % NS, 1) if xml.startswith("<w:tbl>")
                       else xml.replace("<w:p>", "<w:p %s>" % NS, 1) if xml.startswith("<w:p>") else xml)
        self.sect.addprevious(el)

    def pic(self, path, w_in):
        im = Image.open(path)
        h_in = w_in * im.height / im.width
        rid, _ = self.doc.part.get_or_add_image(path)
        n = len(self.imgs) + 1
        self.imgs[path] = rid
        cx, cy = int(w_in * 914400), int(h_in * 914400)
        return ('<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="%d" cy="%d"/>'
                '<wp:docPr id="%d" name="Figure %d"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/>'
                '</wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
                '<pic:pic><pic:nvPicPr><pic:cNvPr id="%d" name="fig%d.png"/><pic:cNvPicPr/></pic:nvPicPr>'
                '<pic:blipFill><a:blip r:embed="%s"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
                '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="%d" cy="%d"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/>'
                '</a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
                ) % (cx, cy, 100 + n, n, 100 + n, n, rid, cx, cy), h_in

    def pic_par(self, path, w_in, jc="center", after=40):
        r, h = self.pic(path, w_in)
        return '<w:p><w:pPr><w:spacing w:before="0" w:after="%d"/><w:jc w:val="%s"/></w:pPr>%s</w:p>' % (after, jc, r), h

    # ------------------------------------------------------------ blocks
    def title(self, unit, name, sub):
        c = para("HONORS CHEMISTRY • UNIT %s" % unit, sz=22, b=True, color="000000", after=0)
        c += para(name, sz=68, b=True, color="000000", before=120, after=0, line=228)
        c += para(sub, sz=26, color=INK, before=160, after=0)
        b = ('<w:top w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="36" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        FLOW.add(1.55)
        self.emit(tbl([10080], [tr([tc(10080, c, fill="EDEDED", borders=b, mar=(200, 280, 200, 200), valign="center")],
                                   h=1.5)]))
        self.emit(spacer())

    def box(self, label, paras, kind="plain", keep=False):
        """kind: plain (callout) | teacher (heavy-bordered answer-key note)."""
        if kind == "teacher" and not self.T:
            return
        teacher = kind == "teacher"
        color = GRAY_T if teacher else DARK
        sz = 20 if teacher else 21
        fill = "D9D9D9" if teacher else "F4F4F4"
        bar = left_bar(color, 30 if teacher else 24)
        c = para(label, sz=17, b=True, color=color, after=40, keep=keep)
        h = 0.32
        for t in paras:
            if t.startswith("•  "):
                c += para(t, sz=sz, after=30, line=264, left=288, hanging=230, keep=keep)
            else:
                c += para(t, sz=sz, after=60, line=269, keep=keep)
            h += txt_h(t, sz / 2, 6.4, 1.1) + 0.05
        FLOW.add(h)
        self.emit(tbl([10080], [tr([tc(10080, c, fill=fill, borders=bar, mar=(50, 170, 50, 140))])]))
        self.emit(spacer())

    def topic(self, num, name, sub):
        FLOW.add(0.5)
        FLOW.mark("%s %s" % (num, name))
        b = ('<w:top w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:left w:val="nil"/>'
             '<w:bottom w:val="single" w:sz="24" w:space="0" w:color="000000"/><w:right w:val="nil"/>')
        c1 = para(num, sz=30, b=True, color="000000", after=0, keep=True)
        c2 = para(name, sz=28, b=True, color="000000", after=0, keep=True)
        c2 = c2.replace("</w:p>", runs("    " + sub, 18, "323232", i=True) + "</w:p>")
        self.emit(tbl([1080, 9000], [tr([tc(1080, c1, fill="D9D9D9", borders=b, mar=(40, 120, 40, 100), valign="center"),
                                         tc(9000, c2, fill="EDEDED", borders=b, mar=(40, 120, 40, 100),
                                            valign="center")])]))
        self.emit(spacer(0.08))

    def sub(self, text):
        FLOW.add(0.3)
        self.emit(para(text, sz=25, b=True, color="000000", before=60, after=60, keep=True))

    def note(self, text, size=21):
        FLOW.add(txt_h(text, size / 2, 7.0) + 0.06)
        self.emit(para(text, sz=size, after=60, line=264))

    def q(self, num, text):
        FLOW.add(txt_h(text, 10.5, 6.7) + 0.1)
        c = para("", keep=True)
        p = ('<w:p><w:pPr><w:keepNext/><w:spacing w:before="60" w:after="40" w:line="264" w:lineRule="auto"/>'
             '<w:ind w:left="461" w:hanging="461"/></w:pPr>%s%s</w:p>') % (
            runs("%s.  " % num, 21, DARK, b=True), runs(text, 21, INK))
        self.emit(p)

    def ans_para(self, text, sz=20):
        return para(text, sz=sz, color=INK, shade="D9D9D9", before=20, after=20, line=252)

    def ansbox(self, h, label=None, ans=None):
        """Bordered work space. Teacher edition shows `ans` (list of strings) in gray."""
        c = ""
        if label:
            c += para(label, sz=19, b=True, color=GRAY_T, after=0)
        fill = None
        if self.T and ans:
            fill = "D9D9D9"
            for a in ans:
                c += para(a, sz=20, after=40, line=252)
            h = max(h, 0.1 + sum(txt_h(a, 10, 6.7) for a in ans))
        FLOW.add(h + 0.04)
        self.emit(tbl([10080], [tr([tc(10080, c, fill=fill, mar=(70, 90, 50, 80))], h=h)]))
        self.emit(spacer())

    def mc(self, num, stem, opts, answer, why=""):
        FLOW.add(0.55 + (0.2 if self.T else 0))
        p = ('<w:p><w:pPr><w:keepNext/><w:spacing w:before="60" w:after="40" w:line="264" w:lineRule="auto"/>'
             '<w:ind w:left="461" w:hanging="461"/></w:pPr>%s%s</w:p>') % (
            runs("%s.  " % num, 21, DARK, b=True), runs(stem, 21, INK))
        self.emit(p)
        letters = "ABCD"
        line = "        ".join("%s)  %s" % (letters[i], o) for i, o in enumerate(opts))
        self.emit(para(line, sz=21, left=461, after=40, keep=self.T))
        if self.T:
            self.emit(self.ans_para("Answer: %s%s" % (answer, (" — " + why) if why else ""), 19))

    def table(self, widths, header, rows, heights, hdr_fill="D9D9D9", first_bold=True, sz=20, vtop=True, term_col=False):
        """rows: list of lists; a cell is str (printed), Ans (teacher only) or list of those."""
        out = []
        hc = []
        for w, h in zip(widths, header):
            hc.append(tc(w, para(h, sz=19, b=True, color="000000", after=0, keep=True), fill=hdr_fill))
        out.append(tr(hc, header=True))
        FLOW.add(0.3)
        for ri, row in enumerate(rows):
            cells = []
            hh = heights[ri] if isinstance(heights, (list, tuple)) else heights
            need = 0
            for ci, (w, cell) in enumerate(zip(widths, row)):
                items = cell if isinstance(cell, (list, tuple)) else [cell]
                content = ""
                fill = None
                for it in items:
                    if isinstance(it, Ans):
                        if self.T:
                            fill = "D9D9D9"
                            content += para(str(it), sz=sz, after=30, line=252)
                            need = max(need, 0.12 + txt_h(str(it), sz / 2, w / 1440 - 0.2))
                    elif isinstance(it, Hint):
                        content += para(str(it), sz=18, i=True, color="656565", after=30, line=252)
                        need = max(need, 0.12 + txt_h(str(it), 9, w / 1440 - 0.2))
                    else:
                        content += para(str(it), sz=22 if (term_col and ci == 0) else sz,
                                        b=(term_col and ci == 0) or (first_bold and ci == 0 and len(widths) > 1
                                                                      and len(str(it)) < 4),
                                        after=30, line=252)
                        need = max(need, 0.12 + txt_h(str(it), sz / 2, w / 1440 - 0.2))
                cells.append(tc(w, content, fill=fill, mar=(70, 80, 50, 70), valign="top" if vtop else None))
            out.append(tr(cells, h=hh))
            FLOW.add(max(hh, need) + 0.01)
        self.emit(tbl(list(widths), out))
        self.emit(spacer())

    def figure(self, path, w_in, caption=None, jc="center"):
        p, h = self.pic_par(path, w_in, jc)
        FLOW.add(h + 0.1)
        self.emit(p)
        if caption:
            FLOW.add(0.22)
            self.emit(para(caption, sz=18, color="323232", jc=jc, after=60))

    # ------------------------------------------------------------ save
    def save(self, path, unit_label, title):
        sec = self.doc.sections[0]
        for r in sec.footer.paragraphs[0].runs:
            if "Unit 4" in r.text:
                r.text = "  Unit 7: "
            elif r.text.startswith("Reactions"):
                r.text = "Gases  •" if not self.T else "Gases  •"
        if self.T:
            for r in sec.footer.paragraphs[0].runs:
                if r.text.strip() == "page":
                    r.text = "  TEACHER EDITION  •  page "
        self.doc.core_properties.title = title
        self.doc.save(path)
