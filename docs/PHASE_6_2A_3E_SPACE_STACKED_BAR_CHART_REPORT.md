# Phase 6.2A.3E — StackedBarChartComponent Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `utilization_by_area_group` widget `StackedBarChartComponent` (occupancy by group stacked bar chart)

---

## Summary

Extracted the duplicated `StackedBarChartComponent` from all three `SpaceUtilization.jsx` variants into shared primitives under `src/shared/dashboard/charts/space/`. Variants now use thin `SpaceStackedBarChartAdapter` wrappers. Pure transform logic moved to `occupancyByGroupToStackedBarRows.js`.

**Out of scope (unchanged):** `InstantOccupancyChartComponent`, `utilization_by_area` table view (`processAreaData`), custom graphs, widget layout, `DashboardOverview`, Redux, selectors, thunks, routes.

---

## Files Added

| File | Purpose |
|------|---------|
| `src/shared/dashboard/charts/transforms/occupancyByGroupToStackedBarRows.js` | Pure group + area transforms |
| `src/shared/dashboard/charts/space/SpaceStackedBarChartAdapter.jsx` | Theme wiring, status machine, dataset pipeline |
| `src/shared/dashboard/charts/space/SpaceStackedBarChartView.jsx` | Recharts BarChart, stacked bars, axes, tooltip, states |
| `src/shared/dashboard/charts/space/SpaceStackedBarTooltip.jsx` | Label + percentage tooltip |
| `src/shared/dashboard/charts/space/spaceStackedBarTheme.js` | Variant theme presets |
| `src/shared/dashboard/charts/space/spaceStackedBarConfig.js` | Status, messages, dataset builders |
| `src/shared/dashboard/charts/space/spaceStackedBarMemoCompare.js` | React.memo comparator + parity helpers |
| `src/shared/dashboard/charts/space/spaceStackedBarParity.test.js` | Dataset, tooltip, export, memo parity |
| `src/shared/dashboard/charts/space/SpaceStackedBarChartView.test.jsx` | Shell state tests |
| `scripts/phase63e-splice-space-stacked-bar-chart.js` | Splice automation |
| `scripts/fragments/space-stacked-bar-basic.jsx` | Basic variant wrapper |
| `scripts/fragments/space-stacked-bar-advanced.jsx` | Advanced variant wrapper |
| `scripts/fragments/space-stacked-bar-customized.jsx` | Customized variant wrapper |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/dashboard/charts/space/index.js` | Export stacked bar modules |
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Replaced ~474-line component with adapter |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Replaced ~470-line component with adapter |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Replaced ~478-line component with adapter |

---

## StackedBarChart Prop Matrix

### Shared props (all variants)

| Prop | Type | Source |
|------|------|--------|
| `activeOccupancyByGroup` | API payload | `showChartsTab ? occupancyByGroupFromLogs : occupancyByGroup` |
| `activeOccupancyByGroupLoading` | boolean | matching loading selector |
| `anyLoading` | boolean | parent closure |
| `isLoading` | boolean | parent closure |
| `globalLoadingProp` | boolean | parent closure |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `spaceShell` | dynamic tokens | — | — |
| `showChartsTab` | boolean (height clamp) | — | — |
| `stackedBarColors` | — | `getThemeAwareStackedBarPair` | — |
| `colorPalette` | `COLORS` | `chartPalette` | `COLORS` |
| `cardBackground/Border/Shadow` | — | `CARD_*` | — |
| `resolveGroupLabel` | default (`area_group_name`) | default | `resolveOccupancyGroupLabel` |
| `requireAreaGroupName` | `true` | `true` | `false` |
| `isFullscreen` | N/A | N/A | N/A (no fullscreen stroke change in legacy) |

### Color palette differences

| Variant | Unoccupied | Occupied | Per-bar `color` field |
|---------|------------|----------|----------------------|
| Basic | `#FFB3B3` | `#98FB98` | `COLORS[index]` |
| Advanced | theme `stackedBarColors.unoccupied` | theme `stackedBarColors.occupied` | `chartPalette[index]` |
| Customized | `#FFB3B3` | `#98FB98` | `COLORS[index]` |

