# Phase 6.2B.6 — PeakAndMinimumConsumptionWidget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `peak_and_minimum_consumption` widget from all three `Dashboard.jsx` variants

---

## Pre-Work Audit Summary

All three variants computed peak/min from **consumption chart data** (not the Redux `peakMinConsumption` payload directly). Remaining duplication was the widget adapter layer: loading gate, chart-data transform, peak/min calculation, display formatting, and twin metric-panel rendering.

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| Data source | `transformDataForCharts(energyConsumption, 'consumption')` | Same | Same |
| Peak/min calc | `calculatePeakMinFromChartData` + empty-chart null guard | Same | Same |
| Display format | `formatPeakMinDisplay` with unit/duration/date | Same | Same |
| Loading gate | `!allEnergyChartsReady \|\| energyConsumptionLoading \|\| peakMinConsumptionLoading \|\| chartLoading.peakMinConsumption` | Same | Same |
| Panel layout | MUI `Box` stretch panels, 12px gap | Inline divs, 15px gap, `DASHBOARD_CHART_LOADING_BG` | Inline divs, `#232323`, 15px gap |
| Basic light theme | Blue inner panel (`#1565C0`), light spinner track | — | — |
| Advanced border | — | Optional `metricPanelBorder` | — |
| Export UI | Not wired (commented in advanced) | Commented out | Not wired |
| Export thunks | `sendPeakMinConsumptionEmail` / `downloadPeakMinConsumption` | Same | Same (custom-graph path) |
| Outer chrome | `LongPressDraggable` + 200px card | Grid card shell + title | `BUILTIN_COMPACT_PANEL` + header |

**Verified:** Peak/min helper modules (`calculatePeakMinFromChartData`, `formatPeakMinDisplay`, `formatPeakMinTimeLabel`) were consumed, not modified.

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| Loading state machine | **100%** |
| Chart data transform pipeline | **100%** |
| Peak/min calculation + empty guard | **100%** |
| Display formatting options | **100%** |
| Metric panel structure (Peak Load / Min Load) | **100%** |
| Theme/surface tokens | **~55%** (basic stretch vs centered; light vs dark) |
| Export thunk identifiers | **100%** (UI unwired — preserved) |
| **Weighted widget-layer duplication removed** | **~92%** |

---

## Peak/Min Calculation Dependency Map

```
energyConsumption (Redux)
  └── transformDataForCharts(data, 'consumption')     [variant passes fn — unchanged]
        └── resolvePeakMinConsumptionChartData
              └── resolvePeakMinConsumptionPeakMin
                    ├── empty chartData → { peak/min: null }
                    └── calculatePeakMinFromChartData   [6.2A helper — unchanged]
                          └── resolvePeakMinConsumptionDisplayEntry
                                └── formatPeakMinDisplay  [6.2A helper — unchanged]
                                      └── formatPeakMinTimeLabel (this-week branch)

Loading coordination (not display data):
  allEnergyChartsReady
  energyConsumptionLoading
  peakMinConsumptionLoading        [Redux selector — unchanged]
  chartLoading.peakMinConsumption    [variant orchestration — unchanged]

Export routing (foundation only):
  resolvePeakMinConsumptionExportActions(thunks)
    → sendPeakMinConsumptionEmail / downloadPeakMinConsumption
  resolveEnergyExportByApiPath('/dashboard/peak_min_consumption')  [customized — unchanged]
```

---

## Prop Matrix

### Shared props (`PeakMinConsumptionWidget`)

| Prop | Type | Owner |
|------|------|-------|
| `energyConsumption` | object | Redux (`memoizedEnergyConsumption`) |
| `allEnergyChartsReady` | boolean | Variant orchestration |
| `energyConsumptionLoading` | boolean | Redux |
| `peakMinConsumptionLoading` | boolean | Redux `selectUnifiedPeakMinConsumptionLoading` |
| `chartLoadingPeakMinConsumption` | boolean | Variant `chartLoading.peakMinConsumption` |
| `transformDataForCharts` | function | Variant (unchanged) |
| `selectedDuration` | string | Variant date state |
| `currentDate` | string | Variant date state |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | Variant |
| `isLargeScreen` | boolean | Variant layout |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `chartSurface` | `energyLineChartSurface` (light/dark) | — | — |
| `metricPanelBorder` | — | `metricPanelBorder` | — |
| Outer card shell | `LongPressDraggable` + MUI Box | Grid `chart-card-animated` div | `BUILTIN_COMPACT_PANEL` + header |
| Title / export chrome | Variant header row | Variant header row | `buildEnergyBuiltinRender` header |
| Drag wrapper | `LongPressDraggable` | — | `buildEnergyBuiltinRender` |

### Export / email dependency matrix

