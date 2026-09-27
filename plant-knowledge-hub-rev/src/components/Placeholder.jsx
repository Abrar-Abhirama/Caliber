// Tabs not ported yet. Their code is in the plain-JS version: plant-knowledge-hub/app.js
const WHERE = {
  plant: "renderPlant() — asset tiles with live values and alarms",
  dataops: "renderDataOps() — ingestion pipeline, document table, data-quality findings (src/lib/quality.js is ready)",
  asset: "renderAsset() — one asset: live twin, documents, P&ID, work-order timeline",
  memory: "renderMemory() — failure themes, repeat-failure chains, recommendations, capture a lesson (hub.addLesson is ready)",
};
export default function Placeholder({view}){
  return (
    <div className="card">
      <h2 style={{marginTop: 0}}>Not ported to React yet</h2>
      <p>This tab still lives in the plain-JS demo. Port it from <span className="mono">{WHERE[view]}</span> in <span className="mono">plant-knowledge-hub/app.js</span>.</p>
      <p className="muted">Data and helpers are ready in <span className="mono">src/lib/</span>: assets and live twin (assets.js), search (search.js), findings (quality.js), and the loaded hub (hub.js).</p>
    </div>
  );
}
