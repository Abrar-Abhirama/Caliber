import { knowledgeService } from "./knowledgeService.js";

// Inspect mode: groups the knowledge base into P&ID sets.
// A set is one P&ID drawing (TJC-LLD-PID-xxxx) plus everything linked to it:
// - the asset whose `pid` field points at the drawing,
// - every document and work order filed under that asset's equipment tag,
// - every OPL whose `pid_ref` is the drawing.
// Everything comes from the knowledge-base Markdown; nothing is invented here.

// Tags on a drawing that are equipment (pumps, drums, exchangers...) rather than instruments.
const EQUIPMENT_TAG = /^(GA|GB|EA|FA|DA|DC|KC|YD|CT|LV)-\d{4}[A-Z]?$/;

const WORK_TYPE_LABELS = {
  Preventive: "Preventive Maintenance",
  Corrective: "Corrective Maintenance",
  Predictive: "Predictive Maintenance",
};

// Words too generic to link a work order to an OPL by its title.
const GENERIC_WORDS = new Set(
  "check checks control inspection management monitoring operation procedure system verification testing test after before during level response replacement overview safety handling schedule health performance start-up start steps step from with and the pump motor valve compressor fan drum heater dryer reactor tower cooling hexane service water gas cold hot action closed fail reduction trend".split(
    " "
  )
);

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bLp\b/g, "LP");

const woDate = (meta) => meta.completion_date || meta.start_date || meta.report_date || null;

const isUnfinished = (meta) => !/^(completed|closed|cancel)/i.test(String(meta.status || ""));

// Split a Markdown body into { "1. Purpose": "...", ... } by "## " headings.
function sections(body) {
  const out = {};
  for (const part of body.split(/^##\s+/m).slice(1)) {
    const nl = part.indexOf("\n");
    out[part.slice(0, nl).trim()] = part.slice(nl + 1).trim();
  }
  return out;
}

const findSection = (secs, prefix) => {
  const key = Object.keys(secs).find((k) => k.replace(/^\d+\.\s*/, "").toLowerCase().startsWith(prefix));
  return key ? secs[key] : "";
};

const bullets = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[-*]\s+/.test(l))
    .map((l) => l.replace(/^[-*]\s+/, ""));

const paragraphs = (text) =>
  text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("|") && !/^[-*]\s/.test(p));

// Markdown table rows (header and separator dropped).
function tableRows(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().startsWith("|"));
  return lines
    .slice(2)
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
    );
}

function tableField(body, field) {
  const m = body.match(new RegExp(`^\\|\\s*${field}\\s*\\|\\s*(.+?)\\s*\\|`, "mi"));
  return m ? m[1] : null;
}

class InspectService {
  constructor() {
    this.built = false;
    this.sets = [];
    this.setByPid = new Map();
    this.opls = new Map();
    this.wos = new Map();
  }

  ensure() {
    if (this.built || !knowledgeService.isInitialized) return;
    const docs = [...knowledgeService.docMap.values()];

    for (const d of docs) {
      if (d.meta.record_type === "work_order") this.wos.set(d.ref, this.workOrder(d));
    }

    const assets = docs.filter((d) => d.meta.record_type === "asset" && d.meta.pid);
    for (const asset of assets) {
      const pid = asset.meta.pid;
      const tag = asset.meta.equipment_tag;
      const pidDoc = knowledgeService.docMap.get(pid);
      const linkedTags = pidDoc ? [...pidDoc.body.matchAll(/`([A-Z]{1,5}-\d{3,5}[A-Z]?)`/g)].map((m) => m[1]) : [];
      const otherEquipment = [...new Set(linkedTags.filter((t) => EQUIPMENT_TAG.test(t) && t !== tag))];

      // Every record in the knowledge base that belongs to this drawing.
      const refs = new Set(
        docs
          .filter((d) => d.tag === tag || d.meta.pid_ref === pid || d.ref === pid)
          .map((d) => d.ref)
      );

      const oplDocs = docs
        .filter((d) => d.meta.doc_type === "OPL" && (d.meta.pid_ref === pid || d.tag === tag))
        .sort((a, b) => a.ref.localeCompare(b.ref));
      const woList = [...this.wos.values()].filter((w) => w.equipment === tag);

      const [areaCode, areaName] = String(asset.meta.area || "").split(/\s+-\s+/);
      const firstOpl = oplDocs[0];
      const unitField = firstOpl ? tableField(firstOpl.body, "Area / unit") : null;
      const systemName = unitField ? unitField.split(/\s+-\s+/)[1] : null;

      const set = {
        code: pid,
        name: titleCase(systemName || asset.meta.name),
        area: areaCode || null,
        areaName: titleCase(areaName),
        asset: tag,
        assetName: titleCase(asset.meta.name),
        assetType: asset.meta.type || null,
        equipment: [tag, ...otherEquipment],
        instruments: linkedTags.filter((t) => !EQUIPMENT_TAG.test(t)),
        criticality: asset.meta.criticality || null,
        interlock: asset.meta.interlock ? `${asset.meta.interlock}${asset.meta.sil ? ` (${asset.meta.sil})` : ""}` : null,
        image: pidDoc?.image || null,
        pidStatus: pidDoc?.meta?.status || null,
        oplCount: oplDocs.length,
        woCount: woList.length,
        unfinished: woList.filter((w) => w.unfinished).length,
        docCount: [...refs].filter((r) => knowledgeService.docMap.get(r)?.meta.record_type === "document").length,
        refs,
        oplRefs: oplDocs.map((d) => d.ref),
      };
      this.sets.push(set);
      this.setByPid.set(pid, set);

      for (const d of oplDocs) this.opls.set(d.ref, this.opl(d, set));
    }

    this.sets.sort((a, b) => a.code.localeCompare(b.code));
    this.built = true;
  }

