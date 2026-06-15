import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { UseAuth, isSuperadminRole } from '../../customhooks/UseAuth'
import { Box, useTheme, useMediaQuery, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Button } from '@mui/material'
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined'
import {
  downloadOccupancyCount,
  downloadInstantOccupancyCount,
  downloadOccupancyByGroup,
  downloadOccupancyByGroupFromLogs,
  downloadSpaceUtilizationPer,
  downloadSpaceUtilizationPerFromLogs,
  // downloadPeakMinOccupancy, // Commented out - not using peak min max API for space utilization
  sendOccupancyCountEmail,
  sendInstantOccupancyCountEmail,
  sendOccupancyByGroupEmail,
  sendOccupancyByGroupFromLogsEmail,
  sendSpaceUtilizationPerEmail,
  sendSpaceUtilizationPerFromLogsEmail,
  // sendPeakMinOccupancyEmail, // Commented out - not using peak min max API for space utilization
  selectOccupancyByGroup,
  selectSpaceUtilizationPerArea,
  selectOccupancyByGroupFromLogs,
  selectSpaceUtilizationPerFromLogs,
  selectOccupancyByGroupFromLogsLoading,
  selectSpaceUtilizationPerFromLogsLoading,
  selectSelectedAreas,
  selectSelectedFloorIds,
  selectSelectedDuration,
  selectCustomDateRange,
  selectOccupancyCount,
  selectInstantOccupancyCount,
  selectInstantOccupancyCountLoading,
  selectInstantOccupancyCountError,
  setSelectedAreas,
  selectCurrentDate,
  selectCurrentYear,
  selectEmailLoading,
  selectIsNavigating,
  selectGlobalLoading,
  clearDataCache,
  setCustomDateRange,
  setCurrentDate,
  setCurrentYear,
  setIsNavigating,
  setSelectedDuration,
} from '../../redux/slice/dashboard/dashboardSlice'
import { fetchFloors } from '../../redux/slice/floor/floorSlice'
import {
  fetchEmailConfigs,
  getWidgetList,
  fetchRenameWidgets,
  fetchWidgetConfiguration,
  saveDashboardChartOrder,
  selectDashboardChartOrder,
  selectDashboardChartOrderStatus,
  selectWidgetConfigurationStatus,
} from '../../redux/slice/settingsslice/heatmap/groupOccupancySlice'
import { selectApplicationTheme } from '../../redux/slice/theme/themeSlice'
import { fetchProfile } from '../../redux/slice/auth/userlogin'
import { isLightSurface } from '../../utils/themeOnSurface'
import {
  isWidgetVisibleInMap,
  useDashboardWidgetVisibility,
} from '../../utils/dashboardWidgetVisibility'
import SpaceInstantUtilizationCombinedChart from './SpaceInstantUtilizationCombinedChart'
import DashboardDurationFilterBar from './DashboardDurationFilterBar'
import {
  SPACE_CHARTS_TAB_ORDER_STORAGE_KEY,
  SPACE_MAIN_TAB_ORDER_STORAGE_KEY,
  migrateSpaceChartOrdersFromSessionToLocalOnce,
} from '../../utils/dashboardChartLayoutStorage'
import LongPressDraggable from '../../utils/LongPressDraggable'
import { liftedFullOrderFromVisibleReorder } from '../../utils/draggableReflowOrder'

import {
  SpaceLayoutRenderer,
  SpaceUtilizationContainer,
  useSpaceUtilizationContainer,
  basicSpaceContainerAdapter,
  createBasicSpaceLayoutAdapter,
  buildSpaceChartsDashboardRows,
  SPACE_TAB_IDS,
} from '../../../../shared/dashboard/space/container'
import { bindChartLoader } from '../../../../shared/dashboard/space/components'
import { SpaceErrorPanel, SpaceStatusPanel } from '../../../../shared/dashboard/space/components/status'
import SPACE_CHART_DEFAULT_COLORS from '../../../../shared/dashboard/space/constants/chartPalette'
import { SpaceChartExportMenu } from '../../../../shared/dashboard/export/components'
import {
  renderBasicSpaceWidgetSlot,
  renderBasicInstantUtilizationCombined,
  renderBasicSpaceEmptyState,
  createBasicSpaceLayoutAdapterStyles,
} from './basicSpaceLayoutSlots'

const ChartLoader = bindChartLoader('basic')
import { formatDateForState, parseDateFromState } from '../../../../shared/dashboard/utils/dashboardDateState'

/**
 * SpaceUtilization Component
 * 
 * Default Data Display:
 * - All user roles (Superadmin, Admin, Operator) see project data by default
 * - Data is automatically fetched for all accessible areas without requiring user selection
 * - Users can still filter by specific floors/areas if desired
 * - Project data includes all areas the user has permission to access
 */

// Updated colors - Light, subtle colors for better visual comfort
const COLORS = SPACE_CHART_DEFAULT_COLORS

/** /dashboard/spaceutilization — same reflow pattern as Energy (drop on another chart to reorder). */
const SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT = [
  'instant_occupancy_count',
  'instant_utilization_combined',
  'utilization_by_area_group',
  'utilization_by_area',
  'peak_and_minimum_utilization',
]
/** Charts-tab order when Space Utilization (Combined) is hidden. */
const SPACE_STANDALONE_CHARTS_ORDER = [
  'instant_occupancy_count',
  'utilization_by_area_group',
  'utilization_by_area',
  'peak_and_minimum_utilization',
]
/** v2: default order places utilization_by_area next to utilization_by_area_group for row layout. */
const SPACE_CHARTS_TAB_ORDER_KEY = SPACE_CHARTS_TAB_ORDER_STORAGE_KEY
const SPACE_CHARTS_TAB_DRAG_TRANSLATE_KEYS = [
  'space-charts-instant-occupancy',
  'space-charts-instant-util-combined',
  'space-charts-occupancy-by-group',
  'space-charts-peak-min-util',
  'space-charts-util-by-area',
]
const SPACE_CHARTS_TAB_SLOT_STORAGE = {
  instant_occupancy_count: 'space-charts-instant-occupancy',
  instant_utilization_combined: 'space-charts-instant-util-combined',
  utilization_by_area_group: 'space-charts-occupancy-by-group',
  peak_and_minimum_utilization: 'space-charts-peak-min-util',
  utilization_by_area: 'space-charts-util-by-area',
}

function normalizeSpaceChartsTabOrder(parsed) {
  if (!Array.isArray(parsed)) return [...SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT]
  const known = new Set(SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT)
  const next = parsed.filter((id) => known.has(id))
  for (const id of SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT) {
    if (!next.includes(id)) next.push(id)
  }
  return next
}

function loadSpaceChartsTabOrderFromSession() {
  migrateSpaceChartOrdersFromSessionToLocalOnce()
  try {
    const raw = localStorage.getItem(SPACE_CHARTS_TAB_ORDER_KEY)
    if (!raw) return [...SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT]
    return normalizeSpaceChartsTabOrder(JSON.parse(raw))
  } catch {
    return [...SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT]
  }
}

