"""Convert the Markdown knowledge base to JSON.

Usage:
    python scripts/md_to_json.py            # run from the knowledge-base folder
    python scripts/md_to_json.py <kb_dir> <out_dir>

Writes to <out_dir> (default: export/):
    records.json   one object per .md file: front matter fields + "body" + "path"
    records.jsonl  same, one per line
    chunks.jsonl   bodies split at "## " headings, for embedding / RAG.
                   Image-only sections are skipped; the picture's path is in "image".
                   Each chunk carries the record's id, equipment_tag, doc type,
                   revision and status so answers can cite them.

No dependencies. Front matter values are written as JSON literals, so they are
parsed with json.loads; PyYAML is used instead if it is installed.
"""
import json, os, re, sys

KB = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(KB, "export")
SKIP = {"scripts", "export", "node_modules", ".git"}

try:
    import yaml
except ImportError:
    yaml = None


def parse_front(text):
    m = re.match(r"^---\n(.*?)\n---\n?", text, re.S)
    if not m:
        return {}, text
    raw, body = m.group(1), text[m.end():]
    if yaml:
        return yaml.safe_load(raw) or {}, body
    meta = {}
    for line in raw.splitlines():
        if ":" not in line:
            continue
        k, v = line.split(":", 1)
        v = v.strip()
        try:
            meta[k.strip()] = json.loads(v)
        except ValueError:
            meta[k.strip()] = v.strip('"')
    return meta, body


def record_id(meta, path):
    for k in ("doc_id", "wo_number", "equipment_tag", "id"):
        if meta.get(k) and not (k == "equipment_tag" and meta.get("record_type") != "asset"):
            return meta[k]
    return os.path.splitext(path)[0].replace(os.sep, "/")


def chunks(body):
    parts = re.split(r"(?m)^## ", body)
    title = re.search(r"(?m)^# (.*)", parts[0])
    title = title.group(1).strip() if title else ""
    head = parts[0].strip()
    if head and len(head) > len(title) + 4:
        yield title, head
    for p in parts[1:]:
        heading, _, text = p.partition("\n")
        text = text.strip()
        if text:
            yield f"{title} > {heading.strip()}", text


def main():
    os.makedirs(OUT, exist_ok=True)
    records, chunk_rows = [], []
    for root, dirs, files in os.walk(KB):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        for f in sorted(files):
            if not f.endswith(".md") or f == "README.md":
                continue
            path = os.path.join(root, f)
            rel = os.path.relpath(path, KB).replace(os.sep, "/")
            meta, body = parse_front(open(path, encoding="utf-8").read())
            rid = record_id(meta, rel)
            records.append({"id": rid, "path": rel, **meta, "body": body.strip()})
            for i, (section, text) in enumerate(chunks(body)):
                if not re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text).strip():
                    continue  # image-only section: the link is kept in "image"
                chunk_rows.append({
                    "chunk_id": f"{rid}#{i}",
                    "record_id": rid,
                    "path": rel,
                    "record_type": meta.get("record_type"),
                    "equipment_tag": meta.get("equipment_tag"),
                    "doc_type": meta.get("doc_type") or meta.get("work_type"),
                    "revision": meta.get("revision"),
                    "status": meta.get("status"),
                    "image": meta.get("image"),
                    "section": section,
                    "text": text,
                })
    with open(os.path.join(OUT, "records.json"), "w", encoding="utf-8") as fh:
        json.dump(records, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "records.jsonl"), "w", encoding="utf-8") as fh:
        fh.writelines(json.dumps(r, ensure_ascii=False) + "\n" for r in records)
    with open(os.path.join(OUT, "chunks.jsonl"), "w", encoding="utf-8") as fh:
        fh.writelines(json.dumps(c, ensure_ascii=False) + "\n" for c in chunk_rows)
    print(f"{len(records)} records, {len(chunk_rows)} chunks -> {OUT}")


if __name__ == "__main__":
    main()
