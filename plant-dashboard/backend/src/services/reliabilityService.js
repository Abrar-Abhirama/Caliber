import { knowledgeService } from "./knowledgeService.js";
import { inspectService } from "./inspectService.js";

// Reliability dashboard figures, computed from the knowledge-base work orders on every request
// so they follow the Markdown as it changes.
//
// Definitions (as in https://www.faclon.com/industry-insights/understanding-mtbf-predictive-maintenance):
// - A failure is a Corrective work order, or any work order whose `breakdown` field is "Yes" (e.g. an
//   Inspection or Overhaul raised because the equipment stopped). Other planned work is not a failure.
// - MTTF = total operating time / number of failures (time running until it breaks). Operating time per
//   asset = the hours in the selected period minus the downtime recorded on its work orders (the asset is
//   assumed to run around the clock).
// - MTTR = total repair time / number of repairs = average recorded downtime per failure; failures with no
//   downtime recorded are left out of the average.
// - MTBF = MTTF + MTTR (one full cycle: running until failure, then repair).
// MTBF and MTTR always count failures only, so the work-type filter does not change them; it changes the
// work-order counts, chart, mix, cost and lists.
//
// Filters (all optional, combined): pid (P&ID set code), period ("3m"/"6m"/"12m" = last N months up to the
// latest work order in the data, or a year like "2025"), crit ("high" or "other"), type (work_type).


const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round1 = (v) => Math.round(v * 10) / 10;
const reportDate = (m) => m.report_date || m.start_date || m.completion_date || null;

const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());

function woTitle(doc) {
  return doc.meta.problem || String(doc.title).replace(/^WO-\d+\s*-\s*[A-Z0-9-]+\s*-\s*/, "");
}

