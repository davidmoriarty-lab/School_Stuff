#!/usr/bin/env python3
"""Build the Honors Chemistry resource hub (honors-chemistry/index.html).

What it does
  1. Scans honors-chemistry/Units/ (one folder per unit, optional type folders inside).
  2. Converts Word / PowerPoint / Excel files to PDF (needs LibreOffice) so they can be previewed
     and printed. The PDFs are kept in honors-chemistry/_pdf/.
  3. Pulls the text out of every file so the search box can find words inside documents.
  4. Reads virtual-labs.csv for links to virtual labs and simulations.
  5. Writes everything into one self-contained index.html (from _build/template.html).

Run:  python3 honors-chemistry/_build/build_hub.py
It uses only the Python standard library. LibreOffice (soffice) and pdftotext are optional: without
them the hub still builds, but Word files cannot be printed from the page and PDFs are not text-searchable.
"""
import csv, datetime, hashlib, json, os, re, shutil, subprocess, sys, tempfile, zipfile
from xml.etree import ElementTree

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # honors-chemistry/
UNITS_DIR = os.path.join(ROOT, "Units")
PDF_DIR = os.path.join(ROOT, "_pdf")
LINKS_CSV = os.path.join(ROOT, "virtual-labs.csv")
TEMPLATE = os.path.join(HERE, "template.html")
OUTPUT = os.path.join(ROOT, "index.html")

COURSE_TITLE = "Honors Chemistry Resource Hub"
CONVERT_EXTS = {".doc", ".docx", ".odt", ".rtf", ".ppt", ".pptx", ".odp", ".xls", ".xlsx", ".ods"}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif"}
SKIP_NAMES = {".gitkeep", ".ds_store", "thumbs.db", "desktop.ini"}
MAX_TEXT = 20000            # characters of each file kept for searching

TYPE_ORDER = ["Notes", "Worksheets", "Homework", "Tests and Quizzes", "Labs", "Virtual Labs",
              "Review", "Slides", "Reference", "Other"]
FOLDER_TYPES = [            # (regex on folder name, type)
    (r"virtual", "Virtual Labs"), (r"note", "Notes"), (r"work\s*sheet|practice", "Worksheets"),
    (r"home\s*work|\bhw\b", "Homework"), (r"test|quiz|exam|assess", "Tests and Quizzes"),
    (r"\blabs?\b|laboratory", "Labs"), (r"review|study", "Review"),
    (r"slide|presentation|powerpoint", "Slides"), (r"reference|resource", "Reference"),
]
NAME_TYPES = [              # (regex on file name, type) used when there is no type folder
    (r"home\s*work|\bhw\b", "Homework"), (r"test|quiz|exam|assessment", "Tests and Quizzes"),
    (r"\blab\b|laboratory", "Labs"), (r"work\s*sheet|practice|problem", "Worksheets"),
    (r"note|packet|guided", "Notes"), (r"review|study guide", "Review"),
    (r"slides|presentation|powerpoint|\.pptx?$", "Slides"),
]
TEACHER_RE = re.compile(r"\b(key|keys|teacher|teachers|answer|answers|instructor)\b", re.I)


def sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def clean_text(s):
    return re.sub(r"\s+", " ", s or "").strip()


def parse_unit(folder):
    """'Unit 4 - Chemical Reactions' -> (4, 'Chemical Reactions'); other folders -> (None, folder)."""
    m = re.match(r"^(?:unit\s*)?(\d+)\s*[-:.\u2013]?\s*(.*)$", folder, re.I)
    if m:
        return int(m.group(1)), (m.group(2).strip() or "Unit %s" % m.group(1))
    return None, folder


def unit_sort_key(u):
    if u["num"] is not None:
        return (0, u["num"], u["name"].lower())
    low = u["name"].lower()
    if low.startswith("course"):
        return (1, 0, low)
    if low.startswith("unsorted"):
        return (3, 0, low)
    return (2, 0, low)


def guess_type(rel_inside_unit, filename):
    parts = rel_inside_unit.split("/")[:-1]
    for folder in parts:
        for rx, t in FOLDER_TYPES:
            if re.search(rx, folder, re.I):
                return t
    for rx, t in NAME_TYPES:
        if re.search(rx, filename, re.I):
            return t
    return "Other"


