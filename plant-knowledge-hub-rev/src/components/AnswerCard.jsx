import { useRef } from "react";
import { Badge, Cited, Highlight, confColor } from "./ui.jsx";

function PicStrip({hub, refs, onOpen}){
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 6}}>Pictures from the cited documents</div>
      <div className="pics">
        {refs.map(r => (
          <button key={r} className="pic" title={"Open " + r} onClick={() => onOpen(r)}>
            <img src={hub.imgOf(r)} alt={hub.byDoc[r]?.title || r} loading="lazy" />
            <span className="mono">{r}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AnswerCard({hub, x, onOpen, onStop}){
  const box = useRef(null);
  if (x.pending) return (
    <div className="card">
      <div className="q">{x.q}</div>
      <div className="thinking"><span className="spin"></span><span>{x.status || "Searching…"}</span><button className="btn sm" onClick={onStop}>Stop</button></div>
    </div>
  );
  const jump = n => {
    const el = box.current?.querySelector(`[data-n="${n}"]`);
    if (el) { el.scrollIntoView({behavior: "smooth", block: "center"}); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1400); }
  };
  const lvl = x.conf >= 80 ? "High" : x.conf >= 55 ? "Medium" : "Low";
  const pics = x.pics.length ? <PicStrip hub={hub} refs={x.pics} onOpen={r => onOpen(r, x.qset)} /> : null;
  return (
    <div className="card" ref={box}>
      <div className="cardh" style={{marginBottom: 6}}><span className="eyebrow">{x.mode}</span><div className="right">{x.focus && <span className="badge acc mono">{x.focus}</span>}</div></div>
      <div className="q">{x.q}</div>
      {x.fixes.length > 0 && <div className="small muted" style={{marginTop: 4}}>Read as: {x.fixes.join(" · ")}</div>}
      <div className="retr" style={{margin: "8px 0"}}>{x.trace.map(l => <span key={l}>{l}</span>)}</div>
      <div style={{display: "grid", gap: 12, marginTop: 10}}>
        {x.clarify && <div className="clarify"><b>Which one do you mean?</b> {x.clarify}</div>}
        {x.wantsPic && pics}
        {x.answer && <div className="ans"><Cited text={x.answer} sources={x.sources} onCite={jump} /></div>}
        {x.steps.length > 0 && (
          <div><div className="eyebrow" style={{marginBottom: 4}}>Recommended steps</div>
            <ol className="stepsol">{x.steps.map((s, i) => <li key={i}><Cited text={s} sources={x.sources} onCite={jump} /></li>)}</ol></div>
        )}
        {x.cautions.length > 0 && <div className="caution"><b>Check before acting</b>{x.cautions.map(c => <div key={c}>{c}</div>)}</div>}
        {!x.wantsPic && pics}
        <div className="conf">
          <div style={{display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap"}}><b>Confidence {x.conf}% · {lvl}</b><span className="small muted">{x.reason}</span></div>
          <div className="meter"><i style={{width: x.conf + "%", background: confColor(x.conf)}}></i></div>
          <div className="factors">{x.factors.map(f => <span key={f[0]} className={"badge " + f[1]}>{f[0]}</span>)}</div>
        </div>
        <div>
          <div className="eyebrow" style={{marginBottom: 6}}>Sources ({x.sources.length})</div>
          <div className="srclist">
            {x.sources.map((s, i) => { const m = hub.srcMeta(s.ref); return (
              <div key={s.ref} className="srcitem" data-n={i + 1} onClick={() => onOpen(s.ref, x.qset)}>
                <div className="hd"><span className="n">{i + 1}</span><span className="mono small">{m.id}</span><span className="small muted">{m.kind}</span><Badge b={m.badge} /></div>
                <div className="small"><b>{m.title}</b> <span className="muted">{m.extra}</span></div>
                <div className="snip"><Highlight text={s.text} qset={x.qset} /></div>
              </div>); })}
          </div>
        </div>
      </div>
    </div>
  );
}
