// Data comes from data/*.js (regenerate with scripts/build_data.py)
const DOCS = window.KH_DOCS;
const WOS = window.KH_WOS;
const PIDS = window.KH_PIDS;
const KB = window.KH_KB || null; // Markdown knowledge base (data/kb.js), optional

// Optional AI backend. Deploy api/ask.js (see README) and answers are generated live.
// Without it, the scripted questions use verified answers and others show ranked passages.
const AI_ENDPOINT = "/api/ask";

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const fmtIDR = n => n == null ? "—" : "Rp " + (n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : Math.round(n / 1e3) + " k");
const fmtDate = s => { if (!s) return "—"; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}); };
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.append(t); setTimeout(() => t.remove(), 2600); }
function store(k, v){ try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
function rng(seed){ let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---------------- assets + digital twin config ---------------- */
const ASSETS = {
  "GA-1201A": {name:"Hexane Feed Pump", kind:"Centrifugal Pump (API 610 OH2)", seq:"SEQ-1201", sil:"SIL 1", standby:"GA-1201B (auto-start on trip)", tags:[
    {id:"VT-1201", d:"DE bearing vibration", u:"mm/s RMS", base:3.3, n:.12, dir:"hi", alarm:4.5, alarmSrc:"OPL-GA-1201A-07", trip:7.1, tripTag:"VSHH-1201", vote:"1oo2", src:"TJC-LLD-IL-GA-1201A", ramp:{start:108, to:5.3}, dp:1},
    {id:"TT-1201", d:"DE bearing temperature", u:"°C", base:64, n:.8, dir:"hi", trip:95, tripTag:"TSHH-1201", vote:"1oo1", src:"TJC-LLD-IL-GA-1201A", ramp:{start:112, to:79}, dp:0},
    {id:"PT-1201", d:"Suction pressure", u:"barg", base:1.85, n:.05, dir:"lo", trip:0.5, tripTag:"PSLL-1201", vote:"2oo3", src:"TJC-LLD-IL-GA-1201A", dp:2},
    {id:"FIT-1201", d:"Discharge flow", u:"m³/h", base:41, n:.9, dir:"lo", trip:9, tripTag:"FSLL-1201", vote:"1oo1", src:"TJC-LLD-IL-GA-1201A", dp:1},
    {id:"PDI-1201", d:"Seal flush dP (API Plan 11)", u:"bar", base:1.92, n:.05, dir:"lo", trip:1.5, tripTag:"Start permissive", vote:"—", src:"OPL-GA-1201A-01", dp:2, band:"1.5–2.5 bar"},
    {id:"Motor", d:"Motor current (rated 56 A)", u:"A", base:48.5, n:.6, dir:"hi", trip:56, tripTag:"MPR-1201", vote:"1oo1", src:"TJC-LLD-DS-GA-1201A", dp:1}
  ]},
  "YD-2301": {name:"Polymer Fluid Bed Dryer", kind:"Rotary Steam-Tube Dryer", seq:"SEQ-5500", sil:"SIL 2", tags:[
    {id:"TT-2301", d:"Outlet temperature", u:"°C", base:104, n:1.1, dir:"hi", trip:125, tripTag:"TSHH-2301", vote:"1oo1", src:"TJC-LLD-IL-YD-2301", dp:0},
    {id:"FT-2302", d:"N₂ purge flow", u:"kg/h", base:318, n:6, dir:"lo", trip:200, tripTag:"FSLL-2302", vote:"2oo3", src:"TJC-LLD-IL-YD-2301", dp:0},
    {id:"AT-2307", d:"Vent O₂", u:"%", base:2.1, n:.15, dir:"hi", trip:8, tripTag:"ASHH-2307", vote:"1oo2", src:"TJC-LLD-IL-YD-2301", dp:1},
    {id:"ST-2305", d:"Drum speed", u:"rpm", base:4.0, n:.03, dir:"lo", trip:1, tripTag:"SSLL-2305", vote:"1oo1", src:"TJC-LLD-IL-YD-2301", dp:2}
  ]},
  "DC-3401A": {name:"Catalyst Reduction Reactor", kind:"Fixed-Bed Reactor (Pd catalyst)", seq:"SEQ-3401", sil:"SIL 2", tags:[
    {id:"TE-3401", d:"Bed temperature (max of 8)", u:"°C", base:196, n:1.4, dir:"hi", trip:230, tripTag:"TSHH-3401", vote:"2oo3", src:"TJC-LLD-IL-DC-3401A", dp:0},
    {id:"PT-3404", d:"Reactor pressure", u:"barg", base:1.95, n:.04, dir:"hi", trip:5, tripTag:"PSHH-3404", vote:"1oo2", src:"TJC-LLD-IL-DC-3401A", dp:2},
    {id:"AI-3401", d:"Outlet O₂", u:"ppm", base:14, n:1.5, dir:"hi", trip:100, tripTag:"AI-3401", vote:"1oo1", src:"TJC-LLD-IL-DC-3401A", dp:0},
    {id:"FT-17343", d:"N₂ carrier flow", u:"kg/h", base:262, n:4, dir:"lo", trip:150, tripTag:"FSLL-17343", vote:"1oo1", src:"TJC-LLD-IL-DC-3401A", dp:0}
  ]},
  "KC-4501": {name:"Recycle Gas Compressor", kind:"Reciprocating Compressor (2-stage)", seq:"SEQ-4501", sil:"SIL 2", tags:[
    {id:"PT-4504", d:"Lube oil pressure", u:"barg", base:2.6, n:.05, dir:"lo", trip:1.5, tripTag:"PSLL-4504", vote:"2oo3", src:"TJC-LLD-IL-KC-4501", dp:2},
    {id:"TT-4503", d:"Discharge temperature", u:"°C", base:112, n:1.2, dir:"hi", trip:140, tripTag:"TSHH-4503", vote:"1oo1", src:"TJC-LLD-IL-KC-4501", dp:0},
    {id:"PT-4502", d:"Discharge pressure", u:"barg", base:12.4, n:.12, dir:"hi", trip:14, tripTag:"PSHH-4502", vote:"1oo2", src:"TJC-LLD-IL-KC-4501", dp:1},
    {id:"VT-4505", d:"Crosshead vibration", u:"mm/s", base:4.8, n:.2, dir:"hi", trip:11, tripTag:"VSHH-4505", vote:"1oo2", src:"TJC-LLD-IL-KC-4501", dp:1}
  ]},
  "EA-5601": {name:"Solvent Heater", kind:"Shell & Tube Heat Exchanger (BEM)", seq:"Control loop only", sil:"N/A", tags:[
    {id:"TIC-5602", d:"Solvent outlet temperature (SP 95)", u:"°C", base:94.6, n:.4, dir:"hi", trip:null, src:"TJC-LLD-IL-EA-5601", dp:1},
    {id:"PDT-5605", d:"Tube-side dP (fouling)", u:"bar", base:0.48, n:.01, dir:"hi", alarm:0.7, alarmSrc:"TJC-LLD-IL-EA-5601", trip:null, src:"TJC-LLD-IL-EA-5601", dp:2},
    {id:"FI-5603", d:"MP steam flow (design 3100)", u:"kg/h", base:2950, n:25, dir:"hi", trip:null, src:"TJC-LLD-DS-EA-5601", dp:0}
  ]},
  "LV-6701": {name:"Separator Level Control Valve", kind:"Globe Control Valve, Fisher 667 / DVC6200", seq:"SEQ-6701", sil:"SIL 1", tags:[
    {id:"LT-6710", d:"LP separator level", u:"%", base:52, n:1.5, dir:"hi", trip:85, tripTag:"LSHH-6710", vote:"1oo2", src:"TJC-LLD-IL-LV-6701", dp:0},
    {id:"ZT-6701", d:"Valve position", u:"%", base:46, n:1.2, dir:"hi", trip:null, src:"TJC-LLD-DS-LV-6701", dp:0},
    {id:"PI-6702", d:"Instrument air", u:"barg", base:1.4, n:.02, dir:"lo", trip:1.0, tripTag:"PSL-6702", vote:"1oo1", src:"TJC-LLD-IL-LV-6701", dp:2}
  ]},
  "CT-7801": {name:"Cooling Tower Cell Fan", kind:"Induced-Draft Axial Fan", seq:"SEQ-7801", sil:"SIL 1", tags:[
    {id:"VT-7802", d:"Fan / gearbox vibration", u:"mm/s", base:3.6, n:.15, dir:"hi", trip:9, tripTag:"VSHH-7802", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:1},
    {id:"TT-7803", d:"Gearbox oil temperature", u:"°C", base:62, n:.6, dir:"hi", trip:90, tripTag:"TSHH-7803", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:0},
    {id:"PT-7807", d:"Gearbox oil pressure", u:"barg", base:1.6, n:.04, dir:"lo", trip:0.8, tripTag:"PSL-7807", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:2}
  ]},
  "FA-8901": {name:"Reflux Accumulator Drum", kind:"Horizontal Pressure Vessel", seq:"SEQ-8901", sil:"SIL 1", tags:[
    {id:"LT-8901", d:"Drum level", u:"%", base:51, n:1.3, dir:"hi", trip:85, tripTag:"LSHH-8901", vote:"1oo2", src:"TJC-LLD-IL-FA-8901", dp:0},
    {id:"PT-8902", d:"Drum pressure", u:"barg", base:3.5, n:.05, dir:"hi", trip:8, tripTag:"PSHH-8902", vote:"1oo2", src:"TJC-LLD-IL-FA-8901", dp:2},
    {id:"LT-8903", d:"Boot water level", u:"%", base:34, n:1.2, dir:"hi", trip:null, src:"TJC-LLD-DS-FA-8901", dp:0}
  ]}
};
const TAGS = Object.keys(ASSETS);
const HOURS = 168;
// seeded 7-day history, then live ticks
for (const [ai, t] of TAGS.entries()) {
  ASSETS[t].tags.forEach((g, gi) => {
    const r = rng(1000 + ai * 50 + gi);
    g.hist = [];
    for (let i = 0; i < HOURS; i++) {
      let v = g.base + (r() - .5) * 2 * g.n;
      if (g.ramp && i >= g.ramp.start) { const k = (i - g.ramp.start) / (HOURS - 1 - g.ramp.start); v += (g.ramp.to - g.base) * Math.pow(k, 1.35); }
      g.hist.push(v);
    }
    if (g.ramp) g.hist[HOURS - 1] = g.ramp.to;
    g.v = g.hist[HOURS - 1];
    g.rr = r;
  });
}
function tickTwin(){
  for (const t of TAGS) for (const g of ASSETS[t].tags) {
    const drift = g.ramp ? (g.id.startsWith("VT") ? .0025 : .02) : 0;
    const target = (g.ramp ? g.v + drift : g.base);
    g.v = g.v + (target - g.v) * .3 + (g.rr() - .5) * g.n * .5 + drift;
  }
}
function tagState(g){
  if (g.trip != null) {
    if (g.dir === "hi" && g.v >= g.trip) return "crit";
    if (g.dir === "lo" && g.v <= g.trip) return "crit";
  }
  if (g.alarm != null && g.dir === "hi" && g.v >= g.alarm) return "warn";
  return "ok";
}
function assetState(t){ const s = ASSETS[t].tags.map(tagState); return s.includes("crit") ? "crit" : s.includes("warn") ? "warn" : "ok"; }
const fmtV = g => g.v.toFixed(g.dp);

/* ---------------- index: docs, work orders, lessons ---------------- */
const byDoc = Object.fromEntries(DOCS.map(d => [d.id, d]));
if (KB) {
  for (const [ref, k] of Object.entries(KB.docs)) {
    if (byDoc[ref]) { byDoc[ref].image = k.image; continue; }
    // derived records from the knowledge base: asset summaries, failure patterns, data quality
    const type = k.type === "asset" ? "Asset summary" : "Derived";
    const d = {id: ref, docNo: ref, tag: k.tag || null, type, title: k.title, rev: null, status: "Derived from source records", path: "knowledge-base", image: k.image, text: KB.chunks.filter(c => c.ref === ref).map(c => c.text).join("\n\n")};
    byDoc[ref] = d;
  }
}
const imgOf = ref => byDoc[ref]?.image || null;
const WANTS_PIC = /\b(show|picture|pictures|image|images|photo|drawing|drawings|diagram|p&id|pid|layout|plot plan|sketch|view|gambar|foto|tunjukkan|tampilkan|lihat)\b/i;
const PIC_TYPES = [[/p&id|\bpid\b|piping|instrument diagram/i, "P&ID"], [/plot plan|layout|location|where is/i, "Plot Plan"], [/interlock|logic|cause.and.effect|c&e/i, "Interlock C&E"], [/datasheet|data sheet/i, "Datasheet"], [/\bopl\b|one point lesson|procedure/i, "OPL"], [/drawing|\bga\b|dimension|arrangement|nozzle|bill of material|bom/i, "GA Drawing"]];
const woById = Object.fromEntries(WOS.map(w => [w.wo, w]));
for (const d of DOCS) {
  const pp = DOCS.find(x => x.tag === d.tag && x.type === "Plot Plan");
  if (d.type === "Datasheet") {
    const m = d.text.match(/CRITICALITY (HIGH CRITICAL|LOW CRITICAL|NON CRITICAL)/); if (m) ASSETS[d.tag].crit = m[1];
    const a = d.text.match(/AREA (\d{4} - [A-Z &]+?) FUNCTIONAL/); if (a) ASSETS[d.tag].area = a[1].replace(/\b([A-Z])([A-Z]+)/g, (x, p, q) => p + q.toLowerCase());
    const f = d.text.match(/FUNCTIONAL LOC\. (TJC-LLD-\d+-\d+)/); if (f) ASSETS[d.tag].floc = f[1];
    const s = d.text.match(/SERVICE (.+?) DESIGN/); if (s) ASSETS[d.tag].service = s[1];
  }
  if (pp && d === pp) {
    const g = d.text.match(/GRID REF ([\w-]+)/); const e = d.text.match(/ELEVATION (EL [+\-\d.]+)/);
    ASSETS[d.tag].grid = g ? g[1] : "—"; ASSETS[d.tag].elev = e ? e[1] : "—";
  }
}
let LESSONS = store("kh-lessons") || [];
let EXTRA = []; // docs added by drag-and-drop

const STOP = new Set("the a an and or of to in on for is are be at by with from as it this that what which when how do does i we should my our me can if into than then there their them any all was were has have had not no per vs about".split(" "));
const SRCH = (window.KH_KB && window.KH_KB.search) || {}; // vocabulary from knowledge-base/search/synonyms.json
const SYN = SRCH.en_synonyms || {};
function toks(s){
  const out = [];
  for (let w of String(s).toLowerCase().match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) || []) {
    if (STOP.has(w)) continue;
    out.push(w);
    if (w.includes("-")) for (const p of w.split("-")) if (p.length > 1 && !STOP.has(p)) out.push(p);
    if (w.length > 4 && w.endsWith("s")) out.push(w.slice(0, -1));
  }
  return out;
}
let CHUNKS = [], DF = new Map(), AVG = 1;
function woText(w){
  return `${w.wo} · ${w.date} · ${w.tag} ${w.name} · ${w.type} work order (${w.prio} priority). Problem: ${w.problem}. Root cause: ${w.cause}. Corrective action: ${w.action}. Spare parts: ${w.parts || "-"}. Breakdown: ${w.bd ?? "not recorded"}. Downtime: ${w.dt ?? "not recorded"} h. Interlock: ${w.il || "-"}.`;
}
function buildIndex(){
  CHUNKS = [];
  if (KB) for (const c of KB.chunks) CHUNKS.push({id: c.ref + "#" + CHUNKS.length, ref: c.ref, kind: byDoc[c.ref] && DOCS.includes(byDoc[c.ref]) ? "doc" : "kb", tag: c.tag, text: `${c.section}\n${c.text}`});
  for (const d of KB ? EXTRA : [...DOCS, ...EXTRA]) {
    if (!d.text) continue;
    const t = d.text; const W = 700, S = 520;
    for (let i = 0, n = 0; i < t.length; i += S, n++) {
      CHUNKS.push({id: d.id + "#" + n, ref: d.id, kind: "doc", tag: d.tag, text: t.slice(Math.max(0, i - (i ? 60 : 0)), i + W)});
      if (i + W >= t.length) break;
    }
  }
  for (const w of WOS) CHUNKS.push({id: w.wo, ref: w.wo, kind: "wo", tag: w.tag, text: woText(w)});
  for (const l of LESSONS) CHUNKS.push({id: l.id, ref: l.id, kind: "lesson", tag: l.tag, text: `Lesson learned ${l.id} (${l.date}) ${l.tag}: Symptom: ${l.symptom}. Cause: ${l.cause}. Action that worked: ${l.action}.`});
  DF = new Map(); let tot = 0;
  for (const c of CHUNKS) { c.tk = toks(c.text); tot += c.tk.length; c.tf = new Map(); for (const w of c.tk) c.tf.set(w, (c.tf.get(w) || 0) + 1); for (const w of c.tf.keys()) DF.set(w, (DF.get(w) || 0) + 1); }
  AVG = tot / CHUNKS.length; VOCAB = null;
}
function liveChunk(t){
  const a = ASSETS[t];
  const lines = a.tags.map(g => {
    const h = g.hist; const wk = g.v - h[0]; const d3 = g.v - h[HOURS - 72];
    return `${g.id} ${g.d} = ${fmtV(g)} ${g.u}` + (g.alarm != null ? `, alarm ${g.alarm}` : "") + (g.trip != null ? `, trip ${g.dir === "hi" ? ">" : "<"} ${g.trip} (${g.tripTag})` : "") + (Math.abs(d3) > g.n * 4 ? `, changed ${d3 > 0 ? "+" : ""}${d3.toFixed(g.dp || 1)} ${g.u} in last 3 days (${wk > 0 ? "+" : ""}${wk.toFixed(g.dp || 1)} in 7 days)` : ", stable over 7 days");
  });
  return {id: "LIVE-" + t, ref: "LIVE-" + t, kind: "live", tag: t, text: `Live digital-twin snapshot for ${t} ${a.name} at ${new Date().toLocaleString("en-GB")}: ` + lines.join("; ") + "."};
}
/* ---------------- typo, tag and Indonesian tolerance ---------------- */
// Indonesian words -> English search terms (the documents are in English)
const ID_PHRASES = SRCH.id_phrases || [];
const ID_MAP = SRCH.id_map || {};
const ID_STOP = new Set(SRCH.id_stop || []);
function lev(a, b, max){
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null, prev = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v); if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev; prev = cur;
  }
  return prev[b.length];
}
let VOCAB = null;
function nearestWord(w){
  if (!VOCAB) VOCAB = [...DF.keys()].filter(x => /^[a-z]{4,}$/.test(x));
  const max = w.length >= 7 ? 2 : 1; let best = null, bd = max + 1, bdf = 0;
  for (const v of VOCAB) { const d = lev(w, v, max); const df = DF.get(v); if (d < bd || (d === bd && df > bdf)) { best = v; bd = d; bdf = df; } }
  return bd <= max ? best : null;
}
// Returns the text used for search (tags fixed, typos fixed, Indonesian words translated) and a list of what was changed
function fixQuery(q){
  const notes = [];
  let s = q;
  s = s.replace(/\bWO[\s_-]?(\d{6})\b/gi, (m, d) => { const r = "WO-" + d; if (r !== m) notes.push(`${m} → ${r}`); return r; });
  s = s.replace(/\b([A-Za-z]{2,5})[\s_-]?(\d{4,5})([A-Za-z]?)\b/g, (m, L, D, X) => {
    const r = `${L}-${D}${X}`.toUpperCase();
    if (ASSETS[r] || DF.has(r.toLowerCase())) { if (r !== m) notes.push(`${m} → ${r}`); return r; }
    if (L.length === 2) { // looks like an equipment tag that does not exist: try the closest real one
      const near = TAGS.filter(t => t.startsWith(L.toUpperCase() + "-") && lev(t.slice(3), D + X.toUpperCase(), 1) <= 1);
      if (near.length === 1) { notes.push(`${m} → ${near[0]} (closest real tag)`); return near[0]; }
    }
    return m;
  });
  let low = s.toLowerCase(); const extra = [];
  for (const [id, en] of ID_PHRASES) if (low.includes(id)) extra.push(en);
  for (const w of low.match(/[a-z]+/g) || []) {
    if (ID_MAP[w]) { extra.push(ID_MAP[w]); continue; }
    if (w.length < 4 || STOP.has(w) || ID_STOP.has(w) || DF.has(w) || SYN[w]) continue;
    const n = nearestWord(w); if (n && n !== w) { s = s.replace(new RegExp("\\b" + w + "\\b", "i"), n); notes.push(`${w} → ${n}`); }
  }
  if (extra.length) { s += " " + extra.join(" "); notes.push("Indonesian terms translated: " + [...new Set(extra.join(" ").split(" "))].slice(0, 8).join(", ")); }
  return {q: s, notes};
}
function search(q, ctxTag, k = 10){
  const qt = []; for (const w of toks(q)) { qt.push(w); if (SYN[w]) qt.push(...SYN[w]); }
  const qset = [...new Set(qt)];
  let mTag = (q.toUpperCase().match(/\b[A-Z]{2}-\d{4}[A-Z]?\b/g) || []).filter(x => ASSETS[x]);
  if (!mTag.length) { // an instrument tag like VSHH-1201 or PSLL-4504 belongs to the asset of its unit (12xx -> GA-1201A)
    for (const m of q.toUpperCase().matchAll(/\b[A-Z]{2,5}-(\d{2})\d{2}[A-Z]?\b/g)) { const t = TAGS.find(t => t.slice(3, 5) === m[1]); if (t) { mTag = [t]; break; } }
  }
  const focus = mTag[0] || ctxTag;
  const N = CHUNKS.length, k1 = 1.3, b = .72;
  const scored = [];
  for (const c of CHUNKS) {
    let s = 0;
    for (const w of qset) { const f = c.tf.get(w); if (!f) continue; const df = DF.get(w) || 1; const idf = Math.log(1 + (N - df + .5) / (df + .5)); s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * c.tk.length / AVG)); }
    if (!s) continue;
    if (focus) s *= c.tag === focus ? 1.9 : .55;
    if (c.kind === "wo") { const w = woById[c.ref]; if (w && /Corrective|Overhaul/.test(w.type)) s *= 1.15; else s *= .8; }
    scored.push({c, s});
  }
  scored.sort((a, b) => b.s - a.s);
  const out = [], seen = new Map();
  let wo = 0; // cap work orders at half the results so documents (procedures, trips) always get room
  for (const x of scored) { const n = seen.get(x.c.ref) || 0; if (n >= 2) continue; if (x.c.kind === "wo") { if (wo >= Math.floor(k / 2)) continue; wo++; } seen.set(x.c.ref, n + 1); out.push(x); if (out.length >= k) break; }
  return {hits: out, focus, qset};
}

