import fs from "fs";
import path from "path";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";

const STOP_WORDS = new Set(
  "the a an and or of to in on for is are be at by with from as it this that what which when how do does i we should my our me can if into than then there their them any all was were has have had not no per vs about".split(" ")
);

const ASSET_TAGS = [
  "GA-1201A", "YD-2301", "DC-3401A", "KC-4501",
  "EA-5601", "LV-6701", "CT-7801", "FA-8901"
];

const ASSET_EQUIPMENT_MAP = [
  { tag: "FA-8901", names: ["reflux accumulator drum", "reflux accumulator", "accumulator drum", "reflux drum", "tangki reflux"] },
  { tag: "GA-1201A", names: ["hexane feed pump", "feed pump", "pompa hexane", "pompa umpan"] },
  { tag: "YD-2301", names: ["polymer dryer", "dryer", "pengering polimer"] },
  { tag: "DC-3401A", names: ["loop reactor", "reactor", "reaktor"] },
  { tag: "KC-4501", names: ["recycle compressor", "compressor", "kompresor"] },
  { tag: "EA-5601", names: ["solvent heater", "heater", "pemanas solvent"] },
  { tag: "LV-6701", names: ["level control valve", "control valve", "katup kontrol"] },
  { tag: "CT-7801", names: ["cooling tower cell fan", "cooling tower fan", "cooling tower", "fan cell", "menara pendingin"] },
];

function tokenize(text) {
  const words = [];
  const matches = String(text).toLowerCase().match(/[a-z0-9][a-z0-9.\-]*[a-z0-9]|[a-z0-9]/g) || [];
  for (const w of matches) {
    if (STOP_WORDS.has(w)) continue;
    words.push(w);
    if (w.includes("-")) {
      for (const p of w.split("-")) {
        if (p.length > 1 && !STOP_WORDS.has(p)) words.push(p);
      }
    }
    if (w.length > 4 && w.endsWith("s")) words.push(w.slice(0, -1));
  }
  return words;
}

