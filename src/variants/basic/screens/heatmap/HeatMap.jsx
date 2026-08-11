import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  dispatchFetchFloorsOnce,
  dispatchFetchApplicationThemeOnce,
  dispatchFetchHeatMapThemeOnce,
} from "../../../../shared/utils/bootstrapFetchGuards";
import { createSingleFlight } from "../../../../shared/utils/createSingleFlight";
import {
  Box,
  CircularProgress,
  IconButton,
  Typography,
  Slider,
  Badge,
  Button,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { Document, Page } from "react-pdf";
import { configurePdfJsWorker, buildPdfDocumentFile } from "../../../../shared/pdf/floorPlanPdf";
import { getPolygonRings, flattenAreaCoords } from '../../utils/floorplanCoordinates';
import {
  fetchFloorMapData,
  fetchAreaOccupancyStatus,
  fetchAreaEnergyConsumption,
  selectPdfUrl,
  selectHeatmapData,
  selectSelectedFloorId,
  selectDisplayMode,
  setSelectedFloorId,
  fetchAreaStatus,
  selectAreaStatus,
  selectAreaStatusLoading,
  selectAreaStatusError,
  selectAreaStatusFetchingId,
  updateAreaLightStatus,
  updateZonesByArea,
  toggleAllZonesInArea,
  updateAreaScene,
  renameArea,
  refreshAllHeatmapData,
  selectHeatmapLoading,
  selectHeatmapError,
  optimisticallyUpdateAreaStatus,
  selectHeatmapSearchTerm, // added
} from '../../redux/slice/settingsslice/heatmap/HeatmapSlice';
import { fetchActiveAlerts, selectAlerts } from '../../redux/slice/dashboard/alertsSlice';
import { fetchSceneStatus } from '../../redux/slice/settingsslice/heatmap/areaSettingsSlice';
import { fetchFloors, selectFloors } from "../../redux/slice/floor/floorSlice";
import { BaseUrl } from '../../BaseUrl'
import CloseIcon from "@mui/icons-material/Close";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import Switch from "@mui/material/Switch";
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { fetchProcessors } from '../../redux/slice/processor/processorSlice';

import AreaSettingsDialog, {
  ASD_APPLY_BTN_SX,
  ASD_DIALOG_TITLE_SX,
  ASD_OUTLINED_FIELD_SX,
  ASD_SETTINGS_FORM_CANCEL_BTN_SX,
} from '../heatmap/AreaSettingsDialog';
import { HeatmapFooterActions } from './HeatmapControls';

import { fetchApplicationTheme, fetchHeatMapTheme, selectApplicationTheme, selectHeatMapTheme } from "../../redux/slice/theme/themeSlice";
import { isLightSurface, isWhiteAreaPickerChrome, onContentColors } from "../../utils/themeOnSurface";
//import SearchComponent from "../../layouts/SearchComponent"; // adjust path as needed

import { UseAuth } from '../../customhooks/UseAuth'; // Add this import

import { interpolateHexColor, arraylargest } from '../../utils/colorScale';
import FOFPOverlay, { FOFPOverlayBoundary } from './FOFPOverlay';
import {
  findFofpZoneIndexInPanelList,
  isFofpZonePanelHighlighted,
} from './fofpZoneInteraction';
import { fetchFofpConfig, selectFofpConfig } from '../../redux/slice/fofp/fofpSlice';
import {
  getLightLevelFillColor,
  resolveLightModeFill,
} from './heatmapLightStyles';
import { isMapProcessorUnreachable } from '../../../../shared/heatmap/processorReachable';
import {
  ZONE_CONTROL_CARD_WIDTH_SX,
  ZONE_CONTROL_SLIDER_WRAP_SX,
  HEATMAP_STATUS_PANEL_OVERFLOW_SX,
  HEATMAP_SIDEBAR_STICKY_HEADER_SX,
  HEATMAP_SIDEBAR_MAIN_SCROLL_SX,
  HEATMAP_ZONES_SECTION_SX,
  HEATMAP_ZONES_LIST_SCROLL_SX,
  HEATMAP_ZONES_LIST_PAGINATED_SX,
} from './zoneControlCardLayout';
import { normalizeHeatmapColor } from '../../../../shared/utils/normalizeHeatmapColor';
import { buildBasicShadeSectionTheme } from './shadeControlTheme';
import {
  buildShadesUpdatePayload,
  formatSidebarEnergyWatts,
  parseShadeLevel,
  resolveShadeZoneId,
} from '../../../../utils/heatmapSidebarUtils';
import HeatmapShadesPanel from '../../../../components/heatmap/HeatmapShadesPanel';


const normalizeZoneType = (type) =>
  (type ?? "")
    .toString()
    .trim()
    .toLowerCase()
    // backend may return `white tune`, `white_tune`, `white-tune`, etc.
    .replace(/[\s_-]/g, "");

const isWhitening = (type) => ["whitening", "whitetune"].includes(normalizeZoneType(type));
const isDimmed = (type) => normalizeZoneType(type) === "dimmed";
const isSwitched = (type) => normalizeZoneType(type) === "switched";

/** Sidebar zone list: always paginate 2 zones per page when more are available. */
const SIDEBAR_ZONES_PER_PAGE = 2;

const buildSidebarZonesToShow = (zones) => {
  const list = zones || [];
  const whiteTuneZones = list.filter((z) => isWhitening(z.type));
  const dimmedZones = list.filter((z) => isDimmed(z.type));
  const switchedZones = list.filter((z) => isSwitched(z.type));
  return [...whiteTuneZones, ...dimmedZones, ...switchedZones];
};


// Add the missing TOP_PADDING constant
const TOP_PADDING = 60; // Adjust this value based on your header height

configurePdfJsWorker();


function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

const HeatMap = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();


  const theme = useTheme();

  // Get current user role and permissions
  const { role: currentUserRole } = UseAuth();

  // Get user profile from Redux state
  const userProfile = useSelector(state => state.user.profile);

  const pdfUrl = useSelector(selectPdfUrl);
  const heatmapData = useSelector(selectHeatmapData);
  const selectedFloorId = useSelector(selectSelectedFloorId);
  const displayMode = useSelector(selectDisplayMode);
  const floors = useSelector(selectFloors);
  const areaStatus = useSelector(selectAreaStatus);
  const areaStatusLoading = useSelector(selectAreaStatusLoading);
  const areaStatusError = useSelector(selectAreaStatusError);
  const areaStatusFetchingId = useSelector(selectAreaStatusFetchingId);
  const heatmapLoading = useSelector(selectHeatmapLoading);
  const heatmapError = useSelector(selectHeatmapError);
  const searchTerm = useSelector(selectHeatmapSearchTerm); // added
  const activeAlerts = useSelector(selectAlerts); // added for alert indicators

  // Function to check if user can access a specific floor
  const canAccessFloor = (floorId) => {
    // Superadmin and Admin can access all floors
    if (currentUserRole === 'Superadmin' || currentUserRole === 'Admin') {
      return true;
    }

    // For Operators, check if they have access to this floor
    if (currentUserRole === 'Operator' && userProfile && userProfile.floors) {
      return userProfile.floors.some(f => f.floor_id === floorId);
    }

    // Default: can access
    return true;
  };

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

  // Function to check if user can update area status (scenes, zones, shades)
  const canUpdateAreaStatus = () => {
    // Superadmin and Admin can always update area status
    if (currentUserRole === 'Superadmin' || currentUserRole === 'Admin') {
      return true;
    }

    // For Operators, check if they have the required permissions for the current floor
    if (currentUserRole === 'Operator' && selectedFloorId && userProfile && userProfile.floors) {
      const currentFloorPermission = userProfile.floors.find(f => f.floor_id === selectedFloorId);

      if (currentFloorPermission) {
        const permission = currentFloorPermission.floor_permission;
        // Allow updates for both "monitor_control" (Monitoring and Control) AND "monitor_control_edit" (Monitoring, Control and Edit)
        // NOT for "monitor" (Monitoring only)
        return permission === 'monitor_control' || permission === 'monitor_control_edit';
      }
    }

    // Default: Operators cannot update area status
    return false;
  };

  // Function to check if user can modify device lock and occupancy settings
  const canModifyDeviceSettings = () => {
    // Superadmin and Admin can always modify device settings
    if (currentUserRole === 'Superadmin' || currentUserRole === 'Admin') {
      return true;
    }

    // For Operators, check if they have the required permissions for the current floor
    if (currentUserRole === 'Operator' && selectedFloorId && userProfile && userProfile.floors) {
      const currentFloorPermission = userProfile.floors.find(f => f.floor_id === selectedFloorId);

      if (currentFloorPermission) {
        const permission = currentFloorPermission.floor_permission;
        // Allow modifications for "monitor_control" (Monitoring and Control) AND "monitor_control_edit" (Monitoring, Control and Edit)
        // NOT for "monitoring" (Monitoring only)
        return permission === 'monitor_control' || permission === 'monitor_control_edit';
      }
    }

    // Default: Operators cannot modify device settings
    return false;
  };

  // Function to check if user can edit scenes
  const canEditScene = () => {
    // Superadmin and Admin can always edit scenes
    if (currentUserRole === 'Superadmin' || currentUserRole === 'Admin') {
      return true;
    }

    // For Operators, check if they have the required permissions for the current floor
    if (currentUserRole === 'Operator' && selectedFloorId && userProfile && userProfile.floors) {
      const currentFloorPermission = userProfile.floors.find(f => f.floor_id === selectedFloorId);

      if (currentFloorPermission) {
        const permission = currentFloorPermission.floor_permission;
        // Only allow scene editing for "monitor_control_edit" (Monitoring, Control and Edit)
        // NOT for "monitor_control" (Monitoring and Control only)
        return permission === 'monitor_control_edit';
      }
    }

    // Default: Operators cannot edit scenes
    return false;
  };

  // Function to check if user can view area settings (even if they can't modify them)
  const canViewAreaSettings = () => {
    // All authenticated users can view area settings
    // This includes Superadmin, Admin, and all Operators regardless of floor permissions
    return true;
  };

  const canRenameArea = () =>
    currentUserRole === "Superadmin" || currentUserRole === "Admin";

  // Responsive breakpoints - optimized for better coverage including ultra-wide screens
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // < 600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600px - 900px
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // >= 900px
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg')); // >= 1200px
  const is1440Screen = useMediaQuery('(min-width:1440px)'); // >= 1440px
  const isUltraWide = useMediaQuery(theme.breakpoints.up('xl')); // >= 1920px
  const is2560Screen = useMediaQuery('(min-width:2560px)'); // >= 2560px

  // A4 dimensions in pixels (at 96 DPI) - fallback values
  const A4_WIDTH = 794;  // 8.27 inches * 96 DPI
  const A4_HEIGHT = 1123; // 11.69 inches * 96 DPI

  const [scale, setScale] = useState(1.0); // Default scale - will be set to fit window
  const [hasFit, setHasFit] = useState(false);
  const containerRef = useRef();

  // Measure the actual PDF viewport element (client box = drawable area).
  const getContainerDimensions = () => {
    if (!containerRef.current) return { width: 0, height: 0 };

    const container = containerRef.current;
    const width = container.clientWidth || container.offsetWidth || 0;
    const height = container.clientHeight || container.offsetHeight || 0;

    if (!width || !height) {
      const parent = container.parentElement;
      if (parent) {
        return {
          width: Math.max(parent.clientWidth || 300, 300),
          height: Math.max(parent.clientHeight || 200, 200),
        };
      }
    }

    const result = {
      width: Math.max(width, 300),
      height: Math.max(height, 200),
    };

    return result;
  };
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  /** FOFP marker selection for sidebar zone highlight (zoneName matches panel zones). */
  const [highlightedFofpZone, setHighlightedFofpZone] = useState(null);
  const fofpConfigFromStore = useSelector(selectFofpConfig);
  const [scenePage, setScenePage] = useState(0);
  const SCENES_PER_PAGE = isMobile ? 6 : isTablet ? 8 : 9;
  const [lightOn, setLightOn] = useState(areaStatus && areaStatus.light_status === "On");
  const [shadesGroups, setShadesGroups] = useState([
    { name: "Group 1", value: 50 },
    { name: "Group 2", value: 50 },
    { name: "Group 3", value: 50 },
  ]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [zonePage, setZonePage] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [zoneLocalValues, setZoneLocalValues] = React.useState({});
  const [zoneUpdating, setZoneUpdating] = React.useState(false);
  const [mainToggleUpdating, setMainToggleUpdating] = useState(false);
  const [lastOccupancyStatus, setLastOccupancyStatus] = useState({});
  const [lastEnergyStatus, setLastEnergyStatus] = useState({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [areaRenameOpen, setAreaRenameOpen] = useState(false);
  const [areaRenameValue, setAreaRenameValue] = useState("");
  const [areaRenameError, setAreaRenameError] = useState("");
  const [areaRenameSaving, setAreaRenameSaving] = useState(false);
  const [shadesLocalValues, setShadesLocalValues] = useState({});
  const [shadesUpdating, setShadesUpdating] = useState(false);

  useEffect(() => {
    setAreaRenameOpen(false);
    setAreaRenameError("");
  }, [selectedAreaId]);

  const closeAreaPanel = () => {
    setSelectedAreaId(null);
    setHighlightedFofpZone(null);
  };
  const [fitScale, setFitScale] = useState(1.0); // Default fit scale - will be calculated
  const [filteredAreas, setFilteredAreas] = useState(heatmapData.areas || []);

  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || '#ffffff';
  const contentColor = appTheme?.application_theme?.content || '#f5f5f5';
  const buttonColor = appTheme?.application_theme?.button || '#232323'
  const whiteChrome = isWhiteAreaPickerChrome(contentColor);
  const settingsFormActionBlue = whiteChrome ? '#1565C0' : buttonColor;
  const shadeSectionTheme = useMemo(
    () =>
      buildBasicShadeSectionTheme({
        whiteChrome,
        buttonColor,
        contentColor,
        settingsFormActionBlue,
      }),
    [whiteChrome, buttonColor, contentColor, settingsFormActionBlue]
  );

  const [refreshing, setRefreshing] = useState(false);
  const layoutRef = useRef(null);
  const [availableHeight, setAvailableHeight] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // added: pan state for dragging
  const [highlightedAreaId, setHighlightedAreaId] = useState(null); // added: popup highlight target
  const [isDragging, setIsDragging] = useState(false); // added: drag state
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // added: drag start position
  const [searchBounceAnimation, setSearchBounceAnimation] = useState(false); // added: search bounce animation

  // Add a loading state for the PDF
  const [pdfLoading, setPdfLoading] = useState(false);
  // Bounding box of all areas (used to crop PDF whitespace)
  const [contentBBox, setContentBBox] = useState(null);
  // Track when the PDF page dimensions are actually loaded
  const [pdfLoaded, setPdfLoaded] = useState(false);
  // Boundary values for zoom fit-to-window
  const [boundaryValues, setBoundaryValues] = useState(null);

  const [pageDims, setPageDims] = useState(null);

  // Reset PDF layout when floor plan file changes so fit uses correct page size.
  useEffect(() => {
    setPageDims(null);
    setPdfLoaded(false);
    setPan({ x: 0, y: 0 });
    setHasFit(false);
    setContentBBox(null);
  }, [pdfUrl]);

  // Ensure floors are loaded (once-guarded)
  useEffect(() => {
    dispatchFetchFloorsOnce(dispatch, fetchFloors, Boolean(floors?.length));
  }, [dispatch, floors?.length]);

  // Fetch active alerts on component mount
  useEffect(() => {
    dispatch(fetchActiveAlerts()).then(() => {
    });
  }, [dispatch]);

  // Component mount handling
  useEffect(() => {
    // Component mounted
  }, []);

  // Note: Floor selection initialization is handled by HeatmapControls.jsx
  // to prevent conflicts and infinite loops between components

  // Initial fit when component mounts to ensure proper coverage
  useEffect(() => {
    // Only attempt to fit if we have pageDims (PDF has loaded)
    if (!pageDims) return;

    const initialFit = () => {
      if (containerRef.current && pageDims) {
        applyFitToScreen({ force: true });
      }
    };

    // Try to fit after a short delay to ensure everything is rendered
    const timeoutId = setTimeout(initialFit, 100);

    // Fallback fit attempt if the first one doesn't work
    const fallbackTimeoutId = setTimeout(() => {
      if (!hasFit && containerRef.current && pageDims) {
        applyFitToScreen({ force: true });
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(fallbackTimeoutId);
    };
  }, [pageDims, hasFit, boundaryValues, isMobile, isTablet, is2560Screen, is1440Screen]); // Added dependencies for consistent scale calculation

  // Removed unused constants for better space utilization

  // Responsive zones per page based on screen size
  const getZonesPerPage = () => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    if (isLargeScreen) return 3;
    if (isUltraWide) return 4;
    if (is2560Screen) return 5;
    return 2; // Default for desktop
  };

  const ZONES_PER_PAGE = getZonesPerPage();

  const shades = areaStatus?.zones?.filter(z => (z.type || '').toLowerCase() === 'shade') || [];

  //heatmap api calling
  const heatMapTheme = useSelector(selectHeatMapTheme);
  const lightColor = normalizeHeatmapColor(heatMapTheme?.application_theme?.light || '#f2ff00');
  const occupancyColor = normalizeHeatmapColor(heatMapTheme?.application_theme?.occupancy || '#ea3ebf');
  const energyBaseColor = normalizeHeatmapColor(heatMapTheme?.application_theme?.energy || '#a71ee6');

  // Monitor theme changes
  useEffect(() => {
    // Theme change handling
  }, [heatMapTheme, lightColor, occupancyColor, energyBaseColor]);
  useEffect(() => {
    dispatchFetchHeatMapThemeOnce(dispatch, fetchHeatMapTheme);
    dispatchFetchApplicationThemeOnce(dispatch, fetchApplicationTheme);
  }, [dispatch]);

  const lastFloorMapFloorIdRef = useRef(null);
  const displayModeRef = useRef(displayMode);
  displayModeRef.current = displayMode;
  const prevDisplayModeRef = useRef(displayMode);
  const lastAreaStatusSnapshotRef = useRef({
    areaId: null,
    light: null,
    occ: null,
    scene: null,
  });

  const applyButtonSx = {
    background: whiteChrome ? settingsFormActionBlue : '#222',
    color: '#fff',
    borderRadius: 2,
    fontSize: { xs: 10, sm: 11, md: 12 },
    fontWeight: 400,
    px: { xs: 1.5, md: 2 },
    py: { xs: 0.3, md: 0.5 },
    minWidth: { xs: 50, md: 60 },
    minHeight: { xs: 22, md: 25 },
    alignSelf: 'flex-end',
    mb: 1,
    textTransform: 'none',
    boxShadow: 1,
    '&:hover': { background: whiteChrome ? settingsFormActionBlue : '#111' },
  };

  const scaledWidth = (pageDims?.width || A4_WIDTH) * scale;
  const scaledHeight = (pageDims?.height || A4_HEIGHT) * scale;
  const MIN_SCALE = 0.2;
  // Dynamic MAX_SCALE based on screen size for better ultra-wide support
  const MAX_SCALE = is2560Screen ? 4.0 : isUltraWide ? 3.0 : 2.0;
  const SCALE_STEP = 0.05;
  // Add extra zoom out capability for tablets and ultra-wide screens
  const MIN_SCALE_TABLET = isTablet ? 0.1 : is2560Screen ? 0.05 : 0.2;

  // Keep a small gap above the PDF so it never clips
  const TOP_PADDING = isMobile ? 6 : isTablet ? 8 : is2560Screen ? 15 : 10;

  // Dynamic max scale: how big we can render without cropping the container
  const getDynamicMaxScale = () => {
    const { width: cw, height: ch } = getContainerDimensions();
    if (!cw || !ch) return MAX_SCALE;
    const viewW = pageDims?.width || A4_WIDTH;
    const viewH = pageDims?.height || A4_HEIGHT;
    const sw = cw / viewW;
    const sh = ch / viewH;
    return Math.max(sw, sh) + 0.01;
  };

  // Effect A — floor change only (do not re-hit light_status on mode switch).
  // After map areas load, fetch occupancy/energy so they merge into the new floor
  // (avoids racing energy_status vs light_status and wiping energy colors).
  useEffect(() => {
    if (!selectedFloorId) return;
    if (lastFloorMapFloorIdRef.current === selectedFloorId) return;
    lastFloorMapFloorIdRef.current = selectedFloorId;
    lastAreaStatusSnapshotRef.current = {
      areaId: null,
      light: null,
      occ: null,
      scene: null,
    };

    const floorIdForRequest = selectedFloorId;

    setPdfLoaded(false);
    setPdfLoading(true);
    setFilteredAreas([]);
    setHasFit(false);

    dispatch(fetchFloorMapData({ floorId: floorIdForRequest }))
      .then((action) => {
        if (lastFloorMapFloorIdRef.current !== floorIdForRequest) return;

        const bv = action?.payload?.boundary_values;
        if (action?.meta?.requestStatus === 'fulfilled' && bv) {
          setBoundaryValues(bv);
        } else {
          setBoundaryValues(null);
        }
        setPdfLoading(false);

        if (action?.meta?.requestStatus !== 'fulfilled') return;
        const mode = displayModeRef.current;
        if (mode === 'Occupancy') {
          dispatch(fetchAreaOccupancyStatus({ floorId: floorIdForRequest }));
        } else if (mode === 'Energy') {
          dispatch(fetchAreaEnergyConsumption({ floorId: floorIdForRequest }));
        }
      })
      .catch(() => {
        if (lastFloorMapFloorIdRef.current === floorIdForRequest) {
          setPdfLoading(false);
        }
      });
  }, [dispatch, selectedFloorId]);

  // Effect B — mode switch only (floor changes are handled by Effect A after map load)
  useEffect(() => {
    if (!selectedFloorId) return;
    if (prevDisplayModeRef.current === displayMode) return;
    prevDisplayModeRef.current = displayMode;
    if (displayMode === 'Occupancy') {
      dispatch(fetchAreaOccupancyStatus({ floorId: selectedFloorId }));
    } else if (displayMode === 'Energy') {
      dispatch(fetchAreaEnergyConsumption({ floorId: selectedFloorId }));
    }
  }, [dispatch, selectedFloorId, displayMode]);

  // Sidebar / heatmap column height = remaining viewport below this layout
  // (do not subtract header again; `top` already accounts for it).
  // Reserve space so the bottom legend bar ("Light: …", Create Area Group) stays visible above the app footer.
  useEffect(() => {
    const recalc = () => {
      if (!layoutRef.current) return;
      const top = layoutRef.current.getBoundingClientRect().top;
      const footerReserve = 36;
      const h = Math.max(240, Math.floor(window.innerHeight - top - footerReserve));
      setAvailableHeight(h);
    };
    recalc();
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, []);

  // Keep map fitted to container on window resize with optimized timing
  useEffect(() => {
    const onResize = () => {
      setHasFit(false);
      // Use different timing for different screen sizes to ensure proper fitting
      const timeout = isMobile ? 100 : isTablet ? 75 : is2560Screen ? 25 : 50;
      setTimeout(() => {
        applyFitToScreen({ force: true });
      }, timeout);
    };

    // Debounced resize handler for better performance
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(onResize, 100);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [isMobile, isTablet, is2560Screen, boundaryValues, pageDims]);

  // Re-fit map when available space changes (but NOT when area is selected)
  useEffect(() => {
    if (pageDims) { // Only re-fit if PDF is loaded
      setHasFit(false);
      // Use responsive timing for better fitting across different screen sizes
      const timeout = isMobile ? 100 : isTablet ? 75 : is2560Screen ? 25 : 50;
      const timeoutId = setTimeout(() => {
        applyFitToScreen({ force: true });
      }, timeout);
      return () => clearTimeout(timeoutId);
    }
  }, [availableHeight, isMobile, isTablet, is2560Screen, pageDims, boundaryValues]); // Added boundaryValues dependency

  useEffect(() => {
    if (!pdfLoaded || !pageDims) return;
    setHasFit(false);
    const timeout = isMobile ? 100 : isTablet ? 75 : is2560Screen ? 25 : 50;
    const timeoutId = setTimeout(() => {
      applyFitToScreen({ force: true });
    }, timeout);
    return () => clearTimeout(timeoutId);
  }, [pdfLoaded, pageDims, availableHeight, isMobile, isTablet, is2560Screen, boundaryValues]); // Added boundaryValues dependency

  // Trigger fit when pageDims change (PDF loads)
  useEffect(() => {
    if (pageDims && !hasFit) {
      // Small delay to ensure container is ready
      const timeoutId = setTimeout(() => {
        if (containerRef.current) {
          applyFitToScreen({ force: true });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [pageDims, hasFit, boundaryValues, isMobile, isTablet, is2560Screen, is1440Screen]);

  // Fallback: ensure fit happens even if other mechanisms fail
  useEffect(() => {
    if (pageDims && !hasFit && containerRef.current) {
      const timeoutId = setTimeout(() => {
        if (!hasFit && containerRef.current) {
          applyFitToScreen({ force: true });
        }
      }, 1000); // 1 second delay as last resort
      return () => clearTimeout(timeoutId);
    }
  }, [pageDims, hasFit, boundaryValues, isMobile, isTablet, is2560Screen, is1440Screen]);

  // Auto zoom out when area is clicked to fit entire floor plan to screen
  const [previousSelectedAreaId, setPreviousSelectedAreaId] = useState(null);
  const [defaultFitScale, setDefaultFitScale] = useState(1); // Store the default fit scale

  // Calculate consistent scale for all scenarios (default, fit-to-window, tab changes, area clicks)
  const calculateConsistentScale = () => {
    const { width: cw, height: ch } = getContainerDimensions();
    if (!cw || !ch || !pageDims) return 1.0;

    // Priority: content bounding box (real areas) > backend boundary values > full PDF page.
    let viewW, viewH;

    const hasValidContentBBox =
      contentBBox &&
      Number.isFinite(contentBBox.width) &&
      Number.isFinite(contentBBox.height) &&
      contentBBox.width > 0 &&
      contentBBox.height > 0;

    const hasValidBoundary =
      boundaryValues &&
      Number.isFinite(Number(boundaryValues.x_left)) &&
      Number.isFinite(Number(boundaryValues.x_right)) &&
      Number.isFinite(Number(boundaryValues.y_top)) &&
      Number.isFinite(Number(boundaryValues.y_bottom)) &&
      Number(boundaryValues.x_right) > Number(boundaryValues.x_left) &&
      Number(boundaryValues.y_bottom) > Number(boundaryValues.y_top);

    viewW = pageDims.width;
    viewH = pageDims.height;

    if (!Number.isFinite(viewW) || !Number.isFinite(viewH) || viewW <= 0 || viewH <= 0) {
      viewW = pageDims.width;
      viewH = pageDims.height;
    }

    // Calculate scale ratios
    const scaleX = cw / viewW;
    const scaleY = ch / viewH;

    let fitScale;

    // Use consistent fit logic for all scenarios
    if (isMobile || isTablet) {
      // Mobile/tablet: fit within container with minimal margin
      const marginFactor = isMobile ? 0.95 : 0.96;
      fitScale = Math.min(scaleX, scaleY) * marginFactor;
    } else {
      // Desktop and large screens: fit to window with proper margins
      const marginFactor = is2560Screen ? 0.97 : is1440Screen ? 0.97 : 0.98;
      fitScale = Math.min(scaleX, scaleY) * marginFactor;
    }

    // Ensure minimum scale
    fitScale = Number.isFinite(fitScale) ? Math.max(0.1, fitScale) : 1.0;

    return fitScale;
  };

  const calculateFitPan = () => ({ x: 0, y: 0 });

  const isAtFitView = () => {
    const scaleClose = Math.abs(scale - fitScale) < 0.001;
    const panClose = Math.abs(pan.x) < 0.5 && Math.abs(pan.y) < 0.5;
    return scaleClose && panClose;
  };

  // force=true: Fit button, floor change, window resize, area panel open/close.
  // force=false: background observers — skip if user has zoomed/panned away from fit.
  const applyFitToScreen = ({ force = false } = {}) => {
    if (!pageDims || !containerRef.current) return;
    if (!force && hasFit && !isAtFitView()) return;

    const consistentScale = calculateConsistentScale();
    const fitPan = calculateFitPan();
    setFitScale(consistentScale);
    setScale(consistentScale);
    setPan(fitPan);
    setHasFit(true);
    setDefaultFitScale(consistentScale);
  };


  useEffect(() => {
    if (!containerRef.current || !pageDims || typeof ResizeObserver === 'undefined') return;

    let timeoutId;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        applyFitToScreen({ force: false });
      }, 75);
    });

    observer.observe(containerRef.current);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [pageDims, boundaryValues, contentBBox, availableHeight, isMobile, isTablet, is2560Screen, is1440Screen]);

  useEffect(() => {
    if (!pageDims || !contentBBox || contentBBox.width <= 0 || contentBBox.height <= 0) return;
    if (hasFit) return;
    const timeoutId = setTimeout(() => {
      applyFitToScreen({ force: true });
    }, 50);
    return () => clearTimeout(timeoutId);
  }, [contentBBox, pageDims, hasFit]);

  useEffect(() => {
    if (pageDims && containerRef.current) {
      // When an area is clicked (selected), use the same consistent scale
      if (selectedAreaId && selectedAreaId !== previousSelectedAreaId) {
        applyFitToScreen({ force: true });
      }

      // Update the previous selected area ID
      setPreviousSelectedAreaId(selectedAreaId);
    }
  }, [selectedAreaId, pageDims, isMobile, isTablet, is2560Screen, is1440Screen, boundaryValues]); // Added boundaryValues dependency

  // Return to default fit when status panel is closed
  useEffect(() => {
    if (pageDims && containerRef.current && !selectedAreaId && previousSelectedAreaId) {
      // Status panel was closed, return to default fit-to-window
      applyFitToScreen({ force: true });
    }
  }, [selectedAreaId, previousSelectedAreaId, pageDims, boundaryValues, isMobile, isTablet, is2560Screen, is1440Screen]);

  useEffect(() => {
    if (heatmapData.areas) {
      setLastOccupancyStatus(prev => {
        const updated = { ...prev };
        heatmapData.areas.forEach(area => {
          const occ = (area.occupancy_status || '').toLowerCase();
          if (occ === 'occupied' || occ === 'unoccupied') {
            updated[area.area_id || area.id] = occ;
          }
        });
        return updated;
      });
    }
  }, [heatmapData.areas]);

  useEffect(() => {
    if (heatmapData.areas) {
      setLastEnergyStatus(prev => {
        const updated = { ...prev };
        heatmapData.areas.forEach(area => {
          const power = area.energy_status;
          if (power !== null && power !== undefined && power !== 'Unknown') {
            updated[area.area_id || area.id] = power;
          }
        });
        return updated;
      });
    }
  }, [heatmapData.areas]);
  useEffect(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q || !heatmapData?.areas?.length) {
      setHighlightedAreaId(null);
      return;
    }

    // Enhanced search function - search by short name, full name, or OS number
    const searchArea = (area) => {
      const fullName = (area.name || area.area_name || '').toLowerCase();
      const areaCode = (area.code || '').toLowerCase();
      const areaId = (area.area_id || area.id || '').toString().toLowerCase();

      // Extract OS number from full name (e.g., "PERIYAR 03-22" -> "03-22")
      const osMatch = fullName.match(/(\d+-\d+)/);
      const osNumber = osMatch ? osMatch[1] : '';

      // Extract short name (e.g., "PERIYAR 03-22" -> "periyar")
      const shortName = fullName.split(' ')[0] || '';

      // Search patterns:
      // 1. Full name contains search term
      // 2. Short name contains search term
      // 3. OS number contains search term
      // 4. Area code contains search term
      // 5. Area ID contains search term
      return fullName.includes(q) ||
        shortName.includes(q) ||
        osNumber.includes(q) ||
        areaCode.includes(q) ||
        areaId.includes(q);
    };

    // Find all matching areas
    const matches = heatmapData.areas.filter(searchArea);

    if (matches.length === 0) {
      setHighlightedAreaId(null);
      return;
    }

    // Highlight the first matching area
    const match = matches[0];

    const flatCoords = flattenAreaCoords(match);
    const hasCoords = Array.isArray(flatCoords) && flatCoords.some(pt => typeof pt?.x === 'number' && typeof pt?.y === 'number');
    if (!hasCoords) {
      setHighlightedAreaId(null);
      return;
    }
    setHighlightedAreaId(match.area_id || match.id || null);

    // Trigger continuous bounce animation for searched areas
    if (matches.length > 0) {
      setSearchBounceAnimation(true);
    } else {
      setSearchBounceAnimation(false);
    }
  }, [searchTerm, heatmapData.areas]);

  // Update filtered areas when heatmap data changes - always show all areas
  useEffect(() => {
    if (heatmapData.areas) {
      setFilteredAreas(heatmapData.areas);
    }
  }, [heatmapData.areas]);

  useEffect(() => {
    if (areaStatus && areaStatus.zones) {
      // Check for duplicate zone IDs (should not happen, but safeguard)
      const zoneIds = areaStatus.zones.map(z => z.id);
      const duplicateIds = zoneIds.filter((id, index) => zoneIds.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.warn('Warning: Duplicate zone IDs detected:', duplicateIds);
      }

      setZoneLocalValues(prev => {
        const updated = { ...prev };
        areaStatus.zones.forEach(zone => {
          // Ensure zone.id exists and is valid
          if (!zone.id) {
            console.warn('Warning: Zone missing ID:', zone);
            return; // Skip zones without IDs
          }

          if (isSwitched(zone.type)) {
            updated[zone.id] = {
              on_off: (zone.status || zone.on_off || 'Off'),
            };
          } else {
            let backendBrightness = 0;
            if (typeof zone.brightness === 'string') {
              backendBrightness = parseInt(zone.brightness);
            } else if (typeof zone.brightness === 'number') {
              backendBrightness = zone.brightness;
            }

            let backendCct = 0;
            if (zone.cct) {
              backendCct = typeof zone.cct === 'string' ? parseInt(zone.cct) : zone.cct;
            } else if (zone.temperature) {
              backendCct = typeof zone.temperature === 'string' ? parseInt(zone.temperature) : zone.temperature;
            } else if (zone.color_temp) {
              backendCct = typeof zone.color_temp === 'string' ? parseInt(zone.color_temp) : zone.color_temp;
            } else {
              backendCct = 2700;
            }

            // CRITICAL: Preserve existing fade/delay times from local state
            // areaStatus.zones typically doesn't include fade_time/delay_time (they come from scene)
            // We will fetch scene details below if there's an active scene to get the correct fade/delay times
            // For now, preserve existing values or use defaults, but they will be updated from scene if active scene exists
            const existingValues = prev[zone.id] || {};

            // If there's an active scene, we'll fetch its details below to get fade/delay times
            // So we can use defaults here, but they'll be overwritten by scene values
            // If no active scene, preserve existing values or use defaults
            updated[zone.id] = {
              brightness: backendBrightness,
              cct: backendCct,
              // Preserve existing fade/delay times if they exist (from previous scene or user edits)
              // Otherwise use zone.fade_time/delay_time if available, or defaults
              // NOTE: These will be updated from active scene details below if active scene exists
              fadeTime: existingValues.fadeTime || (zone.fade_time ? String(zone.fade_time).padStart(2, '0') : '02'),
              delayTime: existingValues.delayTime || (zone.delay_time ? String(zone.delay_time).padStart(2, '0') : '00'),
            };
          }
        });
        return updated;
      });

      // CRITICAL: If there's an active scene, fetch its details to get fade/delay times
      // This ensures fade/delay times are loaded when area status is refreshed
      // Fade/delay times are stored in the scene definition, not in area status zones
      // Skip while Area Settings is open — dialog owns scene_status for the editor.
      if (areaStatus.active_scene && areaStatus.area_id && !settingsOpen) {
        dispatch(fetchSceneStatus({
          areaId: areaStatus.area_id,
          sceneId: areaStatus.active_scene
        }))
          .unwrap()
          .then(sceneStatusResponse => {
            // The response structure: { status: "success", area_id: ..., scene_id: ..., details: [...] }
            // Redux stores details in state.sceneStatus, but unwrap() returns the full response
            const sceneDetails = sceneStatusResponse?.details || sceneStatusResponse || [];

            if (sceneDetails && Array.isArray(sceneDetails) && sceneDetails.length > 0) {
              setZoneLocalValues(prev => {
                const updated = { ...prev };

                sceneDetails.forEach(detail => {
                  const rawZoneId =
                    detail.zone_id ??
                    detail.ZoneId ??
                    detail.Zone_ID ??
                    detail.zoneID;
                  const parsedZoneId =
                    rawZoneId !== undefined && rawZoneId !== null && rawZoneId !== ''
                      ? Number(rawZoneId)
                      : NaN;
                  const hasNumericZoneId = Number.isFinite(parsedZoneId);

                  let zone = null;
                  if (hasNumericZoneId) {
                    zone = areaStatus.zones?.find((z) => Number(z.id) === parsedZoneId);
                    if (!zone) {
                      console.warn(`Zone not found by zone_id ${parsedZoneId} for scene detail:`, detail);
                    }
                  }

                  // Fallback: match by name if zone_id missing or did not match area zones
                  if (!zone && detail.zone_name) {
                    zone = areaStatus.zones?.find((z) => z.name === detail.zone_name);
                  }

                  if (zone) {
                    const zoneType = (detail.zone_type || detail.ZoneType || '').toLowerCase();
                    if (zoneType === 'dimmed' || zoneType === 'whitetune') {
                      // CRITICAL: Update fade/delay times from scene (these are the source of truth)
                      // Always use scene values - these are the saved values from the backend
                      const existingZoneValues = updated[zone.id] || {};

                      // Format fade/delay times to ensure they're 2-digit strings
                      const fadeTime = detail.FadeTime ? String(detail.FadeTime).padStart(2, '0') : '02';
                      const delayTime = detail.DelayTime ? String(detail.DelayTime).padStart(2, '0') : '00';

                      updated[zone.id] = {
                        ...existingZoneValues, // Preserve brightness, cct, etc. from areaStatus
                        fadeTime: fadeTime, // ALWAYS use scene value
                        delayTime: delayTime, // ALWAYS use scene value
                      };
                    }
                  } else {
                    console.warn(`Zone not found for scene detail:`, {
                      zone_id: detail.zone_id,
                      zone_name: detail.zone_name,
                      zone_type: detail.zone_type,
                      availableZones: areaStatus.zones?.map(z => ({ id: z.id, name: z.name }))
                    });
                  }
                });

                return updated;
              });
            } else {
              console.warn('Scene details not found or invalid');
            }
          })
          .catch(error => {
            console.error('Failed to fetch active scene details for fade/delay times:', error);
          });
      } else {
      }
    }
  }, [areaStatus, selectedAreaId, dispatch, settingsOpen]);

  useEffect(() => {
    if (
      highlightedFofpZone &&
      Number(highlightedFofpZone.areaId) === Number(selectedAreaId)
    ) {
      return;
    }
    setZonePage(0);
  }, [selectedAreaId, areaStatus?.zones?.length, highlightedFofpZone]);

  useEffect(() => {
    if (!highlightedFofpZone || !areaStatus?.zones?.length) return;
    if (Number(areaStatus.area_id) !== Number(highlightedFofpZone.areaId)) return;

    const idx = findFofpZoneIndexInPanelList(areaStatus.zones, highlightedFofpZone);
    if (idx >= 0) {
      setZonePage(Math.floor(idx / SIDEBAR_ZONES_PER_PAGE));
    }
  }, [
    areaStatus,
    highlightedFofpZone,
    ZONES_PER_PAGE,
  ]);

  useEffect(() => {
    dispatch(fetchFofpConfig());
  }, [dispatch]);

  useEffect(() => {
    if (areaStatus && areaStatus.zones) {
      setShadesLocalValues(
        shades.reduce((acc, shade) => {
          const zoneId = resolveShadeZoneId(shade);
          if (zoneId == null) return acc;
          acc[zoneId] = parseShadeLevel(shade.level);
          return acc;
        }, {})
      );
    }
  }, [areaStatus]);

  useEffect(() => {
    setFilteredAreas(heatmapData.areas || []);
  }, [heatmapData.areas]);

  // Compute crop bbox from all area coordinates (trim PDF outer whitespace)
  useEffect(() => {
    const all = (heatmapData.areas || [])
      .flatMap(a => flattenAreaCoords(a)
        .filter(pt => typeof pt?.x === 'number' && typeof pt?.y === 'number'));
    if (!all.length) {
      setContentBBox(null);
      return;
    }
    const raw = getPolygonBoundingBox(all);
    const pad = 8;
    // Use actual PDF dimensions for bounding box calculation, fallback to A4 if not available
    const maxWidth = pageDims?.width || A4_WIDTH;
    const maxHeight = pageDims?.height || A4_HEIGHT;
    const minX = Math.max(0, raw.minX - pad);
    const minY = Math.max(0, raw.minY - pad);
    const maxX = Math.min(maxWidth, raw.maxX + pad);
    const maxY = Math.min(maxHeight, raw.maxY + pad);
    const newBBox = { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    setContentBBox(newBBox);
  }, [heatmapData.areas, pageDims]);

  // Refresh floor mode data only after controls change status on the *same* area.
  // Area click/select must not re-hit light_status / occupancy / energy.
  useEffect(() => {
    if (!areaStatus?.area_id || !selectedFloorId) return;

    const prev = lastAreaStatusSnapshotRef.current;
    const next = {
      areaId: areaStatus.area_id,
      light: areaStatus.light_status,
      occ: areaStatus.occupancy_status,
      scene: areaStatus.active_scene,
    };

    if (prev.areaId !== next.areaId) {
      lastAreaStatusSnapshotRef.current = next;
      return;
    }

    const statusChanged =
      prev.light !== next.light ||
      prev.occ !== next.occ ||
      prev.scene !== next.scene;

    lastAreaStatusSnapshotRef.current = next;
    if (!statusChanged) return;

    const refreshMapData = async () => {
      try {
        if (displayMode === "Occupancy") {
          await dispatch(fetchAreaOccupancyStatus({ floorId: selectedFloorId }));
        } else if (displayMode === "Energy") {
          await dispatch(fetchAreaEnergyConsumption({ floorId: selectedFloorId }));
        } else {
          await dispatch(fetchFloorMapData({ floorId: selectedFloorId }));
        }
      } catch (error) {
        // Failed to refresh map data
      }
    };

    const timeoutId = setTimeout(refreshMapData, 1000);
    return () => clearTimeout(timeoutId);
  }, [areaStatus?.area_id, areaStatus?.light_status, areaStatus?.occupancy_status, areaStatus?.active_scene, dispatch, selectedFloorId, displayMode]);

  const handleZoom = (direction) => {
    setScale((prev) => {
      let next = +(prev + direction * SCALE_STEP).toFixed(2);
      const minScale = isTablet ? MIN_SCALE_TABLET : is2560Screen ? 0.05 : MIN_SCALE;
      const cap = Math.max(MAX_SCALE, getDynamicMaxScale());
      next = Math.max(minScale, Math.min(next, cap));
      return next;
    });
  };

  // Center zoom function for zoom controls
  const handleCenterZoom = (direction) => {
    // Use the existing handleZoom function instead of handleWheel
    handleZoom(direction);
  };

  const getMaxAllowedScale = () => {
    const container = containerRef.current;
    if (!container) return 1.0;
    const viewW = pageDims?.width || A4_WIDTH;
    const viewH = pageDims?.height || A4_HEIGHT;
    const maxScaleX = container.offsetWidth / viewW;
    const maxScaleY = container.offsetHeight / viewH;
    return Math.min(maxScaleX, maxScaleY);
  };

  const handleFit = () => {
    applyFitToScreen({ force: true });
  };
  const handleFitButtonClick = () => {
    handleFit();
  };
  const getCentroid = (pts) => {
    const x = pts.reduce((sum, p) => sum + p.x, 0) / pts.length;
    const y = pts.reduce((sum, p) => sum + p.y, 0) / pts.length;
    return { x, y };
  };

  // Helper function to calculate Energy color for a given savings percentage (0-100)
  const getEnergyColor = (savingsPercent) => {
    if (savingsPercent === undefined || Number.isNaN(savingsPercent)) {
      return 'transparent';
    }

    const pct = Math.min(1, Math.max(0, savingsPercent / 100));

    // Use the energy color from API
    const hex = energyBaseColor.replace('#', '');
    const [rBase, gBase, bBase] = [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16),
    ];
    // Blend with white but keep a minimum presence of the base color at 0%
    const minBaseWeight = 0.15; // 15% of base color at 0%
    const baseWeight = minBaseWeight + (1 - minBaseWeight) * pct;
    const whiteWeight = 1 - baseWeight;
    const r = Math.round(whiteWeight * 255 + baseWeight * rBase);
    const g = Math.round(whiteWeight * 255 + baseWeight * gBase);
    const b = Math.round(whiteWeight * 255 + baseWeight * bBase);
    return `rgba(${r}, ${g}, ${b}, 0.7)`;
  };

  const getFill = (area) => {
    // Offline processor: leave PDF visible (no heat overlay) until area click shows message
    if (isMapProcessorUnreachable(area)) {
      return 'transparent';
    }
    if (displayMode === 'Occupancy') {
      const occ = (area.occupancy_status || '').toLowerCase().trim();
      if (occ === 'occupied') {
        // Convert hex to rgba with opacity
        const hex = occupancyColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, 0.5)`;
      } else if (occ === 'unoccupied') {
        return 'rgba(95,95,95,0.5)';
      }
      return 'transparent';
    } else if (displayMode === 'Light') {
      return resolveLightModeFill(area, lightColor);
    } else if (displayMode === 'Energy') {
      // Compute savings percentage using (maxpower - instantaneous) / maxpower * 100
      const current = Number(area.instantaneous_power);
      const max = Number(area.instantaneous_max_power);
      const hasInstant = !Number.isNaN(current) && !Number.isNaN(max) && max > 0;

      let rawPercent;
      if (hasInstant) {
        // Calculate savings percentage: (max - current) / max * 100
        rawPercent = ((max - current) / max) * 100;
      } else if (
        area.load_percentage !== null &&
        area.load_percentage !== undefined &&
        area.load_percentage !== 'Unknown'
      ) {
        // If no instantaneous data, use load_percentage as savings
        rawPercent = Number(area.load_percentage);
      }

      // Use the helper function to calculate color
      return getEnergyColor(rawPercent);
    }
    return 'transparent';
  };

  const handleFloorChange = (direction) => {
    if (!floors || floors.length === 0) return;

    // Get available floors for current user
    const availableFloors = getAvailableFloors();
    if (availableFloors.length === 0) return;

    const currentIndex = availableFloors.findIndex(floor => floor.id === selectedFloorId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = availableFloors.length - 1;
    if (newIndex >= availableFloors.length) newIndex = 0;

    const newFloorId = availableFloors[newIndex].id;
    const newFloorName = availableFloors[newIndex].floor_name;

    // Check if user can access this floor
    if (!canAccessFloor(newFloorId)) {
      return;
    }


    dispatch(setSelectedFloorId(newFloorId));

    // Note: The useEffect will handle data fetching when selectedFloorId changes
  };

  const handleAreaClick = (area) => {
    setHighlightedFofpZone(null);
    const areaId = area.area_id || area.id;
    setSelectedAreaId(areaId);
    if (!area.area_id) {
      return;
    }

    // Same area already open or still loading — do not re-hit full_area_status.
    const idKey = String(area.area_id);
    if (
      (areaStatusLoading && String(areaStatusFetchingId) === idKey) ||
      (!areaStatusLoading && areaStatus && String(areaStatus.area_id) === idKey)
    ) {
      return;
    }

    // Area panel only — floor map already loaded by floor effect; do not re-hit light_status
    dispatch(fetchAreaStatus(area.area_id));
  };


  const scenes = areaStatus?.area_scenes || [];
  const totalPages = Math.ceil(scenes.length / SCENES_PER_PAGE);
  const currentScenes = scenes.slice(scenePage * SCENES_PER_PAGE, (scenePage + 1) * SCENES_PER_PAGE);

  const refreshAllData = async () => {
    if (!areaStatus?.area_id || !areaStatus?.floor_id) return;

    const floorId = areaStatus.floor_id;
    const tasks = [dispatch(fetchAreaStatus(areaStatus.area_id))];
    if (displayMode === "Occupancy") {
      tasks.push(dispatch(fetchAreaOccupancyStatus({ floorId })));
    } else if (displayMode === "Energy") {
      tasks.push(dispatch(fetchAreaEnergyConsumption({ floorId })));
    } else {
      tasks.push(dispatch(fetchFloorMapData({ floorId })));
    }
    await Promise.all(tasks);
  };

  const refreshAllDataAndMap = async () => {
    if (!selectedFloorId) return;

    try {
      await dispatch(refreshAllHeatmapData({
        floorId: selectedFloorId,
        areaId: areaStatus?.area_id || null,
        displayMode,
      })).unwrap();
    } catch (error) {
      // Failed to refresh heatmap data
    }
  };

  const handleManualRefresh = async () => {
    if (!selectedFloorId) return;

    setRefreshing(true);
    try {
      await refreshAllDataAndMap();
    } catch (error) {
      // Manual refresh failed
    } finally {
      setRefreshing(false);
    }
  };

  const handleMainToggle = async () => {
    if (!areaStatus) return;

    // Check if user has permission to update area status
    if (!canUpdateAreaStatus()) {
      return;
    }

    setMainToggleUpdating(true);
    const newStatus = areaStatus.light_status === 'On' ? 'Off' : 'On';
    try {
      await dispatch(toggleAllZonesInArea({ areaId: areaStatus.area_id, action: newStatus })).unwrap();
      // Only refresh the specific area status since we're toggling all zones in this area
      // This prevents other areas from showing as "updated" in logs
      await dispatch(fetchAreaStatus(areaStatus.area_id));
      await dispatch(fetchProcessors());
    } catch (e) {
      // Optionally show error
    } finally {
      setMainToggleUpdating(false);
    }
  };

  function getDefaultZoneValues(zone) {
    return {
      brightness: parseInt(zone.brightness) || 0,
      cct: zone.cct || zone.color_temp || 1600,
      fadeTime: '02',
      delayTime: '00',
    };
  }

  function handleZoneValueChange(zoneId, changed) {
    setZoneLocalValues(prev => ({
      ...prev,
      [zoneId]: { ...prev[zoneId], ...changed },
    }));
  }

  // Track initial zone values to detect actual user changes
  const [initialZoneValues, setInitialZoneValues] = React.useState({});

  // Store initial values when area status is first loaded
  React.useEffect(() => {
    if (areaStatus && areaStatus.zones) {
      const initial = {};
      areaStatus.zones.forEach(zone => {
        if (!isSwitched(zone.type)) {
          const existingLocal = zoneLocalValues[zone.id];
          if (existingLocal) {
            initial[zone.id] = {
              brightness: existingLocal.brightness,
              cct: existingLocal.cct,
              fadeTime: existingLocal.fadeTime,
              delayTime: existingLocal.delayTime,
            };
          }
        }
      });
      setInitialZoneValues(initial);
    }
  }, [areaStatus?.area_id]); // Only update when area changes

  async function handleApplyZones() {
    // Check if user has permission to update area status
    if (!canUpdateAreaStatus()) {
      return;
    }

    setZoneUpdating(true);

    // Only get zones on the current sidebar page that have been modified
    const zonesToUpdate = buildSidebarZonesToShow(areaStatus.zones)
      .slice(zonePage * SIDEBAR_ZONES_PER_PAGE, (zonePage + 1) * SIDEBAR_ZONES_PER_PAGE)
      .filter(zone => {
        const localValues = zoneLocalValues[zone.id];
        const initialValues = initialZoneValues[zone.id];
        if (!localValues) return false; // No local changes

        // Check if any value has actually changed
        if (isSwitched(zone.type)) {
          const localOnOff = localValues.on_off;
          const originalOnOff = zone.on_off || zone.status || 'Off';
          return localOnOff !== originalOnOff;
        }

        if (isDimmed(zone.type)) {
          const localBrightness = localValues.brightness;
          const originalBrightness = parseInt(zone.brightness) || 0;

          // Only check fade/delay if they exist in initial values (user modified them)
          let fadeChanged = false;
          let delayChanged = false;
          if (initialValues) {
            fadeChanged = localValues.fadeTime !== initialValues.fadeTime;
            delayChanged = localValues.delayTime !== initialValues.delayTime;
          }

          return localBrightness !== originalBrightness || fadeChanged || delayChanged;
        }

        if (isWhitening(zone.type)) {
          const localBrightness = localValues.brightness;
          const originalBrightness = parseInt(zone.brightness) || 0;
          const localCct = localValues.cct;
          const originalCct = zone.cct || zone.color_temp || 2700;

          // Only check fade/delay if they exist in initial values (user modified them)
          let fadeChanged = false;
          let delayChanged = false;
          if (initialValues) {
            fadeChanged = localValues.fadeTime !== initialValues.fadeTime;
            delayChanged = localValues.delayTime !== initialValues.delayTime;
          }

          return localBrightness !== originalBrightness ||
            localCct !== originalCct ||
            fadeChanged ||
            delayChanged;
        }

        return false; // No changes detected
      })
      .map(zone => {
        const values = zoneLocalValues[zone.id];

        if (isSwitched(zone.type)) {
          const localOnOff = values.on_off ?? (zone.on_off || zone.status);
          return {
            zone_id: zone.id,
            zone_type: "Switched",
            switched_state: localOnOff
          };
        }

        if (isDimmed(zone.type)) {
          return {
            zone_id: zone.id,
            zone_type: "Dimmed",
            level: Number(values.brightness),
            fade_time: values.fadeTime || "02",
            delay_time: values.delayTime || "00"
          };
        }

        if (isWhitening(zone.type)) {
          return {
            zone_id: zone.id,
            zone_type: "WhiteTune",
            level: Number(values.brightness),
            kelvin: Number(values.cct),
            fade_time: values.fadeTime || "02",
            delay_time: values.delayTime || "00"
          };
        }

        return {
          zone_id: zone.id,
          zone_type: zone.type || "Unknown",
          ...values
        };
      });

    // Only proceed if there are actually changes to apply
    if (zonesToUpdate.length === 0) {
      setZoneUpdating(false);
      return;
    }

    try {
      await dispatch(updateZonesByArea({
        areaId: selectedAreaId,
        zones: zonesToUpdate,
      })).unwrap();

      // Only refresh the specific area status, not all heatmap data
      // This prevents all zones from showing as "updated" in logs
      await dispatch(fetchAreaStatus(selectedAreaId));

      // Update initial values after successful apply to track new baseline
      setInitialZoneValues(prev => {
        const updated = { ...prev };
        zonesToUpdate.forEach(zoneUpdate => {
          const zoneId = zoneUpdate.zone_id;
          const localValues = zoneLocalValues[zoneId];
          if (localValues) {
            updated[zoneId] = {
              brightness: localValues.brightness,
              cct: localValues.cct,
              fadeTime: localValues.fadeTime,
              delayTime: localValues.delayTime,
            };
          }
        });
        return updated;
      });

    } catch (e) {
      // Optionally show error
    } finally {
      setZoneUpdating(false);
    }
  }

  const selectedAreaObj = heatmapData.areas?.find(
    a => (a.area_id || a.id) === selectedAreaId
  );

  const getCurrentAreaDisplayName = () =>
    areaStatus?.area_name || selectedAreaObj?.name || selectedAreaObj?.area_name || "Zone";

  const openAreaRenameDialog = () => {
    if (!canRenameArea()) return;
    setAreaRenameError("");
    setAreaRenameValue(getCurrentAreaDisplayName());
    setAreaRenameOpen(true);
  };

  const closeAreaRenameDialog = () => {
    setAreaRenameOpen(false);
    setAreaRenameError("");
    setAreaRenameSaving(false);
  };

  const handleAreaRenameSubmit = async () => {
    const trimmed = areaRenameValue.trim();
    if (!trimmed) {
      setAreaRenameError("Name must not be empty.");
      return;
    }
    if (trimmed.length > 512) {
      setAreaRenameError("Name must be at most 512 characters.");
      return;
    }
    const areaId = areaStatus?.area_id ?? selectedAreaObj?.area_id ?? selectedAreaObj?.id;
    if (areaId == null || Number(areaId) < 1) {
      setAreaRenameError("Unable to determine area.");
      return;
    }
    setAreaRenameSaving(true);
    setAreaRenameError("");
    try {
      await dispatch(
        renameArea({ area_id: Number(areaId), new_name: trimmed })
      ).unwrap();
      closeAreaRenameDialog();
    } catch (e) {
      setAreaRenameError(typeof e === "string" ? e : "Failed to rename area");
    } finally {
      setAreaRenameSaving(false);
    }
  };

  const fetchSettingsApi = async (areaId) => {
    return {
      locked: false,
      mode: "Auto",
      selectedScene: 1,
      scenes: [
        { id: 1, name: "Scene 1" },
        { id: 2, name: "Scene 2" }
      ],
      zones: [
        { id: 1, name: "Downlight", brightness: 40, brightnessMin: 0, brightnessMax: 100 },
        { id: 2, name: "Front Row", brightness: 60, brightnessMin: 0, brightnessMax: 100 }
      ]
    };
  };

  const handleShadeSlider = (id, value) => {
    setShadesLocalValues(prev => ({
      ...prev,
      [id]: Math.round(value), // Round to whole number
    }));
  };

  const handleShadesPreset = (percent) => {
    setShadesLocalValues(
      shades.reduce((acc, shade) => {
        const zoneId = resolveShadeZoneId(shade);
        if (zoneId == null) return acc;
        acc[zoneId] = percent;
        return acc;
      }, {})
    );
  };

  const runApplyShadesOnce = useMemo(() => createSingleFlight(), []);
  const handleApplyShades = () =>
    runApplyShadesOnce(async () => {
    // Check if user has permission to update area status
    if (!canUpdateAreaStatus()) {
      return;
    }

    setShadesUpdating(true);
    try {
      const shadesToUpdate = buildShadesUpdatePayload(shades, shadesLocalValues);
      if (shadesToUpdate.length === 0) {
        setShadesUpdating(false);
        return;
      }

      await dispatch(updateZonesByArea({
        areaId: areaStatus.area_id,
        zones: shadesToUpdate,
      })).unwrap();

      // Only refresh the specific area status, not all heatmap data
      // This prevents all zones from showing as "updated" in logs
      await dispatch(fetchAreaStatus(areaStatus.area_id));
    } catch (e) {
      // Optionally show error
    } finally {
      setShadesUpdating(false);
    }
  });

  const zonesToShow = buildSidebarZonesToShow(areaStatus?.zones);
  const zonesPerPage = SIDEBAR_ZONES_PER_PAGE;
  const totalZonePages = Math.ceil(zonesToShow.length / zonesPerPage) || 1;
  const visibleSidebarZones = zonesToShow.slice(
    zonePage * zonesPerPage,
    (zonePage + 1) * zonesPerPage
  );

  useEffect(() => {
    const maxPage = Math.max(0, totalZonePages - 1);
    if (zonePage > maxPage) {
      setZonePage(maxPage);
    }
  }, [zonePage, totalZonePages]);

  const fofpOverlayConfig = useMemo(() => {
    const fromFloor = heatmapData?.fofp_config;
    if (!fromFloor && !fofpConfigFromStore) return null;
    return {
      ...(fofpConfigFromStore || {}),
      ...(fromFloor || {}),
      marker_color:
        fromFloor?.marker_color ?? fofpConfigFromStore?.marker_color,
    };
  }, [heatmapData?.fofp_config, fofpConfigFromStore]);

  const handleFofpZoneClick = useCallback(
    ({ zoneId, areaId, zoneName, lightLevel }) => {
      if (areaId == null) return;
      const highlight = {
        areaId: Number(areaId),
        zoneId: zoneId != null ? Number(zoneId) : null,
        zoneName: zoneName || "",
        lightLevel: lightLevel ?? null,
      };
      setHighlightedFofpZone(highlight);
      setSelectedAreaId(Number(areaId));

      const jumpToZonePage = (zones) => {
        if (!zones?.length) return;
        const idx = findFofpZoneIndexInPanelList(zones, highlight);
        if (idx >= 0) {
          setZonePage(Math.floor(idx / SIDEBAR_ZONES_PER_PAGE));
        }
      };

      if (
        areaStatus?.area_id != null &&
        Number(areaStatus.area_id) === highlight.areaId &&
        areaStatus.zones?.length
      ) {
        jumpToZonePage(areaStatus.zones);
      }

      dispatch(fetchAreaStatus(Number(areaId)));
    },
    [dispatch, areaStatus]
  );

  // Helper function to check if an area has active alerts
  const hasActiveAlert = (areaName) => {
    if (!activeAlerts || !Array.isArray(activeAlerts) || activeAlerts.length === 0) {
      return false;
    }

    // Normalize area name for comparison
    const normalizedAreaName = (areaName || '').toLowerCase().trim();

    // Check if any alert's location matches this area
    return activeAlerts.some(alert => {
      const alertLocation = (alert.location || '').toLowerCase().trim();

      // Match 1: Exact match (for backward compatibility)
      if (alertLocation === normalizedAreaName) {
        return true;
      }

      // Match 2: Check if alert location ends with the area name
      // Example: "tower a fourth floor/dining room" ends with "dining room"
      if (alertLocation.endsWith(normalizedAreaName)) {
        return true;
      }

      // Match 3: Extract the last part after "/" and match
      // Example: "tower a fourth floor/dining room" -> "dining room"
      const alertLocationParts = alertLocation.split('/');
      const lastPart = alertLocationParts[alertLocationParts.length - 1].trim();
      if (lastPart === normalizedAreaName) {
        return true;
      }

      return false;
    });
  };

  const findAlertForArea = (areaName) => {
    if (!activeAlerts || !Array.isArray(activeAlerts) || activeAlerts.length === 0) {
      return null;
    }

    const normalizedAreaName = (areaName || '').toLowerCase().trim();

    return activeAlerts.find((alert) => {
      const alertLocation = (alert.location || '').toLowerCase().trim();
      if (!alertLocation || !normalizedAreaName) return false;

      if (alertLocation === normalizedAreaName) return true;
      if (alertLocation.endsWith(normalizedAreaName)) return true;

      const alertLocationParts = alertLocation.split('/');
      const lastPart = alertLocationParts[alertLocationParts.length - 1].trim();
      return lastPart === normalizedAreaName;
    }) || null;
  };

  const navIconSx = {
    bgcolor: '#fff',
    borderRadius: '50%',
    boxShadow: 1,
    width: { xs: 24, md: 28 },
    height: { xs: 24, md: 28 },
    minWidth: { xs: 24, md: 28 },
    minHeight: { xs: 24, md: 28 },
    p: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': { bgcolor: '#eee' }
  };

  return (
    <>
      {/* CSS Animation for continuous search bounce - centered scale only */}
      <style>
        {`
          @keyframes searchBounce {
            0% { transform: scale(1); }
            50% { transform: scale(0.95); }
            100% { transform: scale(1); }
          }
        `}

      </style>
      <Box
        ref={layoutRef}
        className="heatmap-container"
        sx={{
          width: '100%',
          height: availableHeight ? `${availableHeight}px` : 'calc(100vh - 88px)',
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
          p: 0,
          m: 0,
          bgcolor: 'transparent',
          gap: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Heatmap and Legends/Navigation Column */}
        <Box
          sx={{
            flex: '1 1 100%', // Always take full available space
            minWidth: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            m: 0,
            position: 'relative',
            overflow: 'hidden',
            bgcolor: 'transparent',
            // Force the heatmap to utilize all available space
            width: '100%',
            maxWidth: '100%',
            // Additional properties to ensure full space utilization
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: '100%',
            // Ensure the container takes full available height
            minHeight: '100%',
          }}
        >
          {/* Floor Plan Container with Left/Right Padding and Zoom Controls - Reduced Height */}
          <Box
            sx={{
              flex: '0 0 auto', // Don't grow, fixed height
              height: '95%', // Reduced from 100% to 75%
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              bgcolor: 'rgba(255, 255, 255, 1)', // 0% opaque White,
              borderRadius: 1,
              border: '1px solid rgba(0,0,0,0.1)',
              p: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
              gap: { xs: 1, sm: 1.5, md: 2 },
            }}
          >
            {/* Zoom Controls - Left Wall of PDF */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 1,
              alignItems: 'center',
              minWidth: { xs: 50, sm: 60, md: 70 },
              flexShrink: 0,
            }}>
              <IconButton
                onClick={() => handleCenterZoom(1)}
                disabled={scale >= 5.0}
                size={isMobile ? 'small' : 'medium'}
                sx={{ bgcolor: 'rgba(255,255,255,0.9)', boxShadow: 1 }}
              >
                <ZoomInIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
              <IconButton
                onClick={() => handleCenterZoom(-1)}
                disabled={scale <= 0.1}
                size={isMobile ? 'small' : 'medium'}
                sx={{ bgcolor: 'rgba(255,255,255,0.9)', boxShadow: 1 }}
              >
                <ZoomOutIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
              <IconButton
                onClick={handleFitButtonClick}
                size={isMobile ? 'small' : 'medium'}
                title="Reset to fit position"
                sx={{ bgcolor: 'rgba(255,255,255,0.9)', boxShadow: 1 }}
              >
                <FitScreenIcon fontSize={isMobile ? 'small' : 'medium'} />
              </IconButton>
            </Box>

            {/* PDF Container - Takes remaining space with padding */}
            <Box
              sx={{
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: 'transparent',
                minWidth: 0,
                minHeight: 0,
                // Add padding to wrap the floor plan properly
                pl: { xs: 2, sm: 3, md: 4 }, // Left padding - prevents legend text clipping
                pr: { xs: 2, sm: 3, md: 4 }, // Right padding
                pb: { xs: 2, sm: 3, md: 4 }, // Bottom padding
              }}
            >
              {heatmapError ? (
                <Alert severity="error" sx={{ maxWidth: 480, m: 2 }}>
                  {heatmapError}
                </Alert>
              ) : (
              <HeatmapPdfSvgViewer
                containerRef={containerRef}
                pdfUrl={pdfUrl}
                pageDims={pageDims}
                setPageDims={setPageDims}
                setPdfLoaded={setPdfLoaded}
                scale={scale}
                setScale={setScale}
                fitScale={fitScale}
                hasFit={hasFit}
                handleFit={handleFit}
                areas={filteredAreas}
                getFill={getFill}
                handleAreaClick={handleAreaClick}
                searchTerm={searchTerm}
                pan={pan}
                setPan={setPan}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                dragStart={dragStart}
                setDragStart={setDragStart}
                contentBBox={contentBBox}
                boundaryValues={boundaryValues}
                containerFitMode
                highlightedAreaId={highlightedAreaId}
                searchBounceAnimation={searchBounceAnimation}
                hasActiveAlert={hasActiveAlert}
                findAlertForArea={findAlertForArea}
                navigate={navigate}
                fofpEnabled={heatmapData?.fofp_enabled === true}
                fofpPositions={heatmapData?.fofp_positions}
                fofpConfig={fofpOverlayConfig}
                onFofpZoneClick={handleFofpZoneClick}
                highlightedFofpZone={highlightedFofpZone}
              />
              )}
            </Box>

            {/* Legends and Floor navigation - Positioned directly on heatmap container */}
            <Box
              className="heatmap-legends-nav"
              sx={{
                position: 'absolute',
                bottom: { xs: 8, sm: 12, md: 16 },
                left: { xs: 8, sm: 12, md: 16 },
                right: { xs: 8, sm: 12, md: 16 },
                zIndex: 10,
                width: 'auto',
                maxWidth: '100%',
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 1, sm: 1.5 },
                minHeight: { xs: 'auto', sm: 44 },
                backgroundColor: '#fff',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                px: { xs: 1.5, sm: 2, md: 2.5 },
                py: { xs: 1, sm: 0.75 },
                flexShrink: 0,
              }}
            >
              {/* Display mode legend — left */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, overflow: 'visible', position: 'relative', zIndex: 2 }}>
                <Typography
                  fontSize={{ xs: 16, sm: 17, md: 18 }}
                  fontWeight={600}
                  sx={{
                    color: '#000',
                    textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                  }}
                >
                  {displayMode === 'Energy' ? 'Energy Savings' : displayMode}:
                </Typography>
                {displayMode === 'Light' && (() => {
                  const brightColor = getLightLevelFillColor(100, lightColor);
                  const mediumColor = getLightLevelFillColor(50, lightColor);
                  const offColor = getLightLevelFillColor(0, lightColor);

                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: brightColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        Bright
                      </Typography>
                      <Box sx={{ width: 12, height: 12, bgcolor: mediumColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        Medium
                      </Typography>
                      <Box sx={{ width: 12, height: 12, bgcolor: offColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        Off
                      </Typography>
                    </Box>
                  );
                })()}
                {displayMode === 'Occupancy' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 12, height: 12, bgcolor: occupancyColor, borderRadius: 0.5 }} />
                    <Typography
                      fontSize={{ xs: 15, sm: 16, md: 17 }}
                      sx={{
                        color: '#000',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                      }}
                    >
                      Occupied
                    </Typography>
                    <Box sx={{ width: 12, height: 12, bgcolor: 'rgba(95,95,95,0.5)', borderRadius: 0.5 }} />
                    <Typography
                      fontSize={{ xs: 15, sm: 16, md: 17 }}
                      sx={{
                        color: '#000',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                      }}
                    >
                      Unoccupied
                    </Typography>
                  </Box>
                )}
                {displayMode === 'Energy' && (() => {
                  // Use the same helper function to calculate colors for legend
                  // This ensures legend colors exactly match floorplan colors
                  const highColor = getEnergyColor(100); // 100% savings
                  const mediumColor = getEnergyColor(50);  // 50% savings
                  const lowColor = getEnergyColor(0);      // 0% savings

                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, bgcolor: highColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        High
                      </Typography>
                      <Box sx={{ width: 12, height: 12, bgcolor: mediumColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        Medium
                      </Typography>
                      <Box sx={{ width: 12, height: 12, bgcolor: lowColor, borderRadius: 0.5 }} />
                      <Typography
                        fontSize={{ xs: 15, sm: 16, md: 17 }}
                        sx={{
                          color: '#000',
                          textShadow: '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)'
                        }}
                      >
                        Low
                      </Typography>
                    </Box>
                  );
                })()}
              </Box>

              {/* Floor navigation — visually centered between legend and actions */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  justifyContent: 'center',
                  flexShrink: 0,
                  alignSelf: { xs: 'center', sm: 'center' },
                  position: { xs: 'static', sm: 'absolute' },
                  left: { sm: '50%' },
                  transform: { sm: 'translateX(-50%)' },
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => handleFloorChange(-1)}
                  disabled={!floors || floors.length === 0}
                  sx={{ ...navIconSx }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
                <Typography
                  fontSize={{ xs: 11, sm: 12, md: 13 }}
                  fontWeight={700}
                  sx={{
                    minWidth: { xs: 72, sm: 100, md: 120 },
                    textAlign: 'center',
                    color: '#000',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                  }}
                >
                  {floors?.find(f => f.id === selectedFloorId)?.floor_name || 'Floor'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleFloorChange(1)}
                  disabled={!floors || floors.length === 0}
                  sx={{ ...navIconSx }}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </Box>

              <HeatmapFooterActions />
            </Box>
          </Box>
        </Box>
        {/* Status Panel - responsive based on screen size */}
        {selectedAreaId && (
          <Box
            className="heatmap-area-sidebar"
            sx={{
              flex: '0 0 auto',
              width: {
                xs: '28%',
                sm: '25%',
                md: '22%',
                lg: '20%',
                xl: '18%'
              },
              minWidth: {
                xs: 280,
                sm: 300,
                md: 320,
                lg: 360,
                xl: 400
              },
              maxWidth: {
                xs: 320,
                sm: 350,
                md: 380,
                lg: 420,
                xl: 480
              },
              // Fill the heatmap-container height; container is viewport-bound via index.css.
              // Vertical scroll is enabled on this panel (see .heatmap-area-sidebar in index.css).
              height: '100%',
              maxHeight: '100%',
              alignSelf: 'stretch',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.10)',
              background: '#fff',
              borderLeft: '2px solid #1E74C5',
              ...HEATMAP_STATUS_PANEL_OVERFLOW_SX,
              p: 0,
              m: 0,
              boxSizing: 'border-box',
              zIndex: 2,
              transition: 'width 0.3s',
              borderRadius: '10px 0 0 10px',
            }}
          >
            {/* Sticky header while panel scrolls */}
            <Box sx={{
              ...HEATMAP_SIDEBAR_STICKY_HEADER_SX,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: { xs: 1, sm: 1.5, md: 2 },
              py: { xs: 0.5, sm: 0.75, md: 1 },
              minHeight: { xs: 25, sm: 28, md: 32 },
              bgcolor: '#1E74C5',
              width: '100%',
              gap: 1,
            }}>
              {/* Left side with toggle and area name */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5, // Reduced gap
                flex: 1,
                minWidth: 0,
                overflow: 'hidden' // Ensure container doesn't overflow
              }}>
                {areaStatus && (
                  <MainAreaToggle
                    isOn={areaStatus.light_status === 'On'}
                    onClick={handleMainToggle}
                    isMobile={isMobile}
                    disabled={!canUpdateAreaStatus()}
                    backgroundColor={backgroundColor}
                    contentColor={contentColor}
                    buttonColor={buttonColor}
                  />
                )}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    minWidth: 0,
                    flex: 1,
                    gap: 0.25,
                  }}
                >
                  <Typography
                    fontWeight={400}
                    fontSize={{ xs: 7, sm: 8, md: 9, lg: 10 }}
                    sx={{
                      color: '#fff',
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                      minWidth: 0,
                      maxWidth: "100%",
                      lineHeight: 1.2,
                    }}
                  >
                    {areaStatus?.area_name || selectedAreaObj?.name || selectedAreaObj?.area_name || "Zone"}
                  </Typography>
                  {canRenameArea() && (
                    <IconButton
                      size="small"
                      onClick={openAreaRenameDialog}
                      aria-label="Rename area"
                      title="Rename area"
                      sx={{
                        flexShrink: 0,
                        fontSize: { xs: 11, sm: 12, md: 13, lg: 14 },
                        p: { xs: 0.15, sm: 0.2, md: 0.25 },
                        color: "#1E74C5",
                        bgcolor: "rgba(255,255,255,0.90)",
                        borderRadius: 1,
                        "&:hover": { bgcolor: "rgba(255,255,255,1.0)" },
                      }}
                    >
                      <EditIcon sx={{ fontSize: "inherit" }} />
                    </IconButton>
                  )}
                </Box>
              </Box>

              {/* Right side with icons */}
              <Box sx={{
                display: 'flex',
                gap: 0.5,
                flexShrink: 0,
                alignItems: 'center'
              }}>
                {canViewAreaSettings() && (
                  <IconButton
                    size="small"
                    onClick={() => {
                      // Check if user has any permissions before opening settings
                      if (canViewAreaSettings()) {
                        setSettingsOpen(true);
                      }
                    }}
                    sx={{
                      fontSize: { xs: 12, sm: 14, md: 16, lg: 18 }, // Reduced icon sizes
                      p: { xs: 0.2, sm: 0.3, md: 0.4, lg: 0.5 }, // Reduced padding
                      color: '#fff',
                    }}
                    title="Area Settings"
                  >
                    <SettingsIcon fontSize={isMobile ? 'small' : 'medium'} />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  onClick={closeAreaPanel}
                  sx={{
                    fontSize: { xs: 12, sm: 14, md: 16, lg: 18 }, // Reduced icon sizes
                    p: { xs: 0.2, sm: 0.3, md: 0.4, lg: 0.5 }, // Reduced padding
                    color: '#fff',
                  }}
                >
                  <CloseIcon fontSize={isMobile ? 'small' : 'medium'} />
                </IconButton>
              </Box>
            </Box>

            {/* Content below sticky header (parent sidebar scrolls) */}
            <Box
              className="heatmap-area-sidebar-body"
              sx={{
                ...HEATMAP_SIDEBAR_MAIN_SCROLL_SX,
                gap: { xs: 0.1, sm: 0.15, md: 0.2, lg: 0.25 },
                p: { xs: 0.5, sm: 0.75, md: 1 },
                pr: { xs: 1, sm: 1.25, md: 1.5 },
                pb: { xs: 10, md: 12 },
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {areaStatusLoading ? (
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.75)',
                  zIndex: 10
                }}>
                  <CircularProgress size={isMobile ? 24 : 36} />
                </Box>
              ) : areaStatusError ? (
                <Alert severity="warning" sx={{ m: 1.5 }}>
                  {areaStatusError}
                </Alert>
              ) : (
                <>
                  {/* Scene Section */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    bgcolor: '#f5f7fb',
                    border: '2px solid #1E74C5',
                    borderRadius: 0,
                    minHeight: { xs: 45, sm: 50, md: 55, lg: 60, xl: 60 },
                    flexShrink: 0,
                    p: 0,
                    m: 0,
                    boxSizing: 'border-box',
                  }}>
                    <Box sx={{
                      writingMode: 'vertical-rl',
                      fontWeight: 'bold',
                      fontSize: { xs: 8, sm: 9, md: 10, lg: 12 },
                      color: '#1E74C5',
                      px: { xs: 0.3, sm: 0.4, md: 0.5 },
                      py: 0.2,
                      minWidth: { xs: 16, sm: 18, md: 20, lg: 24 },
                      textAlign: 'center',
                      bgcolor: '#fff',
                      borderRadius: '0 12px 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(180deg)',
                    }}>
                      Scene
                    </Box>
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      p: { xs: 0.5, md: 1 },
                      minHeight: 0,
                      overflow: 'hidden',
                    }}>
                      {/* Left arrow */}
                      {scenePage > 0 && (
                        <IconButton
                          size="small"
                          onClick={() => setScenePage(scenePage - 1)}
                          sx={{ ...navIconSx, mr: 0.5 }}
                        >
                          <ArrowBackIosNewIcon sx={{ color: '#222', fontSize: { xs: 14, md: 18 } }} />
                        </IconButton>
                      )}

                      {/* Scene Grid */}
                      <Box sx={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(3, 1fr)'
                        },
                        gridTemplateRows: 'repeat(3, 1fr)',
                        gap: { xs: 0.15, sm: 0.2, md: 0.25, lg: 0.3 },
                        minHeight: 0,
                      }}>
                        {(areaStatus && Array.isArray(areaStatus.area_scenes) ? areaStatus.area_scenes : [])
                          .slice(scenePage * SCENES_PER_PAGE, (scenePage + 1) * SCENES_PER_PAGE)
                          .map((scene, idx) => (
                            <Button
                              key={scene.id}
                              size="small"
                              variant={scene.id === areaStatus?.active_scene ? "contained" : "outlined"}
                              disabled={!canUpdateAreaStatus()}
                              sx={{
                                fontSize: { xs: 7, sm: 8, md: 9, lg: 10 },
                                minWidth: 0,
                                p: { xs: 0.05, sm: 0.1, md: 0.15, lg: 0.2 },
                                borderRadius: 1,
                                height: { xs: 16, sm: 18, md: 20, lg: 22 },
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                background: scene.id === areaStatus?.active_scene ? '#1E74C5' : 'transparent',
                                color: scene.id === areaStatus?.active_scene ? '#fff' : '#1E74C5',
                                border: '1px solid #1E74C5',
                                fontWeight: scene.id === areaStatus?.active_scene ? 700 : 400,
                                maxWidth: { xs: 50, sm: 55, md: 60, lg: 70 },
                                textTransform: 'uppercase',
                                opacity: !canUpdateAreaStatus() ? 0.5 : 1,
                                cursor: !canUpdateAreaStatus() ? 'not-allowed' : 'pointer',
                              }}
                              onClick={async () => {
                                if (!areaStatus?.area_id || scene.id == null) return;

                                // Check if user has permission to update area status
                                if (!canUpdateAreaStatus()) {
                                  return;
                                }

                                try {
                                  // Activate the scene
                                  await dispatch(updateAreaScene({
                                    area_id: areaStatus.area_id,
                                    scene_code: scene.id
                                  })).unwrap();

                                  // Fetch scene details to get fade/delay times
                                  const sceneStatusResponse = await dispatch(fetchSceneStatus({
                                    areaId: areaStatus.area_id,
                                    sceneId: scene.id
                                  })).unwrap();

                                  // The response structure: { status: "success", area_id: ..., scene_id: ..., details: [...] }
                                  // Redux stores details in state.sceneStatus, but unwrap() returns the full response
                                  const sceneDetails = sceneStatusResponse?.details || sceneStatusResponse || [];


                                  // Update zone local values with fade/delay times from the scene
                                  // CRITICAL: Use zone_id for matching instead of zone_name for reliability
                                  if (sceneDetails && Array.isArray(sceneDetails) && sceneDetails.length > 0) {
                                    setZoneLocalValues(prev => {
                                      const updated = { ...prev };
                                      sceneDetails.forEach(detail => {
                                        // CRITICAL: Match by zone_id first (most reliable), fallback to zone_name
                                        const zoneId = detail.zone_id;
                                        let zone = null;

                                        if (zoneId != null) {
                                          zone = areaStatus.zones?.find(z => Number(z.id) === Number(zoneId));
                                        }

                                        // Fallback: match by name if zone_id not available
                                        if (!zone && detail.zone_name) {
                                          const wanted = String(detail.zone_name).trim().toLowerCase();
                                          zone = areaStatus.zones?.find(z => String(z.name).trim().toLowerCase() === wanted);
                                        }

                                        if (zone) {
                                          const zoneType = (detail.zone_type || '').toLowerCase();
                                          if (zoneType === 'dimmed') {
                                            updated[zone.id] = {
                                              ...updated[zone.id],
                                              brightness: detail.Level || 0,
                                              fadeTime: detail.FadeTime || '02',
                                              delayTime: detail.DelayTime || '00',
                                            };
                                          } else if (zoneType === 'whitetune') {
                                            updated[zone.id] = {
                                              ...updated[zone.id],
                                              brightness: detail.Level || 0,
                                              cct: detail.WhiteTuningLevel?.Kelvin || 2700,
                                              fadeTime: detail.FadeTime || '02',
                                              delayTime: detail.DelayTime || '00',
                                            };
                                          } else if (zoneType === 'switched') {
                                            updated[zone.id] = {
                                              ...updated[zone.id],
                                              on_off: detail.SwitchedLevel || 'Off',
                                            };
                                          }
                                        } else {
                                          console.warn(`Zone not found for scene detail:`, {
                                            zone_id: detail.zone_id,
                                            zone_name: detail.zone_name,
                                            zone_type: detail.zone_type
                                          });
                                        }
                                      });
                                      return updated;
                                    });

                                    // Update initial values to match the new scene values
                                    setInitialZoneValues(prev => {
                                      const updated = { ...prev };
                                      sceneDetails.forEach(detail => {
                                        // CRITICAL: Match by zone_id first
                                        const zoneId = detail.zone_id;
                                        let zone = null;

                                        if (zoneId != null) {
                                          zone = areaStatus.zones?.find(z => Number(z.id) === Number(zoneId));
                                        }

                                        // Fallback: match by name
                                        if (!zone && detail.zone_name) {
                                          const wanted = String(detail.zone_name).trim().toLowerCase();
                                          zone = areaStatus.zones?.find(z => String(z.name).trim().toLowerCase() === wanted);
                                        }

                                        if (zone) {
                                          const zoneType = (detail.zone_type || '').toLowerCase();
                                          if (zoneType === 'dimmed' || zoneType === 'whitetune') {
                                            updated[zone.id] = {
                                              brightness: detail.Level || 0,
                                              cct: detail.WhiteTuningLevel?.Kelvin || 2700,
                                              fadeTime: detail.FadeTime || '02',
                                              delayTime: detail.DelayTime || '00',
                                            };
                                          }
                                        }
                                      });
                                      return updated;
                                    });
                                  }

                                  // Refresh area status to update brightness/temperature values
                                  await dispatch(fetchAreaStatus(areaStatus.area_id));
                                } catch (e) {
                                  console.error("Error activating scene:", e);
                                }
                              }}
                            >
                              <span style={{
                                display: 'block',
                                width: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                                {scene.name}
                              </span>
                            </Button>
                          ))}
                      </Box>

                      {/* Right arrow */}
                      {areaStatus && Array.isArray(areaStatus.area_scenes) && (scenePage + 1) * SCENES_PER_PAGE < areaStatus.area_scenes.length && (
                        <IconButton
                          size="small"
                          onClick={() => setScenePage(scenePage + 1)}
                          sx={{ ...navIconSx, ml: 0.5 }}
                        >
                          <ArrowForwardIosIcon sx={{ color: '#222', fontSize: { xs: 14, md: 18 } }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  {/* Zones Section - content-sized; list scrolls when cards exceed max height */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    bgcolor: '#f5f7fb',
                    border: '2px solid #1E74C5',
                    borderRadius: 0,
                    ...HEATMAP_ZONES_SECTION_SX,
                    p: 0,
                    m: 0,
                    boxSizing: 'border-box',
                  }}>
                    <Box sx={{
                      writingMode: 'vertical-rl',
                      fontWeight: 'bold',
                      fontSize: { xs: 8, sm: 9, md: 10, lg: 12 },
                      color: '#1E74C5',
                      px: { xs: 0.3, sm: 0.4, md: 0.5 },
                      py: 0.2,
                      minWidth: { xs: 16, sm: 18, md: 20, lg: 24 },
                      textAlign: 'center',
                      bgcolor: '#fff',
                      borderRadius: '0 12px 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(180deg)',
                      mr: { xs: 0.5, md: 1 },
                    }}>
                      Zones
                    </Box>
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'stretch',
                      p: { xs: 0.3, md: 0.5 },
                      minHeight: 0,
                      position: 'relative',
                      gap: { xs: 0.3, md: 0.5 },
                    }}>
                      {/* Zone controls */}
                      <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'stretch',
                        width: '100%',
                        minWidth: 0,
                      }}>
                        {zonesToShow.length > 0 ? (
                          <>
                            <Box sx={{
                              ...(totalZonePages > 1 ? HEATMAP_ZONES_LIST_PAGINATED_SX : HEATMAP_ZONES_LIST_SCROLL_SX),
                              display: 'flex',
                              flexDirection: 'column',
                              gap: { xs: 0.2, md: 0.3, lg: 0.4, xl: 0.5 },
                              alignItems: 'stretch',
                              width: '100%',
                            }}>
                              {visibleSidebarZones.map((zone) => {
                                  const values = zoneLocalValues[zone.id] || getDefaultZoneValues(zone);
                                  return (
                                    <ZoneControlCard
                                      key={zone.id}
                                      zone={zone}
                                      values={values}
                                      highlighted={isFofpZonePanelHighlighted(
                                        zone,
                                        highlightedFofpZone,
                                        areaStatus?.zones
                                      )}
                                      onChange={(changed) => handleZoneValueChange(zone.id, changed)}
                                      disabled={zoneUpdating || !canUpdateAreaStatus()}
                                      isMobile={isMobile}
                                      isTablet={isTablet}
                                      isDesktop={isDesktop}
                                      isLargeScreen={isLargeScreen}
                                      is1440Screen={is1440Screen}
                                      isUltraWide={isUltraWide}
                                      is2560Screen={is2560Screen}
                                      backgroundColor={backgroundColor}
                                      contentColor={contentColor}
                                      buttonColor={buttonColor}
                                    />
                                  );
                                })}
                            </Box>
                            <Box sx={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                              width: '100%',
                              mt: 0.5,
                              flexShrink: 0,
                            }}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleApplyZones}
                                disabled={zoneUpdating || !canUpdateAreaStatus()}
                                sx={{
                                  ...applyButtonSx,
                                  opacity: !canUpdateAreaStatus() ? 0.5 : 1,
                                  cursor: !canUpdateAreaStatus() ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {zoneUpdating ? 'Applying...' : 'Apply'}
                              </Button>
                            </Box>
                          </>
                        ) : (
                          <Typography
                            sx={{
                              color: onContentColors(contentColor).primary,
                              fontSize: { xs: 12, md: 15 },
                            }}
                          >
                            No zones available
                          </Typography>
                        )}
                      </Box>

                      {/* Pagination arrows */}
                      {totalZonePages > 1 && (
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          height: '100%',
                          gap: 0.5,
                          minWidth: 40,
                        }}>
                          {zonePage > 0 && (
                            <IconButton
                              size="small"
                              onClick={() => setZonePage((page) => page - 1)}
                              sx={{ ...navIconSx }}
                            >
                              <ArrowBackIosNewIcon sx={{ color: '#222', fontSize: { xs: 14, md: 18 } }} />
                            </IconButton>
                          )}
                          {zonePage < totalZonePages - 1 && (
                            <IconButton
                              size="small"
                              onClick={() => setZonePage((page) => page + 1)}
                              sx={{ ...navIconSx }}
                            >
                              <ArrowForwardIosIcon sx={{ color: '#222', fontSize: { xs: 14, md: 18 } }} />
                            </IconButton>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  {/* Occupancy Section */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    bgcolor: '#f5f7fb',
                    border: '2px solid #1E74C5',
                    borderRadius: 0,
                    minHeight: { xs: 35, sm: 40, md: 45, lg: 45, xl: 45 },
                    flexShrink: 0,
                    p: 0,
                    m: 0,
                    boxSizing: 'border-box',
                  }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'stretch',
                        bgcolor: '#fff',
                        borderRadius: '0 12px 12px 0',
                        mr: 1,
                        overflow: 'hidden',
                        minWidth: { xs: 34, md: 38 },
                      }}
                    >
                      <Box
                        sx={{
                          writingMode: 'vertical-rl',
                          fontWeight: 'bold',
                          fontSize: { xs: 10, md: 12 },
                          color: '#1E74C5',
                          px: { xs: 0.3, sm: 0.4, md: 0.5 },
                          py: 0.2,
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: 'rotate(180deg)',
                        }}
                      >
                        Occupancy
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          px: { xs: 0.35, md: 0.45 },
                          borderLeft: '1px solid rgba(30, 116, 197, 0.2)',
                        }}
                        aria-hidden
                      >
                        <PersonIcon
                          sx={{
                            fontSize: { xs: 15, md: 18 },
                            color: '#1E74C5',
                          }}
                        />
                      </Box>
                    </Box>
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: { xs: 0.5, md: 1 },
                      minHeight: 0,
                    }}>
                      {areaStatusLoading || !areaStatus ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                          <CircularProgress size={isMobile ? 16 : 20} />
                        </Box>
                      ) : (
                        <>
                          {areaStatus.occupancy_status === 'Occupied' && (
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, p: { xs: 0.3, md: 0.5 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <PersonIcon sx={{ fontSize: { xs: 20, md: 25 }, color: '#222' }} />
                              <CheckCircleIcon sx={{ fontSize: { xs: 12, md: 15 }, color: '#222', ml: -0.7, mt: 0.7 }} />
                            </Box>
                          )}
                          {areaStatus.occupancy_status === 'Unoccupied' && (
                            <Box sx={{ bgcolor: '#fff', borderRadius: 2, p: { xs: 0.3, md: 0.5 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <PersonIcon sx={{ fontSize: { xs: 20, md: 25 }, color: '#222' }} />
                              <CancelIcon sx={{ fontSize: { xs: 12, md: 15 }, color: '#d32f2f', ml: -0.7, mt: 0.7 }} />
                            </Box>
                          )}
                          <Typography fontSize={{ xs: 11, md: 13 }} color="#111" fontWeight="normal">
                            {areaStatus.occupancy_status || 'Unknown'}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Energy Section */}
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'stretch',
                    bgcolor: '#f5f7fb',
                    border: '2px solid #1E74C5',
                    borderRadius: 0,
                    minHeight: { xs: 45, sm: 50, md: 55, lg: 55, xl: 55 },
                    flexShrink: 0,
                    p: 0,
                    m: 0,
                    boxSizing: 'border-box',
                  }}>
                    <Box sx={{
                      writingMode: 'vertical-rl',
                      fontWeight: 'bold',
                      fontSize: { xs: 10, md: 12 },
                      color: '#1E74C5',
                      px: 0.5,
                      py: 0.2,
                      minWidth: { xs: 20, md: 24 },
                      textAlign: 'center',
                      bgcolor: '#fff',
                      borderRadius: '0 12px 12px 0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(180deg)',
                      mr: 1,
                    }}>
                      Energy
                    </Box>
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-around',
                      p: { xs: 0.5, md: 1 },
                      minHeight: 0,
                    }}>
                      {areaStatusLoading || !areaStatus ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                          <CircularProgress size={isMobile ? 16 : 20} />
                        </Box>
                      ) : (
                        <>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { xs: 60, md: 80 } }}>
                            <Typography fontSize={{ xs: 10, md: 12 }} color="#111" fontWeight="normal" letterSpacing={1}>Consumption</Typography>
                            <Typography fontSize={{ xs: 10, md: 12 }} color="#111" fontWeight="bold" mt={0.5}>
                              {formatSidebarEnergyWatts(areaStatus?.consumption)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: { xs: 60, md: 80 } }}>
                            <Typography fontSize={{ xs: 10, md: 12 }} color="#111" fontWeight="normal" letterSpacing={1}>Savings</Typography>
                            <Typography fontSize={{ xs: 10, md: 12 }} color="#111" fontWeight="bold" mt={0.5}>
                              {formatSidebarEnergyWatts(areaStatus?.savings)}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
                  </Box>

                  {/* Shades Section - Only show if shades are present */}
                  {shades.length > 0 && (
                    <HeatmapShadesPanel
                      variant="basic"
                      shades={shades}
                      shadesLocalValues={shadesLocalValues}
                      onShadeChange={handleShadeSlider}
                      onPreset={handleShadesPreset}
                      onApply={handleApplyShades}
                      shadesUpdating={shadesUpdating}
                      canUpdate={canUpdateAreaStatus()}
                      isMobile={isMobile}
                      applyButtonSx={applyButtonSx}
                      navIconSx={navIconSx}
                      themeOverrides={shadeSectionTheme}
                    />
                  )}
                </>
              )}
            </Box>
          </Box>
        )}

        <Dialog
          open={areaRenameOpen}
          onClose={areaRenameSaving ? undefined : closeAreaRenameDialog}
          maxWidth={false}
          fullWidth={false}
          PaperProps={{
            elevation: 0,
            sx: {
              borderRadius: 1,
              bgcolor: "#fff",
              border: "2px solid #1E74C5",
              p: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "visible",
              maxHeight: "90vh",
              margin: { xs: 1, sm: 2 },
              boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
              outline: "none",
              width: {
                xs: "28%",
                sm: "25%",
                md: "22%",
                lg: "20%",
                xl: "18%",
              },
              minWidth: {
                xs: 280,
                sm: 300,
                md: 320,
                lg: 360,
                xl: 400,
              },
              maxWidth: {
                xs: 320,
                sm: 350,
                md: 380,
                lg: 420,
                xl: 480,
              },
            },
          }}
        >
          <DialogTitle sx={{ ...ASD_DIALOG_TITLE_SX, p: "10px 14px" }}>
            Rename area
          </DialogTitle>
          <DialogContent
            sx={{
              flex: "0 0 auto",
              overflow: "visible",
              p: "12px 12px 0 12px",
              bgcolor: "#fff",
            }}
          >
            {areaRenameError ? (
              <Alert severity="error" sx={{ mb: 1 }}>
                {areaRenameError}
              </Alert>
            ) : null}
            <TextField
              autoFocus
              margin="none"
              label="Area name"
              fullWidth
              value={areaRenameValue}
              onChange={(e) => setAreaRenameValue(e.target.value)}
              disabled={areaRenameSaving}
              inputProps={{ maxLength: 512 }}
              variant="outlined"
              sx={{
                mt: 1.5,
                ...ASD_OUTLINED_FIELD_SX,
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: "6px 18px", flexShrink: 0, gap: 1 }}>
            <Button
              onClick={closeAreaRenameDialog}
              disabled={areaRenameSaving}
              variant="outlined"
              sx={{
                ...ASD_SETTINGS_FORM_CANCEL_BTN_SX,
                fontWeight: 600,
                fontSize: { xs: 10, sm: 11, md: 12 },
                borderRadius: 1,
                px: 1.5,
                py: 0.2,
                minWidth: 0,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAreaRenameSubmit}
              variant="contained"
              disabled={areaRenameSaving}
              sx={{
                ...(whiteChrome
                  ? {
                    ...ASD_APPLY_BTN_SX,
                    background: settingsFormActionBlue,
                    "&:hover": { background: settingsFormActionBlue },
                  }
                  : ASD_APPLY_BTN_SX),
                borderRadius: 1,
                minWidth: 0,
                "&.Mui-disabled": { background: "#666 !important", color: "#fff" },
              }}
            >
              {areaRenameSaving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Area Settings Dialog */}
        <AreaSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          areaId={selectedAreaId}
          fetchSettingsApi={fetchSettingsApi}
          canUpdateAreaStatus={canUpdateAreaStatus()}
          canModifyDeviceSettings={canModifyDeviceSettings()}
          canViewAreaSettings={canViewAreaSettings()}
          canEditScene={canEditScene()}
          currentUserRole={currentUserRole}
          userProfile={userProfile}
          selectedFloorId={selectedFloorId}
        />

      </Box>
    </>
  );
};

function MainAreaToggle({ isOn, onClick, isMobile, disabled = false, backgroundColor, contentColor, buttonColor }) {
  const getSize = () => {
    if (window.innerWidth < 600) return { width: 41, height: 16, thumbSize: 12, fontSize: 8 }; // Minimal width increase
    if (window.innerWidth < 900) return { width: 47, height: 20, thumbSize: 16, fontSize: 9 }; // Minimal width increase
    return { width: 53, height: 24, thumbSize: 20, fontSize: 10 }; // Minimal width increase
  };

  const { width, height, thumbSize, fontSize } = getSize();

  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        width,
        height,
        borderRadius: 999,
        background: disabled ? '#ddd' : '#fff', // White background
        border: `1px solid ${disabled ? '#ddd' : '#000'}`, // Thin black border
        display: 'flex',
        alignItems: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        padding: 2,
        position: 'relative',
        minWidth: width,
        flexShrink: 0,
        overflow: 'hidden', // Ensure toggle doesn't overflow
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          width: thumbSize,
          height: thumbSize,
          borderRadius: '50%',
          background: disabled ? '#bbb' : (isOn ? '#4caf50' : '#f44336'), // Green for ON, red for OFF
          transform: isOn ? `translateX(${width - thumbSize - 4}px)` : 'translateX(0)',
          transition: 'all 0.2s',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          position: 'absolute',
          left: 2,
          top: 2,
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: isOn ? 4 : width - thumbSize - 4, // Position text on opposite side of circle
          top: '50%',
          transform: 'translateY(-50%)',
          color: buttonColor || '#222',
          fontWeight: 600,
          fontSize: fontSize, // Use the increased font size
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: width - thumbSize - 8, // Increased max width to show full text
          lineHeight: 1,
          textAlign: 'center',
        }}
      >
        {isOn ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}

function resolveFofpZoneHighlightColor(contentColor, buttonColor) {
  return isLightSurface(contentColor) ? "#1565C0" : (buttonColor || "#1565C0");
}

function hexColorToRgba(hex, alpha) {
  const raw = String(hex || "").replace("#", "").trim();
  if (raw.length < 6) return `rgba(21, 101, 192, ${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) {
    return `rgba(21, 101, 192, ${alpha})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildFofpSidebarHighlightSx(highlighted, accentColor) {
  const base = {
    boxSizing: "border-box",
    borderRadius: 0.5,
  };
  if (!highlighted) {
    return { ...base, border: "2px solid transparent", boxShadow: "none" };
  }
  return {
    ...base,
    border: `2px solid ${accentColor}`,
    boxShadow: `0 3px 10px ${hexColorToRgba(accentColor, 0.45)}, 0 0 0 1px ${hexColorToRgba(accentColor, 0.2)}`,
  };
}

function ZoneControlCard({ zone, values, onChange, disabled, highlighted = false, isMobile, isTablet, isDesktop, isLargeScreen, is1440Screen, isUltraWide, is2560Screen, backgroundColor, contentColor, buttonColor }) {
  const fofpHighlightColor = resolveFofpZoneHighlightColor(contentColor, buttonColor);
  const highlightSx = buildFofpSidebarHighlightSx(highlighted, fofpHighlightColor);
  const isSwitchType = isSwitched(zone.type);
  const isWhitetuneType = isWhitening(zone.type);
  const isDimmedType = isDimmed(zone.type);

  const safeValues = values || { on_off: zone.status || zone.on_off || 'Off' };

  const [brightnessEdit, setBrightnessEdit] = useState({ isEditing: false, value: "" });
  const [cctEdit, setCctEdit] = useState({ isEditing: false, value: "" });

  const beginBrightnessEdit = (currentValue) => {
    setBrightnessEdit({ isEditing: true, value: String(currentValue ?? "") });
  };

  const cancelBrightnessEdit = () => {
    setBrightnessEdit({ isEditing: false, value: "" });
  };

  const commitBrightnessEdit = ({ min = 0, max = 100 }) => {
    const raw = String(brightnessEdit.value ?? "").trim();
    if (raw === "") {
      cancelBrightnessEdit();
      return;
    }
    const n = Math.round(Number(raw));
    if (Number.isNaN(n)) {
      cancelBrightnessEdit();
      return;
    }
    const clamped = Math.max(Number(min), Math.min(Number(max), n));
    onChange({ brightness: clamped });
    cancelBrightnessEdit();
  };

  const beginCctEdit = (currentValue) => {
    setCctEdit({ isEditing: true, value: String(currentValue ?? "") });
  };

  const cancelCctEdit = () => {
    setCctEdit({ isEditing: false, value: "" });
  };

  const commitCctEdit = ({ min = 2700, max = 7000 }) => {
    const raw = String(cctEdit.value ?? "").trim();
    if (raw === "") {
      cancelCctEdit();
      return;
    }
    const n = Math.round(Number(raw));
    if (Number.isNaN(n)) {
      cancelCctEdit();
      return;
    }
    const clamped = Math.max(Number(min), Math.min(Number(max), n));
    onChange({ cct: clamped });
    cancelCctEdit();
  };

  if (isSwitchType) {
    const isOn = safeValues.on_off === 'On';
    return (
      <Box
        sx={{
          bgcolor: '#fff',
          borderRadius: 0.5,
          pt: 0.5,
          pb: 0.5,
          pl: 0.5,
          pr: 0.5,
          ...ZONE_CONTROL_CARD_WIDTH_SX,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
          mb: 0.5,
          justifyContent: 'flex-start',
          boxSizing: 'border-box',
          ...highlightSx,
        }}
      >
        <Typography
          fontWeight="bold"
          fontSize={{ xs: 11, md: 13 }}
          sx={{
            flex: 1,
            minWidth: 20,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mr: 0.5,
          }}
        >
          {zone.name}
        </Typography>
        <Box
          onClick={() => !disabled && onChange({ on_off: isOn ? 'Off' : 'On' })}
          sx={{
            width: { xs: 40, md: 48 }, // Increased width
            height: { xs: 16, md: 20 }, // Reduced height
            borderRadius: 999,
            background: disabled ? '#ddd' : '#fff', // White background
            border: `1px solid ${disabled ? '#ddd' : '#000'}`, // Thin black border
            display: 'flex',
            alignItems: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            padding: 1,
            position: 'relative',
            minWidth: { xs: 40, md: 48 }, // Increased width
            ml: 'auto',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Box
            sx={{
              width: { xs: 12, md: 16 }, // Adjusted thumb size
              height: { xs: 12, md: 16 }, // Adjusted thumb size
              borderRadius: '50%',
              background: disabled ? '#bbb' : (isOn ? '#4caf50' : '#f44336'), // Green for ON, red for OFF
              transform: isOn ? `translateX(${isMobile ? 20 : 24}px)` : 'translateX(0)', // Adjusted transform
              transition: 'all 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
              position: 'absolute',
              left: 2,
              top: 2,
            }}
          />
          <Typography
            sx={{
              position: 'absolute',
              left: isOn ? 4 : (isMobile ? 18 : 22), // Position text on opposite side of circle
              top: '50%',
              transform: 'translateY(-50%)',
              color: disabled ? '#999' : buttonColor || '#222',
              fontWeight: 600,
              fontSize: { xs: 9, md: 11 }, // Smaller font
              transition: 'all 0.2s',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              maxWidth: { xs: 20, md: 24 }, // Account for circle size
            }}
          >
            {isOn ? 'ON' : 'OFF'}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (isWhitetuneType) {
    const brightnessMin = zone.brightness_min !== undefined ? zone.brightness_min : 0;
    const brightnessMax = zone.brightness_max !== undefined ? zone.brightness_max : 100;
    const cctMin = zone.cct_min !== undefined ? zone.cct_min : 2700;
    const cctMax = zone.cct_max !== undefined ? zone.cct_max : 7000;

    return (
      <Box sx={{
        mb: 0.5,
        ...ZONE_CONTROL_CARD_WIDTH_SX,
        ...highlightSx,
      }}>
        <Box sx={{
          flex: 1,
          bgcolor: '#fff',
          borderRadius: 0.5,
          p: { xs: 0.5, md: 1 },
          ...ZONE_CONTROL_CARD_WIDTH_SX,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          position: 'relative',
          overflow: 'visible',
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5, // Reduced margin bottom
            height: 16, // Reduced height
            lineHeight: 1.2,
          }}>
            <Typography
              fontWeight="bold"
              fontSize={{ xs: 9, sm: 10, md: 11 }}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                mr: 0.5
              }}
            >
              {zone.name}
            </Typography>
            <Typography
              fontSize={{ xs: 8, sm: 9, md: 10 }}
              fontWeight={700}
              sx={{
                color: '#1E74C5',
                background: '#f5f5f5',
                px: 0.3,
                py: 0.1,
                borderRadius: 0.5,
                border: '1px solid #ddd',
                minWidth: 24,
                textAlign: 'center',
                flexShrink: 0,
                cursor: disabled ? 'default' : 'text',
              }}
              onClick={() => {
                if (disabled) return;
                const current = safeValues.brightness !== undefined ? safeValues.brightness : brightnessMin;
                beginBrightnessEdit(current);
              }}
            >
              {brightnessEdit.isEditing && !disabled ? (
                <TextField
                  value={brightnessEdit.value}
                  size="small"
                  variant="standard"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { textAlign: 'center', fontWeight: 700, fontSize: 10, width: 26 }
                  }}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^\d]/g, '');
                    setBrightnessEdit((prev) => ({ ...prev, value: next }));
                  }}
                  onBlur={() => commitBrightnessEdit({ min: brightnessMin, max: brightnessMax })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitBrightnessEdit({ min: brightnessMin, max: brightnessMax });
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelBrightnessEdit();
                    }
                  }}
                />
              ) : (
                `${safeValues.brightness !== undefined ? safeValues.brightness : brightnessMin}%`
              )}
            </Typography>
          </Box>

          {/* Brightness Slider */}
          <Box sx={{ ...ZONE_CONTROL_SLIDER_WRAP_SX, mt: 0.5 }}>
            <Slider
              min={brightnessMin}
              max={brightnessMax}
              value={safeValues.brightness}
              onChange={(_, v) => onChange({ brightness: v })}
              disabled={disabled}
              sx={{
                color: '#222',
                height: { xs: 2, md: 3 },
                '& .MuiSlider-thumb': {
                  width: { xs: 8, md: 10 },
                  height: { xs: 8, md: 10 },
                  bgcolor: '#222',
                  boxShadow: 'none',
                },
                '& .MuiSlider-rail': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
                '& .MuiSlider-track': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
              }}
            />
          </Box>

          {/* CCT value box — same style/behavior as brightness % */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              mt: 0.8,
              mb: 0.3,
              height: 16,
              lineHeight: 1.2,
              pr: { xs: 0.5, md: 1 },
            }}
          >
            <Typography
              fontSize={{ xs: 8, sm: 9, md: 10 }}
              fontWeight={700}
              sx={{
                color: '#1E74C5',
                background: '#f5f5f5',
                px: 0.3,
                py: 0.1,
                borderRadius: 0.5,
                border: '1px solid #ddd',
                minWidth: 36,
                textAlign: 'center',
                flexShrink: 0,
                cursor: disabled ? 'default' : 'text',
              }}
              onClick={() => {
                if (disabled) return;
                const current = safeValues.cct !== undefined ? safeValues.cct : cctMin;
                beginCctEdit(current);
              }}
            >
              {cctEdit.isEditing && !disabled ? (
                <TextField
                  value={cctEdit.value}
                  size="small"
                  variant="standard"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { textAlign: 'center', fontWeight: 700, fontSize: 10, width: 34 },
                  }}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^\d]/g, '');
                    setCctEdit((prev) => ({ ...prev, value: next }));
                  }}
                  onBlur={() => commitCctEdit({ min: cctMin, max: cctMax })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitCctEdit({ min: cctMin, max: cctMax });
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelCctEdit();
                    }
                  }}
                />
              ) : (
                `${safeValues.cct !== undefined ? safeValues.cct : cctMin}K`
              )}
            </Typography>
          </Box>

          {/* CCT Slider */}
          <Box sx={{ ...ZONE_CONTROL_SLIDER_WRAP_SX, mt: 0.2 }}>
            <Slider
              min={cctMin}
              max={cctMax}
              value={safeValues.cct}
              onChange={(_, v) => onChange({ cct: v })}
              disabled={disabled}
              sx={{
                color: '#FFD600',
                height: { xs: 2, md: 3 },
                '& .MuiSlider-thumb': {
                  width: { xs: 8, md: 10 },
                  height: { xs: 8, md: 10 },
                  bgcolor: '#FFD600',
                  boxShadow: 'none',
                },
                '& .MuiSlider-rail': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
                '& .MuiSlider-track': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
              }}
            />
          </Box>

          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: { xs: 7, md: 9 },
            color: '#1E74C5',
            mt: 0.8 // Increased margin top
          }}>
            <span>{cctMin}K</span>
            <span>{cctMax}K</span>
          </Box>
        </Box>
      </Box>
    );
  }

  if (isDimmedType) {
    return (
      <Box sx={{
        mb: 0.5,
        ...ZONE_CONTROL_CARD_WIDTH_SX,
        ...highlightSx,
      }}>
        <Box sx={{
          flex: 1,
          bgcolor: '#fff',
          borderRadius: 0.5,
          pt: 0.5,
          pb: 0,
          pl: 0.5,
          pr: 0.5,
          ...ZONE_CONTROL_CARD_WIDTH_SX,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          overflow: 'visible',
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5, // Reduced margin bottom
            height: 16, // Reduced height
            lineHeight: 1.2,
          }}>
            <Typography
              fontWeight="bold"
              fontSize={{ xs: 9, sm: 10, md: 11 }}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                mr: 0.5
              }}
            >
              {zone.name}
            </Typography>
            <Typography
              fontSize={{ xs: 8, sm: 9, md: 10 }}
              fontWeight={700}
              sx={{
                color: '#1E74C5',
                background: '#f5f5f5',
                px: 0.3,
                py: 0.1,
                borderRadius: 0.5,
                border: '1px solid #ddd',
                minWidth: 24,
                textAlign: 'center',
                flexShrink: 0,
                cursor: disabled ? 'default' : 'text',
              }}
              onClick={() => {
                if (disabled) return;
                beginBrightnessEdit(safeValues.brightness);
              }}
            >
              {brightnessEdit.isEditing && !disabled ? (
                <TextField
                  value={brightnessEdit.value}
                  size="small"
                  variant="standard"
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    style: { textAlign: 'center', fontWeight: 700, fontSize: 10, width: 26 }
                  }}
                  onChange={(e) => {
                    const next = e.target.value.replace(/[^\d]/g, '');
                    setBrightnessEdit((prev) => ({ ...prev, value: next }));
                  }}
                  onBlur={() => commitBrightnessEdit({ min: 0, max: 100 })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitBrightnessEdit({ min: 0, max: 100 });
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      cancelBrightnessEdit();
                    }
                  }}
                />
              ) : (
                `${safeValues.brightness}%`
              )}
            </Typography>
          </Box>
          <Box sx={{ ...ZONE_CONTROL_SLIDER_WRAP_SX, mt: 0.5 }}>
            <Slider
              min={0}
              max={100}
              value={safeValues.brightness}
              onChange={(_, v) => onChange({ brightness: v })}
              disabled={disabled}
              sx={{
                color: '#222',
                height: { xs: 2, md: 3 },
                '& .MuiSlider-thumb': {
                  width: { xs: 8, md: 10 },
                  height: { xs: 8, md: 10 },
                  bgcolor: '#222',
                  boxShadow: 'none',
                },
                '& .MuiSlider-rail': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
                '& .MuiSlider-track': {
                  height: { xs: 2, md: 3 },
                  borderRadius: 1.5,
                },
              }}
            />
          </Box>
        </Box>
      </Box>
    );
  }
}

function getPolygonBoundingBox(coords) {
  if (!coords.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  const xs = coords.map(pt => pt.x);
  const ys = coords.map(pt => pt.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    minX, minY, maxX, maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Helper function to find the largest value in an array
function arrayLargest(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

function truncateText(text, maxChars) {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)) + '…';
}

function HeatmapPdfSvgViewer({
  containerRef,
  pdfUrl,
  pageDims,
  setPageDims,
  setPdfLoaded,
  scale,
  setScale,
  fitScale,
  hasFit,
  handleFit,
  areas,
  getFill,
  handleAreaClick,
  searchTerm,
  pan,
  setPan,
  searchBounceAnimation,
  isDragging,
  setIsDragging,
  dragStart,
  setDragStart,
  contentBBox,
  boundaryValues,
  getContainerDimensions,
  containerFitMode,
  highlightedAreaId,
  hasActiveAlert,
  findAlertForArea,
  navigate,
  fofpEnabled = false,
  fofpPositions = null,
  fofpConfig = null,
  onFofpZoneClick = null,
  highlightedFofpZone = null,
}) {

  const pdfFile = useMemo(() => buildPdfDocumentFile(pdfUrl), [pdfUrl]);

  // Use A4 dimensions as fallback for consistent rendering
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;

  const transformedContentRef = React.useRef(null);

  const handlePdfPageLoad = (page) => {
    // Must match CorrectCoordinate / backend area coordinates (originalWidth × originalHeight).
    setPageDims({ width: page.originalWidth, height: page.originalHeight });
    setPdfLoaded(true);
  };

  // Pan/drag functionality
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      const canPan = scale > (fitScale || 0) + 0.001;
      if (!canPan) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  };


  const handleMouseMove = (e) => {
    if (isDragging) {
      const newPan = {
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      };
      setPan(newPan);
      e.preventDefault();
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.preventDefault();
    }
  };

  const handleMouseLeave = (e) => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Scroll-based zoom functionality with mouse-centered zoom
  const handleWheel = (e) => {
    // Prevent default behavior and stop propagation
    if (e.cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();

    // Define zoom limits
    const MIN_SCALE = 0.1;
    const MAX_SCALE = 5.0;

    // Determine zoom direction and factor
    const delta = e.deltaY > 0 ? -1 : 1;
    const zoomFactor = 0.15;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta * zoomFactor));

    // Get container dimensions and mouse position
    const rect = e.currentTarget.getBoundingClientRect();
    const containerCenterX = rect.width / 2;
    const containerCenterY = rect.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate mouse position relative to container center
    const mouseRelativeToCenterX = mouseX - containerCenterX;
    const mouseRelativeToCenterY = mouseY - containerCenterY;

    // Calculate the point in the PDF coordinate system that the mouse is pointing at
    // The PDF transform is: translate(-50%, -50%) translate(pan.x, pan.y) scale(scale)
    // So to get the PDF point: (mouse - pan) / scale
    const pdfPointX = (mouseRelativeToCenterX - pan.x) / scale;
    const pdfPointY = (mouseRelativeToCenterY - pan.y) / scale;

    // Calculate new pan values to keep the PDF point under the mouse cursor
    // New transform: translate(-50%, -50%) translate(newPan.x, newPan.y) scale(newScale)
    // So: mouse = newPan + (pdfPoint * newScale)
    const newPanX = mouseRelativeToCenterX - pdfPointX * newScale;
    const newPanY = mouseRelativeToCenterY - pdfPointY * newScale;

    // Apply the new scale and pan
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Compute a base, zoom-independent font size normalized by the floorplan "content width"
  // This keeps label sizes consistent across different PDFs with different coordinate scales.
  const getNormalizedBaseFont = () => {
    // Effective content width from backend boundary if available; otherwise use PDF width
    const contentWidth = boundaryValues
      ? Math.max(1, (boundaryValues.x_right || 0) - (boundaryValues.x_left || 0))
      : Math.max(1, (pageDims?.width || A4_WIDTH));

    // Reference width chosen from common drawings; use sqrt to smooth extremes
    const REFERENCE_WIDTH = 3000;
    const normalization = Math.sqrt(REFERENCE_WIDTH / contentWidth);

    // Smaller, tighter labels
    const base = Math.max(6, Math.min(9, Math.round(7.5 * normalization)));
    return base;
  };

  // Attach wheel event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const wheelHandler = (e) => {
      handleWheel(e);
    };

    container.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      container.removeEventListener('wheel', wheelHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, pan]);


  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        flex: '1 1 auto',
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        bgcolor: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexGrow: 1,
        flexShrink: 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Centered PDF container with proper scaling */}
      <Box
        ref={transformedContentRef}
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '50% 50%',
          width: pageDims ? `${pageDims.width}px` : 'auto',
          height: pageDims ? `${pageDims.height}px` : 'auto',
          maxWidth: 'none',
          maxHeight: 'none',
          overflow: 'visible',
          display: 'block',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        {/* Render full PDF with proper scaling */}
        <Box
          sx={{
            position: 'relative',
            width: pageDims ? `${pageDims.width}px` : 'auto',
            height: pageDims ? `${pageDims.height}px` : 'auto',
            lineHeight: 0,
            overflow: 'visible',
          }}
        >
          {pdfUrl ? (
            <Document file={pdfFile} key={pdfUrl}>
              <Page
                pageNumber={1}
                width={pageDims ? pageDims.width : A4_WIDTH}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                onLoadSuccess={handlePdfPageLoad}
              />
            </Document>
          ) : (
            <CircularProgress />
          )}
          {pageDims && (
            <svg
              width={pageDims.width}
              height={pageDims.height}
              style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'auto' }}
            >
              {(areas || []).map((area, index) => {
                const rings = getPolygonRings(area);
                const flat = flattenAreaCoords(area);
                if (!rings.length && !flat.length) return null;

                // Use coordinates directly - they should already be in the correct PDF coordinate system
                const scaledCoords = flat;

                const points = scaledCoords.map((p) => `${p.x},${p.y}`).join(' ');
                const displayAreaName = area.name || area.area_name || '';
                const center = scaledCoords.length > 0
                  ? (() => {
                    const avgX = scaledCoords.reduce((sum, p) => sum + p.x, 0) / scaledCoords.length;
                    const avgY = scaledCoords.reduce((sum, p) => sum + p.y, 0) / scaledCoords.length;

                    // Targeted fix ONLY for PB OS-24 to ensure it displays correctly in the narrow strip
                    if (displayAreaName === 'PB OS-24') {
                      const xs = scaledCoords.map(p => p.x).sort((a, b) => a - b);
                      const ys = scaledCoords.map(p => p.y).sort((a, b) => a - b);
                      const mid = Math.floor(xs.length / 2);
                      return {
                        x: xs.length % 2 !== 0 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2,
                        y: ys.length % 2 !== 0 ? ys[mid] : (ys[mid - 1] + ys[mid]) / 2
                      };
                    }
                    return { x: avgX, y: avgY };
                  })()
                  : { x: 0, y: 0 };
                const bbox = getPolygonBoundingBox(scaledCoords);

                // Enhanced search highlight - consistent with main search logic
                const q = (searchTerm || "").trim().toLowerCase();
                const fullName = (area.name || area.area_name || "").toLowerCase();
                const areaCode = (area.code || "").toLowerCase();
                const areaId = (area.area_id || area.id || "").toString().toLowerCase();

                // Enhanced search matching - same logic as main search
                let isHighlightedSearch = false;
                if (q) {
                  // Extract OS number from full name (e.g., "PERIYAR 03-22" -> "03-22")
                  const osMatch = fullName.match(/(\d+-\d+)/);
                  const osNumber = osMatch ? osMatch[1] : '';

                  // Extract short name (e.g., "PERIYAR 03-22" -> "periyar")
                  const shortName = fullName.split(' ')[0] || '';

                  // Search patterns:
                  // 1. Full name contains search term
                  // 2. Short name contains search term
                  // 3. OS number contains search term
                  // 4. Area code contains search term
                  // 5. Area ID contains search term
                  isHighlightedSearch = fullName.includes(q) ||
                    shortName.includes(q) ||
                    osNumber.includes(q) ||
                    areaCode.includes(q) ||
                    areaId.includes(q);
                }
                const isHighlightedById = highlightedAreaId && ((area.area_id || area.id) === highlightedAreaId);
                const isHighlighted = !!isHighlightedById || !!isHighlightedSearch;

                // Calculate available space - use more space for larger areas
                const areaSize = Math.min(bbox.width, bbox.height);
                // Use more space for larger areas to show full text
                const spaceFactor = areaSize > 50 ? 0.9 : 0.8;
                const availableWidth = bbox.width * spaceFactor;
                const availableHeight = bbox.height * spaceFactor;

                // Dynamic zoom threshold - show abbreviated text by default, full names after 5 zoom-ins
                // Default scale ~0.88, after 5 clicks: 0.88 + (5 × 0.05) = 1.13
                const baseThreshold = 1.13; // Show full names after 5 zoom-ins from actual default scale

                // NO size adjustments - keep threshold consistent for all areas
                const sizeAdjustment = 0;

                const ZOOM_THRESHOLD = baseThreshold - sizeAdjustment;
                const isZoomedIn = scale > ZOOM_THRESHOLD;

                // Zoom-independent font sizes normalized by floorplan width.
                // Start from a PDF-wide base size, then apply slight adjustments for tiny areas.
                const baseFont = getNormalizedBaseFont();
                let fontSize = baseFont;
                if (areaSize < 40) fontSize = Math.max(5, baseFont - 3);
                else if (areaSize < 80) fontSize = Math.max(5, baseFont - 2);

                const padding = fontSize * 0.1;
                const lineHeight = fontSize * 1.1;

                // Two-line short label: MAIN + OS (or second token). Tooltip shows full name.
                const createTwoLineLabel = (text) => {
                  if (!text) return [];
                  const upper = text.toUpperCase();
                  // Extract OS notation variants
                  const osMatch = upper.match(/OS[-\s]?([\w\-\/]+)/) || upper.match(/\b(\d+[-\/]\d+)\b/);
                  const os = osMatch ? (osMatch[0].startsWith('OS') ? osMatch[0] : `OS-${osMatch[1] || osMatch[0]}`) : '';
                  // Main name: before space or '('; fallback to first token
                  let main = upper.split('(')[0].trim();

                  let line1 = main;
                  let line2 = '';

                  if (os) {
                    if (main.includes(osMatch[0])) {
                      // OS is in the main part
                      if (main === osMatch[0] || main === os) {
                        line1 = main;
                        line2 = '';
                      } else if (main.includes(' ')) {
                        const beforeOs = main.replace(osMatch[0], '').trim();
                        if (beforeOs) {
                          line1 = beforeOs;
                          line2 = os;
                        } else {
                          line1 = os;
                        }
                      } else {
                        // "WS_OS-7"
                        line1 = main;
                        line2 = '';
                      }
                    } else {
                      // OS is in the parenthesis part (e.g. "MEETING ROOM (OS-3)")
                      line1 = main;
                      line2 = os;
                    }
                  } else {
                    // No OS match at all. Split by first space if available.
                    if (main.includes(' ')) {
                      const spaceIdx = main.indexOf(' ');
                      line1 = main.substring(0, spaceIdx);
                      line2 = main.substring(spaceIdx + 1);
                    } else {
                      line1 = main;
                    }
                  }

                  // Character limits vary with area size
                  const mainLimit = areaSize < 40 ? 12 : areaSize < 80 ? 18 : 30;
                  const secondLimit = areaSize < 40 ? 10 : areaSize < 80 ? 15 : 20;

                  line1 = line1.slice(0, mainLimit);
                  if (line2) {
                    line2 = line2.slice(0, secondLimit);
                  }

                  return line2 ? [line1, line2] : [line1];
                };


                const finalLines = createTwoLineLabel(displayAreaName);

                // For extremely small areas, show only essential info or skip text entirely
                const isExtremelySmallForText = areaSize < 20;
                const shouldShowText = !isExtremelySmallForText || (isExtremelySmallForText && isZoomedIn);

                // Check if this area has active alerts
                const areaHasAlert = hasActiveAlert && hasActiveAlert(displayAreaName);
                if (areaHasAlert) {
                }

                // Calculate background dimensions with improved text accommodation
                const charWidth = fontSize * 0.5; // Conservative character width estimation
                const maxLineWidth = Math.max(...finalLines.map(line => line.length * charWidth));

                // Set background dimensions based on area size (simplified since we only show abbreviated text)
                const isExtremelySmallForBg = areaSize < 30;
                const isVerySmallArea = areaSize < 60;
                const isSmallArea = areaSize < 120;

                let backgroundWidth, backgroundHeight;

                if (isExtremelySmallForBg) {
                  // Extremely small areas - compact background
                  backgroundWidth = Math.min(maxLineWidth + (padding * 4), availableWidth * 0.9);
                  backgroundHeight = Math.min(finalLines.length * lineHeight + (padding * 4), availableHeight * 0.9);
                } else if (isVerySmallArea) {
                  // Very small areas - compact background
                  backgroundWidth = Math.min(maxLineWidth + (padding * 6), availableWidth * 0.9);
                  backgroundHeight = Math.min(finalLines.length * lineHeight + (padding * 4), availableHeight * 0.9);
                } else if (isSmallArea) {
                  // Small areas - balanced approach
                  backgroundWidth = Math.min(maxLineWidth + (padding * 8), availableWidth * 0.9);
                  backgroundHeight = Math.min(finalLines.length * lineHeight + (padding * 6), availableHeight * 0.9);
                } else {
                  // Normal areas - standard spacing
                  backgroundWidth = Math.min(maxLineWidth + (padding * 6), availableWidth * 0.9);
                  backgroundHeight = Math.min(finalLines.length * lineHeight + (padding * 6), availableHeight * 0.9);
                }

                return (
                  <g key={index}>
                    {/* Define clipping path for this area */}
                    <defs>
                      <clipPath id={`clip-${index}`}>
                        <polygon points={points} />
                      </clipPath>
                    </defs>

                    {/* Base polygon with tooltip - scales with zoom */}
                    <polygon
                      points={points}
                      fill={getFill(area)}
                      stroke={'#000'}
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      onClick={() => handleAreaClick(area)}
                      style={{
                        cursor: 'pointer',
                        pointerEvents: 'auto'
                      }}
                    >
                      {/* Tooltip showing full area name on hover */}
                      <title>{displayAreaName}</title>
                    </polygon>
                    {center.x && center.y && displayAreaName && finalLines.length > 0 && shouldShowText && (
                      <>
                        {/* Multi-line text - consistent size, positioned within the area with strict clipping */}
                        <g
                          clipPath={`url(#clip-${index})`}
                        >
                          {/* White background rectangle for text */}
                          <rect
                            x={center.x - (backgroundWidth / 2)}
                            y={center.y - (backgroundHeight / 2)}
                            width={backgroundWidth}
                            height={backgroundHeight}
                            fill="white"
                            fillOpacity="0.9"
                            stroke="none"
                            rx="2"
                            ry="2"
                          />
                          {finalLines.map((line, lineIndex) => {
                            // Simple centered text positioning
                            const textX = center.x;
                            const textY = center.y - (finalLines.length * lineHeight / 2) + (lineIndex * lineHeight) + (lineHeight / 2);

                            return (
                              <text
                                key={lineIndex}
                                x={textX}
                                y={textY}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={fontSize}
                                fill={areaHasAlert ? '#d32f2f' : (isHighlighted ? '#b71c1c' : '#000')}
                                stroke="none"
                                fontWeight="600"
                                style={{
                                  pointerEvents: 'none',
                                  userSelect: 'none',
                                  fontFamily: 'Arial, sans-serif',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {line}
                              </text>
                            );
                          })}
                        </g>
                      </>
                    )}

                    {/* Red alert icon overlay for areas with active alerts */}
                    <g
                      key={area.area_id || area.id || index}
                      onClick={() => handleAreaClick(area)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* ALERT ICON */}
                      {hasActiveAlert(area.name || area.area_name) && center.x && center.y && (
                        <g
                          onClick={(e) => {
                            e.stopPropagation(); // prevents area click
                            const areaName = area.name || area.area_name || '';
                            const matchedAlert = findAlertForArea(areaName);
                            navigate("/dashboard/alerts", {
                              state: {
                                focusAlert: {
                                  areaName,
                                  location: matchedAlert?.location || null,
                                  alertType: matchedAlert?.alert_type || null,
                                  deviceName: matchedAlert?.device_name || null,
                                  serialNo: matchedAlert?.serial_no || null,
                                  reportedTime: matchedAlert?.reported_time || null,
                                  time: matchedAlert?.time || null,
                                }
                              }
                            });
                          }}
                          style={{
                            cursor: "pointer",
                            pointerEvents: "all", // critical
                          }}
                        >
                          {/* invisible bigger click area (VERY IMPORTANT) */}
                          <circle
                            cx={center.x + fontSize * 3.2}
                            cy={center.y + fontSize * 2.0}
                            r={12}
                            fill="transparent"
                            style={{ pointerEvents: "all" }}
                          />

                          {/* triangle */}
                          <polygon
                            points={`
          ${center.x + fontSize * 3.2},${center.y + fontSize * 1.2}
          ${center.x + fontSize * 2.4},${center.y + fontSize * 2.6}
          ${center.x + fontSize * 4.0},${center.y + fontSize * 2.6}
        `}
                            fill="red"
                            stroke="#fff"
                            strokeWidth="2"
                            style={{ pointerEvents: "all" }}
                          />

                          {/* exclamation */}
                          <text
                            x={center.x + fontSize * 3.2}
                            y={center.y + fontSize * 2.1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={fontSize * 0.9}
                            fill="#fff"
                            style={{ pointerEvents: "none" }}
                          >
                            !
                          </text>
                        </g>
                      )}
                    </g>
                    {/* {areaHasAlert && center.x && center.y && (
                    <g style={{ pointerEvents: 'none' }}> */}
                    {/* Warning triangle icon */}
                    {/* <polygon
                        points={`
    			  ${center.x + fontSize * 3.2},${center.y + fontSize * 1.2}
    			  ${center.x + fontSize * 2.4},${center.y + fontSize * 2.6}
    			  ${center.x + fontSize * 4.0},${center.y + fontSize * 2.6}
  		      	`}
                        fill="#ff0000"
                        stroke="#ffffff"
                        strokeWidth="1"
                        opacity="0.95"
                      /> */}

                    {/* Exclamation mark */}
                    {/* <text
                        x={center.x + fontSize * 3.2}
                        y={center.y + fontSize * 2.1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={fontSize * 0.9}
                        fill="#ffffff"
                        fontWeight="bold"
                        style={{
                          pointerEvents: 'none',
                          fontFamily: 'Arial, sans-serif'
                        }}
                      >
                        !
                      </text>
                    </g>
                  )} */}

                    {/* Enhanced highlight overlay with red color, thicker border, and continuous bounce animation */}
                    {isHighlighted && (
                      <g
                        style={{
                          pointerEvents: 'none',
                          animation: searchBounceAnimation ? 'searchBounce 1.5s ease-in-out infinite' : 'none'
                        }}
                      >
                        <polygon
                          points={points}
                          fill={'none'}
                          stroke={'#ff0000'}
                          strokeWidth={8}
                          vectorEffect="non-scaling-stroke"
                          strokeDasharray="10,5"
                          opacity={1.0}
                        />
                        {/* Additional inner highlight for better visibility */}
                        <polygon
                          points={points}
                          fill={'rgba(255, 0, 0, 0.15)'}
                          stroke={'#ff0000'}
                          strokeWidth={4}
                          vectorEffect="non-scaling-stroke"
                          opacity={0.8}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
          {fofpEnabled && pageDims && (
            <FOFPOverlayBoundary>
              <FOFPOverlay
                enabled={fofpEnabled}
                positions={fofpPositions}
                config={fofpConfig}
                width={pageDims.width}
                height={pageDims.height}
                onZoneClick={onFofpZoneClick}
                highlightedFofpZone={highlightedFofpZone}
              />
            </FOFPOverlayBoundary>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default HeatMap;