/* ---------------- data quality findings (from the real dataset) ---------------- */
const missingWO = WOS.filter(w => w.dt == null || w.cost == null);
const QUALITY = [
  {sev:"high", t:`${missingWO.length} work orders have no downtime, cost or breakdown flag`, d:`Mostly the high-priority correctives that matter most for reliability KPIs, e.g. WO-240003 (vibration trip) and WO-240002 (hexane seal leak). MTBF and cost-of-failure figures are understated until these are completed in AIMS.`, refs:["WO-240003","WO-240002","WO-240004"], docs:[]},
  {sev:"high", t:"YD-2301 packing grade differs from the datasheet", d:`Datasheet specifies PTFE Piller 4526L gland packing, but WO-240029 records hardened PTFE 4505L at the feed-end gland. A wrong-grade spare may have been installed. Check the spare-part master against the BOM.`, refs:["WO-240029","WO-240028"], docs:["TJC-LLD-DS-YD-2301","OPL-YD-2301-02"]},
  {sev:"med", t:"All 8 P&IDs carry a placeholder drawing number", d:`Title blocks read "TJC-LLD-PID-XXXX". The hub resolved each drawing to its real number (e.g. TJC-LLD-PID-1201) from datasheet and interlock cross-references.`, refs:[], docs:["TJC-LLD-PID-1201","TJC-LLD-DS-GA-1201A"]},
  {sev:"med", t:"GA-1201A OPL hazard note disagrees with the datasheet", d:`OPL safety notes say n-Hexane "up to 16 barg / 80 °C"; datasheet pumping temperature is 40 °C. Confirm the operating envelope and correct whichever is wrong.`, refs:[], docs:["OPL-GA-1201A-01","TJC-LLD-DS-GA-1201A"]},
  {sev:"med", t:"GA-1201A OPL numbering has gaps", d:`OPL-GA-1201A-04 and -06 are missing while every other asset has 01 to 07. Either they were never issued or they are outside the EDMS.`, refs:[], docs:["OPL-GA-1201A-03","OPL-GA-1201A-05"]},
  {sev:"low", t:"OPL acceptance column is misaligned with steps", d:`In OPL-GA-1201A-03, step 4 "Target angular < 0.05 mm/100 mm" is paired with "No leak / smooth operation". The template text shifted by one row, so acceptance criteria cannot be trusted as written.`, refs:[], docs:["OPL-GA-1201A-03"]},
  {sev:"low", t:"Drawings are still Rev 0 Issued for Construction", d:`GA drawings and plot plans are Rev 0 IFC (Jun 2026) while datasheets are Rev 3 Issued for Operation and maintenance history starts Jun 2024. As-built status is unclear.`, refs:[], docs:["TJC-LLD-GA-GA-1201A","TJC-LLD-PP-GA-1201A"]}
];
const cautionsFor = refs => QUALITY.filter(q => q.docs.some(d => refs.includes(d)) || q.refs.some(r => refs.includes(r)));

/* ---------------- state + routing ---------------- */
const S = {view:"plant", asset:"GA-1201A", ai:null, aiState:"connecting", tourStep:0, qa:[], busy:false, ctl:null, ingested:true, docFilter:{tag:"all", type:"all", q:""}, fmAsset:"GA-1201A"};
const TOUR = [
  {v:"dataops", t:"Foundation", x:"Before any question is asked, the hub has parsed every datasheet, drawing, interlock matrix, OPL and work order and linked them on the equipment tag. Press Re-run ingestion to watch it happen, then scroll to the data gaps it caught in the source files."},
  {v:"plant", t:"Alarm", x:"02:40 on night shift. GA-1201A, the hexane feed pump to the reactor, raises a bearing vibration alarm. Nothing has tripped yet. Open the pump to see what the hub knows."},
  {v:"asset", t:"Context", x:"One screen joins the live twin (vibration climbing toward the 7.1 mm/s trip), the interlock matrix, every controlled document and the maintenance history for this tag."},
  {v:"ask", t:"Ask", x:"The engineer asks in plain language. Every sentence of the answer is tied to a numbered source with its revision, approval status and a confidence score. Click any number to check it."},
  {v:"memory", t:"Failure memory", x:"The hub has seen this before. Four GA-1201A failures since Feb 2025 trace back to one root cause: misalignment after foundation settlement. Recommended actions are ranked and each one cites its evidence."},
  {v:"memory", t:"Act & learn", x:"Draft the work order with the references attached, then capture what was found so the next engineer gets it as an answer. That closes the loop from alarm to institutional memory.", act:"wo"}
];
function go(v, opts = {}){
  S.view = v;
  if (opts.asset) { S.asset = opts.asset; S.fmAsset = opts.asset; }
  document.querySelectorAll(".tab").forEach(b => b.setAttribute("aria-selected", b.dataset.v === v));
  try { history.replaceState(null, "", "#" + v); } catch (e) {}
  render();
  if (!opts.keepScroll) window.scrollTo({top: 0});
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest(".tab"); if (!b) return; if (TOUR[S.tourStep].v !== b.dataset.v) { const i = TOUR.findIndex(x => x.v === b.dataset.v); if (i >= 0) S.tourStep = i; } go(b.dataset.v); });
function renderTour(){
  const st = TOUR[S.tourStep];
  $("#tour").innerHTML = `
    <div class="tourhead"><span class="eyebrow">Judge walkthrough · one troubleshooting scenario</span>
      <div class="steps">${TOUR.map((s, i) => `<button class="step ${i === S.tourStep ? "on" : i < S.tourStep ? "done" : ""}" data-i="${i}"><i>${i + 1}</i>${s.t}</button>`).join("")}</div>
      <div class="tourbtns"><button class="btn sm" id="tPrev" ${S.tourStep === 0 ? "disabled" : ""}>Back</button><button class="btn sm primary" id="tNext">${S.tourStep === TOUR.length - 1 ? "Start over" : "Next step"}</button></div>
    </div>
    <div class="tourtxt"><b>${S.tourStep + 1}. ${st.t}.</b> ${st.x}</div>`;
}
$("#tour").addEventListener("click", e => {
  const b = e.target.closest(".step"); let i = null;
  if (b) i = +b.dataset.i;
  if (e.target.id === "tNext") i = S.tourStep === TOUR.length - 1 ? 0 : S.tourStep + 1;
  if (e.target.id === "tPrev") i = Math.max(0, S.tourStep - 1);
  if (i == null) return;
  S.tourStep = i; const st = TOUR[i];
  go(st.v, {asset: "GA-1201A"});
  if (st.v === "dataops" && i === 0) setTimeout(runIngestion, 300);
  if (st.v === "ask" && !S.qa.length) setTimeout(() => ask(SUGG[0]), 250);
  if (st.act === "wo") setTimeout(() => openWO(), 350);
});

