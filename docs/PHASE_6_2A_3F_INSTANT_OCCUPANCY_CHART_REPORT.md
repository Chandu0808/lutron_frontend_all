# Phase 6.2A.3F — InstantOccupancyChartComponent Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `instant_occupancy_count` widget and basic-only `instant_utilization_combined` consumer

---

## Summary

Extracted the duplicated `InstantOccupancyChartComponent` from all three `SpaceUtilization.jsx` variants into shared primitives under `src/shared/dashboard/charts/space/`. Variants now use thin `InstantOccupancyChartAdapter` wrappers (~20 lines each). Pure transform logic moved to `instantOccupancyToRecharts.js` and `parseDashboardTimeAxisToMinutes.js`.

This completes the final major chart infrastructure extraction before widget extraction.

**Out of scope (unchanged):** `DashboardOverview`, widget extraction, Redux/selectors/thunks/routes, custom graphs, `EnergyCustomGraphCard`, combined-widget shell layout (`SpaceInstantUtilizationCombinedChart`).

---

## Files Added

| File | Purpose |
|------|---------|
| `src/shared/dashboard/charts/transforms/parseDashboardTimeAxisToMinutes.js` | Pure this-day axis minute parser |
| `src/shared/dashboard/charts/transforms/instantOccupancyToRecharts.js` | API x/y → Recharts row pipeline |
| `src/shared/dashboard/charts/space/InstantOccupancyChartAdapter.jsx` | Theme wiring, status machine, dataset pipeline |
| `src/shared/dashboard/charts/space/InstantOccupancyChartView.jsx` | Area/Line chart, axes, tooltip, footer, states |
| `src/shared/dashboard/charts/space/InstantOccupancyTooltip.jsx` | Label + occupancy value tooltip |
| `src/shared/dashboard/charts/space/instantOccupancyTheme.js` | Variant theme presets |
| `src/shared/dashboard/charts/space/instantOccupancyConfig.js` | Status, messages, footer model, dataset builder |
| `src/shared/dashboard/charts/space/instantOccupancyMemoCompare.js` | React.memo comparator + parity helpers |
| `src/shared/dashboard/charts/space/instantOccupancyParity.test.js` | Dataset, tooltip, export, memo parity |
| `src/shared/dashboard/charts/space/InstantOccupancyChartView.test.jsx` | Shell + footer state tests |
| `scripts/phase63f-splice-instant-occupancy-chart.js` | Splice automation |
| `scripts/fragments/instant-occupancy-basic.jsx` | Basic variant wrapper |
| `scripts/fragments/instant-occupancy-advanced.jsx` | Advanced variant wrapper |
| `scripts/fragments/instant-occupancy-customized.jsx` | Customized variant wrapper |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/dashboard/charts/space/index.js` | Export instant occupancy modules |
| `src/shared/dashboard/charts/transforms/index.js` | Export new transforms |
| `src/shared/dashboard/charts/transforms/formatSpaceInstantOccupancyXAxisLabel.js` | Import `parseDashboardTimeAxisToMinutes` |
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Replaced ~1,090-line component with adapter; removed orphaned `parseDashboardTimeAxisToMinutes` / `MONTH_NAME_TO_INDEX` |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Replaced ~893-line component with adapter; removed orphaned imports/constants |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Replaced ~900-line component with adapter; removed orphaned imports/constants |

---

## InstantOccupancy Prop Matrix

### Shared props (all variants)

| Prop | Type | Source |
|------|------|--------|
| `instantOccupancyCount` | API payload (`x-axis` / `y-axis`) | Redux selector |
| `instantOccupancyCountLoading` | boolean | Redux selector |
| `instantOccupancyCountError` | boolean | Redux selector |
| `anyLoading` | boolean | parent closure |
| `isLoading` | boolean | parent closure |
| `globalLoadingProp` | boolean | parent closure |
| `selectedDuration` | string | parent closure |
| `currentDate` | string | parent closure |
| `currentYear` | number | parent closure |
| `customDateRange` | `{ startDate, endDate }` | parent closure |
| `isNavigating` | boolean | parent closure |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `chartSurface` | `"dark"` / `"light"` (combined card) | — | — |
| `showChartsTab` | boolean (height clamp) | — | — |
| `enableUtilizationFooter` | `true` | — | — |
| `lineSeriesColor` | — | `occupancyLineColor` | — |
| `cardBackground/Border/Shadow` | — | `CARD_*` | — |
| `isFullscreen` | N/A | N/A | `isInstantOccupancyFullscreen` |

### Chart / theme differences

| Aspect | Basic | Advanced | Customized |
|--------|-------|----------|------------|
| Chart type | `AreaChart` (filled) | `LineChart` | `LineChart` |
| Height | `350px` / charts-tab `clamp(200px, 36vh, 300px)` | `350px` | `100%` flex fill |
| Series color | `#1565C0` | `occupancyLineColor` (default `#87CEEB`) | `#87CEEB` / fullscreen `#00B0FF` |
| Plot background | `#ffffff` (light/dark surface) | transparent (`null`) | `#767061` |
| Footer | Yes — utilization summary | No | No |
| Legend | None (legacy) | None | None |

