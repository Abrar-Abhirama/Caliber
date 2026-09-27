// Data quality findings from the real dataset. Shown in Data Ops and as cautions on answers that cite these documents.
export const makeQuality = wos => {
  const missingWO = wos.filter(w => w.dt == null || w.cost == null);
  return [
  {sev:"high", t:`${missingWO.length} work orders have no downtime, cost or breakdown flag`, d:`Mostly the high-priority correctives that matter most for reliability KPIs, e.g. WO-240003 (vibration trip) and WO-240002 (hexane seal leak). MTBF and cost-of-failure figures are understated until these are completed in AIMS.`, refs:["WO-240003","WO-240002","WO-240004"], docs:[]},
  {sev:"high", t:"YD-2301 packing grade differs from the datasheet", d:`Datasheet specifies PTFE Piller 4526L gland packing, but WO-240029 records hardened PTFE 4505L at the feed-end gland. A wrong-grade spare may have been installed. Check the spare-part master against the BOM.`, refs:["WO-240029","WO-240028"], docs:["TJC-LLD-DS-YD-2301","OPL-YD-2301-02"]},
  {sev:"med", t:"All 8 P&IDs carry a placeholder drawing number", d:`Title blocks read "TJC-LLD-PID-XXXX". The hub resolved each drawing to its real number (e.g. TJC-LLD-PID-1201) from datasheet and interlock cross-references.`, refs:[], docs:["TJC-LLD-PID-1201","TJC-LLD-DS-GA-1201A"]},
  {sev:"med", t:"GA-1201A OPL hazard note disagrees with the datasheet", d:`OPL safety notes say n-Hexane "up to 16 barg / 80 °C"; datasheet pumping temperature is 40 °C. Confirm the operating envelope and correct whichever is wrong.`, refs:[], docs:["OPL-GA-1201A-01","TJC-LLD-DS-GA-1201A"]},
  {sev:"med", t:"GA-1201A OPL numbering has gaps", d:`OPL-GA-1201A-04 and -06 are missing while every other asset has 01 to 07. Either they were never issued or they are outside the EDMS.`, refs:[], docs:["OPL-GA-1201A-03","OPL-GA-1201A-05"]},
  {sev:"low", t:"OPL acceptance column is misaligned with steps", d:`In OPL-GA-1201A-03, step 4 "Target angular < 0.05 mm/100 mm" is paired with "No leak / smooth operation". The template text shifted by one row, so acceptance criteria cannot be trusted as written.`, refs:[], docs:["OPL-GA-1201A-03"]},
  {sev:"low", t:"Drawings are still Rev 0 Issued for Construction", d:`GA drawings and plot plans are Rev 0 IFC (Jun 2026) while datasheets are Rev 3 Issued for Operation and maintenance history starts Jun 2024. As-built status is unclear.`, refs:[], docs:["TJC-LLD-GA-GA-1201A","TJC-LLD-PP-GA-1201A"]}
];
};

export const cautionsFor = (quality, refs) => quality.filter(f => f.docs.some(d => refs.includes(d)) || f.refs.some(r => refs.includes(r)));