function render(){
  renderTour();
  const v = $("#view");
  ({plant: renderPlant, dataops: renderDataOps, ask: renderAsk, asset: renderAsset, memory: renderMemory})[S.view](v);
}

/* ---------------- header live bits ---------------- */
function updHeader(){
  $("#clock").textContent = new Date().toLocaleString("en-GB", {weekday:"short", hour:"2-digit", minute:"2-digit", second:"2-digit"});
  const nDocs = DOCS.length + EXTRA.length;
  $("#chipIndex").lastElementChild.textContent = `${nDocs} docs · ${WOS.length} work orders · ${CHUNKS.length} passages indexed`;
}
function setAIChip(){
  const c = $("#chipAI"); const d = c.firstElementChild, t = c.lastElementChild;
  d.className = "dot " + (S.aiState === "live" ? "ok" : S.aiState === "connecting" ? "warn pulse" : "");
  t.textContent = S.aiState === "live" ? "AI answers: live" : S.aiState === "connecting" ? "AI answers: connecting…" : "AI answers: offline, retrieval mode";
  c.title = S.aiState === "live" ? "Answers are generated by Claude from the retrieved sources only." : "Generative answers need the claude.ai viewer. The hub falls back to verified demo answers and ranked passages.";
}

/* ---------------- sparkline ---------------- */
function spark(g, w = 220, h = 46){
  const vals = g.hist.concat([g.v]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const lines = [];
  if (g.alarm != null) lines.push({v: g.alarm, c: "var(--warn)"});
  if (g.trip != null) lines.push({v: g.trip, c: "var(--crit)"});
  for (const l of lines) { if (g.dir === "hi" && l.v < hi * 1.6) hi = Math.max(hi, l.v); if (g.dir === "lo" && l.v > lo * .4) lo = Math.min(lo, l.v); }
  const minSpan = Math.abs(g.base) * .25; if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = Math.min(lo, m - minSpan / 2); hi = Math.max(hi, m + minSpan / 2); }
  const pad = (hi - lo) * .12 || 1; lo -= pad; hi += pad;
  const X = i => i / (vals.length - 1) * (w - 6) + 1, Y = v => h - 3 - (v - lo) / (hi - lo) * (h - 6);
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const st = tagState(g); const col = st === "crit" ? "var(--crit)" : st === "warn" ? "var(--warn)" : "var(--accent)";
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    ${lines.filter(l => l.v >= lo && l.v <= hi).map(l => `<line x1="0" x2="${w}" y1="${Y(l.v)}" y2="${Y(l.v)}" stroke="${l.c}" stroke-dasharray="3 3" stroke-width="1"/>`).join("")}
    <polygon points="1,${h} ${pts} ${X(vals.length - 1)},${h}" fill="${col}" opacity=".10"/>
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(vals.length - 1)}" cy="${Y(g.v)}" r="2.8" fill="${col}"/></svg>`;
}
function margin(g){
  if (g.trip == null) return g.alarm != null ? `alarm at ${g.alarm} ${g.u}` : (g.band ? `normal ${g.band}` : "control loop");
  const gap = g.dir === "hi" ? g.trip - g.v : g.v - g.trip;
  const pct = Math.max(0, gap / Math.abs(g.trip) * 100);
  return `${gap.toFixed(g.dp || 1)} ${g.u} to ${g.tripTag === "Start permissive" ? "permissive limit" : "trip"}${g.dir === "hi" ? ` (${pct.toFixed(0)}%)` : ""}`;
}

/* ---------------- views: PLANT ---------------- */
function renderPlant(v){
  const alarms = TAGS.flatMap(t => ASSETS[t].tags.filter(g => tagState(g) !== "ok").map(g => ({t, g})));
  const vt = ASSETS["GA-1201A"].tags[0];
  v.innerHTML = `
  ${alarms.length ? `<div class="alarmbar" id="alarm">
    <span class="dot warn pulse" style="width:12px;height:12px"></span>
    <div style="flex:1;min-width:240px"><div class="t">ALARM · 02:40 · VAH-1201</div>
    <div class="big">GA-1201A Hexane Feed Pump: bearing vibration <span class="tnum" data-live="GA-1201A:VT-1201">${fmtV(vt)}</span> mm/s</div>
    <div class="small">Alarm 4.5 mm/s, trip 7.1 mm/s (VSHH-1201, 1oo2). Up ${(vt.v - vt.hist[HOURS - 72]).toFixed(1)} mm/s in 3 days, bearing temperature rising with it.</div></div>
    <button class="btn primary" data-go="asset" data-asset="GA-1201A">Troubleshoot GA-1201A</button></div>` : ""}
  <div class="cardh" style="margin:0"><h2>LLDPE Unit · 8 connected assets</h2><span class="sub">Live values from the digital twin, stitched to documents and history by equipment tag</span></div>
  <div class="assetgrid">${TAGS.map(t => { const a = ASSETS[t], st = assetState(t); const g = a.tags[0];
    const nd = DOCS.filter(d => d.tag === t).length, nw = WOS.filter(w => w.tag === t).length, nc = WOS.filter(w => w.tag === t && w.type === "Corrective").length;
    return `<button class="atile ${st === "ok" ? "" : "alarm"}" data-go="asset" data-asset="${t}">
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="tg">${t}</span><span class="badge ${st === "ok" ? "ok" : st}">${st === "ok" ? "Normal" : st === "warn" ? "Alarm" : "Trip"}</span></div>
      <div class="nm">${a.name}</div>
      <div class="kv"><span>${g.id} ${g.d.toLowerCase()}</span><b data-live="${t}:${g.id}">${fmtV(g)} ${g.u}</b></div>
      <div class="kv"><span>${a.crit ? a.crit.toLowerCase().replace(/^./, c => c.toUpperCase()) : ""} · ${a.sil}</span><span>${nd} docs · ${nw} WOs · ${nc} failures</span></div>
    </button>`; }).join("")}</div>
  <div class="kpis">
    <div class="kpi"><div class="v tnum">${DOCS.length}</div><div class="l">Controlled documents parsed (EDMS)</div></div>
    <div class="kpi"><div class="v tnum">${WOS.length}</div><div class="l">Work orders linked (AIMS), Jun 2024 to Dec 2025</div></div>
    <div class="kpi"><div class="v tnum">${WOS.filter(w => w.type === "Corrective").length}</div><div class="l">Failures with root cause in failure memory</div></div>
    <div class="kpi"><div class="v tnum">${QUALITY.length}</div><div class="l">Data gaps flagged before they mislead anyone</div></div>
  </div>`;
}

