// Dates in the knowledge base are ISO ("2025-08-31") or long form ("Monday, 30 March 2026").
export function parseDate(value) {
  if (!value) return null;
  const s = String(value).replace(/^[A-Za-z]+,\s*/, "");
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = iso ? new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3])) : new Date(`${s} UTC`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value) {
  const d = parseDate(value);
  if (!d) return value || "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

// Average months between consecutive work orders, or null with fewer than two dated ones.
export function avgMonthsBetween(workOrders) {
  const times = workOrders
    .map((w) => parseDate(w.date)?.getTime())
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (times.length < 2) return null;
  const spanDays = (times[times.length - 1] - times[0]) / 86400000;
  return Math.round((spanDays / (times.length - 1) / 30.44) * 10) / 10;
}

export const statusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "unfinished") return "is-unfinished";
  if (s.includes("pending") || s.includes("review")) return "is-pending";
  return "";
};