/** Space utilization tab (non–charts-tab) — reflow slot order. */
const SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT = [
  'utilization',
  'utilization_by_area_group',
  'peak_and_minimum_utilization',
  'utilization_by_area',
]
const SPACE_MAIN_TAB_ORDER_KEY = SPACE_MAIN_TAB_ORDER_STORAGE_KEY
const SPACE_MAIN_TAB_DRAG_TRANSLATE_KEYS = [
  'space-tab-utilization-line',
  'space-tab-area-groups-pie',
  'space-tab-peak-min',
  'space-tab-utilization-by-area',
]
const SPACE_MAIN_TAB_SLOT_STORAGE = {
  utilization: 'space-tab-utilization-line',
  utilization_by_area_group: 'space-tab-area-groups-pie',
  peak_and_minimum_utilization: 'space-tab-peak-min',
  utilization_by_area: 'space-tab-utilization-by-area',
}

function normalizeSpaceMainTabOrder(parsed) {
  if (!Array.isArray(parsed)) return [...SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT]
  const known = new Set(SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT)
  const next = parsed.filter((id) => known.has(id))
  for (const id of SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT) {
    if (!next.includes(id)) next.push(id)
  }
  return next
}

function loadSpaceMainTabOrderFromSession() {
  migrateSpaceChartOrdersFromSessionToLocalOnce()
  try {
    const raw = localStorage.getItem(SPACE_MAIN_TAB_ORDER_KEY)
    if (!raw) return [...SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT]
    return normalizeSpaceMainTabOrder(JSON.parse(raw))
  } catch {
    return [...SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT]
  }
}

function hasStoredSpaceChartsTabOrder() {
  migrateSpaceChartOrdersFromSessionToLocalOnce()
  try {
    return Boolean(localStorage.getItem(SPACE_CHARTS_TAB_ORDER_KEY))
  } catch {
    return false
  }
}

function hasStoredSpaceMainTabOrder() {
  migrateSpaceChartOrdersFromSessionToLocalOnce()
  try {
    return Boolean(localStorage.getItem(SPACE_MAIN_TAB_ORDER_KEY))
  } catch {
    return false
  }
}

function isCanonicalDefaultSpaceChartsOrder(merged) {
  const def = normalizeSpaceChartsTabOrder([...SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT])
  return JSON.stringify(merged) === JSON.stringify(def)
}

function isCanonicalDefaultSpaceMainOrder(merged) {
  const def = normalizeSpaceMainTabOrder([...SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT])
  return JSON.stringify(merged) === JSON.stringify(def)
}

function clearDragTranslateKeys(keys) {
  if (!keys || !keys.length) return
  for (const k of keys) {
    try {
      sessionStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  }
}

function applySpaceChartsStandaloneOrder(prev, visibilityMap) {
  const isVisible = (id) => isWidgetVisibleInMap(visibilityMap, id)
  if (isVisible('instant_utilization_combined')) {
    return prev
  }
  const visibleStandalone = SPACE_STANDALONE_CHARTS_ORDER.filter((id) => isVisible(id))
  const hidden = [
    ...new Set(prev.filter((id) => !isVisible(id) || id === 'instant_utilization_combined')),
  ]
  const next = [
    ...visibleStandalone,
    ...hidden.filter((id) => !visibleStandalone.includes(id)),
  ]
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return prev
  }
  return next
}

function applySpaceChartsCombinedOrder(prev, visibilityMap) {
  const isVisible = (id) => isWidgetVisibleInMap(visibilityMap, id)
  if (!isVisible('instant_utilization_combined')) {
    return prev
  }
  const rest = SPACE_STANDALONE_CHARTS_ORDER.filter((id) => isVisible(id))
  const visibleOrder = ['instant_utilization_combined', ...rest]
  const hidden = [...new Set(prev.filter((id) => !isVisible(id)))]
  const next = [
    ...visibleOrder,
    ...hidden.filter((id) => !visibleOrder.includes(id)),
  ]
  if (JSON.stringify(prev) === JSON.stringify(next)) {
    return prev
  }
  return next
}

function applySpaceChartsOrderForVisibility(prev, visibilityMap) {
  const isVisible = (id) => isWidgetVisibleInMap(visibilityMap, id)
  return isVisible('instant_utilization_combined')
    ? applySpaceChartsCombinedOrder(prev, visibilityMap)
    : applySpaceChartsStandaloneOrder(prev, visibilityMap)
}

