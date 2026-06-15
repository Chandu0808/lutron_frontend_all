# Phase 6.2A.3D — Space LineChartComponent Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `utilization` widget `LineChartComponent` only (occupancy count area/line chart)

---

## Summary

Extracted the duplicated `LineChartComponent` infrastructure from all three `SpaceUtilization.jsx` variants into shared primitives under `src/shared/dashboard/charts/space/`. Variants now use thin `SpaceLineChartAdapter` wrappers. Transforms from 6.2A.1 are reused without duplication.

**Out of scope (unchanged):** `utilization_by_area` (uses `StackedBarChartComponent` + table), `utilization_by_area_group`, `InstantOccupancyChartComponent`, `StackedBarChartComponent`, custom graphs, widget layout, `DashboardOverview`, Redux, selectors, thunks, routes.

---

## Files Added

| File | Purpose |
|------|---------|
| `src/shared/dashboard/charts/space/SpaceLineChartAdapter.jsx` | Theme wiring, status machine, dataset pipeline |
| `src/shared/dashboard/charts/space/SpaceLineChartView.jsx` | Recharts AreaChart/LineChart, axes, tooltip, states |
| `src/shared/dashboard/charts/space/SpaceLineTooltip.jsx` | Tooltip label + occupancy value formatting |
| `src/shared/dashboard/charts/space/SpaceChartCardShell.jsx` | Loading / empty / error shells |
| `src/shared/dashboard/charts/space/spaceLineChartTheme.js` | Variant theme presets |
| `src/shared/dashboard/charts/space/spaceLineChartConfig.js` | Axis config, % logic, status, dataset builder |
| `src/shared/dashboard/charts/space/spaceLineChartMemoCompare.js` | React.memo comparator + parity helpers |
| `src/shared/dashboard/charts/space/spaceLineChartPlotHandlers.js` | Plot event handlers + dot renderer |
| `src/shared/dashboard/charts/space/index.js` | Barrel exports |
| `src/shared/dashboard/charts/space/spaceLineChartParity.test.js` | Dataset, tooltip, export, memo parity |
| `src/shared/dashboard/charts/space/SpaceLineChartView.test.jsx` | Shell state tests |
| `scripts/phase63d-splice-space-line-chart.js` | Splice automation |
| `scripts/fragments/space-line-chart-basic.jsx` | Basic variant wrapper fragment |
| `scripts/fragments/space-line-chart-advanced.jsx` | Advanced variant wrapper fragment |
| `scripts/fragments/space-line-chart-customized.jsx` | Customized variant wrapper fragment |

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Replaced ~716-line `LineChartComponent` with adapter wrapper; removed unused transform imports |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Replaced ~715-line `LineChartComponent` with adapter wrapper |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Replaced ~722-line `LineChartComponent` with adapter wrapper |

---

## SpaceLineChart Prop Matrix

### Shared props (all variants)

| Prop | Type | Source |
|------|------|--------|
| `occupancyCount` | API payload | Redux selector |
| `occupancyCountLoading` | boolean | Redux / local |
| `anyLoading` | boolean | parent closure |
| `isLoading` | boolean | parent closure |
| `globalLoadingProp` | boolean | parent closure |
| `selectedDuration` | string | duration controls |
| `currentDate` | string | date state |
| `currentYear` | number | date state |
| `customDateRange` | `{ startDate, endDate }` | custom range |
| `isNavigating` | boolean | navigation guard (chart key) |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `spaceShell` | dynamic `useMemo` tokens | — | — |
| `lineSeriesColor` | — | `occupancyLineColor` | — |
| `cardBackground/Border/Shadow` | — | `CARD_*` constants | — |
| `isFullscreen` | — | — | `isUtilizationFullscreen` |

### Theme / render differences

| Aspect | Basic | Advanced | Customized |
|--------|-------|----------|------------|
| Chart type | **AreaChart** (filled) | **LineChart** | **LineChart** |
| Plot height | `350px` fixed | `350px` fixed | `100%` flex fill |
| Surface colors | `spaceShell.*` (light/dark) | `CARD_BACKGROUND` + white axes | `#767061` plot, `#807864` tooltip |
| Series color | `spaceShell.areaStroke` | theme-aware `occupancyLineColor` | `#87CEEB` / `#00B0FF` fullscreen |
| Stroke width | 2 | 2 | 2 / 4 fullscreen |
| Fill opacity | 0.55 | 0 (line only) | 0 (line only) |

