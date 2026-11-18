"""Builds the Unit 5 free response PRACTICE page (page 1) with its ANSWER KEY (page 2).

Same two-question format as the three free response tests (a metal oxide lab, then a hydrate lab), but with a different metal
(iron) and a different hydrate (sodium carbonate decahydrate).  Every number is computed from the printed data and checked by
make_fr_tests.compute().   Run:  python3 make_fr_practice.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_fr_tests as T
from make_fr_tests import build_student, key_version, compute, fmt, run, rule, footer

PRACTICE = dict(ver="P",
                metal="iron", sym="Fe", oxide="Fe₂O₃", sub=(2, 3), crucible=22.18, m_metal=1.60,
                eq="4 Fe + 3 O₂ → 2 Fe₂O₃",
                salt="sodium carbonate", salt_f="Na₂CO₃", salt_mm=T.mm("Na2CO3"), x=10, hyd_name="sodium carbonate decahydrate",
                hyd_f="Na₂CO₃ · xH₂O", hyd_c=22.73, m_hyd=3.50)
compute(PRACTICE)

OUT = os.path.join(T.HERE, "..", "Free Response Tests")


def build():
    d = build_student(PRACTICE, title="Moles and Molar Quantities: Free Response Practice", tag="Practice",
                      foot="Honors Chemistry  •  Unit 5 Free Response Practice")
    # answer key on page 2
    p = fmt(d.add_paragraph(), after=2)
    p.paragraph_format.page_break_before = True
    run(p, "Free Response Practice: ANSWER KEY", 15, bold=True)
    p = fmt(d.add_paragraph(), after=3)
    run(p, "Every value is computed from the printed data (atomic masses to 0.01 g/mol, N", 9, color="555555")
    run(p, "A", 9, color="555555")
    run(p, " = 6.022 × 10²³). Accept an answer within one rounding digit if the work is correct. Q1 is 10 points and Q2 is 10 points.", 9, color="555555")
    rule(p)
    key_version(d, PRACTICE, first=True, label="Practice")
    return d


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    f = os.path.join(OUT, "Unit 5 - Moles - Free Response PRACTICE (with answer key).docx")
    build().save(f)
    v = PRACTICE
    print(f)
    print("ratio O/Fe = %.3f | x = %.2f | percent water = %.1f%% | O mass %.2f g | atoms %.3e" % (v["ratio"], v["x_calc"], v["pct_water"], v["g_O"], v["atoms"]))