// Repeat failure groups from failures/patterns.md: one per "##"/"###" heading that lists work orders.
function parsePatterns(docs, woByRef) {
  const doc = docs.find((d) => d.meta.record_type === "failure_patterns");
  if (!doc) return [];
  const out = [];
  for (const part of doc.body.split(/^#{2,3}\s+/m).slice(1)) {
    const nl = part.indexOf("\n");
    const title = part.slice(0, nl).replace(/\s*\(.*?\)\s*$/, "").trim();
    const body = part.slice(nl + 1);
    const wos = [...new Set([...body.matchAll(/WO-\d{6}/g)].map((m) => m[0]))].filter((r) => woByRef.has(r));
    if (!wos.length) continue;
    const summary = body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .find((l) => l && !l.startsWith("|") && !l.startsWith("-") && !l.startsWith("#"));
    const assets = [...new Set(wos.map((r) => woByRef.get(r).meta.equipment_tag))];
    out.push({ title, summary: summary || null, workOrders: wos, assets });
  }
  return out.sort((a, b) => b.workOrders.length - a.workOrders.length);
}

// The same failure pattern on the same equipment more than once: split every pattern by asset and keep
// the assets with 2+ work orders in it. Each item carries the dates and root causes of those work orders,
// plus the OPL that cites most of them (for "Open in Inspect").
function repeatFailures(patterns, woByRef, assetsMeta) {
  const rootCause = (d) => {
    const m = d.body.match(/^##\s+Root cause\s*\n+([\s\S]*?)(?=\n##\s|$)/m);
    return m ? m[1].trim().split(/\r?\n/)[0] : null;
  };
  const items = [];
  for (const p of patterns) {
    const byTag = new Map();
    for (const ref of p.workOrders) {
      const tag = woByRef.get(ref).meta.equipment_tag;
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(woByRef.get(ref));
    }
    for (const [tag, list] of byTag) {
      if (list.length < 2) continue;
      list.sort((a, b) => String(reportDate(a.meta)).localeCompare(String(reportDate(b.meta))));
      const refs = list.map((d) => d.ref);
      const pid = assetsMeta.get(tag)?.pid || null;
      const opl = inspectService.oplCiting(refs, pid);
      items.push({
        tag,
        what: p.title.replace(new RegExp(`^${tag}\\s+`), "").replace(/^./, (c) => c.toUpperCase()),
        count: list.length,
        dates: list.map((d) => reportDate(d.meta)),
        causes: [...new Set(list.map(rootCause).filter(Boolean))],
        workOrders: refs,
        pid,
        opl,
      });
    }
  }
  return items.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

const monthKey = (m) => String(reportDate(m) || "").slice(0, 7);

const isFailure = (m) => m.work_type === "Corrective" || String(m.breakdown).toLowerCase() === "yes";
const sumOf = (vals) => vals.reduce((s, v) => s + v, 0);
const downtimeOf = (metas) => sumOf(metas.map((m) => num(m.downtime_hours)).filter((v) => v !== null));

// MTTR: average recorded downtime per failure, over the failures that have downtime recorded.
function mttr(metas) {
  const hours = metas.filter(isFailure).map((m) => num(m.downtime_hours)).filter((v) => v !== null);
  return { mttrHours: hours.length ? round1(sumOf(hours) / hours.length) : null, mttrBasis: hours.length };
}

// Plant-level MTTF / MTBF from total operating hours and failures, plus MTTR.
function plantCycle(operating, failures, repair) {
  const mttf = failures ? operating / failures : null;
  return {
    mttfHours: mttf != null ? round1(mttf) : null,
    mtbfHours: mttf != null ? round1(mttf + (repair.mttrHours || 0)) : null,
    ...repair,
  };
}

// Hours from the first day of month `from` to the end of month `to` (YYYY-MM).
function hoursInWindow(from, to) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (Date.UTC(ty, tm, 1) - Date.UTC(fy, fm - 1, 1)) / 3600000;
}

function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

class ReliabilityService {
  overview({ pid = null, period = null, crit = null, type = null } = {}) {
    const docs = [...knowledgeService.docMap.values()];
    const allWos = docs.filter((d) => d.meta.record_type === "work_order");
    const assetsMeta = new Map(
      docs.filter((d) => d.meta.record_type === "asset").map((d) => [d.meta.equipment_tag, d.meta])
    );
    const pidSets = inspectService.listSets().map((s) => ({ code: s.code, name: s.name }));

    const allMonths = allWos.map((d) => monthKey(d.meta)).filter((k) => /^\d{4}-\d{2}$/.test(k)).sort();
    const earliest = allMonths[0] || null;
    const latest = allMonths.at(-1) || null;
    const years = [...new Set(allMonths.map((k) => k.slice(0, 4)))];

    // Period window [from, to] in YYYY-MM; "last N months" counts back from the latest work order.
    let from = null;
    let to = null;
    let periodLabel = "All time";
    const lastN = /^(\d+)m$/.exec(period || "");
    if (lastN && latest) {
      from = shiftMonth(latest, -(Number(lastN[1]) - 1));
      to = latest;
      periodLabel = `Last ${lastN[1]} months`;
    } else if (/^\d{4}$/.test(period || "") && years.includes(period)) {
      from = `${period}-01` < earliest ? earliest : `${period}-01`;
      to = `${period}-12` > latest ? latest : `${period}-12`;
      periodLabel = period;
    }

    const critOk = (tag) => {
      const c = assetsMeta.get(tag)?.criticality;
      if (crit === "high") return c === "HIGH CRITICAL";
      if (crit === "other") return c !== "HIGH CRITICAL";
      return true;
    };
    // Everything except the work-type filter: MTBF and MTTR are computed from this (failures only).
    const scoped = allWos.filter(
      (d) =>
        (!pid || assetsMeta.get(d.meta.equipment_tag)?.pid === pid) &&
        critOk(d.meta.equipment_tag) &&
        (!from || (monthKey(d.meta) >= from && monthKey(d.meta) <= to))
    );
    const wos = scoped.filter((d) => !type || d.meta.work_type === type);
    const woByRef = new Map(wos.map((d) => [d.ref, d]));
    const windowHours = earliest ? hoursInWindow(from || earliest, to || latest) : 0;

    // Per asset: every asset that has work in the scope, even if none of the filtered type.
    const byTag = new Map();
    for (const d of scoped) {
      const tag = d.meta.equipment_tag;
      if (!byTag.has(tag)) byTag.set(tag, { all: [], typed: [] });
      byTag.get(tag).all.push(d.meta);
      if (!type || d.meta.work_type === type) byTag.get(tag).typed.push(d.meta);
    }

    const assets = [...byTag.entries()]
      .map(([tag, { all, typed }]) => {
        const am = assetsMeta.get(tag) || {};
        const failures = all.filter(isFailure).length;
        const operatingHours = Math.max(0, windowHours - downtimeOf(all));
        const cost = typed.map((m) => num(m.total_cost_idr)).filter((v) => v !== null);
        const repair = mttr(all);
        const mttf = failures ? operatingHours / failures : null;
        return {
          tag,
          name: titleCase(am.name || all[0].equipment_name),
          criticality: am.criticality || all[0].criticality || null,
          pid: am.pid || null,
          workOrders: typed.length,
          failures,
          emergency: all.filter((m) => m.priority === "Emergency").length,
          operatingHours: Math.round(operatingHours),
          mttfHours: mttf != null ? round1(mttf) : null,
          mtbfHours: mttf != null ? round1(mttf + (repair.mttrHours || 0)) : null,
          ...repair,
          downtimeHours: round1(downtimeOf(typed)),
          costMillionIdr: round1(sumOf(cost) / 1e6),
          lastFailure: all.filter(isFailure).map(reportDate).filter(Boolean).sort().at(-1) || null,
        };
      })
      // No failures in the period ranks as the most reliable.
      .sort((a, b) => (a.mtbfHours ?? Infinity) - (b.mtbfHours ?? Infinity));

    const totalFailures = sumOf(assets.map((a) => a.failures));
    const totalOperating = sumOf(assets.map((a) => a.operatingHours));

    // Per month, by report date
    const monthsMap = new Map();
    for (const d of wos) {
      const key = String(reportDate(d.meta) || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(key)) continue;
      const m = monthsMap.get(key) || { month: key, Predictive: 0, Corrective: 0, Preventive: 0, Other: 0 };
      m[d.meta.work_type in m ? d.meta.work_type : "Other"] += 1;
      monthsMap.set(key, m);
    }
    // Fill gaps so the chart has one bar per calendar month.
    const keys = [...monthsMap.keys()].sort();
    const monthly = [];
    const first = from || keys[0];
    const last = to || keys.at(-1);
    if (first && last) {
      let [y, mo] = first.split("-").map(Number);
      const [ey, emo] = last.split("-").map(Number);
      while (y < ey || (y === ey && mo <= emo)) {
        const key = `${y}-${String(mo).padStart(2, "0")}`;
        monthly.push(monthsMap.get(key) || { month: key, Predictive: 0, Corrective: 0, Preventive: 0, Other: 0 });
        mo += 1;
        if (mo > 12) {
          mo = 1;
          y += 1;
        }
      }
    }

    // Top maintenance drivers: the assets with the most work orders in the selection.
    const drivers = assets
      .filter((a) => a.workOrders > 0)
      .sort((a, b) => b.workOrders - a.workOrders || a.tag.localeCompare(b.tag))
      .slice(0, 8)
      .map((a) => ({ tag: a.tag, name: a.name, workOrders: a.workOrders, pid: a.pid }));

    const topCost = wos
      .filter((d) => num(d.meta.total_cost_idr) !== null)
      .sort((a, b) => b.meta.total_cost_idr - a.meta.total_cost_idr)
      .slice(0, 5)
      .map((d) => ({
        ref: d.ref,
        tag: d.meta.equipment_tag,
        title: woTitle(d),
        workType: d.meta.work_type,
        downtimeHours: num(d.meta.downtime_hours),
        costMillionIdr: round1(d.meta.total_cost_idr / 1e6),
      }));

    const missingDowntimeOrCost = wos.filter(
      (d) => num(d.meta.downtime_hours) === null || num(d.meta.total_cost_idr) === null
    ).length;

    const set = pid ? pidSets.find((x) => x.code === pid) : null;
    return {
      filters: { pid, pidName: set?.name || null, period: from ? period : null, periodLabel, crit: crit || null, type: type || null },
      pidSets,
      years,
      dataRange: { from: earliest, to: latest },
      period: { from: monthly[0]?.month || null, to: monthly.at(-1)?.month || null },
      totals: {
        workOrders: wos.length,
        assets: assets.length,
        missingDowntimeOrCost,
        failures: totalFailures,
        operatingHours: totalOperating,
        windowHours: Math.round(windowHours),
        ...plantCycle(totalOperating, totalFailures, mttr(scoped.map((d) => d.meta))),
      },
      assets,
      monthly,
      drivers,
      repeats: repeatFailures(parsePatterns(docs, woByRef), woByRef, assetsMeta),
      topCost,
    };
  }
}

export const reliabilityService = new ReliabilityService();
