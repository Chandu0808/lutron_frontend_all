import React, { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Snackbar,
  Typography,
} from "@mui/material";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { useSelector } from "react-redux";

import SettingsLayout from "../SettingsLayout";
import { BaseUrl } from "../../../BaseUrl";
import { selectApplicationTheme } from "../../../redux/slice/theme/themeSlice";
import { isLightSurface } from "../../../utils/themeOnSurface";
import { getThemeButtonColor } from "../../../utils/themePageBackground";
import {
  DEVICE_TYPE_OPTIONS,
  OCCUPANCY_TYPE_OPTION,
  downloadCsvFile,
  formatPartialProcessorsWarning,
  getMaintenanceErrorMessage,
  isOccupancyReportSelected,
  onCategoryToggle,
} from "../../../../../shared/settings/maintenanceReport";

const Maintenance = () => {
  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || "#ffffff";
  const contentColor = appTheme?.application_theme?.content || "#f5f5f5";

  const isLightChrome = isLightSurface(contentColor);
  const buttonColor = getThemeButtonColor(appTheme?.application_theme?.button, backgroundColor);
  const textColor = isLightChrome ? "#111827" : "#ffffff";
  const mutedColor = isLightChrome ? "#6b7280" : "#cbd5e1";

  const [selectedTypes, setSelectedTypes] = useState(["devices"]);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const occupancySelected = isOccupancyReportSelected(selectedTypes);

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCategoryToggle = (value) => {
    setSelectedTypes((current) => onCategoryToggle(current, value));
    setDownloadError(null);
  };

  const handleDownload = async () => {
    if (!selectedTypes.length) {
      setDownloadError("Select at least one report category.");
      return;
    }

    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await BaseUrl.post("/settings/maintenance", {
        types: selectedTypes,
      });

      const data = response.data;
      if (!data?.csv) {
        throw new Error("Maintenance report did not include CSV data.");
      }

      downloadCsvFile(data.csv, data.filename);

      if (data.status === "partial") {
        const warning = formatPartialProcessorsWarning(data.processors_not_responding);
        if (warning) {
          showSnackbar(warning, "warning");
        } else {
          showSnackbar("Maintenance report downloaded successfully.", "success");
        }
      } else {
        showSnackbar("Maintenance report downloaded successfully.", "success");
      }
    } catch (err) {
      const message = getMaintenanceErrorMessage(err);
      setDownloadError(message);
      showSnackbar(message, "error");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SettingsLayout>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2,
          maxWidth: 980,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: textColor,
              mb: 0.5,
              fontSize: { xs: "14px", sm: "16px", md: "18px" },
            }}
          >
            Maintenance Report
          </Typography>
          <Typography sx={{ color: mutedColor, fontSize: { xs: 12, sm: 13, md: 14 } }}>
            Generate a live report from all processors. Select device categories or area occupancy mode.
          </Typography>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: "1px solid",
            borderColor: isLightChrome ? "#e5e7eb" : "rgba(255,255,255,0.18)",
            backgroundColor: isLightChrome ? "#ffffff" : "rgba(255,255,255,0.04)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography sx={{ color: textColor, fontWeight: 600, fontSize: { xs: 12, sm: 13, md: 14 } }}>
              Device Categories
            </Typography>

            <FormGroup>
              {DEVICE_TYPE_OPTIONS.map((opt) => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={selectedTypes.includes(opt.value)}
                      onChange={() => handleCategoryToggle(opt.value)}
                      disabled={occupancySelected}
                      size="small"
                    />
                  }
                  label={opt.label}
                  sx={{ color: textColor }}
                />
              ))}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={occupancySelected}
                    onChange={() => handleCategoryToggle(OCCUPANCY_TYPE_OPTION.value)}
                    disabled={selectedTypes.some((type) => type !== OCCUPANCY_TYPE_OPTION.value)}
                    size="small"
                  />
                }
                label={OCCUPANCY_TYPE_OPTION.label}
                sx={{ color: textColor }}
              />
            </FormGroup>

            {occupancySelected && (
              <Typography sx={{ color: mutedColor, fontSize: { xs: 11, sm: 12, md: 13 } }}>
                Occupancy mode reports may take a few minutes to complete.
              </Typography>
            )}

            {downloadError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {downloadError}
              </Alert>
            )}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleDownload}
              disabled={downloading || !selectedTypes.length}
              startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <FileDownloadOutlined />}
              sx={{
                backgroundColor: buttonColor,
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
                "&:hover": {
                  backgroundColor: buttonColor,
                  filter: "brightness(0.95)",
                },
              }}
            >
              {downloading ? "Preparing Report…" : "Download Report"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Snackbar
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        autoHideDuration={5000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SettingsLayout>
  );
};

export default Maintenance;
