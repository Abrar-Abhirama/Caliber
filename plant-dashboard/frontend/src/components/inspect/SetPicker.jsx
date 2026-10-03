import { useMemo, useState } from "react";
import { IconSearch } from "../common/icons.jsx";
import PidThumb from "./PidThumb.jsx";

// Step 1: choose a P&ID set.
export default function SetPicker({ sets, onOpen }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("All");

  const areas = useMemo(() => ["All", ...new Set(sets.map((s) => s.area).filter(Boolean))], [sets]);

  const q = query.trim().toLowerCase();
  const list = sets.filter(
    (s) =>
      (area === "All" || s.area === area) &&
      (!q ||
        [s.code, s.name, s.assetName, ...s.equipment, ...s.instruments].some((v) => String(v).toLowerCase().includes(q)))
  );

  return (
    <div className="ins-inner">
      <div className="ins-title">
        <h1>Choose a P&amp;ID set</h1>
        <label className="ins-search">
          <IconSearch width={16} height={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search P&ID code"
            aria-label="Search P&ID code"
          />
        </label>
      </div>

      <div className="ins-info">
        <span>After you open a P&amp;ID, the assistant only retrieves documents, OPLs and work orders linked to it.</span>
      </div>

      <div className="ins-chips" role="group" aria-label="Filter by area">
        {areas.map((a) => (
          <button key={a} type="button" className="ins-chip" aria-pressed={area === a} onClick={() => setArea(a)}>
            {a === "All" ? "All areas" : `Area ${a}`}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="ins-empty">No P&amp;ID set matches “{query}”.</p>
      ) : (
        <div className="ins-sets">
          {list.map((s) => (
            <button key={s.code} type="button" className="ins-set" onClick={() => onOpen(s.code)}>
              <PidThumb src={s.image} alt={`${s.code} drawing`} />
              <span className="ins-set-body">
                <b>{s.name}</b>
                <span className="ins-code">{s.equipment.join(", ")}</span>
                <span className="ins-set-meta">
                  <span className="ins-tag">{s.oplCount} OPLs</span>
                  <span className="ins-tag">{s.woCount} work orders</span>
                  {s.unfinished > 0 && <span className="ins-status is-unfinished">{s.unfinished} unfinished</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
