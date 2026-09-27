"""Run the test questions against the knowledge base.

Usage (inside the knowledge-base folder):
    python scripts/run_tests.py                  # retrieval check only: free, no API key
    python scripts/run_tests.py --full           # also asks Claude and grades each answer
    python scripts/run_tests.py --full --only TQ-45,TQ-46

Retrieval check: is the expected source among the top-k passages?
  (answerable questions only; ambiguous and refuse questions are skipped here)
Full run: needs ANTHROPIC_API_KEY and `pip install anthropic`. For each question it
  retrieves passages the same way the demo does (BM25 + equipment-tag boost), asks
  Claude with the demo's prompt, then grades three things:
    behaviour  answer / clarify / refuse, as the question expects  (graded by Claude)
    answer     matches the expected answer                          (graded by Claude)
    source     the expected document is among the cited sources     (checked in code)
Results go to tests/results.csv and a summary is printed.
"""
import argparse, csv, json, math, os, re, sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
KB = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from md_to_json import parse_front, chunks  # noqa: E402

ID_RE = re.compile(r"\b(?:TJC-LLD-[A-Z]+-[A-Z0-9-]+|OPL-[A-Z]{2}-\d{4}[A-Z]?-\d{2}|WO-\d{6})\b")
TAG_RE = re.compile(r"\b[A-Z]{2}-\d{4}[A-Z]?\b")
VOCAB_FILE = os.path.join(KB, "search", "synonyms.json")  # shared with the demo (data/kb.js)
_V = json.load(open(VOCAB_FILE, encoding="utf-8")) if os.path.exists(VOCAB_FILE) else {}
SYN = _V.get("en_synonyms", {})
ID_MAP = _V.get("id_map", {})
ID_PHRASES = _V.get("id_phrases", [])
ID_STOP = set(_V.get("id_stop", []))
ASSETS = ["GA-1201A", "YD-2301", "DC-3401A", "KC-4501", "EA-5601", "LV-6701", "CT-7801", "FA-8901"]
STOP = set("the a an and or of to in on for is are be at by with from as it this that what which when how do does i we should my our me can if into than then there their them any all was were has have had not no per vs about".split())


def toks(s):
    out = []
    for w in re.findall(r"[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]", s.lower()):
        if w in STOP:
            continue
        out.append(w)
        if "-" in w:
            out += [p for p in w.split("-") if len(p) > 1 and p not in STOP]
        if len(w) > 4 and w.endswith("s"):
            out.append(w[:-1])
    return out


def load_chunks():
    rows = []
    for root, dirs, files in os.walk(KB):
        dirs[:] = [d for d in dirs if d not in {"scripts", "export", "tests", "images"}]
        for f in files:
            if not f.endswith(".md") or f in ("README.md", "index.md"):
                continue
            meta, body = parse_front(open(os.path.join(root, f), encoding="utf-8").read())
            rt = meta.get("record_type")
            ref = meta.get("doc_id") or meta.get("wo_number") or \
                ("ASSET-" + meta["equipment_tag"] if rt == "asset" else "KB-" + (rt or f).upper())
            for section, text in chunks(body):
                text = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text).strip()
                if text:
                    rows.append({"ref": ref, "tag": meta.get("equipment_tag"), "type": rt, "status": meta.get("status"),
                                 "revision": meta.get("revision"), "work_type": meta.get("work_type"), "text": f"{section}\n{text}"[:1400]})
    return rows


def lev(a, b, mx):
    """Edit distance with transpositions, giving up early once it exceeds mx."""
    if abs(len(a) - len(b)) > mx:
        return mx + 1
    prev2, prev = None, list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        cur = [i]
        for j in range(1, len(b) + 1):
            v = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
            if prev2 and i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                v = min(v, prev2[j - 2] + 1)
            cur.append(v)
        if min(cur) > mx:
            return mx + 1
        prev2, prev = prev, cur
    return prev[-1]


