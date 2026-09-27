import { Fragment, useEffect, useRef, useState } from "react";
import { ASSETS, fmtV, liveChunk } from "../lib/assets.js";
import { cautionsFor } from "../lib/quality.js";
import { fmtDate } from "../lib/hub.js";
import { Badge, Highlight } from "./ui.jsx";

const fmtIDR = n => n == null ? "—" : "Rp " + (n >= 1e6 ? (n / 1e6).toFixed(1) + " M" : Math.round(n / 1e3) + " k");
const NR = () => <span style={{color: "var(--warn)"}}>not recorded</span>;

function Body({hub, refId, qset}){
  const [zoom, setZoom] = useState(false);
  if (refId.startsWith("LIVE-")) {
    const t = refId.slice(5);
    return <><div className="eyebrow">Digital twin snapshot</div><h2>{t} · live values</h2>
      <div className="meta">{ASSETS[t].tags.map(g => <Fragment key={g.id}><span>{g.id}</span><span>{fmtV(g)} {g.u} · {g.d}</span></Fragment>)}</div>
      <div className="doctext">{liveChunk(t).text}</div></>;
  }
  const w = hub.woById[refId];
  if (w) return <><div className="eyebrow">AIMS work order</div><h2>{w.wo} · {w.problem}</h2>
    <div className="meta">
      <span>Asset</span><b className="mono">{w.tag} {w.name}</b>
      <span>Type</span><span>{w.type} · {w.disc} · {w.prio} priority</span>
      <span>Reported</span><span>{fmtDate(w.date)}</span><span>Completed</span><span>{fmtDate(w.done)}</span>
      <span>Root cause</span><b>{w.cause}</b><span>Action</span><span>{w.action}</span>
      <span>Spare parts</span><span>{w.parts || "—"}</span>
      <span>Breakdown</span><span>{w.bd ?? <NR />}</span>
      <span>Downtime</span><span>{w.dt == null ? <NR /> : w.dt + " h"}</span>
      <span>Cost</span><span>{w.cost == null ? <NR /> : fmtIDR(w.cost)}</span>
      <span>Approved by</span><span>{w.appr || "—"}</span>
      <span>Interlock</span><span className="mono">{w.il || "—"}</span>
    </div><div className="small muted">Source: Maintenance History (All Equipment).xlsx</div></>;
  const l = hub.lessons.find(x => x.id === refId);
  if (l) return <><div className="eyebrow">Lesson learned · unreviewed</div><h2>{l.id}</h2><div className="lesson"><b>Symptom:</b> {l.symptom}<br /><b>Cause:</b> {l.cause}<br /><b>Action:</b> {l.action}</div></>;
  const d = hub.byDoc[refId];
  if (!d) return <p>Source {refId} not found.</p>;
  const cf = cautionsFor(hub.quality, [refId]);
  const text = hub.docText(d);
  return <>
    <div className="eyebrow">{d.type} · EDMS</div><h2>{d.title}</h2>
    <div className="meta">
      <span>Doc no.</span><b className="mono">{d.docNo || "—"}</b>
      <span>Asset</span><span className="mono">{d.tag || "—"}</span>
      <span>Revision</span><span>{d.rev ?? "—"}</span>
      <span>Status</span><span><Badge b={hub.status(d)} /></span>
      {d.type === "OPL" && <><span>Reviewed by</span><span>{d.reviewer || "—"}</span><span>Approved by</span><span>{d.approver || "—"}</span><span>Date of sharing</span><span>{d.date || "—"}</span></>}
      <span>File</span><span className="small">{d.path}</span>
    </div>
    {cf.map(f => <div key={f.t} className="caution"><b>{f.t}</b><div>{f.d}</div></div>)}
    {d.image && <><div className={"pid" + (zoom ? " zoom" : "")}><img src={d.image} alt={d.title} onClick={() => setZoom(z => !z)} /></div>
      <div className="small muted"><a href={d.image} target="_blank" rel="noopener noreferrer">Open full size</a></div></>}
    {d.type !== "P&ID" && text && <><div className="eyebrow">Knowledge base text{qset ? " · matching terms highlighted" : ""}</div><div className="doctext">{qset ? <Highlight text={text} qset={qset} /> : text}</div></>}
  </>;
}

export default function SourceDrawer({hub, open, onClose}){
  const closeBtn = useRef(null);
  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const k = e => { if (e.key === "Escape") onClose(); };
    addEventListener("keydown", k); return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" role="dialog" aria-modal="true">
        <div style={{display: "flex", justifyContent: "flex-end"}}><button className="btn sm" ref={closeBtn} onClick={onClose}>Close</button></div>
        <Body key={open.ref} hub={hub} refId={open.ref} qset={open.qset} />
      </aside>
    </div>
  );
}
