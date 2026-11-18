"""Audit the deck the way the audience sees it: rebuild every slide after 0, 1, 2 ... N clicks, estimate where the text really
sits, and flag any two text blocks that overlap.  Also writes one big PPTX with every click state as its own slide for viewing.

    python3 audit.py [out.pptx] [--only N,M]      (slide numbers are 1-based positions in the deck)
"""
import os, sys, math
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import core
from core import *
import make_deck

E_IN = 914400.0


def _text_info(sh):
    tf = sh.text_frame
    paras = []
    for p in tf.paragraphs:
        txt_ = "".join(r.text for r in p.runs)
        if not txt_.strip():
            continue
        size = 18.0
        bold = False
        for r in p.runs:
            if r.font.size:
                size = r.font.size.pt
            bold = bool(r.font.bold) or bold
        sup = any(r._r.get_or_add_rPr().get("baseline") for r in p.runs)
        paras.append((txt_, size, bold, p.alignment))
    return paras


def text_bbox(sh):
    """Approximate rectangle (inches) that the text of a shape really covers, or None."""
    try:
        if not sh.has_text_frame:
            return None
    except Exception:
        return None
    paras = _text_info(sh)
    if not paras:
        return None
    tf = sh.text_frame
    if sh.rotation:
        return None
    L, T, Wd, Ht = sh.left / E_IN, sh.top / E_IN, sh.width / E_IN, sh.height / E_IN
    ml, mr = (tf.margin_left or 0) / E_IN, (tf.margin_right or 0) / E_IN
    mt, mb = (tf.margin_top or 0) / E_IN, (tf.margin_bottom or 0) / E_IN
    avail = max(Wd - ml - mr, 0.1)
    wrap = tf.word_wrap is not False
    line_w, total_h = 0.0, 0.0
    for txt_, size, bold, al in paras:
        words = txt_.split(" ")
        cur, lines, widest = 0.0, 1, 0.0
        for w in words:
            ww = text_width_pt(w + " ", size, bold) / 72.0
            if wrap and cur + ww > avail + 0.02 and cur > 0:
                lines += 1; widest = max(widest, cur); cur = ww
            else:
                cur += ww
        widest = max(widest, cur)
        line_w = max(line_w, min(widest, avail) if wrap else widest)
        total_h += lines * size * 1.2 / 72.0
    al = paras[0][3]
    if al is None or int(al) == 1:       # left
        x0 = L + ml
    elif int(al) == 2:                    # center
        x0 = L + ml + (avail - line_w) / 2
    else:
        x0 = L + Wd - mr - line_w
    anchor = tf.vertical_anchor
    if anchor is not None and int(anchor) == 3:     # middle
        y0 = T + (Ht - total_h) / 2
    elif anchor is not None and int(anchor) == 4:   # bottom
        y0 = T + Ht - mb - total_h
    else:
        y0 = T + mt
    return (x0, y0, x0 + line_w, y0 + total_h)


def _walk(shapes, group=None):
    for sh in shapes:
        if sh.shape_type == 6:           # group
            yield from _walk(sh.shapes, sh)
        else:
            yield sh, group


def overlaps(slide, min_ratio=0.12):
    items = []
    for sh, grp in _walk(slide.shapes):
        bb = text_bbox(sh)
        if bb:
            items.append((sh, grp, bb))
    out = []
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            a, ga, ba = items[i]; b, gb, bb = items[j]
            if ga is not None and ga is gb:
                continue
            ix = min(ba[2], bb[2]) - max(ba[0], bb[0])
            iy = min(ba[3], bb[3]) - max(ba[1], bb[1])
            if ix <= 0.02 or iy <= 0.02:
                continue
            area = ix * iy
            small = min((ba[2] - ba[0]) * (ba[3] - ba[1]), (bb[2] - bb[0]) * (bb[3] - bb[1]))
            if small > 0 and area / small >= min_ratio and area > 0.012:
                ta = "".join(r.text for p in a.text_frame.paragraphs for r in p.runs)[:28]
                tb = "".join(r.text for p in b.text_frame.paragraphs for r in p.runs)[:28]
                out.append((ta, tb, round(area / small, 2)))
    return out


