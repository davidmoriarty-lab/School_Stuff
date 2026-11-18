"""Adds PowerPoint animations and slide transitions to deck_raw.pptx.

pptxgenjs cannot write animations, so build_deck.js records a plan in anim.json
("on click, zoom these shapes in", "move this atom", ...) and this script turns the
plan into the <p:timing> XML that PowerPoint plays. Shapes are found by the
objectName that build_deck.js gave them.

  python3 add_animations.py   ->  Intro_to_Chemistry.pptx

How PowerPoint stores animation (the part that is easy to get wrong):
  timing > main sequence > one <par> per CLICK
                          > one inner <par> per "start after previous" block
                            > one <par> per effect (nodeType: clickEffect /
                              withEffect / afterEffect)
Each effect is a few small behaviours (set visibility, fade, scale, motion...).
"""
import json
import os
import re
import sys
import zipfile
from lxml import etree

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "deck_raw.pptx")
DST = os.path.join(HERE, "Intro_to_Chemistry.pptx")
NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main",
      "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
SW, SH = 13.333, 7.5


class Ids:
    def __init__(self):
        self.n = 2

    def next(self):
        self.n += 1
        return self.n


def tgt(spid):
    return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def set_vis(ids, spid, value="visible", delay=0):
    return (f'<p:set><p:cBhvr><p:cTn id="{ids.next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="{delay}"/></p:stCondLst></p:cTn>'
            f'{tgt(spid)}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>'
            f'<p:to><p:strVal val="{value}"/></p:to></p:set>')


def anim_effect(ids, spid, filt, dur, transition="in"):
    return (f'<p:animEffect transition="{transition}" filter="{filt}"><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}"/>'
            f'{tgt(spid)}</p:cBhvr></p:animEffect>')


def anim_wh(ids, spid, attr, dur):
    return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}" fill="hold"/>{tgt(spid)}'
            f'<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst>'
            f'<p:tav tm="0"><p:val><p:fltVal val="0"/></p:val></p:tav>'
            f'<p:tav tm="100000"><p:val><p:strVal val="#{attr}"/></p:val></p:tav></p:tavLst></p:anim>')


def motion(ids, spid, pts, dur, loop=None):
    path = "M 0 0 " + " ".join(f"L {x:.6f} {y:.6f}" for x, y in pts) + " E"
    extra = ""
    if loop == "rev":
        extra = ' repeatCount="indefinite" autoRev="1"'
    elif loop == "rep":
        extra = ' repeatCount="indefinite"'
    return (f'<p:animMotion origin="layout" path="{path}" pathEditMode="relative" rAng="0" ptsTypes="{"A" * (len(pts) + 1)}">'
            f'<p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}"{extra} fill="hold"/>{tgt(spid)}'
            f'<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>')


def effect(ids, eff):
    """One effect (<p:par>) for one shape."""
    fx, spid, dur, delay, nt = eff["fx"], eff["spid"], eff["dur"], eff["delay"], eff["nodeType"]
    cid = ids.next()
    grp = ' grpId="0"' if eff["is_sp"] else ""
    if fx == "fade":
        pid, cls, sub, body = 10, "entr", 0, set_vis(ids, spid) + anim_effect(ids, spid, "fade", dur)
    elif fx == "zoom":
        pid, cls, sub = 53, "entr", 16
        body = set_vis(ids, spid) + anim_wh(ids, spid, "ppt_w", dur) + anim_wh(ids, spid, "ppt_h", dur) + anim_effect(ids, spid, "fade", dur)
    elif fx == "wipeleft":
        pid, cls, sub, body = 22, "entr", 8, set_vis(ids, spid) + anim_effect(ids, spid, "wipe(left)", dur)
    elif fx == "wipeup":      # grows upward, i.e. wipes in from the bottom
        pid, cls, sub, body = 22, "entr", 4, set_vis(ids, spid) + anim_effect(ids, spid, "wipe(down)", dur)
    elif fx == "fadeout":
        pid, cls, sub = 10, "exit", 0
        body = anim_effect(ids, spid, "fade", dur, "out") + set_vis(ids, spid, "hidden", delay=dur - 1)
    elif fx == "pulse":       # grow/shrink emphasis
        pid, cls, sub = 6, "emph", 0
        body = (f'<p:animScale><p:cBhvr><p:cTn id="{ids.next()}" dur="{dur}" autoRev="1" fill="hold"/>{tgt(spid)}</p:cBhvr>'
                f'<p:by x="135000" y="135000"/></p:animScale>')
    elif fx == "move":
        pid, cls, sub = 0, "path", 0
        body = motion(ids, spid, [(eff["dx"], eff["dy"])], dur)
    elif fx == "movepath":
        pid, cls, sub = 0, "path", 0
        body = motion(ids, spid, eff["pts"], dur)
    elif fx in ("loop", "loop1"):
        pid, cls, sub = 0, "path", 0
        body = motion(ids, spid, [(eff["dx"], eff["dy"])], dur, "rev" if fx == "loop" else "rep")
    else:
        raise ValueError("unknown effect " + fx)
    return (f'<p:par><p:cTn id="{cid}" presetID="{pid}" presetClass="{cls}" presetSubtype="{sub}" fill="hold"{grp} nodeType="{nt}">'
            f'<p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par>')