/* ---------------- views: DATA OPS ---------------- */
const TYPES = ["Datasheet", "GA Drawing", "Interlock C&E", "Plot Plan", "P&ID", "OPL"];
function instrTags(text, t){
  const pre = (t.match(/\d{2}/) || [""])[0];
  const set = new Set();
  for (const m of text.matchAll(/\b([A-Z]{1,5})-(\d{4,5})([A-Z]?)\b/g)) {
    if (/^(TJC|LLD|SEQ|EQ|EMP|WO|NT|OPL|BA|WPN|PID|IL|DS|GA|PP)$/.test(m[1]) && !(m[1] === "GA" && m[2].startsWith(pre) && m[3])) continue;
    const full = m[0]; if (full === t) continue;
    if (!m[2].startsWith(pre)) continue;
    set.add(full);
  }
  return [...set];
}
const STAGES = [
  {k:"Connect", d:"EDMS, AIMS, historian"},
  {k:"Parse", d:"PDF text, P&ID image"},
  {k:"Extract metadata", d:"doc no, rev, status, approver"},
  {k:"Link on tag", d:"equipment + instrument tags"},
  {k:"Validate", d:"quality rules"},
  {k:"Chunk & index", d:"hybrid search"}
];
function stageCounts(){
  const inst = new Set(); TAGS.forEach(t => DOCS.filter(d => d.tag === t).forEach(d => instrTags(d.text, t).forEach(x => inst.add(x))));
  return [`4 sources`, `${DOCS.length + EXTRA.length} files`, `${DOCS.filter(d => d.docNo).length} doc numbers`, `${TAGS.length} assets · ${inst.size} instr. tags`, `${QUALITY.length} findings`, `${CHUNKS.length} passages`];
}
function renderDataOps(v){
  const f = S.docFilter;
  const list = [...DOCS, ...EXTRA].filter(d => (f.tag === "all" || d.tag === f.tag) && (f.type === "all" || d.type === f.type) && (!f.q || (d.id + " " + d.title + " " + d.text).toLowerCase().includes(f.q.toLowerCase())));
  const counts = stageCounts();
  v.innerHTML = `
  <div class="cardh" style="margin:0"><h2>Industrial Data Ops foundation</h2><span class="sub">Key question 1: connect scattered plant knowledge into one structured base</span></div>
  <div class="card">
    <div class="cardh"><h3>Connected sources</h3><span class="sub">Equipment tag is the join key across every system</span></div>
    <div class="sources">
      <div class="src"><span class="sys">EDMS</span><span class="k tnum">${DOCS.filter(d => d.type !== "P&ID").length}</span><span class="small">Datasheets, GA drawings, interlock C&amp;E, plot plans, OPLs (PDF)</span></div>
      <div class="src"><span class="sys">Engineering drawings</span><span class="k tnum">${DOCS.filter(d => d.type === "P&ID").length}</span><span class="small">P&amp;IDs (image), resolved to drawing numbers</span></div>
      <div class="src"><span class="sys">AIMS / CMMS</span><span class="k tnum">${WOS.length}</span><span class="small">Work orders with root cause, action, parts, cost</span></div>
      <div class="src"><span class="sys">Digital twin</span><span class="k tnum">${TAGS.reduce((n, t) => n + ASSETS[t].tags.length, 0)}</span><span class="small">Live process tags with 7-day history</span></div>
      <div class="src"><span class="sys">Lessons learned</span><span class="k tnum" id="nLessons">${LESSONS.length}</span><span class="small">Captured by engineers in the hub</span></div>
    </div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="cardh"><h3>Ingestion pipeline</h3><div class="right"><button class="btn sm primary" id="runIng">Re-run ingestion</button></div></div>
      <div class="pipe" id="pipe">${STAGES.map((s, i) => `<div class="stage ${S.ingested ? "done" : ""}"><span class="nm">${i + 1}. ${s.k}</span><span class="small muted">${s.d}</span><span class="ct">${counts[i]}</span><div class="bar"><i></i></div></div>`).join("")}</div>
      <div class="log" id="log" style="margin-top:10px">${S.ingested ? "Index is current. Press Re-run ingestion to replay the pipeline over all source files." : ""}</div>
      <div class="drop" id="drop" style="margin-top:10px" tabindex="0" role="button">Drop a PDF or text file here to ingest it live (or click to choose). The hub extracts its text, doc number, revision and equipment tags, and it becomes searchable in Ask immediately.<input type="file" id="file" accept=".pdf,.txt,.md,.csv" hidden></div>
    </div>
    <div class="card">
      <div class="cardh"><h3>Knowledge graph</h3><div class="right"><select id="gAsset" aria-label="Asset">${TAGS.map(t => `<option ${t === S.asset ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <div class="graphwrap" id="graph">${graph(S.asset)}</div>
      <div class="legend"><span><i style="background:var(--ink)"></i>Asset</span><span><i style="background:var(--accent)"></i>Document</span><span><i style="background:var(--ok)"></i>Instrument / interlock tag</span><span><i style="background:var(--crit)"></i>Failure work order</span><span><i style="background:var(--muted)"></i>Routine work order</span></div>
    </div>
  </div>
  <div class="card">
    <div class="cardh"><h3>Data quality findings</h3><span class="sub">Found in the provided dataset during validation. Each one is surfaced wherever a cited answer depends on it.</span></div>
    ${QUALITY.map(q => `<div class="finding"><span class="sev ${q.sev}"></span><div style="display:grid;gap:3px;min-width:0"><div class="ft">${esc(q.t)} <span class="badge ${q.sev === "high" ? "crit" : q.sev === "med" ? "warn" : "acc"}">${q.sev === "high" ? "High" : q.sev === "med" ? "Medium" : "Low"}</span></div><div class="small" style="color:var(--ink2);max-width:95ch">${esc(q.d)}</div><div style="display:flex;gap:5px;flex-wrap:wrap">${[...q.docs, ...q.refs].map(r => `<span class="tagref" data-open="${r}">${r}</span>`).join("")}</div></div></div>`).join("")}
  </div>
  <div class="card">
    <div class="cardh"><h3>Structured document index</h3><span class="sub">${list.length} of ${DOCS.length + EXTRA.length} documents</span>
      <div class="right"><select id="fTag" aria-label="Asset filter"><option value="all">All assets</option>${TAGS.map(t => `<option ${f.tag === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      <select id="fType" aria-label="Type filter"><option value="all">All types</option>${[...TYPES, "Uploaded"].map(t => `<option ${f.type === t ? "selected" : ""}>${t}</option>`).join("")}</select>
      <input type="search" id="fQ" placeholder="Filter text" value="${esc(f.q)}" aria-label="Filter"></div></div>
    <div class="scroll"><table><thead><tr><th>Doc no.</th><th>Title</th><th>Asset</th><th>Type</th><th>Rev</th><th>Status</th><th>Approved by</th><th>Tags linked</th></tr></thead>
    <tbody>${list.slice(0, 120).map(d => `<tr class="click" data-open="${esc(d.id)}"><td class="mono">${esc(d.docNo || "—")}</td><td>${esc(d.title)}</td><td class="mono">${esc(d.tag || "—")}</td><td>${esc(d.type)}</td><td class="mono">${esc(d.rev ?? "—")}</td><td>${statusBadge(d)}</td><td class="small">${esc(d.approver || (d.type === "OPL" ? "—" : "Document control"))}</td><td class="mono tnum">${d.tag && ASSETS[d.tag] ? instrTags(d.text, d.tag).length : "—"}</td></tr>`).join("")}</tbody></table></div>
  </div>`;
  $("#runIng").onclick = runIngestion;
  $("#gAsset").onchange = e => { S.asset = e.target.value; $("#graph").innerHTML = graph(S.asset); };
  $("#fTag").onchange = e => { f.tag = e.target.value; renderDataOps(v); };
  $("#fType").onchange = e => { f.type = e.target.value; renderDataOps(v); };
  $("#fQ").onchange = e => { f.q = e.target.value; renderDataOps(v); };
  const drop = $("#drop"), file = $("#file");
  drop.onclick = e => { if (e.target !== file) file.click(); };
  drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) ingestFile(e.dataTransfer.files[0]); };
  file.onchange = () => { if (file.files[0]) ingestFile(file.files[0]); };
}
function statusBadge(d){
  const s = d.status || "—";
  const cls = /Approved|Operation/.test(s) ? "ok" : /Construction|Referenced|Pending|Draft|Uploaded/.test(s) ? "warn" : "acc";
  const label = d.type === "P&ID" ? "Number resolved" : d.type === "Datasheet" ? "Issued for Operation" : s.replace("Issued For", "Issued for");
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}
let ingRunning = false;
async function runIngestion(){
  if (ingRunning) return; ingRunning = true;
  S.ingested = false; if (S.view !== "dataops") go("dataops");
  const stages = [...document.querySelectorAll("#pipe .stage")]; const log = $("#log");
  stages.forEach(s => { s.classList.remove("done"); s.querySelector("i").style.width = "0"; });
  log.textContent = "";
  const say = l => { log.textContent += l + "\n"; log.scrollTop = log.scrollHeight; };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const bar = (i, p) => { stages[i].querySelector("i").style.width = p + "%"; if (p >= 100) stages[i].classList.add("done"); };
  say("connect  EDMS  /Case 1_ Manufacturing Knowledge Hub/Set_01..08  ok");
  say("connect  AIMS  Maintenance History (All Equipment).xlsx  211 rows  ok");
  say("connect  Historian  " + TAGS.reduce((n, t) => n + ASSETS[t].tags.length, 0) + " live tags  ok"); bar(0, 100); await wait(250);
  const docs = DOCS;
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (i % 3 === 0 || d.tag === "GA-1201A") say(`parse    ${(d.docNo || d.title).padEnd(24)} ${d.type === "P&ID" ? "image → drawing tags" : d.text.length + " chars"}`);
    bar(1, (i + 1) / docs.length * 100); if (i % 4 === 0) await wait(22);
  }
  for (let i = 0; i < docs.length; i++) {
    const d = docs[i];
    if (d.tag === "GA-1201A" || i % 9 === 0) say(`meta     ${(d.docNo || "-").padEnd(24)} rev ${String(d.rev ?? "-").padEnd(2)} ${(d.status || "").padEnd(22)} ${d.approver ? "approver " + d.approver : ""}`);
    bar(2, (i + 1) / docs.length * 100); if (i % 6 === 0) await wait(18);
  }
  for (let i = 0; i < TAGS.length; i++) {
    const t = TAGS[i]; const inst = new Set(); DOCS.filter(d => d.tag === t).forEach(d => instrTags(d.text, t).forEach(x => inst.add(x)));
    say(`link     ${t.padEnd(9)} ${DOCS.filter(d => d.tag === t).length} docs · ${WOS.filter(w => w.tag === t).length} WOs · ${inst.size} instrument tags`);
    bar(3, (i + 1) / TAGS.length * 100); await wait(90);
  }
  for (let i = 0; i < QUALITY.length; i++) { say(`validate ${QUALITY[i].sev.toUpperCase().padEnd(5)} ${QUALITY[i].t}`); bar(4, (i + 1) / QUALITY.length * 100); await wait(110); }
  buildIndex(); bar(5, 100);
  say(`index    ${CHUNKS.length} passages · ${DF.size} terms · BM25 + tag boosting ready`);
  S.ingested = true; ingRunning = false; updHeader();
}
async function ingestFile(f){
  const log = $("#log"); const say = l => { if (log) { log.textContent += l + "\n"; log.scrollTop = log.scrollHeight; } };
  say(`upload   ${f.name} (${Math.round(f.size / 1024)} KB)`);
  let text = "";
  try {
    if (/\.pdf$/i.test(f.name)) {
      say("parse    loading PDF parser…");
      await loadPdfJs();
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data: buf}).promise;
      for (let p = 1; p <= Math.min(pdf.numPages, 30); p++) { const pg = await pdf.getPage(p); const tc = await pg.getTextContent(); text += tc.items.map(x => x.str).join(" ") + "\n"; }
      say(`parse    ${pdf.numPages} page(s), ${text.length} chars`);
    } else { text = await f.text(); say(`parse    ${text.length} chars`); }
  } catch (e) { say("error    could not read this file: " + (e && e.message || e)); toast("Could not read that file. Try a text-based PDF or a .txt file."); return; }
  text = text.replace(/\s+/g, " ").trim();
  if (!text) { say("warn     no text layer found (scanned image?). OCR would run here."); return; }
  const tag = (text.toUpperCase().match(/\b[A-Z]{2}-\d{4}[A-Z]?\b/g) || []).find(x => ASSETS[x]) || null;
  const docNo = (text.match(/\b(?:TJC-[A-Z0-9-]+|OPL-[A-Z0-9-]+)\b/) || [null])[0];
  const rev = (text.match(/\bREV(?:ISION)?[:.\s]+([A-Z0-9]{1,3})\b/i) || [null, null])[1];
  const id = docNo || ("UPL-" + (EXTRA.length + 1));
  const d = {id, docNo, tag, type: "Uploaded", title: f.name.replace(/\.[^.]+$/, ""), rev, status: "Uploaded · pending review", approver: null, path: "uploaded/" + f.name, text: text.slice(0, 20000)};
  EXTRA.push(d); byDoc[id] = d;
  say(`meta     doc no ${docNo || "not found"} · rev ${rev || "not found"} · asset ${tag || "not detected"} · ${tag ? instrTags(text, tag).length : 0} instrument tags`);
  say("validate status set to Pending review: uploaded files are cited with a warning until approved");
  buildIndex(); updHeader();
  say(`index    ${CHUNKS.length} passages. Ask about it now.`);
  toast(`${f.name} ingested and searchable`);
}
let pdfLoading;
function loadPdfJs(){
  if (window.pdfjsLib) return Promise.resolve();
  const base = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  const add = src => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("PDF parser unavailable")); document.head.append(s); });
  pdfLoading = pdfLoading || add(base + "pdf.worker.min.js").then(() => add(base + "pdf.min.js")).then(() => { pdfjsLib.GlobalWorkerOptions.workerSrc = base + "pdf.worker.min.js"; });
  return pdfLoading;
}
function graph(t){
  const W = 640, H = 430, cx = W / 2, cy = H / 2;
  const docs = DOCS.filter(d => d.tag === t);
  const wos = WOS.filter(w => w.tag === t).sort((a, b) => a.date.localeCompare(b.date));
  const inst = new Set(); docs.forEach(d => instrTags(d.text, t).forEach(x => inst.add(x)));
  const instArr = [...inst].slice(0, 22);
  const P = (r, i, n, off = 0) => [cx + r * Math.cos(2 * Math.PI * i / n + off) * 1.35, cy + r * Math.sin(2 * Math.PI * i / n + off)];
  const dN = docs.map((d, i) => ({d, p: P(85, i, docs.length, -Math.PI / 2)}));
  const iN = instArr.map((x, i) => ({x, p: P(140, i, instArr.length, .15)}));
  const wN = wos.map((w, i) => ({w, p: P(190, i, wos.length, -Math.PI / 2 + .07)}));
  let e = "";
  for (const n of dN) e += `<line x1="${cx}" y1="${cy}" x2="${n.p[0]}" y2="${n.p[1]}" stroke="var(--accent)" stroke-opacity=".35"/>`;
  for (const n of iN) for (const dn of dN) if (dn.d.text.includes(n.x)) e += `<line x1="${dn.p[0]}" y1="${dn.p[1]}" x2="${n.p[0]}" y2="${n.p[1]}" stroke="var(--ok)" stroke-opacity=".18"/>`;
  for (const n of wN) { const txt = woText(n.w); const hit = iN.find(i => txt.includes(i.x)); const tgt = hit ? hit.p : [cx, cy]; e += `<line x1="${tgt[0]}" y1="${tgt[1]}" x2="${n.p[0]}" y2="${n.p[1]}" stroke="${n.w.type === "Corrective" ? "var(--crit)" : "var(--muted)"}" stroke-opacity="${n.w.type === "Corrective" ? .5 : .15}"/>`; }
  let nodes = "";
  for (const n of wN) { const c = n.w.type === "Corrective" || n.w.type === "Overhaul"; nodes += `<circle cx="${n.p[0]}" cy="${n.p[1]}" r="${c ? 6 : 3.5}" fill="${c ? "var(--crit)" : "var(--muted)"}" data-open="${n.w.wo}" style="cursor:pointer"><title>${n.w.wo} ${n.w.date} ${esc(n.w.problem)}</title></circle>`; }
  for (const n of iN) nodes += `<circle cx="${n.p[0]}" cy="${n.p[1]}" r="4.5" fill="var(--ok)"><title>${n.x}</title></circle><text class="gl" x="${n.p[0]}" y="${n.p[1] - 7}" text-anchor="middle">${n.x}</text>`;
  for (const n of dN) nodes += `<rect x="${n.p[0] - 6}" y="${n.p[1] - 6}" width="12" height="12" rx="2" fill="var(--accent)" data-open="${esc(n.d.id)}" style="cursor:pointer"><title>${esc(n.d.id)} · ${esc(n.d.title)}</title></rect>`;
  nodes += `<circle cx="${cx}" cy="${cy}" r="24" fill="var(--ink)"/><text x="${cx}" y="${cy + 4}" text-anchor="middle" style="font:600 11px var(--f-mono);fill:var(--bg)">${t}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Knowledge graph for ${t}">${e}${nodes}
    <text class="gl" x="10" y="18">${docs.length} documents · ${instArr.length} instrument tags · ${wos.length} work orders (${wos.filter(w => w.type === "Corrective").length} failures)</text></svg>`;
}

