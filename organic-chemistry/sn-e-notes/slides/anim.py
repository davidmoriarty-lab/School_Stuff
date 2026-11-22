"""Click-by-click PowerPoint animations, written as real <p:timing> XML (python-pptx has no animation API).

A slide gets a Timeline.  Each click() starts one mouse click; inside a click, effects in the same stage run together
and then() starts the next stage, which runs after the previous one finishes ("after previous").

    tl = Timeline(slide)
    tl.click("Step 1")
    tl.fade(shape_a, shape_b)            # both fade in together
    tl.then(); tl.move(ball, path, 2000) # then the ball rolls along the path
    tl.build()                           # writes <p:timing>

Effects used: fade in, wipe in, fade out (exit), motion path, pulse (grow/shrink emphasis).  Only effect types whose XML is
standard PowerPoint output are used.
"""
from lxml import etree

NS_P = "http://schemas.openxmlformats.org/presentationml/2006/main"
NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NSMAP = {"p": NS_P, "a": NS_A}

WIPE = {"left": (8, "wipe(left)"), "right": (2, "wipe(right)"), "top": (1, "wipe(up)"), "bottom": (4, "wipe(down)")}


class Effect:
    def __init__(self, kind, shape, dur=500, delay=0, **kw):
        self.kind, self.shape, self.dur, self.delay, self.kw = kind, shape, dur, delay, kw

    @property
    def end(self):
        return self.delay + (1 if self.kind == "jiggle" else self.dur)


