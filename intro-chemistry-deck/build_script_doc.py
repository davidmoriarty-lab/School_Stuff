"""Builds Intro_to_Chemistry_Script.docx from script.json (written by build_deck.js).
The same text is also in the PowerPoint's speaker notes, so presenter view shows it live.
  python3 build_script_doc.py
"""
import json
import os
import re
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(HERE, "script.json")))
WPM = 180                      # a fast talker; change to taste
OPTIONAL = {12: "Alkali metals in water", 15: "Flame tests", 26: "Acids and bases"}
ORANGE = RGBColor(0xE0, 0x5A, 0x00)
GREY = RGBColor(0x55, 0x5B, 0x70)


def spoken_words(text):
    paras = [p for p in text.split("\n\n") if not p.strip().startswith("(Teacher note")]
    return len(re.sub(r"\[CLICK\]", "", " ".join(paras)).split())


def shade(par, hex_fill):
    ppr = par._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    ppr.append(shd)


def add_runs(par, text, size=12):
    for piece in re.split(r"(\[CLICK\])", text):
        if not piece:
            continue
        r = par.add_run(piece)
        r.font.size = Pt(size)
        if piece == "[CLICK]":
            r.bold = True
            r.font.color.rgb = ORANGE


doc = Document()
for sec in doc.sections:
    sec.left_margin = sec.right_margin = Inches(0.9)
    sec.top_margin = sec.bottom_margin = Inches(0.8)
st = doc.styles["Normal"]
st.font.name = "Calibri"
st.font.size = Pt(12)

doc.add_heading("Intro to Chemistry: Talk Script", level=0)
p = doc.add_paragraph()
add_runs(p, "Day-one talk: why does anything do anything? The same text is in the speaker notes of Intro_to_Chemistry.pptx, "
            "so Presenter View shows it as you go. ")
r = p.add_run("[CLICK]")
r.bold = True
r.font.color.rgb = ORANGE
p.add_run(" means advance the slide (every click triggers the next animation). Say what comes after the marker as the thing appears.")

total_words = sum(spoken_words(e["notes"]) for e in DATA)
opt_words = sum(spoken_words(e["notes"]) for e in DATA if e["n"] in OPTIONAL)
demo_n = [e["n"] for e in DATA if e.get("demo")]
doc.add_heading("Timing", level=1)
doc.add_paragraph(
    f"Spoken script: about {total_words:,} words, which is roughly {total_words / WPM:.0f} minutes at {WPM} words per minute "
    f"(about {total_words / 160:.0f} minutes at a calmer 160), plus however long you take on the two demos (slides {demo_n[0]} and {demo_n[1]}).")
doc.add_paragraph(
    f"To land near 15 minutes, skip the optional slides ({', '.join(str(n) for n in OPTIONAL)}: "
    f"{', '.join(OPTIONAL.values())}). That cuts about {opt_words / WPM:.1f} minutes and every other idea still follows from the one before it. "
    "In PowerPoint: right-click the slide in the thumbnail list, then Hide Slide.")

t = doc.add_table(rows=1, cols=3)
t.style = "Light Grid Accent 1"
for c, h in zip(t.rows[0].cells, ["Slide", "Topic", "About"]):
    c.text = h
for e in DATA:
    row = t.add_row().cells
    row[0].text = str(e["n"])
    note = "  (optional)" if e["n"] in OPTIONAL else ("  (demo, plus your demo time)" if e.get("demo") else "")
    row[1].text = e["title"] + note
    row[2].text = f"{round(spoken_words(e['notes']) / WPM * 60)} s"
for row in t.rows:
    for c in row.cells:
        for pp in c.paragraphs:
            for rr in pp.runs:
                rr.font.size = Pt(10.5)
    row.cells[0].width = Inches(0.6)
    row.cells[1].width = Inches(4.9)
    row.cells[2].width = Inches(0.9)

# (no page break: the script follows the timing table)
doc.add_heading("Script", level=1)
for e in DATA:
    h = doc.add_heading(f"{e['n']}. {e['title']}", level=2)
    meta = doc.add_paragraph()
    mr = meta.add_run(f"about {round(spoken_words(e['notes']) / WPM * 60)} seconds" +
                      ("   |   optional if you are short on time" if e["n"] in OPTIONAL else "") +
                      ("   |   DEMO SLIDE: talk, then click once you have finished the demo" if e.get("demo") else ""))
    mr.italic = True
    mr.font.size = Pt(10)
    mr.font.color.rgb = GREY
    for para in e["notes"].split("\n\n"):
        pp = doc.add_paragraph()
        pp.paragraph_format.space_after = Pt(6)
        if para.strip().startswith("(Teacher note"):
            add_runs(pp, para.strip(), size=10.5)
            for r in pp.runs:
                r.italic = True
            shade(pp, "FFF1E0")
        else:
            add_runs(pp, para.strip())

out = os.path.join(HERE, "Intro_to_Chemistry_Script.docx")
doc.save(out)
print("wrote", out, f"| {total_words} spoken words, {total_words / WPM:.1f} min at {WPM} wpm")
