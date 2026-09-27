import { useRef, useState } from "react";
import { ASSETS, TAGS, fmtV } from "../lib/assets.js";
import { SUGG } from "../lib/curated.js";
import AnswerCard from "./AnswerCard.jsx";

export default function AskView({hub, ai, asset, setAsset, onOpen}){
  const [q, setQ] = useState("");
  const [useCtx, setUseCtx] = useState(true);
  const [qa, setQa] = useState([]);          // newest last
  const [busy, setBusy] = useState(false);
  const ctl = useRef(null);
  const a = ASSETS[asset];

  async function ask(text){
    if (busy || !text.trim()) return;
    setBusy(true); setQ("");
    const id = Date.now();
    setQa(list => [...list, {id, q: text, pending: true}]);
    const update = patch => setQa(list => list.map(x => x.id === id ? {...x, ...patch} : x));
    ctl.current = new AbortController();
    try {
      const res = await hub.ask(text, {ctxTag: useCtx ? asset : null, ai, signal: ctl.current.signal, onStatus: status => update({status})});
      update({...res, pending: false});
    } catch (e) {
      if (e && e.code === "cancelled") setQa(list => list.filter(x => x.id !== id));
      else update({pending: false, q: text, mode: "Error", answer: "", steps: [], clarify: "", sources: [], cautions: [String(e?.message || e?.code || e)], conf: 0, reason: "", factors: [], fixes: [], trace: [], pics: [], qset: []});
    }
    setBusy(false);
  }

  return (
    <>
      <div className="cardh" style={{margin: 0}}><h2>Ask the plant</h2><span className="sub">Key question 2: trusted answers with sources, revision, approval status and confidence</span></div>
      <div className="asklay">
        <div style={{display: "grid", gap: 16, minWidth: 0}}>
          <div className="card">
            <form className="askbox" onSubmit={e => { e.preventDefault(); ask(q); }}>
              <textarea rows={2} value={q} onChange={e => setQ(e.target.value)} placeholder="Ask about any asset, procedure, trip or past failure…" aria-label="Question"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }} />
              <button className="btn primary" type="submit" disabled={busy}>Ask</button>
            </form>
            <div className="ctxrow">
              <label style={{display: "flex", gap: 6, alignItems: "center"}}><input type="checkbox" checked={useCtx} onChange={e => setUseCtx(e.target.checked)} /> Use live asset context</label>
              <select value={asset} onChange={e => setAsset(e.target.value)} aria-label="Context asset">{TAGS.map(t => <option key={t}>{t}</option>)}</select>
              <span className="muted">{a.name} · {a.tags.slice(0, 2).map(g => `${g.id} ${fmtV(g)} ${g.u}`).join(" · ")}</span>
            </div>
          </div>
          <div className="qa">
            {qa.slice().reverse().map(x => <AnswerCard key={x.id} hub={hub} x={x} onOpen={onOpen} onStop={() => ctl.current?.abort()} />)}
          </div>
        </div>
        <aside style={{display: "grid", gap: 16, alignContent: "start"}}>
          <div className="card"><div className="cardh"><h3>Try asking</h3></div>
            <div className="sugg">{SUGG.map(s => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div></div>
          <div className="card small"><div className="cardh"><h3>How answers are checked</h3></div>
            <div style={{display: "grid", gap: 6, color: "var(--ink2)"}}>
              <div>1. Search over {hub.index.chunks.length} passages, boosted for the asset in context. Typos, tags without a dash and Indonesian words are corrected first.</div>
              <div>2. The model may only use the numbered sources and must cite each claim.</div>
              <div>3. Confidence blends the model's own rating with evidence strength: number and type of sources, approval status, and known data gaps.</div>
              <div>4. Any cited document with an open data-quality finding shows a caution.</div>
            </div></div>
        </aside>
      </div>
    </>
  );
}
