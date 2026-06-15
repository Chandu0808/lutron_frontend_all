/**
 * @jest-environment node
 */

import {
  ZONE_CONTROL_CARD_WIDTH_SX,
  HEATMAP_STATUS_PANEL_OVERFLOW_SX,
  HEATMAP_SIDEBAR_MAIN_SCROLL_SX,
  HEATMAP_ZONES_SECTION_SX,
  HEATMAP_ZONES_LIST_SCROLL_SX,
} from "./zoneControlCardLayout";

describe("zoneControlCardLayout", () => {
  it("uses full-width zone cards", () => {
    expect(ZONE_CONTROL_CARD_WIDTH_SX).toMatchObject({
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
    });
  });

  it("keeps status panel overflow on the correct axes for nested scroll areas", () => {
    expect(HEATMAP_STATUS_PANEL_OVERFLOW_SX).toEqual({
      overflowX: "hidden",
      overflowY: "hidden",
    });
  });

  it("bounds sidebar main content height so overflow scroll can activate", () => {
    expect(HEATMAP_SIDEBAR_MAIN_SCROLL_SX).toMatchObject({
      flex: "1 1 0%",
      height: 0,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
    });
  });

  it("keeps the zones section content-sized instead of flex-stretching", () => {
    expect(HEATMAP_ZONES_SECTION_SX).toMatchObject({
      flexShrink: 0,
      minHeight: 0,
      overflow: "hidden",
    });
    expect(HEATMAP_ZONES_SECTION_SX.flex).toBeUndefined();
  });

  it("scrolls zone cards only after the list exceeds max height", () => {
    expect(HEATMAP_ZONES_LIST_SCROLL_SX).toMatchObject({
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
    });
    expect(HEATMAP_ZONES_LIST_SCROLL_SX.maxHeight.md).toBe(180);
    expect(HEATMAP_ZONES_LIST_SCROLL_SX.flex).toBeUndefined();
  });
});
