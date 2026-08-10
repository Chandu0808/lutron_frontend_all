// src/redux/slice/settingsslice/heatmap/HeatmapSlice.js

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { BaseUrl } from "../../../../BaseUrl";
import {
  areaIdsMatch,
  deriveLightStatusFromZoneUpdates,
  normalizeLightStatus,
  patchAreasLightStatus,
} from "./heatmapMapSync";
import { resolveFloorPlanMediaUrl } from "../../../../../../shared/pdf/floorPlanPdf";
import { mapAreaStatusFetchError } from "../../../../../../shared/heatmap/processorReachable";

// Async Thunks
const formatFloorMapError = (err) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || String(item)).filter(Boolean).join('; ')
      || 'Failed to load floor plan';
  }
  return err.response?.data?.message || err.message || 'Failed to load floor plan';
};

export const fetchFloorMapData = createAsyncThunk(
  "heatmap/fetchFloorMapData",
  async ({ floorId }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.get(`/floor/light_status?floor_id=${floorId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(formatFloorMapError(err));
    }
  }
);

export const fetchAreaOccupancyStatus = createAsyncThunk(
  "heatmap/fetchAreaOccupancyStatus",
  async ({ floorId }) => {
    const response = await BaseUrl.get(`/floor/occupancy_status?floor_id=${floorId}`);
    return response.data;
  }
);

export const fetchAreaEnergyConsumption = createAsyncThunk(
  "heatmap/fetchAreaEnergyConsumption",
  async ({ floorId }) => {
    const response = await BaseUrl.get(`/floor/energy_status?floor_id=${floorId}`);
    return response.data;
  }
);

export const fetchAreaStatus = createAsyncThunk(
  "heatmap/fetchAreaStatus",
  async (areaId, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.get(`/area/full_area_status?area_id=${areaId}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(mapAreaStatusFetchError(err));
    }
  },
  {
    condition: (areaId, { getState }) => {
      const hm = getState()?.heatmap;
      if (!hm?.areaStatusLoading) return true;
      return String(hm.areaStatusFetchingId) !== String(areaId);
    },
  }
);