class Index:
    def __init__(self, rows):
        self.rows = rows
        self.df = Counter()
        for r in rows:
            r["tf"] = Counter(toks(r["text"]))
            r["len"] = sum(r["tf"].values())
            self.df.update(r["tf"].keys())
        self.avg = sum(r["len"] for r in rows) / len(rows)
        self.vocab = [w for w in self.df if re.fullmatch(r"[a-z]{4,}", w)]

    def nearest(self, w):
        mx = 2 if len(w) >= 7 else 1
        best, bd, bdf = None, mx + 1, 0
        for v in self.vocab:
            d = lev(w, v, mx)
            if d < bd or (d == bd and self.df[v] > bdf):
                best, bd, bdf = v, d, self.df[v]
        return best if bd <= mx else None

    def fix_query(self, q):
        """Same corrections as fixQuery() in the demo's app.js: tags, typos, Indonesian words."""
        notes = []

        def wo(m):
            r = "WO-" + m.group(1)
            if r != m.group(0):
                notes.append(f"{m.group(0)} -> {r}")
            return r

        def tag(m):
            L, D, X = m.groups()
            r = f"{L}-{D}{X}".upper()
            if r in ASSETS or r.lower() in self.df:
                if r != m.group(0):
                    notes.append(f"{m.group(0)} -> {r}")
                return r
            if len(L) == 2:
                near = [a for a in ASSETS if a.startswith(L.upper() + "-") and lev(a[3:], D + X.upper(), 1) <= 1]
                if len(near) == 1:
                    notes.append(f"{m.group(0)} -> {near[0]}")
                    return near[0]
            return m.group(0)

        s = re.sub(r"\bWO[\s_-]?(\d{6})\b", wo, q, flags=re.I)
        s = re.sub(r"\b([A-Za-z]{2,5})[\s_-]?(\d{4,5})([A-Za-z]?)\b", tag, s)
        low, extra = s.lower(), []
        extra += [en for idw, en in ID_PHRASES if idw in low]
        for w in re.findall(r"[a-z]+", low):
            if w in ID_MAP:
                extra.append(ID_MAP[w])
                continue
            if len(w) < 4 or w in STOP or w in ID_STOP or w in self.df or w in SYN:
                continue
            n = self.nearest(w)
            if n and n != w:
                s = re.sub(r"\b" + w + r"\b", n, s, count=1, flags=re.I)
                notes.append(f"{w} -> {n}")
        if extra:
            s += " " + " ".join(extra)
            notes.append("translated: " + " ".join(extra))
        return s, notes

    def search(self, q, k=10):
        qs = set(toks(q))
        qs |= {s for w in list(qs) for s in SYN.get(w, [])}
        tags = [x for x in TAG_RE.findall(q.upper()) if x in ASSETS]
        if not tags:  # instrument tag (VSHH-1201) -> asset of its unit (12xx -> GA-1201A)
            for m in re.finditer(r"\b[A-Z]{2,5}-(\d{2})\d{2}[A-Z]?\b", q.upper()):
                tags = [a for a in ASSETS if a[3:5] == m.group(1)][:1]
                if tags:
                    break
        focus = tags[0] if tags else None
        n, k1, b = len(self.rows), 1.3, 0.72
        scored = []
        for r in self.rows:
            s = 0.0
            for w in qs:
                f = r["tf"].get(w)
                if f:
                    df = self.df[w]
                    s += math.log(1 + (n - df + .5) / (df + .5)) * f * (k1 + 1) / (f + k1 * (1 - b + b * r["len"] / self.avg))
            if not s:
                continue
            if focus:
                s *= 1.9 if r["tag"] == focus else 0.55
            if r["type"] == "work_order":
                s *= 1.15 if r.get("work_type") in ("Corrective", "Overhaul") else 0.8
            scored.append((s, r))
        scored.sort(key=lambda x: -x[0])
        out, seen = [], Counter()
        wo = 0
        for s, r in scored:
            if seen[r["ref"]] >= 2:
                continue
            if r["type"] == "work_order":
                if wo >= k // 2:  # keep room for documents: history alone never answers a setpoint question
                    continue
                wo += 1
            seen[r["ref"]] += 1
            out.append(r)
            if len(out) >= k:
                break
        return out, focus


PROMPT = """You are the Knowledge Hub assistant for the LLDPE unit of SDK Polyolefin. A plant engineer asked a question. Answer in the same language as the question (for example Indonesian or English), keeping tags, units and document numbers exactly as in the sources. Answer ONLY from the numbered sources below. Cite every factual claim with source labels in square brackets, like [S2]. Never invent set points, part numbers or dates. If the sources do not answer the question, say what is missing and give low confidence. Never suggest bypassing or defeating an interlock. Prefer approved procedures and interlock matrices over free-text history, and use work orders as evidence of what happened before. Sources marked "Derived" are summaries built from work orders, not approved documents: present them as past experience.
If the question is ambiguous (it could mean more than one asset, instrument or document, and the asset in context does not settle it), do not guess: put a short clarifying question in "clarify" listing the options, answer only the part that is certain, and give confidence below 50.
The page shows the picture of every cited document next to your answer. If the user asks to see a drawing, P&ID or document, cite that document and say briefly what it shows; never say you cannot show images.

Reply with only JSON of this shape:
{{"answer": "2-4 plain sentences with [S#] citations", "steps": ["ordered action with [S#] citations"], "confidence": 0-100, "confidence_reason": "one sentence", "cautions": ["anything that conflicts, is unapproved, or should be verified"], "clarify": "a clarifying question, or empty string"}}

Question: {q}

Sources:
{sources}"""

