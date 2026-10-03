import { useState } from "react";
import ImageModal from "../common/ImageModal.jsx";
import { IconChevronRight, IconSearch } from "../common/icons.jsx";
import Crumb from "./Crumb.jsx";
import PidThumb from "./PidThumb.jsx";
import { formatDate, statusClass } from "./format.js";

const MAX_TAGS = 3;

// Step 2: one P&ID set, its OPLs and a summary card.
export default function SetDetail({ set, onRoot, onOpenOpl }) {
  const [query, setQuery] = useState("");
  const [showDrawing, setShowDrawing] = useState(false);

  const q = query.trim().toLowerCase();
  const opls = set.opls.filter(
    (o) =>
      !q || [o.code, o.title, o.classification, o.equipment, ...o.instruments].some((v) => String(v).toLowerCase().includes(q))
  );

  return (
    <div className="ins-inner">
      <Crumb pid={set.code} onRoot={onRoot} />
      <div className="ins-title">
        <div>
          <h1>{set.name}</h1>
          <p>
            {set.code} · {set.assetName} · {set.oplCount} linked OPLs
          </p>
        </div>
        <label className="ins-search">
          <IconSearch width={16} height={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search OPLs" aria-label="Search OPLs" />
        </label>
      </div>

      <div className="ins-split">
        <div className="ins-table">
          {opls.length === 0 && <p className="ins-empty">No OPL matches “{query}”.</p>}
          {opls.map((o) => {
            const tags = [o.equipment, ...o.instruments];
            return (
              <button key={o.code} type="button" className="ins-oplrow" onClick={() => onOpenOpl(o.code)}>
                <span className="ins-oplrow-main">
                  <span className="ins-code">
                    {o.code} · {o.classification || o.discipline}
                  </span>
                  <b>{o.title}</b>
                  <span className="ins-oplrow-sub">
                    {tags.slice(0, MAX_TAGS).map((t) => (
                      <span key={t} className="ins-tag">
                        {t}
                      </span>
                    ))}
                    {tags.length > MAX_TAGS && <span className="ins-more">+{tags.length - MAX_TAGS}</span>}
                    {o.status && <span className={`ins-status ${statusClass(o.status)}`}>{o.status}</span>}
                    {o.unfinished > 0 && <span className="ins-status is-unfinished">{o.unfinished} unfinished</span>}
                  </span>
                </span>
                <span className="ins-oplrow-right">
                  <b>{o.woCount} WOs</b>
                  {o.lastDate && <span>last {formatDate(o.lastDate)}</span>}
                </span>
                <IconChevronRight width={16} height={16} className="ins-oplrow-chev" />
              </button>
            );
          })}
        </div>

        <aside className="ins-aside">
          <PidThumb src={set.image} alt={`${set.code} drawing`} className="lg" />
          <div className="ins-aside-body">
            <span className="ins-label">Set summary</span>
            <dl className="ins-kv">
              <dt>Main equipment</dt>
              <dd>{set.equipment.join(", ")}</dd>
              <dt>Equipment</dt>
              <dd>{set.assetName}</dd>
              {set.assetType && (
                <>
                  <dt>Type</dt>
                  <dd>{set.assetType}</dd>
                </>
              )}
              <dt>Area</dt>
              <dd>
                {set.area} · {set.areaName}
              </dd>
              {set.interlock && (
                <>
                  <dt>Interlock</dt>
                  <dd>{set.interlock}</dd>
                </>
              )}
              {set.criticality && (
                <>
                  <dt>Criticality</dt>
                  <dd>{set.criticality}</dd>
                </>
              )}
              <dt>Documents</dt>
              <dd>{set.docCount}</dd>
              <dt>Work orders</dt>
              <dd>{set.woCount}</dd>
              <dt>Unfinished WOs</dt>
              <dd>{set.unfinished}</dd>
            </dl>
            {set.image && (
              <button type="button" className="ins-tag ins-tag-btn" onClick={() => setShowDrawing(true)}>
                Open full P&amp;ID
              </button>
            )}
          </div>
        </aside>
      </div>

      {showDrawing && (
        <ImageModal
          imageUrl={set.image}
          title={`P&ID - ${set.name}`}
          refName={set.code}
          tag={set.asset}
          onClose={() => setShowDrawing(false)}
        />
      )}
    </div>
  );
}
