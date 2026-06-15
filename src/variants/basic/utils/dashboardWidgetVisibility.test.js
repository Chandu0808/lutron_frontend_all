/**
 * @jest-environment node
 */

import {
  applyVisibilityToggleToMap,
  getDefaultDashboardWidgetVisibilityMap,
  hasBackendWidgetConfiguration,
  isWidgetVisibleInMap,
  normalizeDashboardWidgetKey,
  readDashboardWidgetVisibility,
  resolveWidgetConfigurationDisplayName,
  widgetConfigurationItemsToVisibilityMap,
  writeDashboardWidgetVisibility,
  DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY,
} from './dashboardWidgetVisibilityCore'

describe('dashboardWidgetVisibility API mapping', () => {
  it('detects backend configuration when items exist', () => {
    expect(hasBackendWidgetConfiguration([])).toBe(false)
    expect(hasBackendWidgetConfiguration([{ widget_key: 'consumption', is_visible: true }])).toBe(
      true
    )
  })

  it('converts backend items to sparse hidden map', () => {
    const map = widgetConfigurationItemsToVisibilityMap([
      { widget_key: 'consumption', is_visible: false },
      { widget_key: 'savings', is_visible: true },
      { widget_key: 'consumption_by_area_groups', is_visible: false },
    ])
    expect(map).toEqual({
      consumption: false,
      total_consumption_by_group: false,
    })
    expect(isWidgetVisibleInMap(map, 'savings')).toBe(true)
    expect(isWidgetVisibleInMap(map, 'consumption')).toBe(false)
  })

  it('treats keys missing from backend items as visible', () => {
    const map = widgetConfigurationItemsToVisibilityMap([
      { widget_key: 'consumption', is_visible: false },
    ])
    expect(isWidgetVisibleInMap(map, 'energy')).toBe(true)
    expect(isWidgetVisibleInMap(map, 'consumption_saving')).toBe(true)
  })

  it('applyVisibilityToggleToMap matches local semantics', () => {
    const hidden = applyVisibilityToggleToMap({}, 'consumption', false)
    expect(hidden).toEqual({ consumption: false })
    const shown = applyVisibilityToggleToMap(hidden, 'consumption', true)
    expect(shown).toEqual({})
  })

  it('resolveWidgetConfigurationDisplayName uses widget_titles and overview labels', () => {
    const widgetList = {
      titles: [{ key: 'consumption', title: 'Power Use', dropdown_name: 'Power' }],
    }
    expect(resolveWidgetConfigurationDisplayName('consumption', widgetList)).toBe('Power Use')
    expect(resolveWidgetConfigurationDisplayName('energy', widgetList)).toBe('Energy')
    expect(normalizeDashboardWidgetKey('consumption_by_area_groups')).toBe(
      'total_consumption_by_group'
    )
  })
})

describe('dashboardWidgetVisibility localStorage fallback', () => {
  const storage = {}

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
    global.localStorage = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => {
        storage[key] = value
      },
      removeItem: (key) => {
        delete storage[key]
      },
    }
  })

  it('uses restrictive defaults when storage is empty', () => {
    const map = readDashboardWidgetVisibility()
    expect(isWidgetVisibleInMap(map, 'consumption_saving')).toBe(true)
    expect(isWidgetVisibleInMap(map, 'instant_utilization_combined')).toBe(true)
    expect(isWidgetVisibleInMap(map, 'consumption')).toBe(false)
    expect(isWidgetVisibleInMap(map, 'energy')).toBe(true)
  })

  it('persists hidden keys to localStorage', () => {
    writeDashboardWidgetVisibility({ consumption: false })
    const raw = storage[DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY]
    expect(JSON.parse(raw)).toEqual({ consumption: false })
    expect(isWidgetVisibleInMap(readDashboardWidgetVisibility(), 'consumption')).toBe(false)
  })

  it('default map hides non-overview charts except combined slots', () => {
    const defaults = getDefaultDashboardWidgetVisibilityMap()
    expect(defaults.consumption).toBe(false)
    expect(defaults.energy).toBeUndefined()
  })
})
