import { useEffect, useRef, useState } from "react";
import { IconAlert, IconBook, IconDoc, IconGauge, IconSearch, IconWrench } from "../common/icons.jsx";
import Crumb from "./Crumb.jsx";
import { avgMonthsBetween, formatDate, statusClass } from "./format.js";

const HISTORY_FILTERS = ["All", "Preventive Maintenance", "Corrective Maintenance", "Predictive Maintenance"];

const SECTIONS = [
  { id: "objective", label: "Objective", Icon: IconGauge },
  { id: "safety", label: "Safety", Icon: IconAlert },
  { id: "tools", label: "Tools", Icon: IconWrench },
  { id: "procedure", label: "Procedure", Icon: IconDoc },
  { id: "problems", label: "Problems", Icon: IconSearch },
  { id: "learning", label: "Key learning", Icon: IconBook },
];

function SectionContent({ id, opl }) {
  if (id === "objective") {
    return (
      <>
        <h2>Objective</h2>
        {opl.objective.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <dl className="ins-kv">
          {opl.classification && (
            <>
              <dt>Classification</dt>
              <dd>{opl.classification}</dd>
            </>
          )}
          {opl.discipline && (
            <>
              <dt>Discipline</dt>
              <dd>{opl.discipline}</dd>
            </>
          )}
          {opl.relatedInterlock && (
            <>
              <dt>Related interlock</dt>
              <dd>{opl.relatedInterlock}</dd>
            </>
          )}
          <dt>P&amp;ID</dt>
          <dd>{opl.pid}</dd>
        </dl>
      </>
    );
  }
  if (id === "safety") {
    return (
      <>
        <h2>Safety</h2>
        <p className="ins-lead">Read before starting work.</p>
        {[...opl.safety.notes, ...opl.safety.items].map((item, i) => (
          <div key={i} className={`ins-haz ${i < opl.safety.notes.length ? "is-note" : ""}`}>
            <IconAlert width={18} height={18} />
            <div>{item}</div>
          </div>
        ))}
      </>
    );
  }
  if (id === "tools") {
    return (
      <>
        <h2>Tools</h2>
        <p className="ins-lead">{opl.tools.length} items to prepare</p>
        <div>
          {opl.tools.map((t, i) => (
            <div key={i} className="ins-trow">
              <span className="ins-trow-icon">
                <IconWrench width={16} height={16} />
              </span>
              <b>{t}</b>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (id === "procedure") {
    return (
      <>
        <h2>Detailed procedure</h2>
        <p className="ins-lead">{opl.procedure.length} steps</p>
        <div>
          {opl.procedure.map((s, i) => (
            <div key={i} className="ins-pstep">
              <span className="ins-no">{s.step}</span>
              <div>
                <b>{s.action}</b>
                {s.check && <p>Check: {s.check}</p>}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }
  if (id === "problems") {
    return (
      <>
        <h2>Common problems</h2>
        <p className="ins-lead">Tap a problem to see the cause and action.</p>
        {opl.problems.map((p, i) => (
          <details key={i} className="ins-prob" open={i === 0}>
            <summary>{p.symptom}</summary>
            <dl>
              <dt>Cause</dt>
              <dd>{p.cause}</dd>
              <dt>Action</dt>
              <dd>{p.action}</dd>
              {p.wo && (
                <>
                  <dt>Work order</dt>
                  <dd>{p.wo}</dd>
                </>
              )}
            </dl>
          </details>
        ))}
      </>
    );
  }
  return (
    <>
      <h2>Key learning points</h2>
      <p className="ins-lead">Lessons from this OPL and its work orders.</p>
      {opl.keyLearning.map((k, i) => (
        <div key={i} className="ins-kl">
          <span className="ins-kl-no">{i + 1}</span>
          <span>{k}</span>
        </div>
      ))}
    </>
  );
}

// Step 3: one OPL with its maintenance history (left) and content sections (right).
export default function OplDetail({ opl, onRoot, onSet }) {
  const [filter, setFilter] = useState("All");
  const [section, setSection] = useState("objective");
  const bodyRef = useRef(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const wos = opl.linkedWorkOrders;
  const history = wos.filter((w) => filter === "All" || w.typeLabel === filter);
  const interval = avgMonthsBetween(wos);
  const unfinished = wos.filter((w) => w.unfinished).length;
  const idx = SECTIONS.findIndex((s) => s.id === section);
  const footer = [opl.revision ? `Rev. ${opl.revision}` : "No revision no.", opl.status, opl.date && formatDate(opl.date)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="ins-inner">
      <Crumb pid={opl.pid} opl={opl.code} onRoot={onRoot} onSet={onSet} />
      <div className="ins-title">
        <div>
          <span className="ins-code">
            {opl.code} · {opl.classification || opl.discipline}
          </span>
          <h1>{opl.title}</h1>
          <p className="ins-title-tags">
            {[opl.equipment, ...opl.instruments].map((t) => (
              <span key={t} className="ins-tag">
                {t}
              </span>
            ))}
            {opl.status && <span className={`ins-status ${statusClass(opl.status)}`}>{opl.status}</span>}
          </p>
        </div>
      </div>

      <div className="ins-detail">
        <div className="ins-lcol">
          <div className="ins-stats">
            <div className="ins-stat">
              <small>Linked work orders</small>
              <b>{wos.length}</b>
            </div>
            <div className="ins-stat">
              <small>Avg. time between WOs</small>
              <b>
                {interval ?? "–"} {interval != null && <em>months</em>}
              </b>
            </div>
            <div className="ins-stat">
              <small>Unfinished WOs</small>
              <b>{unfinished}</b>
            </div>
          </div>

          <div className="ins-card ins-history">
            <div className="ins-card-hd">
              <h2>Maintenance history</h2>
              <div className="ins-chips" role="group" aria-label="Filter by work type">
                {HISTORY_FILTERS.map((f) => (
                  <button key={f} type="button" className="ins-chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            {history.length === 0 ? (
              <p className="ins-wo-empty">No {filter} work orders linked to this OPL.</p>
            ) : (
              history.map((w) => (
                <div key={w.ref} className="ins-wo">
                  <time>{formatDate(w.date)}</time>
                  <div className="ins-wo-main">
                    <b>
                      {w.ref} · {w.title}
                    </b>
                    <p title={w.note || undefined}>
                      <span className="ins-typ">{w.typeLabel}</span>
                      {w.equipment}
                      {w.note && ` · ${w.note}`}
                    </p>
                  </div>
                  <span className={`ins-status ${w.unfinished ? "is-unfinished" : ""}`}>
                    {w.unfinished ? "Unfinished" : w.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ins-rcol">
          <div className="ins-card ins-sections">
            <div className="ins-secnav" role="tablist" aria-label="OPL sections">
              {SECTIONS.map(({ id, label, Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={section === id} onClick={() => setSection(id)}>
                  <Icon width={16} height={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="ins-secbody" ref={bodyRef} role="tabpanel">
              <SectionContent id={section} opl={opl} />
            </div>
            <div className="ins-secfoot">
              <button type="button" disabled={idx === 0} onClick={() => setSection(SECTIONS[idx - 1].id)}>
                Previous
              </button>
              <span>{footer}</span>
              <button type="button" disabled={idx === SECTIONS.length - 1} onClick={() => setSection(SECTIONS[idx + 1].id)}>
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
