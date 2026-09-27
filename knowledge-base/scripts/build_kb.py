"""Build a Markdown knowledge base from the Case 1 dataset.

Usage:
    pip install pdfplumber pypdf openpyxl cffi
    python build_kb.py "path/to/Case 1_ Manufacturing Knowledge Hub" out_dir

Every record is one Markdown file with YAML front matter, so it converts
cleanly to JSON, SQL rows or vector-store chunks later (see scripts/md_to_json.py).
"""
import datetime, glob, logging, os, re, sys
from collections import defaultdict
import openpyxl, pdfplumber
from pypdf import PdfReader

logging.getLogger("pdfminer").setLevel(logging.ERROR)
ROOT = sys.argv[1]
OUT = sys.argv[2]
TODAY = datetime.date.today().isoformat()

# ---------------------------------------------------------------- helpers
def yml(v):
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(yml(x) for x in v) + "]"
    s = str(v).replace('"', '\\"')
    return f'"{s}"'

def front(d):
    return "---\n" + "\n".join(f"{k}: {yml(v)}" for k, v in d.items()) + "\n---\n\n"

def cell(x):
    return re.sub(r"\s+", " ", ("" if x is None else str(x)).replace("P&ID;", "P&ID")).strip().replace("|", "\\|")

def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    out += ["| " + " | ".join(cell(c) for c in r) + " |" for r in rows]
    return "\n".join(out) + "\n"

def write(path, text):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(text)

def pdf_text(path):
    t = "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)
    return re.sub(r"[\x00-\x08�]+", "", t.replace("P&ID;", "P&ID"))

def pdf_tables(path):
    with pdfplumber.open(path) as p:
        return [t for pg in p.pages for t in pg.extract_tables()]

def not_boiler(t):
    flat = " ".join(cell(c) for r in t for c in r if c)
    return flat and "sample data" not in flat and "CALIBER purpose" not in flat

INSTR = re.compile(r"\b([A-Z]{1,5})-(\d{4,5})([A-Z]?)\b")
SKIP_PREFIX = {"TJC", "LLD", "SEQ", "EQ", "EMP", "WO", "NT", "OPL", "BA", "WPN", "PID", "IL", "DS", "PP"}
def instr_tags(text, tag):
    pre = re.search(r"\d{2}", tag).group(0)
    out = set()
    for m in INSTR.finditer(text):
        if m.group(1) in SKIP_PREFIX or m.group(0) == tag or not m.group(2).startswith(pre):
            continue
        out.add(m.group(0))
    return sorted(out)

def slug(tag, title):
    return re.sub(r"[^A-Za-z0-9]+", "-", title).strip("-")

# ---------------------------------------------------------------- parse documents
assets = {}          # tag -> dict
docs = defaultdict(list)  # tag -> [doc meta]

