"""Build the 30-question quiz and answer key (.docx) from questions.py."""
import os
import collections
from PIL import Image
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Inches, Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

import questions as qmod
from chemdraw import Text, compose

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, ".."))
IMG = qmod.IMG
LETTERS = qmod.LETTERS
PX_PER_INCH = 125.0  # drawing pixels per inch on the page (bond = ~0.38 in)


def finalize(Q):
    for q in Q:
        n = q["n"]
        letter = LETTERS[n - 1]
        q["correct"] = letter
        idx = "ABCD".index(letter)
        if "choices" in q:
            opts = list(q["choices"][1:])
            opts.insert(idx, q["choices"][0])
            q["opts"] = [("text", t) for t in opts]
        elif q.get("arrow_q"):
            q["opts"] = [("img", p) for _, p in q["choices_img"]]
        else:
            entries = list(q["choices_img"][1:])
            entries.insert(idx, q["choices_img"][0])
            opts = []
            for k, e in enumerate(entries):
                L = "ABCD"[k]
                if e[0] == "text":
                    opts.append(("text", e[1]))
                else:
                    path = os.path.join(IMG, f"q{n:02d}_{L}.png")
                    compose([Text(L + ")", 22, True), qmod.S(e[2], lone=[])], path=path, gap=14)
                    opts.append(("img", path))
            q["opts"] = opts
    return Q


def img_width(path):
    w, _ = Image.open(path).size
    return min(5.8, (w / 3.0) / PX_PER_INCH)


def keep_next(p):
    p.paragraph_format.keep_with_next = True


def setup(doc, title):
    sec = doc.sections[0]
    sec.left_margin = sec.right_margin = Inches(0.9)
    sec.top_margin = sec.bottom_margin = Inches(0.8)
    st = doc.styles["Normal"]
    st.font.name = "Calibri"
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    st.font.size = Pt(11)
    # footer page number
    fp = sec.footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run(title + "  –  Page ")
    r.font.size = Pt(9)
    for tag, text in (("begin", None), (None, "PAGE"), ("end", None)):
        run = fp.add_run()
        run.font.size = Pt(9)
        if tag:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tag)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = text
        run._r.append(el)


def add_choice_text(doc, letter, text, bold=False):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.left_indent = Inches(0.55)
    pf.first_line_indent = Inches(-0.3)
    pf.space_after = Pt(2)
    r = p.add_run(f"{letter})  {text}")
    r.bold = bold
    return p


def no_split(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement("w:cantSplit"))


