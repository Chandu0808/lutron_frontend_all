/** Pure visibility helpers (no Redux/React) — safe for node unit tests. */

export const DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY = 'lutron_dashboard_widget_visibility_v1'
export const DASHBOARD_WIDGET_VISIBILITY_EVENT = 'lutron-dashboard-widget-visibility'
const DASHBOARD_WIDGET_VISIBILITY_ALL_VISIBLE_MARKER = 'all_visible'

export const DASHBOARD_WIDGET_KEY_ALIASES = {
  consumption_by_area_groups: 'total_consumption_by_group',
}

export const DEFAULT_VISIBLE_DASHBOARD_WIDGET_KEYS = new Set([
  'consumption_saving',
  'instant_utilization_combined',
])

export const DEFAULT_VISIBLE_OVERVIEW_WIDGET_KEYS = new Set([
  'energy',
  'alerts',
  'schedules',
  'quick_controls',
  'shades',
  'floors',
  'space_utilization',
])

export const WIDGET_VISIBILITY_SECTION = {
  savings_by_strategy: 'energy',
  total_consumption_by_group: 'energy',
  consumption_saving: 'energy',
  consumption: 'energy',
  savings: 'energy',
  light_power_density: 'energy',
  peak_and_minimum_consumption: 'energy',
  utilization: 'space',
  utilization_by_area_group: 'space',
  utilization_by_area: 'space',
  peak_and_minimum_utilization: 'space',
  instant_occupancy_count: 'space',
  instant_utilization_combined: 'space',
  energy: 'overview',
  alerts: 'overview',
  schedules: 'overview',
  quick_controls: 'overview',
  shades: 'overview',
  floors: 'overview',
  space_utilization: 'overview',
}

export const OVERVIEW_WIDGET_LABELS = {
  energy: 'Energy',
  alerts: 'Alerts',
  schedules: 'Schedules',
  quick_controls: 'Quick Controls',
  shades: 'Shades',
  floors: 'Floors',
  space_utilization: 'Space Utilization',
}

export function normalizeDashboardWidgetKey(key) {
  if (!key || typeof key !== 'string') return key
  return DASHBOARD_WIDGET_KEY_ALIASES[key] || key
}

export function dedupeWidgetItemsByCanonicalKey(items) {
  if (!Array.isArray(items) || items.length === 0) return []
  const byCanonical = new Map()
  for (const item of items) {
    if (!item || typeof item.key !== 'string') continue
    const canonical = normalizeDashboardWidgetKey(item.key)
    if (!canonical) continue
    const fromCanonical = item.key === canonical
    const prev = byCanonical.get(canonical)
    if (!prev) {
      byCanonical.set(canonical, {
        key: canonical,
        title: item.title,
        dropdown_name: item.dropdown_name ?? item.title,
        fromCanonical,
      })
      continue
    }
    if (fromCanonical && !prev.fromCanonical) {
      byCanonical.set(canonical, {
        key: canonical,
        title: item.title,
        dropdown_name: item.dropdown_name ?? item.title,
        fromCanonical: true,
      })
    } else if (!fromCanonical && prev.fromCanonical) {
      /* keep prev */
    } else {
      byCanonical.set(canonical, {
        key: canonical,
        title: prev.title || item.title,
        dropdown_name: prev.dropdown_name || item.dropdown_name || prev.title || item.title,
        fromCanonical: prev.fromCanonical || fromCanonical,
      })
    }
  }
  return Array.from(byCanonical.values()).map(({ fromCanonical, ...rest }) => rest)
}

export function getDefaultDashboardWidgetVisibilityMap() {
  const m = {}
  for (const key of Object.keys(WIDGET_VISIBILITY_SECTION)) {
    if (DEFAULT_VISIBLE_DASHBOARD_WIDGET_KEYS.has(key)) continue
    if (DEFAULT_VISIBLE_OVERVIEW_WIDGET_KEYS.has(key)) continue
    m[key] = false
  }
  return m
}