def parse_datasheet(path, tag, rel):
    text = pdf_text(path)
    tabs = [t for t in pdf_tables(path) if not_boiler(t)]
    pair_tabs = [t for t in tabs if t and len(t[0]) == 4]
    ident, sections = {}, []
    titles = re.findall(r"(DESIGN & MECHANICAL DATA|DRIVER / MOTOR / HEATER DATA|PERFORMANCE / NOZZLE DATA)", text)
    for i, t in enumerate(pair_tabs):
        pairs = []
        for r in t:
            r = [cell(c) for c in r]
            if r[0] == "SERVICE":
                pairs.append(("SERVICE", " ".join(x for x in r[1:] if x).replace("st eam", "steam")))
                continue
            if r[0]: pairs.append((r[0], r[1]))
            if r[2]: pairs.append((r[2], r[3]))
        if i == 0:
            ident = dict(pairs)
            sections.append(("Identification", pairs))
        else:
            name = titles[i - 1].title() if i - 1 < len(titles) else "Vendor & revision"
            sections.append((name, pairs))
    kind = re.search(r"\n?([A-Z &]+DATA SHEET)", text)
    rev = re.search(r"REV:\s*(\w+)", text)
    notes = re.findall(r"^\d\. .+$", text.split("NOTES:")[-1], re.M)
    meta = dict(doc_id=f"TJC-LLD-DS-{tag}", doc_no=f"TJC-LLD-DS-{tag}", title=f"Equipment Datasheet - {tag}",
                doc_type="Datasheet", equipment_tag=tag, revision=rev.group(1) if rev else None,
                status="Issued for Operation", approved_by=None, date=None, source_file=rel)
    assets[tag].update(dict(
        name=ident.get("EQUIPMENT NAME"), type=ident.get("TYPE"), equipment_id=ident.get("EQUIPMENT ID"),
        plant=ident.get("PLANT / UNIT"), area=ident.get("AREA"), functional_location=ident.get("FUNCTIONAL LOC."),
        criticality=ident.get("CRITICALITY"), service=ident.get("SERVICE"), datasheet_sections=sections))
    xref = re.search(r"P&ID\s*(TJC-LLD-PID-\d+)", text)
    seq = re.search(r"Interlock (SEQ-\d+|N/A[^,]*)", text)
    assets[tag]["pid_ref"] = xref.group(1) if xref else None
    assets[tag]["interlock_ref"] = seq.group(1).strip() if seq else None
    body = f"# {meta['title']}\n\n{(kind.group(1).title() if kind else 'Data sheet')} for **{tag} {ident.get('EQUIPMENT NAME','')}**.\n\n"
    for name, pairs in sections:
        body += f"## {name}\n\n" + table(["Field", "Value"], pairs) + "\n"
    if notes:
        body += "## Notes\n\n" + "\n".join(f"- {n[3:].strip()}" for n in notes) + "\n"
    meta["instrument_tags"] = instr_tags(text, tag)
    return meta, body

def parse_interlock(path, tag, rel):
    text = pdf_text(path)
    tabs = [t for t in pdf_tables(path) if not_boiler(t)]
    head = next((t for t in tabs if any("LOGIC No" in (c or "") for c in t[0])), None)
    hinfo = {}
    if head:
        for c in head[0]:
            c = cell(c)
            for k, v in re.findall(r"(LOGIC No|DESCRIPTION|SIL|TAG|FLOC): ?([^:]+?)(?= FLOC:|$)", c):
                hinfo[k] = v.strip()
    cne = next((t for t in tabs if cell(t[0][0]) == "ID"), None)
    eff = next((t for t in tabs if cell(t[0][0]) == "EFFECT ID"), None)
    perm = next((t for t in tabs if cell(t[0][0]) == "#"), None)
    rev = re.search(r"REV:\s*(\w+)", text)
    notes = [n for n in re.split(r"(?:^|\s)(?=\d\. )", re.sub(r"\s+", " ", text.split("NOTES:")[-1].split("This is sample")[0])) if re.match(r"\d\. ", n)]
    trips = []
    body = f"# Interlock Logic & Cause/Effect - {tag}\n\n"
    body += table(["Field", "Value"], [("Logic no.", hinfo.get("LOGIC No")), ("Description", hinfo.get("DESCRIPTION")),
                                        ("SIL", hinfo.get("SIL")), ("Functional location", hinfo.get("FLOC"))]) + "\n"
    if cne:
        hdr = [cell(c) for c in cne[0]]
        body += "## Cause & effect matrix\n\n" + table(hdr, cne[1:]) + "\n"
        for r in cne[1:]:
            r = [cell(c) for c in r]
            effects = [hdr[i].split(" ", 1)[1] if " " in hdr[i] else hdr[i] for i in range(5, len(r)) if r[i] == "X"]
            trips.append(dict(id=r[0], cause=r[1], tag=r[2], setpoint=r[3], vote=r[4], effects=effects))
        body += "### Trips in plain language\n\n" + "\n".join(
            f"- **{t['tag']}** ({t['cause']}) trips at **{t['setpoint']}**, voting {t['vote']}. Effects: {'; '.join(t['effects'])}."
            for t in trips) + "\n\n"
    if eff:
        body += "## Effects (final elements)\n\n" + table([cell(c) for c in eff[0]], eff[1:]) + "\n"
    if perm:
        body += "## Start permissives (all must be true)\n\n" + table([cell(c) for c in perm[0]], perm[1:]) + "\n"
    if notes:
        body += "## Notes\n\n" + "\n".join("- " + re.sub(r"\s+", " ", n[3:]) for n in notes) + "\n"
    assets[tag]["trips"] = trips
    assets[tag]["permissives"] = [[cell(c) for c in r] for r in (perm[1:] if perm else [])]
    assets[tag]["sil"] = hinfo.get("SIL")
    assets[tag]["logic_no"] = hinfo.get("LOGIC No")
    meta = dict(doc_id=f"TJC-LLD-IL-{tag}", doc_no=f"TJC-LLD-IL-{tag}", title=f"Interlock Logic Diagram - {tag}",
                doc_type="Interlock C&E", equipment_tag=tag, revision=rev.group(1) if rev else None, status="Issued",
                approved_by=None, date=None, source_file=rel, logic_no=hinfo.get("LOGIC No"), sil=hinfo.get("SIL"),
                instrument_tags=instr_tags(text, tag))
    return meta, body