### Export button differences

Export buttons remain on the **widget card shell** in `SpaceUtilization.jsx` (not inside chart). Routing unchanged via 6.2A.2 `resolveSpaceExportThunks`:

| Widget | `dropdownKey` | Thunks |
|--------|---------------|--------|
| `utilization` | `line` | `downloadOccupancyCount`, `sendOccupancyCountEmail` |
| `utilization_by_area` | `table` | `downloadSpaceUtilizationPer`, `sendSpaceUtilizationPerEmail` |

### Legend

No Recharts `<Legend>` in legacy chart. Single series named `"Occupancy"` (tooltip only). Legend parity = N/A (single-series).

### Custom graph interactions

Plot-container mouse/touch propagation guards preserved in `spaceLineChartPlotHandlers.js`.

---

## Overlap Percentage

| Component | Basic ↔ Advanced | Basic ↔ Customized | Advanced ↔ Customized |
|-----------|------------------|--------------------|-----------------------|
| Status machine | 100% | 100% | 100% |
| `spaceOccupancyToRecharts` usage | 100% | 100% | 100% |
| `getChartConfig` / week filter | 100% | 100% | 100% |
| `shouldShowPercentage` | 100% | 100% | 100% |
| Tooltip logic | 100% | 100% | 100% |
| Axis tick builders | 100% | 100% | 100% |
| Recharts structure | ~92% | ~92% | ~98% |
| **Overall logic overlap** | **~95%** | **~95%** | **~97%** |

Variant-only divergence: basic AreaChart vs advanced/customized LineChart; customized fullscreen color/width; shell styling.

---

## LOC Impact

| Metric | Lines |
|--------|------:|
| Removed from variants (×3) | ~2,153 |
| Added variant wrappers (×3) | ~51 |
| Added shared `space/` modules | ~1,386 |
| **Net reduction** | **~716** |

---

## Parity Verification

| Check | Result |
|-------|--------|
| Loading state | PASS — spinner shell via `SpaceChartCardShell` |
| Empty state | PASS — `"No occupancy data available for Utilization"` |
| Error state | PASS — `"Error loading occupancy data"` |
| Populated chart | PASS — build succeeds; Recharts renders in view |
| Single-series | PASS — one `occupancy` series |
| Multi-slot week data | PASS — null gaps preserved |
| Duration switching | PASS — `this-day` / `this-week` / `custom` fixtures |
| Tooltip labels | PASS — `formatSpaceTooltipLabel` parity |
| Tooltip %/count | PASS — `shouldShowSpaceOccupancyPercentage` |
| Dataset pipeline | PASS — `legacy === shared` for fixture matrix |
| Memo comparator | PASS — deep-equal `occupancyCount` skip-render |

---

## Export Verification

| Export | Route | Verified |
|--------|-------|----------|
| `downloadOccupancyCount` | `Utilization` + `dropdownKey: line` | PASS |
| `sendOccupancyCountEmail` | `Utilization` + `dropdownKey: line` | PASS |
| `downloadSpaceUtilizationPer` | `Utilization By Area` (unchanged, separate widget) | PASS |

---

## Tests

```
npm test -- --testPathPattern=shared/dashboard
```

**Result:** 158/158 PASS (was 131; +27 new tests)

New suites:
- `space/spaceLineChartParity.test.js` — dataset, tooltip, empty/loading, theme, export, memo
- `space/SpaceLineChartView.test.jsx` — shell states

---

## Build

```
npm run build
```

**Result:** PASS (compiled successfully)

---

## Transforms Reused (6.2A.1)

- `spaceOccupancyToRecharts` — dataset normalization
- `formatSpaceOccupancyXAxisLabel` — axis tick formatting (in view)
- `calculatePeakMinFromOccupancyPayload` — not used by line chart (peak/min widget separate)

---

## Stop Boundary

Did **not** begin:
- StackedBarChartComponent extraction
- InstantOccupancyChartComponent extraction
- Widget extraction
- DashboardOverview extraction

---

## Note on `utilization_by_area`

The task context referenced `utilization_by_area`; that widget uses **StackedBarChartComponent** and a per-area table, not `LineChartComponent`. Per explicit scope constraints, it was not modified in 6.2A.3D.
