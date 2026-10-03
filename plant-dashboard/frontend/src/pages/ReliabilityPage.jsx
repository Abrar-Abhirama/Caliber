import { useEffect, useMemo, useRef, useState } from "react";
import ModeTopbar from "../components/common/ModeTopbar.jsx";
import PillSelect from "../components/chatbot/PillSelect.jsx";
import { IconAlert, IconChevronRight } from "../components/common/icons.jsx";
import SourceDrawer from "../components/chatbot/SourceDrawer.jsx";
import { formatDate } from "../components/inspect/format.js";
import { api } from "../services/api.js";

const TYPE_LABELS = {
  Preventive: "Preventive Maintenance",
  Corrective: "Corrective Maintenance",
  Predictive: "Predictive Maintenance",
};

const CRIT_FILTERS = [
  { id: "", label: "All assets" },
  { id: "high", label: "High critical" },
  { id: "other", label: "Low / non critical" },
];

const PERIODS = [
  { id: "", label: "All time" },
  { id: "3m", label: "Last 3 months" },
  { id: "6m", label: "Last 6 months" },
  { id: "12m", label: "Last 12 months" },
];

const WORK_TYPES = [
  { id: "", label: "All work types" },
  { id: "Preventive", label: "Preventive Maintenance" },
  { id: "Corrective", label: "Corrective Maintenance" },
  { id: "Predictive", label: "Predictive Maintenance" },
  { id: "Inspection", label: "Inspection" },
  { id: "Calibration", label: "Calibration" },
  { id: "Overhaul", label: "Overhaul" },
];

const NO_FILTERS = { pid: "", period: "", type: "", crit: "" };

const MTTF_HINT =
  "Mean time to failure = operating time ÷ number of failures (Corrective Maintenance work orders, plus any work order marked as a breakdown): how long an asset runs before it breaks down. Higher is better.";
const MTTR_HINT =
  "Mean time to repair = recorded repair downtime ÷ number of repairs: how long a breakdown stops the asset. Lower is better.";
const MTBF_HINT =
  "Mean time between failures = MTTF + MTTR: one full cycle of running until a failure and repairing it. Higher is better.";

const COLUMNS = [
  { key: "tag", label: "Asset" },
  { key: "criticality", label: "Criticality" },
  { key: "workOrders", label: "WOs", num: true },
  { key: "failures", label: "Failures", num: true },
  { key: "mtbfHours", label: "MTBF", num: true, hint: MTBF_HINT },
  { key: "mttfHours", label: "MTTF", num: true, hint: MTTF_HINT },
  { key: "mttrHours", label: "MTTR", num: true, hint: MTTR_HINT },
  { key: "downtimeHours", label: "Downtime", num: true },
  { key: "costMillionIdr", label: "Cost (IDR M)", num: true },
  { key: "lastFailure", label: "Last failure" },
  { key: "watch", label: "Watch" },
];

// Chart series, stacked bottom to top.
const SERIES = [
  { key: "Corrective", label: "Corrective Maintenance", cls: "is-cm" },
  { key: "Preventive", label: "Preventive Maintenance", cls: "is-pm" },
  { key: "Predictive", label: "Predictive Maintenance", cls: "is-pdm" },
  { key: "Other", label: "Other (Inspection, Calibration, Overhaul)", cls: "is-oth" },
];
const seriesTotal = (m) => SERIES.reduce((n, sr) => n + m[sr.key], 0);

// Durations: hours below one day, days from 24 h up.
function duration(hours) {
  if (hours == null) return { value: "–", unit: "" };
  if (hours < 24) return { value: String(Math.round(hours * 10) / 10), unit: "h" };
  const days = hours / 24;
  const value = days >= 10 ? Math.round(days).toLocaleString("en-US") : String(Math.round(days * 10) / 10);
  return { value, unit: value === "1" ? "day" : "days" };
}
const durationText = (hours) => {
  const d = duration(hours);
  return d.unit ? `${d.value} ${d.unit}` : d.value;
};

const SUGGESTED_QUESTION = "Which asset has the shortest MTBF and what are its most common corrective failures?";

// "Ask AI why" on a repeat failure: names the equipment and every work order so retrieval finds them.
const whyQuestion = (r) =>
  `Why did ${r.what.toLowerCase()} happen ${r.count} times on ${r.tag} (${r.workOrders.join(", ")})? ` +
  "What is the common root cause and what should we change to stop it repeating?";