def rev_history(text):
    return re.findall(r"^([AB0-9]) (ISSUED FOR [A-Z ]+?) (\w+) (\d\d-\d\d-\d{4})$", text, re.M)

def parse_ga(path, tag, rel):
    text = pdf_text(path)
    lines = [l.strip() for l in text.split("\n")]
    noz = [l for l in lines if re.match(r"^N\d+ ", l)]
    bom = [l for l in lines if re.match(r"^\d{1,2} [A-Z]", l) and re.search(r" \d+$", l) and not re.match(r"^\d \d", l)]
    dno = re.search(r"DWG No\.\s*\n?(TJC-[\w-]+)", text)
    rev = re.search(r"REV:\s*(\w+)", text)
    dims = [l for l in lines if re.search(r"(OVERALL|HEIGHT|LENGTH|DIAMETER|WEIGHT|ELEVATION|C/L)", l) and len(l) < 90 and "NOTES" not in l and not re.match(r"^\d\.", l)]
    notes = re.findall(r"^\d\. .+$", text, re.M)
    rh = rev_history(text)
    body = f"# General Arrangement Drawing - {tag}\n\n"
    if dims:
        body += "## Key dimensions\n\n" + "\n".join(f"- {d}" for d in dims) + "\n\n"
    if noz:
        body += "## Nozzle / connection schedule\n\nMark, service, size-rating, face, remarks as printed on the drawing.\n\n" + "\n".join(f"- {n}" for n in noz) + "\n\n"
    if bom:
        body += "## Bill of material\n\nNo., part name, material, quantity as printed on the drawing.\n\n" + "\n".join(f"- {b}" for b in bom) + "\n\n"
    if notes:
        body += "## Notes\n\n" + "\n".join(f"- {n[3:].strip()}" for n in notes) + "\n\n"
    if rh:
        body += "## Revision history\n\n" + table(["Rev", "Description", "By", "Date"], rh)
    meta = dict(doc_id=dno.group(1) if dno else f"GA-{tag}", doc_no=dno.group(1) if dno else None,
                title=f"Equipment GA Drawing - {tag}", doc_type="GA Drawing", equipment_tag=tag,
                revision=rev.group(1) if rev else None, status="Issued for Construction",
                approved_by=None, date=rh[-1][3] if rh else None, source_file=rel, instrument_tags=instr_tags(text, tag))
    assets[tag]["bom"] = bom
    return meta, body

