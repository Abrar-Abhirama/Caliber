# Plant Knowledge Hub (React + Vite)

React version of the Caliber hackathon demo. The **Ask** tab (cited Q&A with confidence, pictures,
typo and Indonesian tolerance) and a **Documents** tab are done. Plant, Data Ops, Asset 360 and
Failure Memory are placeholders: port them from `renderPlant()`, `renderDataOps()`, `renderAsset()`
and `renderMemory()` in the plain-JS version (`plant-knowledge-hub/app.js`).

## Run it (VS Code)

```bash
npm install
npm run dev            # http://localhost:5173
```

Live AI answers: copy `.env.example` to `.env.local` and put your key in `ANTHROPIC_API_KEY`.
`npm run dev` runs `api/ask.js` locally (see `vite.config.js`), so no extra tool is needed.
Without a key the app runs in offline mode: the five suggested questions give verified answers and
anything else shows the best-matching passages.

## Deploy (Vercel)

Import the folder or repo in Vercel (it detects Vite), add `ANTHROPIC_API_KEY` under
Project Settings > Environment Variables, and deploy. `api/ask.js` becomes the serverless function.
Never put the key in anything under `src/` or `public/`: those files are sent to the browser.

## Where things are

| Path | What it is |
|---|---|
| `src/App.jsx` | Loads data, connects AI, tabs, drawer |
| `src/components/AskView.jsx`, `AnswerCard.jsx` | The chatbot: question box, answer with numbered citations, pictures, confidence, sources |
| `src/components/SourceDrawer.jsx` | Opens any cited document, work order or live snapshot |
| `src/components/DocumentsView.jsx` | All 94 documents with their picture, filter by asset and type |
| `src/components/Header.jsx` | Header and tab list (`VIEWS`) |
| `src/lib/hub.js` | Loads the JSON, builds the index, `hub.ask()` runs one question end to end |
| `src/lib/search.js` | Search (BM25 + asset boost) and `fixQuery()` for tags, typos and Indonesian |
| `src/lib/prompt.js` | The prompt sent to Claude and the reply parser |
| `src/lib/evidence.js` | Evidence part of the confidence score |
| `src/lib/quality.js` | Data quality findings (cautions on answers) |
| `src/lib/assets.js` | Equipment config and simulated live values |
| `src/lib/curated.js` | Suggested questions and their offline answers |
| `src/lib/ai.js` | Calls `/api/ask` |
| `src/styles.css` | Styling, same as the plain-JS version. Colour tokens at the top |
| `public/data/*.json`, `public/images/*.png` | Generated data and document pictures |
| `api/ask.js` | Serverless function that calls Claude with your key |
| `scripts/` | Rebuild `public/` from the dataset and the knowledge base |

`src/lib/` has no React in it, so the same functions can be reused or tested on their own.

## Rebuild the data

After editing the knowledge base (for example replacing an OPL with your own Markdown):

```bash
python scripts/build_kb_data.py ../../knowledge-base          # public/data/kb.json + public/images/
python scripts/build_data.py "path/to/Case 1_ Manufacturing Knowledge Hub"   # docs.json + workorders.json
```

`build_data.py` needs `pip install pypdf openpyxl cffi`. `build_kb_data.py` needs the knowledge-base
folder (it imports `knowledge-base/scripts/md_to_json.py`).

To test answer quality use the 60 questions and `scripts/run_tests.py` in the knowledge-base folder.
If you change the prompt in `src/lib/prompt.js`, change `PROMPT` in `run_tests.py` too.

All data is sample data provided by CALIBER. Live sensor values are simulated.
