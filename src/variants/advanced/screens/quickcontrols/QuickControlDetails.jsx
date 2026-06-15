import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchQuickControlDetails,
  triggerQuickControl,
  deleteQuickControl,
  updateQuickControl,
  createQuickControl,
  clearSelectedControl
} from '../../redux/slice/quickcontrols/quickControlSlice';
import { useNavigate, useParams } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { ConfirmDialog, Toast } from "../../utils/FeedbackUI";
import AreaTreeDialog from './AreaTreeDialog';
import Action from './Action';
import { BaseUrl } from '../../BaseUrl';
import { UseAuth } from '../../customhooks/UseAuth';
import { fetchFloors, selectFloors } from '../../redux/slice/floor/floorSlice';
import { MenuItem, Select } from "@mui/material";
import {
  scheduleFormCardStyle,
  scheduleLocationRowStyle,
  scheduleLocationTextStyle,
  schedulePanelLabel,
  schedulePrimaryButtonStyle,
  scheduleRightHeaderStyle,
  scheduleRightListScrollStyle,
  scheduleRightPanelStyle,
  scheduleSmallActionButtonStyle,
  scheduleTextInputStyle,
  scheduleFixedActionBarStyle,
  schedulePageWithFixedActionBarStyle,
} from "../../utils/scheduleCreateStyles";
import {
  scheduleFilterMenuProps,
  scheduleSelectFieldSx,
} from "../../utils/scheduleSelectMenuProps";
import {
  QC_MODAL_LABEL,
  QC_RADIO_BORDER,
  QC_RADIO_CHECKED_FILL,
  QC_RADIO_UNCHECKED_FILL,
} from "../../utils/quickControlTheme";
import {
  loadAreaTreeIndex,
  formatQuickControlAreaLocationLabel,
  getFloorsList,
  saveLocationMeta,
  LOCATION_ENTITY,
} from '../../utils/scheduleLocationPath';
import {
  applyCommonActionToActions,
  stripActionSource,
  tagAreasWithLoadedActions,
  withIndividualSource,
} from '../../utils/scheduleActionPriority';

const QuickControlDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const buttonColor = "var(--app-button)";
  const modalBg = 'var(--schedule-modal-bg, #d6dde8)';
  const modalTitleColor = 'var(--schedule-modal-title-color, #000000)';
  const schedulePanelInputStyle = (enabled) => ({
    border: "1px solid var(--schedule-panel-border, #ccc)",
    background: "var(--schedule-select-bg, #fff)",
    color: enabled ? buttonColor : schedulePanelLabel,
    outline: "none",
    boxSizing: "border-box",
  });

  // Get user authentication and role
  const { role } = UseAuth();
  const userProfile = useSelector((state) => state.user?.profile);
  
  // Direct role checking for Quick Control permissions
  const canCreateQuickControl = () => {
    // Superadmin and Admin can always create Quick Controls
    if (role === 'Superadmin' || role === 'Admin') {
      return true;
    }
    
    // For Operators, check if they have monitor_control_edit permission
    if (role === 'Operator' && userProfile && userProfile.floors) {
      const hasMonitorControlEdit = userProfile.floors.some(f => f.floor_permission === 'monitor_control_edit');
      return hasMonitorControlEdit;
    }
    
    return false;
  };
  
  const canModifyQuickControl = () => {
    // Superadmin and Admin can always modify Quick Controls
    if (role === 'Superadmin' || role === 'Admin') {
      return true;
    }
    
    // For Operators, check if they have monitor_control_edit permission
    if (role === 'Operator' && userProfile && userProfile.floors) {
      const hasMonitorControlEdit = userProfile.floors.some(f => f.floor_permission === 'monitor_control_edit');
      return hasMonitorControlEdit;
    }
    
    return false;
  };
  
  const canDeleteQuickControl = () => {
    // Superadmin and Admin can always delete Quick Controls
    if (role === 'Superadmin' || role === 'Admin') {
      return true;
    }
    
    // For Operators, check if they have monitor_control_edit permission
    if (role === 'Operator' && userProfile && userProfile.floors) {
      const hasMonitorControlEdit = userProfile.floors.some(f => f.floor_permission === 'monitor_control_edit');
      return hasMonitorControlEdit;
    }
    
    return false;
  };
  
  const canTriggerQuickControl = () => {
    // Superadmin and Admin can always trigger Quick Controls
    if (role === 'Superadmin' || role === 'Admin') {
      return true;
    }
    
    // For Operators, check if they have monitor_control or monitor_control_edit permission
    if (role === 'Operator' && userProfile && userProfile.floors) {
      const hasMonitorControl = userProfile.floors.some(f => 
        f.floor_permission === 'monitor_control' || f.floor_permission === 'monitor_control_edit'
      );
      return hasMonitorControl;
    }
    
    return false;
  };

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setWindowSize({ width, height: window.innerHeight });
      setIsTablet(width >= 768 && width <= 1024);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const isLargeScreen = windowSize.width >= 1920;
  const isDesktop = windowSize.width >= 1366;

  const {
    selectedControl,
    selectedControlLoading,
    triggerStatus,
    deleteStatus,
    updateStatus,
    error // Add this to get error messages
  } = useSelector((state) => state.quickControl);

  const floors = useSelector(selectFloors);
  const [areaTreeIndex, setAreaTreeIndex] = useState(null);
  const [areaTreeIndexLoading, setAreaTreeIndexLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    const floorList = getFloorsList(floors);
    if (!floorList.length) return;

    (async () => {
      try {
        setAreaTreeIndexLoading(true);
        const map = await loadAreaTreeIndex(floorList, (floorId) =>
          BaseUrl.get(`/floor/area_tree/${floorId}`)
        );
        if (!cancelled) setAreaTreeIndex(map);
      } finally {
        if (!cancelled) setAreaTreeIndexLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [floors]);

  const [editMode, setEditMode] = useState(false);
  const [editableControl, setEditableControl] = useState(null);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const location = useLocation();
  
  const isCopyEdit = location?.state?.isCopy === true;
  const [isEditing, setIsEditing] = useState(isCopyEdit || false);

  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "" });
  
  // Add confirmation dialog states for delete operations
  const [showDeleteQuickControlDialog, setShowDeleteQuickControlDialog] = useState(false);
  const [showDeleteActionDialog, setShowDeleteActionDialog] = useState(false);
  const [actionToDelete, setActionToDelete] = useState(null);
  
  // New state for editing functionality
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [actionDialogIdx, setActionDialogIdx] = useState(null);
  const [selectedActionData, setSelectedActionData] = useState(null);

  // New state for common action functionality
  const [showCommonActionDialog, setShowCommonActionDialog] = useState(false);
  const [selectedCommonActionType, setSelectedCommonActionType] = useState('light_status');
  const [selectedOccupancySetting, setSelectedOccupancySetting] = useState(null);
  const [selectedZoneType, setSelectedZoneType] = useState('switched');
  const [lightStatusSettings, setLightStatusSettings] = useState({
    switched: { on_off: 'On' },
    dimmed: { brightness: 50, fadeTime: '02', delayTime: '00' },
    whitetune: { brightness: 50, cct: 2700, fadeTime: '02', delayTime: '00' }
  });

  // New state for zone names
  const [zoneNames, setZoneNames] = useState({});

  // Helper function to decode HTML entities
  const decodeHtmlEntities = (text) => {
    if (!text) return text;
    return text
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  };

  // Add action display function like ScheduleDetails
  const renderActionDisplay = (action) => {
    // Handle area_status actions (from common action for On/Off)
    if (action.type === "area_status") {
      const status = action.area_status || "Off";
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Area Status: {status}</div>;
    }
    
    // Handle zone_status actions (for specific zone controls with brightness/temperature)
    if (action.type === "zone_status") {
      const status = action.zone_status || action.switched_state;
      const brightness = action.zone_brightness || action.level;
      const temperature = action.zone_temperature || action.kelvin;
      const zoneType = action.zone_type;
      
      // For zone_status with specific zone_id, show zone details
      if (action.zone_id) {
        const zoneName = action.zone_name || `Zone ${action.zone_id}`;
        let displayText = `Zone: ${zoneName}`;
        
        if (zoneType === "switched") {
          const switchedState = action.switched_state || action.zone_status;
          displayText += ` (${switchedState})`;
        } else if (zoneType === "dimmed") {
          const switchedState = action.zone_status || "On";
          let brightnessValue = action.zone_brightness;
          if (brightnessValue && typeof brightnessValue === 'string') {
            brightnessValue = brightnessValue.includes('%') ? brightnessValue : `${brightnessValue}%`;
          }
          if (brightnessValue) {
            displayText += ` (${switchedState}, ${brightnessValue})`;
          } else {
            displayText += ` (${switchedState})`;
          }
        } else if (zoneType === "whitetune") {
          const switchedState = action.zone_status || "On";
          let brightnessValue = action.zone_brightness;
          let temperatureValue = action.zone_temperature;
          
          if (brightnessValue && typeof brightnessValue === 'string') {
            brightnessValue = brightnessValue.includes('%') ? brightnessValue : `${brightnessValue}%`;
          }
          if (temperatureValue && typeof temperatureValue === 'string') {
            temperatureValue = temperatureValue.includes('K') ? temperatureValue : `${temperatureValue}K`;
          }
          
          if (brightnessValue && temperatureValue) {
            displayText += ` (${switchedState}, ${brightnessValue}, ${temperatureValue})`;
          } else if (brightnessValue) {
            displayText += ` (${switchedState}, ${brightnessValue})`;
          } else if (temperatureValue) {
            displayText += ` (${switchedState}, ${temperatureValue})`;
          } else {
            displayText += ` (${switchedState})`;
          }
        } else {
          displayText += ` (${status || "Off"})`;
        }
        
        return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{displayText}</div>;
      }
      
      // Fallback for zone_status without zone_id (shouldn't happen, but handle gracefully)
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Area Status: {status || "Off"}</div>;
    }
    
    // Handle zone actions from Action component (NEW: This is the missing part!)
    if (action.type === "zone" && action.zone) {
      const zoneName = action.zone.name || action.zone.id || 'Zone';
      const zoneType = action.zone.type;
      const values = action.values || {};
      
      let displayText = `Zone: ${zoneName}`;
      
      if (zoneType === "switched") {
        displayText += ` (${values.on_off || "Off"})`;
      } else if (zoneType === "dimmed") {
        // ONLY show brightness if it's actually set - NO DEFAULTS
        if (values.brightness !== undefined) {
          let brightnessValue = values.brightness;
          if (typeof brightnessValue === 'string') {
            // Only add % if it doesn't already exist
            brightnessValue = brightnessValue.includes('%') ? brightnessValue : `${brightnessValue}%`;
          } else {
            brightnessValue = `${brightnessValue}%`;
          }
          displayText += ` (On, ${brightnessValue})`;
        } else {
          displayText += ` (On)`; // Don't show brightness if not set
        }
      } else if (zoneType === "whitetune") {
        // ONLY show values if they're actually set - NO DEFAULTS
        let brightnessValue = null;
        let cctValue = null;
        
        if (values.brightness !== undefined) {
          brightnessValue = values.brightness;
          if (typeof brightnessValue === 'string') {
            brightnessValue = brightnessValue.includes('%') ? brightnessValue : `${brightnessValue}%`;
          } else {
            brightnessValue = `${brightnessValue}%`;
          }
        }
        
        if (values.cct !== undefined) {
          cctValue = values.cct;
          if (typeof cctValue === 'string') {
            cctValue = cctValue.includes('K') ? cctValue : `${cctValue}K`;
          } else {
            cctValue = `${cctValue}K`;
          }
        }
        
        if (brightnessValue && cctValue) {
          displayText += ` (On, ${brightnessValue}, ${cctValue})`;
        } else if (brightnessValue) {
          displayText += ` (On, ${brightnessValue})`;
        } else if (cctValue) {
          displayText += ` (On, ${cctValue})`;
        } else {
          displayText += ` (On)`; // Don't show values if not set
        }
      } else {
        // Generic zone handling
        if (values.on_off === "Off") {
          displayText += " (Off)";
        } else {
          displayText += " (On)";
          if (values.brightness !== undefined) {
            let brightnessValue = values.brightness;
            if (typeof brightnessValue === 'string') {
              brightnessValue = brightnessValue.includes('%') ? brightnessValue : `${brightnessValue}%`;
            } else {
              brightnessValue = `${brightnessValue}%`;
            }
            displayText += `, ${brightnessValue}`;
          }
          if (values.cct !== undefined) {
            let cctValue = values.cct;
            if (typeof cctValue === 'string') {
              cctValue = cctValue.includes('K') ? cctValue : `${cctValue}K`;
            } else {
              cctValue = `${cctValue}K`;
            }
            displayText += `, ${cctValue}`;
          }
        }
      }
      
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>{displayText}</div>;
    }
    
    // Handle occupancy actions (from common action)
    if (action.type === "occupancy") {
      let occLabel = "";
      if (action.occupancy_setting) {
        const setting = action.occupancy_setting;
        if (setting.toLowerCase() === "disabled") occLabel = "Disabled";
        else if (setting.toLowerCase() === "auto") occLabel = "Auto";
        else if (setting.toLowerCase() === "vacancy") occLabel = "Vacancy";
        else occLabel = setting;
      } else if (action.action) {
        const setting = action.action;
        if (setting.toLowerCase() === "disabled") occLabel = "Disabled";
        else if (setting.toLowerCase() === "auto") occLabel = "Auto";
        else if (setting.toLowerCase() === "vacancy") occLabel = "Vacancy";
        else occLabel = setting;
      }
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Occupancy Setting: {occLabel}</div>;
    }
    
    // Handle other action types
    if (action.type === "scene" && action.scene) {
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Scene: {action.scene.name}</div>;
    }
    
    if (action.type === "set_scene") {
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Scene: {action.scene_name}</div>;
    }
    
    if (action.type === "shade" && action.shade) {
      return (
        <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
          Shade: {action.shade.name} ({action.value}% Open)
        </div>
      );
    }
    
    if (action.type === "shade_group_status") {
      let shadeLevel = action.shade_level;
      if (typeof shadeLevel === "string") {
        // Only add % if it doesn't already exist
        shadeLevel = shadeLevel.includes('%') ? shadeLevel : `${shadeLevel}%`;
      }
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Shade: {action.shade_group_name} ({shadeLevel})</div>;
    }
    
    if (action.type === "device" && action.device) {
      return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Device: {action.device.name}</div>;
    }
    
    return <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Unknown action</div>;
  };

  // Function to fetch zone names
  const fetchZoneNames = async (areaId, zoneId) => {
    try {
      const response = await BaseUrl.post("/area/zone_status", { area_id: areaId });
      const zones = response.data?.zones || [];
      const zone = zones.find(z => String(z.id || z.zone_id) === String(zoneId));
      return zone?.name || `Zone ${zoneId}`;
    } catch (error) {
      return `Zone ${zoneId}`;
    }
  };

  // Function to get zone name (with caching)
  const getZoneName = async (areaId, zoneId) => {
    const cacheKey = `${areaId}-${zoneId}`;
    if (zoneNames[cacheKey]) {
      return zoneNames[cacheKey];
    }
    
    const zoneName = await fetchZoneNames(areaId, zoneId);
    setZoneNames(prev => ({ ...prev, [cacheKey]: zoneName }));
    return zoneName;
  };

  // Always fetch details from API when this page loads or id changes
  useEffect(() => {
    dispatch(fetchQuickControlDetails(id));
  
    if (location.state?.edit) {
      setEditMode(true);
    }
  
    return () => {
      dispatch(clearSelectedControl());
    };
  }, [dispatch, id]);

  // Fetch zone names when selectedControl changes
  useEffect(() => {
    if (selectedControl?.quick_control_areas) {
      selectedControl.quick_control_areas.forEach(area => {
        area.actions?.forEach(action => {
          if (action.type === 'zone_status' && action.zone_id && area.area_id) {
            getZoneName(area.area_id, action.zone_id);
          }
        });
      });
    }
  }, [selectedControl]);



  // Actions
  const handleTrigger = () => setShowConfirm(true);

  const doTrigger = async () => {
    setShowConfirm(false);
    try {
      if (selectedControl) await dispatch(triggerQuickControl(selectedControl.id));
      setToast({ open: true, message: "Triggered successfully!" });
    } catch (e) {
      setToast({ open: true, message: e?.message || "Trigger failed" });
    }
  };

  const handleDelete = () => {
    setShowDeleteQuickControlDialog(true);
  };

  const confirmDeleteQuickControl = async () => {
    if (!selectedControl) return;
    
    try {
      await dispatch(deleteQuickControl(selectedControl.id)).unwrap();
      
      // If successful, navigate back
      navigate('/quickcontrols');
    } catch (error) {
      // Check if it's a schedule usage error
      if (error && error.includes("being used by")) {
        setToast({ 
          open: true, 
          message: error 
        });
      } else {
        setToast({ 
          open: true, 
          message: "Failed to delete Quick Control. Please try again." 
        });
      }
    }
    
    setShowDeleteQuickControlDialog(false);
  };

  // Always use selectedControl (from API) for copy
  const handleCopy = () => {
    if (!selectedControl || updateStatus === 'loading') return;
    setEditMode(true);
    setIsCopyMode(true);
    // Deep copy and reset name
    const copy = JSON.parse(JSON.stringify(selectedControl));
    copy.name = `Copy of ${copy.name}`;
    copy.id = undefined; // Remove id so it's not mistaken for update
    copy.quick_control_areas = tagAreasWithLoadedActions(copy.quick_control_areas);
    setEditableControl(copy);
  };

  // Always use selectedControl (from API) for modify
  const handleModify = () => {
    if (!selectedControl) return;
    setEditMode(true);
    const editable = JSON.parse(JSON.stringify(selectedControl));
    editable.quick_control_areas = tagAreasWithLoadedActions(editable.quick_control_areas);
    setEditableControl(editable);
  };

  // Handle location changes
  const handleAddLocations = (areas) => {
    const added = areas.map((a) => ({
      floor_id: a.floorId,
      floor_name: a.floorName,
      area_id: a.areaId,
      area_name: a.areaName,
      area_code: a.areaCode,
      actions: [],
    }));

    setEditableControl((prev) => ({
      ...prev,
      quick_control_areas: [...prev.quick_control_areas, ...added],
    }));

    if (id) {
      saveLocationMeta(LOCATION_ENTITY.QUICK_CONTROL, id, added);
    }
  };

  const handleRemoveLocation = (index) => {
    setEditableControl(prev => ({
      ...prev,
      quick_control_areas: prev.quick_control_areas.filter((_, i) => i !== index)
    }));
  };

  // Handle action changes
  const handleOpenActionDialog = (idx) => {
    if (!editableControl) {
      return;
    }
    setActionDialogIdx(idx);
    setSelectedActionData(null);
  };

  // Add action to location - EXACT SAME AS ScheduleDetails
  const handleAddAction = (idx, actionData) => {
    setEditableControl(prev => ({
      ...prev,
      quick_control_areas: prev.quick_control_areas.map((loc, i) => {
        if (i !== idx) return loc;
        
        // Convert action data to the correct format for the API
        let newAction = actionData;
        
        if (actionData.type === "scene" && actionData.scene) {
          newAction = {
            type: "set_scene",
            scene_code: Number(actionData.scene.id), // Convert to number
            scene_name: actionData.scene.name
          };
        } else if (actionData.type === "zone" && actionData.zone) {
          // Check if this is a simple On/Off for switched zone without zone_id (area-level control)
          if (actionData.zone.type === "switched" && 
              (!actionData.zone.id || actionData.zone.id === null) &&
              actionData.values?.on_off &&
              !actionData.values.brightness &&
              !actionData.values.cct) {
            // Use area_status for simple On/Off area control (uses /area/zone_on-off API)
            newAction = {
              type: "area_status",
              area_status: actionData.values.on_off
            };
          } else {
            // For specific zone controls, use zone_status
            newAction = {
              type: "zone_status",
              zone_id: Number(actionData.zone.id || actionData.zone.zone_id),
              zone_type: actionData.zone.type,
              zone_name: actionData.zone.name,
              zone_status: actionData.values?.on_off || "Off"
            };
            
            // ONLY set brightness if user actually provided a value
            if (actionData.values && actionData.values.brightness !== undefined && actionData.values.brightness !== null) {
              newAction.zone_brightness = actionData.values.brightness.toString().includes('%') ? actionData.values.brightness : `${actionData.values.brightness}%`;
            }
            
            // ONLY set temperature if user actually provided a value
            if (actionData.values && actionData.values.cct !== undefined && actionData.values.cct !== null) {
              newAction.zone_temperature = actionData.values.cct.toString().includes('K') ? actionData.values.cct : `${actionData.values.cct}K`;
            }
          
            // Add fade and delay times for dimmed and whitetune zones
            if (actionData.zone.type === "dimmed" || actionData.zone.type === "whitetune") {
              newAction.fade_time = actionData.values?.fadeTime || "02";
              newAction.delay_time = actionData.values?.delayTime || "00";
            }
          }
        } else if (actionData.type === "occupancy" && actionData.action) {
          newAction = {
            type: "occupancy",
            occupancy_setting: actionData.action
          };
        } else if (actionData.type === "shade" && actionData.shade) {
          newAction = {
            type: "shade_group_status",
            shade_group_id: Number(actionData.shade.id || actionData.shade.zone_id),
            shade_group_name: actionData.shade.name,
            shade_level: actionData.value.toString().includes('%') ? actionData.value : `${actionData.value}%`
          };
        }
        
        // COMPLETELY REPLACE all actions with the new one (remove all old actions)
        return { ...loc, actions: [withIndividualSource(newAction)] };
      })
    }));
    setActionDialogIdx(null);
    setSelectedActionData(null);
  };

  // Handle edit action - SIMPLIFIED (same as CreateQuickControl)
  const handleEditAction = (locationIdx, actionIdx) => {
    const location = editableControl.quick_control_areas[locationIdx];
    const action = location.actions[actionIdx];
    
    // Convert action to the format expected by Action component
    let convertedAction = null;
    
    if (action.type === "set_scene") {
      convertedAction = {
        type: "scene",
        scene: {
          id: action.scene_code || action.scene_id,
          name: action.scene_name
        }
      };
    } else if (action.type === "area_status") {
      // For area_status, convert to zone action with switched type for editing
      convertedAction = {
        type: "zone",
        zone: {
          id: null,
          name: "Area",
          type: "switched"
        },
        values: {
          on_off: action.area_status || "Off"
        }
      };
    } else if (action.type === "zone_status") {
      convertedAction = {
        type: "zone",
        zone: {
          id: action.zone_id,
          name: action.zone_name,
          type: action.zone_type
        },
        values: {
          on_off: action.zone_status || "On",
          brightness: action.zone_brightness ? parseInt(action.zone_brightness.replace('%', '')) : undefined,
          cct: action.zone_temperature ? parseInt(action.zone_temperature.replace('K', '')) : undefined,
          fadeTime: action.fade_time || '02',
          delayTime: action.delay_time || '00'
        }
      };
    } else if (action.type === "occupancy") {
      convertedAction = {
        type: "occupancy",
        action: action.occupancy_setting
      };
    } else if (action.type === "shade_group_status") {
      convertedAction = {
        type: "shade",
        shade: {
          id: action.shade_group_id,
          name: action.shade_group_name
        },
        value: parseInt(action.shade_level.replace('%', ''))
      };
    }
    
    setSelectedActionData(convertedAction);
    setActionDialogIdx(locationIdx);
  };

  // Handle common action selection
  const handleCommonActionTypeSelect = async (actionType) => {
    setSelectedCommonActionType(actionType);
    setSelectedOccupancySetting(null);
    setSelectedZoneType('switched');

    // Only set default occupancy setting, don't apply yet
    if (actionType === 'occupancy') {
      setSelectedOccupancySetting("auto");
    }
    // Don't auto-apply - wait for "Apply to All" button
  };

  // Handle light status setting changes
  const handleLightStatusSettingChange = async (type, setting, value) => {
    // Only update the state, don't apply to areas yet - wait for "Apply to All" button
    setLightStatusSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [setting]: value }
    }));
  };

  // Handle occupancy setting selection
  const handleOccupancySettingSelect = (setting) => {
    // Only update the state, don't apply to areas yet - wait for "Apply to All" button
    setSelectedOccupancySetting(setting);
  };

  // Apply common action to all areas - UPDATED to ensure action is applied
  const handleApplyCommonAction = () => {
    if (!editableControl || !editableControl.quick_control_areas) {
      setShowCommonActionDialog(false);
      return;
    }
    
    // Ensure the action is applied with current settings
    if (selectedCommonActionType === 'light_status') {
      const commonAction = {
        type: "area_status",
        area_status: lightStatusSettings.switched.on_off
      };
      
      setEditableControl(prev => ({
        ...prev,
        quick_control_areas: prev.quick_control_areas.map(area => ({
          ...area,
          actions: applyCommonActionToActions(area.actions, commonAction)
        }))
      }));
    } else if (selectedCommonActionType === 'occupancy' && selectedOccupancySetting) {
      const commonAction = {
        type: "occupancy",
        occupancy_setting: selectedOccupancySetting
      };
      
      setEditableControl(prev => ({
        ...prev,
        quick_control_areas: prev.quick_control_areas.map(area => ({
          ...area,
          actions: applyCommonActionToActions(area.actions, commonAction)
        }))
      }));
    }
    
    // Close the dialog and reset
    setShowCommonActionDialog(false);
    setSelectedCommonActionType('light_status');
    setSelectedOccupancySetting(null);
    setSelectedZoneType('switched');
  };

  // Don't auto-apply when dialog opens - wait for "Apply to All" button

  const handleSave = async () => {
    if (!editableControl || updateStatus === 'loading') return;
    
    // Check that all locations have at least one action
    const hasLocationsWithoutActions = editableControl.quick_control_areas.some(area => !area.actions || area.actions.length === 0);
    if (hasLocationsWithoutActions) {
      setToast({ open: true, message: "All locations must have at least one action before saving." });
      return;
    }
    
    try {
      const payload = {
        name: editableControl.name,
        areas: editableControl.quick_control_areas.map(area => ({
          floor_id: area.floor_id,
          floor_name: area.floor_name,
          area_id: area.area_id,
          area_name: area.area_name,
          area_code: area.area_code,
          actions: area.actions.map((rawAction) => stripActionSource(rawAction))
        }))
      };

      if (isCopyMode || !editableControl.id) {
        // Create new quick control (either copy mode or no ID)
        const response = await dispatch(createQuickControl(payload)).unwrap();
        const controlId = response?.id ?? response?.quick_control_id;
        if (controlId) {
          saveLocationMeta(
            LOCATION_ENTITY.QUICK_CONTROL,
            controlId,
            editableControl.quick_control_areas
          );
        }
        setToast({ open: true, message: "Quick Control created successfully!" });
        navigate('/quickcontrols');
      } else {
        // Update existing - FIXED: Properly handle the update
        await dispatch(updateQuickControl({ 
          controlId: editableControl.id, 
          payload 
        })).unwrap();

        saveLocationMeta(
          LOCATION_ENTITY.QUICK_CONTROL,
          editableControl.id,
          editableControl.quick_control_areas
        );
        
        // FIXED: Show success message first
        setToast({ open: true, message: "Quick Control updated successfully!" });
        
        // FIXED: Clear edit mode and reload details
        setEditMode(false);
        setEditableControl(null);
        
        // FIXED: Reload details to get the updated data
        await dispatch(fetchQuickControlDetails(id));
      }
    } catch (error) {
      setToast({ 
        open: true, 
        message: error?.message || "Failed to save Quick Control" 
      });
    }
  };

  const handleEditChange = (field, value) => {
    setEditableControl(prev => ({ ...prev, [field]: value }));
  };

  // Handle delete action
  const handleDeleteAction = (areaIndex) => {
    const area = editableControl.quick_control_areas[areaIndex];
    setActionToDelete({ areaIndex, area });
    setShowDeleteActionDialog(true);
  };

  const confirmDeleteAction = () => {
    if (actionToDelete) {
      setEditableControl(prev => {
        const updatedAreas = [...prev.quick_control_areas];
        // Remove the entire area (location + action) at the specified index
        updatedAreas.splice(actionToDelete.areaIndex, 1);
        return { ...prev, quick_control_areas: updatedAreas };
      });
      setShowDeleteActionDialog(false);
      setActionToDelete(null);
    }
  };

  if (selectedControlLoading || !selectedControl) {
    return <div style={{ color: schedulePanelLabel, padding: 40 }}>Loading...</div>;
  }

  const quickControlAreas = editMode
    ? editableControl?.quick_control_areas
    : selectedControl?.quick_control_areas;

  const saveDisabled =
    updateStatus === "loading" ||
    editableControl?.quick_control_areas?.some(
      (area) => !area.actions || area.actions.length === 0
    );

  const permissionButtonStyle = (enabled) =>
    schedulePrimaryButtonStyle(isLargeScreen, isDesktop, { disabled: !enabled });

  return (
    <div
      style={{
        padding: isLargeScreen ? 40 : isDesktop ? 32 : 24,
        borderRadius: 20,
        maxWidth: isLargeScreen ? 1600 : isDesktop ? 1400 : 1200,
        width: "100%",
        boxSizing: "border-box",
        ...schedulePageWithFixedActionBarStyle(isLargeScreen, isDesktop, isTablet),
      }}
    >
      {!editMode && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: isLargeScreen ? 24 : isDesktop ? 20 : 16,
          }}
        >
          <button
            onClick={canTriggerQuickControl() ? handleTrigger : undefined}
            disabled={triggerStatus === "loading" || !canTriggerQuickControl()}
            title={
              !canTriggerQuickControl()
                ? "You do not have permission to trigger Quick Controls"
                : ""
            }
            style={{
              ...permissionButtonStyle(canTriggerQuickControl()),
              opacity: canTriggerQuickControl() ? 1 : 0.6,
            }}
          >
            {triggerStatus === "loading" ? "Triggering..." : "Trigger"}
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: isLargeScreen ? 32 : isDesktop ? 28 : 24,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            flex: "0 1 400px",
            minWidth: isLargeScreen ? 380 : isDesktop ? 360 : 340,
            maxWidth: isLargeScreen ? 480 : isDesktop ? 440 : 420,
          }}
        >
          <div
            style={{
              marginBottom: isLargeScreen ? 15 : isDesktop ? 12 : 10,
              ...scheduleFormCardStyle(isLargeScreen, isDesktop),
            }}
          >
            <label
              style={{
                fontWeight: 500,
                color: schedulePanelLabel,
                display: "block",
                marginBottom: isLargeScreen ? 10 : 8,
                fontSize: isLargeScreen ? 16 : isDesktop ? 15 : 14,
              }}
            >
              Quick Control Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={editableControl.name}
                onChange={(e) => handleEditChange("name", e.target.value)}
                style={{
                  width: "100%",
                  ...scheduleTextInputStyle(isLargeScreen, isDesktop, buttonColor),
                  ...schedulePanelInputStyle(true),
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  padding: isLargeScreen ? 14 : isDesktop ? 13 : 12,
                  borderRadius: 8,
                  fontSize: isLargeScreen ? 16 : isDesktop ? 15 : 14,
                  minHeight: 44,
                  ...schedulePanelInputStyle(false),
                }}
              >
                {selectedControl?.name}
              </div>
            )}
          </div>
        </div>

        <div style={scheduleRightPanelStyle(isLargeScreen, isDesktop)}>
          <div style={scheduleRightHeaderStyle(isLargeScreen, isDesktop)}>
            <span
              style={{
                flex: "0 0 300px",
                cursor: editMode ? "pointer" : "default",
                textAlign: "left",
                color: schedulePanelLabel,
              }}
              onClick={() => editMode && setShowLocationDialog(true)}
            >
              {editMode ? "+ Add Location" : "Location"}
            </span>
            <span
              style={{
                flex: "1 1 300px",
                textAlign: "left",
                color: schedulePanelLabel,
              }}
            >
              {editMode ? "Add Action" : "Action"}
            </span>
            {editMode && (
              <span
                style={{
                  flex: "0 0 180px",
                  cursor: "pointer",
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  color: schedulePanelLabel,
                }}
                onClick={() => setShowCommonActionDialog(true)}
              >
                + Add Common Action
              </span>
            )}
          </div>

          <div style={scheduleRightListScrollStyle}>
        {(quickControlAreas || []).map((area, aidx) => {
          const uniqueKey = `${area.floor_id}-${area.area_id}-${aidx}`;
          const hasActions = area.actions && area.actions.length > 0;
          const locationLabel = decodeHtmlEntities(
            formatQuickControlAreaLocationLabel(
              area,
              floors,
              areaTreeIndex,
              LOCATION_ENTITY.QUICK_CONTROL,
              id
            )
          );

          return (
            <div
              key={uniqueKey}
              style={{
                ...scheduleLocationRowStyle(false),
                alignItems: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  flex: "0 0 300px",
                  ...scheduleLocationTextStyle,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {locationLabel}
              </div>

              <div
                style={{
                  flex: "1 1 300px",
                  ...scheduleLocationTextStyle,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {editMode ? (
                  hasActions ? (
                    area.actions.map((action, actidx) => {
                      const actionKey = `${uniqueKey}-action-${actidx}`;
                      return (
                        <div
                          key={actionKey}
                          style={{
                            wordWrap: 'break-word',
                            wordBreak: 'break-word',
                            lineHeight: '1.4',
                            width: '100%',
                            textAlign: 'left'
                          }}
                        >
                          {renderActionDisplay(action)}
                        </div>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => handleOpenActionDialog(aidx)}
                      style={scheduleSmallActionButtonStyle(buttonColor)}
                    >
                      Add Action
                    </button>
                  )
                ) : hasActions ? (
                  area.actions.map((action, actidx) => {
                    const actionKey = `${uniqueKey}-action-${actidx}`;
                    return (
                      <div
                        key={actionKey}
                        style={{
                          marginBottom: 4,
                          wordWrap: 'break-word',
                          wordBreak: 'break-word',
                          lineHeight: '1.4',
                          width: '100%'
                        }}
                      >
                        {renderActionDisplay(action)}
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      color: "var(--schedule-panel-muted-text, rgba(0,0,0,0.5))",
                      fontStyle: "italic",
                    }}
                  >
                    No action
                  </div>
                )}
              </div>

              {editMode && (
                <div
                  style={{
                    flex: "0 0 180px",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {hasActions && (
                    <button
                      onClick={() => handleEditAction(aidx, 0)}
                      style={scheduleSmallActionButtonStyle(buttonColor)}
                    >
                      Edit Action
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAction(aidx)}
                    style={{
                      background: buttonColor,
                      border: "none",
                      borderRadius: 4,
                      color: "#fff",
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontSize: "14px",
                      minWidth: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      </div>

      <div style={scheduleFixedActionBarStyle(isLargeScreen, isDesktop, isTablet)}>
        {!editMode && (
          <>
            <button
              style={{
                ...permissionButtonStyle(canCreateQuickControl()),
                opacity: canCreateQuickControl() ? 1 : 0.6,
              }}
              onClick={canCreateQuickControl() ? handleCopy : undefined}
              disabled={!canCreateQuickControl()}
              title={
                !canCreateQuickControl()
                  ? "You do not have permission to copy Quick Controls"
                  : ""
              }
            >
              Copy
            </button>
            <button
              style={{
                ...permissionButtonStyle(canModifyQuickControl()),
                opacity: canModifyQuickControl() ? 1 : 0.6,
              }}
              onClick={canModifyQuickControl() ? handleModify : undefined}
              disabled={!canModifyQuickControl()}
              title={
                !canModifyQuickControl()
                  ? "You do not have permission to modify Quick Controls"
                  : ""
              }
            >
              Modify
            </button>
            <button
              style={{
                ...permissionButtonStyle(canDeleteQuickControl()),
                opacity: canDeleteQuickControl() ? 1 : 0.6,
              }}
              onClick={canDeleteQuickControl() ? handleDelete : undefined}
              disabled={deleteStatus === "loading" || !canDeleteQuickControl()}
              title={
                !canDeleteQuickControl()
                  ? "You do not have permission to delete Quick Controls"
                  : ""
              }
            >
              {deleteStatus === "loading" ? "Deleting..." : "Delete"}
            </button>
            <button
              style={schedulePrimaryButtonStyle(isLargeScreen, isDesktop)}
              onClick={() => navigate("/quickcontrols")}
            >
              Close
            </button>
          </>
        )}
        {editMode && (
          <>
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              style={schedulePrimaryButtonStyle(isLargeScreen, isDesktop, {
                disabled: saveDisabled,
              })}
            >
              {updateStatus === "loading" ? "Saving..." : "Save"}
            </button>
            <button
              style={schedulePrimaryButtonStyle(isLargeScreen, isDesktop)}
              onClick={() => {
                setEditMode(false);
                setEditableControl(null);
                setIsCopyMode(false);
              }}
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Common Action Dialog */}
      {showCommonActionDialog && (
        <div style={{
          position: 'fixed',
          left: 0, top: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div
            className="quick-control-modal"
            style={{
            background: modalBg,
            borderRadius: 18,
            padding: 28,
            minWidth: 340,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            position: "relative",
            color: modalTitleColor
          }}
          >
            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 18, color: modalTitleColor }}>
              Add Common Action
            </div>
            
            {/* Action Type Dropdown */}
            <div style={{ marginBottom: 16 }}>
              <div className="qc-modal-label" style={{ fontWeight: 600, marginBottom: 8, color: QC_MODAL_LABEL }}>Select Action Type</div>
              <Select
                className="schedule-filter-select"
                value={selectedCommonActionType}
                onChange={(e) => handleCommonActionTypeSelect(e.target.value)}
                fullWidth
                MenuProps={scheduleFilterMenuProps}
                sx={scheduleSelectFieldSx}
              >
                <MenuItem value="light_status">Light Status</MenuItem>
                <MenuItem value="occupancy">Occupancy Setting</MenuItem>
              </Select>
            </div>

            {/* Occupancy Setting Options */}
            {selectedCommonActionType === 'occupancy' && (
              <div style={{ marginTop: 16 }}>
                <div className="qc-modal-label" style={{ fontWeight: 600, marginBottom: 8, color: QC_MODAL_LABEL }}>Occupancy Setting</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {["disabled", "auto", "vacancy"].map((setting) => (
                    <button
                      key={setting}
                      style={{
                        borderRadius: 8,
                        minWidth: 100,
                        height: 45,
                        fontWeight: 700,
                        fontSize: 16,
                        background: selectedOccupancySetting === setting ? buttonColor : "#fff",
                        color: selectedOccupancySetting === setting ? "#fff" : buttonColor,
                        border: selectedOccupancySetting === setting ? "none" : "1px solid #ccc",
                        boxShadow: "0 1px 4px #0001",
                        cursor: "pointer",
                        outline: "none"
                      }}
                      onClick={() => handleOccupancySettingSelect(setting)}
                    >
                      {setting.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Light Status Options */}
            {selectedCommonActionType === 'light_status' && (
              <div style={{ marginTop: 16 }}>
                {/* <div style={{ fontWeight: 600, marginBottom: 8 }}>Light Status (On/Off)</div> */}
                
                {/* Simplified: Only On/Off options */}
                <div style={{ marginBottom: 16 }}>
                  <div className="qc-modal-label" style={{ fontWeight: 600, marginBottom: 8, color: QC_MODAL_LABEL }}>Light State</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', color: QC_MODAL_LABEL }}>
                      <input
                        type="radio"
                        value="On"
                        checked={lightStatusSettings.switched.on_off === 'On'}
                        onChange={(e) => handleLightStatusSettingChange('switched', 'on_off', e.target.value)}
                        style={{ 
                          marginRight: 8,
                          accentColor: QC_RADIO_CHECKED_FILL,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          width: '14px',
                          height: '14px',
                          border: `2px solid ${QC_RADIO_BORDER}`,
                          borderRadius: '50%',
                          backgroundColor: lightStatusSettings.switched.on_off === 'On' ? QC_RADIO_CHECKED_FILL : QC_RADIO_UNCHECKED_FILL,
                          position: 'relative'
                        }}
                      />
                      On
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', color: QC_MODAL_LABEL }}>
                      <input
                        type="radio"
                        value="Off"
                        checked={lightStatusSettings.switched.on_off === 'Off'}
                        onChange={(e) => handleLightStatusSettingChange('switched', 'on_off', e.target.value)}
                        style={{ 
                          marginRight: 8,
                          accentColor: QC_RADIO_CHECKED_FILL,
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          width: '14px',
                          height: '14px',
                          border: `2px solid ${QC_RADIO_BORDER}`,
                          borderRadius: '50%',
                          backgroundColor: lightStatusSettings.switched.on_off === 'Off' ? QC_RADIO_CHECKED_FILL : QC_RADIO_UNCHECKED_FILL,
                          position: 'relative'
                        }}
                      />
                      Off
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={handleApplyCommonAction}
                disabled={!selectedCommonActionType || 
                  (selectedCommonActionType === 'occupancy' && !selectedOccupancySetting) ||
                  (selectedCommonActionType === 'light_status' && !selectedZoneType)}
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: (selectedCommonActionType && 
                    (selectedCommonActionType !== 'occupancy' || selectedOccupancySetting) &&
                    (selectedCommonActionType !== 'light_status' || selectedZoneType)) ? buttonColor : "#888",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: (selectedCommonActionType && 
                    (selectedCommonActionType !== 'occupancy' || selectedOccupancySetting) &&
                    (selectedCommonActionType !== 'light_status' || selectedZoneType)) ? "pointer" : "not-allowed"
                }}
              >
                Apply to All
              </button>
              <button
                onClick={() => { 
                  setShowCommonActionDialog(false); 
                  setSelectedCommonActionType(''); 
                  setSelectedOccupancySetting(null); 
                  setSelectedZoneType('switched');
                }}
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: `1px solid ${buttonColor}`,
                  background: "#fff",
                  color: buttonColor,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Dialog */}
      <AreaTreeDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onAdd={handleAddLocations}
      />

      {/* Action Dialog */}
      {actionDialogIdx !== null && (
        <div style={{
          position: 'fixed',
          left: 0, top: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.25)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div
            className="quick-control-modal"
            style={{
            background: modalBg,
            borderRadius: 18,
            padding: 28,
            minWidth: 340,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            position: "relative",
            color: modalTitleColor
          }}
          >
            <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 18, color: modalTitleColor }}>
              {selectedActionData ? 'Edit Action' : 'Add Action'}
              {selectedActionData && (
                <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                  {selectedActionData.type === "scene" && selectedActionData.scene && `Scene: ${selectedActionData.scene.name}`}
                  {selectedActionData.type === "zone" && selectedActionData.zone && `Zone: ${selectedActionData.zone.name}`}
                  {selectedActionData.type === "occupancy" && `Occupancy: ${selectedActionData.action}`}
                  {selectedActionData.type === "shade" && selectedActionData.shade && `Shade: ${selectedActionData.shade.name}`}
                </div>
              )}
            </div>
            <Action
              areaId={editableControl?.quick_control_areas[actionDialogIdx]?.area_id}
              onActionSelect={action => setSelectedActionData(action)}
              initialAction={selectedActionData}
            />
            <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  if (selectedActionData && selectedActionData.type) {
                    handleAddAction(actionDialogIdx, selectedActionData);
                  }
                }}
                disabled={
                  !selectedActionData ||
                  !selectedActionData.type ||
                  (selectedActionData.type === "scene" && !selectedActionData.scene) ||
                  (selectedActionData.type === "shade" && !selectedActionData.shade)
                }
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: "none",
                  background: (selectedActionData && selectedActionData.type && (selectedActionData.type !== "scene" || selectedActionData.scene)) ? buttonColor : "#888",
                  color: "#fff",
                  fontWeight: 500,
                  cursor: (selectedActionData && selectedActionData.type && (selectedActionData.type !== "scene" || selectedActionData.scene)) ? "pointer" : "not-allowed"
                }}
              >
                {selectedActionData ? 'Update' : 'Add'} Action
              </button>
              <button
                onClick={() => { setActionDialogIdx(null); setSelectedActionData(null); }}
                style={{
                  padding: "10px 28px",
                  borderRadius: 8,
                  border: `1px solid ${buttonColor}`,
                  background: "#fff",
                  color: buttonColor,
                  fontWeight: 500,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showConfirm}
        title="Are you sure?"
        message="Do you want to trigger this quick control?"
        onConfirm={doTrigger}
        onCancel={() => setShowConfirm(false)}
      />

      {/* Delete Quick Control Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteQuickControlDialog}
        title="Delete Quick Control"
        message={`Are you sure you want to delete quick control "${selectedControl?.name}"?`}
        onConfirm={confirmDeleteQuickControl}
        onCancel={() => setShowDeleteQuickControlDialog(false)}
      />

      {/* Delete Action Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteActionDialog}
        title="Delete Action"
        message={`Are you sure you want to delete the action for "${actionToDelete?.area?.area_name}"?`}
        onConfirm={confirmDeleteAction}
        onCancel={() => {
          setShowDeleteActionDialog(false);
          setActionToDelete(null);
        }}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  );
};

export default QuickControlDetails;