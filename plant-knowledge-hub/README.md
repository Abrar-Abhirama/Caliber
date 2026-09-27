# Plant Knowledge Hub (Caliber hackathon, Case 1)

A demo of an AI Manufacturing Knowledge Hub for the LLDPE unit. It is built on the real Case 1
dataset: 94 documents across 8 equipment sets, 211 work orders and 8 P&IDs.

Tabs: **Plant**, **Data Ops** (key question 1), **Ask** (key question 2), **Asset 360** and
**Failure Memory** (key question 3). A 6-step walkthrough bar takes judges through one case:
the GA-1201A vibration alarm.

## Files

| Path | What it is |
|---|---|
| `index.html` | Page shell. Loads the fonts, `styles.css`, the data files and `app.js` |
| `styles.css` | All styling. Colour tokens are at the top (light and dark theme) |
| `app.js` | All logic: assets and live-tag config, search index, views, Q&A, failure memory |
| `data/docs.js`, `data/workorders.js`, `data/pids.js`, `data/pids/*.png` | Generated from the Case 1 files |
| `scripts/build_data.py` | Rebuilds `data/docs.js`, `workorders.js`, `pids.js` from the Case 1 folder |
| `data/kb.js`, `data/images/*.png` | The Markdown knowledge base, split into passages, plus a picture of every document |
| `scripts/build_kb_data.py` | Rebuilds `data/kb.js` and `data/images/` from the knowledge-base folder |
| `api/ask.js` | Optional serverless endpoint for live AI answers (keeps your API key off the browser) |

Good places to edit in `app.js`:
- `ASSETS`: the live digital-twin tags, alarm and trip limits per asset
- `QUALITY`: the data quality findings shown in Data Ops
- `TOUR`: the walkthrough steps and narration
- `SUGG` and `CURATED`: the suggested questions and their offline answers
- `RECS`: the recommended actions on the Failure Memory tab

## Run it locally (VS Code)

The page is plain HTML, CSS and JS with no build step.

- Quickest: install the **Live Server** extension, right-click `index.html` and choose *Open with Live Server*.
- Or from a terminal in this folder: `npx serve .` (or `python -m http.server 8000`) and open the URL it prints.
- Double-clicking `index.html` also works, but the file-drop PDF parser and AI need a server.

Without the AI endpoint, the page runs in **offline mode**. The five suggested questions use verified,
cited answers, and any other question shows the best-matching passages with their sources.

## The chatbot (Ask tab)

- Searches about 700 passages from the Markdown knowledge base plus the 211 work orders, boosted for the asset named in the question or picked in the context box.
- Sends the best passages to Claude, which must cite each one. Every answer shows source, revision, approval status and a confidence score.
- Shows the pictures of the documents it cites. Ask "Show me the P&ID for DC-3401A" or "Show the plot plan of KC-4501" and the drawing comes first. Click a picture to open it, then "Open full size".
- Tolerates typos and tags without a dash (`GA1201A`, `vibraton`, `KC-4051` → `KC-4501`) and understands Indonesian questions (`getaran pompa naik`), answering in Indonesian. Under the question it shows what it corrected ("Read as: ..."). The word list is `knowledge-base/search/synonyms.json`.
- Asks back when a question is ambiguous. For example, "What is the vibration trip setpoint?" gets "Which equipment: GA-1201A, KC-4501 or CT-7801?". Untick "Use live asset context" to see this, because the context box otherwise picks the asset.

After editing any Markdown file (for example replacing an OPL with your own), run:

```bash
python scripts/build_kb_data.py ../../knowledge-base     # path to the knowledge-base folder
```

To test the chatbot, use the 60 questions in `knowledge-base/tests/` and `knowledge-base/scripts/run_tests.py` (see that README).

## Turn on live AI answers (optional)

`api/ask.js` is a Vercel serverless function that calls Claude with your key.

1. Get an API key at https://console.anthropic.com
2. `npm install`
3. Local test: copy `.env.example` to `.env.local`, add your key, and run `npx vercel dev`
4. Deploy: `npx vercel` (or connect the GitHub repo in the Vercel dashboard), then add
   `ANTHROPIC_API_KEY` under *Project Settings > Environment Variables* and redeploy.

At load, the page calls `GET /api/ask`. If a key is set, the header chip changes to "AI answers: live".
Never put the API key in `app.js` or any file the browser loads.

The endpoint uses `claude-opus-5` with server-side fallbacks enabled: if the model declines a request,
the API retries it on a fallback model. Remove `betas` and `fallbacks` in `api/ask.js` to turn that off.

## Deploy as a static site (no AI)

Upload the folder as it is to Netlify (drag and drop), GitHub Pages or Vercel. Everything except
`api/` is static.

## Rebuild the data

```bash
pip install pypdf openpyxl pillow cffi
python scripts/build_data.py "path/to/Case 1_ Manufacturing Knowledge Hub"
```

All data is sample data provided by CALIBER. Live sensor values are simulated.