class Timeline:
    def __init__(self, slide):
        self.slide = slide
        self.clicks = []          # {"label": str, "stages": [[Effect, ...], ...]}
        self._wrapped = {}

    def _wrap(self, shape):
        """Put an animated shape inside its own group (kept at the same place in the stacking order) and animate the group.
        Group targets are what PowerPoint itself writes for grouped objects; plain text boxes and autoshapes need extra
        'build' bookkeeping that was not behaving, so every animated object is grouped instead."""
        el = shape._element
        if el.tag.endswith("}grpSp"):
            return shape
        key = shape.shape_id
        if key in self._wrapped:
            return self._wrapped[key]
        parent = el.getparent()
        idx = list(parent).index(el)
        grp = self.slide.shapes.add_group_shape([shape])
        gel = grp._element
        parent.remove(gel)
        parent.insert(idx, gel)
        self._wrapped[key] = grp
        return grp

    # ----------------------------------------------------------------- structure
    def click(self, label=""):
        self.clicks.append({"label": label, "stages": [[]]})
        return self

    def then(self):
        self.clicks[-1]["stages"].append([])
        return self

    def _add(self, kind, shapes, dur, delay, **kw):
        if not self.clicks:
            self.click()
        for k, s in enumerate(shapes):
            self.clicks[-1]["stages"][-1].append(Effect(kind, self._wrap(s), dur, delay, **kw))
        return self

    # ----------------------------------------------------------------- effects
    def fade(self, *shapes, dur=500, delay=0):
        return self._add("fade_in", shapes, dur, delay)

    def appear(self, *shapes, delay=0):
        return self._add("appear", shapes, 1, delay)

    def wipe(self, *shapes, direction="left", dur=700, delay=0):
        return self._add("wipe", shapes, dur, delay, direction=direction)

    def out(self, *shapes, dur=400, delay=0):
        return self._add("fade_out", shapes, dur, delay)

    def vanish(self, *shapes, delay=0):
        return self._add("vanish", shapes, 1, delay)

    def move(self, shape, points, dur=2000, delay=0):
        """points: [(dx, dy), ...] in EMU relative to the shape's own position; the first should be (0, 0)."""
        return self._add("move", [shape], dur, delay, points=points)

    def pulse(self, *shapes, scale=1.12, dur=600, delay=0):
        return self._add("pulse", shapes, dur, delay, scale=scale)

    def jiggle(self, shape, points, dur=3000, delay=0):
        """Endless wandering: a closed loop path (starts and ends at (0, 0), EMU offsets) repeated until the end of the slide.
        Put these in the LAST stage of a click, never before another stage."""
        return self._add("jiggle", [shape], dur, delay, points=points)

    def swap(self, old, new, out_dur=300, in_dur=400):
        """Replace old shapes by new ones WITHOUT showing both at once: old fades out, then (after previous) new fades in.
        Leaves the timeline in the second stage so further effects of this click run with the new shapes."""
        if old:
            self.out(*old, dur=out_dur)
        self.then()
        if new:
            self.fade(*new, dur=in_dur)
        return self

    # ----------------------------------------------------------------- notes for the presenter
    def click_list(self):
        return [c["label"] for c in self.clicks]

    # ----------------------------------------------------------------- XML
    def build(self, transition=True):
        sld = self.slide._element
        for old in sld.findall("{%s}timing" % NS_P) + sld.findall("{%s}transition" % NS_P):
            sld.remove(old)
        anchor = sld.find("{%s}clrMapOvr" % NS_P)
        pos = list(sld).index(anchor) + 1 if anchor is not None else len(sld)
        if transition:
            tr = etree.fromstring('<p:transition xmlns:p="%s" spd="med"><p:fade/></p:transition>' % NS_P)
            sld.insert(pos, tr); pos += 1
        if not self.clicks:
            return
        self._n = 2
        sw, sh = self._slide_size()
        click_xml = "".join(self._click_xml(c, sw, sh) for c in self.clicks)
        bld = "".join('<p:bldP spid="%d" grpId="0" animBg="1"/>' % sid for sid in self._bld_ids())
        xml = (
            '<p:timing xmlns:p="%s" xmlns:a="%s"><p:tnLst><p:par>'
            '<p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>%s</p:childTnLst></p:cTn>'
            '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>'
            '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst>%s</p:timing>'
            % (NS_P, NS_A, click_xml, ("<p:bldLst>%s</p:bldLst>" % bld) if bld else "")
        )
        sld.insert(pos, etree.fromstring(xml))

    def _slide_size(self):
        prs_part = self.slide.part.package.presentation_part
        prs = prs_part.presentation
        return int(prs.slide_width), int(prs.slide_height)

    def _bld_ids(self):
        ids = []
        for c in self.clicks:
            for st in c["stages"]:
                for e in st:
                    el = e.shape._element
                    if el.tag.endswith("}sp") and e.shape.shape_id not in ids:
                        ids.append(e.shape.shape_id)
        return ids

    def _id(self):
        self._n += 1
        return self._n

    def _click_xml(self, click, sw, sh):
        stages = [s for s in click["stages"] if s]
        if not stages:
            return ""
        out, t = [], 0
        click_id = self._id()                      # ids are handed out in document order
        for k, stage in enumerate(stages):
            stage_id = self._id()
            effs = []
            for j, e in enumerate(stage):
                node = ("clickEffect" if k == 0 else "afterEffect") if j == 0 else "withEffect"
                effs.append(self._effect_xml(e, node, sw, sh))
            out.append('<p:par><p:cTn id="%d" fill="hold"><p:stCondLst><p:cond delay="%d"/></p:stCondLst><p:childTnLst>%s</p:childTnLst></p:cTn></p:par>'
                       % (stage_id, t, "".join(effs)))
            t += max(e.end for e in stage)
        return ('<p:par><p:cTn id="%d" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>%s</p:childTnLst></p:cTn></p:par>'
                % (click_id, "".join(out)))

    def _tgt(self, e):
        return '<p:tgtEl><p:spTgt spid="%d"/></p:tgtEl>' % e.shape.shape_id

    def _grp(self, e):
        return ' grpId="0"' if e.shape._element.tag.endswith("}sp") else ""

    def _set_visibility(self, e, value, delay):
        return ('<p:set><p:cBhvr><p:cTn id="%d" dur="1" fill="hold"><p:stCondLst><p:cond delay="%d"/></p:stCondLst></p:cTn>%s'
                '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="%s"/></p:to></p:set>'
                % (self._id(), delay, self._tgt(e), value))

    def _effect_xml(self, e, node, sw, sh):
        k = e.kind
        head = ('<p:par><p:cTn id="%d" presetID="%%s" presetClass="%%s" presetSubtype="%%s"%%s fill="hold"%s nodeType="%s">'
                '<p:stCondLst><p:cond delay="%d"/></p:stCondLst><p:childTnLst>' % (self._id(), self._grp(e), node, e.delay))
        tail = "</p:childTnLst></p:cTn></p:par>"
        if k == "appear":
            return (head % (1, "entr", 0, "")) + self._set_visibility(e, "visible", 0) + tail
        if k == "vanish":
            return (head % (1, "exit", 0, "")) + self._set_visibility(e, "hidden", 0) + tail
        if k == "fade_in":
            body = self._set_visibility(e, "visible", 0) + (
                '<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="%d" dur="%d"/>%s</p:cBhvr></p:animEffect>' % (self._id(), e.dur, self._tgt(e)))
            return (head % (10, "entr", 0, "")) + body + tail
        if k == "wipe":
            sub, filt = WIPE[e.kw["direction"]]
            body = self._set_visibility(e, "visible", 0) + (
                '<p:animEffect transition="in" filter="%s"><p:cBhvr><p:cTn id="%d" dur="%d"/>%s</p:cBhvr></p:animEffect>' % (filt, self._id(), e.dur, self._tgt(e)))
            return (head % (22, "entr", sub, "")) + body + tail
        if k == "fade_out":
            body = ('<p:animEffect transition="out" filter="fade"><p:cBhvr><p:cTn id="%d" dur="%d"/>%s</p:cBhvr></p:animEffect>' % (self._id(), e.dur, self._tgt(e))
                    + self._set_visibility(e, "hidden", max(e.dur - 1, 0)))
            return (head % (10, "exit", 0, "")) + body + tail
        if k == "move":
            pts = e.kw["points"]
            path = "M " + " L ".join("%.5f %.5f" % (dx / sw, dy / sh) for dx, dy in pts) + " E"
            body = ('<p:animMotion origin="layout" path="%s" pathEditMode="relative" rAng="0" ptsTypes="%s"><p:cBhvr><p:cTn id="%d" dur="%d" fill="hold"/>%s'
                    '<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>'
                    % (path, "A" * len(pts), self._id(), e.dur, self._tgt(e)))
            return (head % (0, "path", 0, ' accel="30000" decel="30000"')) + body + tail
        if k == "jiggle":
            pts = e.kw["points"]
            path = "M " + " L ".join("%.5f %.5f" % (dx / sw, dy / sh) for dx, dy in pts) + " E"
            body = ('<p:animMotion origin="layout" path="%s" pathEditMode="relative" rAng="0" ptsTypes="%s"><p:cBhvr><p:cTn id="%d" dur="%d" fill="hold"/>%s'
                    '<p:attrNameLst><p:attrName>ppt_x</p:attrName><p:attrName>ppt_y</p:attrName></p:attrNameLst></p:cBhvr></p:animMotion>'
                    % (path, "A" * len(pts), self._id(), e.dur, self._tgt(e)))
            return (head % (0, "path", 0, ' repeatCount="indefinite"')) + body + tail
        if k == "pulse":
            pct = int(round(e.kw["scale"] * 100000))
            body = ('<p:animScale><p:cBhvr><p:cTn id="%d" dur="%d" autoRev="1" fill="hold"/>%s</p:cBhvr><p:by x="%d" y="%d"/></p:animScale>'
                    % (self._id(), e.dur, self._tgt(e), pct, pct))
            return (head % (6, "emph", 0, "")) + body + tail
        raise ValueError(k)

    # ----------------------------------------------------------------- QA: what the audience sees after k clicks
    def _initially_hidden(self):
        first = {}
        for c in self.clicks:
            for st in c["stages"]:
                for e in st:
                    first.setdefault(e.shape.shape_id, e.kind)
        return {sid for sid, kind in first.items() if kind in ("fade_in", "wipe", "appear")}

    def state(self, k):
        """(hidden element ids, {element id: (dx, dy) EMU}) after k clicks."""
        hidden = self._initially_hidden()
        offs = {}
        for c in self.clicks[:k]:
            for st in c["stages"]:
                for e in st:
                    sid = e.shape.shape_id
                    if e.kind in ("fade_in", "wipe", "appear"):
                        hidden.discard(sid)
                    elif e.kind in ("fade_out", "vanish"):
                        hidden.add(sid)
                    elif e.kind == "move":
                        offs[sid] = e.kw["points"][-1]
        return hidden, offs

    def apply_state(self, k):
        hidden, offs = self.state(k)
        seen = set()
        for c in self.clicks:
            for st in c["stages"]:
                for e in st:
                    el = e.shape._element
                    sid = e.shape.shape_id
                    if sid in seen:
                        continue
                    seen.add(sid)
                    if sid in hidden and el.getparent() is not None:
                        el.getparent().remove(el)
                    elif sid in offs and el.getparent() is not None:
                        dx, dy = offs[sid]
                        e.shape.left = int(e.shape.left + dx)
                        e.shape.top = int(e.shape.top + dy)

    def apply_final_state(self):
        self.apply_state(len(self.clicks))
