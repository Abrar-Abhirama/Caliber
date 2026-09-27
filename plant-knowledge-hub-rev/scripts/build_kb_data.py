"""Load the Markdown knowledge base into the demo.

Usage (from this folder):
    python scripts/build_kb_data.py ../../knowledge-base

Reads every documents/, assets/, failures/ and quality/ file in the knowledge base
plus search/synonyms.json (typo, synonym and Indonesian vocabulary),
splits it at "## " headings and writes public/data/kb.json. Copies the
document images to public/images/. Re-run it whenever you edit a Markdown file,
for example after replacing an OPL with your own version.
"""
import glob, json, os, re, shutil, sys

KB = sys.argv[1] if len(sys.argv) > 1 else "../knowledge-base"
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAX = 1400  # characters per chunk

sys.path.insert(0, os.path.join(KB, "scripts"))
from md_to_json import parse_front, chunks  # same parser as the knowledge base export

IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")


def ref_for(meta, path):
    rt = meta.get("record_type")
    if rt == "document":
        return meta["doc_id"]
    if rt == "asset":
        return "ASSET-" + meta["equipment_tag"]
    if rt == "failure_patterns":
        return "KB-FAILURE-PATTERNS"
    if rt == "data_quality_findings":
        return "KB-DATA-QUALITY"
    return None


def split(text):
    if len(text) <= MAX:
        return [text]
    out, cur = [], ""
    for line in text.split("\n"):
        if len(cur) + len(line) > MAX and cur:
            out.append(cur)
            cur = ""
        cur += line + "\n"
    return out + [cur] if cur.strip() else out


docs, rows = {}, []
os.makedirs(os.path.join(HERE, "public", "images"), exist_ok=True)
os.makedirs(os.path.join(HERE, "public", "data"), exist_ok=True)
files = sorted(glob.glob(os.path.join(KB, "documents", "*", "*.md"))) + sorted(glob.glob(os.path.join(KB, "assets", "*.md"))) \
    + [os.path.join(KB, "failures", "patterns.md"), os.path.join(KB, "quality", "findings.md")]
for f in files:
    if not os.path.exists(f):
        continue
    meta, body = parse_front(open(f, encoding="utf-8").read())
    ref = ref_for(meta, f)
    if not ref:
        continue
    img = None
    if meta.get("image"):
        src = os.path.join(KB, meta["image"])
        if os.path.exists(src):
            img = "images/" + os.path.basename(src)
            shutil.copyfile(src, os.path.join(HERE, "public", img))
    title = re.search(r"(?m)^# (.*)", body)
    docs[ref] = {"title": meta.get("title") or (title.group(1) if title else ref), "type": meta.get("record_type"),
                 "tag": meta.get("equipment_tag"), "image": img, "status": meta.get("status"), "revision": meta.get("revision")}
    for section, text in chunks(body):
        text = IMG_RE.sub("", text).strip()
        if not text:
            continue
        for part in split(text):
            rows.append({"ref": ref, "tag": meta.get("equipment_tag"), "section": section, "text": part.strip()})

search = {}
syn = os.path.join(KB, "search", "synonyms.json")
if os.path.exists(syn):
    search = json.load(open(syn, encoding="utf-8"))
    search.pop("_readme", None)

with open(os.path.join(HERE, "public", "data", "kb.json"), "w", encoding="utf-8") as fh:
    json.dump({"docs": docs, "chunks": rows, "search": search}, fh, ensure_ascii=False, separators=(",", ":"))
print(f"{len(docs)} records, {len(rows)} chunks, {sum(1 for d in docs.values() if d['image'])} images -> public/data/kb.json")