def parse_plot(path, tag, rel):
    text = pdf_text(path)
    d = {}
    for k in ["TAG", "EQUIPMENT", "AREA", "GRID REF", "ELEVATION", "FUNCTIONAL LOC.", "FOOTPRINT"]:
        m = re.search(rf"^{re.escape(k)} (.+)$", text, re.M)
        if m: d[k] = m.group(1).strip()
    legend = re.findall(r"^(\d{4} - [A-Z &]+)$", text, re.M)
    dno = re.search(r"DWG No\.\s*\n?(TJC-[\w-]+)", text)
    rev = re.search(r"REV:\s*(\w+)", text)
    rh = rev_history(text)
    body = f"# Plot Plan - {tag}\n\n## Equipment location\n\n" + table(["Field", "Value"], list(d.items())) + "\n"
    if legend:
        body += "## Area legend (LLDPE unit)\n\n" + "\n".join(f"- {l.title()}" for l in dict.fromkeys(legend)) + "\n\n"
    if rh:
        body += "## Revision history\n\n" + table(["Rev", "Description", "By", "Date"], rh)
    assets[tag]["grid_ref"] = d.get("GRID REF")
    assets[tag]["elevation"] = d.get("ELEVATION")
    assets[tag]["footprint"] = d.get("FOOTPRINT")
    meta = dict(doc_id=dno.group(1) if dno else f"PP-{tag}", doc_no=dno.group(1) if dno else None,
                title=f"Plot Plan - {tag}", doc_type="Plot Plan", equipment_tag=tag, revision=rev.group(1) if rev else None,
                status="Issued for Construction", approved_by=None, date=rh[-1][3] if rh else None, source_file=rel,
                grid_ref=d.get("GRID REF"), elevation=d.get("ELEVATION"))
    return meta, body

def section(text, start, end):
    m = re.search(re.escape(start) + r"(.*?)" + (re.escape(end) if end else r"$"), text, re.S)
    return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

def parse_opl(path, tag, rel, wos_by_tag):
    text = pdf_text(path)
    tabs = pdf_tables(path)
    info = {}
    for t in tabs:
        for r in t:
            r = [cell(c) for c in r if c is not None]
            for i in range(0, len(r) - 1):
                if r[i] in ("OPL Title", "Discipline", "Equipment", "Area / Unit", "Related Interlock", "P&ID Ref"):
                    info[r[i]] = r[i + 1]
            if r and r[0].startswith("Classification"):
                chk = [c for c in r if c.startswith("[X]")]
                info["Classification"] = chk[0][4:].strip() if chk else None
    no = re.search(r"OPL No:\s*(OPL-[\w-]+)", text).group(1)
    def after_header(word):
        for t in tabs:
            for i, r in enumerate(t[:2]):
                if r and cell(r[0]) == word:
                    return t[i + 1:]
        return None
    steps = after_header("Step")
    probs = after_header("Symptom")
    sign = next((t for t in tabs if cell(t[0][0]) == "Prepared by"), None)
    signoff = dict(zip([cell(c) for c in sign[0]], [cell(c) for c in sign[1]])) if sign and len(sign) > 1 else {}
    purpose = section(text, "1. PURPOSE / OBJECTIVE", "2. SAFETY PRECAUTIONS")
    hazard = re.search(r"Hazard note: (.+?)\. Observe", re.sub(r"\s+", " ", text))
    safety = [s.strip() for s in re.split(r"\s*[■]\s*", section(text, "during the task:", "3. TOOLS")) if s.strip()]
    tools = [s.strip() for s in re.split(r"\s*[●]\s*", section(text, "3. TOOLS & MATERIALS REQUIRED", "4. DETAILED")) if s.strip()]
    learn = [s.strip() for s in re.split(r"\s*[■]\s*", section(text, "6. KEY LEARNING POINTS", "Prepared by")) if s.strip()]
    title = info.get("OPL Title") or os.path.basename(rel)
    body = f"# {no} - {title}\n\n"
    body += table(["Field", "Value"], [("Equipment", info.get("Equipment")), ("Area / unit", info.get("Area / Unit")),
                                        ("Discipline", info.get("Discipline")), ("Classification", info.get("Classification")),
                                        ("Related interlock", info.get("Related Interlock")), ("P&ID ref", info.get("P&ID Ref"))]) + "\n"
    body += f"## 1. Purpose\n\n{purpose}\n\n"
    body += "## 2. Safety precautions\n\n" + (f"Hazard note: {hazard.group(1)}.\n\n" if hazard else "") + "\n".join(f"- {s}" for s in safety) + "\n\n"
    body += "## 3. Tools & materials\n\n" + "\n".join(f"- {s}" for s in tools) + "\n\n"
    if steps:
        body += "## 4. Procedure\n\n" + table(["Step", "Action", "Check / acceptance (as printed)"], steps) + "\n"
    if probs:
        rows, links = [], []
        for r in probs:
            r = [cell(c) for c in r]
            key = r[0][:30].lower()
            wo = next((w for w in wos_by_tag.get(tag, []) if (w["Problem_Description"] or "").lower().startswith(key)), None)
            if wo:
                rows.append((wo["Problem_Description"], wo["Root_Cause"], wo["Corrective_Action"], wo["WO_Number"]))
            else:
                rows.append((r[0], r[1], r[2], ""))
        body += "## 5. Common problems & troubleshooting\n\nFull text restored from the linked work order where the OPL cell was cut off.\n\n" + table(["Symptom", "Likely cause", "Action", "Work order"], rows) + "\n"
    body += "## 6. Key learning points\n\n" + "\n".join(f"- {s}" for s in learn) + "\n\n"
    body += "## Sign-off\n\n" + table(["Role", "Name"], list(signoff.items()))
    meta = dict(doc_id=no, doc_no=no, title=title, doc_type="OPL", equipment_tag=tag, revision=None,
                status="Approved" if signoff.get("Approved by (Manager)") else "Pending approval",
                reviewed_by=signoff.get("Reviewed by (Supervisor)"), approved_by=signoff.get("Approved by (Manager)"),
                date=signoff.get("Date of Sharing"), classification=info.get("Classification"),
                discipline=info.get("Discipline"), related_interlock=info.get("Related Interlock"),
                pid_ref=info.get("P&ID Ref"), source_file=rel, instrument_tags=instr_tags(text, tag))
    return meta, body

