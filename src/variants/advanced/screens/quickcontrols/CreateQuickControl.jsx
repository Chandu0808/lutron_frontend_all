import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import AreaTreeDialog from "./AreaTreeDialog";
import Action from "./Action";
import { fetchFloors, selectFloors } from "../../redux/slice/floor/floorSlice";
import { selectAreaScenes } from "../../redux/slice/settingsslice/heatmap/areaSettingsSlice";
import { createQuickControl, fetchQuickControls } from "../../redux/slice/quickcontrols/quickControlSlice";
import { useNavigate } from "react-router-dom";
import { ConfirmDialog } from "../../utils/FeedbackUI";
import { UseAuth } from "../../customhooks/UseAuth";
import { selectProfile } from "../../redux/slice/auth/userlogin";
import { BaseUrl } from "../../BaseUrl";
import { MenuItem, Select } from "@mui/material";
import {
  scheduleFormCardStyle,
  scheduleHeaderLinkStyle,
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
  applyCommonActionToActions,
  stripActionSource,
  withIndividualSource,
} from "../../utils/scheduleActionPriority";

const CreateQuickControl = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const floors = useSelector(selectFloors);
  const areaScenes = useSelector(selectAreaScenes);
  const buttonColor = "var(--app-button)";
  const modalBg = 'var(--schedule-modal-bg, #d6dde8)';
  const modalTitleColor = 'var(--schedule-modal-title-color, #000000)';
  
  // Get user authentication and role
  const { role } = UseAuth();
  const userProfile = useSelector((state) => state.user?.profile);
  
  // Check if user has permission to create Quick Controls
  useEffect(() => {
    // Check if userProfile and role are loaded yet; if not, do not run logic
    if (role == null || userProfile == null) return;

    const canCreate = () => {
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
    
    if (!canCreate()) {
      navigate('/dashboard', { replace: true });
    }
  }, [role, userProfile, navigate]);

  const [quickControlName, setQuickControlName] = useState("");
  const [locations, setLocations] = useState([]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [actionDialogIdx, setActionDialogIdx] = useState(null);
  const [selectedActionData, setSelectedActionData] = useState(null);
  
  // Add confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState(null);

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

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isLargeScreen = windowSize.width >= 1920;
  const isDesktop = windowSize.width >= 1366;

  useEffect(() => {
    dispatch(fetchFloors());
  }, [dispatch]);

  // Add location(s) from dialog
  const handleAddLocations = (areas) => {
    setLocations(prev => [
      ...prev,
      ...areas.map(a => ({
        ...a,
        actions: []
      }))
    ]);
  };

  // Delete location - Updated to show confirmation first
  const handleDelete = (index) => {
    setLocationToDelete({ index, location: locations[index] });
    setShowDeleteDialog(true);
  };

  // Confirm delete location
  const confirmDeleteLocation = () => {
    if (locationToDelete) {
      setLocations(prev => prev.filter((_, i) => i !== locationToDelete.index));
      setShowDeleteDialog(false);
      setLocationToDelete(null);
    }
  };

  // Open action dialog
  const handleOpenActionDialog = (idx) => {
    setActionDialogIdx(idx);
    setSelectedActionData(null);
  };

  // Add action to location
  const handleAddAction = (idx, actionData) => {
    setLocations(prev => prev.map((loc, i) => {
      if (i !== idx) return loc;

      let newAction = actionData;

      // Normalize shade action to shade_group_status
      if (actionData.type === "shade" && actionData.shade) {
        newAction = {
          type: "shade_group_status",
          shade_group_id: actionData.shade.id || actionData.shade.zone_id,
          shade_group_name: actionData.shade.name,
          shade_level: Number(actionData.value) // value should be 0-100, 0=closed, 100=open
        };
      }

      // Remove previous action of the same type
      const filtered = (loc.actions || []).filter(a => a.type !== newAction.type);
      return { ...loc, actions: [...filtered, withIndividualSource(newAction)] };
    }));
    setActionDialogIdx(null);
    setSelectedActionData(null);
  };

  
  // Save quick control (call backend)
  const handleSave = async () => {
    if (!quickControlName.trim() || locations.length === 0) return;
    
    // Check that all locations have at least one action
    const hasLocationsWithoutActions = locations.some(location => !location.actions || location.actions.length === 0);
    if (hasLocationsWithoutActions) {
      // You might want to add a toast notification here
      alert("All locations must have at least one action before saving.");
      return;
    }

    const payload = {
      name: quickControlName,
      areas: locations.map(loc => ({
        floor_id: loc.floorId,
        area_id: loc.areaId,
        actions: loc.actions.map((rawAction) => {
          const action = stripActionSource(rawAction);
          // SCENE
          if (action.type === "scene" && action.scene) {
            return {
              type: "set_scene",
              scene_code: String(action.scene.id),
              scene_name: action.scene.name
            };
          }
          // AREA_STATUS (from common action for On/Off - uses /area/zone_on-off API)
          if (action.type === "area_status") {
            return {
              type: "area_status",
              area_status: action.area_status
            };
          }
          // ZONE_STATUS (from common action - already in backend format)
          if (action.type === "zone_status") {
            // Already in backend format, just ensure fade_time and delay_time are set if needed
            const zoneAction = { ...action };
            if ((action.zone_type === "dimmed" || action.zone_type === "whitetune") && !zoneAction.fade_time) {
              zoneAction.fade_time = "02";
            }
            if ((action.zone_type === "dimmed" || action.zone_type === "whitetune") && !zoneAction.delay_time) {
              zoneAction.delay_time = "00";
            }
            return zoneAction;
          }
          // ZONE (from Action component - frontend format)
          if (action.type === "zone" && action.zone) {
            // Check if this is a simple On/Off for switched zone without zone_id (area-level control)
            if (action.zone.type === "switched" && 
                (!action.zone.id || action.zone.id === null) &&
                action.values?.on_off &&
                !action.values.brightness &&
                !action.values.cct) {
              // Use area_status for simple On/Off area control (uses /area/zone_on-off API)
              return {
                type: "area_status",
                area_status: action.values.on_off
              };
            }
            // For specific zone controls, use zone_status
            const zoneAction = {
              type: "zone_status",
              zone_id: Number(action.zone.id || action.zone.zone_id),
              zone_type: action.zone.type,
              zone_status: action.values?.on_off,
              zone_brightness: action.values?.brightness !== undefined ? `${action.values.brightness}%` : undefined,
              zone_temperature: action.values?.cct ? `${action.values.cct}K` : undefined,
              zone_name: action.zone.name
            };
            // Add fade and delay times for dimmed and whitetune zones
            if (action.zone.type === "dimmed" || action.zone.type === "whitetune") {
              zoneAction.fade_time = action.values?.fadeTime || "02";
              zoneAction.delay_time = action.values?.delayTime || "00";
            }
            return zoneAction;
          }
          // OCCUPANCY
          if (action.type === "occupancy") {
            // Handle both action.action (from Action component) and occupancy_setting (from common action)
            const occupancySetting = action.occupancy_setting || action.action;
            if (occupancySetting) {
              return {
                type: "occupancy",
                occupancy_setting: occupancySetting
              };
            }
            // If already in backend format with occupancy_setting, return as is
            return action;
          }
          // SHADE
          if (action.type === "shade_group_status" && action.shade_group_id) {
            return {
              type: "shade_group_status",
              shade_group_id: Number(action.shade_group_id),
              shade_group_name: action.shade_group_name,
              shade_level: `${action.shade_level}%`
            };
          }
          // Default: return as is
          return action;
        })
      }))
    };


    try {
      await dispatch(createQuickControl(payload));
      await dispatch(fetchQuickControls()); // <-- Ensure the list is refreshed
      navigate("/quickcontrols");
    } catch (error) {
      // Failed to create quick control
    }
  };

  // Cancel: go back to list
  const handleCancel = () => {
    navigate("/quickcontrols"); // <-- Make sure this matches your route!
  };

  // Handle common action type selection
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
    // Only update the state, don't apply to locations yet - wait for "Apply to All" button
    setLightStatusSettings(prev => ({
      ...prev,
      [type]: { ...prev[type], [setting]: value }
    }));
  };

  // Handle occupancy setting selection
  const handleOccupancySettingSelect = (setting) => {
    // Only update the state, don't apply to locations yet - wait for "Apply to All" button
    setSelectedOccupancySetting(setting);
  };

  // Apply common action to all areas
  const handleApplyCommonAction = () => {
    if (locations.length === 0) {
      setShowCommonActionDialog(false);
      return;
    }
    
    // Ensure the action is applied with current settings
    if (selectedCommonActionType === 'light_status') {
      const commonAction = {
        type: "area_status",
        area_status: lightStatusSettings.switched.on_off
      };
      
      setLocations(prev => prev.map(location => ({
        ...location,
        actions: applyCommonActionToActions(location.actions, commonAction)
      })));
    } else if (selectedCommonActionType === 'occupancy' && selectedOccupancySetting) {
      const commonAction = {
        type: "occupancy",
        occupancy_setting: selectedOccupancySetting
      };
      
      setLocations(prev => prev.map(location => ({
        ...location,
        actions: applyCommonActionToActions(location.actions, commonAction)
      })));
    }
    
    // Close the dialog and reset
    setShowCommonActionDialog(false);
    setSelectedCommonActionType('light_status');
    setSelectedOccupancySetting(null);
    setSelectedZoneType('switched');
  };

  // Don't auto-apply when dialog opens - wait for "Apply to All" button

  const saveDisabled =
    !quickControlName.trim() ||
    locations.length === 0 ||
    locations.some((location) => !location.actions || location.actions.length === 0);

  return (
    <div
      style={{
        padding: isLargeScreen ? 40 : isDesktop ? 32 : 24,
        borderRadius: 20,
        minHeight: 500,
        display: "flex",
        gap: isLargeScreen ? 32 : isDesktop ? 24 : 20,
        alignItems: "flex-start",
        maxWidth: isLargeScreen ? 1600 : isDesktop ? 1400 : 1200,
        width: "100%",
        boxSizing: "border-box",
        ...schedulePageWithFixedActionBarStyle(isLargeScreen, isDesktop),
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
          <input
            type="text"
            value={quickControlName}
            onChange={(e) => setQuickControlName(e.target.value)}
            placeholder="Quick Control Name"
            style={scheduleTextInputStyle(isLargeScreen, isDesktop, buttonColor)}
          />
        </div>
      </div>

      <div style={scheduleRightPanelStyle(isLargeScreen, isDesktop)}>
        <div style={scheduleRightHeaderStyle(isLargeScreen, isDesktop)}>
          <span
            style={scheduleHeaderLinkStyle}
            onClick={() => setShowLocationDialog(true)}
          >
            + Add Location
          </span>
          <span
            style={{
              flex: 2,
              textAlign: "left",
              minWidth: 100,
              color: schedulePanelLabel,
            }}
          >
            Add Action
          </span>
          <span
            style={{
              flex: 1,
              cursor: "pointer",
              textAlign: "start",
              minWidth: 160,
              whiteSpace: "nowrap",
              marginLeft: 15,
              color: schedulePanelLabel,
            }}
            onClick={() => setShowCommonActionDialog(true)}
          >
            + Add Common Action
          </span>
        </div>

        <div style={scheduleRightListScrollStyle}>
      {locations.map((loc, idx) => {
        const locationText = `${loc.floorName} > ${loc.areaName}`;
        const isLongName = locationText.length > 40;
        return (
        <div key={idx} style={{
          ...scheduleLocationRowStyle(isLongName),
          alignItems: "center",
          gap: 16,
        }}>
          <div
            style={{
              flex: "0 0 280px",
              ...scheduleLocationTextStyle,
              whiteSpace: "normal",
              wordBreak: "break-word",
            }}
          >
            {locationText}
          </div>
          <div style={{
            flex: 1,
            ...scheduleLocationTextStyle,
            minWidth: 120,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}>
            {(loc.actions && loc.actions.length > 0)
              ? loc.actions.map((a, i) => {
                  // AREA_STATUS (from common action for On/Off)
                  if (a.type === "area_status") {
                    const status = a.area_status || "Off";
                    return (
                      <div key={i}>
                        Area Status: {status}
                      </div>
                    );
                  }
                  // ZONE_STATUS (from common action with specific zone controls)
                  if (a.type === "zone_status") {
                    const zoneType = a.zone_type;
                    const zoneStatus = a.zone_status || a.switched_state || "Off";
                    
                    // For zone_status with zone_id, show zone details
                    if (a.zone_id) {
                      const zoneName = a.zone_name || `Zone ${a.zone_id}`;
                      if (zoneType === "switched") {
                        const switchedState = a.switched_state || a.zone_status || "Off";
                        return (
                          <div key={i}>
                            Zone: {zoneName} ({switchedState})
                          </div>
                        );
                      } else if (zoneType === "dimmed") {
                        const switchedState = a.zone_status || "On";
                        const brightness = a.zone_brightness || "";
                        return (
                          <div key={i}>
                            Zone: {zoneName} ({switchedState}{brightness ? `, ${brightness}` : ""})
                          </div>
                        );
                      } else if (zoneType === "whitetune") {
                        const switchedState = a.zone_status || "On";
                        const brightness = a.zone_brightness || "";
                        const temperature = a.zone_temperature || "";
                        return (
                          <div key={i}>
                            Zone: {zoneName} ({switchedState}{brightness ? `, ${brightness}` : ""}{temperature ? `, ${temperature}` : ""})
                          </div>
                        );
                      } else {
                        return (
                          <div key={i}>
                            Zone: {zoneName} ({zoneStatus})
                          </div>
                        );
                      }
                    }
                    // Fallback for zone_status without zone_id
                    return (
                      <div key={i}>
                        Area Status: {zoneStatus}
                      </div>
                    );
                  }
                  // ZONE (from Action component)
                  if (a.type === "zone" && a.zone) {
                    if (
                      a.zone.type &&
                      ["switched", "switch"].includes(a.zone.type.toLowerCase())
                    ) {
                      const zoneName = a.zone_name || (a.zone && a.zone.name) || a.zone_id || '';
                      return (
                        <div key={i}>
                          Zone: {zoneName}{zoneName ? ' -' : ''} ({a.values?.on_off || "OFF"})
                        </div>
                      );
                    }
                    if (
                      a.zone.type &&
                      [
                        "whitetune",
                        "white tune",
                        "white_tune",
                        "cct"
                      ].includes(a.zone.type.toLowerCase())
                    ) {
                      const zoneName = a.zone_name || (a.zone && a.zone.name) || a.zone_id || '';
                      return (
                        <div key={i}>
                          Zone: {zoneName}{zoneName ? ' -' : ''} ({a.values?.brightness ?? 0}% brightness, {a.values?.cct ?? 2700}K CCT)
                        </div>
                      );
                    }
                    if (
                      a.zone.type &&
                      ["dimmer", "dimmed"].includes(a.zone.type.toLowerCase())
                    ) {
                      const zoneName = a.zone_name || (a.zone && a.zone.name) || a.zone_id || '';
                      return (
                        <div key={i}>
                          Zone: {zoneName}{zoneName ? ' -' : ''} ({a.values?.brightness ?? 0}% brightness)
                        </div>
                      );
                    }
                    const zoneName = a.zone_name || (a.zone && a.zone.name) || a.zone_id || '';
                    return (
                      <div key={i}>
                        Zone: {zoneName}{zoneName ? ' -' : ''}
                      </div>
                    );
                  }
                  // OCCUPANCY (from common action)
                  if (a.type === "occupancy") {
                    let occLabel = "";
                    // Check both action and occupancy_setting
                    const setting = a.occupancy_setting || a.action;
                    if (setting) {
                      if (setting.toLowerCase() === "disabled") occLabel = "Disabled";
                      else if (setting.toLowerCase() === "auto") occLabel = "Auto";
                      else if (setting.toLowerCase() === "vacancy") occLabel = "Vacancy";
                      else occLabel = setting;
                    }
                    return <div key={i}>Occupancy Setting: {occLabel}</div>;
                  }
                  // SCENE
                  if (a.type === "scene" && a.scene) {
                    return <div key={i}>Scene: {a.scene.name}</div>;
                  }
                  // SHADE
              
                    if (a.type === "shade_group_status" && a.shade_group_id) {
                      const shadeName = a.shade_group_name || a.shade_group_id || '';
                      const shadeValue = typeof a.shade_level === "string"
                        ? Number(a.shade_level.replace('%', '').trim())
                        : Number(a.shade_level);
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ minWidth: 120 }}>
                            Shade: {shadeName}{shadeName ? ' -' : ''}
                          </div>
                          <span style={{ minWidth: 60, fontWeight: 600 }}>
                            {shadeValue}% Open
                          </span>
                        </div>
                      );
                    }

                  // DEVICE
                  if (a.type === "device" && a.device) {
                    return <div key={i}>Device: {a.device.name}{a.device.name ? ' -' : ''}</div>;
                  }
                  return null;
                })
              : <button
                  style={scheduleSmallActionButtonStyle(buttonColor)}
                  onClick={() => handleOpenActionDialog(idx)}
                >Add Action</button>
            }
          </div>
          <div
            style={{
              flex: "0 0 50px",
              textAlign: "right",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              paddingLeft: "10px",
            }}
          >
            <button
              onClick={() => handleDelete(idx)}
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
            >🗑️</button>
          </div>
          {actionDialogIdx === idx && (
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
                <div style={{ marginBottom: 16, fontWeight: 600, fontSize: 18, color: modalTitleColor }}>Add Action</div>
                <Action
                  areaId={loc.areaId}
                  onActionSelect={action => setSelectedActionData(action)}
                />
                <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      if (selectedActionData && selectedActionData.type) {
                        handleAddAction(idx, selectedActionData);
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
                    Add Action
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
        </div>
      );
      })}
        </div>

        <div style={scheduleFixedActionBarStyle(isLargeScreen, isDesktop)}>
          <button
            onClick={handleCancel}
            style={schedulePrimaryButtonStyle(isLargeScreen, isDesktop)}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            style={schedulePrimaryButtonStyle(isLargeScreen, isDesktop, {
              disabled: saveDisabled,
            })}
          >
            Save
          </button>
        </div>
      </div>

      <AreaTreeDialog
        open={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
        onAdd={handleAddLocations}
      />

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
            minWidth: 400,
            maxWidth: 600,
            maxHeight: '80vh',
            overflow: 'auto',
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
                  setSelectedCommonActionType('light_status'); 
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

      {/* Delete Location Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Location"
        message={`Are you sure you want to delete location "${locationToDelete?.location?.areaName}"?`}
        onConfirm={confirmDeleteLocation}
        onCancel={() => {
          setShowDeleteDialog(false);
          setLocationToDelete(null);
        }}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteLocation}
        title="Confirm Delete"
        message={`Are you sure you want to delete the location "${locationToDelete?.location.areaName}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default CreateQuickControl;