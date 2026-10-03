# LLDPE Plant Knowledge Base (Markdown)

The CALIBER Case 1 dataset as plain Markdown: one file per document, asset and work order. Each file starts with a YAML front-matter block holding its metadata, so it converts cleanly to JSON, a database or a vector store.

## Folder layout

```
index.md                        asset list with links to everything
assets/<TAG>.md                 one per equipment: design data, trips, documents, WO summary, failures
documents/<TAG>/<DOC_ID>.md     94 documents: datasheet (DS), GA drawing (GA), interlock (IL), P&ID, plot plan (PP), OPLs
work-orders/<TAG>/<WO>.md       211 work orders from the maintenance log
images/<DOC_ID>.png             a picture of every document (page 1 of the PDF, or the P&ID)
failures/patterns.md            failure memory: repeat chains and plant-wide patterns
quality/findings.md             data quality findings (conflicts, gaps)
tests/questions.md / .jsonl     60 test questions: expected behaviour, answer and source
search/synonyms.json            search vocabulary: English synonyms and Indonesian -> English words
scripts/build_kb.py             regenerates the Markdown from the raw dataset
scripts/add_images.py           renders the document pictures into images/ and links them
scripts/md_to_json.py           converts this folder to JSON / JSONL / chunks
scripts/run_tests.py            runs the test questions (retrieval check, or full check with Claude)
```

The equipment tag (GA-1201A, YD-2301, DC-3401A, KC-4501, EA-5601, LV-6701, CT-7801, FA-8901) is the join key everywhere.

## Front matter

Documents:

| Field | Meaning |
|---|---|
| record_type | `document` |
| doc_id, doc_no | e.g. `OPL-GA-1201A-03`, `TJC-LLD-IL-GA-1201A` |
| title, doc_type | doc_type is DS, GA, IL, PID, PP or OPL |
| equipment_tag | join key |
| revision, status, reviewed_by, approved_by, date | trust metadata to show beside every citation |
| source_file | path of the original PDF/XLSX in the dataset |
| instrument_tags | instrument tags mentioned in the document |
| image | picture of the document, e.g. `images/TJC-LLD-PID-1201.png` (also shown in an `## Image` section at the end of the body) |
| classification, discipline, related_interlock, pid_ref | OPLs only |

Work orders: `record_type: work_order` plus every column from the maintenance log (wo_number, dates, work_type, priority, downtime_hours, costs, spare_parts, related_interlock, ...) and `missing_fields`, the list of blank columns that matter. The body holds problem, root cause, action and remarks.

Assets: `record_type: asset`, tag, name, criticality and protection (SIS/SIL).

Values are written as JSON literals (quoted strings, `null`, lists), which are valid YAML too.

## Convert

```
python scripts/md_to_json.py                 # run inside this folder, writes export/
```

- `export/records.json` / `records.jsonl`: one object per file (front matter + `body` + `path`)
- `export/chunks.jsonl`: bodies split at `##` headings, each carrying id, tag, doc type, revision and status. Embed these for RAG so every answer can cite source, revision and approval status.

No packages needed. For other targets: pandoc converts any file to HTML/DOCX, and most static-site tools (Docusaurus, MkDocs, Obsidian) read this folder as is.

## Test questions

`tests/questions.md` has 60 questions (the last 10 test typos and Indonesian). Each one says what the bot should do:

- `answer` (51): give the answer and cite the expected source
- `clarify` (6): the question is ambiguous ("What is the vibration trip setpoint?" with no asset), so the bot must ask which one is meant instead of guessing
- `refuse` (3): the answer is not in the documents, or the request is unsafe

```
python scripts/run_tests.py            # free: checks the expected source is retrieved (top 10)
python scripts/run_tests.py --full     # asks Claude and grades behaviour, answer and source
```

`--full` needs `pip install anthropic` and `ANTHROPIC_API_KEY` set. Results go to `tests/results.csv`.
Current retrieval check: 44 of 49 answerable questions with a document ID find their source in the top 10, including all 5 Indonesian questions and 4 of 5 typo questions. The misses are real weak spots to work on: the YD-2301 packing conflict (TQ-10), the DC-3401A purge OPL (TQ-11), GA-1201A bearing numbers (TQ-26), "most expensive WO" (TQ-38, needs a calculation, not search) and the very short "dc3401a bed temprature trip" (TQ-54: the typo and tag are fixed, but the short query ranks work orders above the interlock sheet).

## Typos, tags and Indonesian

Before searching, the question is cleaned up (same logic in the demo's `app.js` and in `run_tests.py`):

- Tags without a dash or with spaces are fixed: `GA1201A`, `ga 1201a` become `GA-1201A`; `vshh1201` becomes `VSHH-1201`; `WO 240084` becomes `WO-240084`.
- An equipment tag that does not exist but is one digit off is replaced by the real one and the answer says so: `KC-4051` becomes `KC-4501`.
- An instrument tag points to its asset: `VSHH-1201` searches GA-1201A documents first.
- A misspelt word is replaced by the closest word in the documents (1 wrong letter for short words, 2 for words of 7+ letters): `vibraton` becomes `vibration`.
- Indonesian words get English search terms from `search/synonyms.json` (`getaran` = vibration, `bocor` = leak), and Claude answers in the language of the question.

To add words, edit `search/synonyms.json` and rebuild the demo data.

## Using your own OPL Markdown

If you wrote your own OPL files, drop each one over `documents/<TAG>/OPL-*.md` with the same file name. Keep the front-matter block (at least `record_type: "document"`, `doc_id`, `doc_type: "OPL"`, `equipment_tag`, `status`, `revision`) so the converter and citations still work. Your body can be any Markdown; `##` headings become chunk boundaries. To keep the picture, keep the `image:` line (or run `scripts/add_images.py` again). Then rebuild the demo data with `python scripts/build_kb_data.py <path to knowledge-base>` in the demo folder.

## Rebuild from the raw dataset

```
pip install pdfplumber pypdf cffi openpyxl pypdfium2 pillow
python scripts/build_kb.py "<path to Case 1_ Manufacturing Knowledge Hub>" <output folder>
cd <output folder> && python scripts/add_images.py "<path to Case 1_ Manufacturing Knowledge Hub>"
```

This overwrites generated files, so keep hand edits in a separate copy. `failures/`, `quality/` and `tests/` are written by hand and are not regenerated.

## Known data issues

See `quality/findings.md`. The main ones: GA-1201A pumping temperature 40 degC (datasheet) vs 80 degC (OPL hazard note), YD-2301 packing grade 4526L vs 4505L, 26 WOs missing downtime or cost, P&ID numbers are placeholders (XXXX). GA-1201A OPL-04 and 06 were added on 2026-10-03 from the supplied PDFs (no page image yet).
