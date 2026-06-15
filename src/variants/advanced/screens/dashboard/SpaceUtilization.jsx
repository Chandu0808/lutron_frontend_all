import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Box, useTheme, useMediaQuery, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Typography, Button } from '@mui/material'
import { CARD_BACKGROUND, CARD_BORDER, CARD_SHADOW, DASHBOARD_CHART_LOADING_BG } from '../../config/themeConstants'
import {
  SpaceLayoutRenderer,
  SpaceUtilizationContainer,
  useSpaceUtilizationContainer,
  advancedSpaceContainerAdapter,
  resolveSpaceActiveTab,
  createAdvancedSpaceLayoutAdapter,
} from '../../../../shared/dashboard/space/container'
import { bindChartLoader } from '../../../../shared/dashboard/space/components'
import { SpaceErrorPanel, SpaceStatusPanel } from '../../../../shared/dashboard/space/components/status'
import SPACE_CHART_DEFAULT_COLORS from '../../../../shared/dashboard/space/constants/chartPalette'
import { SpaceChartExportMenu } from '../../../../shared/dashboard/export/components'
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
  selectCurrentDate,
  selectCurrentYear,
  selectEmailLoading,
  selectIsNavigating,
  selectGlobalLoading,
} from '../../redux/slice/dashboard/dashboardSlice'
import { fetchFloors } from '../../redux/slice/floor/floorSlice'
import { fetchEmailConfigs, getWidgetList, fetchRenameWidgets } from '../../redux/slice/settingsslice/heatmap/groupOccupancySlice'
import { fetchProfile } from '../../redux/slice/auth/userlogin'
import { selectApplicationTheme } from '../../redux/slice/theme/themeSlice'
import {
  getThemeAwareLineSeriesColor,
  getThemeAwareMetricPanelBorder,
  getThemeAwarePieColors,
  getThemeAwareStackedBarPair,
} from '../../utils/dashboardChartColors'

import {
  renderAdvancedSpaceWidgetSlot,
  createAdvancedSpaceLayoutAdapterStyles,
} from './advancedSpaceLayoutSlots'

const ChartLoader = bindChartLoader('advanced')

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
const DEFAULT_CHART_COLORS = SPACE_CHART_DEFAULT_COLORS