### Plot height differences

| Variant | Height |
|---------|--------|
| Basic (main tab) | `400px` |
| Basic (charts tab) | `clamp(200px, 42vh, 340px)` |
| Advanced | `400px` |
| Customized | `100%` flex fill |

### Export button differences

Export buttons remain on widget card shells (not inside chart):

| Widget | `dropdownKey` | Thunks |
|--------|---------------|--------|
| `utilization_by_area_group` | `pie` | `downloadOccupancyByGroup`, `sendOccupancyByGroupEmail` |
| `utilization` (line chart) | `line` | `downloadOccupancyCount`, `sendOccupancyCountEmail` |
| `utilization_by_area` (table) | `table` | `downloadSpaceUtilizationPer`, `sendSpaceUtilizationPerEmail` |

Charts tab routes `pie` to `*_FromLogs` variants via 6.2A.2 `resolveSpaceExportThunks`.

---

## Overlap Percentage

| Component | Overlap across variants |
|-----------|------------------------|
| Status machine | 100% |
| `processStackedBarData` logic | 98% |
| Tooltip format (`{name}: {value}%`) | 100% |
| BarChart structure (axes, domain, stack order) | 100% |
| Event propagation guards | 100% |
| **Overall** | **~97%** |

Variant-only divergence: theme/shell, height, color pair source, customized label resolver + relaxed filter.

---

## Area Mode vs Group Mode

| Mode | Widget | Implementation |
|------|--------|----------------|
| **Group mode** | `utilization_by_area_group` | `occupancyByGroupToStackedBarRows` — wired in adapter |
| **Area mode** | `utilization_by_area` | Table view in variant (`processAreaData`); transform `occupancyUtilizedAreaToStackedBarRows` extracted for parity/tests |

Legacy `StackedBarChartComponent` only rendered group mode. Area mode table was not modified.

---

## LOC Impact

| Metric | Lines |
|--------|------:|
| Removed from variants (×3) | ~1,422 |
| Added variant wrappers (×3) | ~48 |
| Added shared modules + transform | ~1,249 |
| **Net reduction** | **~125** |

---

## Parity Verification

| Check | Result |
|-------|--------|
| Loading state | PASS |
| Empty state | PASS |
| Empty criteria | PASS |
| Error state | PASS |
| Populated chart | PASS |
| Single-bar | PASS |
| Multi-bar + sort by total | PASS |
| Group mode (_from_logs) | PASS |
| Group mode (count-based) | PASS |
| Area mode transform | PASS |
| Tooltip labels/values/% | PASS |
| Legend order (unoccupied → occupied) | PASS — no visible Recharts Legend in legacy; series names preserved |
| Dataset `legacy === shared` | PASS |
| Memo deep-equal skip | PASS |

---

## Export Verification

| Export | Route | Verified |
|--------|-------|----------|
| `downloadOccupancyByGroup` | `pie` + Occupancy by Group | PASS |
| `sendOccupancyByGroupEmail` | `pie` + Occupancy by Group | PASS |
| `downloadOccupancyCount` | `line` + Utilization | PASS |
| `sendOccupancyCountEmail` | `line` + Utilization | PASS |
| `downloadSpaceUtilizationPer` | `table` + Utilization By Area | PASS |

---

## Tests

```
npm test -- --testPathPattern=shared/dashboard
```

**Result:** 183/183 PASS (was 158; +25 new tests)

---

## Build

```
npm run build
```

**Result:** PASS (compiled successfully)

---

## Stop Boundary

Did **not** begin:
- InstantOccupancyChartComponent extraction
- Widget extraction
- DashboardOverview extraction
