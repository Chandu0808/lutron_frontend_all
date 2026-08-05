/** Shared width rules for zone control cards in the floorplan sidebar and area settings dialog. */
export const ZONE_CONTROL_CARD_WIDTH_SX = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  alignSelf: "stretch",
};

export const ZONE_CONTROL_SLIDER_WRAP_SX = {
  position: "relative",
  // Narrower than full width so MUI thumbs at 0%/100% stay inside overflow-x:hidden zone lists.
  width: "85%",
  minWidth: 0,
  boxSizing: "border-box",
  pl: { xs: 1, md: 2 },
};

/** Classic vertical scrollbar styling (Chromium + Firefox). */
export const HEATMAP_SIDEBAR_SCROLLBAR_SX = {
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(30, 116, 197, 0.75) rgba(0, 0, 0, 0.1)",
  "&::-webkit-scrollbar": {
    width: "10px",
    display: "block",
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "rgba(30, 116, 197, 0.65)",
    borderRadius: "5px",
    minHeight: "48px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "rgba(30, 116, 197, 0.9)",
  },
};

/**
 * The sidebar panel itself is the scroll container.
 * Nested flex/absolute scrollports were clipped by overflow:hidden without scrolling.
 */
export const HEATMAP_STATUS_PANEL_OVERFLOW_SX = {
  overflowX: "hidden",
  overflowY: "scroll",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  minHeight: 0,
  ...HEATMAP_SIDEBAR_SCROLLBAR_SX,
};

/** Sticky header while the panel scrolls. */
export const HEATMAP_SIDEBAR_STICKY_HEADER_SX = {
  position: "sticky",
  top: 0,
  zIndex: 3,
  flexShrink: 0,
};

/** Kept for imports/tests — body is no longer a separate scrollport. */
export const HEATMAP_SIDEBAR_BODY_SLOT_SX = {
  display: "block",
  minHeight: 0,
};

export const HEATMAP_SIDEBAR_MAIN_SCROLL_SX = {
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  overflow: "visible",
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
