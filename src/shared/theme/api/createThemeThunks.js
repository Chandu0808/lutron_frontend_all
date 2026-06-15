import { createAsyncThunk } from "@reduxjs/toolkit";

/**
 * Factory for theme API thunks. Each variant injects its own BaseUrl and getToken.
 */
export function createThemeThunks({ BaseUrl, getToken }) {
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  const fetchThemeSettings = createAsyncThunk(
    "theme/fetchSettings",
    async (_, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get("/theme/");
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const fetchApplicationTheme = createAsyncThunk(
    "theme/fetchApplicationTheme",
    async (_, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get(
          "/theme/application",
          getAuthHeaders()
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const updateApplicationTheme = createAsyncThunk(
    "theme/updateApplicationTheme",
    async (data, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.post(
          "/theme/application",
          data,
          getAuthHeaders()
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const fetchHeatMapTheme = createAsyncThunk(
    "theme/fetchHeatMapTheme",
    async (_, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get("/theme/heatmap", getAuthHeaders());
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const updateHeatMapTheme = createAsyncThunk(
    "theme/updateHeatMapTheme",
    async (data, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.post(
          "/theme/heatmap",
          data,
          getAuthHeaders()
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const fetchBackgroundImage = createAsyncThunk(
    "theme/fetchBackgroundImage",
    async (_, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get("/theme/background", getAuthHeaders());
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const updateBackgroundImage = createAsyncThunk(
    "theme/updateBackgroundImage",
    async (data, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.post(
          "/theme/background",
          data,
          getAuthHeaders()
        );
        return response.data;
      } catch (error) {
        return rejectWithValue(
          error.response?.data?.message ||
            error.response?.statusText ||
            error.message
        );
      }
    }
  );

  const clearBackgroundImage = createAsyncThunk(
    "theme/clearBackgroundImage",
    async (_, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.post(
          "/theme/background_image_clear",
          null,
          getAuthHeaders()
        );
        return response.data;
      } catch (error) {
        const detail = error?.response?.data?.detail;
        return rejectWithValue(
          (Array.isArray(detail)
            ? detail.map((item) => item.msg).join(", ")
            : detail) ||
            error?.response?.data?.message ||
            error?.response?.statusText ||
            error?.message ||
            "Failed to remove background image"
        );
      }
    }
  );

  return {
    fetchThemeSettings,
    fetchApplicationTheme,
    updateApplicationTheme,
    fetchHeatMapTheme,
    updateHeatMapTheme,
    fetchBackgroundImage,
    updateBackgroundImage,
    clearBackgroundImage,
  };
}