const SpaceUtilization = ({ title, data, isLoading = false, globalLoadingProp = false, showOnlyInstantChart = false, showChartsTab = false }) => {
  const dispatch = useDispatch()
  const { role: spaceUtilUserRole } = UseAuth()
  /** Same layout as Energy: Superadmin may reorder; others see shared order (API + localStorage) without dragging */
  const spaceChartReflowLocked = !isSuperadminRole(spaceUtilUserRole)
  const theme = useTheme()
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('md'))
  const isXLargeScreen = useMediaQuery(theme.breakpoints.up('xl'))
  const is2XLargeScreen = useMediaQuery('(min-width: 1600px)')
  const appTheme = useSelector(selectApplicationTheme)
  const contentColor = appTheme?.application_theme?.content || '#ffffff'
  const spaceUtilLight = useMemo(() => isLightSurface(contentColor), [contentColor])
  /** Recharts + shell colors for Space Utilization when default/white content theme is active. */
  const spaceShell = useMemo(() => {
    if (spaceUtilLight) {
      return {
        plotBg: '#ffffff',
        plotBorder: '1px solid #e0e0e0',
        grid: 'rgba(0, 0, 0, 0.12)',
        axis: '#111827',
        tick: '#111827',
        yLabel: '#111827',
        tooltipBg: '#ffffff',
        tooltipText: 'rgba(0, 0, 0, 0.87)',
        tooltipBorder: '1px solid rgba(0,0,0,0.12)',
        tooltipHeadBorder: 'rgba(0,0,0,0.12)',
        cursor: 'rgba(0, 0, 0, 0.28)',
        areaFill: '#1565C0',
        areaStroke: '#1565C0',
        dotStroke: '#ffffff',
        emptyBg: '#ffffff',
        emptyColor: 'rgba(0, 0, 0, 0.87)',
        spinOuter: '#e0e0e0',
        spinTop: '#1565C0',
        barEdge: 'rgba(0,0,0,0.18)',
        tableRowBorder: 'rgba(0,0,0,0.12)',
        tableText: '#111827',
      }
    }
    return {
      plotBg: '#ffffff',
      plotBorder: '1px solid #e0e0e0',
      grid: 'rgba(0, 0, 0, 0.12)',
      axis: '#111827',
      tick: '#111827',
      yLabel: '#111827',
      tooltipBg: '#ffffff',
      tooltipText: 'rgba(0, 0, 0, 0.87)',
      tooltipBorder: '1px solid rgba(0,0,0,0.12)',
      tooltipHeadBorder: 'rgba(0,0,0,0.12)',
      cursor: 'rgba(0, 0, 0, 0.28)',
      areaFill: '#1565C0',
      areaStroke: '#1565C0',
      dotStroke: '#ffffff',
      emptyBg: '#ffffff',
      emptyColor: 'rgba(0, 0, 0, 0.87)',
      spinOuter: '#e0e0e0',
      spinTop: '#1565C0',
      barEdge: 'rgba(0,0,0,0.18)',
      tableRowBorder: 'rgba(0,0,0,0.12)',
      tableText: '#111827',
    }
  }, [spaceUtilLight])

  const chartHeaderStyle = useMemo(() => ({
    margin: 0,
    color: '#000000',
    fontWeight: 600,
    fontFamily: 'inherit',
    fontSize: isLargeScreen ? '18px' : '16px'
  }), [isLargeScreen, spaceUtilLight])

  /** Same outer footprint as Energy Light Power Density (200px card). */
  const spacePeakMinOuterSx = useMemo(
    () => ({
      backgroundColor: spaceUtilLight ? '#ffffff' : 'rgba(128, 120, 100, 0.6)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      border: spaceUtilLight ? '1px solid #e8e8e8' : '1px solid #ccc',
      height: '200px',
      width: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
    }),
    [spaceUtilLight]
  )
  const spacePeakMinHeaderRowSx = useMemo(
    () => ({
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      flexShrink: 0,
    }),
    []
  )
  const { isWidgetVisible, visibilityMap } = useDashboardWidgetVisibility()
  const dashboardChartOrder = useSelector(selectDashboardChartOrder)
  const dashboardChartOrderStatus = useSelector(selectDashboardChartOrderStatus)
  const widgetConfigurationStatus = useSelector(selectWidgetConfigurationStatus)

  const [spaceChartsTabOrder, setSpaceChartsTabOrder] = useState(loadSpaceChartsTabOrderFromSession)
  const spaceChartsAllVisible = useMemo(
    () => SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT.every((id) => isWidgetVisible(id)),
    [isWidgetVisible, visibilityMap]
  )
  const prevSpaceChartsAllVisibleRef = useRef(spaceChartsAllVisible)
  const spaceChartsVisibleOrder = useMemo(() => {
    if (isWidgetVisible('instant_utilization_combined')) {
      const rest = SPACE_STANDALONE_CHARTS_ORDER.filter((id) => isWidgetVisible(id))
      return ['instant_utilization_combined', ...rest]
    }
    return SPACE_STANDALONE_CHARTS_ORDER.filter((id) => isWidgetVisible(id))
  }, [visibilityMap, isWidgetVisible])

  const prevSpaceChartsVisibleSigRef = useRef('')
  useEffect(() => {
    const sig = spaceChartsVisibleOrder.join(',')
    if (prevSpaceChartsVisibleSigRef.current && prevSpaceChartsVisibleSigRef.current !== sig) {
      clearDragTranslateKeys(SPACE_CHARTS_TAB_DRAG_TRANSLATE_KEYS)
    }
    prevSpaceChartsVisibleSigRef.current = sig
  }, [spaceChartsVisibleOrder])
  /** When Space Utilization (Combined) is hidden, show duration filter above remaining charts (same as inside combined card). */
  const showSpaceChartsStandaloneDurationFilter = useMemo(
    () =>
      showChartsTab &&
      !isWidgetVisible('instant_utilization_combined') &&
      spaceChartsVisibleOrder.length > 0,
    [showChartsTab, isWidgetVisible, visibilityMap, spaceChartsVisibleOrder]
  )
  const onReorderSpaceChartsTab = useCallback((nextVisible) => {
    if (spaceChartReflowLocked) return
    setSpaceChartsTabOrder((prev) => {
      const merged = liftedFullOrderFromVisibleReorder(prev, nextVisible)
      try {
        localStorage.setItem(SPACE_CHARTS_TAB_ORDER_KEY, JSON.stringify(merged))
      } catch {
        /* ignore */
      }
      dispatch(saveDashboardChartOrder({ space_charts_tab_order: merged }))
      return merged
    })
  }, [spaceChartReflowLocked, dispatch])
  const spaceChartsTabReflowBase = useMemo(
    () => ({
      groupKey: 'space-charts-tab',
      orderedSlotIds: spaceChartsVisibleOrder,
      onReorder: onReorderSpaceChartsTab,
      translateStorageKeys: SPACE_CHARTS_TAB_DRAG_TRANSLATE_KEYS,
    }),
    [spaceChartsVisibleOrder, onReorderSpaceChartsTab]
  )

  const [spaceMainTabOrder, setSpaceMainTabOrder] = useState(loadSpaceMainTabOrderFromSession)
  const spaceMainAllVisible = useMemo(
    () => SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT.every((id) => isWidgetVisible(id)),
    [isWidgetVisible, visibilityMap]
  )
  const prevSpaceMainAllVisibleRef = useRef(spaceMainAllVisible)
  const spaceMainVisibleOrder = useMemo(
    () => spaceMainTabOrder.filter((id) => isWidgetVisible(id)),
    [spaceMainTabOrder, isWidgetVisible, visibilityMap]
  )
  const onReorderSpaceMainTab = useCallback((nextVisible) => {
    if (spaceChartReflowLocked) return
    setSpaceMainTabOrder((prev) => {
      const merged = liftedFullOrderFromVisibleReorder(prev, nextVisible)
      try {
        localStorage.setItem(SPACE_MAIN_TAB_ORDER_KEY, JSON.stringify(merged))
      } catch {
        /* ignore */
      }
      dispatch(saveDashboardChartOrder({ space_main_tab_order: merged }))
      return merged
    })
  }, [spaceChartReflowLocked, dispatch])
  const spaceMainTabReflowBase = useMemo(
    () => ({
      groupKey: 'space-main-tab',
      orderedSlotIds: spaceMainVisibleOrder,
      onReorder: onReorderSpaceMainTab,
      translateStorageKeys: SPACE_MAIN_TAB_DRAG_TRANSLATE_KEYS,
    }),
    [spaceMainVisibleOrder, onReorderSpaceMainTab]
  )

  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return
    const raw = dashboardChartOrder?.space_charts_tab_order
    if (!Array.isArray(raw) || raw.length === 0) return
    const merged = normalizeSpaceChartsTabOrder(raw)
    if (
      isCanonicalDefaultSpaceChartsOrder(merged) &&
      hasStoredSpaceChartsTabOrder()
    ) {
      try {
        const localMerged = loadSpaceChartsTabOrderFromSession()
        if (!isCanonicalDefaultSpaceChartsOrder(localMerged)) {
          return
        }
      } catch {
        /* apply merged below */
      }
    }
    const ordered = applySpaceChartsOrderForVisibility(merged, visibilityMap)
    setSpaceChartsTabOrder(ordered)
    try {
      localStorage.setItem(SPACE_CHARTS_TAB_ORDER_KEY, JSON.stringify(ordered))
    } catch {
      /* ignore */
    }
  }, [dashboardChartOrder, dashboardChartOrderStatus, visibilityMap])

  const prevSpaceCombinedVisibleRef = useRef(null)
  useEffect(() => {
    const combinedOn = isWidgetVisible('instant_utilization_combined')
    const combinedVisibilityChanged =
      prevSpaceCombinedVisibleRef.current !== null &&
      prevSpaceCombinedVisibleRef.current !== combinedOn
    prevSpaceCombinedVisibleRef.current = combinedOn

    setSpaceChartsTabOrder((prev) => {
      const next = applySpaceChartsOrderForVisibility(prev, visibilityMap)
      if (JSON.stringify(next) === JSON.stringify(prev)) return prev
      if (combinedVisibilityChanged) {
        clearDragTranslateKeys(SPACE_CHARTS_TAB_DRAG_TRANSLATE_KEYS)
      }
      try {
        localStorage.setItem(SPACE_CHARTS_TAB_ORDER_KEY, JSON.stringify(next))
      } catch {
        /* ignore */
      }
      if (!spaceChartReflowLocked) {
        dispatch(saveDashboardChartOrder({ space_charts_tab_order: next }))
      }
      return next
    })
  }, [visibilityMap, isWidgetVisible, spaceChartReflowLocked, dispatch])

  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return
    const raw = dashboardChartOrder?.space_main_tab_order
    if (!Array.isArray(raw) || raw.length === 0) return
    const merged = normalizeSpaceMainTabOrder(raw)
    if (
      isCanonicalDefaultSpaceMainOrder(merged) &&
      hasStoredSpaceMainTabOrder()
    ) {
      try {
        const localMerged = loadSpaceMainTabOrderFromSession()
        if (!isCanonicalDefaultSpaceMainOrder(localMerged)) {
          return
        }
      } catch {
        /* apply merged below */
      }
    }
    setSpaceMainTabOrder(merged)
    try {
      localStorage.setItem(SPACE_MAIN_TAB_ORDER_KEY, JSON.stringify(merged))
    } catch {
      /* ignore */
    }
  }, [dashboardChartOrder, dashboardChartOrderStatus])

  /** GET omitted space_charts_tab_order: sync from shared localStorage (same browser as Superadmin). */
  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return
    const raw = dashboardChartOrder?.space_charts_tab_order
    if (Array.isArray(raw) && raw.length > 0) return
    if (!hasStoredSpaceChartsTabOrder()) return
    setSpaceChartsTabOrder(
      applySpaceChartsOrderForVisibility(loadSpaceChartsTabOrderFromSession(), visibilityMap)
    )
  }, [dashboardChartOrder, dashboardChartOrderStatus, visibilityMap])

  /** GET omitted space_main_tab_order: sync from shared localStorage. */
  useEffect(() => {
    if (dashboardChartOrderStatus !== 'succeeded') return
    const raw = dashboardChartOrder?.space_main_tab_order
    if (Array.isArray(raw) && raw.length > 0) return
    if (!hasStoredSpaceMainTabOrder()) return
    setSpaceMainTabOrder(loadSpaceMainTabOrderFromSession())
  }, [dashboardChartOrder, dashboardChartOrderStatus])

  // If ALL space widgets are visible, reset to original default positions (per section).
  useEffect(() => {
    if (!spaceChartsAllVisible) return
    if (isCanonicalDefaultSpaceChartsOrder(spaceChartsTabOrder)) return
    const merged = normalizeSpaceChartsTabOrder([...SPACE_CHARTS_TAB_SLOT_ORDER_DEFAULT])
    setSpaceChartsTabOrder(merged)
    try {
      localStorage.setItem(SPACE_CHARTS_TAB_ORDER_KEY, JSON.stringify(merged))
    } catch {
      /* ignore */
    }
    clearDragTranslateKeys(SPACE_CHARTS_TAB_DRAG_TRANSLATE_KEYS)
    if (!spaceChartReflowLocked) {
      dispatch(saveDashboardChartOrder({ space_charts_tab_order: merged }))
    }
  }, [spaceChartsAllVisible, spaceChartsTabOrder, spaceChartReflowLocked, dispatch])

  useEffect(() => {
    if (!spaceMainAllVisible) return
    if (isCanonicalDefaultSpaceMainOrder(spaceMainTabOrder)) return
    const merged = normalizeSpaceMainTabOrder([...SPACE_MAIN_TAB_SLOT_ORDER_DEFAULT])
    setSpaceMainTabOrder(merged)
    try {
      localStorage.setItem(SPACE_MAIN_TAB_ORDER_KEY, JSON.stringify(merged))
    } catch {
      /* ignore */
    }
    clearDragTranslateKeys(SPACE_MAIN_TAB_DRAG_TRANSLATE_KEYS)
    if (!spaceChartReflowLocked) {
      dispatch(saveDashboardChartOrder({ space_main_tab_order: merged }))
    }
  }, [spaceMainAllVisible, spaceMainTabOrder, spaceChartReflowLocked, dispatch])

  /** Charts tab slot width inside an explicit row (avoids flex-wrap overlap when only a subset of widgets is visible). */
  const spaceChartsRowSlotSx = useCallback(
    (slotId, pair) => {
      const forceFullWidth =
        slotId === 'instant_occupancy_count' || slotId === 'instant_utilization_combined'
      const aloneOnRow = pair.length === 1
      if (forceFullWidth) {
        return {
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          maxWidth: '100%',
          alignSelf: 'stretch',
          boxSizing: 'border-box',
        }
      }
      if (aloneOnRow) {
        return {
          flex: { xs: 'none', md: '0 0 auto' },
          minWidth: 0,
          width: {
            xs: '100%',
            md: `calc((100% - ${theme.spacing(3)}) / 2)`,
            lg: `calc((100% - ${theme.spacing(4)}) / 2)`,
            xl: `calc((100% - ${theme.spacing(4)}) / 2)`,
          },
          maxWidth: {
            xs: '100%',
            md: `calc((100% - ${theme.spacing(3)}) / 2)`,
            lg: `calc((100% - ${theme.spacing(4)}) / 2)`,
            xl: `calc((100% - ${theme.spacing(4)}) / 2)`,
          },
          alignSelf: { xs: 'stretch', md: 'flex-start' },
          boxSizing: 'border-box',
        }
      }
      return {
        flex: { xs: 'none', md: '1 1 0' },
        minWidth: 0,
        width: { xs: '100%', md: 'auto' },
        boxSizing: 'border-box',
      }
    },
    [theme]
  )

  const spaceMainSlotWrapperSx = useCallback(
    (slotId) => {
      const halfColumn =
        slotId !== 'utilization'
          ? {
              maxWidth: {
                xs: '100%',
                lg: `calc((100% - ${theme.spacing(5.5)}) / 2)`,
                xl: `calc((100% - ${theme.spacing(6)}) / 2)`,
              },
            }
          : {}
      return {
        width: '100%',
        display: 'flex',
        justifyContent: { xs: 'stretch', lg: 'flex-start' },
        ...halfColumn,
      }
    },
    [theme]
  )

  const exportDropdownRef = useRef(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Use global loading state from Redux for time range changes

  // Snackbar state for email notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')

  // Email dialog state - DISABLED: No popup, using saved email only
  // State variables kept for compatibility but not used
  const [emailDialogOpen] = useState(false)
  const [emailInput] = useState('')
  const [pendingEmailAction] = useState(null)

  // Snackbar handlers
  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const userProfile = useSelector((state) => state.user?.profile)
  const profileLoading = useSelector((state) => state.user?.profileLoading)

  const selectedAreas = useSelector(selectSelectedAreas)
  const selectedFloorIds = useSelector(selectSelectedFloorIds)
  const selectedDuration = useSelector(selectSelectedDuration)
  const customDateRange = useSelector(selectCustomDateRange)
  const isNavigating = useSelector(selectIsNavigating)
  const globalLoading = useSelector(selectGlobalLoading)
  const currentDate = useSelector(selectCurrentDate)
  const currentYear = useSelector(selectCurrentYear)
  const occupancyByGroup = useSelector(selectOccupancyByGroup)
  const spaceUtilizationPerArea = useSelector(selectSpaceUtilizationPerArea)
  const occupancyByGroupFromLogs = useSelector(selectOccupancyByGroupFromLogs)
  const spaceUtilizationPerFromLogs = useSelector(selectSpaceUtilizationPerFromLogs)
  const occupancyByGroupFromLogsLoading = useSelector(selectOccupancyByGroupFromLogsLoading)
  const spaceUtilizationPerFromLogsLoading = useSelector(selectSpaceUtilizationPerFromLogsLoading)

  const occupancyCount = useSelector(selectOccupancyCount)
  const emailLoading = useSelector(selectEmailLoading)
  const widgetList = useSelector(getWidgetList)

  // Get loading and error states
  const dashboardStatus = useSelector((state) => state.dashboard.status)
  const dashboardLoading = useSelector((state) => state.dashboard.loading)
  const dashboardError = useSelector((state) => state.dashboard.error)

  // Get individual chart loading states - Use specific loading states for each API call
  const occupancyCountLoading = useSelector((state) => state.dashboard.occupancyCountLoading || false)
  const occupancyByGroupLoading = useSelector((state) => state.dashboard.occupancyByGroupLoading || false)
  const spaceUtilizationLoading = useSelector((state) => state.dashboard.spaceUtilizationLoading || false)

  // Use _from_logs data when in Charts tab, otherwise use regular data
  const activeOccupancyByGroup = showChartsTab ? occupancyByGroupFromLogs : occupancyByGroup
  const activeSpaceUtilizationPerArea = showChartsTab ? spaceUtilizationPerFromLogs : spaceUtilizationPerArea
  const activeOccupancyByGroupLoading = showChartsTab ? occupancyByGroupFromLogsLoading : occupancyByGroupLoading
  const activeSpaceUtilizationLoading = showChartsTab ? spaceUtilizationPerFromLogsLoading : spaceUtilizationLoading
  const instantOccupancyCountLoading = useSelector((state) => state.dashboard.instantOccupancyCountLoading || false)
  const instantOccupancyCountError = useSelector((state) => state.dashboard.instantOccupancyCountError || null)
  const instantOccupancyCount = useSelector((state) => state.dashboard.instantOccupancyCount || null)

  const containerRuntime = useMemo(
    () => ({
      showChartsTab,
      showOnlyInstantChart,
      isLoading,
      globalLoadingProp,
      dispatch,
      showSnackbar,
      userProfile,
      fetchEmailConfigs,
      selectedAreas,
      selectedFloorIds,
      selectedDuration,
      customDateRange,
      isNavigating,
      globalLoading,
      currentDate,
      currentYear,
      occupancyByGroup,
      spaceUtilizationPerArea,
      occupancyByGroupFromLogs,
      spaceUtilizationPerFromLogs,
      occupancyByGroupFromLogsLoading,
      spaceUtilizationPerFromLogsLoading,
      occupancyCount,
      instantOccupancyCount,
      instantOccupancyCountError,
      instantOccupancyCountLoading,
      occupancyCountLoading,
      occupancyByGroupLoading,
      spaceUtilizationLoading,
      widgetList,
      spaceShell,
      spaceUtilLight,
      colorPalette: COLORS,
      isLargeScreen,
      ChartLoader,
      spaceChartsVisibleOrder,
      spaceMainVisibleOrder,
      showSpaceChartsStandaloneDurationFilter,
      exportThunks: {
        sendInstantOccupancyCountEmail,
        downloadInstantOccupancyCount,
        sendOccupancyCountEmail,
        downloadOccupancyCount,
        sendOccupancyByGroupFromLogsEmail,
        downloadOccupancyByGroupFromLogs,
        sendOccupancyByGroupEmail,
        downloadOccupancyByGroup,
        sendSpaceUtilizationPerFromLogsEmail,
        downloadSpaceUtilizationPerFromLogs,
        sendSpaceUtilizationPerEmail,
        downloadSpaceUtilizationPer,
      },
    }),
    [
      showChartsTab,
      showOnlyInstantChart,
      isLoading,
      globalLoadingProp,
      dispatch,
      selectedAreas,
      selectedFloorIds,
      selectedDuration,
      customDateRange,
      isNavigating,
      globalLoading,
      currentDate,
      currentYear,
      occupancyByGroup,
      spaceUtilizationPerArea,
      occupancyByGroupFromLogs,
      spaceUtilizationPerFromLogs,
      occupancyByGroupFromLogsLoading,
      spaceUtilizationPerFromLogsLoading,
      occupancyCount,
      instantOccupancyCount,
      instantOccupancyCountError,
      instantOccupancyCountLoading,
      occupancyCountLoading,
      occupancyByGroupLoading,
      spaceUtilizationLoading,
      widgetList,
      spaceShell,
      spaceUtilLight,
      isLargeScreen,
      spaceChartsVisibleOrder,
      spaceMainVisibleOrder,
      showSpaceChartsStandaloneDurationFilter,
    ]
  );

  const orchestration = useSpaceUtilizationContainer(basicSpaceContainerAdapter, containerRuntime);

  const {
    exports: {
      showExportDropdown,
      setShowExportDropdown,
      exportLoading,
      handleExport,
    },
    widgetContext: spaceWidgetRenderContext,
  } = orchestration;

  // Use global loading as fallback when specific loading states are not available
  const anyLoading = occupancyCountLoading || activeOccupancyByGroupLoading || activeSpaceUtilizationLoading || instantOccupancyCountLoading || globalLoading

  // Check for specific API errors
  const hasApiErrors = () => {
    return (
      (activeOccupancyByGroup && activeOccupancyByGroup.status === 'error') ||
      (activeSpaceUtilizationPerArea && activeSpaceUtilizationPerArea.status === 'error')
    )
  }

  // Get floors from Redux store
  const floors = useSelector((state) => state.floor.floors)
  const floorStatus = useSelector((state) => state.floor.status)

  // REMOVED: loadAllAreasFromAllFloors function to prevent duplicate API calls
  // The Dashboard component handles all area loading and API calls
  // SpaceUtilization should only display data, not make API calls

  // REMOVED: flattenAreaTree function - no longer needed since we don't load areas here

  // Fetch floors on component mount
  useEffect(() => {
    // if (floors.length === 0 && floorStatus !== 'loading') {
    dispatch(fetchFloors())
    // }
  }, [dispatch])

  // Fetch rename widgets when component mounts (only if not already loaded)
  useEffect(() => {
    if (!widgetList || widgetList.length === 0) {
      dispatch(fetchRenameWidgets())
    }
  }, [dispatch, widgetList])

  useEffect(() => {
    if (widgetConfigurationStatus === 'idle') {
      dispatch(fetchWidgetConfiguration())
    }
  }, [dispatch, widgetConfigurationStatus])

  // Fetch user profile on component mount
  useEffect(() => {
    dispatch(fetchProfile())
  }, [dispatch])

  // REMOVED: useEffect that was calling loadAllAreasFromAllFloors
  // This was causing duplicate API calls when switching tabs
  // The Dashboard component handles all area loading and API calls

  // FIXED: Removed clearDataCache call to prevent triggering unnecessary API calls
  // The Dashboard component handles data caching and API calls
  // SpaceUtilization should only display data, not manage API calls

  // Note: This component should NOT make API calls - Dashboard component handles all API calls
  // This useEffect only handles component initialization and data display
  useEffect(() => {
    // Mark as initialized when component mounts
    if (!hasInitialized) {
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  // Navigation handlers - Enable export for all users
  const handlePrevious = () => {
    const now = parseDateFromState(currentDate);
    let newDate;

    switch (selectedDuration) {
      case 'this-day':
        newDate = new Date(now);
        newDate.setDate(now.getDate() - 1);

        // Keep UI showing "this-day" but set custom date range for data fetching
        const startDate = new Date(newDate);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(newDate);
        endDate.setHours(23, 59, 59, 999);

        // Use simple date format without time to avoid timezone issues
        const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
        const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

        // Don't change selectedDuration, just update custom date range and current date
        dispatch(setCustomDateRange({
          startDate: startDateStr,
          endDate: endDateStr
        }));
        dispatch(setCurrentDate(formatDateForState(newDate)));
        dispatch(setIsNavigating(true));
        return;
      case 'this-week':
        newDate = new Date(now);
        newDate.setDate(now.getDate() - 7);

        // Keep UI showing "this-week" but set custom date range for data fetching
        const startOfWeek = new Date(newDate);
        startOfWeek.setDate(newDate.getDate() - newDate.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
        endOfWeek.setHours(23, 59, 59, 999);

        // Use simple date format without time to avoid timezone issues
        const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
        const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}`;

        // Don't change selectedDuration, just update custom date range and current date
        dispatch(setCustomDateRange({
          startDate: startOfWeekStr,
          endDate: endOfWeekStr
        }));
        dispatch(setCurrentDate(formatDateForState(newDate)));
        dispatch(setIsNavigating(true));
        return;
      case 'this-month':
        newDate = new Date(now);
        newDate.setMonth(now.getMonth() - 1);

        // Keep UI showing "this-month" but set custom date range for data fetching
        const startOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        const endOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Use local time components instead of toISOString()
        const startOfMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}T${String(startOfMonth.getHours()).padStart(2, '0')}:${String(startOfMonth.getMinutes()).padStart(2, '0')}:${String(startOfMonth.getSeconds()).padStart(2, '0')}`;
        const endOfMonthStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}T${String(endOfMonth.getHours()).padStart(2, '0')}:${String(endOfMonth.getMinutes()).padStart(2, '0')}:${String(endOfMonth.getSeconds()).padStart(2, '0')}`;

        // Don't change selectedDuration, just update custom date range and current date
        dispatch(setCustomDateRange({
          startDate: startOfMonthStr,
          endDate: endOfMonthStr
        }));
        dispatch(setCurrentDate(formatDateForState(newDate)));
        dispatch(setIsNavigating(true));
        return;
      case 'this-year':
        newDate = new Date(now);
        newDate.setFullYear(now.getFullYear() - 1);

        // Keep UI showing "this-year" but set custom date range for data fetching
        const startOfYear = new Date(newDate.getFullYear(), 0, 1);
        startOfYear.setHours(0, 0, 0, 0);
        const endOfYear = new Date(newDate.getFullYear(), 11, 31);
        endOfYear.setHours(23, 59, 59, 999);

        // Use local time components instead of toISOString()
        const startOfYearStr = `${startOfYear.getFullYear()}-${String(startOfYear.getMonth() + 1).padStart(2, '0')}-${String(startOfYear.getDate()).padStart(2, '0')}T${String(startOfYear.getHours()).padStart(2, '0')}:${String(startOfYear.getMinutes()).padStart(2, '0')}:${String(startOfYear.getSeconds()).padStart(2, '0')}`;
        const endOfYearStr = `${endOfYear.getFullYear()}-${String(endOfYear.getMonth() + 1).padStart(2, '0')}-${String(endOfYear.getDate()).padStart(2, '0')}T${String(endOfYear.getHours()).padStart(2, '0')}:${String(endOfYear.getMinutes()).padStart(2, '0')}:${String(endOfYear.getSeconds()).padStart(2, '0')}`;

        // Don't change selectedDuration, just update custom date range and current date
        // Setting custom date range for previous year
        dispatch(setCustomDateRange({
          startDate: startOfYearStr,
          endDate: endOfYearStr
        }));
        dispatch(setCurrentDate(formatDateForState(newDate)));
        dispatch(setIsNavigating(true));
        return;
      case 'custom':
        // Handle custom date range navigation
        if (!customDateRange.startDate || !customDateRange.endDate) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        const currentStartDate = new Date(customDateRange.startDate);
        const currentEndDate = new Date(customDateRange.endDate);

        // Validate dates
        if (Number.isNaN(currentStartDate.getTime()) || Number.isNaN(currentEndDate.getTime())) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        if (currentStartDate > currentEndDate) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        const dayDiff = Math.ceil((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;

        const newStartDate = new Date(currentStartDate);
        newStartDate.setDate(newStartDate.getDate() - dayDiff);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() - dayDiff);

        // Use local time components instead of toISOString()
        const newStartDateStr = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}-${String(newStartDate.getDate()).padStart(2, '0')}T${String(newStartDate.getHours()).padStart(2, '0')}:${String(newStartDate.getMinutes()).padStart(2, '0')}:${String(newStartDate.getSeconds()).padStart(2, '0')}`;
        const newEndDateStr = `${newEndDate.getFullYear()}-${String(newEndDate.getMonth() + 1).padStart(2, '0')}-${String(newEndDate.getDate()).padStart(2, '0')}T${String(newEndDate.getHours()).padStart(2, '0')}:${String(newEndDate.getMinutes()).padStart(2, '0')}:${String(newEndDate.getSeconds()).padStart(2, '0')}`;

        dispatch(setCustomDateRange({
          startDate: newStartDateStr,
          endDate: newEndDateStr
        }));
        dispatch(setCurrentDate(formatDateForState(newStartDate)));
        dispatch(setIsNavigating(true));
        return;
      default:
        newDate = new Date(now);
        newDate.setDate(now.getDate() - 1);
    }

    dispatch(setCurrentDate(formatDateForState(newDate)));
    dispatch(setIsNavigating(true));
  };

  const handleNext = () => {
    const now = parseDateFromState(currentDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    let newDate;

    switch (selectedDuration) {
      case 'this-day':
        newDate = new Date(now);
        newDate.setDate(now.getDate() + 1);

        // Don't allow navigation to future dates
        if (newDate <= today) {
          // Keep UI showing "this-day" but set custom date range for data fetching
          const startDate = new Date(newDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(newDate);
          endDate.setHours(23, 59, 59, 999);

          // Use local time components instead of toISOString()
          const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}:${String(startDate.getSeconds()).padStart(2, '0')}`;
          const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}:${String(endDate.getSeconds()).padStart(2, '0')}`;

          // Don't change selectedDuration, just update custom date range and current date
          dispatch(setCustomDateRange({
            startDate: startDateStr,
            endDate: endDateStr
          }));
          dispatch(setCurrentDate(formatDateForState(newDate)));
          dispatch(setIsNavigating(true));
        }
        return;
      case 'this-week':
        newDate = new Date(now);
        newDate.setDate(now.getDate() + 7);

        // Don't allow navigation to future weeks
        if (newDate <= today) {
          // Keep UI showing "this-week" but set custom date range for data fetching
          const startOfWeek = new Date(newDate);
          startOfWeek.setDate(newDate.getDate() - newDate.getDay()); // Start of week (Sunday)
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)
          endOfWeek.setHours(23, 59, 59, 999);

          // Use local time components instead of toISOString()
          const startOfWeekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}T${String(startOfWeek.getHours()).padStart(2, '0')}:${String(startOfWeek.getMinutes()).padStart(2, '0')}:${String(startOfWeek.getSeconds()).padStart(2, '0')}`;
          const endOfWeekStr = `${endOfWeek.getFullYear()}-${String(endOfWeek.getMonth() + 1).padStart(2, '0')}-${String(endOfWeek.getDate()).padStart(2, '0')}T${String(endOfWeek.getHours()).padStart(2, '0')}:${String(endOfWeek.getMinutes()).padStart(2, '0')}:${String(endOfWeek.getSeconds()).padStart(2, '0')}`;

          // Don't change selectedDuration, just update custom date range and current date
          dispatch(setCustomDateRange({
            startDate: startOfWeekStr,
            endDate: endOfWeekStr
          }));
          dispatch(setCurrentDate(formatDateForState(newDate)));
          dispatch(setIsNavigating(true));
        }
        return;
      case 'this-month':
        newDate = new Date(now);
        newDate.setMonth(now.getMonth() + 1);

        // Don't allow navigation to future months
        if (newDate <= today) {
          // Keep UI showing "this-month" but set custom date range for data fetching
          const startOfMonth = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
          startOfMonth.setHours(0, 0, 0, 0);
          const endOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);

          // Use local time components instead of toISOString()
          const startOfMonthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-${String(startOfMonth.getDate()).padStart(2, '0')}T${String(startOfMonth.getHours()).padStart(2, '0')}:${String(startOfMonth.getMinutes()).padStart(2, '0')}:${String(startOfMonth.getSeconds()).padStart(2, '0')}`;
          const endOfMonthStr = `${endOfMonth.getFullYear()}-${String(endOfMonth.getMonth() + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}T${String(endOfMonth.getHours()).padStart(2, '0')}:${String(endOfMonth.getMinutes()).padStart(2, '0')}:${String(endOfMonth.getSeconds()).padStart(2, '0')}`;

          // Don't change selectedDuration, just update custom date range and current date
          dispatch(setCustomDateRange({
            startDate: startOfMonthStr,
            endDate: endOfMonthStr
          }));
          dispatch(setCurrentDate(formatDateForState(newDate)));
          dispatch(setIsNavigating(true));
        }
        return;
      case 'this-year':
        newDate = new Date(now);
        newDate.setFullYear(now.getFullYear() + 1);

        // Don't allow navigation to future years
        if (newDate.getFullYear() <= today.getFullYear()) {
          // Keep UI showing "this-year" but set custom date range for data fetching
          const startOfYear = new Date(newDate.getFullYear(), 0, 1);
          startOfYear.setHours(0, 0, 0, 0);
          const endOfYear = new Date(newDate.getFullYear(), 11, 31);
          endOfYear.setHours(23, 59, 59, 999);

          // Use local time components instead of toISOString()
          const startOfYearStr = `${startOfYear.getFullYear()}-${String(startOfYear.getMonth() + 1).padStart(2, '0')}-${String(startOfYear.getDate()).padStart(2, '0')}T${String(startOfYear.getHours()).padStart(2, '0')}:${String(startOfYear.getMinutes()).padStart(2, '0')}:${String(startOfYear.getSeconds()).padStart(2, '0')}`;
          const endOfYearStr = `${endOfYear.getFullYear()}-${String(endOfYear.getMonth() + 1).padStart(2, '0')}-${String(endOfYear.getDate()).padStart(2, '0')}T${String(endOfYear.getHours()).padStart(2, '0')}:${String(endOfYear.getMinutes()).padStart(2, '0')}:${String(endOfYear.getSeconds()).padStart(2, '0')}`;

          // Don't change selectedDuration, just update custom date range and current date
          dispatch(setCustomDateRange({
            startDate: startOfYearStr,
            endDate: endOfYearStr
          }));
          dispatch(setCurrentDate(formatDateForState(newDate)));
          dispatch(setIsNavigating(true));
        }
        return;
      case 'custom':
        // Handle custom date range navigation
        if (!customDateRange.startDate || !customDateRange.endDate) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        const currentStartDate = new Date(customDateRange.startDate);
        const currentEndDate = new Date(customDateRange.endDate);

        // Validate dates
        if (Number.isNaN(currentStartDate.getTime()) || Number.isNaN(currentEndDate.getTime())) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        if (currentStartDate > currentEndDate) {
          showSnackbar('Please select valid dates', 'error');
          return;
        }

        const dayDiff = Math.ceil((currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) + 1;

        const newStartDate = new Date(currentStartDate);
        newStartDate.setDate(newStartDate.getDate() + dayDiff);
        const newEndDate = new Date(currentEndDate);
        newEndDate.setDate(newEndDate.getDate() + dayDiff);

        // Don't allow navigation to future dates
        if (newEndDate <= today) {
          // Use local time components instead of toISOString()
          const newStartDateStr = `${newStartDate.getFullYear()}-${String(newStartDate.getMonth() + 1).padStart(2, '0')}-${String(newStartDate.getDate()).padStart(2, '0')}T${String(newStartDate.getHours()).padStart(2, '0')}:${String(newStartDate.getMinutes()).padStart(2, '0')}:${String(newStartDate.getSeconds()).padStart(2, '0')}`;
          const newEndDateStr = `${newEndDate.getFullYear()}-${String(newEndDate.getMonth() + 1).padStart(2, '0')}-${String(newEndDate.getDate()).padStart(2, '0')}T${String(newEndDate.getHours()).padStart(2, '0')}:${String(newEndDate.getMinutes()).padStart(2, '0')}:${String(newEndDate.getSeconds()).padStart(2, '0')}`;

          dispatch(setCustomDateRange({
            startDate: newStartDateStr,
            endDate: newEndDateStr
          }));
          dispatch(setCurrentDate(formatDateForState(newStartDate)));
          dispatch(setIsNavigating(true));
        }
        return;
      default:
        newDate = new Date(now);
        newDate.setDate(now.getDate() + 1);
    }

    dispatch(setCurrentDate(formatDateForState(newDate)));
    dispatch(setIsNavigating(true));
  };

  /** Space combined card: same duration change behavior as `Dashboard` `handleDurationChange` (Energy charts). */
  const handleSpaceChartsDurationChange = useCallback((e) => {
    e.stopPropagation();
    const newDuration = e.target.value;
    if (!newDuration || newDuration === selectedDuration) return;
    const today = new Date();
    dispatch(setCurrentDate(formatDateForState(today)));
    dispatch(setCurrentYear(today.getFullYear()));
    dispatch(setCustomDateRange({ startDate: null, endDate: null }));
    dispatch(setIsNavigating(false));
    dispatch(setSelectedDuration(newDuration));
  }, [dispatch, selectedDuration]);

  // Helper functions for navigation display — match Energy `Dashboard` `getCurrentPeriodText` formatting
  const getCurrentPeriodText = () => {
    const currentDateObj = parseDateFromState(currentDate)

    if (selectedDuration === 'this-day') {
      return currentDateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }
    if (selectedDuration === 'this-week') {
      const startOfWeek = new Date(currentDateObj)
      startOfWeek.setDate(currentDateObj.getDate() - currentDateObj.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`
      }
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${startOfWeek.getFullYear()}`
    }
    if (selectedDuration === 'this-month') {
      return currentDateObj.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    }
    if (selectedDuration === 'this-year') {
      return currentYear.toString()
    }
    if (selectedDuration === 'custom') {
      if (customDateRange.startDate && customDateRange.endDate) {
        const startDate = new Date(customDateRange.startDate)
        const endDate = new Date(customDateRange.endDate)
        if (startDate.toDateString() === endDate.toDateString()) {
          return startDate.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        }
        if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${endDate.getDate()}, ${startDate.getFullYear()}`
        }
        if (startDate.getFullYear() === endDate.getFullYear()) {
          return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${startDate.getFullYear()}`
        }
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      }
    }
    return ''
  }

  const spaceChartsDurationFilterElement = useMemo(
    () => (
      <DashboardDurationFilterBar
        selectedDuration={selectedDuration}
        onDurationChange={handleSpaceChartsDurationChange}
        customDateRange={customDateRange}
        onCustomStartDateChange={(startDate) =>
          dispatch(
            setCustomDateRange({
              startDate,
              endDate: (customDateRange.endDate || '').split('T')[0],
            })
          )
        }
        onCustomEndDateChange={(endDate) =>
          dispatch(
            setCustomDateRange({
              startDate: (customDateRange.startDate || '').split('T')[0],
              endDate,
            })
          )
        }
        globalLoading={globalLoading}
        periodLabel={getCurrentPeriodText()}
        onPrevious={handlePrevious}
        onNext={handleNext}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      />
    ),
    [
      selectedDuration,
      handleSpaceChartsDurationChange,
      customDateRange,
      dispatch,
      globalLoading,
      currentDate,
      currentYear,
      isLargeScreen,
      isMediumScreen,
    ]
  )


  const getWidgetTitle = (widgetKey, fallbackTitle) => {
    if (!widgetList?.titles) return fallbackTitle;

    const widget = widgetList.titles.find(w => w.key === widgetKey);
    return widget?.title || fallbackTitle;
  };

  const ExportDropdown = ({ isOpen, onClose, chartTitle, dropdownKey }) => (
    <SpaceChartExportMenu
      isOpen={isOpen}
      chartTitle={chartTitle}
      dropdownKey={dropdownKey}
      exportLoading={exportLoading}
      onExport={handleExport}
      innerRef={exportDropdownRef}
      shellVariant="basic"
      isLargeScreen={isLargeScreen}
    />
  )

  const basicSpaceLayoutAdapter = useMemo(
    () =>
      createBasicSpaceLayoutAdapter(
        createBasicSpaceLayoutAdapterStyles({
          buildRows: (order, ctx) =>
            ctx.showChartsTab
              ? buildSpaceChartsDashboardRows(order)
              : order.map((id) => [id]),
          resolveRowSx: (rowIndex) => ({
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2, sm: 2, md: 3, lg: 4, xl: 4 },
            width: '100%',
            mb: 0,
            mt: rowIndex > 0 ? 2 : 0,
            alignItems: 'flex-start',
          }),
          resolveSlotSx: (slotId, pair, ctx) =>
            ctx.showChartsTab
              ? spaceChartsRowSlotSx(slotId, pair)
              : spaceMainSlotWrapperSx(slotId),
          resolveStackSx: (tabId) =>
            tabId === SPACE_TAB_IDS.CHARTS
              ? { width: '100%', display: 'flex', flexDirection: 'column' }
              : {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: { xs: 2, sm: 2.5, md: 3, lg: 3, xl: 4 },
                  width: '100%',
                },
        })
      ),
    [spaceChartsRowSlotSx, spaceMainSlotWrapperSx]
  );

  const spaceLayoutRuntime = useMemo(
    () => ({
      renderWidgetSlot: (slotId, meta, layoutContext) =>
        renderBasicSpaceWidgetSlot(slotId, meta, layoutContext, {
          chartHeaderStyle,
          isLargeScreen,
          spaceUtilLight,
          spacePeakMinOuterSx,
          getWidgetTitle,
          ExportDropdown,
          showExportDropdown,
          setShowExportDropdown,
          showChartsTab,
        }),
      renderCustomSlot: (slotId) =>
        slotId === 'instant_utilization_combined'
          ? renderBasicInstantUtilizationCombined({
              getWidgetTitle,
              isLargeScreen,
              isWidgetVisible,
              spaceChartsDurationFilterElement,
              spaceUtilLight,
              spaceWidgetRenderContext,
              showChartsTab,
              ExportDropdown,
              showExportDropdown,
              setShowExportDropdown,
            })
          : null,
      wrapSlot: (slotId, content) => {
        const reflow = {
          ...(showChartsTab ? spaceChartsTabReflowBase : spaceMainTabReflowBase),
          slotId,
        };
        const storageKey =
          (showChartsTab ? SPACE_CHARTS_TAB_SLOT_STORAGE : SPACE_MAIN_TAB_SLOT_STORAGE)[slotId] ||
          '';
        return (
          <LongPressDraggable
            disabled={spaceChartReflowLocked}
            storageKey={storageKey}
            reflow={reflow}
          >
            {content}
          </LongPressDraggable>
        );
      },
      renderEmptyState: (key) => renderBasicSpaceEmptyState(key),
      renderTabChrome: () => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', mb: 2 }}>
          <Box sx={{ width: 'min(330px, 100%)', maxWidth: '100%' }}>
            {spaceChartsDurationFilterElement}
          </Box>
        </Box>
      ),
    }),
    [
      chartHeaderStyle,
      isLargeScreen,
      spaceUtilLight,
      spacePeakMinOuterSx,
      showExportDropdown,
      setShowExportDropdown,
      showChartsTab,
      spaceChartsTabReflowBase,
      spaceMainTabReflowBase,
      spaceChartReflowLocked,
      spaceChartsDurationFilterElement,
      spaceWidgetRenderContext,
      isWidgetVisible,
    ]
  );

  const containerPresentationRuntime = useMemo(
    () => ({
      SpaceLayoutRenderer,
      layoutAdapter: basicSpaceLayoutAdapter,
      layoutRuntime: spaceLayoutRuntime,
    }),
    [basicSpaceLayoutAdapter, spaceLayoutRuntime]
  );

  return (
    <Box
      onMouseDown={(e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
      }}
      onMouseUp={(e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
      }}
      onClick={(e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
      }}
      onDoubleClick={(e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
      }}
      onContextMenu={(e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
      }}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3, md: 4, lg: 0.5, xl: 6 },
        width: '100%',
        maxWidth: '100%',
        ...(showChartsTab
          ? {
              flex: '0 0 auto',
              minHeight: 0,
              height: 'auto',
              alignSelf: 'flex-start',
            }
          : {}),
      }}>
      {/* Error Display */}
      <SpaceErrorPanel message={dashboardError} shellVariant="basic" />

      {/* API Error Display */}
      {hasApiErrors() && (
        <SpaceStatusPanel
          tone="warning"
          shellVariant="basic"
          title="Some data endpoints are experiencing issues"
          subtitle="Some charts may display limited or no data. Please try again later."
        />
      )}

      {showChartsTab && (
        <SpaceUtilizationContainer
          variant="basic"
          adapter={basicSpaceContainerAdapter}
          activeTab={SPACE_TAB_IDS.CHARTS}
          orchestration={orchestration}
          runtime={containerPresentationRuntime}
        />
      )}

      {!showChartsTab && !showOnlyInstantChart && (
        <SpaceUtilizationContainer
          variant="basic"
          adapter={basicSpaceContainerAdapter}
          activeTab={SPACE_TAB_IDS.UTILIZATION}
          orchestration={orchestration}
          runtime={containerPresentationRuntime}
        />
      )}

      {/* Material-UI Snackbar for email notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            backgroundColor: 'white',
            color: 'black',
            border: snackbarSeverity === 'error'
              ? '1px solid #f44336'
              : snackbarSeverity === 'warning'
                ? '1px solid #ff9800'
                : '1px solid #4CAF50',
            '& .MuiAlert-icon': {
              color: snackbarSeverity === 'error'
                ? '#f44336'
                : snackbarSeverity === 'warning'
                  ? '#ff9800'
                  : '#4CAF50'
            }
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      {/* Email Input Dialog - DISABLED: No popup, using saved email only */}
    </Box>
  )
}

export default SpaceUtilization