  workOrder(d) {
    const m = d.meta;
    const secs = sections(d.body);
    return {
      ref: d.ref,
      date: woDate(m),
      title: m.problem || String(d.title).replace(/^WO-\d+\s*-\s*[A-Z0-9-]+\s*-\s*/, ""),
      workType: m.work_type || null,
      typeLabel: WORK_TYPE_LABELS[m.work_type] || m.work_type || "Other",
      equipment: m.equipment_tag,
      note: [secs["Root cause"], secs["Corrective action"]].filter(Boolean).join(" · "),
      status: m.status || "Unknown",
      unfinished: isUnfinished(m),
      priority: m.priority || null,
      text: `${d.title}\n${d.body}`.toLowerCase(),
    };
  }

  opl(d, set) {
    const secs = sections(d.body);
    const m = d.meta;

    const problems = tableRows(findSection(secs, "common problems")).map(([symptom, cause, action, wo]) => ({
      symptom,
      cause,
      action,
      wo: wo && /WO-\d+/.test(wo) ? wo.match(/WO-\d+/)[0] : null,
    }));

    // Work orders linked to this OPL: the ones it cites, plus work orders on the same
    // equipment whose text mentions the OPL's topic (instrument tag or a specific title word).
    const cited = new Set([...d.body.matchAll(/WO-\d{6}/g)].map((x) => x[0]));
    const titleTags = [...String(m.title).matchAll(/[A-Z]{1,5}-\d{4}[A-Z]?/g)]
      .map((x) => x[0])
      .filter((t) => t !== set.asset)
      .map((t) => t.toLowerCase());
    const words = String(m.title)
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .match(/[a-z][a-z0-9]{3,}/g)
      ?.filter((w) => !GENERIC_WORDS.has(w)) || [];
    const linked = [...this.wos.values()]
      .filter((w) => w.equipment === set.asset)
      .filter(
        (w) =>
          cited.has(w.ref) ||
          titleTags.some((t) => w.text.includes(t)) ||
          words.some((word) => new RegExp(`\\b${word.replace(/s$/, "")}`).test(w.text))
      )
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const safetyText = findSection(secs, "safety");
    const procedure = tableRows(findSection(secs, "procedure")).map(([step, action, check]) => ({
      step: Number(step) || step,
      action,
      check: check || null,
    }));

    return {
      code: d.ref,
      title: m.title,
      pid: set.code,
      equipment: m.equipment_tag,
      instruments: m.instrument_tags || [],
      classification: m.classification || null,
      discipline: m.discipline || null,
      status: m.status || null,
      revision: m.revision || null,
      date: m.date || null,
      reviewedBy: m.reviewed_by || null,
      approvedBy: m.approved_by || null,
      relatedInterlock: m.related_interlock || null,
      image: d.image || null,
      objective: paragraphs(findSection(secs, "purpose")),
      safety: {
        notes: paragraphs(safetyText),
        items: bullets(safetyText),
      },
      tools: bullets(findSection(secs, "tools")),
      procedure,
      problems,
      keyLearning: bullets(findSection(secs, "key learning")),
      citedWorkOrders: [...cited],
      linkedWorkOrders: linked.map(({ text, ...w }) => w),
    };
  }

  summary(set) {
    const { refs, oplRefs, ...rest } = set;
    return rest;
  }

  listSets() {
    this.ensure();
    return this.sets.map((s) => this.summary(s));
  }

  getSet(pid) {
    this.ensure();
    const set = this.setByPid.get(pid);
    if (!set) return null;
    const opls = set.oplRefs.map((r) => this.opls.get(r)).map((o) => ({
      code: o.code,
      title: o.title,
      equipment: o.equipment,
      instruments: o.instruments,
      classification: o.classification,
      discipline: o.discipline,
      status: o.status,
      woCount: o.linkedWorkOrders.length,
      unfinished: o.linkedWorkOrders.filter((w) => w.unfinished).length,
      lastDate: o.linkedWorkOrders[0]?.date || null,
    }));
    return { ...this.summary(set), opls };
  }

  getOpl(code) {
    this.ensure();
    return this.opls.get(code) || null;
  }

  // The OPL in a P&ID set that cites the most of these work orders (null if none cites any).
  oplCiting(woRefs, pid) {
    this.ensure();
    const set = this.setByPid.get(pid);
    if (!set) return null;
    let best = null;
    let bestHits = 0;
    for (const code of set.oplRefs) {
      const hits = this.opls.get(code).citedWorkOrders.filter((r) => woRefs.includes(r)).length;
      if (hits > bestHits) {
        best = code;
        bestHits = hits;
      }
    }
    return best;
  }

  // Retrieval scope for the scoped chat: the refs a P&ID set may return, and the refs to favour.
  scopeFor(pid, oplCode) {
    this.ensure();
    const set = this.setByPid.get(pid);
    if (!set) return null;
    const opl = oplCode ? this.opls.get(oplCode) : null;
    if (oplCode && (!opl || opl.pid !== pid)) return null;
    const boost = opl ? new Set([opl.code, ...opl.linkedWorkOrders.map((w) => w.ref)]) : new Set();
    return { pid, opl: opl?.code || null, asset: set.asset, allowed: set.refs, boost };
  }
}

export const inspectService = new InspectService();
