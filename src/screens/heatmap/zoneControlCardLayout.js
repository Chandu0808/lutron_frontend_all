/** Shared width rules for zone control cards in the floorplan sidebar and area settings dialog. */
export const ZONE_CONTROL_CARD_WIDTH_SX = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
};

export const ZONE_CONTROL_SLIDER_WRAP_SX = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};

/** Outer status panel: clip horizontal bleed; vertical scroll lives in inner sections. */
export const HEATMAP_STATUS_PANEL_OVERFLOW_SX = {
  overflowX: "hidden",
  overflowY: "hidden",
};

/** Fallback scroll for the full sidebar body below the header. */
export const HEATMAP_SIDEBAR_MAIN_SCROLL_SX = {
  flex: "1 1 0%",
  height: 0,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

/** Zones section stays content-sized up to a cap (no empty flex stretch). */
export const HEATMAP_ZONES_SECTION_SX = {
  flexShrink: 0,
  minHeight: 0,
  overflow: "hidden",
};

/** Scroll zone cards when they exceed the capped list height. */
export const HEATMAP_ZONES_LIST_SCROLL_SX = {
  maxHeight: {
    xs: 120,
    sm: 140,
    md: 180,
    lg: 220,
    xl: 240,
  },
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};