# ---------------------------------------------------------------- maintenance history
wb = openpyxl.load_workbook(os.path.join(ROOT, "Maintenance History (All Equipment).xlsx"), data_only=True)
rows = list(wb.worksheets[0].iter_rows(values_only=True))
H = rows[0]
WOS = []
for r in rows[1:]:
    if not r[0]: continue
    d = {k: (v.strftime("%Y-%m-%d") if isinstance(v, datetime.datetime) else v) for k, v in zip(H, r)}
    for k in ("Downtime_Hours", "Labor_Hours"):
        if d.get(k) is not None: d[k] = float(d[k])
    WOS.append(d)
WOS.sort(key=lambda w: (w["Equipment_Tag"], w["Report_Date"]))
wos_by_tag = defaultdict(list)
for w in WOS: wos_by_tag[w["Equipment_Tag"]].append(w)
COLDOC = {r[0]: r[1] for r in wb.worksheets[1].iter_rows(min_row=2, values_only=True) if r[0]}

# ---------------------------------------------------------------- run document parsing
TYPES = [("Datasheet", parse_datasheet), ("Interlock", parse_interlock), ("Drawing", parse_ga), ("Plot Plan", parse_plot)]
for setdir in sorted(glob.glob(os.path.join(ROOT, "Set_*"))):
    tag = os.path.basename(setdir).split("_")[2]
    assets[tag] = dict(tag=tag, set=os.path.basename(setdir))
    for f in sorted(glob.glob(os.path.join(setdir, "**", "*.pdf"), recursive=True)):
        rel = os.path.relpath(f, ROOT)
        base = os.path.basename(f)
        if "OPL" in rel:
            meta, body = parse_opl(f, tag, rel, wos_by_tag)
        else:
            fn = next(fn for key, fn in TYPES if key.lower() in base.lower())
            meta, body = fn(f, tag, rel)
        docs[tag].append((meta, body))
    for p in glob.glob(os.path.join(setdir, "*.png")):
        num = re.search(r"\d{4}", tag).group(0)
        meta = dict(doc_id=f"TJC-LLD-PID-{num}", doc_no=f"TJC-LLD-PID-{num}", title=f"P&ID - {tag}", doc_type="P&ID",
                    equipment_tag=tag, revision=None, status="Number resolved from datasheet (title block shows TJC-LLD-PID-XXXX)",
                    approved_by=None, date=None, source_file=os.path.relpath(p, ROOT))
        body = (f"# P&ID - {tag}\n\nImage-only drawing. The title block prints `TJC-LLD-PID-XXXX`; the number "
                f"`TJC-LLD-PID-{num}` comes from the datasheet and interlock cross-references.\n\n"
                f"## Tags linked to this drawing\n\nFrom the interlock matrix and datasheet of {tag}:\n\n")
        tags = sorted({t for m, _ in docs[tag] for t in (m.get('instrument_tags') or [])})
        body += "\n".join(f"- `{t}`" for t in tags) + "\n\n"
        body += "## Description\n\nTo be written by an engineer from the drawing (flow path, valves, instruments, trips). Keep tags in backticks so they link.\n"
        docs[tag].append((meta, body))

