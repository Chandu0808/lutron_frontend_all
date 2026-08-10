import React, { useCallback, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Grid,
  Paper,
  Snackbar,
  Typography,
} from "@mui/material";
import BuildOutlined from "@mui/icons-material/BuildOutlined";
import FileDownloadOutlined from "@mui/icons-material/FileDownloadOutlined";
import { useSelector } from "react-redux";
import { darken } from "@mui/material/styles";

import { UseAuth, getVisibleSidebarItemsWithPaths } from "../../../customhooks/UseAuth";
import SettingsSidebar from "../../../components/SettingsSidebar";
import { BaseUrl } from "../../../BaseUrl";
import { selectApplicationTheme } from "../../../redux/slice/theme/themeSlice";
import { isLightSurface } from "../../../utils/themeOnSurface";
import {
  settingsHelpLayoutShellSx,
  settingsHelpLayoutGridSx,
  settingsHelpLayoutContentColumnSx,
  settingsHelpWhitePaperSx,
} from "../../../utils/settingsPageLayout";
import {
  DEVICE_TYPE_OPTIONS,
  OCCUPANCY_TYPE_OPTION,
  downloadCsvFile,
  formatPartialProcessorsWarning,
  getMaintenanceErrorMessage,
  isOccupancyReportSelected,
  onCategoryToggle,
} from "../../../../../shared/settings/maintenanceReport";

/** Match other customized settings pages (Home / Processors / Alerts). */
const SETTINGS_FONT_FAMILY = "inherit";

const Maintenance = () => {
  const { role: currentUserRole } = UseAuth();
  const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(currentUserRole);

  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || "#CDC0A0";
  const buttonColor = appTheme?.application_theme?.button || "#232323";

  // Theme accent for checkbox border/check — keep visible on white paper.
  const checkboxColor = (() => {
    const button = String(buttonColor || "").trim();
    const background = String(backgroundColor || "").trim();
    if (button && !isLightSurface(button)) return button;
    if (background && !isLightSurface(background)) return background;
    return button || "#374151";
  })();

  const checkboxSx = {
    color: checkboxColor,
    p: 0.5,
    "&.Mui-checked": { color: checkboxColor },
    "&.MuiCheckbox-indeterminate": { color: checkboxColor },
    "&.Mui-disabled": { color: checkboxColor, opacity: 0.4 },
    "& .MuiSvgIcon-root": { fontSize: 22 },
  };

  // Same scale as Processors title + Home settings field labels.
  const titleSx = {
    fontFamily: SETTINGS_FONT_FAMILY,
    fontWeight: "bold",
    fontSize: { xs: "14px", sm: "16px", md: "18px" },
    lineHeight: 1.3,
    color: "rgba(0, 0, 0, 0.87)",
  };
  const bodyMutedSx = {
    fontFamily: SETTINGS_FONT_FAMILY,
    color: "#6b7280",
    mb: 2,
    fontSize: { xs: "12px", sm: "14px", md: "16px" },
    fontWeight: 400,
    lineHeight: 1.5,
  };
  const sectionHeadingSx = {
    fontFamily: SETTINGS_FONT_FAMILY,
    fontWeight: 600,
    fontSize: { xs: "12px", sm: "14px", md: "16px" },
    lineHeight: 1.4,
    color: "rgba(0, 0, 0, 0.87)",
  };
  const categoryLabelSx = {
    alignItems: "center",
    ml: 0,
    mr: 0,
    "& .MuiFormControlLabel-label": {
      fontFamily: SETTINGS_FONT_FAMILY,
      fontSize: { xs: "12px", sm: "14px", md: "16px" },
      fontWeight: 500,
      lineHeight: 1.45,
      color: "rgba(0, 0, 0, 0.87)",
    },
  };
  const hintSx = {
    fontFamily: SETTINGS_FONT_FAMILY,
    color: "#6b7280",
    fontSize: { xs: "11px", sm: "13px", md: "14px" },
    fontWeight: 400,
    lineHeight: 1.4,
  };

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
    <Box className="help-container" sx={settingsHelpLayoutShellSx}>
      <Grid container spacing={{ xs: 0.3, sm: 0.5, md: 1, lg: 1.5 }} sx={settingsHelpLayoutGridSx}>
        <SettingsSidebar items={visibleSidebarItemsWithPaths} />

        <Grid item xs={12} lg={9} sx={settingsHelpLayoutContentColumnSx}>
          <Paper
            sx={{
              ...settingsHelpWhitePaperSx,
              display: "flex",
              flexDirection: "column",
              fontFamily: SETTINGS_FONT_FAMILY,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <BuildOutlined sx={{ fontSize: 32, color: buttonColor }} />
              <Typography variant="h4" sx={titleSx}>
                Maintenance Report
              </Typography>
            </Box>

            <Typography sx={bodyMutedSx}>
              Generate a live report from all processors. Select device categories or area occupancy mode.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
              <Typography sx={sectionHeadingSx}>Device Categories</Typography>

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
                        sx={checkboxSx}
                      />
                    }
                    label={opt.label}
                    sx={categoryLabelSx}
                  />
                ))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={occupancySelected}
                      onChange={() => handleCategoryToggle(OCCUPANCY_TYPE_OPTION.value)}
                      disabled={selectedTypes.some((type) => type !== OCCUPANCY_TYPE_OPTION.value)}
                      size="small"
                      sx={checkboxSx}
                    />
                  }
                  label={OCCUPANCY_TYPE_OPTION.label}
                  sx={categoryLabelSx}
                />
              </FormGroup>

              {occupancySelected && (
                <Typography sx={hintSx}>
                  Occupancy mode reports may take a few minutes to complete.
                </Typography>
              )}

              {downloadError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {downloadError}
                </Alert>
              )}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                onClick={handleDownload}
                disabled={downloading || !selectedTypes.length}
                startIcon={downloading ? <CircularProgress size={18} color="inherit" /> : <FileDownloadOutlined />}
                sx={{
                  backgroundColor: buttonColor,
                  color: "#fff",
                  fontFamily: SETTINGS_FONT_FAMILY,
                  fontWeight: 700,
                  fontSize: { xs: "12px", sm: "14px", md: "16px" },
                  textTransform: "none",
                  "&:hover": { backgroundColor: darken(buttonColor, 0.12) },
                }}
              >
                {downloading ? "Preparing Report…" : "Download Report"}
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

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
    </Box>
  );
};

export default Maintenance;
