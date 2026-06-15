/**
 * Dashboard Component
 * 
 * Operator Floor Access:
 * - Floor filtering is handled automatically by the backend API
 * - The /floor/list endpoint uses require_operator_permission_for_scope
 * - Operators only see floors they have been assigned to
 * - No additional frontend filtering is required
 * - If an operator has no floors assigned, appropriate messages are shown
 * 
 * Default Data Display:
 * - All user roles (Superadmin, Admin, Operator) see project data by default
 * - Data is automatically fetched for all accessible areas without requiring user selection
 * - Users can still filter by specific floors/areas if desired
 * - Project data includes all areas the user has permission to access
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react'
import { useDispatch, useSelector, shallowEqual } from 'react-redux'
import { useNavigate, useLocation } from 'react-router-dom'
import { SHOW_OVERVIEW_TAB } from '../../config/featureFlags'
import {
  getRovingTabIndex,
  handleRovingTablistKeyDown,
} from '../../utils/rovingTablistKeyboard'
import { registerPageSubNavHandler, requestTopbarNavFocus } from '../../utils/pageSubNavBridge'
import { isKeyboardNavBlockedTarget } from '../../utils/keyboardNavUtils'
import {
  CARD_BACKGROUND,
  CARD_BORDER,
  CARD_SHADOW,
  DASHBOARD_CHART_LOADING_BG,
  DASHBOARD_CHART_LOADING_SPINNER_STYLE,
  DASHBOARD_CHART_TOOLTIP_STYLE,
} from '../../config/themeConstants'
import ChartExportButton from '../../components/ChartExportButton'
import NativeDateInput from '../../components/NativeDateInput'
import {
  EnergyExportMenu,
  resolveAdvancedEnergyExportMenuPreset,
  ADVANCED_EXPORT_MENU_PANEL_CLASS,
} from '../../../../shared/dashboard/export/components'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label
} from 'recharts'
import {
  setSelectedFloor,
  setSelectedAreas,
  setSelectedFloorIds,
  setSelectedGroups,
  setSelectedGroupIds,
  setSelectedDuration,
  setCustomDateRange,
  setCurrentDate,
  setCurrentYear,
  setGlobalLoading,
  setFilteredData,
  setIsNavigating,
  fetchTotalConsumptionByGroup,
  fetchLightPowerDensity,
  fetchOccupancyCount,
  fetchOccupancyByGroup,
  fetchSpaceUtilizationPerArea,
  // fetchPeakMinOccupancy, // Commented out - not using peak min max API for space utilization
  fetchInstantOccupancyCount,
  fetchOccupancyByGroupFromLogs,
  fetchSpaceUtilizationPerFromLogs,
  fetchSavingsByStrategy,
  fetchAreaGroups,
  downloadEnergyConsumption,
  downloadEnergySavings,
  downloadPeakMinConsumption,
  downloadTotalConsumptionByGroup,
  downloadOccupancyCount,
  downloadOccupancyByGroup,
  downloadSpaceUtilizationPer,
  // downloadPeakMinOccupancy, // Commented out - not using peak min max API for space utilization
  sendEnergyConsumptionEmail,
  sendEnergySavingsEmail,
  sendPeakMinConsumptionEmail,
  sendTotalConsumptionByGroupEmail,
  sendOccupancyCountEmail,
  sendOccupancyByGroupEmail,
  sendSpaceUtilizationPerEmail,
  // sendPeakMinOccupancyEmail, // Commented out - not using peak min max API for space utilization
  selectSelectedFloor,
  selectSelectedAreas,
  selectSelectedFloorIds,
  selectSelectedGroups,
  selectSelectedGroupIds,
  selectSelectedDuration,
  selectCustomDateRange,
  selectIsNavigating,
  selectGlobalLoading,
  selectCurrentDate,
  selectCurrentYear,
  selectFilteredData,
  selectTotalConsumptionByGroup,
  selectLightPowerDensity,
  selectOccupancyCount,
  selectOccupancyByGroup,
  selectInstantOccupancyCount,
  selectInstantOccupancyCountLoading,
  selectInstantOccupancyCountError,
  selectSavingsByStrategy,
  selectAreaGroups,
  selectDashboardStatus,
  selectDashboardLoading,
  selectDashboardError,
  selectEmailLoading,
  selectEmailError,
  selectEmailSuccess,
  clearDashboardData,
  clearDataCache
} from '../../redux/slice/dashboard/dashboardSlice'

import {
  fetchUnifiedEnergyConsumptionSavingsData,
  selectUnifiedEnergyConsumption,
  selectUnifiedEnergySavings,
  selectUnifiedPeakMinConsumption,
  selectUnifiedEnergyConsumptionLoading,
  selectUnifiedEnergySavingsLoading,
  selectUnifiedPeakMinConsumptionLoading
} from '../../redux/slice/dashboard/unifiedEnergySlice'
import { fetchFloors, getLeafByFloorID, selectFloors, selectAreaTree, selectFloorsLoading, selectAreaTreeLoading } from '../../redux/slice/floor/floorSlice'
import { getDashboardOverview, selectDashboardOverview, selectDashboardOverviewLoading, selectDashboardOverviewError } from '../../redux/slice/home/homeSlice'
import { selectProfile, selectProfileLoading, fetchProfile } from '../../redux/slice/auth/userlogin'
import SpaceUtilization from './SpaceUtilization'
import DashboardOverview from './DashboardOverview'

import { Grid, Box, useTheme, useMediaQuery, Snackbar, Alert, Typography, Button, FormControl, MenuItem, Select } from '@mui/material'; // Add useTheme and useMediaQuery
import { dashboardSelectFieldSx, dashboardSelectMenuProps } from '../../utils/dashboardSelectMenuProps';
import { AddBoxOutlined, IndeterminateCheckBoxOutlined } from '@mui/icons-material';
import Alerts from './Alerts'
import {
  fetchAlertTypes,
  fetchActiveAlerts,
  selectAlertTypes,
  selectSelectedAlertType,
  setSelectedAlertType,
} from '../../redux/slice/dashboard/alertsSlice'
import { selectApplicationTheme } from '../../redux/slice/theme/themeSlice'
import { UseAuth } from '../../customhooks/UseAuth'
import { fetchRenameWidgets, getWidgetList, fetchEmailConfigs } from '../../redux/slice/settingsslice/heatmap/groupOccupancySlice'
import { getThemeButtonColor, usesGoldPageTheme } from '../../utils/themePageBackground';
import {
  buildThemeAwareChartPalette,
  getThemeAwareConsumptionLineColors,
  getThemeAwarePieColors,
  getThemeAwareSavingsLineColors,
  getThemeAwareSavingsStrategyColor,
  getThemeAwareMetricPanelBorder,
  resolvePieChartLabelColors,
  GOLDEN_ANGLE,
} from '../../utils/dashboardChartColors';

import {
  formatDateForState,
  parseDateFromState,
} from '../../../../shared/dashboard/utils/dashboardDateState'
import { useDashboardApiParams } from '../../../../shared/dashboard/hooks/useDashboardApiParams'
import { transformDataForCharts as sharedTransformDataForCharts } from '../../../../shared/dashboard/charts/transforms/transformDataForCharts'
import { formatEnergyXAxisLabel } from '../../../../shared/dashboard/charts/transforms/formatEnergyXAxisLabel'
import { useAreaTreeSelection } from '../../../../shared/dashboard/hooks/useAreaTreeSelection'
import {
  flattenAreaTree,
  getAllAreaIdsFromFloor,
  shouldSkipLoadAllAreas,
  processFloorPayloadForAreaLoad,
  collectFloorCheckboxAreaIds,
  resolveAreaToggleSelection,
  resolveGroupToggleSelection,
  resolveIntermediateParentToggle,
  resolveFloorDeselectAreas,
  resolveFloorSelectAreas,
} from '../../../../shared/dashboard/filters'
import {
  DashboardWidgetRenderer,
  DashboardContainer,
  useDashboardContainer,
  useDashboardAreaTreeOrchestration,
  advancedDashboardContainerAdapter,
  buildAdvancedEnergyWidgetRenderContext,
} from '../../../../shared/dashboard/container'
import {
  ADVANCED_ENERGY_SLOT_REGISTRY,
  ADVANCED_GRID_SPACING,
  ADVANCED_GRID_ITEM_PROPS,
  resolveAdvancedGridRowSx,
  getAdvancedEnergySlotMeta,
} from '../../../../shared/dashboard/container/layout'
import {
  applyAlertTypeToggle,
  createAdvancedExportOutsideClickProfile,
  createStandardTransformDataForCharts,
  buildStandardTransformChartOptions,
} from '../../../../shared/dashboard/container/helpers'
import { bindDashboardChartLoader } from '../../../../shared/dashboard/components'
import {
  DashboardAreaTreeInlineStatus,
  DashboardErrorBanner,
  DashboardOperatorNoFloorsPanel,
} from '../../../../shared/dashboard/components/status'

const ChartLoader = bindDashboardChartLoader('advanced')

const MONTH_NAME_TO_INDEX = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function Dashboard() {
  // Note: Floor filtering is handled automatically by the backend API
  // Operators will only see floors they have been assigned to
  // The /floor/list endpoint uses require_operator_permission_for_scope
  // to filter floors based on user permissions

  const dispatch = useDispatch()
  const theme = useTheme()
  const isMediumScreen = useMediaQuery(theme.breakpoints.up('md'))
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'))
  const isXLargeScreen = useMediaQuery(theme.breakpoints.up('xl'))
  const is2XLargeScreen = useMediaQuery('(min-width: 1600px)')

  const chartHeaderStyle = useMemo(() => ({
    margin: 0,
    color: '#fff',
    fontWeight: 600,
    fontFamily: 'inherit',
    fontSize: isLargeScreen ? '18px' : '16px'
  }), [isLargeScreen])

  // User authentication
  const { user } = UseAuth()

  const alertTypes = useSelector(selectAlertTypes)
  const selectedAlertType = useSelector(selectSelectedAlertType)
  const widgetList = useSelector(getWidgetList)

  // Local state for multi-select dropdown
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedAlertTypes, setSelectedAlertTypes] = useState([])
  const [filterKey, setFilterKey] = useState(0) // Force re-render key
  const [reloadTrigger, setReloadTrigger] = useState(0) // Trigger for automatic reload on login
  const dropdownRef = useRef(null)
  const areaDropdownRef = useRef(null) // Add ref for area dropdown
  const areaTreeContainerRef = useRef(null) // Add ref for area tree container
  const previousApiParamsRef = useRef(null)

  // Redux selectors
  const floors = useSelector((state) => state.floor.floors)
  const floorStatus = useSelector((state) => state.floor.status)
  const areaTree = useSelector((state) => state.floor.leafData)
  const floorLoading = useSelector((state) => state.floor.loading)

  const selectedFloor = useSelector(selectSelectedFloor)
  const selectedAreas = useSelector(selectSelectedAreas)
  const selectedFloorIds = useSelector(selectSelectedFloorIds) // Add this to get floor IDs from Redux
  const selectedGroups = useSelector(selectSelectedGroups)
  const selectedGroupIds = useSelector(selectSelectedGroupIds)

  // User profile for email functionality and floor filtering
  const userProfile = useSelector((state) => state.user?.profile)
  const profileLoading = useSelector((state) => state.user?.profileLoading)



  const {
    floorsWithSelectedAreas,
    setFloorsWithSelectedAreas,
    localSelectedFloorIds,
    setLocalSelectedFloorIds,
    localSelectedAreas,
    setLocalSelectedAreas,
    localSelectedGroups,
    setLocalSelectedGroups,
    expandedFloorId,
    setExpandedFloorId,
  } = useAreaTreeSelection();

  const [showAreaDropdown, setShowAreaDropdown] = useState(false)
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  const {
    areaTreeSelectionState,
    getAreasForFloor,
    getAllAreasFromGroup,
    getAllChildAreaIds,
    checkIfChildrenSelected,
    checkIfAllChildrenSelected,
    applyAreaTreeClearAll,
    applyAreaTreeSet,
    getAreaSelectionText,
  } = useDashboardAreaTreeOrchestration({
    variant: 'advanced',
    dispatch,
    reduxActions: {
      clearDataCache,
      setSelectedAreas,
      setSelectedFloorIds,
      setSelectedGroups,
      setSelectedGroupIds,
      setSelectedFloor,
    },
    floors,
    areaTree,
    selectedFloorIds,
    selectedAreas,
    localSelectedFloorIds,
    setLocalSelectedFloorIds,
    localSelectedAreas,
    setLocalSelectedAreas,
    localSelectedGroups,
    setLocalSelectedGroups,
    setFloorsWithSelectedAreas,
    setExpandedFloorId,
    setExpandedNodes,
    previousApiParamsRef,
    setShowAreaDropdown,
  });

  // Fetch user profile on component mount
  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  // Set default behavior to show data for all areas
  useEffect(() => {
    if (floors.length > 0 && localSelectedFloorIds.length === 0 && selectedAreas.length === 0) {
      // Don't select any floor by default - show data for all areas
      // This will trigger the API calls with no specific areas selected
      // Backend will return data for all accessible areas
    }
  }, [floors, localSelectedFloorIds.length, selectedAreas.length, dispatch]);


  const selectedDuration = useSelector(selectSelectedDuration)
  const customDateRange = useSelector(selectCustomDateRange)
  const isNavigating = useSelector(selectIsNavigating)
  const globalLoading = useSelector(selectGlobalLoading)
  const filteredData = useSelector(selectFilteredData)
  // Use shallowEqual to prevent re-renders when other Redux state changes
  const energyConsumption = useSelector(selectUnifiedEnergyConsumption, shallowEqual)
  const energySavings = useSelector(selectUnifiedEnergySavings, shallowEqual)
  const peakMinConsumption = useSelector(selectUnifiedPeakMinConsumption, shallowEqual)
  const energyConsumptionLoading = useSelector(selectUnifiedEnergyConsumptionLoading)
  const energySavingsLoading = useSelector(selectUnifiedEnergySavingsLoading)
  const peakMinConsumptionLoading = useSelector(selectUnifiedPeakMinConsumptionLoading)
  const totalConsumptionByGroup = useSelector(selectTotalConsumptionByGroup)
  const lightPowerDensity = useSelector(selectLightPowerDensity)
  const occupancyCount = useSelector(selectOccupancyCount)
  const instantOccupancyCount = useSelector(selectInstantOccupancyCount)
  const instantOccupancyCountLoading = useSelector(selectInstantOccupancyCountLoading)
  const instantOccupancyCountError = useSelector(selectInstantOccupancyCountError)
  const dashboardStatus = useSelector(selectDashboardStatus)
  const dashboardLoading = useSelector(selectDashboardLoading)
  const dashboardError = useSelector(selectDashboardError)

  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || '#d2c4a2';
  const contentColor = appTheme?.application_theme?.content || 'rgba(128, 120, 100, 0.7)';
  const buttonColor = getThemeButtonColor(appTheme?.application_theme?.button, appTheme?.application_theme?.background);
  const tabActiveTextColor = `var(--heatmap-tab-active-text, ${buttonColor})`;
  const tabInactiveTextColor = 'var(--heatmap-tab-inactive-text, #fff)';
  const areaTreeTextColor = 'var(--dashboard-select-field-text, #2c2820)';
  const isGoldTheme = usesGoldPageTheme(backgroundColor);
  const metricPanelBorder = getThemeAwareMetricPanelBorder(backgroundColor);

  // Premium card background - sourced from shared theme constants
  // (edit src/config/themeConstants.js to retheme all dashboard widgets at once)
  const cardBackground = CARD_BACKGROUND

  const savingsByStrategy = useSelector(selectSavingsByStrategy)

  const customStartDate = useSelector((state) => state.dashboard.customStartDate) || '';
  const customEndDate = useSelector((state) => state.dashboard.customEndDate) || '';

  const areaGroups = useSelector(selectAreaGroups)

  // Navigation state selectors
  const currentDate = useSelector(selectCurrentDate)
  const currentYear = useSelector(selectCurrentYear)
  // Email state selectors
  const emailLoading = useSelector(selectEmailLoading)
  const emailError = useSelector(selectEmailError)
  const emailSuccess = useSelector(selectEmailSuccess)

  const overviewData = useSelector(selectDashboardOverview)
  const overviewLoading = useSelector(selectDashboardOverviewLoading)
  const overviewError = useSelector(selectDashboardOverviewError)
  const navigate = useNavigate()
  const location = useLocation()

  const getTabFromPath = useCallback((pathname) => {
    if (pathname === '/dashboard/alerts') return 'alerts'
    if (pathname === '/dashboard/energy') return 'energy'
    if (pathname === '/dashboard/spaceutilization' || pathname === '/dashboard/space-utilization') return 'charts'
    // Overview is hidden when SHOW_OVERVIEW_TAB is false - fall back to Energy as the default tab
    return SHOW_OVERVIEW_TAB ? 'overview' : 'energy'
  }, [])

  const getPathFromTab = useCallback((tab) => {
    if (tab === 'alerts') return '/dashboard/alerts'
    if (tab === 'energy') return '/dashboard/energy'
    if (tab === 'charts' || tab === 'space-utilization') return '/dashboard/spaceutilization'
    // Overview is hidden when SHOW_OVERVIEW_TAB is false - fall back to Energy as the default path
    return SHOW_OVERVIEW_TAB ? '/dashboard/overview' : '/dashboard/energy'
  }, [])

  const focusAlertFromLocation = location.state?.focusAlert || null

  // Local state
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname))
  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const dashboardTabKeys = useMemo(
    () => (SHOW_OVERVIEW_TAB ? ['overview', 'energy', 'charts', 'alerts'] : ['energy', 'charts', 'alerts']),
    []
  )

  // Refs + state for the sliding tab-indicator pill
  const tabsContainerRef = useRef(null)
  const tabRefs = useRef({})
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0, ready: false })

  // Keep dashboard tab synced with URL path for deep links and refresh.
  useEffect(() => {
    const tabFromPath = getTabFromPath(location.pathname)
    if (activeTab !== tabFromPath) {
      setActiveTab(tabFromPath)
    }
  }, [location.pathname, activeTab, getTabFromPath])

  // Position the sliding tab-indicator pill under the active tab.
  // Re-measures whenever the active tab or viewport size changes.
  useLayoutEffect(() => {
    if (activeTab === 'overview') return
    const measure = () => {
      const containerEl = tabsContainerRef.current
      const activeEl = tabRefs.current[activeTab]
      if (!containerEl || !activeEl) return false
      const left = activeEl.offsetLeft
      const width = activeEl.offsetWidth
      if (width <= 0) return false
      setTabIndicator({ left, width, ready: true })
      return true
    }
    if (measure()) return
    // Fallback: retry on next frame if refs/layout weren't ready yet
    const rafId = requestAnimationFrame(() => { measure() })
    return () => cancelAnimationFrame(rafId)
  }, [activeTab])

  // Re-measure indicator on window resize so it stays under the active tab on viewport changes
  useEffect(() => {
    const handleResize = () => {
      if (activeTab === 'overview') return
      const activeEl = tabRefs.current[activeTab]
      if (!activeEl) return
      setTabIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        ready: true,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [activeTab])

  // Fetch and auto-refresh dashboard overview when Overview tab is active
  useEffect(() => {
    if (activeTab !== 'overview') return

    // Fetch immediately when Overview becomes active
    dispatch(getDashboardOverview())

    // Auto-refresh every 5 minutes while still on Overview
    const intervalId = setInterval(() => {
      dispatch(getDashboardOverview())
    }, 5 * 60 * 1000)

    // Cleanup when leaving Overview or unmounting Dashboard
    return () => clearInterval(intervalId)
  }, [activeTab, dispatch])

  // Close area tree and dropdown when tab changes
  useEffect(() => {
    if (expandedFloorId !== null) {
      setExpandedFloorId(null);
      setExpandedNodes(new Set());
    }
    if (showAreaDropdown) {
      setShowAreaDropdown(false);
    }
  }, [activeTab]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return `${months[now.getMonth()]} ${now.getFullYear()}`
  })
  const [selectedMonthForData, setSelectedMonthForData] = useState(() => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth()
    }
  })
  const [showDurationDropdown, setShowDurationDropdown] = useState(false)

  useEffect(() => {
    if (!focusAlertFromLocation) return

    // Always show the alerts list for floorplan-driven alert navigation.
    if (activeTab !== 'alerts') {
      setActiveTab('alerts')
    }
    setSelectedAlertTypes([])
    setFilterKey(prev => prev + 1)
  }, [focusAlertFromLocation, activeTab])

  // Close area tree when clicking outside (including tabs and anywhere else)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // If area tree is open, check if click is outside
      if (expandedFloorId !== null) {
        // Check if click is inside the entire area dropdown
        const isInsideDropdown = areaDropdownRef.current && areaDropdownRef.current.contains(event.target);

        // If click is completely outside the dropdown, close everything immediately
        if (!isInsideDropdown) {
          setExpandedFloorId(null);
          setExpandedNodes(new Set());
          if (showAreaDropdown) {
            setShowAreaDropdown(false);
          }
          return;
        }

        // If click is inside dropdown, don't close - let the user interact with the tree
        // Only close when clicking outside the dropdown
      }
    };

    // Add event listener when area tree is open
    if (expandedFloorId !== null) {
      // Use setTimeout to avoid immediate closure when opening the tree
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [expandedFloorId, showAreaDropdown]);

  const [lightingUnit, setLightingUnit] = useState('Watt / Sq ft') // Add this for lighting power density unit
  const [allAreasLoaded, setAllAreasLoaded] = useState(false) // Track if all areas have been loaded
  const isInitialLoad = useRef(true) // Track if this is the initial load

  // Unified loading state - show single loader during navigation
  const [isDataLoading, setIsDataLoading] = useState(false)

  // Track when we're switching tabs to clear old data - removed to prevent flickering

  // Force refresh state for Set button - removed to prevent flickering

  // Snackbar state for email notifications
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')

  // Email dialog state - removed as emails are now sent directly to logged-in user

  // Snackbar handlers
  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }

  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message)
    setSnackbarSeverity(severity)
    setSnackbarOpen(true)
  }

  const orchestration = useDashboardContainer(advancedDashboardContainerAdapter, {
    dispatch,
    showOverviewTab: SHOW_OVERVIEW_TAB,
    widgetList,
    energyConsumption,
    energySavings,
    energyConsumptionLoading,
    energySavingsLoading,
    savingsByStrategy,
    globalLoading,
    selectedDuration,
    customStartDate,
    customEndDate,
    backgroundColor,
    getThemeAwareConsumptionLineColors,
    getThemeAwareSavingsLineColors,
    dateActions: {
      setCustomDateRange,
      setCurrentDate,
      setCurrentYear,
      setIsNavigating,
    },
    customDateRange,
    isNavigating,
    currentDate,
    currentYear,
    setIsDataLoading,
    setSelectedMonthForData,
    showSnackbar,
    userProfile,
    fetchEmailConfigs,
    selectedAreas,
    selectedFloorIds,
    exportThunks: {
      sendEnergyConsumptionEmail,
      downloadEnergyConsumption,
      sendEnergySavingsEmail,
      downloadEnergySavings,
      sendPeakMinConsumptionEmail,
      downloadPeakMinConsumption,
      sendTotalConsumptionByGroupEmail,
      downloadTotalConsumptionByGroup,
      sendOccupancyCountEmail,
      downloadOccupancyCount,
      sendOccupancyByGroupEmail,
      downloadOccupancyByGroup,
      sendSpaceUtilizationPerEmail,
      downloadSpaceUtilizationPer,
    },
    outsideClickProfile: createAdvancedExportOutsideClickProfile(ADVANCED_EXPORT_MENU_PANEL_CLASS),
  })

  const {
    visibility: { showOverviewTab },
    widgets: {
      chartLoading,
      setChartLoading,
      allEnergyChartsReady,
      setAllEnergyChartsReady,
      energyWidgetTitles,
      getWidgetTitle,
      memoizedEnergyConsumption,
      memoizedEnergySavings,
      consumptionColors,
      savingsColors,
      consumptionIsLoading,
      savingsIsLoading,
      startEnergyTabLoading,
      completeEnergyTabLoading,
      planEnergyTabApiCalls,
    },
    dates: {
      dateParams,
      getCurrentDateParameters,
      calculateDateParameters,
      calculateCurrentDateParameters,
      handlePrevious,
      handleNext,
      getCurrentPeriodText,
    },
    exports: {
      exportDropdownRefs,
      showExportDropdown,
      setShowExportDropdown,
      exportLoading,
      handleExport,
      handleConsumptionEmail,
      handleConsumptionDownload,
      handleSavingsEmail,
      handleSavingsDownload,
      handleConsumptionByGroupEmail,
      handleConsumptionByGroupDownload,
    },
  } = orchestration

  const {
    consumption: consumptionTitle,
    savings: savingsTitle,
    savingsByStrategy: savingsByStrategyTitle,
    totalConsumptionByGroup: totalConsumptionByGroupTitle,
  } = energyWidgetTitles

  // Email dialog handlers - removed as emails are now sent directly to logged-in user

  // Fetch alert options/data when Alerts tab is active
  useEffect(() => {
    if (activeTab === 'alerts') {
      dispatch(fetchAlertTypes())
      // Note: fetchActiveAlerts is handled by the Alerts component itself
    }
  }, [activeTab, dispatch])

  // Fetch rename widgets when Dashboard mounts (only if not already loaded)
  useEffect(() => {
    if (!widgetList || (Array.isArray(widgetList) && widgetList.length === 0) || (widgetList && !widgetList.titles)) {
      dispatch(fetchRenameWidgets())
    }
  }, [dispatch, widgetList])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    // Use capture phase to catch clicks before stopPropagation
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [])

  // Close area dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle if dropdown is open
      if (showAreaDropdown && areaDropdownRef.current && !areaDropdownRef.current.contains(event.target)) {
        // Close dropdown and expanded tree when clicking outside
        setShowAreaDropdown(false);
        if (expandedFloorId !== null) {
          setExpandedFloorId(null);
          setExpandedNodes(new Set());
        }
      }
    }
    // Use passive listener to prevent flickering
    document.addEventListener('click', handleClickOutside, { passive: true })
    return () => document.removeEventListener('click', handleClickOutside)
  }, [expandedFloorId, showAreaDropdown])

  const handleTypeToggle = (type) => {
    applyAlertTypeToggle({
      type,
      setSelectedAlertTypes,
      setFilterKey,
      setShowDropdown,
    });
  }
  // Fetch floors on component mount
  // Note: The backend automatically filters floors based on user permissions
  // Operators will only receive floors they have access to
  useEffect(() => {
    // if (floors.length === 0 && floorStatus !== 'loading') {
    dispatch(fetchFloors())
    // }
  }, [dispatch])

  // Clear dashboard data and set default duration when component mounts
  // This ensures each user starts with a clean state
  useEffect(() => {
    // Clear any existing dashboard data from previous user
    dispatch(clearDashboardData())

    // Set default duration to 'this-day' for new users
    dispatch(setSelectedDuration('this-day'))
  }, [dispatch]) // Remove selectedDuration from dependencies to prevent infinite loop

  // Get current user role for floor filtering
  const { role: currentUserRole } = UseAuth()
  const isOperator = currentUserRole === 'Operator'

  // Function to get available floors based on user permissions
  const getAvailableFloors = () => {
    // Superadmin and Admin can see all floors
    if (currentUserRole === 'Superadmin' || currentUserRole === 'Admin') {
      return floors;
    }

    // For Operators, only show floors they have access to
    if (currentUserRole === 'Operator' && userProfile && userProfile.floors) {
      const operatorFloorIds = userProfile.floors.map(f => f.floor_id);
      return floors.filter(floor => operatorFloorIds.includes(floor.id));
    }

    // Default: return all floors
    return floors;
  };



  // Set default duration if none is selected
  useEffect(() => {
    if (!selectedDuration) {
      dispatch(setSelectedDuration('this-day'))
    }
  }, [selectedDuration, dispatch])

  // Use a ref to track previous floors/userProfile to detect actual changes
  const prevFloorsRef = useRef(null);
  const prevUserProfileRef = useRef(null);

  // Track if we've done the initial reload on login
  const hasInitialReloadRef = useRef(false);

  // Load all areas from all floors when floors are loaded
  useEffect(() => {
    // Only run if floors or userProfile actually changed (not just reference)
    const floorsChanged = prevFloorsRef.current !== floors;
    const profileChanged = prevUserProfileRef.current !== userProfile;

    // Skip if nothing changed (but allow first run)
    if (prevFloorsRef.current !== null && !floorsChanged && !profileChanged) {
      return; // Don't do anything if nothing actually changed
    }

    // Update refs
    prevFloorsRef.current = floors;
    prevUserProfileRef.current = userProfile;

    const availableFloors = getAvailableFloors();
    if (availableFloors.length > 0 && !allAreasLoaded && selectedAreas.length === 0) {
      loadAllAreasFromAllFloors()
    } else if (availableFloors.length > 0 && selectedAreas.length > 0) {
      // If areas are already selected, mark as loaded to prevent re-running
      setAllAreasLoaded(true)
    }
  }, [floors, userProfile, allAreasLoaded, selectedAreas.length])

  // Helper function to filter chart data for this_week to show only "0" hour points
  const filterWeeklyChartData = (chartData, xAxisLabels) => {
    if (selectedDuration !== 'this-week') {
      return { filteredData: chartData, filteredLabels: xAxisLabels };
    }

    // Filter to show only "0" hour points (Sun 0, Mon 0, Tue 0, etc.)
    const filteredLabels = xAxisLabels.filter(label => label.endsWith(' 0'));
    const filteredData = chartData.map(series => {
      const filteredValues = [];
      xAxisLabels.forEach((label, index) => {
        if (label.endsWith(' 0')) {
          filteredValues.push(series[index]);
        }
      });
      return filteredValues;
    });

    return { filteredData, filteredLabels };
  };

  // Function to load all areas from all floors (only accessible floors for operators)
  const loadAllAreasFromAllFloors = async () => {
    try {
      if (
        shouldSkipLoadAllAreas({
          allAreasLoaded,
          selectedAreasLength: selectedAreas.length,
          variant: 'advanced',
        })
      ) {
        if (selectedAreas.length > 0 && !allAreasLoaded) {
          setAllAreasLoaded(true);
        }
        return;
      }

      let allAreaIds = [];

      for (const floor of getAvailableFloors()) {
        const result = await dispatch(getLeafByFloorID(floor.id));

        if (result.payload && (result.payload.tree || result.payload.areas)) {
          const processed = processFloorPayloadForAreaLoad({
            payload: result.payload,
            floorId: floor.id,
            variant: 'advanced',
            existingAreaIds: allAreaIds,
          });
          allAreaIds = processed.areaIds;
        }
      }

      setAllAreasLoaded(true);
    } catch (error) {
      // Error loading all areas
    }
  }



  // Handle floor name click - just expand/collapse without affecting checkbox
  const handleFloorChange = async (floorId) => {
    const floor = getAvailableFloors().find(f => f.id === parseInt(floorId))

    if (floor) {
      // If same floor is clicked, toggle expansion
      if (expandedFloorId === floor.id) {
        // Already expanded, collapse it
        setExpandedFloorId(null);
        setExpandedNodes(new Set());
      } else {
        // Different floor - just expand it (don't affect checkbox or selection)
        try {
          const result = await dispatch(getLeafByFloorID(floor.id))
          setExpandedFloorId(floor.id);
          const nodeId = `floor-${floor.id}`
          setExpandedNodes(new Set([nodeId]))

          // Don't select any areas automatically - just show the tree
        } catch (error) {
          // Error fetching floor areas
        }
      }
    }
  }

  // Floor checkbox click handler - selects multiple floors and their areas
  const handleFloorCheckboxClick = async (floorId, event) => {
    event.stopPropagation() // Prevent floor selection

    // Add debounce to prevent multiple rapid API calls
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const floor = floors.find(f => f.id === parseInt(floorId))

    if (floor) {
      // Check if this floor is currently selected
      const isThisFloorSelected = localSelectedFloorIds.includes(floor.id);

      if (isThisFloorSelected) {
        const deselectResolution = resolveFloorDeselectAreas({
          floorId: floor.id,
          localSelectedFloorIds,
          localSelectedAreas,
          getAreasForFloor,
        });
        setLocalSelectedFloorIds(deselectResolution.localSelectedFloorIds);
        setFloorsWithSelectedAreas(new Set(deselectResolution.floorsWithSelectedAreas));
        setLocalSelectedAreas(deselectResolution.localSelectedAreas);
      } else {
        // If this floor is not selected, add it to selection
        const newSelectedFloorIds = [...localSelectedFloorIds, floor.id];
        setLocalSelectedFloorIds(newSelectedFloorIds);
        setFloorsWithSelectedAreas(new Set(newSelectedFloorIds));

        // Don't update Redux state immediately - only update when Set button is clicked
        // dispatch(setSelectedFloorIds(newSelectedFloorIds));

        // Also expand the floor to show areas
        setExpandedFloorId(floor.id);
        const nodeId = `floor-${floor.id}`
        setExpandedNodes(new Set([nodeId]))

        // CORRECTED: Auto-select all areas when floor is selected
        // This provides the expected hierarchical selection behavior
        try {
          const result = await dispatch(getLeafByFloorID(floor.id));

          if (result.payload && (result.payload.tree || result.payload.areas)) {
            const floorAreaIds = collectFloorCheckboxAreaIds(result.payload);
            if (floorAreaIds.length > 0) {
              setLocalSelectedAreas(
                resolveFloorSelectAreas({
                  localSelectedAreas,
                  floorAreaIds,
                })
              );
            } else {
              const fallbackAreaIds = getAreasForFloor(floorId);
              if (fallbackAreaIds.length > 0) {
                setLocalSelectedAreas(
                  resolveFloorSelectAreas({
                    localSelectedAreas,
                    floorAreaIds: fallbackAreaIds,
                  })
                );
              }
            }
          } else {
            const fallbackAreaIds = getAreasForFloor(floorId);
            if (fallbackAreaIds.length > 0) {
              setLocalSelectedAreas(
                resolveFloorSelectAreas({
                  localSelectedAreas,
                  floorAreaIds: fallbackAreaIds,
                })
              );
            }
          }
        } catch (error) {
          const floorAreaIds = getAreasForFloor(floorId);
          if (floorAreaIds.length > 0) {
            setLocalSelectedAreas(
              resolveFloorSelectAreas({
                localSelectedAreas,
                floorAreaIds,
              })
            );
          }
        }
      }
    }
  }


  // Auto-expand area tree when it's loaded
  useEffect(() => {
    if (areaTree && (areaTree.tree || areaTree.areas) && selectedFloor) {
      // Area tree loaded for floor
    }
  }, [areaTree, selectedFloor])

  // Fetch area groups on component mount
  useEffect(() => {
    if (!areaGroups) {
      dispatch(fetchAreaGroups());
    }
  }, [dispatch, areaGroups])

  // Handle area selection
  const handleAreaChange = (areaIds) => {
    // Filter out any invalid or duplicate area IDs
    const validAreaIds = areaIds.filter(id => id && typeof id === 'number');

    // Don't update Redux state immediately - wait for Set button
    // Prevent selecting too many areas
    // if (validAreaIds.length > 20) {
    //   const limitedAreaIds = validAreaIds.slice(0, 15)
    //   dispatch(setSelectedAreas(limitedAreaIds));
    // } else {
    // dispatch(setSelectedAreas(validAreaIds));
    // }
    // Don't close the dropdown immediately to allow multiple selections
    // setShowAreaDropdown(false);
  }

  // Add the missing handleToggleNode function
  const handleToggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      if (prev.has(nodeId)) {
        const newSet = new Set(prev);
        newSet.delete(nodeId);
        return newSet;
      } else {
        return new Set([...prev, nodeId]);
      }
    });
  };

  // Render tree node function with comprehensive selection options
  const renderTreeNode = (node, level = 0) => {
    // Use a more stable ID generation
    const nodeId = `node-${node.id || node.area_id || node.name || 'unknown'}`;
    const isExpanded = expandedNodes.has(nodeId);
    const hasChildren = (node.children && node.children.length > 0) || (node.areas && node.areas.length > 0);

    // Check if this node is selected (for areas, floors, or groups)
    const isAreaSelected = node.area_id && localSelectedAreas.includes(node.area_id);
    const isFloorSelected = node.floor_id && localSelectedFloorIds.includes(node.floor_id);
    const isGroupSelected = node.group_id && localSelectedGroups.includes(node.group_id);

    // Check if any children are selected (for parent nodes)
    const hasSelectedChildren = hasChildren && checkIfChildrenSelected(node);

    // Check if all children are selected (for complete selection)
    const allChildrenSelected = hasChildren && checkIfAllChildrenSelected(node);

    const isSelected = isAreaSelected || isFloorSelected || isGroupSelected || allChildrenSelected;
    const isIndeterminate = hasSelectedChildren && !allChildrenSelected;

    // Determine if this is a floor, area, group, or intermediate parent node
    const isFloorNode = node.floor_id && !node.area_id;
    const isAreaNode = node.area_id;
    const isGroupNode = node.group_id && !node.area_id && !node.floor_id;
    const isIntermediateParent = hasChildren && !isFloorNode && !isAreaNode && !isGroupNode;

    return (
      <div key={nodeId} style={{ marginLeft: `${level * 20}px` }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 0',
          whiteSpace: 'nowrap',
          minWidth: 'fit-content'
        }}>
          {/* Universal checkbox for all node types */}
          <input
            type="checkbox"
            className="dashboard-area-tree-checkbox"
            checked={isSelected}
            ref={(el) => {
              if (el) {
                el.indeterminate = isIndeterminate;
              }
            }}
            onChange={(e) => {
              e.stopPropagation();
              if (isAreaNode) {
                handleAreaCheckboxChange(node.area_id, node.name, node);
              } else if (isFloorNode) {
                handleFloorCheckboxClick(node.floor_id, e);
              } else if (isGroupNode) {
                handleGroupCheckboxChange(node.group_id, node.name, node);
              } else if (isIntermediateParent) {
                handleIntermediateParentCheckboxChange(node, e);
              }
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              marginRight: '8px',
              cursor: 'pointer',
              pointerEvents: 'auto'
            }}
          />

          {/* Node name - clickable for expansion */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                handleToggleNode(nodeId);
              }
            }}
            className="dashboard-area-tree-label"
            style={{
              fontSize: '13px',
              color: areaTreeTextColor,
              cursor: hasChildren ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
              padding: hasChildren ? '2px 4px' : '2px 0',
              borderRadius: hasChildren ? '2px' : '0',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (hasChildren) {
                e.target.style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (hasChildren) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
            title={node.name}
          >
            {hasChildren && (
              <span style={{ marginRight: '4px', fontSize: '12px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            {node.name}
          </span>
        </div>

        {/* Render children if expanded */}
        {isExpanded && hasChildren && (
          <div>
            {node.children && node.children.map(child => renderTreeNode(child, level + 1))}
            {node.areas && node.areas.map(area => renderTreeNode(area, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleAreaCheckboxChange = (areaId, areaName, node) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const toggleResolution = resolveAreaToggleSelection({
      areaId,
      node,
      localSelectedAreas,
      getChildAreaIds: getAllChildAreaIds,
    });

    setLocalSelectedAreas(toggleResolution.localSelectedAreas);

    if (toggleResolution.clearFloorSelection) {
      setLocalSelectedFloorIds([]);
      setFloorsWithSelectedAreas(new Set());
    }
  };

  const handleGroupCheckboxChange = (groupId, groupName, node) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const toggleResolution = resolveGroupToggleSelection({
      groupId,
      localSelectedGroups,
      localSelectedAreas,
      getAllAreasFromGroup,
    });

    setLocalSelectedGroups(toggleResolution.localSelectedGroups);
    setLocalSelectedAreas(toggleResolution.localSelectedAreas);

    if (toggleResolution.clearFloorSelection) {
      setLocalSelectedFloorIds([]);
      setFloorsWithSelectedAreas(new Set());
    }
  };

  const handleIntermediateParentCheckboxChange = (node, event) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const toggleResolution = resolveIntermediateParentToggle({
      node,
      localSelectedAreas,
      getChildAreaIds: getAllChildAreaIds,
    });

    setLocalSelectedAreas(toggleResolution.localSelectedAreas);

    if (toggleResolution.clearFloorSelection) {
      setLocalSelectedFloorIds([]);
      setFloorsWithSelectedAreas(new Set());
    }
  };

  const handleDurationChange = (e) => {
    const newDuration = e.target.value;

    // Only set loading if duration actually changed
    if (newDuration !== selectedDuration) {
      // Show global loader immediately when duration changes
      setGlobalLoading(true);

      // Immediately clear old data and show loaders
      setChartLoading({
        energyConsumption: true,
        energySavings: true,
        peakMinConsumption: true,
        totalConsumptionByGroup: true,
        lightPowerDensity: true,
        occupancyCount: true,
        occupancyByGroup: true,
        spaceUtilizationPerArea: true,
        // peakMinOccupancy: true, // Commented out - not using peak min max API for space utilization
        savingsByStrategy: true
      });
      setIsDataLoading(true);

      // Reset to current date when changing duration
      const today = new Date();

      // Batch multiple Redux actions together
      dispatch((dispatch) => {
        dispatch(setCurrentDate(formatDateForState(today)));
        dispatch(setCurrentYear(today.getFullYear()));
        dispatch(setCustomDateRange({ startDate: null, endDate: null }));
        dispatch(setIsNavigating(false));
        dispatch(setSelectedDuration(newDuration));
      });
    }

    setShowDurationDropdown(false);
  }

  // Fetch energy data from backend

  const { apiParams, apiParamsString } = useDashboardApiParams({
    selectedDuration,
    customDateRange,
    customStartDate,
    customEndDate,
    selectedAreas,
    selectedFloorIds,
    allAreasLoaded,
    dateParams,
    isNavigating,
  });

  // Add request cancellation to prevent race conditions
  const abortControllerRef = useRef(null);
  const debounceTimeoutRef = useRef(null);
  const isApiCallInProgressRef = useRef(false);
  const apiCallTimeoutRef = useRef(null);

  useEffect(() => {
    if (!apiParams) {
      return;
    }

    // Check if parameters have actually changed
    // Only compare apiParams, not activeTab, to prevent duplicate calls
    const currentParams = { ...apiParams };
    const previousParams = previousApiParamsRef.current ? { ...previousApiParamsRef.current } : null;

    const paramsString = JSON.stringify(currentParams);
    const previousParamsString = JSON.stringify(previousParams);

    if (paramsString === previousParamsString) {
      return;
    }

    // Additional check: if this is a navigation call and we just had a navigation call, skip
    if (currentParams.isNavigating && previousParams && previousParams.isNavigating) {
      return;
    }


    previousApiParamsRef.current = { ...apiParams };

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Clear any existing API call timeout
    if (apiCallTimeoutRef.current) {
      clearTimeout(apiCallTimeoutRef.current);
    }

    // Debounce the actual API call to prevent rapid successive calls
    debounceTimeoutRef.current = setTimeout(() => {
      // Only proceed if parameters are still valid and no other call is in progress
      if (!isApiCallInProgressRef.current) {
        isApiCallInProgressRef.current = true;

        // Trigger the API call after debounce
        apiCallTimeoutRef.current = setTimeout(() => {
          // This will be handled by the separate useEffect
          isApiCallInProgressRef.current = false;
        }, 100);
      }
    }, 300); // 300ms debounce for better stability

    // Don't set global loading states to prevent flickering
    // Loading states are handled by individual API calls

    // Cleanup function to abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (apiCallTimeoutRef.current) {
        clearTimeout(apiCallTimeoutRef.current);
      }
    };
  }, [apiParams, dispatch]);

  // Track unified API params to prevent duplicate calls - use stable string comparison
  const unifiedApiParamsRef = useRef(null);
  const lastApiParamsStringRef = useRef(null);
  const lastActiveTabRef = useRef(null);

  // Refs for batching loading state updates to prevent line chart re-renders
  const pendingLoadingUpdatesRef = useRef(new Set());
  const updateScheduledRef = useRef(false);

  // Create stable string representation of apiParams to prevent unnecessary re-runs
  // This memoization ensures the string only changes when actual values change

  // Separate useEffect to handle tab changes and trigger API calls for active tab only
  useEffect(() => {
    if (!apiParams || !apiParamsString) {
      return;
    }

    // CRITICAL FIX: Only run if apiParams or activeTab actually changed
    // This prevents re-running when donut chart loading states update
    if (lastApiParamsStringRef.current === apiParamsString && lastActiveTabRef.current === activeTab) {
      return;
    }

    // Update refs to track current state
    lastApiParamsStringRef.current = apiParamsString;
    lastActiveTabRef.current = activeTab;

    // Prevent duplicate API calls by checking if we're already in the middle of a request
    // But allow reload if reloadTrigger has changed (automatic reload on login)
    if (isApiCallInProgressRef.current && reloadTrigger === 0) {
      return;
    }

    // Set flag to prevent duplicate calls
    isApiCallInProgressRef.current = true;

    // CRITICAL FIX: Only show global loader when we have valid API parameters
    // Don't show loader when apiParams is null (no selection made yet)
    // Allow API calls with no parameters (full project data) but don't show loader for initial load
    if (apiParams && (apiParams.areaIds || apiParams.floorIds)) {
      setGlobalLoading(true);
    }

    // Only trigger API calls when tab changes or when we have new parameters
    const fetchDataForActiveTab = async () => {
      try {
        if (activeTab === 'overview') {
          setGlobalLoading(false);
          isApiCallInProgressRef.current = false;
          return;
        }

        const requestId = Math.random().toString(36).substr(2, 9);
        const isLargeDateRange = ['this-month', 'this-year'].includes(selectedDuration);

        // Set loading states for all charts that will be called
        // Loading states are handled by individual API calls

        // Call APIs for active tab only - WAIT FOR ALL CHARTS BEFORE SHOWING
        if (activeTab === 'energy') {
          const {
            shouldCallUnified,
            nextUnifiedApiParamsRef,
            totalApis,
          } = planEnergyTabApiCalls(apiParamsString, unifiedApiParamsRef.current);

          if (shouldCallUnified) {
            unifiedApiParamsRef.current = nextUnifiedApiParamsRef;
          }

          const apiCalls = [];

          if (shouldCallUnified) {
            apiCalls.push({
              name: 'unifiedEnergyData',
              promise: dispatch(fetchUnifiedEnergyConsumptionSavingsData({ ...apiParams, forceRefresh: true })),
            });
          }

          apiCalls.push(
            { name: 'totalConsumptionByGroup', promise: dispatch(fetchTotalConsumptionByGroup(apiParams)) },
            { name: 'lightPowerDensity', promise: dispatch(fetchLightPowerDensity(apiParams)) },
            { name: 'savingsByStrategy', promise: dispatch(fetchSavingsByStrategy(apiParams)) }
          );

          startEnergyTabLoading(shouldCallUnified);

          const completedApis = new Set();

          const checkAllReady = () => {
            if (completedApis.size === totalApis) {
              completeEnergyTabLoading(shouldCallUnified);
            }
          };

          apiCalls.forEach((apiCall) => {
            apiCall.promise
              .then(() => {
                completedApis.add(apiCall.name);
                checkAllReady();
              })
              .catch(() => {
                completedApis.add(apiCall.name);
                checkAllReady();
              });
          });

          Promise.allSettled(apiCalls.map((apiCall) => apiCall.promise))
            .then(() => {
              isApiCallInProgressRef.current = false;
            });
        } else if (activeTab === 'space-utilization') {
          // Space Utilization APIs - PARALLEL EXECUTION FOR MAXIMUM SPEED
          const spaceUtilizationApis = [
            { name: 'occupancyCount', promise: dispatch(fetchOccupancyCount(apiParams)) },
            { name: 'occupancyByGroup', promise: dispatch(fetchOccupancyByGroup(apiParams)) },
            { name: 'spaceUtilizationPerArea', promise: dispatch(fetchSpaceUtilizationPerArea(apiParams)) }
            // { name: 'peakMinOccupancy', promise: dispatch(fetchPeakMinOccupancy(apiParams)) } // Commented out - not using peak min max API for space utilization
          ];

          // Set loading states for all space utilization APIs
          setChartLoading(prev => ({
            ...prev,
            occupancyCount: true,
            occupancyByGroup: true,
            spaceUtilizationPerArea: true
            // peakMinOccupancy: true // Commented out - not using peak min max API for space utilization
          }));

          // Execute all space utilization API calls in parallel but handle each completion individually
          spaceUtilizationApis.forEach(api => {
            api.promise
              .then(() => {
                // Update loading state immediately when this specific API completes
                setChartLoading(prev => ({ ...prev, [api.name]: false }));
              })
              .catch((error) => {
                // Handle individual API errors
                // Space API call failed
                setChartLoading(prev => ({ ...prev, [api.name]: false }));
              });
          });

          // Use Promise.allSettled to reset global states when all calls complete
          Promise.allSettled(spaceUtilizationApis.map(api => api.promise))
            .then(() => {
              // Reset global states when all calls complete
              setGlobalLoading(false);
              isApiCallInProgressRef.current = false;
            });
        } else if (activeTab === 'charts') {
          // Charts tab - Instant Occupancy Count, Occupancy By Group from logs, and Space Utilization Per Area from logs APIs
          const chartsApis = [
            { name: 'instantOccupancyCount', promise: dispatch(fetchInstantOccupancyCount(apiParams)) },
            { name: 'occupancyByGroupFromLogs', promise: dispatch(fetchOccupancyByGroupFromLogs(apiParams)) },
            { name: 'spaceUtilizationPerFromLogs', promise: dispatch(fetchSpaceUtilizationPerFromLogs(apiParams)) }
          ];

          // Set loading states for all charts APIs
          setChartLoading(prev => ({
            ...prev,
            instantOccupancyCount: true,
            occupancyByGroupFromLogs: true,
            spaceUtilizationPerFromLogs: true
          }));

          // Execute all charts API calls in parallel but handle each completion individually
          chartsApis.forEach(api => {
            api.promise
              .then(() => {
                // Update loading state immediately when this specific API completes
                setChartLoading(prev => ({ ...prev, [api.name]: false }));
              })
              .catch((error) => {
                // Handle individual API errors
                setChartLoading(prev => ({ ...prev, [api.name]: false }));
              });
          });

          // Use Promise.allSettled to reset global states when all calls complete
          Promise.allSettled(chartsApis.map(api => api.promise))
            .then(() => {
              // Reset global states when all calls complete
              setGlobalLoading(false);
              isApiCallInProgressRef.current = false;
            });
        }
      } catch (error) {
        // Handle errors silently
      }
    };

    fetchDataForActiveTab();

    // Cleanup function - don't reset flag here, let API handlers manage it
    return () => {
      // Cleanup handled by individual API completion handlers
    };
  }, [activeTab, apiParamsString, dispatch, reloadTrigger, selectedDuration]);


  // Automatic reload on login for all roles - trigger once when data is ready
  useEffect(() => {
    // Only reload once per login session
    if (hasInitialReloadRef.current) {
      return;
    }

    // Wait for essential data to be ready
    const floorsReady = floorStatus === 'succeeded' && floors.length >= 0;
    const profileReady = isOperator ? (userProfile !== null && !profileLoading) : true;
    const durationReady = selectedDuration !== null && selectedDuration !== undefined;
    const areasReady = allAreasLoaded || getAvailableFloors().length === 0; // Allow reload even if no floors

    // Only proceed if all conditions are met and we have API params
    if (floorsReady && profileReady && durationReady && areasReady && apiParams && !isApiCallInProgressRef.current) {
      // Mark as reloaded immediately to prevent multiple reloads
      hasInitialReloadRef.current = true;

      // Small delay to ensure all state is settled, then trigger reload
      const reloadTimer = setTimeout(() => {
        // Force a data reload by clearing cache and resetting flags
        dispatch(clearDataCache());
        isApiCallInProgressRef.current = false;

        // Trigger reload by incrementing reloadTrigger
        // This will cause the useEffect that handles apiParams to run again
        setReloadTrigger(prev => prev + 1);
      }, 500); // Delay to ensure everything is ready

      return () => clearTimeout(reloadTimer);
    }
  }, [floorStatus, floors.length, profileLoading, userProfile, selectedDuration, allAreasLoaded, isOperator, apiParams, dispatch]);

  // Remove the filterData and related mock data logic entirely

  const handleTabChange = (tab) => {
    activeTabRef.current = tab;
    // Close area tree and dropdown when switching tabs
    if (expandedFloorId !== null) {
      setExpandedFloorId(null);
      setExpandedNodes(new Set());
    }
    if (showAreaDropdown) {
      setShowAreaDropdown(false);
    }

    setActiveTab(tab);

    const nextPath = getPathFromTab(tab);
    if (location.pathname !== nextPath) {
      navigate(nextPath);
    }

    // Show global loader immediately when tab changes
    setGlobalLoading(true);

    // Tab switching state removed to prevent flickering

    // Reset API call progress flag to allow new API calls for the new tab
    isApiCallInProgressRef.current = false;

    // Clear data cache when switching tabs to prevent stale data
    dispatch(clearDataCache());

    // Set loading states for all charts when switching tabs
    setChartLoading({
      energyConsumption: true,
      energySavings: true,
      peakMinConsumption: true,
      totalConsumptionByGroup: true,
      lightPowerDensity: true,
      occupancyCount: true,
      occupancyByGroup: true,
      spaceUtilizationPerArea: true,
      // peakMinOccupancy: true, // Commented out - not using peak min max API for space utilization
      savingsByStrategy: true
    });

    // Trigger API calls for the new tab if we have the required parameters
    // Use selected areas if available, otherwise use all accessible areas from floors
    let areasToUse = selectedAreas;
    let floorsToUse = selectedFloorIds;

    // Always proceed with API calls if we have duration - let backend handle area filtering
    if (selectedDuration) {
      // Don't call APIs for custom until both dates are set
      if (selectedDuration === 'custom' && (!customStartDate || !customEndDate)) {
        return;
      }

      // Calculate date parameters for current date (not navigated date)
      const { startDate, endDate } = calculateCurrentDateParameters();

      // Use the selectedDuration directly - let the Redux slice handle the time_range mapping
      const params = {
        // CORRECT LOGIC: If floor is selected, send ONLY floorIds, NOT areaIds
        areaIds: (floorsToUse && floorsToUse.length > 0) ? null : (areasToUse.length > 0 ? areasToUse : null),
        floorIds: floorsToUse && floorsToUse.length > 0 ? floorsToUse : null,
        timeRange: selectedDuration,
        startDate: startDate,
        endDate: endDate,
        isNavigating: false // Reset navigation flag when switching tabs
      };

      // Don't call APIs directly here - let the useEffect handle it
      // This prevents multiple API calls that overwrite the complete data
    }
  }

  const handleDashboardTabKeyDown = (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      requestTopbarNavFocus('Dashboard');
      return;
    }

    handleRovingTablistKeyDown(event, {
      itemKeys: dashboardTabKeys,
      activeKey: activeTabRef.current,
      keyRefs: tabRefs,
      orientation: 'horizontal',
      onActivate: (tab) => handleTabChange(tab),
    });
  };

  const handleTabChangeRef = useRef(handleTabChange);
  handleTabChangeRef.current = handleTabChange;

  useEffect(() => {
    return registerPageSubNavHandler('dashboard', ({ tabKey = 'energy' } = {}) => {
      const key = dashboardTabKeys.includes(tabKey) ? tabKey : 'energy';
      handleTabChangeRef.current(key);
      requestAnimationFrame(() => {
        tabRefs.current[key]?.focus({ preventScroll: true });
      });
    });
  }, [dashboardTabKeys]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (activeTabRef.current === 'overview') return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp') return;
      if (isKeyboardNavBlockedTarget(event.target)) return;
      if (event.target?.closest?.('.topbar-main-nav')) return;
      if (event.target?.closest?.('.nav-tab-btn')) return;

      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'ArrowUp') {
        requestTopbarNavFocus('Dashboard');
        return;
      }

      handleRovingTablistKeyDown(
        { ...event, currentTarget: tabRefs.current[activeTabRef.current] },
        {
          itemKeys: dashboardTabKeys,
          activeKey: activeTabRef.current,
          keyRefs: tabRefs,
          orientation: 'horizontal',
          onActivate: (tab) => handleTabChangeRef.current(tab),
        }
      );
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [dashboardTabKeys]);

  // Update the getCurrentSelectionText function to handle week display
  const getCurrentSelectionText = () => {
    // Convert currentDate string to Date object
    const currentDateObj = parseDateFromState(currentDate);

    if (selectedDuration === 'this-day') {
      return currentDateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else if (selectedDuration === 'this-week') {
      // Calculate the start and end of the week
      const startOfWeek = new Date(currentDateObj);
      startOfWeek.setDate(currentDateObj.getDate() - currentDateObj.getDay()); // Start of week (Sunday)

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // End of week (Saturday)

      return `${startOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })} - ${endOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
    } else if (selectedDuration === 'this-month') {
      return currentDateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
      });
    } else if (selectedDuration === 'this-year') {
      return currentYear.toString();
    }
    return '';
  };
  // Update the useEffect to reset current date when duration changes
  useEffect(() => {

    // Only reset on initial load or when duration changes for the first time
    if (isInitialLoad.current) {
      if (selectedDuration === 'this-day') {
        dispatch(setCurrentDate(formatDateForState(new Date())));
      } else if (selectedDuration === 'this-week') {
        dispatch(setCurrentDate(formatDateForState(new Date())));
      } else if (selectedDuration === 'this-month') {
        dispatch(setCurrentDate(formatDateForState(new Date())));
        setSelectedMonthForData({
          year: new Date().getFullYear(),
          month: new Date().getMonth()
        });
      } else if (selectedDuration === 'this-year') {
        dispatch(setCurrentYear(new Date().getFullYear()));
      }
      isInitialLoad.current = false;
    }
  }, [selectedDuration, dispatch]);

  // Copy the exact helper functions from AreaTreeDialog.jsx
  const getAllAreaCodes = (node) => {
    let codes = [node.area_code];
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        codes = codes.concat(getAllAreaCodes(child));
      });
    }

    // Limit the number of area codes to prevent selecting too many areas
    if (codes.length > 20) {
      return codes.slice(0, 15)
    }

    return codes;
  };

  const getAllLeafNodes = (node) => {
    if (!node.children || node.children.length === 0) {
      return [node];
    }
    return node.children.flatMap(getAllLeafNodes);
  };







  const availableAreas = flattenAreaTree(areaTree)
  const isLoading = floorStatus === 'loading'
  const hasError = dashboardError || (floorStatus === 'failed')

    const transformDataForCharts = useCallback(
    createStandardTransformDataForCharts(
      sharedTransformDataForCharts,
      buildStandardTransformChartOptions({ selectedDuration, selectedAreas, areaTree })
    ),
    [selectedDuration, selectedAreas, areaTree]
  );

  // Isolated wrapper removed — consumption/savings use UnifiedEnergyWidget

  // Add the missing getNavigationButtonText function
  const getNavigationButtonText = (direction) => {
    return direction === 'previous' ? 'Previous' : 'Next';
  };

  const unifiedEnergyAdvancedSurface = useMemo(
    () => ({
      cardBackground,
      cardBorder: CARD_BORDER,
      cardShadow: CARD_SHADOW,
      cssTooltipStyle: DASHBOARD_CHART_TOOLTIP_STYLE,
      resolveThemePalette: (count, opts) =>
        buildThemeAwareChartPalette(backgroundColor, count, opts),
      cardClassName: 'chart-card-animated',
    }),
    [cardBackground, backgroundColor]
  );

  const consumptionExportControl = useMemo(
    () => (
      <>
        <ChartExportButton
          onClick={() =>
            setShowExportDropdown((prev) => ({
              ...prev,
              [consumptionTitle]: !prev[consumptionTitle],
            }))
          }
        />
        {showExportDropdown[consumptionTitle] && (
          <EnergyExportMenu
            menuKey={consumptionTitle}
            isOpen={showExportDropdown[consumptionTitle]}
            exportLoading={exportLoading}
            onEmail={handleConsumptionEmail}
            onDownload={handleConsumptionDownload}
            innerRef={(el) => {
              exportDropdownRefs.current[consumptionTitle] = el;
            }}
            preset={resolveAdvancedEnergyExportMenuPreset({ marginTop: 0 })}
          />
        )}
      </>
    ),
    [consumptionTitle, showExportDropdown, exportLoading]
  );

  const savingsExportControl = useMemo(
    () => (
      <>
        <ChartExportButton
          onClick={() =>
            setShowExportDropdown((prev) => ({
              ...prev,
              [savingsTitle]: !prev[savingsTitle],
            }))
          }
        />
        {showExportDropdown[savingsTitle] && (
          <EnergyExportMenu
            menuKey={savingsTitle}
            isOpen={showExportDropdown[savingsTitle]}
            exportLoading={exportLoading}
            onEmail={handleSavingsEmail}
            onDownload={handleSavingsDownload}
            innerRef={(el) => {
              exportDropdownRefs.current[savingsTitle] = el;
            }}
            preset={resolveAdvancedEnergyExportMenuPreset({ marginTop: 0 })}
          />
        )}
      </>
    ),
    [savingsTitle, showExportDropdown, exportLoading]
  );

  const savingsByStrategyAdvancedSurface = useMemo(
    () => ({
      cardBackground,
      cardBorder: CARD_BORDER,
      cardShadow: CARD_SHADOW,
      cssTooltipStyle: DASHBOARD_CHART_TOOLTIP_STYLE,
      resolveThemeColor: (name) => getThemeAwareSavingsStrategyColor(name, backgroundColor),
      resolveSegmentLabelColors: (segmentColor) =>
        resolvePieChartLabelColors(backgroundColor, segmentColor),
      cardClassName: 'chart-card-animated',
      loaderHeight: '300px',
    }),
    [cardBackground, backgroundColor]
  );

  const totalConsumptionByGroupAdvancedSurface = useMemo(
    () => ({
      cardBackground,
      cardBorder: CARD_BORDER,
      cardShadow: CARD_SHADOW,
      cssTooltipStyle: DASHBOARD_CHART_TOOLTIP_STYLE,
      resolveThemePalette: (count) => getThemeAwarePieColors(backgroundColor, count),
      resolveSegmentLabelColors: (segmentColor) =>
        resolvePieChartLabelColors(backgroundColor, segmentColor),
    }),
    [cardBackground, backgroundColor]
  );

  const totalConsumptionByGroupExportControl = useMemo(
    () => (
      <>
        <ChartExportButton
          onClick={() =>
            setShowExportDropdown((prev) => ({
              ...prev,
              [totalConsumptionByGroupTitle]: !prev[totalConsumptionByGroupTitle],
            }))
          }
        />
        {showExportDropdown[totalConsumptionByGroupTitle] && (
          <EnergyExportMenu
            menuKey={totalConsumptionByGroupTitle}
            isOpen={showExportDropdown[totalConsumptionByGroupTitle]}
            exportLoading={exportLoading}
            onEmail={handleConsumptionByGroupEmail}
            onDownload={handleConsumptionByGroupDownload}
            innerRef={(el) => {
              exportDropdownRefs.current[totalConsumptionByGroupTitle] = el;
            }}
            preset={resolveAdvancedEnergyExportMenuPreset({ marginTop: 0 })}
          />
        )}
      </>
    ),
    [totalConsumptionByGroupTitle, showExportDropdown, exportLoading]
  );

  const energyWidgetRenderContext = useMemo(
    () =>
      buildAdvancedEnergyWidgetRenderContext(orchestration, {
        widgetList,
        peakMinConsumption,
        energyConsumptionLoading,
        energySavingsLoading,
        peakMinConsumptionLoading,
        savingsByStrategy,
        totalConsumptionByGroup,
        lightPowerDensity,
        lightingUnit,
        globalLoading,
        selectedDuration,
        currentDate,
        currentYear,
        selectedAreas,
        areaGroups,
        isLargeScreen,
        chartHeaderStyle,
        ChartLoader,
        transformDataForCharts,
        metricPanelBorder,
        widgetContextOverrides: {
          consumption: {
            advancedSurface: unifiedEnergyAdvancedSurface,
            exportControl: consumptionExportControl,
          },
          savings: {
            advancedSurface: unifiedEnergyAdvancedSurface,
            exportControl: savingsExportControl,
          },
          savings_by_strategy: { advancedSurface: savingsByStrategyAdvancedSurface },
          total_consumption_by_group: {
            advancedSurface: totalConsumptionByGroupAdvancedSurface,
            exportControl: totalConsumptionByGroupExportControl,
          },
          light_power_density: {},
          peak_and_minimum_consumption: { metricPanelBorder },
        },
      }),
    [
      orchestration,
      widgetList,
      peakMinConsumption,
      energyConsumptionLoading,
      energySavingsLoading,
      peakMinConsumptionLoading,
      savingsByStrategy,
      totalConsumptionByGroup,
      lightPowerDensity,
      lightingUnit,
      globalLoading,
      selectedDuration,
      currentDate,
      currentYear,
      selectedAreas,
      areaGroups,
      isLargeScreen,
      chartHeaderStyle,
      metricPanelBorder,
      unifiedEnergyAdvancedSurface,
      consumptionExportControl,
      savingsExportControl,
      savingsByStrategyAdvancedSurface,
      totalConsumptionByGroupAdvancedSurface,
      totalConsumptionByGroupExportControl,
    ]
  );

  const advancedEnergyLayoutAdapter = useMemo(
    () => ({
      SLOT_REGISTRY: ADVANCED_ENERGY_SLOT_REGISTRY,
      GRID_SPACING: ADVANCED_GRID_SPACING,
      GRID_ITEM_PROPS: ADVANCED_GRID_ITEM_PROPS,
      resolveGridRowSx: resolveAdvancedGridRowSx,
      getSlotMeta: getAdvancedEnergySlotMeta,
    }),
    []
  );

  const advancedEnergyLayoutRuntime = useMemo(
    () => ({
      getShellProps: (slotId) => {
        if (slotId === 'light_power_density') {
          return {
            outerStyle: {
              background: cardBackground,
              border: CARD_BORDER,
              boxShadow: CARD_SHADOW,
              borderRadius: '8px',
              padding: '20px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
            },
            outerClassName: 'chart-card-animated',
            headerTitle: getWidgetTitle('light_power_density', 'Lighting Power Density'),
            headerTitleStyle: chartHeaderStyle,
            headerControl: (
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select
                  className="dashboard-lighting-unit-select"
                  value={lightingUnit}
                  onChange={(e) => setLightingUnit(e.target.value)}
                  MenuProps={dashboardSelectMenuProps}
                  sx={{
                    ...dashboardSelectFieldSx,
                    fontSize: 14,
                    minHeight: 'unset',
                  }}
                >
                  <MenuItem value="Watt / Sq ft">Watt / Sq ft</MenuItem>
                  <MenuItem value="Watt / Sq m">Watt / Sq m</MenuItem>
                </Select>
              </FormControl>
            ),
            bodyContent: (
              <DashboardWidgetRenderer
                widgetKey="light_power_density"
                variant="advanced"
                context={energyWidgetRenderContext}
              />
            ),
            bodyStyle: {
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              backgroundColor: DASHBOARD_CHART_LOADING_BG,
              border: 'none',
              borderRadius: '12px',
            },
          };
        }
        if (slotId === 'peak_and_minimum_consumption') {
          return {
            outerStyle: {
              background: cardBackground,
              border: CARD_BORDER,
              boxShadow: CARD_SHADOW,
              borderRadius: '8px',
              padding: '20px',
              height: '200px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            },
            outerClassName: 'chart-card-animated',
            headerTitle: getWidgetTitle(
              'peak_and_minimum_consumption',
              'Peak & Minimum Consumption'
            ),
            headerTitleStyle: chartHeaderStyle,
            headerTrailing: <div style={{ position: 'relative' }} />,
            skipInnerWrapper: true,
          };
        }
        return {};
      },
    }),
    [
      cardBackground,
      CARD_BORDER,
      CARD_SHADOW,
      chartHeaderStyle,
      getWidgetTitle,
      lightingUnit,
      dashboardSelectMenuProps,
      dashboardSelectFieldSx,
      energyWidgetRenderContext,
    ]
  );


  return (
    <div onClick={(e) => e.stopPropagation()}>
      {/* Fixed Header Section - Static Controls */}
      <Box
        sx={{
          position: 'fixed',
          top: activeTab === 'overview' ? '60px' : '85px',
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          p: 0,
          zIndex: 999,

        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 1, sm: 2, md: 3, lg: 6, xl: 8, '2xl': 10 },
            py: { xs: 1, md: 2 },


          }}
        >
          {/* Top Row - Dropdowns and Tabs Side by Side */}
          <Grid
            container
            spacing={{ xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
            alignItems="center"
            wrap="wrap"


          >
            {/* Select Floor and Areas Dropdown */}
            {activeTab !== 'alerts' && activeTab !== 'overview' && (
              <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
                <div style={{ width: '100%', position: 'relative' }} ref={areaDropdownRef}>
                  <div
                    className="dashboard-area-filter-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAreaDropdown(!showAreaDropdown);
                    }}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      padding: '8px 10px',
                      border: '1px solid var(--dashboard-select-field-border, #ccc)',
                      borderRadius: '4px',
                      backgroundColor: 'var(--dashboard-select-field-bg, #ffffff)',
                      color: 'var(--dashboard-select-field-text, #1a2a42)',
                      fontSize: '13px',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        whiteSpace: 'nowrap',
                        marginRight: '6px',
                        fontSize: '12px',
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'inline-block',
                        color: 'inherit'
                      }}
                      title={getAreaSelectionText()}
                    >
                      {getAreaSelectionText()}
                    </span>
                    <span className="dashboard-area-filter-chevron" style={{ color: 'inherit' }}>▼</span>
                  </div>

                  {showAreaDropdown && (
                    <div
                      className="dashboard-area-tree-panel"
                      style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      color: areaTreeTextColor,
                      backgroundColor: 'var(--dashboard-select-field-bg, #ffffff)',
                      border: '1px solid var(--dashboard-select-field-border, #ccc)',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: 1002,
                      marginTop: '2px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      overflowX: 'auto',
                      width: 'max-content',
                      maxWidth: 'min(90vw, 480px)',
                    }}>
                      {floorStatus === 'loading' ? (
                        <DashboardAreaTreeInlineStatus mode="loading" textColor={areaTreeTextColor} />
                      ) : hasError ? (
                        <DashboardAreaTreeInlineStatus mode="error" />
                      ) : getAvailableFloors().length > 0 ? (
                        <>
                          {getAvailableFloors().map(floor => (
                            <div key={floor.id}>
                              <div
                                className="dashboard-area-tree-floor-row"
                                ref={expandedFloorId === floor.id ? areaTreeContainerRef : null}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #eee',
                                  backgroundColor: localSelectedFloorIds.includes(floor.id) ? '#f8f9fa' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  flexDirection: 'column'
                                }}
                              >
                                {/* Floor row */}
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: '100%',
                                  marginBottom: localSelectedFloorIds.includes(floor.id) ? '8px' : '0'
                                }}>
                                  {/* Floor checkbox */}
                                  <input
                                    type="checkbox"
                                    className="floor-checkbox"
                                    checked={localSelectedFloorIds.includes(floor.id)}
                                    ref={(el) => {
                                      if (el && localSelectedFloorIds.includes(floor.id) && areaTree) {
                                        const floorAreaIds = getAllAreaIdsFromFloor(areaTree);
                                        const selectedFromThisFloor = floorAreaIds.filter(id => selectedAreas.includes(id));
                                        el.indeterminate = selectedFromThisFloor.length > 0 && selectedFromThisFloor.length < floorAreaIds.length;
                                      }
                                    }}
                                    onChange={(event) => {
                                      event.stopPropagation();
                                      handleFloorCheckboxClick(floor.id, event);
                                    }}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                    }}
                                    style={{
                                      marginRight: '8px',
                                      transform: 'scale(0.8)',
                                      cursor: 'pointer'
                                    }}
                                  />
                                  {/* Floor name */}
                                  <span
                                    data-floor-name="true"
                                    className="dashboard-area-tree-label"
                                    style={{
                                      cursor: 'pointer',
                                      fontSize: '14px',
                                      fontWeight: 600,
                                      color: areaTreeTextColor,
                                      whiteSpace: 'nowrap',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFloorChange(floor.id);
                                    }}
                                    title={floor.floor_name || floor.name}
                                  >
                                    {floor.floor_name || floor.name}
                                  </span>
                                </div>

                                {/* Show area tree if this floor is expanded */}
                                {expandedFloorId === floor.id && areaTree && (
                                  <div style={{
                                    width: 'max-content',
                                    minWidth: '100%',
                                    paddingLeft: '20px',
                                    borderLeft: '2px solid #e0e0e0',
                                  }}>
                                    {floorLoading ? (
                                      <div style={{ padding: '5px 0', color: areaTreeTextColor, fontSize: '11px' }}>
                                        Loading areas...
                                      </div>
                                    ) : (areaTree.tree || areaTree.areas || []).length > 0 ? (
                                      <div style={{
                                        padding: '4px 0',
                                        width: 'max-content',
                                        minWidth: '100%',
                                      }}>
                                        {(areaTree.tree || areaTree.areas || []).map(node => renderTreeNode(node))}
                                      </div>
                                    ) : (
                                      <div style={{ padding: '5px 0', color: areaTreeTextColor, fontSize: '11px' }}>
                                        No areas available
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Clear All and Set buttons if floors, areas, or groups are selected */}
                          {(localSelectedAreas.length > 0 || localSelectedFloorIds.length > 0 || localSelectedGroups.length > 0) && (
                            <div style={{
                              padding: '8px 12px',
                              borderTop: '1px solid #eee',
                              backgroundColor: '#f8f9fa',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  applyAreaTreeClearAll();
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#666',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Clear All
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  applyAreaTreeSet();
                                }}
                                style={{
                                  background: '#4CAF50',
                                  border: 'none',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}
                              >
                                Set
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <DashboardAreaTreeInlineStatus
                          mode="empty"
                          textColor={areaTreeTextColor}
                          isOperator={isOperator}
                          floorStatus={floorStatus}
                        />
                      )}
                    </div>
                  )}
                </div>
              </Grid>
            )}

            {/* Duration Dropdown with Date Navigation below */}
            {activeTab !== 'alerts' && activeTab !== 'overview' && (
              <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
                <div style={{ width: '100%' }}>
                  {/* Duration Dropdown */}
                  <div style={{ position: 'relative', width: '100%', marginBottom: '3px' }}>
                    <FormControl fullWidth size="small" disabled={globalLoading} sx={{ opacity: globalLoading ? 0.6 : 1 }}>
                      <Select
                        className="dashboard-duration-select"
                        value={selectedDuration || ''}
                        onChange={handleDurationChange}
                        displayEmpty
                        MenuProps={dashboardSelectMenuProps}
                        sx={{
                          ...dashboardSelectFieldSx,
                          cursor: globalLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <MenuItem value="">Select Duration</MenuItem>
                        <MenuItem value="this-day">This Day</MenuItem>
                        <MenuItem value="this-week">This Week</MenuItem>
                        <MenuItem value="this-month">This Month</MenuItem>
                        <MenuItem value="this-year">This Year</MenuItem>
                        <MenuItem value="custom">Custom Period</MenuItem>
                      </Select>
                    </FormControl>
                  </div>

                  {/* Date Navigation - positioned directly below duration dropdown */}
                  <div
                    style={{
                      background: 'white',
                      borderRadius: '4px',
                      padding: '4px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      border: '1px solid #ccc',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      flexWrap: 'nowrap',
                      minHeight: '32px',
                    }}
                  >
                    {selectedDuration === 'custom' ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: isLargeScreen ? '6px' : (isMediumScreen ? '4px' : '2px'),
                        width: '100%',
                        justifyContent: 'center',
                        flexWrap: 'nowrap',
                        minWidth: 0
                      }}>
                        <NativeDateInput
                          value={customStartDate || ''}
                          onChange={e => dispatch(setCustomDateRange({
                            startDate: e.target.value,
                            endDate: customEndDate
                          }))}
                          wrapperStyle={{
                            minWidth: 0,
                            flex: '1 1 auto',
                            maxWidth: '45%',
                          }}
                          style={{
                            padding: isLargeScreen ? '6px' : (isMediumScreen ? '4px' : '3px'),
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            fontSize: isLargeScreen ? '12px' : (isMediumScreen ? '11px' : '10px'),
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            width: '100%',
                          }}
                        />
                        <span style={{
                          fontWeight: 600,
                          color: '#333',
                          fontSize: isLargeScreen ? '12px' : (isMediumScreen ? '11px' : '10px'),
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}>to</span>
                        <NativeDateInput
                          value={customEndDate || ''}
                          onChange={e => dispatch(setCustomDateRange({
                            startDate: customStartDate,
                            endDate: e.target.value
                          }))}
                          wrapperStyle={{
                            minWidth: 0,
                            flex: '1 1 auto',
                            maxWidth: '45%',
                          }}
                          style={{
                            padding: isLargeScreen ? '6px' : (isMediumScreen ? '4px' : '3px'),
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            backgroundColor: 'white',
                            fontSize: isLargeScreen ? '12px' : (isMediumScreen ? '11px' : '10px'),
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            width: '100%',
                          }}
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={globalLoading ? undefined : (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handlePrevious();
                          }}
                          disabled={globalLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: globalLoading ? '#ccc' : '#666',
                            cursor: globalLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            userSelect: 'none',
                            textAlign: 'center',
                            opacity: globalLoading ? 0.5 : 1,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!globalLoading) {
                              e.target.style.backgroundColor = '#f5f5f5';
                              e.target.style.color = '#333';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#666';
                          }}
                          title="Previous"
                        >
                          ‹ Previous
                        </button>
                        <span
                          style={{
                            color: '#333',
                            fontWeight: 500,
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            textAlign: 'center',
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            flex: 1,
                            padding: '0 8px',
                          }}
                          title={getCurrentPeriodText()}
                        >
                          {getCurrentPeriodText()}
                        </span>
                        <button
                          onClick={globalLoading ? undefined : (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleNext();
                          }}
                          disabled={globalLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: globalLoading ? '#ccc' : '#666',
                            cursor: globalLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            userSelect: 'none',
                            textAlign: 'center',
                            opacity: globalLoading ? 0.5 : 1,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            padding: '2px 6px',
                            borderRadius: '2px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!globalLoading) {
                              e.target.style.backgroundColor = '#f5f5f5';
                              e.target.style.color = '#333';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#666';
                          }}
                          title="Next"
                        >
                          Next ›
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Grid>
            )}

            {/* Alerts Type dropdown – only on Alerts tab */}
            {activeTab === 'alerts' && (
              <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
                <div style={{ width: '100%', minWidth: 0, maxWidth: '100%', position: 'relative' }} ref={dropdownRef}>
                  <div
                    className="dashboard-alert-type-filter-trigger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation(); // Prevent click outside handler from firing
                      setShowDropdown(!showDropdown);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: isGoldTheme
                        ? '1px solid var(--dashboard-alert-filter-border, rgba(74, 67, 52, 0.28))'
                        : '1px solid #ccc',
                      borderRadius: '4px',
                      backgroundColor: isGoldTheme
                        ? 'var(--dashboard-alert-filter-bg, #ffffff)'
                        : 'white',
                      color: isGoldTheme
                        ? 'var(--dashboard-alert-filter-text, #2c2820)'
                        : 'inherit',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: 'inherit',
                    }}
                  >
                    <span>
                      {selectedAlertTypes.length === 0
                        ? "Alerts Type"
                        : selectedAlertTypes.length === 1
                          ? selectedAlertTypes[0]
                          : `${selectedAlertTypes.length} types selected`
                      }
                    </span>
                    <span>▼</span>
                  </div>

                  {showDropdown && (
                    <div
                      className="dashboard-alert-type-filter-menu"
                      style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      backgroundColor: isGoldTheme
                        ? 'var(--dashboard-alert-filter-menu-bg, #faf0d4)'
                        : 'white',
                      border: isGoldTheme
                        ? '1px solid var(--dashboard-alert-filter-border, rgba(74, 67, 52, 0.28))'
                        : '1px solid #ccc',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: 1002,
                      marginTop: '2px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {alertTypes.map((type) => {
                        const isChecked = selectedAlertTypes.includes(type);
                        return (
                          <div
                            key={type}
                            className="dashboard-alert-type-filter-item"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // Prevent dropdown toggle
                              handleTypeToggle(type);
                            }}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: isGoldTheme
                                ? '1px solid var(--dashboard-alert-filter-border, rgba(74, 67, 52, 0.28))'
                                : '1px solid #eee',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              backgroundColor: isChecked
                                ? (isGoldTheme
                                  ? 'var(--dashboard-alert-filter-checked-bg, #f5e8bc)'
                                  : '#e3f2fd')
                                : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => { }} // Controlled by parent click
                              style={{
                                margin: 0,
                                cursor: 'pointer',
                                transform: 'scale(1.2)'
                              }}
                            />
                            <span style={{
                              fontSize: '14px',
                              color: isGoldTheme
                                ? 'var(--dashboard-alert-filter-text, #2c2820)'
                                : '#333',
                              fontWeight: isChecked ? '600' : '400',
                            }}>
                              {type}
                            </span>
                          </div>
                        );
                      })}
                      {selectedAlertTypes.length > 0 && (
                        <div style={{
                          padding: '8px 12px',
                          borderTop: isGoldTheme
                            ? '1px solid var(--dashboard-alert-filter-border, rgba(74, 67, 52, 0.28))'
                            : '1px solid #eee',
                          backgroundColor: isGoldTheme
                            ? 'var(--dashboard-alert-filter-checked-bg, #f5e8bc)'
                            : '#f8f9fa'
                        }}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation(); // Prevent dropdown toggle
                              setSelectedAlertTypes([]);
                              setFilterKey(prev => prev + 1);

                              // Close and reopen dropdown to update the display
                              setShowDropdown(false);
                              setTimeout(() => {
                                setShowDropdown(true);
                              }, 100);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#666',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Grid>
            )}

            {/* Empty Grid container for alerts tab - same size as duration section */}
            {activeTab === 'alerts' && (
              <Grid item xs={12} sm={6} md={3} lg={3} xl={2}>
                <div style={{ width: '100%', height: '40px' }}></div>
              </Grid>
            )}

            <Grid
              item
              xs={12}
              md={6}
              lg={6}
              xl={6}
              sx={{
                mt: { xs: 1, sm: 0 },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                gap: 12,
                flexWrap: 'wrap'
              }}
            >
              {/* Tabs - hidden on Overview so widget area fills space */}
              {activeTab !== 'overview' && (
              <div
                ref={tabsContainerRef}
                role="tablist"
                aria-label="Dashboard views"
                style={{
                  display: 'inline-flex',
                  gap: 0,
                  // Previous near-black pill (theme buttonColor) - kept for quick rollback
                  // backgroundColor: buttonColor,
                  // Theme-aware pill (gold / theme 4 / default via CSS vars in ThemeContext).
                  background: 'var(--heatmap-tab-pill-bg, #3d4a5c)',
                  borderRadius: '999px',
                  padding: '4px',
                  minWidth: 0,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                  maxWidth: '100%',
                  flexWrap: 'nowrap',
                  position: 'relative',
                }}
              >
                {/* Sliding indicator pill - animates between active tabs */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 4,
                    bottom: 4,
                    left: tabIndicator.left,
                    width: tabIndicator.width,
                    backgroundColor: '#ffffff',
                    borderRadius: '999px',
                    transition: tabIndicator.ready ? 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    opacity: tabIndicator.ready ? 1 : 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
                {SHOW_OVERVIEW_TAB && (
                <button
                  ref={(el) => { tabRefs.current.overview = el }}
                  className={`nav-tab-btn${activeTab === 'overview' ? ' nav-tab-btn-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === 'overview'}
                  tabIndex={getRovingTabIndex(activeTab === 'overview')}
                  onKeyDown={handleDashboardTabKeyDown}
                  onClick={globalLoading ? undefined : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange('overview');
                  }}
                  aria-disabled={globalLoading || undefined}
                  style={{
                    padding: isLargeScreen ? '10px 30px' : (isMediumScreen ? '8px 25px' : '6px 20px'),
                    border: 'none',
                    borderRadius: '999px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'overview' ? tabActiveTextColor : tabInactiveTextColor,
                    cursor: globalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: isLargeScreen ? '14px' : (isMediumScreen ? '13px' : '12px'),
                    fontFamily: 'inherit',
                    transition: 'color 0.8s ease',
                    boxShadow: 'none',
                    opacity: globalLoading ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Overview
                </button>
                )}
                <button
                  ref={(el) => { tabRefs.current.energy = el }}
                  className={`nav-tab-btn${activeTab === 'energy' ? ' nav-tab-btn-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === 'energy'}
                  tabIndex={getRovingTabIndex(activeTab === 'energy')}
                  onKeyDown={handleDashboardTabKeyDown}
                  onClick={globalLoading ? undefined : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange('energy');
                  }}
                  aria-disabled={globalLoading || undefined}
                  style={{
                    padding: isLargeScreen ? '10px 30px' : (isMediumScreen ? '8px 25px' : '6px 20px'),
                    border: 'none',
                    borderRadius: '999px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'energy' ? tabActiveTextColor : tabInactiveTextColor,
                    cursor: globalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: isLargeScreen ? '14px' : (isMediumScreen ? '13px' : '12px'),
                    fontFamily: 'inherit',
                    transition: 'color 0.8s ease',
                    boxShadow: 'none',
                    opacity: globalLoading ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Energy
                </button>
                {false && (
                  <button
                    onClick={globalLoading ? undefined : (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTabChange('space-utilization');
                    }}
                    disabled={globalLoading}
                    style={{
                      padding: isLargeScreen ? '10px 30px' : (isMediumScreen ? '8px 25px' : '6px 20px'),
                      border: `1px solid ${buttonColor}`,
                      borderRadius: '50%',
                      backgroundColor: activeTab === 'space-utilization' ? '#fff' : buttonColor,
                      color: activeTab === 'space-utilization' ? tabActiveTextColor : tabInactiveTextColor,
                      cursor: globalLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 'bold',
                      fontSize: isLargeScreen ? '14px' : (isMediumScreen ? '13px' : '12px'),
                      fontFamily: 'inherit',
                      transition: 'all 0.2s ease',
                      boxShadow: activeTab === 'space-utilization'
                        ? `0 2px 6px ${buttonColor}33`
                        : 'none',
                      opacity: globalLoading ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {isLargeScreen ? 'Space Utilization' : (isMediumScreen ? 'Space Util' : 'Space')}
                  </button>
                )}
                <button
                  ref={(el) => { tabRefs.current.charts = el }}
                  className={`nav-tab-btn${activeTab === 'charts' ? ' nav-tab-btn-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === 'charts'}
                  tabIndex={getRovingTabIndex(activeTab === 'charts')}
                  onKeyDown={handleDashboardTabKeyDown}
                  onClick={globalLoading ? undefined : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange('charts');
                  }}
                  aria-disabled={globalLoading || undefined}
                  style={{
                    padding: isLargeScreen ? '10px 30px' : (isMediumScreen ? '8px 25px' : '6px 20px'),
                    border: 'none',
                    borderRadius: '999px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'charts' ? tabActiveTextColor : tabInactiveTextColor,
                    cursor: globalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: isLargeScreen ? '14px' : (isMediumScreen ? '13px' : '12px'),
                    fontFamily: 'inherit',
                    transition: 'color 0.8s ease',
                    boxShadow: 'none',
                    opacity: globalLoading ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  {isLargeScreen ? 'Space Utilization' : (isMediumScreen ? 'Space Util' : 'Space')}
                </button>
                <button
                  ref={(el) => { tabRefs.current.alerts = el }}
                  className={`nav-tab-btn${activeTab === 'alerts' ? ' nav-tab-btn-active' : ''}`}
                  role="tab"
                  aria-selected={activeTab === 'alerts'}
                  tabIndex={getRovingTabIndex(activeTab === 'alerts')}
                  onKeyDown={handleDashboardTabKeyDown}
                  onClick={globalLoading ? undefined : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleTabChange('alerts');
                  }}
                  aria-disabled={globalLoading || undefined}
                  style={{
                    padding: isLargeScreen ? '10px 30px' : (isMediumScreen ? '8px 25px' : '6px 20px'),
                    border: 'none',
                    borderRadius: '999px',
                    backgroundColor: 'transparent',
                    color: activeTab === 'alerts' ? tabActiveTextColor : tabInactiveTextColor,
                    cursor: globalLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    fontSize: isLargeScreen ? '14px' : (isMediumScreen ? '13px' : '12px'),
                    fontFamily: 'inherit',
                    transition: 'color 0.8s ease',
                    boxShadow: 'none',
                    opacity: globalLoading ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  Alerts
                </button>
              </div>
              )}
            </Grid>
          </Grid>

        </Box>
      </Box>

      {/* Scrollable Content Area */}
      <Box
        onClick={(e) => e.stopPropagation()}
        sx={{
          // Reduce top/bottom gap for Overview so widgets fit in one viewport
          mt: activeTab === 'overview' ? 2 : 12,
          py: activeTab === 'overview' ? 2 : 3
        }}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            width: '100%',
            maxWidth: '100%',
            mx: 'auto',
            px: { xs: 1, sm: 2, md: 3, lg: 0.5, xl: 6, '2xl': 8 },
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              backgroundColor: 'transparent',
              borderRadius: 2,
              minHeight: 400,
              width: '100%',
              maxWidth: '100%',
              position: 'relative',
              // pb: 4, // Add bottom padding to ensure content is not cut off
            }}
          >
            {/* Data Container for your next section */}
            <Box mt={activeTab === 'alerts' ? 0 : 3}>
              <DashboardContainer
                variant="advanced"
                adapter={advancedDashboardContainerAdapter}
                activeTab={activeTab}
                orchestration={orchestration}
                runtime={{
                  DashboardOverview,
                  SpaceUtilization,
                  Alerts,
                  overviewData,
                  overviewLoading,
                  overviewError,
                  handleTabChange,
                  navigate,
                  instantOccupancyCount,
                  instantOccupancyCountLoading,
                  globalLoading,
                  filterKey,
                  selectedAlertTypes,
                  focusAlertFromLocation,
                  energyLayoutAdapter: advancedEnergyLayoutAdapter,
                  energyLayoutRuntime: advancedEnergyLayoutRuntime,
                  widgetList,
                  peakMinConsumption,
                  energyConsumptionLoading,
                  energySavingsLoading,
                  peakMinConsumptionLoading,
                  savingsByStrategy,
                  totalConsumptionByGroup,
                  lightPowerDensity,
                  lightingUnit,
                  selectedDuration,
                  currentDate,
                  currentYear,
                  selectedAreas,
                  areaGroups,
                  isLargeScreen,
                  chartHeaderStyle,
                  ChartLoader,
                  transformDataForCharts,
                  metricPanelBorder,
                  widgetContextOverrides: {
                    consumption: {
                      advancedSurface: unifiedEnergyAdvancedSurface,
                      exportControl: consumptionExportControl,
                    },
                    savings: {
                      advancedSurface: unifiedEnergyAdvancedSurface,
                      exportControl: savingsExportControl,
                    },
                    savings_by_strategy: { advancedSurface: savingsByStrategyAdvancedSurface },
                    total_consumption_by_group: {
                      advancedSurface: totalConsumptionByGroupAdvancedSurface,
                      exportControl: totalConsumptionByGroupExportControl,
                    },
                    light_power_density: {},
                    peak_and_minimum_consumption: { metricPanelBorder },
                  },
                }}
              />


              {/* Show message when operator has no floors assigned */}
              {/* Only show this message after both floors and profile are loaded to prevent race condition */}
              {/* Use getAvailableFloors() instead of floors.length to properly check operator permissions */}
              {isOperator && getAvailableFloors().length === 0 && floorStatus === 'succeeded' && !dashboardLoading && !profileLoading && userProfile !== null && (
                <DashboardOperatorNoFloorsPanel />
              )}

              <DashboardErrorBanner error={dashboardError} />
            </Box>
          </Box>
        </Box>
      </Box>

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

      {/* Email Input Dialog - removed as emails are now sent directly to logged-in user */}
    </div>
  )
}

export default Dashboard