# ---------------------------------------------------------------- write documents
def doc_path(m):
    return f"documents/{m['equipment_tag']}/{m['doc_id']}.md"

for tag, lst in docs.items():
    for meta, body in lst:
        meta = dict(record_type="document", **meta, kb_generated=TODAY)
        write(doc_path(meta), front(meta) + body + f"\n---\nSource: `{meta['source_file']}`\n")

# ---------------------------------------------------------------- write work orders
FIELDS = [("WO_Number", "wo_number"), ("Notification_No", "notification_no"), ("Report_Date", "report_date"),
          ("Start_Date", "start_date"), ("Completion_Date", "completion_date"), ("Status", "status"),
          ("Equipment_Tag", "equipment_tag"), ("Equipment_Name", "equipment_name"), ("Functional_Location", "functional_location"),
          ("Area_Code", "area_code"), ("Area_Name", "area_name"), ("Work_Type", "work_type"), ("Discipline", "discipline"),
          ("Priority", "priority"), ("Criticality", "criticality"), ("Breakdown", "breakdown"), ("Downtime_Hours", "downtime_hours"),
          ("Labor_Hours", "labor_hours"), ("Labor_Cost_IDR", "labor_cost_idr"), ("Material_Cost_IDR", "material_cost_idr"),
          ("Total_Cost_IDR", "total_cost_idr"), ("Reported_By", "reported_by"), ("Executed_By", "executed_by"),
          ("Approved_By", "approved_by"), ("Related_Interlock", "related_interlock"), ("Spare_Parts_Used", "spare_parts")]
for w in WOS:
    meta = {"record_type": "work_order"}
    for src, key in FIELDS:
        v = w.get(src)
        meta[key] = None if v in ("-",) and key == "spare_parts" else v
    missing = [k for k in ("downtime_hours", "total_cost_idr", "breakdown", "approved_by") if meta.get(k) is None]
    meta["missing_fields"] = missing
    body = (f"# {w['WO_Number']} - {w['Equipment_Tag']} - {w['Problem_Description']}\n\n"
            f"## Problem\n\n{w['Problem_Description']}\n\n## Root cause\n\n{w['Root_Cause']}\n\n"
            f"## Corrective action\n\n{w['Corrective_Action']}\n\n## Spare parts used\n\n{w.get('Spare_Parts_Used') or '-'}\n\n")
    if w.get("Remarks"): body += f"## Remarks\n\n{w['Remarks']}\n\n"
    if missing: body += f"> Data gap: {', '.join(missing)} not recorded in AIMS.\n\n"
    body += f"Asset: [{w['Equipment_Tag']}](../../assets/{w['Equipment_Tag']}.md)\n"
    write(f"work-orders/{w['Equipment_Tag']}/{w['WO_Number']}.md", front(meta | {"kb_generated": TODAY}) + body)