def overflow(slide, tol=0.06):
    """Text that spills out of its own box (it would run into whatever sits next to it)."""
    out = []
    for sh, grp in _walk(slide.shapes):
        bb = text_bbox(sh)
        if not bb or grp is not None:
            continue
        L, T, R, B = sh.left / E_IN, sh.top / E_IN, (sh.left + sh.width) / E_IN, (sh.top + sh.height) / E_IN
        over_h = (bb[3] - B) if bb[3] > B + tol else 0
        over_w = (bb[2] - R) if bb[2] > R + tol else 0
        if over_h > 0 or over_w > 0:
            tx = "".join(r.text for p in sh.text_frame.paragraphs for r in p.runs)[:30]
            out.append((tx, round(over_w, 2), round(over_h, 2)))
    return out


def crossfades(tl):
    """Words that fade out and in at the same moment on top of each other (they would ghost through each other)."""
    bad = []
    for ci, c in enumerate(tl.clicks, 1):
        for st in c["stages"]:
            outs = [e for e in st if e.kind in ("fade_out", "vanish")]
            ins = [e for e in st if e.kind in ("fade_in", "appear", "wipe")]
            for eo in outs:
                bo = text_bbox(eo.shape) if hasattr(eo.shape, "text_frame") else None
                for ei in ins:
                    bi = text_bbox(ei.shape) if hasattr(ei.shape, "text_frame") else None
                    if bo and bi:
                        ix = min(bo[2], bi[2]) - max(bo[0], bi[0]); iy = min(bo[3], bi[3]) - max(bo[1], bi[1])
                        if ix > 0.05 and iy > 0.05:
                            bad.append((ci, "".join(r.text for p in eo.shape.text_frame.paragraphs for r in p.runs)[:20],
                                        "".join(r.text for p in ei.shape.text_frame.paragraphs for r in p.runs)[:20]))
    return bad


def main():
    out = "audit_states.pptx"
    only = None
    args = sys.argv[1:]
    for k, a in enumerate(args):
        if a == "--only":
            only = set(int(x) for x in args[k + 1].split(","))
        elif not a.startswith("--") and (k == 0 or args[k - 1] != "--only"):
            out = a
    prs = new_prs()
    fns = make_deck.plan(prs)
    report, index = [], []
    for n, fn in enumerate(fns, 1):
        if only and n not in only:
            continue
        core.STATE = 0
        fn()
        slide, tl = core.LAST
        nclk = len(tl.clicks)
        title = slide.shapes.title.text_frame.text if slide.shapes.title is not None else ""
        index.append((n, 0, nclk, title))
        for msg in overlaps(slide):
            report.append((n, 0, title, "overlap", msg))
        for msg in overflow(slide):
            report.append((n, 0, title, "overflow", msg))
        for k in range(1, nclk + 1):
            core.STATE = k
            fn()
            slide, tl2 = core.LAST
            index.append((n, k, nclk, title))
            for msg in overlaps(slide):
                report.append((n, k, title, "overlap", msg))
        for msg in crossfades(tl2 if nclk else tl):
            report.append((n, msg[0], title, "crossfade", msg[1:]))
    prs.save(out)
    print("states built:", len(index), "->", out)
    seen = set()
    for r in report:
        key = (r[0], r[3], r[4])
        if key in seen:
            continue
        seen.add(key)
        print("slide %d click %d  [%s]  %s: %s" % (r[0], r[1], r[2][:40], r[3], r[4]))
    print("issues:", len(seen))
    import json
    json.dump(index, open(os.path.splitext(out)[0] + "_index.json", "w"))


if __name__ == "__main__":
    main()
