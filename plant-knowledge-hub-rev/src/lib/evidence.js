// Evidence score: how well the cited sources back the answer (count, kind, approval, open data findings)
export function evidence(hub, refs, cautions){
  const kinds = new Set(); let approved = 0, docs = 0;
  for (const r of refs) {
    if (r.startsWith("LIVE-")) { kinds.add("live"); continue; }
    if (hub.woById[r]) { kinds.add("history"); continue; }
    if (hub.lessons.find(l => l.id === r)) { kinds.add("lesson"); continue; }
    const d = hub.byDoc[r]; if (!d) continue;
    if (d.type === "Derived" || d.type === "Asset summary") { kinds.add("history"); continue; }
    docs++;
    kinds.add(d.type === "OPL" ? "procedure" : d.type === "Uploaded" ? "uploaded" : "design");
    if (/Approved|Operation|Issued/.test(d.status || "")) approved++;
  }
  let s = Math.min(36, refs.length * 9) + Math.min(36, kinds.size * 11) + (docs ? (approved / docs) * 20 : 8) - cautions.length * 5 - (kinds.has("uploaded") ? 10 : 0);
  s = Math.max(10, Math.min(96, Math.round(s)));
  const f = [[`${refs.length} sources cited`, refs.length >= 3 ? "ok" : "warn"]];
  if (kinds.has("design")) f.push(["Design basis (datasheet / interlock)", "ok"]);
  if (kinds.has("procedure")) f.push(["Approved procedure (OPL)", "ok"]);
  if (kinds.has("history")) f.push(["Maintenance history", "ok"]);
  if (kinds.has("live")) f.push(["Matches live data", "ok"]);
  if (kinds.has("lesson")) f.push(["Unreviewed lesson used", "warn"]);
  if (kinds.has("uploaded")) f.push(["Unapproved upload used", "warn"]);
  if (docs && approved < docs) f.push([`${docs - approved} source(s) not approved`, "warn"]);
  if (cautions.length) f.push([`${cautions.length} open data finding(s)`, "warn"]);
  return {score: s, factors: f};
}
