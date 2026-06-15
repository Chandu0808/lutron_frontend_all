/**
 * Helpers to keep floorplan polygon light_status in sync with control-panel updates.
 */

/** @param {unknown} status */
export function normalizeLightStatus(status) {
  if (status == null || status === "") return null;
  const s = String(status).toLowerCase().trim();
  if (s === "on" || s === "true") return "on";
  if (s === "off" || s === "false") return "off";
  return s;
}

/** @param {{ area_id?: number, id?: number }} area @param {number} areaId */
export function areaIdsMatch(area, areaId) {
  if (areaId == null) return false;
  const target = Number(areaId);
  const aid = area.area_id != null ? Number(area.area_id) : null;
  const id = area.id != null ? Number(area.id) : null;
  return aid === target || id === target;
}

/**
 * Infer on/off from zone commands sent to POST /area/zone_update.
 * @param {Array<{ zone_type?: string, level?: number, switched_state?: string }>} zones
 */
export function deriveLightStatusFromZoneUpdates(zones) {
  if (!Array.isArray(zones) || zones.length === 0) return null;
  let anyOn = false;
  for (const z of zones) {
    const type = String(z.zone_type || "").toLowerCase();
    if (type === "switched") {
      const st = String(z.switched_state || "").toLowerCase();
      if (st === "on") anyOn = true;
      continue;
    }
    const level = Number(z.level);
    if (!Number.isNaN(level) && level > 0) anyOn = true;
  }
  return anyOn ? "on" : "off";
}

/**
 * Max wait (ms) before re-reading processor status after a fade command.
 * fade_time is typically "02" meaning 2 seconds in Lutron LEAP.
 * @param {Array<{ fade_time?: string, delay_time?: string }>} zones
 */
export function maxFadeDelayMs(zones) {
  if (!Array.isArray(zones) || zones.length === 0) return 300;
  let maxSec = 0;
  for (const z of zones) {
    const fade = parseInt(String(z.fade_time ?? "0"), 10);
    const delay = parseInt(String(z.delay_time ?? "0"), 10);
    const total = (Number.isNaN(fade) ? 0 : fade) + (Number.isNaN(delay) ? 0 : delay);
    if (total > maxSec) maxSec = total;
  }
  const ms = maxSec > 0 ? maxSec * 1000 + 200 : 300;
  return Math.min(ms, 5000);
}

/**
 * @param {Array<Record<string, unknown>>} areas
 * @param {number} areaId
 * @param {string|null} lightStatus normalized on/off
 */
export function patchAreasLightStatus(areas, areaId, lightStatus) {
  if (!areas?.length || lightStatus == null) return areas;
  return areas.map((area) =>
    areaIdsMatch(area, areaId) ? { ...area, light_status: lightStatus } : area
  );
}