def build_timing(steps, shapes, slide_no):
    """steps: list from anim.json; shapes: name -> (id, is_sp)"""
    clicks = []
    cur = blk = None
    for st in steps:
        trig = st["trig"]
        if trig in ("click", "auto"):
            cur = {"auto": trig == "auto", "blocks": []}
            clicks.append(cur)
            blk = {"start": 0, "end": 0, "effects": []}
            cur["blocks"].append(blk)
        elif trig == "after":
            blk = {"start": blk["end"], "end": blk["end"], "effects": []}
            cur["blocks"].append(blk)
        for i, name in enumerate(st["t"]):
            if name not in shapes:
                raise KeyError(f"slide {slide_no}: no shape named {name!r}")
            spid, is_sp = shapes[name]
            d = int(round((st.get("delay", 0) + i * st.get("stagger", 0)) * 1000))
            dur = int(st.get("dur", 500))
            if i == 0 and trig == "click":
                nt = "clickEffect"
            elif i == 0 and trig in ("auto", "after"):
                nt = "afterEffect"
            else:
                nt = "withEffect"
            eff = {"fx": st["fx"], "spid": spid, "is_sp": is_sp, "dur": dur, "delay": d, "nodeType": nt,
                   "dx": st.get("dx", 0) * 1.0, "dy": st.get("dy", 0) * 1.0, "pts": st.get("pts")}
            blk["effects"].append(eff)
            if st["fx"] not in ("loop", "loop1"):
                blk["end"] = max(blk["end"], blk["start"] + d + dur)
    ids = Ids()
    seq = ""
    for ck in clicks:
        oid = ids.next()
        cond = '<p:cond delay="indefinite"/>'
        if ck["auto"]:
            cond += '<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>'
        inner = ""
        for b in ck["blocks"]:
            bid = ids.next()
            effs = "".join(effect(ids, e) for e in b["effects"])
            inner += f'<p:par><p:cTn id="{bid}" fill="hold"><p:stCondLst><p:cond delay="{b["start"]}"/></p:stCondLst><p:childTnLst>{effs}</p:childTnLst></p:cTn></p:par>'
        seq += f'<p:par><p:cTn id="{oid}" fill="hold"><p:stCondLst>{cond}</p:stCondLst><p:childTnLst>{inner}</p:childTnLst></p:cTn></p:par>'
    bld = ""
    seen = set()
    for st in steps:
        for name in st["t"]:
            spid, is_sp = shapes[name]
            if is_sp and spid not in seen:
                seen.add(spid)
                bld += f'<p:bldP spid="{spid}" grpId="0" animBg="1"/>'
    bld = f"<p:bldLst>{bld}</p:bldLst>" if bld else ""
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            f'{seq}</p:childTnLst></p:cTn>'
            '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
            f'</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>{bld}</p:timing>')


def shapes_of(xml_bytes):
    root = etree.fromstring(xml_bytes)
    out = {}
    for c in root.iterfind(".//p:cNvPr", NS):
        parent = c.getparent().getparent()
        tag = etree.QName(parent).localname
        name = c.get("name")
        if name in out and name != "title":
            raise ValueError(f"duplicate shape name {name!r}")
        out[name] = (int(c.get("id")), tag == "sp")
        ph = parent.find(".//p:nvPr/p:ph", NS)          # title placeholders: let the build script call them "title"
        if ph is not None and ph.get("type") == "title":
            out["title"] = (int(c.get("id")), True)
    return out


def main():
    anims = json.load(open(os.path.join(HERE, "anim.json")))
    zin = zipfile.ZipFile(SRC)
    zout = zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED)
    count = 0
    for item in zin.infolist():
        data = zin.read(item.filename)
        m = re.fullmatch(r"ppt/slides/slide(\d+)\.xml", item.filename)
        if m:
            n = m.group(1)
            xml = data.decode("utf8")
            if "</p:clrMapOvr>" not in xml:
                raise RuntimeError(f"slide {n}: no clrMapOvr to anchor on")
            shapes = shapes_of(data)
            trans = '<p:transition spd="med"><p:fade/></p:transition>'
            timing = build_timing(anims[n], shapes, n) if n in anims else ""
            xml = xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + trans + timing, 1)
            data = xml.encode("utf8")
            count += 1
        zout.writestr(item, data)
    zout.close()
    print(f"wrote {DST} ({count} slides animated)")


if __name__ == "__main__":
    main()
