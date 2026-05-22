/**
 * FOFP admin UI helpers aligned with Settings / application theme.
 */

/** SweetAlert2 options consistent with other Settings screens. */
export const getFofpSwalOptions = (theme) => ({
  background:
    theme?.palette?.custom?.containerBg ||
    theme?.palette?.background?.default ||
    "#CDC0A0",
  customClass: { popup: "custom-swal-radius" },
});

/** Sticky toolbar shell inside Settings content panel. */
export const getFofpToolbarSx = (theme) => ({
  bgcolor: theme.palette.common.white,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape?.borderRadius ?? 8,
  boxShadow: theme.shadows?.[2] ?? "0 4px 14px rgba(0, 0, 0, 0.08)",
});

/** Primary action buttons using application theme button color. */
export const getFofpContainedButtonSx = (buttonColor) => ({
  backgroundColor: buttonColor,
  color: "#fff",
  textTransform: "none",
  fontWeight: 600,
  "&:hover": {
    backgroundColor: buttonColor,
    filter: "brightness(0.88)",
  },
  "&.Mui-disabled": {
    backgroundColor: buttonColor,
    color: "#fff",
    opacity: 0.45,
  },
});

/** Page title typography (matches Processors / Users settings). */
export const getFofpPageTitleSx = () => ({
  fontWeight: "bold",
  fontSize: { xs: "14px", sm: "16px", md: "18px" },
});

/** Floorplan viewer chrome (dark canvas behind PDF) — fixed slate frame, not theme divider. */
export const getFofpViewerChromeSx = () => ({
  bgcolor: "#0f172a",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
});

/** Floating zoom control bar on viewer. */
export const getFofpViewerZoomBarSx = (theme) => ({
  bgcolor: theme.palette.grey[900],
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 999,
  px: 1,
  py: 0.6,
  backdropFilter: "blur(8px)",
  opacity: 0.92,
});

export const getFofpViewerZoomButtonSx = (theme) => ({
  color: theme.palette.common.white,
  minWidth: 34,
  textTransform: "none",
  fontSize: theme.typography.body2?.fontSize,
  fontWeight: theme.typography.fontWeightMedium,
});
