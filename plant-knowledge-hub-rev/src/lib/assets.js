// Equipment config and the simulated digital twin (live values are simulated for the demo).
// Alarm and trip limits come from the interlock sheets and OPLs named in each tag's `src`.
function rng(seed){ let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export const ASSETS = {
  "GA-1201A": {name:"Hexane Feed Pump", kind:"Centrifugal Pump (API 610 OH2)", seq:"SEQ-1201", sil:"SIL 1", standby:"GA-1201B (auto-start on trip)", tags:[
    {id:"VT-1201", d:"DE bearing vibration", u:"mm/s RMS", base:3.3, n:.12, dir:"hi", alarm:4.5, alarmSrc:"OPL-GA-1201A-07", trip:7.1, tripTag:"VSHH-1201", vote:"1oo2", src:"TJC-LLD-IL-GA-1201A", ramp:{start:108, to:5.3}, dp:1},
    {id:"TT-1201", d:"DE bearing temperature", u:"°C", base:64, n:.8, dir:"hi", trip:95, tripTag:"TSHH-1201", vote:"1oo1", src:"TJC-LLD-IL-GA-1201A", ramp:{start:112, to:79}, dp:0},
    {id:"PT-1201", d:"Suction pressure", u:"barg", base:1.85, n:.05, dir:"lo", trip:0.5, tripTag:"PSLL-1201", vote:"2oo3", src:"TJC-LLD-IL-GA-1201A", dp:2},
    {id:"FIT-1201", d:"Discharge flow", u:"m³/h", base:41, n:.9, dir:"lo", trip:9, tripTag:"FSLL-1201", vote:"1oo1", src:"TJC-LLD-IL-GA-1201A", dp:1},
    {id:"PDI-1201", d:"Seal flush dP (API Plan 11)", u:"bar", base:1.92, n:.05, dir:"lo", trip:1.5, tripTag:"Start permissive", vote:"—", src:"OPL-GA-1201A-01", dp:2, band:"1.5–2.5 bar"},
    {id:"Motor", d:"Motor current (rated 56 A)", u:"A", base:48.5, n:.6, dir:"hi", trip:56, tripTag:"MPR-1201", vote:"1oo1", src:"TJC-LLD-DS-GA-1201A", dp:1}
  ]},
  "YD-2301": {name:"Polymer Fluid Bed Dryer", kind:"Rotary Steam-Tube Dryer", seq:"SEQ-5500", sil:"SIL 2", tags:[
    {id:"TT-2301", d:"Outlet temperature", u:"°C", base:104, n:1.1, dir:"hi", trip:125, tripTag:"TSHH-2301", vote:"1oo1", src:"TJC-LLD-IL-YD-2301", dp:0},
    {id:"FT-2302", d:"N₂ purge flow", u:"kg/h", base:318, n:6, dir:"lo", trip:200, tripTag:"FSLL-2302", vote:"2oo3", src:"TJC-LLD-IL-YD-2301", dp:0},
    {id:"AT-2307", d:"Vent O₂", u:"%", base:2.1, n:.15, dir:"hi", trip:8, tripTag:"ASHH-2307", vote:"1oo2", src:"TJC-LLD-IL-YD-2301", dp:1},
    {id:"ST-2305", d:"Drum speed", u:"rpm", base:4.0, n:.03, dir:"lo", trip:1, tripTag:"SSLL-2305", vote:"1oo1", src:"TJC-LLD-IL-YD-2301", dp:2}
  ]},
  "DC-3401A": {name:"Catalyst Reduction Reactor", kind:"Fixed-Bed Reactor (Pd catalyst)", seq:"SEQ-3401", sil:"SIL 2", tags:[
    {id:"TE-3401", d:"Bed temperature (max of 8)", u:"°C", base:196, n:1.4, dir:"hi", trip:230, tripTag:"TSHH-3401", vote:"2oo3", src:"TJC-LLD-IL-DC-3401A", dp:0},
    {id:"PT-3404", d:"Reactor pressure", u:"barg", base:1.95, n:.04, dir:"hi", trip:5, tripTag:"PSHH-3404", vote:"1oo2", src:"TJC-LLD-IL-DC-3401A", dp:2},
    {id:"AI-3401", d:"Outlet O₂", u:"ppm", base:14, n:1.5, dir:"hi", trip:100, tripTag:"AI-3401", vote:"1oo1", src:"TJC-LLD-IL-DC-3401A", dp:0},
    {id:"FT-17343", d:"N₂ carrier flow", u:"kg/h", base:262, n:4, dir:"lo", trip:150, tripTag:"FSLL-17343", vote:"1oo1", src:"TJC-LLD-IL-DC-3401A", dp:0}
  ]},
  "KC-4501": {name:"Recycle Gas Compressor", kind:"Reciprocating Compressor (2-stage)", seq:"SEQ-4501", sil:"SIL 2", tags:[
    {id:"PT-4504", d:"Lube oil pressure", u:"barg", base:2.6, n:.05, dir:"lo", trip:1.5, tripTag:"PSLL-4504", vote:"2oo3", src:"TJC-LLD-IL-KC-4501", dp:2},
    {id:"TT-4503", d:"Discharge temperature", u:"°C", base:112, n:1.2, dir:"hi", trip:140, tripTag:"TSHH-4503", vote:"1oo1", src:"TJC-LLD-IL-KC-4501", dp:0},
    {id:"PT-4502", d:"Discharge pressure", u:"barg", base:12.4, n:.12, dir:"hi", trip:14, tripTag:"PSHH-4502", vote:"1oo2", src:"TJC-LLD-IL-KC-4501", dp:1},
    {id:"VT-4505", d:"Crosshead vibration", u:"mm/s", base:4.8, n:.2, dir:"hi", trip:11, tripTag:"VSHH-4505", vote:"1oo2", src:"TJC-LLD-IL-KC-4501", dp:1}
  ]},
  "EA-5601": {name:"Solvent Heater", kind:"Shell & Tube Heat Exchanger (BEM)", seq:"Control loop only", sil:"N/A", tags:[
    {id:"TIC-5602", d:"Solvent outlet temperature (SP 95)", u:"°C", base:94.6, n:.4, dir:"hi", trip:null, src:"TJC-LLD-IL-EA-5601", dp:1},
    {id:"PDT-5605", d:"Tube-side dP (fouling)", u:"bar", base:0.48, n:.01, dir:"hi", alarm:0.7, alarmSrc:"TJC-LLD-IL-EA-5601", trip:null, src:"TJC-LLD-IL-EA-5601", dp:2},
    {id:"FI-5603", d:"MP steam flow (design 3100)", u:"kg/h", base:2950, n:25, dir:"hi", trip:null, src:"TJC-LLD-DS-EA-5601", dp:0}
  ]},
  "LV-6701": {name:"Separator Level Control Valve", kind:"Globe Control Valve, Fisher 667 / DVC6200", seq:"SEQ-6701", sil:"SIL 1", tags:[
    {id:"LT-6710", d:"LP separator level", u:"%", base:52, n:1.5, dir:"hi", trip:85, tripTag:"LSHH-6710", vote:"1oo2", src:"TJC-LLD-IL-LV-6701", dp:0},
    {id:"ZT-6701", d:"Valve position", u:"%", base:46, n:1.2, dir:"hi", trip:null, src:"TJC-LLD-DS-LV-6701", dp:0},
    {id:"PI-6702", d:"Instrument air", u:"barg", base:1.4, n:.02, dir:"lo", trip:1.0, tripTag:"PSL-6702", vote:"1oo1", src:"TJC-LLD-IL-LV-6701", dp:2}
  ]},
  "CT-7801": {name:"Cooling Tower Cell Fan", kind:"Induced-Draft Axial Fan", seq:"SEQ-7801", sil:"SIL 1", tags:[
    {id:"VT-7802", d:"Fan / gearbox vibration", u:"mm/s", base:3.6, n:.15, dir:"hi", trip:9, tripTag:"VSHH-7802", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:1},
    {id:"TT-7803", d:"Gearbox oil temperature", u:"°C", base:62, n:.6, dir:"hi", trip:90, tripTag:"TSHH-7803", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:0},
    {id:"PT-7807", d:"Gearbox oil pressure", u:"barg", base:1.6, n:.04, dir:"lo", trip:0.8, tripTag:"PSL-7807", vote:"1oo1", src:"TJC-LLD-IL-CT-7801", dp:2}
  ]},
  "FA-8901": {name:"Reflux Accumulator Drum", kind:"Horizontal Pressure Vessel", seq:"SEQ-8901", sil:"SIL 1", tags:[
    {id:"LT-8901", d:"Drum level", u:"%", base:51, n:1.3, dir:"hi", trip:85, tripTag:"LSHH-8901", vote:"1oo2", src:"TJC-LLD-IL-FA-8901", dp:0},
    {id:"PT-8902", d:"Drum pressure", u:"barg", base:3.5, n:.05, dir:"hi", trip:8, tripTag:"PSHH-8902", vote:"1oo2", src:"TJC-LLD-IL-FA-8901", dp:2},
    {id:"LT-8903", d:"Boot water level", u:"%", base:34, n:1.2, dir:"hi", trip:null, src:"TJC-LLD-DS-FA-8901", dp:0}
  ]}
};

export const TAGS = Object.keys(ASSETS);
export const HOURS = 168;

// seeded 7-day history, then live ticks
for (const [ai, t] of TAGS.entries()) {
  ASSETS[t].tags.forEach((g, gi) => {
    const r = rng(1000 + ai * 50 + gi);
    g.hist = [];
    for (let i = 0; i < HOURS; i++) {
      let v = g.base + (r() - .5) * 2 * g.n;
      if (g.ramp && i >= g.ramp.start) { const k = (i - g.ramp.start) / (HOURS - 1 - g.ramp.start); v += (g.ramp.to - g.base) * Math.pow(k, 1.35); }
      g.hist.push(v);
    }
    if (g.ramp) g.hist[HOURS - 1] = g.ramp.to;
    g.v = g.hist[HOURS - 1];
    g.rr = r;
  });
}

export function tickTwin(){
  for (const t of TAGS) for (const g of ASSETS[t].tags) {
    const drift = g.ramp ? (g.id.startsWith("VT") ? .0025 : .02) : 0;
    const target = (g.ramp ? g.v + drift : g.base);
    g.v = g.v + (target - g.v) * .3 + (g.rr() - .5) * g.n * .5 + drift;
  }
}

export function tagState(g){
  if (g.trip != null) {
    if (g.dir === "hi" && g.v >= g.trip) return "crit";
    if (g.dir === "lo" && g.v <= g.trip) return "crit";
  }
  if (g.alarm != null && g.dir === "hi" && g.v >= g.alarm) return "warn";
  return "ok";
}

export const fmtV = g => g.v.toFixed(g.dp);

// A text snapshot of the live values, given to Claude as a source
export function liveChunk(t){
  const a = ASSETS[t];
  const lines = a.tags.map(g => {
    const h = g.hist; const wk = g.v - h[0]; const d3 = g.v - h[HOURS - 72];
    return `${g.id} ${g.d} = ${fmtV(g)} ${g.u}` + (g.alarm != null ? `, alarm ${g.alarm}` : "") + (g.trip != null ? `, trip ${g.dir === "hi" ? ">" : "<"} ${g.trip} (${g.tripTag})` : "") + (Math.abs(d3) > g.n * 4 ? `, changed ${d3 > 0 ? "+" : ""}${d3.toFixed(g.dp || 1)} ${g.u} in last 3 days (${wk > 0 ? "+" : ""}${wk.toFixed(g.dp || 1)} in 7 days)` : ", stable over 7 days");
  });
  return {id: "LIVE-" + t, ref: "LIVE-" + t, kind: "live", tag: t, text: `Live digital-twin snapshot for ${t} ${a.name} at ${new Date().toLocaleString("en-GB")}: ` + lines.join("; ") + "."};
}