/* ---------------- views: ASK ---------------- */
const SUGG = [
  "GA-1201A vibration is at 5.3 mm/s and rising. What should I check first, and how close are we to a trip?",
  "What happens when VSHH-1201 trips GA-1201A?",
  "What are the alignment targets for GA-1201A and when do I do a hot check?",
  "What seal flush differential pressure is needed before starting GA-1201A?",
  "Which gasket and box-up failures have we had across the plant?"
];
// Verified answers for the scripted questions (used when generative AI is unavailable)
const CURATED = {
  [SUGG[0]]: {answer:"Treat this as a developing bearing or alignment fault, not a nuisance alarm. Vibration is 5.3 mm/s against a 4.5 mm/s alarm and a 7.1 mm/s trip [LIVE-GA-1201A][OPL-GA-1201A-07], and it has risen far more than the 1 mm/s-per-week threshold that calls for a planned bearing inspection [OPL-GA-1201A-07]. The same pattern preceded the Feb 2025 trip, which was traced to angular misalignment after foundation settlement [WO-240003].",
    steps:["Correlate VT-1201 with TT-1201 bearing temperature and check whether the 1x running-speed component dominates; escalate to the reliability engineer if it does [OPL-GA-1201A-07]","Check the oil bath sits at the middle of the sight glass with ISO VG 68, since over- or under-fill also heats the bearing [OPL-GA-1201A-02]","Prepare a controlled changeover to GA-1201B. At 7.1 mm/s (1oo2) the safety PLC trips the motor, closes XV-1201, opens FV-1201 and auto-starts GA-1201B [TJC-LLD-IL-GA-1201A]","Once on standby, laser-check alignment to < 0.05 mm/100 mm angular and < 0.05 mm offset, then do a hot check after about 2 h at temperature [OPL-GA-1201A-03][OPL-GA-1201A-05]","Inspect the baseplate grout and DE bearing 7310 BECBM, which failed after the last misalignment episode [WO-240013][WO-240004]"],
    confidence:88, reason:"Thresholds come from the approved OPL and Rev 3 interlock matrix, and three past work orders on this tag show the same failure path.", cautions:[]},
  [SUGG[1]]: {answer:"VSHH-1201 trips on bearing vibration above 7.1 mm/s RMS with 1oo2 voting [TJC-LLD-IL-GA-1201A]. The safety PLC then trips the GA-1201A motor, closes discharge valve XV-1201, opens the min-flow valve FV-1201, annunciates on the DCS and auto-starts standby pump GA-1201B [TJC-LLD-IL-GA-1201A]. The trip is latched and needs a manual reset once the cause has cleared and permissives are healthy [TJC-LLD-IL-GA-1201A].",
    steps:["Before restart, all permissives must be true: suction valve open (ZSO-1201), seal flush dP above 1.5 bar (PDI-1201), min-flow valve open (ZSO-1202) and DCS reset done [TJC-LLD-IL-GA-1201A]","The last real VSHH-1201 trip, at 7.4 mm/s, was caused by angular misalignment of 0.12 mm/100 mm [WO-240003]"],
    confidence:92, reason:"Directly stated in the Rev 3 cause and effect matrix for SEQ-1201 (SIL 1).", cautions:["Trip set points in the source matrix are marked as dummy training values. Confirm against the live SIS configuration."]},
  [SUGG[2]]: {answer:"Target angular misalignment below 0.05 mm/100 mm and offset below 0.05 mm, measured with a laser kit at 0, 90, 180 and 270 degrees and corrected by shimming the motor feet [OPL-GA-1201A-03]. For hexane service, the cold alignment must include the thermal-growth offset, then a hot check is done on the coupling after about 2 hours at temperature [OPL-GA-1201A-05].",
    steps:["Log both cold and hot readings in the machine history [OPL-GA-1201A-05]","If vibration trips repeat, adjust the thermal-growth compensation [OPL-GA-1201A-05]","Misalignment is the top root cause of GA-1201A vibration trips and premature bearing and seal failures [OPL-GA-1201A-03][WO-240003][WO-240007]"],
    confidence:86, reason:"Stated in two approved OPLs and confirmed by maintenance history.", cautions:["In OPL-GA-1201A-03 the acceptance column is shifted by one row, so read targets from the Action column."]},
  [SUGG[3]]: {answer:"Seal flush differential pressure across orifice RO-1201 must be above 1.5 bar before start, and normally reads 1.5 to 2.5 bar on PDI-1201 [OPL-GA-1201A-01]. It is also a hard start permissive in the SEQ-1201 logic [TJC-LLD-IL-GA-1201A]. Low flush lets the seal faces overheat and leak hexane to atmosphere, which is what happened in Aug 2025 when RO-1201 was partly plugged [WO-240002].",
    steps:["If dP is low, isolate and inspect RO-1201 for plugging by polymer or dirt [OPL-GA-1201A-01]","Rule out a false reading: PDI-1201 impulse lines have fouled with hexane residue before [WO-240008]","Confirm the Plan 62 quench (N2 or steam) is lined up to the outboard side [OPL-GA-1201A-01]"],
    confidence:90, reason:"Consistent across the OPL, the interlock permissive and two work orders.", cautions:[]}
};
function renderAsk(v){
  const a = ASSETS[S.asset];
  v.innerHTML = `
  <div class="cardh" style="margin:0"><h2>Ask the plant</h2><span class="sub">Key question 2: trusted answers with sources, revision, approval status and confidence</span></div>
  <div class="asklay">
    <div style="display:grid;gap:16px;min-width:0">
      <div class="card">
        <form class="askbox" id="askForm"><textarea id="q" rows="2" placeholder="Ask about any asset, procedure, trip or past failure…" aria-label="Question"></textarea><button class="btn primary" id="askBtn" type="submit">Ask</button></form>
        <div class="ctxrow"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="ctxOn" checked> Use live asset context</label>
          <select id="ctxAsset" aria-label="Context asset">${TAGS.map(t => `<option ${t === S.asset ? "selected" : ""}>${t}</option>`).join("")}</select>
          <span class="muted" id="ctxDesc">${esc(a.name)} · ${a.tags.slice(0, 2).map(g => `${g.id} ${fmtV(g)} ${g.u}`).join(" · ")}</span></div>
      </div>
      <div id="qa" class="qa"></div>
    </div>
    <aside style="display:grid;gap:16px">
      <div class="card"><div class="cardh"><h3>Try asking</h3></div><div class="sugg">${SUGG.map((s, i) => `<button data-q="${i}">${esc(s)}</button>`).join("")}</div></div>
      <div class="card small"><div class="cardh"><h3>How answers are checked</h3></div>
        <div style="display:grid;gap:6px;color:var(--ink2)">
          <div>1. Hybrid retrieval over ${CHUNKS.length} passages, boosted for the asset in context.</div>
          <div>2. The model may only use the numbered sources and must cite each claim.</div>
          <div>3. Confidence blends the model's own rating with evidence strength: number and type of sources, approval status, and known data gaps.</div>
          <div>4. Any cited document with an open data-quality finding shows a caution.</div>
        </div></div>
    </aside>
  </div>`;
  $("#askForm").onsubmit = e => { e.preventDefault(); const q = $("#q").value.trim(); if (q) ask(q); };
  $("#q").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#askForm").requestSubmit(); } };
  $("#ctxAsset").onchange = e => { S.asset = e.target.value; renderAsk(v); };
  v.querySelectorAll("[data-q]").forEach(b => b.onclick = () => ask(SUGG[+b.dataset.q]));
  renderQA();
}
function renderQA(){
  const box = $("#qa"); if (!box) return;
  box.innerHTML = S.qa.slice().reverse().map((x, i) => qaCard(x, S.qa.length - 1 - i)).join("");
}
function srcMeta(ref){
  if (ref.startsWith("LIVE-")) return {kind:"Live twin", id: ref, title: "Digital twin snapshot · " + ref.slice(5), badge: `<span class="badge acc">Live · ${new Date().toLocaleTimeString("en-GB", {hour:"2-digit", minute:"2-digit"})}</span>`, extra: "Historian"};
  if (woById[ref]) { const w = woById[ref]; return {kind:"Work order", id: ref, title: `${w.tag} · ${w.problem}`, badge: `<span class="badge ${w.appr ? "ok" : "warn"}">${w.appr ? "Completed · approved" : "Completed · approver not recorded"}</span>`, extra: `${fmtDate(w.date)} · ${w.type}`}; }
  const l = LESSONS.find(x => x.id === ref); if (l) return {kind:"Lesson learned", id: ref, title: `${l.tag} · ${l.symptom}`, badge: `<span class="badge warn">Captured · not yet reviewed</span>`, extra: l.date};
  const d = byDoc[ref]; if (!d) return {kind:"Source", id: ref, title: ref, badge: "", extra: ""};
  return {kind: d.type, id: ref, title: d.title, badge: statusBadge(d), extra: `Rev ${d.rev ?? "—"}${d.approver ? " · approved by " + d.approver : ""}${d.date ? " · " + d.date.replace(/^\w+, /, "") : ""}`};
}
function hl(text, qset){
  let t = esc(text);
  const ws = qset.filter(w => w.length > 2).sort((a, b) => b.length - a.length).slice(0, 14).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!ws.length) return t;
  return t.replace(new RegExp("\\b(" + ws.join("|") + ")", "gi"), "<mark>$1</mark>");
}
function confColor(c){ return c >= 80 ? "var(--ok)" : c >= 55 ? "var(--warn)" : "var(--crit)"; }
function qaCard(x, idx){
  if (x.pending) return `<div class="card"><div class="q">${esc(x.q)}</div>
    <div class="retr" style="margin:8px 0">${x.trace.map(l => `<span>${esc(l)}</span>`).join("")}</div>
    <div class="thinking"><span class="spin"></span><span>${esc(x.status || "Thinking…")}</span>${x.stream ? `<span class="mono small">${x.stream} chars</span>` : ""}<button class="btn sm" data-stop="1">Stop</button></div></div>`;
  const numOf = ref => x.sources.findIndex(s => s.ref === ref) + 1;
  const cite = s => esc(s).replace(/\[([A-Za-z0-9#\-]+)\]/g, (m, r) => { const n = numOf(r); return n ? `<button class="cite" data-card="${idx}" data-n="${n}" title="${esc(r)}">${n}</button>` : ""; });
  const lvl = x.conf >= 80 ? "High" : x.conf >= 55 ? "Medium" : "Low";
  return `<div class="card" id="qa${idx}">
    <div class="cardh" style="margin-bottom:6px"><span class="eyebrow">${x.mode}</span><div class="right">${x.focus ? `<span class="badge acc mono">${x.focus}</span>` : ""}</div></div>
    <div class="q">${esc(x.q)}</div>
    ${x.fixes && x.fixes.length ? `<div class="small muted" style="margin-top:4px">Read as: ${x.fixes.map(esc).join(" · ")}</div>` : ""}
    <div style="display:grid;gap:12px;margin-top:10px">
      ${x.clarify ? `<div class="clarify"><b>Which one do you mean?</b> ${esc(x.clarify)}</div>` : ""}
      ${x.wantsPic && x.pics && x.pics.length ? picStrip(x.pics) : ""}
      ${x.answer ? `<div class="ans">${cite(x.answer)}</div>` : ""}
      ${x.steps && x.steps.length ? `<div><div class="eyebrow" style="margin-bottom:4px">Recommended steps</div><ol class="stepsol">${x.steps.map(s => `<li>${cite(s)}</li>`).join("")}</ol></div>` : ""}
      ${x.cautions.length ? `<div class="caution"><b>Check before acting</b>${x.cautions.map(c => `<div>${esc(c)}</div>`).join("")}</div>` : ""}
      ${!x.wantsPic && x.pics && x.pics.length ? picStrip(x.pics) : ""}
      <div class="conf"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>Confidence ${x.conf}% · ${lvl}</b><span class="small muted">${esc(x.reason || "")}</span></div>
        <div class="meter"><i style="width:${x.conf}%;background:${confColor(x.conf)}"></i></div>
        <div class="factors">${x.factors.map(f => `<span class="badge ${f[1]}">${esc(f[0])}</span>`).join("")}</div></div>
      <div><div class="eyebrow" style="margin-bottom:6px">Sources (${x.sources.length})</div>
      <div class="srclist">${x.sources.map((s, i) => { const m = srcMeta(s.ref); return `<div class="srcitem" data-open="${esc(s.ref)}" data-hl="${idx}" id="src${idx}-${i + 1}">
        <div class="hd"><span class="n">${i + 1}</span><span class="mono small">${esc(m.id)}</span><span class="small muted">${esc(m.kind)}</span>${m.badge}</div>
        <div class="small"><b>${esc(m.title)}</b> <span class="muted">${esc(m.extra)}</span></div>
        <div class="snip">${hl(s.text, x.qset)}</div></div>`; }).join("")}</div></div>
    </div></div>`;
}
function picStrip(refs){
  return `<div><div class="eyebrow" style="margin-bottom:6px">Pictures from the cited documents</div><div class="pics">${refs.map(r => `<button class="pic" data-open="${esc(r)}" title="Open ${esc(r)}"><img src="${esc(imgOf(r))}" alt="${esc(byDoc[r]?.title || r)}" loading="lazy"><span class="mono">${esc(r)}</span></button>`).join("")}</div></div>`;
}
document.addEventListener("click", e => {
  const c = e.target.closest(".cite");
  if (c) { const el = $(`#src${c.dataset.card}-${c.dataset.n}`); if (el) { el.scrollIntoView({behavior:"smooth", block:"center"}); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1400); } return; }
  if (e.target.closest("[data-stop]")) { S.ctl?.abort(); return; }
  const o = e.target.closest("[data-open]"); if (o) { openSource(o.dataset.open, o.dataset.hl != null ? S.qa[+o.dataset.hl]?.qset : null); return; }
  const g = e.target.closest("[data-go]"); if (g) { if (g.dataset.go === "asset" && S.tourStep === 1) S.tourStep = 2; go(g.dataset.go, {asset: g.dataset.asset}); return; }
});
function evidence(refs, cautions, hasLive){
  const kinds = new Set(); let approved = 0, docs = 0;
  for (const r of refs) {
    if (r.startsWith("LIVE-")) { kinds.add("live"); continue; }
    if (woById[r]) { kinds.add("history"); continue; }
    if (LESSONS.find(l => l.id === r)) { kinds.add("lesson"); continue; }
    const d = byDoc[r]; if (!d) continue;
    if (d.type === "Derived" || d.type === "Asset summary") { kinds.add("history"); continue; }
    docs++;
    kinds.add(d.type === "OPL" ? "procedure" : d.type === "Uploaded" ? "uploaded" : "design");
    if (/Approved|Operation|Issued/.test(d.status || "")) approved++;
  }
  let s = Math.min(36, refs.length * 9) + Math.min(36, kinds.size * 11) + (docs ? (approved / docs) * 20 : 8) - cautions.length * 5 - (kinds.has("uploaded") ? 10 : 0);
  s = Math.max(10, Math.min(96, Math.round(s)));
  const f = [[`${refs.length} sources cited`, refs.length >= 3 ? "ok" : "warn"]];
  if (kinds.has("design")) f.push(["Design basis (datasheet / interlock)", "ok"]);
  if (kinds.has("procedure")) f.push(["Approved procedure (OPL)", "ok"]);
  if (kinds.has("history")) f.push(["Maintenance history", "ok"]);
  if (kinds.has("live")) f.push(["Matches live data", "ok"]);
  if (kinds.has("lesson")) f.push(["Unreviewed lesson used", "warn"]);
  if (kinds.has("uploaded")) f.push(["Unapproved upload used", "warn"]);
  if (docs && approved < docs) f.push([`${docs - approved} source(s) not approved`, "warn"]);
  if (cautions.length) f.push([`${cautions.length} open data finding(s)`, "warn"]);
  return {score: s, factors: f};
}
async function ask(q){
  if (S.busy) return;
  if (S.view !== "ask") go("ask");
  const useCtx = $("#ctxOn") ? $("#ctxOn").checked : true;
  const ctxTag = useCtx ? S.asset : null;
  const fx = fixQuery(q);
  const {hits, focus, qset} = search(fx.q, ctxTag, 10);
  const live = focus ? liveChunk(focus) : null;
  let pool = (live ? [{c: live, s: 99}] : []).concat(hits);
  // "show me the P&ID / drawing" questions: make sure the right document (and its picture) is in the pool
  const wantsPic = WANTS_PIC.test(fx.q);
  if (wantsPic && focus) {
    const types = PIC_TYPES.filter(([re]) => re.test(fx.q)).map(p => p[1]);
    for (const ty of (types.length ? types : ["P&ID", "GA Drawing"]).reverse()) {
      const d = DOCS.find(x => x.tag === focus && x.type === ty); if (!d) continue;
      const i = pool.findIndex(h => h.c.ref === d.id);
      const h = i >= 0 ? pool.splice(i, 1)[0] : {c: CHUNKS.find(c => c.ref === d.id), s: 98};
      if (h.c) pool.splice(live ? 1 : 0, 0, h);
    }
  }
  const x = {q, pending: true, trace: [
    `retrieve  ${CHUNKS.length} passages → ${hits.length} hits${focus ? ` · boosted ${focus}` : ""}`,
    `top       ${hits.slice(0, 4).map(h => h.c.ref).join(", ")}`,
    live ? `context   live snapshot ${live.ref} attached` : `context   none`], qset, fixes: fx.notes};
  S.qa.push(x); S.busy = true; renderQA(); $("#q") && ($("#q").value = "");
  const cur = CURATED[q];
  let out = null, mode = "";
  if (S.ai) {
    x.status = "Asking Claude with " + pool.length + " numbered sources…"; renderQA();
    const labels = pool.map((h, i) => ({lab: "S" + (i + 1), ref: h.c.ref, text: h.c.text}));
    const prompt = `You are the Knowledge Hub assistant for the LLDPE unit of SDK Polyolefin. A plant engineer asked a question. Answer ONLY from the numbered sources below. Cite every factual claim with source labels in square brackets, like [S2]. Never invent set points, part numbers or dates. If the sources do not answer the question, say what is missing and give low confidence. Answer in the same language as the question (for example Indonesian or English), keeping tags, units and document numbers exactly as in the sources. Never suggest bypassing or defeating an interlock. Prefer approved procedures and interlock matrices over free-text history, and use work orders as evidence of what happened before. Sources marked "Derived" are summaries built from work orders, not approved documents: present them as past experience.
If the question is ambiguous (it could mean more than one asset, instrument or document, and the asset in context does not settle it), do not guess: put a short clarifying question in "clarify" listing the options, answer only the part that is certain, and give confidence below 50.
The page shows the picture of every cited document next to your answer. If the user asks to see a drawing, P&ID or document, cite that document and say briefly what it shows; never say you cannot show images.

Reply with only JSON of this shape:
{"answer": "2-4 plain sentences with [S#] citations", "steps": ["ordered action with [S#] citations", "..."], "confidence": 0-100, "confidence_reason": "one sentence", "cautions": ["anything that conflicts, is unapproved, or should be verified"], "clarify": "a clarifying question, or empty string"}
Use 0-6 steps (only if the question asks what to do or how). Use 0-3 cautions.

Question: ${q}${fx.notes.length ? `\n(The search read the question as: "${fx.q}". Typos and tags were corrected automatically.)` : ""}
${focus ? `Asset in context: ${focus} ${ASSETS[focus].name}` : ""}

Sources:
${labels.map(l => { const m = srcMeta(l.ref); return `[${l.lab}] ${m.kind} ${l.ref} | ${m.extra.replace(/<[^>]+>/g, "")} | ${(byDoc[l.ref]?.status) || ""}\n${l.text.slice(0, 1100)}`; }).join("\n\n")}`;
    S.ctl = new AbortController();
    try {
      const r = await S.ai.json(prompt, {signal: S.ctl.signal, onText: ({text}) => { x.status = "Writing a cited answer…"; x.stream = text.length; renderQA(); }});
      const map = Object.fromEntries(labels.map(l => [l.lab, l.ref]));
      const conv = s => String(s || "").replace(/\[(S\d+)\]/g, (m, k) => map[k] ? `[${map[k]}]` : "").replace(/\]\s*,\s*\[/g, "][");
      out = {answer: conv(r.answer), steps: (Array.isArray(r.steps) ? r.steps : []).map(conv).filter(Boolean), confidence: Math.max(0, Math.min(100, +r.confidence || 50)), reason: String(r.confidence_reason || ""), cautions: (Array.isArray(r.cautions) ? r.cautions : []).map(String), clarify: String(r.clarify || "")};
      mode = "Generated by Claude from retrieved sources";
    } catch (e) {
      if (e && e.code === "cancelled") { S.qa.pop(); S.busy = false; renderQA(); return; }
      if (e && ["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(e.code)) { S.ai = null; S.aiState = "offline"; setAIChip(); }
      out = null; x.aiError = e && e.code;
    }
  }
  if (!out && cur) { out = {answer: cur.answer, steps: cur.steps, confidence: cur.confidence, reason: cur.reason, cautions: cur.cautions}; mode = "Verified demo answer · offline mode"; }
  if (!out) {
    out = {answer: "", steps: [], confidence: 0, reason: "No generative model in this view, so here are the best-matching passages, ranked.", cautions: []};
    mode = "Retrieval only · ranked passages";
  }
  // collect cited refs in order of appearance
  const text = [out.answer, ...out.steps].join(" ");
  let refs = [...new Set([...text.matchAll(/\[([A-Za-z0-9#\-]+)\]/g)].map(m => m[1]))];
  if (!refs.length) refs = [...new Set(pool.map(h => h.c.ref))].slice(0, 6);
  if (wantsPic) for (const h of pool) if (imgOf(h.c.ref) && byDoc[h.c.ref]?.tag === focus && !refs.includes(h.c.ref) && refs.length < 8) { refs.push(h.c.ref); break; }
  const passage = ref => { if (ref.startsWith("LIVE-")) return (live && live.ref === ref ? live : liveChunk(ref.slice(5))).text; const h = pool.find(h => h.c.ref === ref); if (h) return h.c.text; const best = search(q + " " + ref, focus, 60).hits.find(h => h.c.ref === ref); return best ? best.c.text : (woById[ref] ? woText(woById[ref]) : (byDoc[ref]?.text || "").slice(0, 600)); };
  const sources = refs.map(ref => ({ref, text: passage(ref)}));
  const docCaut = cautionsFor(refs).map(qf => qf.t + ".");
  const cautions = [...new Set([...out.cautions, ...docCaut])];
  const ev = evidence(refs, docCaut, !!live);
  const conf = out.answer ? Math.round(out.confidence * .5 + ev.score * .5) : Math.min(45, ev.score);
  const pics = [...new Set(refs.filter(imgOf))].slice(0, wantsPic ? 6 : 4);
  Object.assign(x, {pending: false, answer: out.answer, steps: out.steps, sources, cautions, conf, reason: out.reason, factors: ev.factors, mode, focus, pics, wantsPic, clarify: out.clarify || ""});
  S.busy = false; renderQA();
}

/* ---------------- views: ASSET 360 ---------------- */
function renderAsset(v){
  const t = S.asset, a = ASSETS[t];
  const docs = DOCS.filter(d => d.tag === t);
  const wos = WOS.filter(w => w.tag === t).sort((x, y) => y.date.localeCompare(x.date));
  const fails = wos.filter(w => w.type === "Corrective");
  const dt = fails.reduce((n, w) => n + (w.dt || 0), 0), cost = wos.reduce((n, w) => n + (w.cost || 0), 0);
  const miss = wos.filter(w => w.dt == null).length;
  const il = docs.find(d => d.type === "Interlock C&E");
  const trips = il ? [...il.text.matchAll(/T\d (.+?) ([A-Z]{2,5}-\d{3,5}(?:-\d)?) ([<>] ?[\d.]+ ?[\w%/°]*(?: [\w%/°]+)?(?: for \d+ s)?|MPR pickup|MPR relay pickup|Manual|ESD signal|skin TC > \d+ degC|set \d+ barg|SP \d+ degC) (1oo1|1oo2|2oo3|control|alarm|mech)/g)].map(m => ({d: m[1], tag: m[2], sp: m[3], vote: m[4]})) : [];
  const perm = il ? [...il.text.matchAll(/(\d) ([A-Z][^#=]+?) ((?:[A-Z]{2,4}-\d{3,5})|DCS reset|DVC6200|HV-6701|FSL upstream|LG gearbox|lockout)(?= \d |\s*=>)/g)].map(m => ({d: m[2].trim(), sig: m[3]})) : [];
  const vib = a.tags[0];
  v.innerHTML = `
  <div class="card">
    <div class="assethead">
      <div style="display:grid;gap:4px;min-width:200px">
        <select id="aSel" aria-label="Asset" style="width:max-content">${TAGS.map(x => `<option ${x === t ? "selected" : ""}>${x}</option>`).join("")}</select>
        <div class="tg">${t}</div><div style="font-family:var(--f-disp);font-size:20px;font-weight:600">${a.name}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="badge ${a.crit === "HIGH CRITICAL" ? "crit" : "acc"}">${esc(a.crit || "")}</span><span class="badge">${a.sil}</span><span class="badge mono">${a.seq}</span>${(() => { const s = assetState(t); return `<span class="badge ${s === "ok" ? "ok" : s}">${s === "ok" ? "Normal" : "In alarm"}</span>`; })()}</div>
      </div>
      <div class="facts">
        <div><span>Type</span>${esc(a.kind)}</div>
        <div><span>Area</span>${esc(a.area || "—")}</div>
        <div><span>Functional location</span><b class="mono">${esc(a.floc || "—")}</b></div>
        <div><span>Location</span>Grid ${esc(a.grid || "—")} · ${esc(a.elev || "—")}</div>
        <div style="grid-column:1/-1"><span>Service</span>${esc(a.service || "—")}</div>
        ${a.standby ? `<div><span>Standby</span>${esc(a.standby)}</div>` : ""}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-self:center">
        <button class="btn primary" id="askAbout">Ask about ${t}</button>
        <button class="btn" data-go="memory" data-asset="${t}">Failure memory</button>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="cardh"><h3>Digital twin · live</h3><span class="sub">7-day trend with alarm (amber) and trip (red) limits from the source documents</span></div>
    <div class="twin" id="twin">${a.tags.map(g => twinTile(t, g)).join("")}</div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="cardh"><h3>Protection logic</h3><span class="sub">${a.seq} · from <span class="tagref" data-open="${il ? il.id : ""}">${il ? il.id : "—"}</span> Rev ${il ? il.rev : "—"}</span></div>
      <div class="scroll"><table><thead><tr><th>Initiator</th><th>Tag</th><th>Set point</th><th>Vote</th><th>Live</th></tr></thead><tbody>
      ${trips.map(r => { const g = a.tags.find(g => g.tripTag === r.tag || (g.alarm && r.tag.endsWith(g.id.split("-")[1]) && r.tag.startsWith("PDAH"))); return `<tr><td>${esc(r.d)}</td><td class="mono">${esc(r.tag)}</td><td class="mono">${esc(r.sp)}</td><td class="mono">${esc(r.vote)}</td><td class="mono tnum">${g ? `<span class="badge ${tagState(g) === "ok" ? "ok" : tagState(g)}" data-live="${t}:${g.id}:u">${fmtV(g)} ${g.u}</span>` : "—"}</td></tr>`; }).join("") || `<tr><td colspan="5" class="muted">No trips parsed</td></tr>`}
      </tbody></table></div>
      ${perm.length ? `<div class="eyebrow" style="margin:12px 0 4px">Start permissives (all must be true)</div><div class="small" style="display:grid;gap:3px">${perm.map(p => `<div>${esc(p.d)} <span class="tagref">${esc(p.sig)}</span></div>`).join("")}</div>` : ""}
    </div>
    <div class="card">
      <div class="cardh"><h3>EDMS documents</h3><span class="sub">${docs.length} controlled documents linked to ${t}</span></div>
      <div style="display:grid;gap:0">${docs.map(d => `<div class="finding" style="padding:7px 0;cursor:pointer" data-open="${esc(d.id)}"><div style="display:grid;gap:1px;min-width:0;flex:1"><div><span class="mono small">${esc(d.docNo)}</span> <span class="small muted">${esc(d.type)}</span></div><div class="small">${esc(d.title)}</div></div><div style="text-align:right;display:grid;gap:2px;justify-items:end"><span class="mono small">Rev ${esc(d.rev ?? "—")}</span>${statusBadge(d)}</div></div>`).join("")}</div>
    </div>
  </div>
  <div class="card">
    <div class="cardh"><h3>AIMS maintenance history</h3><span class="sub">${wos.length} work orders · ${fails.length} corrective · ${dt.toFixed(1)} h recorded downtime · ${fmtIDR(cost)} recorded cost${miss ? ` · <span style="color:var(--warn)">${miss} records missing downtime/cost</span>` : ""}</span><div class="right"><button class="btn sm" data-go="memory" data-asset="${t}">Open failure memory</button></div></div>
    <div class="scroll"><table class="wolist"><thead><tr><th>Date</th><th>WO</th><th>Type</th><th>Problem</th><th>Root cause</th><th>Downtime</th></tr></thead><tbody>
    ${wos.slice(0, 12).map(w => `<tr class="click" data-open="${w.wo}"><td class="mono small">${w.date}</td><td class="mono small">${w.wo}</td><td><span class="badge ${w.type === "Corrective" ? "crit" : w.type === "Overhaul" ? "warn" : ""}">${w.type}</span></td><td class="small">${esc(w.problem)}</td><td class="small">${esc(w.cause)}</td><td class="mono small tnum">${w.dt == null ? `<span style="color:var(--warn)">not recorded</span>` : w.dt + " h"}</td></tr>`).join("")}
    </tbody></table></div>${wos.length > 12 ? `<div class="small muted" style="margin-top:6px">Showing 12 most recent of ${wos.length}.</div>` : ""}
  </div>
  <div class="card">
    <div class="cardh"><h3>P&amp;ID</h3><span class="sub">TJC-LLD-PID-${t.match(/\d{4}/)[0]} · drawing number resolved from datasheet cross-reference (title block shows XXXX). Click to zoom.</span></div>
    <div class="pid" id="pid"><img src="${PIDS[t]}" alt="P&ID for ${t}"></div>
  </div>`;
  $("#aSel").onchange = e => { S.asset = e.target.value; S.fmAsset = e.target.value; renderAsset(v); };
  $("#askAbout").onclick = () => { go("ask"); if (t === "GA-1201A") ask(SUGG[0]); else $("#q").value = `${t}: what are the most common failures and what prevents them?`; };
  $("#pid img").onclick = () => $("#pid").classList.toggle("zoom");
}
function twinTile(t, g){
  const st = tagState(g); const d3 = g.v - g.hist[HOURS - 72];
  const trend = Math.abs(d3) > g.n * 4 ? `${d3 > 0 ? "▲" : "▼"} ${Math.abs(d3).toFixed(g.dp || 1)} in 3 d` : "stable";
  return `<div class="tt ${st === "ok" ? "" : st}" data-tile="${t}:${g.id}">
    <div class="row1"><span class="mono small"><b>${g.id}</b></span><span class="badge ${st === "ok" ? "ok" : st}">${st === "ok" ? "Normal" : st === "warn" ? "Alarm" : "Trip"}</span></div>
    <div class="desc">${esc(g.d)}</div>
    <div class="val tnum"><span data-live="${t}:${g.id}:v">${fmtV(g)}</span><small>${g.u}</small></div>
    ${spark(g)}
    <div class="mg"><span>${margin(g)}</span><span>${trend}</span></div>
    <div class="small muted">Limit source <span class="tagref" data-open="${g.alarmSrc || g.src}">${g.alarmSrc || g.src}</span></div>
  </div>`;
}

/* ---------------- views: FAILURE MEMORY ---------------- */
const THEMES = [
  {k:"Misalignment & foundation", re:/misalign|alignment|grout|foundation|coupling/i, c:"#C0392B"},
  {k:"Bearings", re:/bearing/i, c:"#8E5A2B"},
  {k:"Seals, packing & gaskets", re:/seal|packing|gasket|weep|leak/i, c:"#B8860B"},
  {k:"Fouling & plugging", re:/foul|plug|fines|deposit|scale/i, c:"#2E7D6B"},
  {k:"Instrument & control", re:/calibrat|drift|tun|analy[sz]er|positioner|transmitter|reading|sensor|thermocouple|conductivity/i, c:"#2F6DA3"},
  {k:"Wear & fatigue", re:/worn|wear|erosion|elongation|crack|fractur|spall|end of life|end-of-life|end of run/i, c:"#6B5B95"}
];
const themeOf = w => { const s = w.problem + " " + w.cause; return THEMES.find(t => t.re.test(s)) || {k:"Other", c:"#7A8580"}; };
const PLANTWIDE = [
  {k:"Impulse lines and sensing legs plugged by fines", re:/impulse line|bridle legs plugged|flow element fouled|sample line/i, lesson:"Add impulse-line blow-down to the PM route for hexane and polymer services, and treat erratic dP or level readings as plugging first."},
  {k:"Spiral-wound gaskets unevenly seated or relaxed at box-up", re:/spiral-wound|sw gasket|gasket (relaxed|unevenly)/i, lesson:"Use a controlled bolt-tightening sequence and a hot re-torque on every box-up; attach it to the box-up OPLs."},
  {k:"Control loops poorly tuned after a repair or re-range", re:/tun(ed|ing)/i, lesson:"Make loop re-tuning a mandatory close-out step whenever a transmitter is re-ranged or a final element is repaired."},
  {k:"Analyzer and sensor cells reaching end of life", re:/cell|end of life|end-of-life/i, lesson:"Track analyzer cell age as a spare-part item and replace on age, not on failure, for inerting-critical analyzers."},
  {k:"Packing and seal wear causing process leaks", re:/packing|mechanical seal|carbon seal/i, lesson:"Verify spare grade against the datasheet BOM before installation (see the YD-2301 packing mismatch)."}
];
function renderMemory(v){
  const t = S.fmAsset, a = ASSETS[t];
  const wos = WOS.filter(w => w.tag === t && (w.type === "Corrective" || w.type === "Overhaul")).sort((x, y) => x.date.localeCompare(y.date));
  const lessons = LESSONS.filter(l => l.tag === t);
  const hotLogged = WOS.filter(w => w.tag === t && /hot[- ]check|hot alignment/i.test(w.action + w.cause)).length;
  const counts = {}; wos.forEach(w => { const th = themeOf(w).k; counts[th] = (counts[th] || 0) + 1; });
  const top = Object.entries(counts).sort((x, y) => y[1] - x[1]);
  const opls = DOCS.filter(d => d.tag === t && d.type === "OPL");
  v.innerHTML = `
  <div class="cardh" style="margin:0"><h2>Failure memory</h2><span class="sub">Key question 3: past failures, RCA and lessons turned into recommendations for the problem in front of you</span>
    <div class="right"><select id="fmSel" aria-label="Asset">${TAGS.map(x => `<option ${x === t ? "selected" : ""}>${x}</option>`).join("")}</select></div></div>
  ${t === "GA-1201A" ? `
  <div class="card">
    <div class="cardh"><h3>Recurring pattern on GA-1201A: one root cause, four failures</h3><span class="sub">Linked by the hub from root-cause text in AIMS</span></div>
    <div class="chain">
      <div class="link root"><span class="d">ROOT CAUSE</span><b>Foundation settlement</b><span class="c">Angular misalignment 0.12 mm/100 mm, against a 0.05 target</span></div>
      ${["WO-240003", "WO-240013", "WO-240004", "WO-240007"].map(id => { const w = woById[id]; return `<span class="arrow">→</span><div class="link" data-open="${id}" style="cursor:pointer"><span class="d">${w.date} · ${id}</span><b>${esc(w.problem.replace("GA-1201A ", ""))}</b><span class="c">${esc(w.cause)}</span></div>`; }).join("")}
    </div>
    <div class="small" style="margin-top:10px;color:var(--ink2);max-width:100ch">Each event was fixed locally (re-align, re-grout, new bearing, new coupling element) and the pump came back. ${hotLogged ? "" : `No GA-1201A work order records a hot alignment check, which <span class="tagref" data-open="OPL-GA-1201A-05">OPL-GA-1201A-05</span> now requires for hexane service. `}Today's vibration and bearing temperature rise match the start of this chain.</div>
  </div>
  <div class="grid2">
    <div class="card">
      <div class="cardh"><h3>Recommended actions for today's alarm</h3><span class="sub">Ranked by urgency, each backed by evidence</span></div>
      ${RECS.map((r, i) => `<div class="rec"><span class="no">${i + 1}</span><div style="display:grid;gap:2px"><span class="when" style="color:${r.w === "Now" ? "var(--crit)" : r.w === "This shift" ? "var(--warn)" : "var(--accent)"}">${r.w}</span><span class="ti">${esc(r.t)}</span><span class="why">${esc(r.y)}</span></div><div class="ev">${r.e.map(x => `<span class="tagref" data-open="${x}">${x}</span>`).join("")}</div></div>`).join("")}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" id="woBtn">Draft work order</button><button class="btn" id="lsBtn">Capture a lesson</button></div>
    </div>
    <div class="card">
      <div class="cardh"><h3>What it has cost so far</h3></div>
      <div class="kpis">
        <div class="kpi"><div class="v tnum">4</div><div class="l">Linked failures in 7 months</div></div>
        <div class="kpi"><div class="v tnum">1</div><div class="l">Unplanned trip (VSHH-1201)</div></div>
        <div class="kpi"><div class="v tnum">6.5 h</div><div class="l">Recorded downtime (3 of 4 not recorded)</div></div>
        <div class="kpi"><div class="v tnum">${fmtIDR(12630000)}</div><div class="l">Recorded cost, coupling job only</div></div>
      </div>
      <div class="small muted" style="margin-top:10px">Missing downtime and cost on WO-240003, WO-240013 and WO-240004 is flagged in Data Ops. The true cost is higher.</div>
      <div class="eyebrow" style="margin:14px 0 6px">Related approved procedures</div>
      <div style="display:grid;gap:4px">${opls.map(d => `<div class="small"><span class="tagref" data-open="${d.id}">${d.id}</span> ${esc(d.title)}</div>`).join("")}</div>
    </div>
  </div>` : `
  <div class="grid2">
    <div class="card">
      <div class="cardh"><h3>Failure themes on ${t}</h3><span class="sub">${wos.length} corrective and overhaul work orders, clustered by root cause</span></div>
      ${top.map(([k, n]) => { const th = THEMES.find(x => x.k === k) || {c:"#7A8580"}; const ex = wos.filter(w => themeOf(w).k === k); const last = ex[ex.length - 1];
        const rel = opls.filter(d => toks(d.title).some(w => w.length > 4 && toks(ex.map(e => e.problem + " " + e.cause).join(" ")).includes(w)));
        return `<div class="rec"><span class="no" style="color:${th.c}">${n}</span><div style="display:grid;gap:2px"><span class="ti">${esc(k)}</span><span class="why">Last: ${esc(last.problem)}. Fixed by: ${esc(last.action)}.</span></div><div class="ev">${ex.map(e => `<span class="tagref" data-open="${e.wo}">${e.wo}</span>`).join("")}${rel.map(d => `<span class="tagref" data-open="${d.id}">${d.id}</span>`).join("")}</div></div>`; }).join("")}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn primary" id="askFm">Ask what prevents these</button><button class="btn" id="lsBtn">Capture a lesson</button></div>
    </div>
    <div class="card">
      <div class="cardh"><h3>Related approved procedures</h3></div>
      <div style="display:grid;gap:4px">${opls.map(d => `<div class="small"><span class="tagref" data-open="${d.id}">${d.id}</span> ${esc(d.title)} <span class="muted">· ${esc(d.oplClass || "")}</span></div>`).join("")}</div>
    </div>
  </div>`}
  <div class="card tl">
    <div class="cardh"><h3>Failure timeline · ${t}</h3><span class="sub">Corrective and overhaul work orders, Jun 2024 to Dec 2025. Dot size shows downtime where recorded; hollow dots have none recorded.</span></div>
    <div class="scroll">${timeline(wos)}</div>
  </div>
  ${lessons.length ? `<div class="card"><div class="cardh"><h3>Lessons captured in the hub</h3><span class="sub">Indexed for Ask immediately, marked unreviewed until approved</span></div><div style="display:grid;gap:8px">${lessons.map(l => `<div class="lesson"><b class="mono">${esc(l.id)}</b> · ${esc(l.date)} · ${esc(l.by || "")}<br><b>Symptom:</b> ${esc(l.symptom)}<br><b>Cause:</b> ${esc(l.cause)}<br><b>Action:</b> ${esc(l.action)}</div>`).join("")}</div></div>` : ""}
  <div class="card">
    <div class="cardh"><h3>Plant-wide lessons</h3><span class="sub">The same failure mode on different assets, found by matching root causes across all ${WOS.length} work orders</span></div>
    <div class="pw">${PLANTWIDE.map(p => { const hits = WOS.filter(w => w.type === "Corrective" && p.re.test(w.problem + " " + w.cause)); const tags = [...new Set(hits.map(h => h.tag))];
      return hits.length ? `<div class="pwrow"><div style="display:grid;gap:3px"><b>${esc(p.k)}</b><span class="small" style="color:var(--ink2)">${esc(p.lesson)}</span><div style="display:flex;gap:4px;flex-wrap:wrap">${hits.map(h => `<span class="tagref" data-open="${h.wo}" title="${esc(h.problem)}">${h.wo} · ${h.tag}</span>`).join("")}</div></div><div style="text-align:right"><div style="font-family:var(--f-disp);font-size:24px;font-weight:600">${hits.length}</div><div class="small muted">${tags.length} assets</div></div></div>` : ""; }).join("")}</div>
  </div>`;
  $("#fmSel").onchange = e => { S.fmAsset = e.target.value; S.asset = e.target.value; renderMemory(v); };
  $("#woBtn") && ($("#woBtn").onclick = () => openWO());
  $("#lsBtn") && ($("#lsBtn").onclick = () => openLesson());
  $("#askFm") && ($("#askFm").onclick = () => { S.asset = t; go("ask"); ask(`${t}: what are the recurring failures and which procedures prevent them?`); });
}
const RECS = [
  {w:"Now", t:"Confirm the trend and correlate with bearing temperature", y:"VT-1201 has climbed about 2 mm/s in 3 days, well past the 1 mm/s-per-week inspection trigger. Check whether the 1x running-speed component dominates, which points to misalignment.", e:["OPL-GA-1201A-07", "LIVE-GA-1201A"]},
  {w:"Now", t:"Line up a controlled changeover to GA-1201B", y:"A 7.1 mm/s trip (1oo2) closes XV-1201, opens FV-1201 and auto-starts GA-1201B anyway. Changing over first avoids an uncontrolled feed upset to the reactor.", e:["TJC-LLD-IL-GA-1201A"]},
  {w:"This shift", t:"Laser alignment check, then a hot check after about 2 h", y:"Targets are < 0.05 mm/100 mm angular and < 0.05 mm offset. Last time angular was 0.12 mm/100 mm. Apply the thermal-growth offset for hexane service.", e:["OPL-GA-1201A-03", "OPL-GA-1201A-05", "WO-240003"]},
  {w:"This shift", t:"Inspect baseplate grout and hold-down bolts", y:"Grout cracked under the baseplate after the last misalignment. Settlement is the root cause that re-alignment alone did not remove.", e:["WO-240013"]},
  {w:"Before restart", t:"Inspect DE bearing and coupling element, check spares", y:"Prolonged misalignment spalled the 7310 BECBM DE bearing and cracked the Rexnord coupling element. Confirm both spares are in stock and the oil bath is at mid sight-glass with ISO VG 68.", e:["WO-240004", "WO-240007", "OPL-GA-1201A-02", "TJC-LLD-GA-GA-1201A"]},
  {w:"Follow-up", t:"Raise a civil RCA on the foundation", y:"Four linked failures in seven months. Until the settlement is fixed, the pump will keep drifting out of alignment.", e:["WO-240003", "WO-240013", "WO-240004", "WO-240007"]}
];
function timeline(wos){
  const W = 900, H = 60 + THEMES.length * 26, x0 = 170, x1 = W - 20;
  const t0 = new Date("2024-06-01").getTime(), t1 = new Date("2026-01-01").getTime();
  const X = d => x0 + (new Date(d).getTime() - t0) / (t1 - t0) * (x1 - x0);
  const lanes = [...THEMES, {k:"Other", c:"#7A8580"}];
  const Y = k => 30 + lanes.findIndex(l => l.k === k) * 26;
  let g = "";
  lanes.forEach(l => { g += `<text x="${x0 - 10}" y="${Y(l.k) + 4}" text-anchor="end" style="font:12px var(--f-ui);fill:var(--ink2)">${esc(l.k)}</text><line x1="${x0}" x2="${x1}" y1="${Y(l.k)}" y2="${Y(l.k)}" stroke="var(--line2)"/>`; });
  for (let m = 0; m <= 18; m += 3) { const d = new Date(2024, 5 + m, 1); const x = X(d.toISOString().slice(0, 10)); g += `<line x1="${x}" x2="${x}" y1="18" y2="${Y("Other") + 10}" stroke="var(--line2)"/><text x="${x}" y="${Y("Other") + 26}" text-anchor="middle" style="font:11px var(--f-mono);fill:var(--muted)">${d.toLocaleDateString("en-GB", {month:"short", year:"2-digit"})}</text>`; }
  for (const w of wos) { const th = themeOf(w); const r = w.dt ? 4 + Math.sqrt(w.dt) * 1.6 : 5; g += `<circle cx="${X(w.date)}" cy="${Y(th.k)}" r="${r}" fill="${w.dt ? th.c : "var(--panel)"}" stroke="${th.c}" stroke-width="2" data-open="${w.wo}" style="cursor:pointer"><title>${w.wo} · ${w.date} · ${esc(w.problem)} · downtime ${w.dt ?? "not recorded"}</title></circle>`; }
  return `<svg viewBox="0 0 ${W} ${H + 10}" style="min-width:640px" role="img" aria-label="Failure timeline">${g}</svg>`;
}

/* ---------------- drawer: open a source ---------------- */
const docText = d => KB && KB.docs[d.id] ? KB.chunks.filter(c => c.ref === d.id).map(c => c.section.split(" > ").pop().toUpperCase() + "\n" + c.text).join("\n\n") : d.text;
function openSource(ref, qset){
  if (!ref) return;
  let html = "";
  if (ref.startsWith("LIVE-")) {
    const t = ref.slice(5); const c = liveChunk(t);
    html = `<div class="eyebrow">Digital twin snapshot</div><h2>${t} · live values</h2><div class="twin">${ASSETS[t].tags.map(g => twinTile(t, g)).join("")}</div><div class="doctext">${esc(c.text)}</div>`;
  } else if (woById[ref]) {
    const w = woById[ref];
    html = `<div class="eyebrow">AIMS work order</div><h2>${w.wo} · ${esc(w.problem)}</h2>
      <div class="meta"><span>Asset</span><b class="mono">${w.tag} ${esc(w.name)}</b><span>Type</span>${w.type} · ${w.disc} · ${w.prio} priority<span>Reported</span>${fmtDate(w.date)}<span>Completed</span>${fmtDate(w.done)}<span>Root cause</span><b>${esc(w.cause)}</b><span>Action</span>${esc(w.action)}<span>Spare parts</span>${esc(w.parts || "—")}<span>Breakdown</span>${w.bd ?? `<span style="color:var(--warn)">not recorded</span>`}<span>Downtime</span>${w.dt == null ? `<span style="color:var(--warn)">not recorded</span>` : w.dt + " h"}<span>Cost</span>${w.cost == null ? `<span style="color:var(--warn)">not recorded</span>` : fmtIDR(w.cost)}<span>Executed by</span>${esc(w.exe || "—")}<span>Approved by</span>${esc(w.appr || "—")}<span>Interlock</span><span class="mono">${esc(w.il || "—")}</span></div>
      <div class="small muted">Source: Maintenance History (All Equipment).xlsx</div>`;
  } else if (LESSONS.find(l => l.id === ref)) {
    const l = LESSONS.find(l => l.id === ref);
    html = `<div class="eyebrow">Lesson learned · unreviewed</div><h2>${esc(l.id)}</h2><div class="lesson"><b>Symptom:</b> ${esc(l.symptom)}<br><b>Cause:</b> ${esc(l.cause)}<br><b>Action:</b> ${esc(l.action)}</div>`;
  } else {
    const d = byDoc[ref]; if (!d) return;
    const cf = cautionsFor([ref]);
    html = `<div class="eyebrow">${esc(d.type)} · EDMS</div><h2>${esc(d.title)}</h2>
      <div class="meta"><span>Doc no.</span><b class="mono">${esc(d.docNo || "—")}</b><span>Asset</span><span class="mono">${esc(d.tag || "—")}</span><span>Revision</span>${esc(d.rev ?? "—")}<span>Status</span><span>${statusBadge(d)}</span>${d.type === "OPL" ? `<span>Reviewed by</span>${esc(d.reviewer || "—")}<span>Approved by</span>${esc(d.approver || "—")}<span>Date of sharing</span>${esc(d.date || "—")}<span>Class</span>${esc(d.oplClass || "—")}` : ""}<span>Linked tags</span><span>${d.tag && ASSETS[d.tag] ? instrTags(d.text, d.tag).map(x => `<span class="tagref">${x}</span>`).join(" ") : "—"}</span><span>File</span><span class="small">${esc(d.path)}</span></div>
      ${cf.map(q => `<div class="caution"><b>${esc(q.t)}</b><div>${esc(q.d)}</div></div>`).join("")}
      ${d.image || d.type === "P&ID" ? `<div class="pid"><img src="${esc(d.image || PIDS[d.tag])}" alt="${esc(d.title)}"></div><div class="small muted"><a href="${esc(d.image || PIDS[d.tag])}" target="_blank" rel="noopener">Open full size</a></div>` : ""}
      ${d.type === "P&ID" ? "" : `<div class="eyebrow">${KB && d.type !== "Uploaded" ? "Knowledge base text" : "Extracted text"}${qset ? " · matching terms highlighted" : ""}</div><div class="doctext">${qset ? hl(docText(d), qset) : esc(docText(d))}</div>`}`;
  }
  const s = document.createElement("div"); s.className = "scrim";
  s.innerHTML = `<aside class="drawer" role="dialog" aria-modal="true"><div style="display:flex;justify-content:flex-end"><button class="btn sm" data-close>Close</button></div>${html}</aside>`;
  s.onclick = e => { if (e.target === s || e.target.closest("[data-close]")) s.remove(); };
  document.body.append(s); s.querySelector("[data-close]").focus();
}
document.addEventListener("keydown", e => { if (e.key === "Escape") document.querySelectorAll(".scrim").forEach(x => x.remove()); });

/* ---------------- act & learn ---------------- */
function openWO(){
  const vt = ASSETS["GA-1201A"].tags[0], tt = ASSETS["GA-1201A"].tags[1];
  const refs = ["OPL-GA-1201A-07", "OPL-GA-1201A-03", "OPL-GA-1201A-05", "OPL-GA-1201A-02", "TJC-LLD-IL-GA-1201A", "TJC-LLD-GA-GA-1201A", "WO-240003", "WO-240013", "WO-240004", "WO-240007"];
  const body = `WORK ORDER REQUEST (draft)
Equipment: GA-1201A Hexane Feed Pump · FLOC ${ASSETS["GA-1201A"].floc}
Work type: Corrective (planned) · Priority: High · Criticality: HIGH CRITICAL
Related interlock: SEQ-1201 (SIL 1)

Problem: DE bearing vibration VT-1201 at ${fmtV(vt)} mm/s RMS (alarm 4.5, trip 7.1 VSHH-1201), rising ~2 mm/s in 3 days. Bearing temperature TT-1201 at ${fmtV(tt)} °C and rising.

Suspected cause: Recurrence of misalignment after foundation settlement (see WO-240003, WO-240013, WO-240004, WO-240007).

Scope:
1. Change over to GA-1201B under operations control before isolating GA-1201A.
2. LOTO, laser alignment check. Targets: angular < 0.05 mm/100 mm, offset < 0.05 mm (OPL-GA-1201A-03). Record as-found / as-left.
3. Inspect baseplate epoxy grout and hold-down bolt torque.
4. Inspect DE bearing 7310 BECBM and Rexnord coupling spacer element; replace if damaged.
5. Verify oil bath mid sight-glass, ISO VG 68 (OPL-GA-1201A-02).
6. Return to service, hot alignment check after ~2 h at temperature (OPL-GA-1201A-05). Log cold and hot data.

Spares to reserve: Bearing 7310 BECBM, Rexnord coupling spacer element, shim pack, epoxy grout.
Follow-up: Civil RCA on pump foundation settlement.

References: ${refs.join(", ")}
Generated by Plant Knowledge Hub · ${new Date().toLocaleString("en-GB")}`;
  const s = document.createElement("div"); s.className = "scrim center";
  s.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="cardh" style="margin:0"><h2>Draft work order · GA-1201A</h2><div class="right"><button class="btn sm" data-close>Close</button></div></div>
    <div class="small muted">Pre-filled from the alarm, the recommended actions and their sources. Review it, then copy it into AIMS.</div>
    <div class="doctext" id="woText">${esc(body)}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap">${refs.map(r => `<span class="tagref" data-open="${r}">${r}</span>`).join("")}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="copyWO">Copy text</button><button class="btn" id="toLesson">Next: capture the lesson</button></div></div>`;
  s.onclick = e => { if (e.target === s || e.target.closest("[data-close]")) s.remove(); };
  document.body.append(s);
  $("#copyWO").onclick = async () => { try { await navigator.clipboard.writeText(body); toast("Work order text copied"); } catch (e) { const r = document.createRange(); r.selectNodeContents($("#woText")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); toast("Text selected. Press Ctrl+C to copy."); } };
  $("#toLesson").onclick = () => { s.remove(); openLesson(true); };
}
function openLesson(prefill){
  const t = S.fmAsset;
  const s = document.createElement("div"); s.className = "scrim center";
  s.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="cardh" style="margin:0"><h2>Capture a lesson · ${t}</h2><div class="right"><button class="btn sm" data-close type="button">Close</button></div></div>
    <div class="small muted">What did you find? It becomes searchable in Ask straight away and is marked unreviewed until a supervisor approves it.</div>
    <form class="form" id="lf">
      <label>Symptom<input type="text" id="lSym" required value="${prefill && t === "GA-1201A" ? "VT-1201 vibration rising to 5.3 mm/s with TT-1201 bearing temperature rising" : ""}"></label>
      <label>Cause found<input type="text" id="lCause" required value="${prefill && t === "GA-1201A" ? "Angular misalignment 0.09 mm/100 mm; grout void at pump-end corner confirmed by tap test" : ""}"></label>
      <label>Action that worked<input type="text" id="lAct" required value="${prefill && t === "GA-1201A" ? "Re-grouted pump-end corner before re-alignment; hot check at 2 h showed 0.03 mm/100 mm; vibration 1.8 mm/s" : ""}"></label>
      <label>Your name<input type="text" id="lBy" value="${prefill ? "Night shift reliability engineer" : ""}"></label>
      <div style="display:flex;gap:8px"><button class="btn primary" type="submit">Save lesson</button></div>
    </form></div>`;
  s.onclick = e => { if (e.target === s || e.target.closest("[data-close]")) s.remove(); };
  document.body.append(s);
  $("#lf").onsubmit = e => {
    e.preventDefault();
    const l = {id: `LL-${t}-${String(LESSONS.length + 1).padStart(3, "0")}`, tag: t, date: new Date().toISOString().slice(0, 10), symptom: $("#lSym").value.trim(), cause: $("#lCause").value.trim(), action: $("#lAct").value.trim(), by: $("#lBy").value.trim()};
    LESSONS.push(l); store("kh-lessons", LESSONS); buildIndex(); updHeader(); s.remove();
    toast(`${l.id} saved and indexed`); if (S.view === "memory") renderMemory($("#view"));
  };
}

/* ---------------- live loop ---------------- */
function liveUpdate(){
  tickTwin();
  document.querySelectorAll("[data-live]").forEach(el => {
    const [t, id, mode] = el.dataset.live.split(":"); const g = ASSETS[t]?.tags.find(x => x.id === id); if (!g) return;
    el.textContent = mode === "u" ? `${fmtV(g)} ${g.u}` : mode === "v" ? fmtV(g) : (el.closest(".atile") ? `${fmtV(g)} ${g.u}` : fmtV(g));
  });
  document.querySelectorAll(".tt[data-tile]").forEach(el => { const [t, id] = el.dataset.tile.split(":"); const g = ASSETS[t].tags.find(x => x.id === id); const svg = el.querySelector("svg"); if (svg) svg.outerHTML = spark(g); const mg = el.querySelector(".mg span"); if (mg) mg.textContent = margin(g); });
  updHeader();
}

/* ---------------- boot ---------------- */
buildIndex();
const h = (location.hash || "").slice(1);
if (["plant", "dataops", "ask", "asset", "memory"].includes(h)) S.view = h;
S.tourStep = Math.max(0, TOUR.findIndex(x => x.v === S.view));
go(S.view, {keepScroll: true});
updHeader(); setAIChip();
setInterval(liveUpdate, 2000);
(async () => {
  try {
    // 1) Running inside a claude.ai artifact: use the built-in Claude capability
    const sample = window.claude && window.claude.use ? await window.claude.use("sample") : null;
    if (sample) { S.ai = sample; S.aiState = "live"; }
    // 2) Self-hosted: use your own backend endpoint if it is deployed
    else if (location.protocol.startsWith("http")) {
      const r = await fetch(AI_ENDPOINT, {method: "GET"});
      const ok = r.ok && (await r.json()).ok;
      if (ok) {
        S.ai = {json: async (prompt, opts = {}) => {
          const res = await fetch(AI_ENDPOINT, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({prompt}), signal: opts.signal})
            .catch(e => { throw {code: e.name === "AbortError" ? "cancelled" : "upstream_error"}; });
          if (!res.ok) throw {code: "upstream_error"};
          const data = await res.json();
          opts.onText && opts.onText({text: data.text, delta: data.text});
          const m = data.text.match(/\{[\s\S]*\}/);
          if (!m) throw {code: "invalid_json"};
          return JSON.parse(m[0]);
        }};
        S.aiState = "live";
      } else S.aiState = "offline";
    } else S.aiState = "offline";
  } catch (e) { S.aiState = "offline"; }
  setAIChip();
})();