def add_question_block(doc, q):
    """One question per single-cell table row that cannot split across pages."""
    t = doc.add_table(rows=1, cols=1)
    no_split(t.rows[0])
    cell = t.cell(0, 0)
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(3)
    r = p.add_run(f"{q['n']}.  ")
    r.bold = True
    p.add_run(q["stem"])
    if q.get("stem_img"):
        ip = cell.add_paragraph()
        ip.paragraph_format.left_indent = Inches(0.3)
        ip.paragraph_format.space_after = Pt(2)
        ip.add_run().add_picture(q["stem_img"], width=Inches(img_width(q["stem_img"])))
    if any(kind == "img" for kind, _ in q["opts"]):
        grid = cell.add_table(rows=2, cols=2)
        for k, (kind, val) in enumerate(q["opts"]):
            c = grid.cell(k // 2, k % 2)
            cp = c.paragraphs[0]
            cp.paragraph_format.space_after = Pt(2)
            if kind == "img":
                cp.add_run().add_picture(val, width=Inches(min(img_width(val), 3.1)))
            else:
                cp.paragraph_format.left_indent = Inches(0.35)
                cp.paragraph_format.first_line_indent = Inches(-0.3)
                cp.add_run("ABCD"[k] + ")  ").bold = True
                cp.add_run(val)
        tail = cell.add_paragraph()
        tail.paragraph_format.space_after = Pt(6)
    else:
        for k, (kind, val) in enumerate(q["opts"]):
            cp = cell.add_paragraph()
            cp.paragraph_format.left_indent = Inches(0.55)
            cp.paragraph_format.first_line_indent = Inches(-0.3)
            cp.paragraph_format.space_after = Pt(2 if k < 3 else 8)
            cp.add_run(f"{'ABCD'[k]})  {val}")


def build_quiz(Q):
    doc = Document()
    setup(doc, "Acids and Bases Quiz")
    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = h.add_run("Organic Chemistry: Acids and Bases Quiz")
    r.bold = True
    r.font.size = Pt(16)
    p = doc.add_paragraph("Name: ______________________________      Date: _______________      Section: ________")
    p.paragraph_format.space_after = Pt(6)
    p = doc.add_paragraph()
    r = p.add_run("Directions: ")
    r.bold = True
    p.add_run("Choose the single best answer for each question. Do not use pKa values. Use the stability of the "
              "conjugate base and the ARIO factors (Atom, Resonance, Induction, Orbital) to reason through each problem. "
              "In structures, red H atoms are the hydrogens being compared, curved arrows show the movement of "
              "electron pairs, and a circled minus sign is a formal negative charge.")
    p.paragraph_format.space_after = Pt(10)

    for q in Q:
        add_question_block(doc, q)
    out = os.path.join(OUT, "Acids_Bases_Quiz.docx")
    doc.save(out)
    return out


def build_key(Q):
    doc = Document()
    setup(doc, "Acids and Bases Quiz: Answer Key")
    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = h.add_run("Acids and Bases Quiz: Answer Key")
    r.bold = True
    r.font.size = Pt(16)

    doc.add_paragraph("Quick key").runs[0].bold = True
    t = doc.add_table(rows=1, cols=4)
    t.style = "Light Grid Accent 1"
    hdr = t.rows[0].cells
    for c, txt in zip(hdr, ("Q", "Answer", "Focus", "Level")):
        c.text = txt
    for q in Q:
        row = t.add_row().cells
        row[0].text = str(q["n"])
        row[1].text = q["correct"]
        row[2].text = q["topic"]
        row[3].text = q["level"]
    doc.add_paragraph()
    counts = collections.Counter(q["correct"] for q in Q)
    doc.add_paragraph("Answer distribution: " + ", ".join(f"{k} = {counts[k]}" for k in "ABCD"))

    doc.add_page_break()
    p = doc.add_paragraph()
    r = p.add_run("ARIO reminder")
    r.bold = True
    doc.add_paragraph("Priority order for comparing conjugate-base stability: (1) Atom (same row: electronegativity; "
                      "same column: size), (2) Resonance, (3) Induction, (4) Orbital (sp > sp² > sp³). "
                      "For equilibrium, the position favors the more stable ion (weaker base, weaker acid).")

    for q in Q:
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        keep_next(p)
        r = p.add_run(f"{q['n']}.  Answer: {q['correct']}")
        r.bold = True
        p.add_run(f"   ({q['topic']}; {q['level']})").italic = True
        k = "ABCD".index(q["correct"])
        kind, val = q["opts"][k]
        if kind == "text":
            cp = add_choice_text(doc, q["correct"], val)
            keep_next(cp)
        else:
            cp = doc.add_paragraph()
            cp.paragraph_format.left_indent = Inches(0.3)
            cp.add_run().add_picture(val, width=Inches(img_width(val)))
            keep_next(cp)
        wp = doc.add_paragraph()
        wp.paragraph_format.left_indent = Inches(0.25)
        wr = wp.add_run("Why: ")
        wr.bold = True
        wr.font.color.rgb = RGBColor(0x1F, 0x4E, 0x79)
        wp.add_run(q["why"])
    out = os.path.join(OUT, "Acids_Bases_Quiz_Answer_Key.docx")
    doc.save(out)
    return out


if __name__ == "__main__":
    Q = finalize(qmod.build())
    print("answer distribution:", dict(collections.Counter(q["correct"] for q in Q)))
    print(build_quiz(Q))
    print(build_key(Q))