const SpaceUtilization = ({ title, data, isLoading = false, globalLoadingProp = false, showOnlyInstantChart = false, showChartsTab = false }) => {
  const dispatch = useDispatch()
  const theme = useTheme()
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

  const appTheme = useSelector(selectApplicationTheme)
  const themeBackground = appTheme?.application_theme?.background || '#d2c4a2'
  const chartPalette = useMemo(
    () => getThemeAwarePieColors(themeBackground, 8) || DEFAULT_CHART_COLORS,
    [themeBackground]
  )
  const occupancyLineColor = useMemo(
    () => getThemeAwareLineSeriesColor(themeBackground, 1) || '#87CEEB',
    [themeBackground]
  )
  const stackedBarColors = useMemo(() => {
    const pair = getThemeAwareStackedBarPair(themeBackground)
    return pair || { unoccupied: '#FFB3B3', occupied: '#98FB98' }
  }, [themeBackground])
  const metricPanelBorder = useMemo(
    () => getThemeAwareMetricPanelBorder(themeBackground),
    [themeBackground]
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

  const dashboardError = useSelector((state) => state.dashboard.error)
  const occupancyCountLoading = useSelector((state) => state.dashboard.occupancyCountLoading || false)
  const occupancyByGroupLoading = useSelector((state) => state.dashboard.occupancyByGroupLoading || false)
  const spaceUtilizationLoading = useSelector((state) => state.dashboard.spaceUtilizationLoading || false)
  const instantOccupancyCountLoading = useSelector((state) => state.dashboard.instantOccupancyCountLoading || false)
  const instantOccupancyCountError = useSelector((state) => state.dashboard.instantOccupancyCountError || null)
  const instantOccupancyCount = useSelector((state) => state.dashboard.instantOccupancyCount || null)

  const activeOccupancyByGroup = showChartsTab ? occupancyByGroupFromLogs : occupancyByGroup
  const activeSpaceUtilizationPerArea = showChartsTab ? spaceUtilizationPerFromLogs : spaceUtilizationPerArea

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
      occupancyLineColor,
      stackedBarColors,
      chartPalette,
      cardBackground: CARD_BACKGROUND,
      cardBorder: CARD_BORDER,
      cardShadow: CARD_SHADOW,
      metricPanelBorder,
      isLargeScreen,
      ChartLoader,
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
      showSnackbar,
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
      occupancyLineColor,
      stackedBarColors,
      chartPalette,
      metricPanelBorder,
      isLargeScreen,
    ]
  );

  const orchestration = useSpaceUtilizationContainer(
    advancedSpaceContainerAdapter,
    containerRuntime
  );

  const {
    exports: {
      showExportDropdown,
      setShowExportDropdown,
      exportLoading,
      handleExport,
    },
  } = orchestration;

  const hasApiErrors = () => {
    return (
      (activeOccupancyByGroup && activeOccupancyByGroup.status === 'error') ||
      (activeSpaceUtilizationPerArea && activeSpaceUtilizationPerArea.status === 'error')
    )
  }

  const floors = useSelector((state) => state.floor.floors)
  const floorStatus = useSelector((state) => state.floor.status)

  // Fetch floors on component mount
  useEffect(() => {
    dispatch(fetchFloors())
  }, [dispatch])

  // Fetch rename widgets when component mounts (only if not already loaded)
  useEffect(() => {
    if (!widgetList || widgetList.length === 0) {
      dispatch(fetchRenameWidgets())
    }
  }, [dispatch, widgetList])

  // Fetch user profile on component mount
  useEffect(() => {
    dispatch(fetchProfile())
  }, [dispatch])

  // Note: This component should NOT make API calls - Dashboard component handles all API calls
  // This useEffect only handles component initialization and data display
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
    }
  }, [hasInitialized]);

  const getWidgetTitle = (widgetKey, fallbackTitle) => {
    if (!widgetList?.titles) return fallbackTitle;

    const widget = widgetList.titles.find(w => w.key === widgetKey);
    return widget?.title || fallbackTitle;
  };

  const ExportDropdown = ({ isOpen, chartTitle, dropdownKey }) => (
    <SpaceChartExportMenu
      isOpen={isOpen}
      chartTitle={chartTitle}
      dropdownKey={dropdownKey}
      exportLoading={exportLoading}
      onExport={handleExport}
      innerRef={exportDropdownRef}
      shellVariant="advanced"
      isLargeScreen={isLargeScreen}
    />
  )

  const advancedSpaceLayoutAdapter = useMemo(
    () => createAdvancedSpaceLayoutAdapter(createAdvancedSpaceLayoutAdapterStyles()),
    []
  );

  const spaceLayoutRuntime = useMemo(
    () => ({
      renderWidgetSlot: (slotId, meta, layoutContext) =>
        renderAdvancedSpaceWidgetSlot(slotId, meta, layoutContext, {
          chartHeaderStyle,
          isLargeScreen,
          getWidgetTitle,
          ExportDropdown,
          showExportDropdown,
          setShowExportDropdown,
        }),
    }),
    [chartHeaderStyle, isLargeScreen, showExportDropdown, setShowExportDropdown]
  );

  const containerPresentationRuntime = useMemo(
    () => ({
      SpaceLayoutRenderer,
      layoutAdapter: advancedSpaceLayoutAdapter,
      layoutRuntime: spaceLayoutRuntime,
    }),
    [advancedSpaceLayoutAdapter, spaceLayoutRuntime]
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
        maxWidth: '100%'
      }}>
      {/* Error Display */}
      <SpaceErrorPanel message={dashboardError} shellVariant="advanced" />

      {/* API Error Display */}
      {hasApiErrors() && (
        <SpaceStatusPanel
          tone="warning"
          shellVariant="advanced"
          title="Some data endpoints are experiencing issues"
          subtitle="Some charts may display limited or no data. Please try again later."
        />
      )}

      {(showChartsTab || (!showChartsTab && !showOnlyInstantChart)) && (
        <SpaceUtilizationContainer
          variant="advanced"
          adapter={advancedSpaceContainerAdapter}
          activeTab={resolveSpaceActiveTab({ showChartsTab })}
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