export const updateAreaLightStatus = createAsyncThunk(
  "heatmap/updateAreaLightStatus",
  async ({ areaId, lightStatus }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.patch(`/area/light_status`, {
        area_id: areaId,
        light_status: lightStatus,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update area light status');
    }
  }
);

// Thunk to turn ON/OFF all zones in an area
export const toggleAllZonesInArea = createAsyncThunk(
  'heatmap/toggleAllZonesInArea',
  async ({ areaId, action }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.post('/area/zone_on-off', {
        area_id: areaId,
        action,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to toggle zones');
    }
  }
);

// // Update Zone Settings Thunk
// export const updateZoneSettings = createAsyncThunk(
//   "heatmap/updateZoneSettings",
//   async ({ zoneId, brightness, fadeTime, delayTime }) => {
//     const response = await BaseUrl.patch(`/area/zone_update`, {
//       zone_id: zoneId,
//       brightness,
//       fade_time: fadeTime,
//       delay_time: delayTime,
//     });
//     return response.data;
//   }
// );

export const updateZonesByArea = createAsyncThunk(
  "heatmap/updateZonesByArea",
  async ({ areaId, zones }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.post(`/area/zone_update`, {

        area_id: areaId,
        zones,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update zones');
    }
  }
);

// --- SCENE ACTIVATION THUNK (CORRECT ENDPOINT) ---
export const updateAreaScene = createAsyncThunk(
  'heatmap/updateAreaScene',
  async ({ area_id, scene_code }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.post(`/area/scene_activate`, {
        area_id,
        scene_code,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to update area scene');
    }
  }
);

const formatRenameAreaError = (err) => {
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => item?.msg || JSON.stringify(item));
    return parts.filter(Boolean).join("; ") || err.message;
  }
  return err.response?.data?.message || err.message || "Failed to rename area";
};

export const renameArea = createAsyncThunk(
  "heatmap/renameArea",
  async ({ area_id, new_name }, { rejectWithValue }) => {
    try {
      const response = await BaseUrl.post("/area/rename", {
        area_id,
        new_name,
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(formatRenameAreaError(err));
    }
  }
);

// Add a new thunk for base floor data (without light status)
export const fetchBaseFloorData = createAsyncThunk(
  "heatmap/fetchBaseFloorData",
  async ({ floorId }) => {
    // This should call a different endpoint that only returns floor plan and area coordinates
    // without light status data
    const response = await BaseUrl.get(`/floor/get/${floorId}`);
    return response.data;
  }
);

// Thunk to refresh all data for a floor and optionally an area
export const refreshAllHeatmapData = createAsyncThunk(
  'heatmap/refreshAllHeatmapData',
  async ({ floorId, areaId = null, displayMode = 'Light' }, { dispatch, rejectWithValue }) => {
    try {
      if (displayMode === 'Occupancy') {
        await dispatch(fetchAreaOccupancyStatus({ floorId }));
      } else if (displayMode === 'Energy') {
        await dispatch(fetchAreaEnergyConsumption({ floorId }));
      } else {
        await dispatch(fetchFloorMapData({ floorId })).unwrap();
      }

      if (areaId) {
        await dispatch(fetchAreaStatus(areaId));
      }

      return { success: true };
    } catch (err) {
      return rejectWithValue(err.response?.data?.detail || 'Failed to refresh heatmap data');
    }
  }
);

// Initial State
const initialState = {
  selectedFloorId: null,
  displayMode: "Light",
  searchTerm: "",
  heatmapData: { areas: [] },
  pdfUrl: null,
  loading: false,
  error: null,
  areaStatus: null,
  areaStatusLoading: false,
  areaStatusError: null,
  areaStatusFetchingId: null,
  toggleAllZonesLoading: false,
  toggleAllZonesError: null,
};

// Slice
const heatmapSlice = createSlice({
  name: "heatmap",
  initialState,
  reducers: {
    setSelectedFloorId: (state, action) => {
      state.selectedFloorId = action.payload;
    },
    setDisplayMode: (state, action) => {
      state.displayMode = action.payload;
    },
    setHeatmapSearchTerm: (state, action) => { // added
      state.searchTerm = (action.payload ?? "").toString();
    },
    clearHeatmapData: (state) => {
      state.heatmapData = { areas: [] };
      state.pdfUrl = null;
      state.loading = false;
      state.error = null;
    },
    clearUserData: (state) => {
      // Clear all user-specific data when user logs out
      state.selectedFloorId = null;
      state.displayMode = "Light";
      state.searchTerm = "";
      state.heatmapData = { areas: [] };
      state.pdfUrl = null;
      state.areaStatus = null;
      state.areaStatusLoading = false;
      state.areaStatusError = null;
      state.areaStatusFetchingId = null;
      state.toggleAllZonesLoading = false;
      state.toggleAllZonesError = null;
      state.loading = false;
      state.error = null;
    },
    optimisticallyUpdateAreaStatus(state, action) {
      const { areaId, updatedZones } = action.payload;
      if (state.areaStatus && state.areaStatus.area_id === areaId) {
        state.areaStatus.zones = updatedZones;
      }
      if (state.heatmapData && Array.isArray(state.heatmapData.areas)) {
        const area = state.heatmapData.areas.find(a => (a.area_id || a.id) === areaId);
        if (area) {
          // optional: update area fields
        }
      }
    }
  },
  extraReducers: (builder) => {
    // LIGHT STATUS
    builder
      .addCase(fetchFloorMapData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFloorMapData.fulfilled, (state, action) => {
        const areas = (action.payload.areas || []).map((area) => {
          const rawLevel = area.light_level;
          let light_level = null;
          if (rawLevel !== null && rawLevel !== undefined && rawLevel !== "") {
            const levelRaw = Number(rawLevel);
            if (Number.isFinite(levelRaw)) {
              light_level = Math.max(0, Math.min(100, Math.round(levelRaw)));
            }
          }
          return {
            ...area,
            coordinates: area["co-ordinates"] || area.coordinates || [],
            area_id: area.id, // Always set area_id
            id: area.id,      // Always set id
            light_status: (area.light_status || '').toLowerCase().trim(),
            light_level,
            processor_reachable: area.processor_reachable !== false,
          };
        });
        
        state.heatmapData = { ...action.payload, areas };
      
        const rawPath = action.payload.floor_plan || action.payload.floor_image || "";
        state.pdfUrl = resolveFloorPlanMediaUrl(rawPath);
      
        state.loading = false;
      })
      .addCase(fetchFloorMapData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to load floor plan';
        state.pdfUrl = null;
        state.heatmapData = { areas: [] };
      });

    // OCCUPANCY STATUS
    builder.addCase(fetchAreaOccupancyStatus.fulfilled, (state, action) => {
      const updatedAreas = (action.payload.areas || []).map(a => ({
        ...a,
        area_id: a.area_id || a.id // fallback to id if area_id is missing
      }));
      if (state.heatmapData && state.heatmapData.areas && updatedAreas.length) {
        state.heatmapData.areas = state.heatmapData.areas.map(area => {
          const updated = updatedAreas.find(
            a => (a.area_id === (area.area_id || area.id) || a.id === (area.area_id || area.id))
          );
          return updated
            ? {
                ...area,
                occupancy_status: updated.occupancy_status,
                processor_reachable:
                  updated.processor_reachable === false
                    ? false
                    : area.processor_reachable,
              }
            : area;
        });
      }
    });

    // Update the ENERGY STATUS handler to include the new fields
    builder.addCase(fetchAreaEnergyConsumption.fulfilled, (state, action) => {
      const energyAreas = action.payload.areas || [];
      
      
      // The energy API returns areas with instantaneous_power, instantaneous_max_power, and load_percentage
      // Update existing areas with energy status by matching area codes
      if (state.heatmapData && state.heatmapData.areas) {
        state.heatmapData.areas = state.heatmapData.areas.map((area) => {
          // Find matching energy area by code or name
          const matchingEnergyArea = energyAreas.find(energyArea => 
            energyArea.code === area.code || 
            energyArea.name === area.name ||
            energyArea.id === (area.area_id || area.id)
          );
          
          
          if (matchingEnergyArea) {
            const updatedArea = {
              ...area,
              // Update with new energy fields
              instantaneous_power: matchingEnergyArea.instantaneous_power,
              instantaneous_max_power: matchingEnergyArea.instantaneous_max_power,
              load_percentage: matchingEnergyArea.load_percentage,
              // Keep backward compatibility
              energy_status: matchingEnergyArea.instantaneous_power,
              area_id: area.area_id || area.id,
              id: area.id,
            };
            
            return updatedArea;
          }
          
          return area;
        });
        
      }
    });

    // FULL AREA STATUS
    builder
      .addCase(fetchAreaStatus.pending, (state, action) => {
        state.areaStatusLoading = true;
        state.areaStatusError = null;
        state.areaStatusFetchingId = action.meta.arg;
        state.areaStatus = null;
      })
      .addCase(fetchAreaStatus.fulfilled, (state, action) => {
        state.areaStatusLoading = false;
        state.areaStatusFetchingId = null;
        state.areaStatus = action.payload;

        const payloadAreaId = action.payload?.area_id;
        const mapLight = normalizeLightStatus(action.payload?.light_status);
        if (payloadAreaId != null && state.heatmapData?.areas) {
          state.heatmapData.areas = state.heatmapData.areas.map((area) =>
            areaIdsMatch(area, payloadAreaId)
              ? {
                  ...area,
                  occupancy_status: (action.payload.occupancy_status || "").toLowerCase().trim(),
                  light_status: mapLight ?? area.light_status,
                  energy_status:
                    area.energy_status !== undefined
                      ? area.energy_status
                      : action.payload.energy_status,
                  energy_consumption: action.payload.consumption,
                  energy_savings: action.payload.savings,
                }
              : area
          );
        }
      })
      .addCase(fetchAreaStatus.rejected, (state, action) => {
        state.areaStatusLoading = false;
        state.areaStatusFetchingId = null;
        state.areaStatusError =
          action.payload || action.error.message || "Failed to fetch area status";
      });

    // Toggle all zones in area
    builder
      .addCase(toggleAllZonesInArea.pending, (state) => {
        state.toggleAllZonesLoading = true;
        state.toggleAllZonesError = null;
      })
      .addCase(toggleAllZonesInArea.fulfilled, (state, action) => {
        state.toggleAllZonesLoading = false;
        // Update areaStatus if it exists and matches the updated area
        if (state.areaStatus && action.payload && action.payload.area_id === state.areaStatus.area_id) {
          state.areaStatus.light_status = action.payload.light_status || state.areaStatus.light_status;
        }
        // Update heatmapData areas if they exist
        const toggleAreaId = action.meta?.arg?.areaId;
        const toggleLight =
          normalizeLightStatus(action.meta?.arg?.action) ||
          normalizeLightStatus(action.payload?.light_status);
        if (toggleAreaId != null && state.heatmapData?.areas && toggleLight) {
          state.heatmapData.areas = patchAreasLightStatus(
            state.heatmapData.areas,
            toggleAreaId,
            toggleLight
          );
        }
      })
      .addCase(toggleAllZonesInArea.rejected, (state, action) => {
        state.toggleAllZonesLoading = false;
        state.toggleAllZonesError = action.payload || action.error.message;
      });

    // Update area light status
    builder
      .addCase(updateAreaLightStatus.pending, (state) => {
        // Set loading state if needed
      })
      .addCase(updateAreaLightStatus.fulfilled, (state, action) => {
        // Update areaStatus if it exists and matches the updated area
        if (state.areaStatus && action.payload && action.payload.area_id === state.areaStatus.area_id) {
          state.areaStatus.light_status = action.payload.light_status || state.areaStatus.light_status;
        }
        // Update heatmapData areas if they exist
        const lightAreaId = action.payload?.area_id;
        const lightStatus = normalizeLightStatus(action.payload?.light_status);
        if (lightAreaId != null && state.heatmapData?.areas && lightStatus) {
          state.heatmapData.areas = patchAreasLightStatus(
            state.heatmapData.areas,
            lightAreaId,
            lightStatus
          );
        }
      })
      .addCase(updateAreaLightStatus.rejected, (state, action) => {
        // Handle error if needed
      });

    // Update area scene
    builder
      .addCase(updateAreaScene.pending, (state) => {
        // Set loading state if needed
      })
      .addCase(updateAreaScene.fulfilled, (state, action) => {
        // Update areaStatus if it exists and matches the updated area
        if (state.areaStatus && action.payload && action.payload.area_id === state.areaStatus.area_id) {
          state.areaStatus.active_scene = action.payload.active_scene || state.areaStatus.active_scene;
        }
        // Update heatmapData areas if they exist
        if (state.heatmapData && state.heatmapData.areas) {
          state.heatmapData.areas = state.heatmapData.areas.map(area => {
            if (action.payload && action.payload.area_id === (area.area_id || area.id)) {
              return {
                ...area,
                active_scene: action.payload.active_scene || area.active_scene,
              };
            }
            return area;
          });
        }
      })
      .addCase(updateAreaScene.rejected, (state, action) => {
        // Handle error if needed
      });

    builder.addCase(renameArea.fulfilled, (state, action) => {
      const payload = action.payload;
      if (!payload || payload.area_id == null || !payload.name) return;
      const { area_id: renamedId, name } = payload;
      if (state.areaStatus && state.areaStatus.area_id === renamedId) {
        state.areaStatus.area_name = name;
      }
      if (state.heatmapData?.areas?.length) {
        state.heatmapData.areas = state.heatmapData.areas.map((area) =>
          (area.area_id || area.id) === renamedId
            ? { ...area, name, area_name: name }
            : area
        );
      }
    });

    // Update zones by area
    builder
      .addCase(updateZonesByArea.pending, (state) => {
        // Set loading state if needed
      })
      .addCase(updateZonesByArea.fulfilled, (state, action) => {
        const { areaId, zones } = action.meta?.arg || {};
        if (state.areaStatus && areaId != null && state.areaStatus.area_id === areaId) {
          if (action.payload?.zones) {
            state.areaStatus.zones = action.payload.zones;
          }
        }
        const optimistic = deriveLightStatusFromZoneUpdates(zones);
        if (areaId != null && state.heatmapData?.areas && optimistic) {
          state.heatmapData.areas = patchAreasLightStatus(
            state.heatmapData.areas,
            areaId,
            optimistic
          );
        }
      })
      .addCase(updateZonesByArea.rejected, (state, action) => {
        // Handle error if needed
      });

    // Refresh all heatmap data
    builder
      .addCase(refreshAllHeatmapData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshAllHeatmapData.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(refreshAllHeatmapData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

// Actions
export const {
  setSelectedFloorId,
  setDisplayMode,
  setHeatmapSearchTerm, // added
  clearHeatmapData,
  clearUserData,
  optimisticallyUpdateAreaStatus,
} = heatmapSlice.actions;

// Selectors
export const selectSelectedFloorId = (state) => state.heatmap.selectedFloorId;
export const selectDisplayMode = (state) => state.heatmap.displayMode;
export const selectHeatmapData = (state) => state.heatmap.heatmapData;
export const selectPdfUrl = (state) => state.heatmap.pdfUrl;
export const selectHeatmapLoading = (state) => state.heatmap.loading;
export const selectHeatmapError = (state) => state.heatmap.error;
export const selectAreaStatus = (state) => state.heatmap.areaStatus;
export const selectAreaStatusLoading = (state) => state.heatmap.areaStatusLoading;
export const selectAreaStatusError = (state) => state.heatmap.areaStatusError;
export const selectAreaStatusFetchingId = (state) => state.heatmap.areaStatusFetchingId;
export const selectToggleAllZonesLoading = (state) => state.heatmap.toggleAllZonesLoading;
export const selectToggleAllZonesError = (state) => state.heatmap.toggleAllZonesError;
export const selectHeatmapSearchTerm = (state) => state.heatmap.searchTerm; // added

// Reducer
export default heatmapSlice.reducer;