def pretty_title(filename):
    stem = os.path.splitext(filename)[0]
    stem = re.sub(r"\.(docx?|pptx?|xlsx?|pdf)$", "", stem, flags=re.I)   # "x.docx.pdf" style names
    return clean_text(stem.replace("_", " "))


# ---------- text extraction ----------
def text_from_pdf(path):
    if not shutil.which("pdftotext"):
        return ""
    try:
        out = subprocess.run(["pdftotext", "-q", "-enc", "UTF-8", path, "-"], capture_output=True, timeout=120)
        return clean_text(out.stdout.decode("utf-8", "ignore"))
    except Exception:
        return ""


def text_from_ooxml(path):
    """Fallback for docx / pptx when no PDF is available."""
    try:
        with zipfile.ZipFile(path) as z:
            names = [n for n in z.namelist() if re.match(r"(word/document|ppt/slides/slide\d+)\.xml$", n)]
            bits = []
            for n in names:
                root = ElementTree.fromstring(z.read(n))
                bits.extend(t.text or "" for t in root.iter() if t.tag.endswith("}t"))
            return clean_text(" ".join(bits))
    except Exception:
        return ""


# ---------- Word / PowerPoint -> PDF ----------
def convert_to_pdf(jobs):
    """jobs: {sha_prefix: source_path}. Writes _pdf/<sha_prefix>.pdf. Returns the set that succeeded."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    done = set()
    todo = {k: v for k, v in jobs.items() if not os.path.exists(os.path.join(PDF_DIR, k + ".pdf"))}
    done.update(k for k in jobs if k not in todo)
    if not todo:
        return done
    if not soffice:
        print("WARNING: LibreOffice not found; %d file(s) will not have a printable PDF." % len(todo))
        return done
    os.makedirs(PDF_DIR, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        src_dir, out_dir, profile = (os.path.join(tmp, d) for d in ("in", "out", "profile"))
        os.makedirs(src_dir); os.makedirs(out_dir)
        staged = []
        for key, path in todo.items():
            dest = os.path.join(src_dir, key + os.path.splitext(path)[1].lower())
            shutil.copy2(path, dest)
            staged.append(dest)
        # one LibreOffice start for everything, in chunks so one bad file cannot sink the rest
        for i in range(0, len(staged), 15):
            chunk = staged[i:i + 15]
            cmd = [soffice, "--headless", "-env:UserInstallation=file://" + profile,
                   "--convert-to", "pdf", "--outdir", out_dir] + chunk
            try:
                subprocess.run(cmd, capture_output=True, timeout=900)
            except Exception as e:
                print("WARNING: conversion chunk failed:", e)
        for key in todo:
            produced = os.path.join(out_dir, key + ".pdf")
            if os.path.exists(produced):
                shutil.move(produced, os.path.join(PDF_DIR, key + ".pdf"))
                done.add(key)
            else:
                print("WARNING: could not convert", todo[key])
    return done


def web_path(*parts):
    return "/".join(parts)


def main():
    if not os.path.isdir(UNITS_DIR):
        sys.exit("Units folder not found: " + UNITS_DIR)

    units, files, jobs = [], [], {}
    for folder in sorted(os.listdir(UNITS_DIR)):
        full = os.path.join(UNITS_DIR, folder)
        if not os.path.isdir(full) or folder.startswith((".", "_")):
            continue
        num, name = parse_unit(folder)
        unit = {"id": folder, "num": num, "name": name,
                "label": ("Unit %d" % num) if num is not None else name,
                "sub": name if num is not None else ""}
        units.append(unit)
        for dirpath, dirnames, filenames in os.walk(full):
            dirnames[:] = sorted(d for d in dirnames if not d.startswith((".", "_")))
            for fn in sorted(filenames):
                if fn.lower() in SKIP_NAMES or fn.startswith(("~$", ".")) or fn.lower().startswith("readme"):
                    continue
                path = os.path.join(dirpath, fn)
                rel_unit = os.path.relpath(path, full).replace(os.sep, "/")
                ext = os.path.splitext(fn)[1].lower()
                digest = sha1(path)
                key = digest[:12]
                rec = {"kind": "file", "unit": folder, "type": guess_type(rel_unit, fn),
                       "title": pretty_title(fn), "file": fn,
                       "path": web_path("Units", folder, *rel_unit.split("/")),
                       "ext": ext.lstrip(".") or "file", "size": os.path.getsize(path),
                       "teacher": bool(TEACHER_RE.search(fn) or TEACHER_RE.search(os.path.dirname(rel_unit))),
                       "pdf": None, "_src": path, "_key": key}
                if ext == ".pdf" or ext in IMAGE_EXTS:
                    rec["pdf"] = rec["path"]                # the file itself prints
                elif ext in CONVERT_EXTS:
                    jobs[key] = path
                files.append(rec)

    converted = convert_to_pdf(jobs)
    for rec in files:
        ext = "." + rec["ext"]
        if ext in CONVERT_EXTS and rec["_key"] in converted:
            rec["pdf"] = web_path("_pdf", rec["_key"] + ".pdf")
        # text for searching
        text = ""
        if ext == ".pdf":
            text = text_from_pdf(rec["_src"])
        elif rec["pdf"] and ext in CONVERT_EXTS:
            text = text_from_pdf(os.path.join(PDF_DIR, rec["_key"] + ".pdf"))
        if not text and ext in (".docx", ".pptx"):
            text = text_from_ooxml(rec["_src"])
        rec["text"] = text[:MAX_TEXT]
        rec["pages"] = None

    # drop cached PDFs nobody uses any more
    used = {r["_key"] for r in files if r["pdf"] and r["pdf"].startswith("_pdf/")}
    if os.path.isdir(PDF_DIR):
        for fn in os.listdir(PDF_DIR):
            if fn.endswith(".pdf") and fn[:-4] not in used:
                os.remove(os.path.join(PDF_DIR, fn))

    # virtual labs and other links
    by_num = {u["num"]: u["id"] for u in units if u["num"] is not None}
    by_name = {u["id"].lower(): u["id"] for u in units}
    fallback = next((u["id"] for u in units if u["name"].lower().startswith("course")), None)
    links = []
    if os.path.exists(LINKS_CSV):
        with open(LINKS_CSV, newline="", encoding="utf-8-sig") as f:
            for row in csv.DictReader(f):
                row = {(k or "").strip().lower(): (v or "").strip() for k, v in row.items()}
                url = row.get("url", "")
                if not url or not row.get("title"):
                    continue
                if not re.match(r"^https?://", url, re.I):
                    print("WARNING: skipping link without http(s) address:", url)
                    continue
                cell = row.get("unit", "")
                m = re.match(r"^(?:unit\s*)?(\d+)\b", cell, re.I)
                unit_id = by_num.get(int(m.group(1))) if m else by_name.get(cell.lower())
                unit_id = unit_id or fallback or (units[0]["id"] if units else "")
                if cell and unit_id == fallback and not (m or cell.lower() in by_name):
                    print("NOTE: unit '%s' not found for link '%s'; filed under %s" % (cell, row["title"], fallback))
                links.append({"kind": "link", "unit": unit_id, "type": "Virtual Labs", "title": row["title"],
                              "url": url, "text": row.get("description", ""), "teacher": False})

    units.sort(key=unit_sort_key)
    unit_ids = [u["id"] for u in units]
    items = files + links
    items.sort(key=lambda r: (unit_ids.index(r["unit"]) if r["unit"] in unit_ids else 99,
                              TYPE_ORDER.index(r["type"]) if r["type"] in TYPE_ORDER else 99,
                              r["title"].lower()))
    for i, r in enumerate(items):
        r["id"] = i
        r.pop("_src", None); r.pop("_key", None); r.pop("pages", None)

    data = {"title": COURSE_TITLE, "updated": datetime.date.today().isoformat(),
            "units": units, "typeOrder": TYPE_ORDER, "items": items}
    blob = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    blob = blob.replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    with open(TEMPLATE, encoding="utf-8") as f:
        html = f.read()
    marker = "/*__HUB_DATA__*/null"
    if marker not in html:
        sys.exit("template.html is missing the data marker")
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(html.replace(marker, blob))
    print("Built %s: %d files, %d links, %d units (%d printable PDFs)" %
          (os.path.relpath(OUTPUT), len(files), len(links), len(units), sum(1 for r in files if r["pdf"])))


if __name__ == "__main__":
    main()