JUDGE = """You grade a plant knowledge chatbot. Compare the bot reply with the expected result.

Question: {q}
Expected behaviour: {behaviour}  (answer = give the answer; clarify = ask which asset/item is meant instead of guessing; refuse = say it is not in the documents or decline an unsafe request, without inventing)
Expected answer: {expected}

Bot reply (JSON): {reply}

Reply with only JSON: {{"behaviour_ok": true/false, "answer_ok": true/false, "note": "one short sentence"}}
answer_ok means the key facts (numbers, tags, causes) match the expected answer; extra correct detail is fine, wrong or missing key numbers are not. For clarify questions, answer_ok means the options it offers are consistent with the expected answer. For refuse questions, answer_ok means it invented nothing."""


def ask_json(client, prompt, effort):
    r = client.messages.create(model="claude-opus-5", max_tokens=8000, thinking={"type": "adaptive"},
                               output_config={"effort": effort}, messages=[{"role": "user", "content": prompt}])
    text = "".join(b.text for b in r.content if b.type == "text")
    m = re.search(r"\{[\s\S]*\}", text)
    return json.loads(m.group(0)) if m else {"answer": text}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", action="store_true", help="ask Claude and grade answers (needs ANTHROPIC_API_KEY)")
    ap.add_argument("--k", type=int, default=10, help="passages retrieved per question")
    ap.add_argument("--only", default="", help="comma-separated question IDs")
    a = ap.parse_args()

    qs = [json.loads(l) for l in open(os.path.join(KB, "tests", "questions.jsonl"), encoding="utf-8")]
    if a.only:
        keep = set(a.only.split(","))
        qs = [q for q in qs if q["id"] in keep]
    idx = Index(load_chunks())
    client = None
    if a.full:
        import anthropic
        client = anthropic.Anthropic()

    results, by_type = [], defaultdict(lambda: [0, 0])
    for q in qs:
        fixed, notes = idx.fix_query(q["question"])
        hits, focus = idx.search(fixed, a.k)
        refs = [h["ref"] for h in hits]
        expected = set(ID_RE.findall(q["expected_source"]))
        retrieved = bool(expected & set(refs)) if expected else None
        row = {"id": q["id"], "type": q["type"], "behaviour": q["behaviour"], "question": q["question"],
               "read_as": "; ".join(notes), "retrieved": retrieved, "top_refs": " ".join(dict.fromkeys(refs))}
        if client:
            labels = {f"S{i + 1}": h["ref"] for i, h in enumerate(hits)}
            src = "\n\n".join(f"[S{i + 1}] {h['type']} {h['ref']} | rev {h['revision']} | {h['status'] or 'Derived'}\n{h['text']}"
                              for i, h in enumerate(hits))
            reply = ask_json(client, PROMPT.format(q=q["question"], sources=src), "medium")
            cited = {labels[x] for x in re.findall(r"\[(S\d+)\]", json.dumps(reply)) if x in labels}
            grade = ask_json(client, JUDGE.format(q=q["question"], behaviour=q["behaviour"], expected=q["expected_answer"],
                                                  reply=json.dumps(reply, ensure_ascii=False)), "low")
            source_ok = bool(expected & cited) if expected and q["behaviour"] == "answer" else True
            passed = bool(grade.get("behaviour_ok")) and bool(grade.get("answer_ok")) and source_ok
            row.update({"behaviour_ok": grade.get("behaviour_ok"), "answer_ok": grade.get("answer_ok"), "source_ok": source_ok,
                        "pass": passed, "cited": " ".join(sorted(cited)), "bot_answer": reply.get("answer", ""),
                        "bot_clarify": reply.get("clarify", ""), "note": grade.get("note", "")})
            by_type[q["type"]][0] += passed
            by_type[q["type"]][1] += 1
            print(f"{q['id']} {'PASS' if passed else 'FAIL'}  {q['type']:<14} {grade.get('note', '')}")
        elif retrieved is not None and q["behaviour"] == "answer":
            by_type[q["type"]][0] += retrieved
            by_type[q["type"]][1] += 1
            print(f"{q['id']} {'hit ' if retrieved else 'MISS'}  {q['type']:<14} expected {', '.join(sorted(expected))}; top {', '.join(list(dict.fromkeys(refs))[:4])}")
        results.append(row)

    out = os.path.join(KB, "tests", "results.csv")
    with open(out, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(dict.fromkeys(k for r in results for k in r)))
        w.writeheader()
        w.writerows(results)
    total = [sum(v[0] for v in by_type.values()), sum(v[1] for v in by_type.values())]
    label = "passed" if client else "expected source retrieved in top %d" % a.k
    print(f"\n{total[0]}/{total[1]} {label}")
    for t, (p, n) in sorted(by_type.items()):
        print(f"  {t:<14} {p}/{n}")
    print(f"Details: {out}")


if __name__ == "__main__":
    main()