| Layer | Dependency | Modified |
|-------|------------|----------|
| Email thunk | `sendPeakMinConsumptionEmail` | No |
| Download thunk | `downloadPeakMinConsumption` | No |
| Widget resolver | `resolvePeakMinConsumptionExportActions(thunks)` | **New** |
| API-path resolver | `resolveEnergyExportByApiPath` → peak_min_consumption | No |
| Export UI in Dashboard | Commented / unwired (preserved) | No |
| Redux slice / APIs | Unchanged | No |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/peakmin/PeakMinConsumptionWidget.jsx` | Loading + display model resolution, memo adapter |
| `src/shared/dashboard/widgets/peakmin/PeakMinConsumptionCard.jsx` | Peak/Min metric panel rendering + loader |
| `src/shared/dashboard/widgets/peakmin/peakMinConsumptionTheme.js` | Theme presets + loading resolver |
| `src/shared/dashboard/widgets/peakmin/peakMinConsumptionResolvers.js` | Chart data, peak/min, display, export resolvers |
| `src/shared/dashboard/widgets/peakmin/peakMinConsumptionMemoCompare.js` | Memo comparator + legacy loading helpers |
| `src/shared/dashboard/widgets/peakmin/index.js` | Barrel (default + named exports) |
| `src/shared/dashboard/widgets/peakmin/peakMinConsumptionParity.test.js` | Parity tests |

**Barrel updated:** `src/shared/dashboard/widgets/index.js` → `export * from './peakmin'`

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Removed inline peak/min useMemos; slot uses `PeakMinConsumptionWidget` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Removed inline peak/min useMemos; grid slot uses widget |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Removed inline peak/min useMemos; energy card uses widget |
| `src/shared/dashboard/widgets/index.js` | Re-export peakmin bundle |

**Not modified:** `EnergyLineChartAdapter`, `UnifiedEnergyWidget`, `transformDataForCharts`, peak/min helper modules, Redux/selectors/thunks/APIs, `DashboardOverview`, Alerts, `SpaceUtilization`, widget ordering/visibility/drag-drop.

---

## LOC Before / After

### Variant `Dashboard.jsx` (post 6.2B.5 baseline)

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/Dashboard.jsx` | 5,095 | 4,959 | **−136** |
| `advanced/Dashboard.jsx` | 4,332 | 4,203 | **−129** |
| `customized/Dashboard.jsx` | 6,464 | 6,307 | **−157** |
| **Variant total** | **15,891** | **15,469** | **−422** |

### Shared production modules added

| Module | LOC |
|--------|-----|
| `PeakMinConsumptionCard.jsx` | 138 |
| `peakMinConsumptionTheme.js` | 77 |
| `PeakMinConsumptionWidget.jsx` | 75 |
| `peakMinConsumptionMemoCompare.js` | 43 |
| `peakMinConsumptionResolvers.js` | 36 |
| `index.js` | 20 |
| **Total production** | **389** |

### Tests added: 201 LOC, 17 tests

**Net monolith reduction:** ~422 LOC  
**Net codebase delta:** −33 LOC excluding tests (−422 + 389); +201 LOC tests → **+168 LOC** overall

---

## Parity Verification

| Check | Result |
|-------|--------|
| Basic loading parity | PASS |
| Advanced loading parity | PASS |
| Customized loading parity | PASS |
| Peak calculation | PASS |
| Minimum calculation | PASS |
| Empty chart → No data | PASS |
| Display formatting (value + time) | PASS |
| Basic light theme | PASS |
| Advanced theme + border | PASS |
| Customized centered theme | PASS |
| Export routing | PASS |
| Memo comparator | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 33 passed, 33 total
Tests:       317 passed, 317 total  (+17 new peak/min tests)

npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. Restore inline `energyConsumptionChartData`, `energyConsumptionPeakMin`, `peakConsumptionDisplay`, `minConsumptionDisplay`, `isPeakMinLoading`, and `renderPeakMinLoader` in all three `Dashboard.jsx` files.
2. Re-import `calculatePeakMinFromChartData` and `formatPeakMinDisplay` in each variant.
3. Revert widget slot JSX to inline Peak/Min metric panels.
4. Remove `PeakMinConsumptionWidget` imports.
5. Delete `src/shared/dashboard/widgets/peakmin/` directory (all 7 files).
6. Revert `export * from './peakmin'` in `src/shared/dashboard/widgets/index.js`.
7. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, or chart helper changes were made; rollback is presentation-layer only.

---

## Architecture

```
Dashboard.jsx (variant)
  ├── outer card shell / drag wrapper / title (unchanged)
  └── PeakMinConsumptionWidget
        ├── resolvePeakMinConsumptionLoading
        ├── resolvePeakMinConsumptionDisplayModel
        │     ├── transformDataForCharts → chartData
        │     ├── calculatePeakMinFromChartData (helper)
        │     └── formatPeakMinDisplay (helper)
        ├── resolvePeakMinConsumptionTheme
        └── PeakMinConsumptionCard
              ├── Peak Load panel
              └── Min Load panel
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- `AlertsWidget` extraction
- Space widget work
- Dashboard container extraction
- `UnifiedEnergyWidget` / chart primitive changes
