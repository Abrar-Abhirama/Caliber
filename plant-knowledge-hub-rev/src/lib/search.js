// Search: BM25 over knowledge-base passages and work orders, boosted for the asset in the question.
// fixQuery() cleans the question first: tags without a dash, typos and Indonesian words.
import { ASSETS, TAGS } from "./assets.js";

const STOP = new Set("the a an and or of to in on for is are be at by with from as it this that what which when how do does i we should my our me can if into than then there their them any all was were has have had not no per vs about".split(" "));

export function toks(s){
  const out = [];
  for (let w of String(s).toLowerCase().match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) || []) {
    if (STOP.has(w)) continue;
    out.push(w);
    if (w.includes("-")) for (const p of w.split("-")) if (p.length > 1 && !STOP.has(p)) out.push(p);
    if (w.length > 4 && w.endsWith("s")) out.push(w.slice(0, -1));
  }
  return out;
}

export const woText = w =>
  `${w.wo} · ${w.date} · ${w.tag} ${w.name} · ${w.type} work order (${w.prio} priority). Problem: ${w.problem}. Root cause: ${w.cause}. Corrective action: ${w.action}. Spare parts: ${w.parts || "-"}. Breakdown: ${w.bd ?? "not recorded"}. Downtime: ${w.dt ?? "not recorded"} h. Interlock: ${w.il || "-"}.`;

