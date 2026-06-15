/**
 * Optional per–widget-key overrides for built-in dashboard charts (localStorage only).
 * When api_path + graph_type are set, Energy/Space render that chart like a custom graph.
 */
export const BUILTIN_WIDGET_OVERRIDES_KEY = "builtinWidgetOverrides";

export function normalizeBuiltinApiPath(path) {
  const p = String(path ?? "").trim();
  if (!p) return "";
  if (p.startsWith("/")) return p;
  return `/dashboard/${p.replace(/^\/+/, "")}`;
}

export function readBuiltinWidgetOverrides() {
  try {
    const raw = localStorage.getItem(BUILTIN_WIDGET_OVERRIDES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeBuiltinWidgetOverrides(next) {
  try {
    localStorage.setItem(BUILTIN_WIDGET_OVERRIDES_KEY, JSON.stringify(next || {}));
    window.dispatchEvent(new CustomEvent("builtinWidgetOverridesUpdated"));
  } catch {
    // ignore
  }
}

export function setBuiltinWidgetOverride(widgetKey, { graph_type, api_path, floor_ids, area_ids, group_scope, scoped_group_ids }) {
  const key = String(widgetKey ?? "").trim();
  if (!key) return;
  const cur = readBuiltinWidgetOverrides();
  const gt = String(graph_type ?? "").trim();
  const ap = String(api_path ?? "").trim();
  if (!gt || !ap) {
    const { [key]: _, ...rest } = cur;
    writeBuiltinWidgetOverrides(rest);
    return;
  }
  const floors = Array.isArray(floor_ids) ? floor_ids : [];
  const areas = Array.isArray(area_ids) ? area_ids : [];
  const gs = String(group_scope ?? "").trim();
  const scoped = Array.isArray(scoped_group_ids) && scoped_group_ids.length > 0 ? scoped_group_ids : null;
  writeBuiltinWidgetOverrides({
    ...cur,
    [key]: {
      graph_type: gt,
      api_path: ap,
      ...(floors.length ? { floor_ids: floors } : {}),
      ...(areas.length ? { area_ids: areas } : {}),
      ...(gs ? { group_scope: gs } : {}),
      ...(scoped ? { scoped_group_ids: scoped } : {}),
    },
  });
}

export function clearBuiltinWidgetOverride(widgetKey) {
  const key = String(widgetKey ?? "").trim();
  if (!key) return;
  const cur = readBuiltinWidgetOverrides();
  const { [key]: _, ...rest } = cur;
  writeBuiltinWidgetOverrides(rest);
}
