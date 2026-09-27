// Small shared pieces
export const Badge = ({b}) => b ? <span className={`badge ${b.tone}`}>{b.label}</span> : null;

// Highlight query terms inside a passage
export function Highlight({text, qset}){
  const ws = (qset || []).filter(w => w.length > 2).sort((a, b) => b.length - a.length).slice(0, 14).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (!ws.length) return <>{text}</>;
  const re = new RegExp("\\b(" + ws.join("|") + ")", "gi");
  return <>{String(text).split(re).map((p, i) => i % 2 ? <mark key={i}>{p}</mark> : p)}</>;
}

// Replace [DOC-ID] citations with numbered buttons that jump to the source
export function Cited({text, sources, onCite}){
  return <>{String(text).split(/\[([A-Za-z0-9#\-]+)\]/).map((p, i) => {
    if (i % 2 === 0) return p;
    const n = sources.findIndex(s => s.ref === p) + 1;
    return n ? <button key={i} className="cite" title={p} onClick={() => onCite(n)}>{n}</button> : null;
  })}</>;
}

export const confColor = c => c >= 80 ? "var(--ok)" : c >= 55 ? "var(--warn)" : "var(--crit)";
