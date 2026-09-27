import { useMemo, useState } from "react";
import { TAGS } from "../lib/assets.js";
import { Badge } from "./ui.jsx";

const TYPES = ["Datasheet", "GA Drawing", "Interlock C&E", "Plot Plan", "P&ID", "OPL"];

// Every document with its picture, filterable by asset and type
export default function DocumentsView({hub, onOpen}){
  const [tag, setTag] = useState("all");
  const [type, setType] = useState("all");
  const [text, setText] = useState("");
  const list = useMemo(() => hub.docs.filter(d =>
    (tag === "all" || d.tag === tag) && (type === "all" || d.type === type) &&
    (!text || (d.id + " " + d.title).toLowerCase().includes(text.toLowerCase()))), [hub, tag, type, text]);
  return (
    <>
      <div className="cardh" style={{margin: 0}}><h2>Documents</h2><span className="sub">{list.length} of {hub.docs.length} documents · click one to open it</span></div>
      <div className="card" style={{display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}}>
        <select value={tag} onChange={e => setTag(e.target.value)} aria-label="Asset"><option value="all">All assets</option>{TAGS.map(t => <option key={t}>{t}</option>)}</select>
        <select value={type} onChange={e => setType(e.target.value)} aria-label="Type"><option value="all">All types</option>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
        <input type="search" value={text} onChange={e => setText(e.target.value)} placeholder="Filter by number or title" aria-label="Filter" />
      </div>
      <div className="pics" style={{gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))"}}>
        {list.map(d => (
          <button key={d.id} className="pic" style={{gridTemplateRows: "150px auto"}} onClick={() => onOpen(d.id)} title={d.title}>
            {hub.imgOf(d.id) ? <img src={hub.imgOf(d.id)} alt="" loading="lazy" style={{height: 150}} /> : <div />}
            <span style={{whiteSpace: "normal", display: "grid", gap: 3, justifyItems: "start"}}>
              <b className="mono">{d.id}</b><em style={{fontStyle: "normal"}}>{d.title}</em><Badge b={hub.status(d)} />
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
