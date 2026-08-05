/** Shared width rules for zone control cards in the floorplan sidebar and area settings dialog. */
export const ZONE_CONTROL_CARD_WIDTH_SX = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  alignSelf: "stretch",
};

export const ZONE_CONTROL_SLIDER_WRAP_SX = {
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
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
    xs: 220,
    sm: 270,
    md: 320,
    lg: 380,
    xl: 420,
  },
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

/** Paginated sidebar: exactly two zone cards visible, no inner scroll. */
export const HEATMAP_ZONES_LIST_PAGINATED_SX = {
  maxHeight: {
    xs: 240,
    sm: 290,
    md: 340,
    lg: 400,
    xl: 440,
  },
  minHeight: 0,
  overflowY: "hidden",
  overflowX: "hidden",
};

/**
 * When shades are visible, cap zone list height (like customized sidebar balance)
 * so shades + Apply stay in view; inner scroll keeps yellow CCT sliders reachable.
 */
export const HEATMAP_ZONES_LIST_WITH_SHADES_SCROLL_SX = {
  maxHeight: {
    xs: 236,
    sm: 272,
    md: 308,
    lg: 332,
    xl: 356,
  },
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

export const HEATMAP_ZONES_LIST_WITH_SHADES_PAGINATED_SX = {
  maxHeight: {
    xs: 236,
    sm: 272,
    md: 308,
    lg: 332,
    xl: 356,
  },
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
};

/**
 * Advanced sidebar shell — fixed-height column; body below is the scrollport.
 * flex min-height:0 prevents content from forcing the panel taller than the heatmap.
 */
export const ADVANCED_HEATMAP_SIDEBAR_SX = {
  flex: "0 0 auto",
  height: "100%",
  maxHeight: "100%",
  alignSelf: "stretch",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "hidden",
};

/** Fixed header (not sticky) — body scrolls underneath. */
export const ADVANCED_HEATMAP_SIDEBAR_STICKY_HEADER_SX = {
  flexShrink: 0,
  position: "relative",
  zIndex: 3,
};

/**
 * Body is the vertical scroll container.
 * flex 1 1 0% + height 0 forces a definite height so overflow-y can activate.
 * Scrollbar colors follow theme tokens (see --heatmap-sidebar-scrollbar-*).
 */
export const ADVANCED_HEATMAP_SIDEBAR_BODY_SX = {
  flex: "1 1 0%",
  height: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflowX: "hidden",
  overflowY: "scroll",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  scrollbarWidth: "thin",
  scrollbarColor:
    "var(--heatmap-sidebar-scrollbar-thumb, var(--app-button, #4a586c)) var(--heatmap-sidebar-scrollbar-track, rgba(0, 0, 0, 0.18))",
  "&::-webkit-scrollbar": {
    width: "10px",
    display: "block",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "var(--heatmap-sidebar-scrollbar-track, rgba(0, 0, 0, 0.18))",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "var(--heatmap-sidebar-scrollbar-thumb, var(--app-button, #4a586c))",
    borderRadius: "5px",
    minHeight: "48px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor:
      "var(--heatmap-sidebar-scrollbar-thumb-hover, var(--heatmap-sidebar-scrollbar-thumb, var(--app-button, #3a4658)))",
  },
};
