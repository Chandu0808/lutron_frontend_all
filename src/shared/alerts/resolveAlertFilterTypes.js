/**
 * Build the Alerts page "Alert Type" filter options.
 * Prefer Settings-enabled types from /alert/alerts_types; always include types
 * present on the current active alerts list so the dropdown cannot lag behind
 * a stale bootstrap cache.
 */

export const CANONICAL_ALERT_FILTER_ORDER = [
  "Processor Not Responding",
  "Device Not Responding",
  "Ballast Failure",
  "Lamp Failure",
  "Other Warnings",
];

export function resolveAlertFilterTypes({ apiTypes = [], alerts = [] } = {}) {
  const fromApi = (Array.isArray(apiTypes) ? apiTypes : [])
    .map((t) => (t == null ? "" : String(t).trim()))
    .filter(Boolean);
  const fromAlerts = [];
  const seenAlerts = new Set();
  for (const row of Array.isArray(alerts) ? alerts : []) {
    const t = row?.alert_type == null ? "" : String(row.alert_type).trim();
    if (!t || seenAlerts.has(t)) continue;
    seenAlerts.add(t);
    fromAlerts.push(t);
  }

  const allowed = new Set([...fromApi, ...fromAlerts]);
  if (allowed.size === 0) return [];

  const ordered = CANONICAL_ALERT_FILTER_ORDER.filter((t) => allowed.has(t));
  for (const t of allowed) {
    if (!ordered.includes(t)) ordered.push(t);
  }
  return ordered;
}