# ---------------------------------------------------------------- write assets
def idr(n): return f"{n:,.0f}" if n else "-"
for tag, a in assets.items():
    ws = wos_by_tag.get(tag, [])
    corr = [w for w in ws if w["Work_Type"] == "Corrective"]
    dt = sum(w["Downtime_Hours"] or 0 for w in ws)
    cost = sum(w["Total_Cost_IDR"] or 0 for w in ws)
    miss = sum(1 for w in ws if w["Downtime_Hours"] is None)
    meta = dict(record_type="asset", equipment_tag=tag, name=a.get("name"), type=a.get("type"), equipment_id=a.get("equipment_id"),
                plant=a.get("plant"), area=a.get("area"), functional_location=a.get("functional_location"),
                criticality=a.get("criticality"), sil=a.get("sil"), interlock=a.get("logic_no"), pid=a.get("pid_ref"),
                grid_ref=a.get("grid_ref"), elevation=a.get("elevation"), document_count=len(docs[tag]),
                work_order_count=len(ws), corrective_count=len(corr), kb_generated=TODAY)
    b = f"# {tag} - {a.get('name')}\n\n{a.get('type')}. Service: {a.get('service')}.\n\n"
    b += table(["Field", "Value"], [("Area", a.get("area")), ("Functional location", a.get("functional_location")),
                                     ("Criticality", a.get("criticality")), ("Protection", f"{a.get('logic_no')} ({a.get('sil')})"),
                                     ("P&ID", a.get("pid_ref")), ("Location", f"Grid {a.get('grid_ref')}, {a.get('elevation')}, footprint {a.get('footprint')}")]) + "\n"
    for name, pairs in a.get("datasheet_sections", [])[1:]:
        b += f"## {name}\n\n" + table(["Field", "Value"], pairs) + "\n"
    if a.get("trips"):
        b += "## Protection: trips\n\n" + table(["Tag", "Cause", "Set point", "Vote", "Effects"],
            [(t["tag"], t["cause"], t["setpoint"], t["vote"], "; ".join(t["effects"])) for t in a["trips"]]) + "\n"
    if a.get("permissives"):
        b += "## Protection: start permissives\n\n" + table(["#", "Permissive", "Signal"], a["permissives"]) + "\n"
    b += "## Documents\n\n" + table(["Doc no.", "Title", "Type", "Rev", "Status"],
        [(f"[{m['doc_id']}](../{doc_path(m)})", m["title"], m["doc_type"], m.get("revision") or "-", m.get("status") or "-") for m, _ in docs[tag]]) + "\n"
    b += (f"## Maintenance summary\n\n{len(ws)} work orders, {len(corr)} corrective. Recorded downtime {dt:.1f} h, recorded cost IDR {idr(cost)}."
          + (f" {miss} work orders have no downtime or cost recorded." if miss else "") + "\n\n")
    b += "### Failures (corrective and overhaul)\n\n" + table(["Date", "WO", "Problem", "Root cause", "Downtime h"],
        [(w["Report_Date"], f"[{w['WO_Number']}](../work-orders/{tag}/{w['WO_Number']}.md)", w["Problem_Description"], w["Root_Cause"],
          w["Downtime_Hours"] if w["Downtime_Hours"] is not None else "not recorded") for w in ws if w["Work_Type"] in ("Corrective", "Overhaul")]) + "\n"
    b += "### All work orders\n\n" + table(["Date", "WO", "Type", "Problem"],
        [(w["Report_Date"], f"[{w['WO_Number']}](../work-orders/{tag}/{w['WO_Number']}.md)", w["Work_Type"], w["Problem_Description"]) for w in ws])
    write(f"assets/{tag}.md", front(meta) + b)

# ---------------------------------------------------------------- index
idx = front(dict(record_type="index", title="LLDPE Unit Knowledge Base", kb_generated=TODAY))
idx += "# LLDPE Unit Knowledge Base\n\nGenerated from the CALIBER Case 1 dataset. Equipment tag is the join key across every file.\n\n"
idx += "## Assets\n\n" + table(["Tag", "Name", "Criticality", "Protection", "Docs", "Work orders", "Failures"],
    [(f"[{t}](assets/{t}.md)", a.get("name"), a.get("criticality"), f"{a.get('logic_no')} {a.get('sil')}", len(docs[t]),
      len(wos_by_tag[t]), sum(1 for w in wos_by_tag[t] if w["Work_Type"] == "Corrective")) for t, a in assets.items()]) + "\n"
idx += "## All documents\n\n" + table(["Doc no.", "Asset", "Type", "Title", "Rev", "Status", "Approved by"],
    [(f"[{m['doc_id']}]({doc_path(m)})", m["equipment_tag"], m["doc_type"], m["title"], m.get("revision") or "-", m.get("status"), m.get("approved_by") or "-")
     for t in docs for m, _ in docs[t]]) + "\n"
idx += "## Maintenance data dictionary\n\n" + table(["Column", "Meaning"], list(COLDOC.items()))
write("index.md", idx)

n_docs = sum(len(v) for v in docs.values())
print(f"{len(assets)} assets, {n_docs} documents, {len(WOS)} work orders")