function levenshtein(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function parseMarkdownFile(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const yamlBlock = match[1];
  const body = match[2];
  const meta = {};

  for (const line of yamlBlock.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (!key) continue;
    try {
      meta[key] = JSON.parse(val);
    } catch {
      meta[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { meta, body };
}

class KnowledgeService {
  constructor() {
    this.kbPath = config.knowledgeBasePath;
    this.isInitialized = false;
    this.chunks = [];
    this.docMap = new Map();
    this.DF = new Map();
    this.avgChunkLen = 0;
    this.vocab = [];
    this.synonyms = {
      en_synonyms: {},
      id_map: {},
      id_phrases: [],
      id_stop: new Set(),
    };
  }

  async initialize() {
    try {
      logger.info(`Linking to knowledge base at: ${this.kbPath}`);
      if (!fs.existsSync(this.kbPath)) {
        logger.warn(`Knowledge base directory not found at ${this.kbPath}`);
        return;
      }

      this.loadSynonyms();
      this.loadAndIndexMarkdownFiles();

      this.isInitialized = true;
      logger.info(
        `Knowledge base initialized: ${this.docMap.size} documents, ${this.chunks.length} search passages indexed.`
      );
    } catch (error) {
      logger.error("Failed to initialize knowledge base:", error);
    }
  }

  loadSynonyms() {
    const synPath = path.join(this.kbPath, "search", "synonyms.json");
    if (fs.existsSync(synPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(synPath, "utf-8"));
        this.synonyms.en_synonyms = raw.en_synonyms || {};
        this.synonyms.id_map = raw.id_map || {};
        this.synonyms.id_phrases = raw.id_phrases || [];
        this.synonyms.id_stop = new Set(raw.id_stop || []);
        logger.info("Loaded search vocabulary & Indonesian synonym map.");
      } catch (e) {
        logger.warn("Could not parse synonyms.json:", e.message);
      }
    }
  }

  loadAndIndexMarkdownFiles() {
    const documentsDir = path.join(this.kbPath, "documents");
    const workOrdersDir = path.join(this.kbPath, "work-orders");
    const assetsDir = path.join(this.kbPath, "assets");
    const failuresFile = path.join(this.kbPath, "failures", "patterns.md");
    const qualityFile = path.join(this.kbPath, "quality", "findings.md");

    const filesToRead = [];

    // Scan documents
    if (fs.existsSync(documentsDir)) {
      for (const assetTag of fs.readdirSync(documentsDir)) {
        const sub = path.join(documentsDir, assetTag);
        if (fs.statSync(sub).isDirectory()) {
          for (const f of fs.readdirSync(sub)) {
            if (f.endsWith(".md")) filesToRead.push(path.join(sub, f));
          }
        }
      }
    }

    // Scan work orders
    if (fs.existsSync(workOrdersDir)) {
      for (const assetTag of fs.readdirSync(workOrdersDir)) {
        const sub = path.join(workOrdersDir, assetTag);
        if (fs.statSync(sub).isDirectory()) {
          for (const f of fs.readdirSync(sub)) {
            if (f.endsWith(".md")) filesToRead.push(path.join(sub, f));
          }
        }
      }
    }

    // Scan assets
    if (fs.existsSync(assetsDir)) {
      for (const f of fs.readdirSync(assetsDir)) {
        if (f.endsWith(".md")) filesToRead.push(path.join(assetsDir, f));
      }
    }

    if (fs.existsSync(failuresFile)) filesToRead.push(failuresFile);
    if (fs.existsSync(qualityFile)) filesToRead.push(qualityFile);
    const indexFile = path.join(this.kbPath, "index.md");
    if (fs.existsSync(indexFile)) filesToRead.push(indexFile);

    const chunks = [];

    for (const filePath of filesToRead) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const { meta, body } = parseMarkdownFile(content);

        const ref =
          meta.doc_id ||
          meta.wo_number ||
          (meta.equipment_tag ? `ASSET-${meta.equipment_tag}` : path.basename(filePath, ".md"));

        const tag = meta.equipment_tag || null;
        let title = meta.title || meta.problem;
        if (!title) {
          const h1Match = body.match(/^#\s+(.+)$/m);
          title = h1Match ? h1Match[1].trim() : ref;
        }

        let imageUrl = null;
        if (meta.image) {
          const imgBase = path.basename(meta.image);
          if (fs.existsSync(path.join(this.kbPath, "images", imgBase))) {
            imageUrl = `/api/images/${imgBase}`;
          }
        }
        if (!imageUrl) {
          const directImg = `${ref}.png`;
          if (fs.existsSync(path.join(this.kbPath, "images", directImg))) {
            imageUrl = `/api/images/${directImg}`;
          }
        }

        this.docMap.set(ref, {
          ref,
          meta,
          title,
          tag,
          image: imageUrl,
          filePath,
          body,
        });

        let metaSummary = "";
        if (meta.record_type === "work_order") {
          const eqName = meta.equipment_name || "";
          metaSummary = `Work Order: ${ref} | Asset: ${tag} (${eqName}) | Problem: ${title} | Type: ${meta.work_type || ""} | Priority: ${meta.priority || ""} | Completion Date: ${meta.completion_date || ""} | Start Date: ${meta.start_date || ""} | Report Date: ${meta.report_date || ""} | Labor Hours: ${meta.labor_hours ?? "N/A"} h | Labor Cost IDR: ${meta.labor_cost_idr != null ? meta.labor_cost_idr : "not recorded"} | Material Cost IDR: ${meta.material_cost_idr != null ? meta.material_cost_idr : "not recorded"} | Total Cost IDR: ${meta.total_cost_idr != null ? meta.total_cost_idr : "not recorded"} | Downtime Hours: ${meta.downtime_hours ?? "N/A"} h | Executed by: ${meta.executed_by || ""}.\n`;
        } else if (meta.record_type === "document") {
          metaSummary = `Document: ${ref} | Title: ${title} | Tag: ${tag} | Type: ${meta.doc_type || ""} | Rev: ${meta.revision || "N/A"} | Status: ${meta.status || "N/A"} | Date: ${meta.date || ""}.\n`;
        }

        // Split body into sections by "## " headings
        const sections = body.split(/(?=^##\s+)/m);
        for (let i = 0; i < sections.length; i++) {
          const sectionText = sections[i].trim();
          if (!sectionText) continue;

          chunks.push({
            id: `${ref}#${i}`,
            ref,
            tag,
            title,
            kind: meta.record_type || "document",
            text: `${metaSummary}${title}\n${sectionText}`,
          });
        }
      } catch (err) {
        logger.warn(`Error reading file ${filePath}: ${err.message}`);
      }
    }

    // Build inverted index (BM25)
    let totalTokens = 0;
    const DF = new Map();

    for (const chunk of chunks) {
      chunk.tokens = tokenize(chunk.text);
      totalTokens += chunk.tokens.length;
      chunk.tf = new Map();

      for (const tok of chunk.tokens) {
        chunk.tf.set(tok, (chunk.tf.get(tok) || 0) + 1);
      }
      for (const tok of chunk.tf.keys()) {
        DF.set(tok, (DF.get(tok) || 0) + 1);
      }
    }

    this.chunks = chunks;
    this.DF = DF;
    this.avgChunkLen = chunks.length ? totalTokens / chunks.length : 1;
    this.vocab = [...DF.keys()].filter((x) => /^[a-z]{4,}$/.test(x));
  }

  nearestWord(word) {
    const max = word.length >= 7 ? 2 : 1;
    let best = null;
    let minD = max + 1;
    let bestDf = 0;

    for (const v of this.vocab) {
      const d = levenshtein(word, v, max);
      const df = this.DF.get(v) || 0;
      if (d < minD || (d === minD && df > bestDf)) {
        best = v;
        minD = d;
        bestDf = df;
      }
    }
    return minD <= max ? best : null;
  }

  fixQuery(query) {
    const notes = [];
    let s = String(query);

    // Normalize WO format: "WO 240003" -> "WO-240003"
    s = s.replace(/\bWO[\s_-]?(\d{6})\b/gi, (m, d) => {
      const r = `WO-${d}`;
      if (r !== m) notes.push(`${m} → ${r}`);
      return r;
    });

    // Date normalization (e.g. "24 january 2026" or "24 jan 2025" -> "2026-01-24")
    const months = {
      january: "01", jan: "01", janurary: "01", januari: "01",
      february: "02", feb: "02", februari: "02",
      march: "03", mar: "03", maret: "03",
      april: "04", apr: "04",
      may: "05", mei: "05",
      june: "06", jun: "06", juni: "06",
      july: "07", jul: "07", juli: "07",
      august: "08", aug: "08", agustus: "08",
      september: "09", sep: "09", sept: "09",
      october: "10", oct: "10", oktober: "10",
      november: "11", nov: "11",
      december: "12", dec: "12", desember: "12"
    };

    s = s.replace(/\b(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})\b/g, (m, day, mon, yr) => {
      const mm = months[mon.toLowerCase()];
      if (mm) {
        const iso = `${yr}-${mm}-${String(day).padStart(2, "0")}`;
        notes.push(`${m} → ${iso}`);
        return `${m} ${iso}`;
      }
      return m;
    });

    // Normalize equipment tags without hyphen: "GA1201A" -> "GA-1201A"
    s = s.replace(/\b([A-Za-z]{2,5})[\s_-]?(\d{4,5})([A-Za-z]?)\b/g, (m, L, D, X) => {
      const r = `${L}-${D}${X}`.toUpperCase();
      if (ASSET_TAGS.includes(r) || this.DF.has(r.toLowerCase())) {
        if (r !== m) notes.push(`${m} → ${r}`);
        return r;
      }
      if (L.length === 2) {
        const near = ASSET_TAGS.filter(
          (t) => t.startsWith(L.toUpperCase() + "-") && levenshtein(t.slice(3), D + X.toUpperCase(), 1) <= 1
        );
        if (near.length === 1) {
          notes.push(`${m} → ${near[0]} (closest tag)`);
          return near[0];
        }
      }
      return m;
    });

    // Common typos / normalization
    s = s.replace(/\brefluc\b/gi, "reflux");

    // Indonesian term translation
    const low = s.toLowerCase();
    const extra = [];
    for (const [id, en] of this.synonyms.id_phrases) {
      if (low.includes(id)) extra.push(en);
    }

    const words = low.match(/[a-z]+/g) || [];
    for (const w of words) {
      if (this.synonyms.id_map[w]) {
        extra.push(this.synonyms.id_map[w]);
        continue;
      }
      if (
        w.length < 4 ||
        STOP_WORDS.has(w) ||
        this.synonyms.id_stop.has(w) ||
        this.DF.has(w) ||
        this.synonyms.en_synonyms[w]
      ) {
        continue;
      }
      const corrected = this.nearestWord(w);
      if (corrected && corrected !== w) {
        s = s.replace(new RegExp(`\\b${w}\\b`, "i"), corrected);
        notes.push(`${w} → ${corrected}`);
      }
    }

    if (extra.length) {
      s += ` ${extra.join(" ")}`;
      notes.push(`Indonesian translation: ${[...new Set(extra.join(" ").split(" "))].join(", ")}`);
    }

    return { cleanedQuery: s, notes };
  }

  // `scope` (Inspect mode) limits retrieval to one P&ID set: { allowed: Set<ref>, boost: Set<ref>, asset }.
  // Records outside `allowed` are never scored or returned.
  async searchPassages(rawQuery, assetContext = null, limit = 6, scope = null) {
    if (!this.chunks.length) return { query: rawQuery, totalHits: 0, passages: [] };

    // Support empty/browse queries (e.g. browsing documents by asset in Knowledge Page)
    if (!rawQuery || !rawQuery.trim() || rawQuery.trim() === "*") {
      let docs = Array.from(this.docMap.values());
      if (scope) docs = docs.filter((d) => scope.allowed.has(d.ref));
      if (assetContext) {
        docs = docs.filter((d) => d.tag === assetContext);
      }
      const passages = docs.slice(0, limit).map((d) => {
        const directImage = d.image || null;
        const assetImage = d.tag && fs.existsSync(path.join(this.kbPath, "images", `TJC-LLD-GA-${d.tag}.png`))
          ? `/api/images/TJC-LLD-GA-${d.tag}.png`
          : null;
        return {
          ref: d.ref,
          title: d.title,
          tag: d.tag,
          kind: d.meta?.record_type || "document",
          score: 1.0,
          text: d.body ? d.body.slice(0, 320) : "",
          image: directImage || assetImage,
          isAssetDrawing: !directImage && !!assetImage,
          revision: d.meta?.revision || null,
          status: d.meta?.status || null,
          approvedBy: d.meta?.approved_by || null,
        };
      });
      return {
        rawQuery: rawQuery || "",
        cleanedQuery: "",
        notes: [],
        matchedTag: assetContext,
        totalHits: passages.length,
        passages,
      };
    }

    const { cleanedQuery, notes } = this.fixQuery(rawQuery);

    // Expand synonyms
    const queryTokens = [];
    for (const w of tokenize(cleanedQuery)) {
      queryTokens.push(w);
      if (this.synonyms.en_synonyms[w]) {
        queryTokens.push(...this.synonyms.en_synonyms[w]);
      }
    }
    const qset = [...new Set(queryTokens)];

    // Check if query is plant-wide (asking across all assets)
    const isPlantWide = /\b(plant|all assets|across|most expensive|highest|total|how many|failures|compare|repeat)\b/i.test(cleanedQuery);

    // Check if user is asking for work orders or maintenance history
    const isAskingWorkOrder = /\b(work\s*order|wo\b|perintah\s*kerja|maintenance|nomor\s*wo|perbaikan|service|ordernya|job|task)\b/i.test(cleanedQuery);

    // Tag detection from query (explicit equipment tag takes highest precedence)
    let matchedTag = ASSET_TAGS.find((t) => cleanedQuery.toUpperCase().includes(t));

    // If no equipment tag, check equipment name aliases
    if (!matchedTag) {
      const qLower = cleanedQuery.toLowerCase();
      for (const item of ASSET_EQUIPMENT_MAP) {
        if (item.names.some((name) => qLower.includes(name))) {
          matchedTag = item.tag;
          notes.push(`Equipment mapped to ${item.tag}`);
          break;
        }
      }
    }

    // If still no equipment tag, resolve instrument tag like VSHH-1201 or PSLL-4504 to asset
    if (!matchedTag) {
      for (const m of cleanedQuery.toUpperCase().matchAll(/\b[A-Z]{2,5}-(\d{2})\d{2}[A-Z]?\b/g)) {
        const found = ASSET_TAGS.find((t) => t.slice(3, 5) === m[1]);
        if (found) {
          matchedTag = found;
          notes.push(`Instrument tag ${m[0]} mapped to ${found}`);
          break;
        }
      }
    }

    if (!matchedTag && !isPlantWide) {
      matchedTag = assetContext;
    }

    // Inside a P&ID set every record already belongs to the set's asset.
    if (scope) matchedTag = scope.asset;

    // BM25 calculation
    const N = this.chunks.length;
    const k1 = 1.3;
    const b = 0.72;
    const scored = [];

    for (const chunk of this.chunks) {
      if (scope && !scope.allowed.has(chunk.ref)) continue;
      let score = 0;
      for (const w of qset) {
        const tf = chunk.tf.get(w);
        if (!tf) continue;
        const df = this.DF.get(w) || 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += (idf * tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * chunk.tokens.length) / this.avgChunkLen));
      }

      if (score <= 0) continue;

      // Boost matching asset tag unless the question is plant-wide
      if (matchedTag && !isPlantWide) {
        score *= chunk.tag === matchedTag ? 2.5 : 0.5;
      }

      // Intent boost: Work Order vs Engineering Manuals
      if (isAskingWorkOrder) {
        if (chunk.kind === "work_order") {
          score *= 3.5;
          if (matchedTag && chunk.tag === matchedTag) score *= 2.0;
        } else {
          score *= 0.35; // Deprioritize OPLs/Datasheets when user specifically asks for work orders
        }
      } else {
        // Slightly prioritize high-value failure and procedure docs
        if (chunk.kind === "document" && chunk.title?.includes("Interlock")) score *= 1.15;
        if (chunk.ref === "KB-FAILURE-PATTERNS" && isPlantWide) score *= 1.3;
      }

      // Scoped to an OPL: favour the OPL itself and its linked work orders.
      if (scope?.boost.has(chunk.ref)) score *= 1.8;

      scored.push({ chunk, score });
    }

    scored.sort((a, b) => b.score - a.score);

    const hits = [];
    const seenRefs = new Set();

    for (const item of scored) {
      if (seenRefs.has(item.chunk.ref)) continue;
      if (scope && !scope.allowed.has(item.chunk.ref)) continue;
      seenRefs.add(item.chunk.ref);

      const docInfo = this.docMap.get(item.chunk.ref);
      const directImage = docInfo?.image || null;
      const assetImage = docInfo?.tag && fs.existsSync(path.join(this.kbPath, "images", `TJC-LLD-GA-${docInfo.tag}.png`))
        ? `/api/images/TJC-LLD-GA-${docInfo.tag}.png`
        : null;

      hits.push({
        ref: item.chunk.ref,
        title: item.chunk.title,
        tag: item.chunk.tag,
        kind: item.chunk.kind,
        score: Math.round(item.score * 10) / 10,
        text: item.chunk.text,
        image: directImage || assetImage,
        isAssetDrawing: !directImage && !!assetImage,
        revision: docInfo?.meta?.revision || null,
        status: docInfo?.meta?.status || null,
        approvedBy: docInfo?.meta?.approved_by || null,
      });

      if (hits.length >= limit) break;
    }

    return {
      rawQuery,
      cleanedQuery,
      notes,
      matchedTag,
      totalHits: hits.length,
      passages: hits,
    };
  }

  async getDocumentById(docId) {
    const doc = this.docMap.get(docId);
    if (!doc) return null;
    const directImage = doc.image || null;
    const assetImage = doc.tag && fs.existsSync(path.join(this.kbPath, "images", `TJC-LLD-GA-${doc.tag}.png`))
      ? `/api/images/TJC-LLD-GA-${doc.tag}.png`
      : null;
    return {
      ref: doc.ref,
      title: doc.title,
      tag: doc.tag,
      meta: doc.meta,
      image: directImage || assetImage,
      isAssetDrawing: !directImage && !!assetImage,
      body: doc.body,
    };
  }
}

export const knowledgeService = new KnowledgeService();