export function readDashboardWidgetVisibility() {
  try {
    const raw = localStorage.getItem(DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY)
    if (raw == null || raw === '') {
      return getDefaultDashboardWidgetVisibilityMap()
    }
    const parsed = JSON.parse(raw)
    if (parsed === DASHBOARD_WIDGET_VISIBILITY_ALL_VISIBLE_MARKER) {
      return {}
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return getDefaultDashboardWidgetVisibilityMap()
    }
    if (Object.keys(parsed).length === 0) {
      return getDefaultDashboardWidgetVisibilityMap()
    }
    return parsed
  } catch {
    return getDefaultDashboardWidgetVisibilityMap()
  }
}

export function writeDashboardWidgetVisibility(map) {
  try {
    if (map && typeof map === 'object' && !Array.isArray(map) && Object.keys(map).length === 0) {
      localStorage.setItem(
        DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY,
        JSON.stringify(DASHBOARD_WIDGET_VISIBILITY_ALL_VISIBLE_MARKER)
      )
      return
    }
    localStorage.setItem(DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* quota / private mode */
  }
}

export function readDashboardWidgetVisibilityRaw() {
  try {
    return localStorage.getItem(DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY)
  } catch {
    return null
  }
}

export function restoreDashboardWidgetVisibilityAfterStorageClear(raw) {
  if (raw == null) return
  try {
    localStorage.setItem(DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY, raw)
  } catch {
    /* quota / private mode */
  }
}

export function isWidgetVisibleInMap(map, canonicalKey) {
  if (!canonicalKey) return true
  return map[canonicalKey] !== false
}

export function hasBackendWidgetConfiguration(items) {
  return Array.isArray(items) && items.length > 0
}

export function widgetConfigurationItemsToVisibilityMap(items) {
  if (!hasBackendWidgetConfiguration(items)) {
    return getDefaultDashboardWidgetVisibilityMap()
  }
  const map = {}
  for (const item of items) {
    if (!item || typeof item.widget_key !== 'string') continue
    const key = normalizeDashboardWidgetKey(item.widget_key)
    if (!key) continue
    if (item.is_visible === false) {
      map[key] = false
    }
  }
  return map
}

export function resolveWidgetConfigurationDisplayName(widgetKey, widgetList) {
  const canonical = normalizeDashboardWidgetKey(widgetKey)
  const titles = widgetList?.titles
  if (Array.isArray(titles)) {
    const row = titles.find(
      (t) => t && normalizeDashboardWidgetKey(t.key) === canonical
    )
    if (row) {
      return row.title || row.dropdown_name || canonical
    }
  }
  return OVERVIEW_WIDGET_LABELS[canonical] || canonical || widgetKey
}

export function applyVisibilityToggleToMap(map, key, visible) {
  const k = normalizeDashboardWidgetKey(key)
  if (!k) return map
  const next = { ...(map || {}) }
  if (visible) {
    delete next[k]
  } else {
    next[k] = false
  }
  return next
}

export function inferWidgetVisibilitySection(canonicalKey) {
  if (!canonicalKey) return 'other'
  const section = WIDGET_VISIBILITY_SECTION[canonicalKey]
  if (section) {
    return section
  }
  const k = canonicalKey.toLowerCase()
  if (k.includes('utilization') || k.includes('occupancy')) return 'space'
  if (k.includes('consumption') || k.includes('savings') || k.includes('density') || k.includes('light')) {
    return 'energy'
  }
  return 'other'
}

export function resolveVisibilityMap(widgetConfiguration, widgetConfigurationStatus) {
  if (
    widgetConfigurationStatus === 'succeeded' &&
    hasBackendWidgetConfiguration(widgetConfiguration)
  ) {
    return widgetConfigurationItemsToVisibilityMap(widgetConfiguration)
  }
  return readDashboardWidgetVisibility()
}
