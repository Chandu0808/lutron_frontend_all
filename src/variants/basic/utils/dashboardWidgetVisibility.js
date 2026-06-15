import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { UseAuth } from '../customhooks/UseAuth'
import {
  fetchWidgetConfiguration,
  saveWidgetVisibility,
  selectWidgetConfiguration,
  selectWidgetConfigurationStatus,
} from '../redux/slice/settingsslice/heatmap/groupOccupancySlice'
import {
  applyVisibilityToggleToMap,
  DASHBOARD_WIDGET_VISIBILITY_EVENT,
  DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY,
  DASHBOARD_WIDGET_KEY_ALIASES,
  DEFAULT_VISIBLE_DASHBOARD_WIDGET_KEYS,
  DEFAULT_VISIBLE_OVERVIEW_WIDGET_KEYS,
  OVERVIEW_WIDGET_LABELS,
  WIDGET_VISIBILITY_SECTION,
  dedupeWidgetItemsByCanonicalKey,
  getDefaultDashboardWidgetVisibilityMap,
  hasBackendWidgetConfiguration,
  inferWidgetVisibilitySection,
  isWidgetVisibleInMap,
  normalizeDashboardWidgetKey,
  readDashboardWidgetVisibility,
  readDashboardWidgetVisibilityRaw,
  resolveVisibilityMap,
  resolveWidgetConfigurationDisplayName,
  restoreDashboardWidgetVisibilityAfterStorageClear,
  widgetConfigurationItemsToVisibilityMap,
  writeDashboardWidgetVisibility,
} from './dashboardWidgetVisibilityCore'

export {
  DASHBOARD_WIDGET_VISIBILITY_STORAGE_KEY,
  DASHBOARD_WIDGET_VISIBILITY_EVENT,
  DASHBOARD_WIDGET_KEY_ALIASES,
  DEFAULT_VISIBLE_DASHBOARD_WIDGET_KEYS,
  DEFAULT_VISIBLE_OVERVIEW_WIDGET_KEYS,
  WIDGET_VISIBILITY_SECTION,
  OVERVIEW_WIDGET_LABELS,
  normalizeDashboardWidgetKey,
  dedupeWidgetItemsByCanonicalKey,
  getDefaultDashboardWidgetVisibilityMap,
  readDashboardWidgetVisibility,
  writeDashboardWidgetVisibility,
  readDashboardWidgetVisibilityRaw,
  restoreDashboardWidgetVisibilityAfterStorageClear,
  isWidgetVisibleInMap,
  hasBackendWidgetConfiguration,
  widgetConfigurationItemsToVisibilityMap,
  resolveWidgetConfigurationDisplayName,
  applyVisibilityToggleToMap,
  inferWidgetVisibilitySection,
}

export function useDashboardWidgetVisibility() {
  const dispatch = useDispatch()
  const { role } = UseAuth()
  const widgetConfiguration = useSelector(selectWidgetConfiguration)
  const widgetConfigurationStatus = useSelector(selectWidgetConfigurationStatus)
  const widgetList = useSelector((state) => state.groupOccupancy.widgets)

  const backendActive = useMemo(
    () =>
      widgetConfigurationStatus === 'succeeded' &&
      hasBackendWidgetConfiguration(widgetConfiguration),
    [widgetConfiguration, widgetConfigurationStatus]
  )

  const [map, setMap] = useState(() => readDashboardWidgetVisibility())

  useEffect(() => {
    if (widgetConfigurationStatus === 'succeeded') {
      const resolved = resolveVisibilityMap(widgetConfiguration, widgetConfigurationStatus)
      setMap(resolved)
      if (backendActive) {
        writeDashboardWidgetVisibility(resolved)
      }
    }
  }, [widgetConfiguration, widgetConfigurationStatus, backendActive])

  useEffect(() => {
    const sync = () => {
      if (backendActive) return
      setMap(readDashboardWidgetVisibility())
    }
    window.addEventListener('storage', sync)
    window.addEventListener(DASHBOARD_WIDGET_VISIBILITY_EVENT, sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(DASHBOARD_WIDGET_VISIBILITY_EVENT, sync)
    }
  }, [backendActive])

  const isWidgetVisible = useCallback(
    (key) => isWidgetVisibleInMap(map, normalizeDashboardWidgetKey(key)),
    [map]
  )

  const setWidgetVisible = useCallback(
    (key, visible) => {
      const k = normalizeDashboardWidgetKey(key)
      if (!k) return
      const base = backendActive
        ? widgetConfigurationItemsToVisibilityMap(widgetConfiguration)
        : readDashboardWidgetVisibility()
      const next = applyVisibilityToggleToMap(base, k, visible)
      writeDashboardWidgetVisibility(next)
      setMap(next)
      window.dispatchEvent(new CustomEvent(DASHBOARD_WIDGET_VISIBILITY_EVENT))

      if (role === 'Superadmin') {
        const display_name = resolveWidgetConfigurationDisplayName(k, widgetList)
        const dropdownRow = Array.isArray(widgetList?.titles)
          ? widgetList.titles.find(
              (t) => t && normalizeDashboardWidgetKey(t.key) === k
            )
          : null
        dispatch(
          saveWidgetVisibility({
            widget_key: k,
            is_visible: visible,
            display_name,
            dropdown_name: dropdownRow?.dropdown_name ?? display_name,
          })
        )
      }
    },
    [backendActive, dispatch, role, widgetConfiguration, widgetList]
  )

  return {
    isWidgetVisible,
    setWidgetVisible,
    visibilityMap: map,
    widgetConfigurationStatus,
    backendActive,
    refreshWidgetConfiguration: () => dispatch(fetchWidgetConfiguration()),
  }
}