### Combined-widget dependencies (basic only)

| Consumer | Wiring |
|----------|--------|
| `instant_utilization_combined` | `<InstantOccupancyChartComponent chartSurface={spaceUtilLight ? 'light' : 'dark'} />` inside `SpaceInstantUtilizationCombinedChart` |
| Export dropdown | `dropdownKey="instantCombined"` → `resolveSpaceExportThunks` routes to `downloadOccupancyCount` / `sendOccupancyCountEmail` on space tab |

### Export dependencies (unchanged via 6.2A.2)

| Widget | Charts tab (`showChartsTab: true`) | Space tab |
|--------|-----------------------------------|-----------|
| `instant_occupancy_count` | `downloadInstantOccupancyCount` / `sendInstantOccupancyCountEmail` | same |
| `instant_utilization_combined` | N/A (basic shell) | `downloadOccupancyCount` / `sendOccupancyCountEmail` via `instantCombined` key |

---

## Overlap Percentage

| Category | Overlap |
|----------|---------|
| Status machine (loading / empty / error / ready) | ~100% |
| Dataset transform (`instantOccupancyToRecharts`) | ~100% |
| X-axis config + ticks | ~100% |
| Tooltip label + occupancy formatting | ~100% |
| Plot event handlers (`spaceLineChartPlotHandlers`) | ~100% |
| Chart shell (spinner, empty, error copy) | ~100% |
| Theme tokens | ~85% (basic light/dark surface; advanced card theme; customized fullscreen stroke) |
| Chart render mode | ~67% (basic AreaChart vs advanced/customized LineChart) |
| Footer model | basic-only |
| **Weighted overall duplication removed** | **~94%** |

---

## LOC Impact

| Metric | Lines |
|--------|-------|
| Removed from basic `SpaceUtilization.jsx` | ~1,122 |
| Removed from advanced `SpaceUtilization.jsx` | ~891 |
| Removed from customized `SpaceUtilization.jsx` | ~901 |
| **Total variant LOC removed** | **~2,914** |
| Shared production modules added | ~1,362 |
| **Net variant duplication reduction** | **~1,552** |

---

## Parity Verification

| Check | Result |
|-------|--------|
| 1. Dataset parity (`legacy === shared` fixture matrix) | PASS |
| 2. Tooltip parity (labels, occupancy values, this-day timestamps) | PASS |
| 3. Empty/loading parity | PASS |
| 4. Single-point edge case | PASS |
| 5. Multi-point this-week slot filling | PASS |
| 6. Export routing (`instant`, `instantCombined`) | PASS (via `spaceExportActionMap.test.js` + parity suite) |
| 7. Memo comparator parity | PASS |
| 8. Basic combined-widget (`chartSurface`, footer model) | PASS |

---

## Export Verification

Existing 6.2A.2 routing confirmed unchanged:

- `downloadInstantOccupancyCount` / `sendInstantOccupancyCountEmail` — charts-tab `instant` key
- `instant_utilization_combined` — space-tab `instantCombined` key → occupancy count thunks
- No changes to `spaceExportActionMap.js`, Redux thunks, or export button wiring in variant shells

---

## Build Result

```
npm run build — PASS (Compiled successfully)
```

Chunk size deltas (gzip): basic/advanced/customized dashboard chunks reduced ~2.6–3.8 kB each.

---

## Test Result

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 25 passed, 25 total
Tests:       209 passed, 209 total  (+26 new instant occupancy tests)
```

New test files:

- `instantOccupancyParity.test.js` — 22 tests
- `InstantOccupancyChartView.test.jsx` — 4 tests

---

## Architecture

```
InstantOccupancyChartAdapter (variant shell wiring)
  ├── resolveInstantOccupancyTheme (basic / advanced / customized)
  ├── resolveInstantOccupancyChartStatus
  ├── buildInstantOccupancyChartDataset
  │     └── instantOccupancyToRecharts (shared transform)
  └── InstantOccupancyChartView
        ├── AreaChart (basic) or LineChart (advanced/customized)
        ├── InstantOccupancyTooltip
        ├── UtilizationFooter (basic only)
        └── loading / empty / error shells
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- Widget extraction
- `DashboardOverview` extraction
- Dashboard container extraction

Next phase (6.2B+) may begin widget shell extraction using the shared chart primitives completed in 6.2A.3A–3F.