// The suggested question, narrowed to whatever the dashboard is filtered to.
function askQuestion(f) {
  if (!f || (!f.pid && !f.period && !f.type && !f.crit)) return SUGGESTED_QUESTION;
  const scope = [
    f.pidName ? `the ${f.pidName} (${f.pid})` : null,
    f.period ? f.periodLabel.toLowerCase() : null,
    f.type ? `${TYPE_LABELS[f.type] || f.type} work orders only` : null,
    f.crit === "high" ? "high critical assets" : f.crit === "other" ? "low and non critical assets" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `For ${scope}: which asset has the shortest MTBF and what are its most common corrective failures?`;
}

const critLabel = (c) => (c ? c.charAt(0) + c.slice(1).toLowerCase() : "–");
const critClass = (c) => (c === "HIGH CRITICAL" ? "is-high" : c === "LOW CRITICAL" ? "is-low" : "");
const fmt1 = (v) => (v == null ? "–" : Number(v).toFixed(1));
const monthLabel = (key) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
const periodLabel = (key) =>
  key
    ? new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
    : "";

// One flag per asset for the plant-wide extremes, so attention goes to the few that stand out.
function watchFlags(assets) {
  const pick = (key, dir) => assets.filter((a) => a[key] != null).sort((a, b) => (a[key] - b[key]) * dir)[0]?.tag;
  const flags = new Map();
  const add = (tag, tone, text) => tag && !flags.has(tag) && flags.set(tag, { tone, text });
  // Extremes only mean something when there are several assets to compare.
  if (assets.length >= 3) {
    add(pick("mtbfHours", 1), "red", "Shortest MTBF");
    add(pick("mttrHours", -1), "amber", "Longest repairs");
    add(pick("downtimeHours", -1), "amber", "Most downtime");
  }
  for (const a of assets) if (a.emergency > 0) add(a.tag, "amber", "Emergency WO");
  return flags;
}

// The chart is drawn at the pixel size of its box, so it fills the card height next to the drivers panel
// (no stretched text, no empty space under the legend).
function useBoxSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 220 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.max(280, Math.round(width)), h: Math.max(200, Math.round(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

function TrendChart({ monthly }) {
  const [hover, setHover] = useState(null);
  const [boxRef, { w: W, h: H }] = useBoxSize();
  const L = 30;
  const R = 8;
  const T = 10;
  const B = 40;
  const max = Math.max(5, Math.ceil(Math.max(...monthly.map(seriesTotal)) / 5) * 5);
  const ticks = Array.from({ length: max / 5 + 1 }, (_, i) => i * 5);
  const bw = (W - L - R) / monthly.length;
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const years = [...new Set(monthly.map((m) => m.month.slice(0, 4)))];
  const h = hover != null ? monthly[hover] : null;

  return (
    <div className="rel-chart">
      <div className="rel-chart-tip" aria-live="polite">
        {h && (
          <>
            <b>{periodLabel(h.month)}</b> · {SERIES.map((sr) => `${h[sr.key]} ${sr.key}`).join(", ")}
          </>
        )}
      </div>
      <div className="rel-chart-box" ref={boxRef}>
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Work orders per month by work type"
        >
          <defs>
            <pattern id="rel-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" className="rel-hatch-bg" />
              <line x1="0" y1="0" x2="0" y2="5" className="rel-hatch-line" />
            </pattern>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="rel-grid" />
              <text x={L - 6} y={y(v) + 4} textAnchor="end" className="rel-axis">
                {v}
              </text>
            </g>
          ))}
          {monthly.map((m, i) => {
            const x = L + i * bw + bw * 0.18;
            const w = bw * 0.64;
            const showLabel = i % 3 === 0 || i === monthly.length - 1;
            let base = 0;
            return (
              <g
                key={m.month}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                className={hover === i ? "is-hover" : ""}
              >
                <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
                {SERIES.map((sr) => {
                  const v = m[sr.key];
                  if (!v) return null;
                  const top = base + v;
                  const rect = (
                    <rect
                      key={sr.key}
                      x={x}
                      y={y(top)}
                      width={w}
                      height={y(base) - y(top)}
                      className={`rel-bar ${sr.cls}`}
                    />
                  );
                  base = top;
                  return rect;
                })}
                <title>{`${periodLabel(m.month)}: ${SERIES.map((sr) => `${m[sr.key]} ${sr.key}`).join(", ")}`}</title>
                {showLabel && (
                  <text x={x + w / 2} y={H - B + 16} textAnchor="middle" className="rel-axis">
                    {monthLabel(m.month)}
                  </text>
                )}
              </g>
            );
          })}
          {years.map((yr) => {
            const idx = monthly.map((m, i) => (m.month.startsWith(yr) ? i : -1)).filter((i) => i >= 0);
            const mid = L + ((idx[0] + idx.at(-1) + 1) / 2) * bw;
            return (
              <g key={yr}>
                <text x={mid} y={H - 6} textAnchor="middle" className="rel-axis rel-year">
                  {yr}
                </text>
                {idx[0] > 0 && (
                  <line x1={L + idx[0] * bw} x2={L + idx[0] * bw} y1={H - B + 4} y2={H - 4} className="rel-grid" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="rel-legend">
        {SERIES.map((sr) => (
          <span key={sr.key}>
            <i className={sr.cls} />
            {sr.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// Reliability mode: plant-wide figures computed by the backend from the knowledge-base work orders.
export default function ReliabilityPage({ sidebarOpen, onOpenSidebar, onNewChat, modeToggle, onOpenPid, onAsk }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState({ key: "mtbfHours", dir: 1 });
  const [source, setSource] = useState(null);

  // Every number comes from the backend for the current filters; the previous result stays on screen while loading.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getReliability(filters)
      .then(({ data }) => !cancelled && setData(data))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const filtered = Object.values(filters).some(Boolean);

  const flags = useMemo(() => (data ? watchFlags(data.assets) : new Map()), [data]);

  const openWo = async (ref) => {
    try {
      const { data: doc } = await api.getDocument(ref);
      if (doc)
        setSource({
          ref: doc.ref,
          title: doc.title,
          tag: doc.tag,
          status: doc.meta?.status,
          text: doc.body,
          image: doc.image,
        });
    } catch (e) {
      setError(e.message);
    }
  };

  let content;
  if (error) {
    content = (
      <div className="msg-error" role="alert">
        <IconAlert width={18} height={18} />
        <span>{error}</span>
      </div>
    );
  } else if (!data) {
    content = (
      <div className="thinking">
        <span className="thinking-dot" />
        <span className="thinking-text">Loading</span>
      </div>
    );
  } else {
    const assets = data.assets;
    const f = data.filters;
    const sum = (k) => assets.reduce((s, a) => s + (a[k] || 0), 0);
    const t = data.totals;

    const sorted = [...assets].sort((a, b) => {
      const va = sort.key === "watch" ? flags.get(a.tag)?.text || "~" : a[sort.key];
      const vb = sort.key === "watch" ? flags.get(b.tag)?.text || "~" : b[sort.key];
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
    });
    const maxDriver = Math.max(1, ...data.drivers.map((d) => d.workOrders));
    const noteParts = [
      f.pidName,
      f.period ? `${f.periodLabel} (${periodLabel(data.period.from)} to ${periodLabel(data.period.to)})` : null,
      f.type ? TYPE_LABELS[f.type] || f.type : null,
      f.crit ? CRIT_FILTERS.find((c) => c.id === f.crit)?.label : null,
    ].filter(Boolean);

    const kpis = [
      { label: "Work orders", value: t.workOrders, unit: "", note: "Total maintenance jobs in the selected filters." },
      {
        label: "MTBF",
        ...duration(t.mtbfHours),
        note: "Average time from one failure to the next including repair.",
        hint: MTBF_HINT,
      },
      {
        label: "MTTF",
        ...duration(t.mttfHours),
        note: "Average running time before an asset fails.",
        hint: MTTF_HINT,
      },
      {
        label: "MTTR",
        ...duration(t.mttrHours),
        note: "Average downtime needed to repair one failure.",
        hint: MTTR_HINT,
      },
      {
        label: "Recorded downtime",
        ...duration(sum("downtimeHours")),
        note: "Total time the plant stopped according to work orders.",
      },
      {
        label: "Maintenance cost",
        value: sum("costMillionIdr").toFixed(1),
        unit: "IDR M",
        note: "Total labor and material cost of the work orders.",
      },
    ];

    content = (
      <>
        <div className="ins-title">
          <h1>Reliability overview</h1>
        </div>

        <div className="rel-filters">
          <PillSelect
            className="rel-dd"
            placement="down"
            ariaLabel="P&ID set"
            label={data.pidSets.find((p) => p.code === filters.pid)?.name || "All P&ID sets"}
            value={filters.pid}
            onChange={(v) => setFilter("pid", v)}
            items={[{ value: "", title: "All P&ID sets" }, ...data.pidSets.map((p) => ({ value: p.code, title: p.name, desc: p.code }))]}
          />
          <PillSelect
            className="rel-dd"
            placement="down"
            ariaLabel="Period"
            label={[...PERIODS, ...data.years.map((y) => ({ id: y, label: y }))].find((p) => p.id === filters.period)?.label || "All time"}
            value={filters.period}
            onChange={(v) => setFilter("period", v)}
            items={[...PERIODS.map((p) => ({ value: p.id, title: p.label })), ...data.years.map((y) => ({ value: y, title: y }))]}
          />
          <PillSelect
            className="rel-dd"
            placement="down"
            ariaLabel="Work type"
            label={WORK_TYPES.find((t) => t.id === filters.type)?.label || "All work types"}
            value={filters.type}
            onChange={(v) => setFilter("type", v)}
            items={WORK_TYPES.map((t) => ({ value: t.id, title: t.label }))}
          />
          <div className="ins-chips" role="group" aria-label="Filter by criticality">
            {CRIT_FILTERS.map((c) => (
              <button
                key={c.id}
                type="button"
                className="ins-chip"
                aria-pressed={filters.crit === c.id}
                onClick={() => setFilter("crit", c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {filtered && (
          <div className="rel-filtered" aria-live="polite">
            <span>
              Filtered: <b>{noteParts.join(" · ")}</b>
              {loading && " · updating"}
            </span>
            <button type="button" onClick={() => setFilters(NO_FILTERS)}>
              Clear
            </button>
          </div>
        )}

        <div className="rel-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="rel-kpi" title={k.hint}>
              <small>{k.label}</small>
              <b>
                {k.value}
                {k.unit && <em>{k.unit}</em>}
              </b>
              <span>{k.note}</span>
            </div>
          ))}
        </div>

        <div className="rel-row2">
          <section className="rel-card">
            <div className="rel-card-hd">
              <h2>Work orders per month</h2>
              <small>by report date · {f.pidName || "all P&ID sets"}</small>
            </div>
            {data.monthly.some((m) => seriesTotal(m) > 0) ? (
              <TrendChart monthly={data.monthly} />
            ) : (
              <p className="rel-empty">No work orders in this selection.</p>
            )}
          </section>
          <section className="rel-card">
            <div className="rel-card-hd">
              <h2>Top maintenance drivers</h2>
              <small>work orders per asset</small>
            </div>
            <div className="rel-mix">
              {!data.drivers.length && <p className="rel-empty">No work orders in this selection.</p>}
              {data.drivers.map((d) => (
                <button
                  key={d.tag}
                  type="button"
                  className="rel-mixrow rel-driver"
                  onClick={() => d.pid && onOpenPid(d.pid)}
                  title={d.pid ? `Open ${d.pid} in Inspect` : undefined}
                >
                  <span>
                    <b>{d.tag}</b>
                    <small>{d.name}</small>
                  </span>
                  <span className="rel-track">
                    <i style={{ width: `${(d.workOrders / maxDriver) * 100}%` }} />
                  </span>
                  <b>{d.workOrders}</b>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="rel-card">
          <div className="rel-card-hd">
            <h2>Assets by reliability</h2>
            <small>Click a column to sort · click a row to open its P&amp;ID in Inspect</small>
          </div>
          <div className="rel-tablewrap">
            <table className="rel-table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={c.num ? "is-num" : ""}
                      aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                      title={c.hint}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSort((s) => (s.key === c.key ? { key: c.key, dir: -s.dir } : { key: c.key, dir: 1 }))
                        }
                      >
                        {c.label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!sorted.length && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="rel-empty">
                      No assets match these filters.
                    </td>
                  </tr>
                )}
                {sorted.map((a) => {
                  const f = flags.get(a.tag);
                  return (
                    <tr
                      key={a.tag}
                      className={a.pid ? "is-link" : ""}
                      onClick={() => a.pid && onOpenPid(a.pid)}
                      title={a.pid ? `Open ${a.pid} in Inspect` : undefined}
                    >
                      <td>
                        {a.pid ? (
                          <button
                            type="button"
                            className="rel-asset"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPid(a.pid);
                            }}
                          >
                            <b>{a.tag}</b>
                            <small title={a.name}>{a.name}</small>
                          </button>
                        ) : (
                          <span className="rel-asset">
                            <b>{a.tag}</b>
                            <small title={a.name}>{a.name}</small>
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`rel-crit ${critClass(a.criticality)}`}>{critLabel(a.criticality)}</span>
                      </td>
                      <td className="is-num">{a.workOrders}</td>
                      <td className="is-num">{a.failures}</td>
                      <td className="is-num">
                        {durationText(a.mtbfHours)}
                      </td>
                      <td className="is-num">{durationText(a.mttfHours)}</td>
                      <td className="is-num">{durationText(a.mttrHours)}</td>
                      <td className="is-num">{durationText(a.downtimeHours)}</td>
                      <td className="is-num">{fmt1(a.costMillionIdr)}</td>
                      <td>{a.lastFailure ? formatDate(a.lastFailure) : "–"}</td>
                      <td>
                        {f ? (
                          <span className={`rel-flag is-${f.tone}`}>{f.text}</span>
                        ) : (
                          <span className="rel-flag">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="rel-foot">
            <b>MTTF</b> = operating time ÷ failures (how long it runs before breaking down). <b>MTTR</b> = repair
            downtime ÷ repairs (how long a breakdown stops it). <b>MTBF</b> = MTTF + MTTR. A failure is a Corrective Maintenance work order or any work order marked as a breakdown (e.g. an Inspection or Overhaul raised because the equipment stopped); operating time assumes the asset runs around the clock, minus recorded downtime.
            Durations of 24 hours or more are shown in days. Method:{" "}
            <a
              href="https://www.faclon.com/industry-insights/understanding-mtbf-predictive-maintenance"
              target="_blank"
              rel="noreferrer"
            >
              Faclon, Understanding MTBF
            </a>
            .
          </p>
        </section>

        <div className="rel-row3">
          <section className="rel-card">
            <div className="rel-card-hd rel-card-hd-stack">
              <h2>Repeat failures</h2>
              <small>
                Same failure on the same equipment more than once{f.period ? `, ${f.periodLabel.toLowerCase()}` : ""}
              </small>
            </div>
            <div className="rel-reps">
              {!data.repeats.length && <p className="rel-empty">No repeat failures in this selection.</p>}
              {data.repeats.map((r) => (
                <div key={`${r.tag}-${r.what}`} className="rel-rep">
                  <div className="rel-rep-main">
                    <b>
                      {r.tag} · {r.what} {r.count} times
                    </b>
                    <p>
                      {r.dates.map((d) => periodLabel(String(d).slice(0, 7))).join(", ")}. {r.causes.join("; ")}.
                    </p>
                    <div className="rel-wos">
                      {r.workOrders.map((w) => (
                        <button key={w} type="button" className="citation" onClick={() => openWo(w)}>
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rel-rep-actions">
                    {r.pid && (
                      <button
                        type="button"
                        onClick={() => onOpenPid(r.pid, r.opl)}
                        title={r.opl ? `Open ${r.opl}` : `Open ${r.pid}`}
                      >
                        Open in Inspect
                      </button>
                    )}
                    <button type="button" onClick={() => onAsk(whyQuestion(r))}>
                      Ask AI why
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rel-card">
            <div className="rel-card-hd">
              <h2>Most expensive work orders</h2>
              <small>total cost, IDR</small>
            </div>
            {!data.topCost.length && (
              <p className="rel-empty">No work orders with a recorded cost in this selection.</p>
            )}
            {data.topCost.map((c) => (
              <button key={c.ref} type="button" className="rel-cost" onClick={() => openWo(c.ref)}>
                <span>
                  <b>
                    {c.ref} · {c.tag}
                  </b>
                  <small>
                    {c.title} · {TYPE_LABELS[c.workType] || c.workType}
                    {c.downtimeHours != null && ` · ${durationText(c.downtimeHours)} down`}
                  </small>
                </span>
                <span className="rel-cost-num">{fmt1(c.costMillionIdr)} M</span>
              </button>
            ))}
          </section>
        </div>

        <div className="rel-ask">
          <span>Ask about this data in Chat, e.g. “{askQuestion(f)}”</span>
          <button type="button" onClick={() => onAsk(askQuestion(f))}>
            Ask in Chat
            <IconChevronRight width={16} height={16} />
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="inspect">
      <ModeTopbar
        sidebarOpen={sidebarOpen}
        onOpenSidebar={onOpenSidebar}
        onNewChat={onNewChat}
        modeToggle={modeToggle}
      />
      <div className="ins-scroll">
        <div className="ins-inner rel-inner">{content}</div>
      </div>
      <SourceDrawer source={source} onClose={() => setSource(null)} />
    </div>
  );
}
