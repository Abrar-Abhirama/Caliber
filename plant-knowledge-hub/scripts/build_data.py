"""Rebuild the demo's data files from the Case 1 dataset.

Usage:
    pip install pypdf openpyxl pillow cffi
    python scripts/build_data.py "path/to/Case 1_ Manufacturing Knowledge Hub"

Writes data/docs.js, data/workorders.js, data/pids.js and data/pids/*.png.
"""
import glob, json, os, re, sys, datetime
from pypdf import PdfReader
import openpyxl
from PIL import Image

ROOT = sys.argv[1] if len(sys.argv) > 1 else "Case 1_ Manufacturing Knowledge Hub"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
os.makedirs(os.path.join(OUT, "pids"), exist_ok=True)

def doc_type(fn):
    f = fn.lower()
    if "datasheet" in f: return "Datasheet"
    if "interlock" in f: return "Interlock C&E"
    if "plot plan" in f: return "Plot Plan"
    if "drawing" in f: return "GA Drawing"
    if "opl" in f: return "OPL"
    return "Other"

def set_tag(rel):
    return rel.split(os.sep)[0].split("_")[2]

docs = []
for f in sorted(glob.glob(os.path.join(ROOT, "Set_*", "**", "*.pdf"), recursive=True)):
    rel = os.path.relpath(f, ROOT)
    tag = set_tag(rel)
    raw = "\n".join((p.extract_text() or "") for p in PdfReader(f).pages)
    raw = raw.replace("P&ID;", "P&ID").replace("■", "").replace("●", "")
    raw = re.sub(r"[\x00-\x08�]+", "", raw)
    t = doc_type(os.path.basename(rel))
    m = re.search(r"(?:DOC NO:|DWG No\.|OPL No:)\s*\n?\s*(TJC-[\w-]+|OPL-[\w-]+)", raw)
    doc_no = m.group(1) if m else None
    m = re.search(r"REV:\s*(\w+)", raw)
    rev = m.group(1) if m else None
    title = status = approver = reviewer = date = opl_class = None
    if t == "OPL":
        m = re.search(r"OPL Title\s*\n(.+?)\nDiscipline", raw, re.S)
        title = m.group(1).replace("\n", " ").strip() if m else os.path.basename(rel)
        tail = raw.split("Panel Operator / Technician")[-1]
        names = re.findall(r"([A-Z][a-z]+ [A-Z][a-z]+ \(EMP-\d+\))", tail)
        m = re.search(r"(\w+day, \d\d \w+\s*\n?\s*\d{4})", tail)
        date = re.sub(r"\s+", " ", m.group(1)) if m else None
        reviewer = names[0] if names else None
        approver = names[1] if len(names) > 1 else None
        status = "Approved" if approver else "Pending approval"
        c = re.search(r"\[X\]\s*([A-Za-z ]+)", raw)
        opl_class = c.group(1).strip() if c else None
    else:
        title = os.path.basename(rel)[:-4]
        m = re.search(r"Rev \d+ - ([A-Z ]+)", raw)
        status = m.group(1).title().strip() if m else None
        if not status:
            m = re.search(r"\n0 (ISSUED FOR [A-Z]+)", raw)
            status = ("Rev 0 " + m.group(1).title()) if m else "Issued"
    lines = [l.strip() for l in raw.split("\n") if l.strip() and not l.strip().startswith("This is sample")
             and l.strip() not in ("CALIBER purposes only", "only", "Vendor ABC Supplier XYZ")]
    text = re.sub(r"\s+", " ", " \n".join(lines))
    text = re.sub(r"2\. SAFETY PRECAUTIONS.*?4\. DETAILED PROCEDURE / STEPS", "4. PROCEDURE:", text)
    text = text.replace("Step Action Check / Acceptance", "")
    docs.append(dict(id=doc_no or title, docNo=doc_no, tag=tag, type=t, title=title, rev=rev, status=status,
                     reviewer=reviewer, approver=approver, date=date, oplClass=opl_class, path=rel, pages=1, text=text[:2600]))

pids = {}
for p in sorted(glob.glob(os.path.join(ROOT, "Set_*", "*.png"))):
    rel = os.path.relpath(p, ROOT)
    tag = set_tag(rel)
    num = re.search(r"\d{4}", tag).group(0)
    docs.append(dict(id="TJC-LLD-PID-" + num, docNo="TJC-LLD-PID-" + num, tag=tag, type="P&ID", title="P&ID - " + tag,
                     rev=None, status="Referenced (drawing ref. shows TJC-LLD-PID-XXXX)", path=rel, pages=1, text=""))
    im = Image.open(p).convert("RGB"); im.thumbnail((1400, 1400))
    im = im.quantize(256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(os.path.join(OUT, "pids", tag + ".png"), "PNG", optimize=True)
    pids[tag] = "data/pids/" + tag + ".png"

wb = openpyxl.load_workbook(os.path.join(ROOT, "Maintenance History (All Equipment).xlsx"), data_only=True)
rows = list(wb.worksheets[0].iter_rows(values_only=True))
head = rows[0]
cols = [("WO_Number","wo"),("Report_Date","date"),("Completion_Date","done"),("Equipment_Tag","tag"),("Equipment_Name","name"),
        ("Area_Name","area"),("Work_Type","type"),("Discipline","disc"),("Priority","prio"),("Criticality","crit"),
        ("Problem_Description","problem"),("Root_Cause","cause"),("Corrective_Action","action"),("Spare_Parts_Used","parts"),
        ("Breakdown","bd"),("Downtime_Hours","dt"),("Labor_Hours","lh"),("Total_Cost_IDR","cost"),("Reported_By","rep"),
        ("Executed_By","exe"),("Approved_By","appr"),("Related_Interlock","il")]
wos = []
for r in rows[1:]:
    if not r[0]: continue
    d = dict(zip(head, r))
    w = {}
    for src, key in cols:
        v = d.get(src)
        if isinstance(v, datetime.datetime): v = v.strftime("%Y-%m-%d")
        if key in ("dt", "lh") and v is not None: v = float(v)
        w[key] = v
    wos.append(w)

def write_js(name, var, obj):
    s = json.dumps(obj, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as fh:
        fh.write(f"// Generated by scripts/build_data.py - do not edit by hand\nwindow.{var} = {s};\n")

write_js("docs.js", "KH_DOCS", docs)
write_js("workorders.js", "KH_WOS", wos)
write_js("pids.js", "KH_PIDS", pids)
print(f"{len(docs)} documents, {len(wos)} work orders, {len(pids)} P&IDs")
