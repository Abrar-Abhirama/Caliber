// Loads the data and wires search, prompt and scoring together. No React in here, so it can be tested on its own.
import { ASSETS, liveChunk } from "./assets.js";
import { SearchIndex, woText } from "./search.js";
import { makeQuality, cautionsFor } from "./quality.js";
import { evidence } from "./evidence.js";
import { buildPrompt, parseReply } from "./prompt.js";
import { CURATED } from "./curated.js";

export const fmtDate = s => { if (!s) return "—"; const d = new Date(s + "T00:00:00"); return d.toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"}); };

const WANTS_PIC = /\b(show|picture|pictures|image|images|photo|drawing|drawings|diagram|p&id|pid|layout|plot plan|sketch|view|gambar|foto|tunjukkan|tampilkan|lihat)\b/i;
const PIC_TYPES = [[/p&id|\bpid\b|piping|instrument diagram/i, "P&ID"], [/plot plan|layout|location|where is/i, "Plot Plan"], [/interlock|logic|cause.and.effect|c&e/i, "Interlock C&E"], [/datasheet|data sheet/i, "Datasheet"], [/\bopl\b|one point lesson|procedure/i, "OPL"], [/drawing|\bga\b|dimension|arrangement|nozzle|bill of material|bom/i, "GA Drawing"]];

function loadLessons(){ try { return JSON.parse(localStorage.getItem("kh-lessons") || "[]"); } catch (e) { return []; } }

export async function loadHub(){
  const get = p => fetch(p).then(r => { if (!r.ok) throw new Error(`Could not load ${p}`); return r.json(); });
  const [docs, wos, kb] = await Promise.all([get("/data/docs.json"), get("/data/workorders.json"), get("/data/kb.json")]);
  return createHub(docs, wos, kb);
}

export function createHub(docs, wos, kb){
  const byDoc = Object.fromEntries(docs.map(d => [d.id, {...d}]));
  for (const [ref, k] of Object.entries(kb.docs)) {
    const image = k.image ? "/" + k.image : null;
    if (byDoc[ref]) { byDoc[ref].image = image; continue; }
    // derived records from the knowledge base: asset summaries, failure patterns, data quality
    byDoc[ref] = {id: ref, docNo: ref, tag: k.tag || null, type: k.type === "asset" ? "Asset summary" : "Derived", title: k.title, rev: null,
      status: "Derived from source records", path: "knowledge-base", image, text: kb.chunks.filter(c => c.ref === ref).map(c => c.text).join("\n\n")};
  }
  const sourceIds = new Set(docs.map(d => d.id));
  const hub = {
    docs, wos, kb, byDoc,
    woById: Object.fromEntries(wos.map(w => [w.wo, w])),
    lessons: loadLessons(),
    quality: makeQuality(wos),
    index: new SearchIndex(kb, wos, ref => sourceIds.has(ref)),
  };
  hub.index.build(hub.lessons);

  hub.imgOf = ref => byDoc[ref]?.image || null;
  // Knowledge-base text for a document (falls back to the raw PDF text)
  hub.docText = d => kb.docs[d.id] ? kb.chunks.filter(c => c.ref === d.id).map(c => c.section.split(" > ").pop().toUpperCase() + "\n" + c.text).join("\n\n") : d.text;
  hub.status = d => {
    const s = d.status || "—";
    const tone = /Approved|Operation/.test(s) ? "ok" : /Construction|Referenced|Pending|Draft|Uploaded/.test(s) ? "warn" : "acc";
    const label = d.type === "P&ID" ? "Number resolved" : d.type === "Datasheet" ? "Issued for Operation" : s.replace("Issued For", "Issued for");
    return {tone, label};
  };
  // What to show for a cited source: kind, title, status badge, extra line
  hub.srcMeta = ref => {
    if (ref.startsWith("LIVE-")) return {kind: "Live twin", id: ref, title: "Digital twin snapshot · " + ref.slice(5), badge: {tone: "acc", label: "Live"}, extra: "Historian"};
    const w = hub.woById[ref];
    if (w) return {kind: "Work order", id: ref, title: `${w.tag} · ${w.problem}`, badge: w.appr ? {tone: "ok", label: "Completed · approved"} : {tone: "warn", label: "Completed · approver not recorded"}, extra: `${fmtDate(w.date)} · ${w.type}`};
    const l = hub.lessons.find(x => x.id === ref);
    if (l) return {kind: "Lesson learned", id: ref, title: `${l.tag} · ${l.symptom}`, badge: {tone: "warn", label: "Captured · not yet reviewed"}, extra: l.date};
    const d = byDoc[ref];
    if (!d) return {kind: "Source", id: ref, title: ref, badge: null, extra: ""};
    return {kind: d.type, id: ref, title: d.title, badge: hub.status(d), extra: `Rev ${d.rev ?? "—"}${d.approver ? " · approved by " + d.approver : ""}${d.date ? " · " + d.date.replace(/^\w+, /, "") : ""}`};
  };
  hub.addLesson = l => {
    hub.lessons.push(l);
    try { localStorage.setItem("kh-lessons", JSON.stringify(hub.lessons)); } catch (e) { /* private mode: keep in memory */ }
    hub.index.build(hub.lessons);
  };

  /**
   * Answer a question.
   * @param opts.ctxTag   asset picked in the context box, or null
   * @param opts.ai       client from connectAI(), or null for offline mode
   * @param opts.signal   AbortSignal
   * @param opts.onStatus called with progress text
   * Returns the answer card data. Throws {code: "cancelled"} if aborted.
   */
  hub.ask = async (q, {ctxTag = null, ai = null, signal, onStatus = () => {}} = {}) => {
    const fx = hub.index.fixQuery(q);
    const {hits, focus, qset} = hub.index.search(fx.q, ctxTag, 10);
    const live = focus ? liveChunk(focus) : null;
    const pool = (live ? [{c: live, s: 99}] : []).concat(hits);
    // "show me the P&ID / drawing" questions: make sure that document (and its picture) is in the pool, first
    const wantsPic = WANTS_PIC.test(fx.q);
    if (wantsPic && focus) {
      const types = PIC_TYPES.filter(([re]) => re.test(fx.q)).map(p => p[1]);
      for (const ty of (types.length ? types : ["P&ID", "GA Drawing"]).reverse()) {
        const d = docs.find(x => x.tag === focus && x.type === ty); if (!d) continue;
        const i = pool.findIndex(h => h.c.ref === d.id);
        const h = i >= 0 ? pool.splice(i, 1)[0] : {c: hub.index.chunks.find(c => c.ref === d.id), s: 98};
        if (h.c) pool.splice(live ? 1 : 0, 0, h);
      }
    }
    const trace = [
      `retrieve  ${hub.index.chunks.length} passages → ${hits.length} hits${focus ? ` · boosted ${focus}` : ""}`,
      `top       ${hits.slice(0, 4).map(h => h.c.ref).join(", ")}`,
      live ? `context   live snapshot ${live.ref} attached` : `context   none`];

    let out = null, mode = "";
    if (ai) {
      onStatus("Asking Claude with " + pool.length + " numbered sources…");
      const labels = pool.map((h, i) => { const m = hub.srcMeta(h.c.ref); return {lab: "S" + (i + 1), ref: h.c.ref, text: h.c.text, kind: m.kind, extra: m.extra, status: byDoc[h.c.ref]?.status}; });
      const prompt = buildPrompt({q, fx, focus, assetName: focus ? ASSETS[focus].name : "", labels});
      try {
        out = parseReply(await ai.json(prompt, {signal}), labels);
        mode = "Generated by Claude from retrieved sources";
      } catch (e) {
        if (e && e.code === "cancelled") throw e;
        out = null;
      }
    }
    const cur = CURATED[q];
    if (!out && cur) { out = {answer: cur.answer, steps: cur.steps, confidence: cur.confidence, reason: cur.reason, cautions: cur.cautions, clarify: ""}; mode = "Verified demo answer · offline mode"; }
    if (!out) { out = {answer: "", steps: [], confidence: 0, reason: "No generative model connected, so here are the best-matching passages, ranked.", cautions: [], clarify: ""}; mode = "Retrieval only · ranked passages"; }

    // cited refs in order of appearance
    const text = [out.answer, ...out.steps].join(" ");
    let refs = [...new Set([...text.matchAll(/\[([A-Za-z0-9#\-]+)\]/g)].map(m => m[1]))];
    if (!refs.length) refs = [...new Set(pool.map(h => h.c.ref))].slice(0, 6);
    if (wantsPic) for (const h of pool) if (hub.imgOf(h.c.ref) && byDoc[h.c.ref]?.tag === focus && !refs.includes(h.c.ref) && refs.length < 8) { refs.push(h.c.ref); break; }
    const passage = ref => {
      if (ref.startsWith("LIVE-")) return (live && live.ref === ref ? live : liveChunk(ref.slice(5))).text;
      const h = pool.find(h => h.c.ref === ref); if (h) return h.c.text;
      const best = hub.index.search(fx.q + " " + ref, focus, 60).hits.find(h => h.c.ref === ref);
      return best ? best.c.text : (hub.woById[ref] ? woText(hub.woById[ref]) : (byDoc[ref]?.text || "").slice(0, 600));
    };
    const sources = refs.map(ref => ({ref, text: passage(ref)}));
    const docCaut = cautionsFor(hub.quality, refs).map(f => f.t + ".");
    const cautions = [...new Set([...out.cautions, ...docCaut])];
    const ev = evidence(hub, refs, docCaut);
    const conf = out.answer ? Math.round(out.confidence * .5 + ev.score * .5) : Math.min(45, ev.score);
    const pics = [...new Set(refs.filter(hub.imgOf))].slice(0, wantsPic ? 6 : 4);
    return {q, trace, qset, fixes: fx.notes, answer: out.answer, steps: out.steps, clarify: out.clarify, sources, cautions, conf, reason: out.reason, factors: ev.factors, mode, focus, pics, wantsPic};
  };
  return hub;
}