// Edit distance with transpositions, giving up early once it exceeds max
export function lev(a, b, max){
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

export class SearchIndex {
  /**
   * @param kb     public/data/kb.json  ({docs, chunks, search})
   * @param wos    public/data/workorders.json
   * @param isSourceDoc  ref => true for real EDMS documents (false for derived summaries)
   */
  constructor(kb, wos, isSourceDoc){
    const v = kb.search || {};
    this.SYN = v.en_synonyms || {};
    this.ID_MAP = v.id_map || {};
    this.ID_PHRASES = v.id_phrases || [];
    this.ID_STOP = new Set(v.id_stop || []);
    this.kb = kb; this.wos = wos; this.isSourceDoc = isSourceDoc;
    this.woById = Object.fromEntries(wos.map(w => [w.wo, w]));
    this.build([]);
  }

  // lessons: [{id, tag, date, symptom, cause, action}] captured by users
  build(lessons){
    const C = [];
    for (const c of this.kb.chunks) C.push({id: c.ref + "#" + C.length, ref: c.ref, kind: this.isSourceDoc(c.ref) ? "doc" : "kb", tag: c.tag, text: `${c.section}\n${c.text}`});
    for (const w of this.wos) C.push({id: w.wo, ref: w.wo, kind: "wo", tag: w.tag, text: woText(w)});
    for (const l of lessons) C.push({id: l.id, ref: l.id, kind: "lesson", tag: l.tag, text: `Lesson learned ${l.id} (${l.date}) ${l.tag}: Symptom: ${l.symptom}. Cause: ${l.cause}. Action that worked: ${l.action}.`});
    const DF = new Map(); let tot = 0;
    for (const c of C) {
      c.tk = toks(c.text); tot += c.tk.length; c.tf = new Map();
      for (const w of c.tk) c.tf.set(w, (c.tf.get(w) || 0) + 1);
      for (const w of c.tf.keys()) DF.set(w, (DF.get(w) || 0) + 1);
    }
    this.chunks = C; this.DF = DF; this.avg = tot / C.length; this.vocab = null;
  }

  nearestWord(w){
    if (!this.vocab) this.vocab = [...this.DF.keys()].filter(x => /^[a-z]{4,}$/.test(x));
    const max = w.length >= 7 ? 2 : 1; let best = null, bd = max + 1, bdf = 0;
    for (const v of this.vocab) { const d = lev(w, v, max); const df = this.DF.get(v); if (d < bd || (d === bd && df > bdf)) { best = v; bd = d; bdf = df; } }
    return bd <= max ? best : null;
  }

  // Returns {q: text used for search, notes: what was changed}
  fixQuery(q){
    const notes = [];
    let s = q.replace(/\bWO[\s_-]?(\d{6})\b/gi, (m, d) => { const r = "WO-" + d; if (r !== m) notes.push(`${m} → ${r}`); return r; });
    s = s.replace(/\b([A-Za-z]{2,5})[\s_-]?(\d{4,5})([A-Za-z]?)\b/g, (m, L, D, X) => {
      const r = `${L}-${D}${X}`.toUpperCase();
      if (ASSETS[r] || this.DF.has(r.toLowerCase())) { if (r !== m) notes.push(`${m} → ${r}`); return r; }
      if (L.length === 2) { // an equipment tag that does not exist: try the closest real one
        const near = TAGS.filter(t => t.startsWith(L.toUpperCase() + "-") && lev(t.slice(3), D + X.toUpperCase(), 1) <= 1);
        if (near.length === 1) { notes.push(`${m} → ${near[0]} (closest real tag)`); return near[0]; }
      }
      return m;
    });
    const low = s.toLowerCase(); const extra = [];
    for (const [id, en] of this.ID_PHRASES) if (low.includes(id)) extra.push(en);
    for (const w of low.match(/[a-z]+/g) || []) {
      if (this.ID_MAP[w]) { extra.push(this.ID_MAP[w]); continue; }
      if (w.length < 4 || STOP.has(w) || this.ID_STOP.has(w) || this.DF.has(w) || this.SYN[w]) continue;
      const n = this.nearestWord(w);
      if (n && n !== w) { s = s.replace(new RegExp("\\b" + w + "\\b", "i"), n); notes.push(`${w} → ${n}`); }
    }
    if (extra.length) { s += " " + extra.join(" "); notes.push("Indonesian terms translated: " + [...new Set(extra.join(" ").split(" "))].slice(0, 8).join(", ")); }
    return {q: s, notes};
  }

  // Returns {hits: [{c, s}], focus: asset tag or null, qset: query terms (for highlighting)}
  search(q, ctxTag, k = 10){
    const qt = []; for (const w of toks(q)) { qt.push(w); if (this.SYN[w]) qt.push(...this.SYN[w]); }
    const qset = [...new Set(qt)];
    let mTag = (q.toUpperCase().match(/\b[A-Z]{2}-\d{4}[A-Z]?\b/g) || []).filter(x => ASSETS[x]);
    if (!mTag.length) { // an instrument tag like VSHH-1201 belongs to the asset of its unit (12xx -> GA-1201A)
      for (const m of q.toUpperCase().matchAll(/\b[A-Z]{2,5}-(\d{2})\d{2}[A-Z]?\b/g)) { const t = TAGS.find(t => t.slice(3, 5) === m[1]); if (t) { mTag = [t]; break; } }
    }
    const focus = mTag[0] || ctxTag;
    const N = this.chunks.length, k1 = 1.3, b = .72;
    const scored = [];
    for (const c of this.chunks) {
      let s = 0;
      for (const w of qset) {
        const f = c.tf.get(w); if (!f) continue;
        const df = this.DF.get(w) || 1; const idf = Math.log(1 + (N - df + .5) / (df + .5));
        s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * c.tk.length / this.avg));
      }
      if (!s) continue;
      if (focus) s *= c.tag === focus ? 1.9 : .55;
      if (c.kind === "wo") { const w = this.woById[c.ref]; if (w && /Corrective|Overhaul/.test(w.type)) s *= 1.15; else s *= .8; }
      scored.push({c, s});
    }
    scored.sort((a, b) => b.s - a.s);
    const out = [], seen = new Map();
    let wo = 0; // cap work orders at half the results so documents (procedures, trips) always get room
    for (const x of scored) {
      const n = seen.get(x.c.ref) || 0; if (n >= 2) continue;
      if (x.c.kind === "wo") { if (wo >= Math.floor(k / 2)) continue; wo++; }
      seen.set(x.c.ref, n + 1); out.push(x); if (out.length >= k) break;
    }
    return {hits: out, focus, qset};
  }
}
