/** Customized heatmap: zone cards span full sidebar width (includes fade/delay column). */
export const ZONE_CONTROL_CARD_WIDTH_SX = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  alignSelf: "stretch",
};

export const ZONE_CONTROL_MAIN_PANEL_SX = {
  flex: "1 1 0%",
  minWidth: 0,
  boxSizing: "border-box",
};

export const ZONE_CONTROL_FADE_DELAY_COLUMN_SX = {
  flexShrink: 0,
  width: { xs: 72, sm: 80, md: 88 },
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
 * Customized sidebar shell — fixed-height column; body below is the scrollport.
 * flex min-height:0 prevents content from forcing the panel taller than the heatmap.
 */
export const CUSTOMIZED_HEATMAP_SIDEBAR_SX = {
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
export const CUSTOMIZED_HEATMAP_SIDEBAR_STICKY_HEADER_SX = {
  flexShrink: 0,
  position: "relative",
  zIndex: 3,
};

/**
 * Body is the vertical scroll container.
 * flex 1 1 0% + height 0 forces a definite height so overflow-y can activate.
 */
export const CUSTOMIZED_HEATMAP_SIDEBAR_BODY_SX = {
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
  scrollbarColor: "rgba(128, 120, 100, 0.75) rgba(0, 0, 0, 0.08)",
  "&::-webkit-scrollbar": {
    width: "10px",
    display: "block",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(128, 120, 100, 0.65)",
    borderRadius: "5px",
    minHeight: "48px",
  },
};
