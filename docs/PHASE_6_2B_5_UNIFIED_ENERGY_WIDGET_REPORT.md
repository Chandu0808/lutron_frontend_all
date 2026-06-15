# Phase 6.2B.5 — Unified Energy Widget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `consumption` + `savings` line-chart widgets from all three `Dashboard.jsx` variants (extracted together via `mode`)

---

## Pre-Work Audit Summary

All three variants already delegated chart rendering to `EnergyLineChartAdapter` through a local `EnergyLineChart` memo wrapper. Remaining duplication was the **widget adapter layer** for both consumption and savings: identical loading gates, theme/surface resolution, `EnergyLineChartAdapter` prop wiring, peak/min pipeline helpers, and export action routing.

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| Chart layer | `EnergyLineChartAdapter` via local memo | Same | Same |
| Loading gate | `!allEnergyChartsReady \|\| energy*Loading \|\| !energy* \|\| chartLoading.*` | Same | Same |
| Custom-date blank gate | `customDatesIncomplete` → null data, `isLoading: false`, `emptyStateVariant: 'blank'` | — | — |
| Basic empty extras | `renderEnergyLineChartEmptyExtras` when duration filter hidden | — | — |
| Basic blank preview | `consumptionBlankPreview` on both slots | — | — |
| Theme shell | `basic-energy` + light/dark surface | `advanced-card` + palette resolvers | `customized-builtin` + bold stroke |
| Legend series name | — | — | Per-mode `legendSeriesName` on customized surface |
| Export UI | `consumptionExportControl` / `savingsExportControl` useMemos | Same | Same |
| Export handlers | `handleConsumptionEmail/Download`, `handleSavingsEmail/Download` | Same | Same |
| Export map keys | `Consumption` / `Savings` via `createEnergyExportActionMap` | Same | Same |
| Peak/min display | Computed in Dashboard for `peak_and_minimum_consumption` widget | Same | Same |

**Verified:** All variants used `EnergyLineChartAdapter` — no chart primitive rework performed.

---

## Overlap Analysis

| Category | Consumption ↔ Savings Overlap | Basic ↔ Advanced ↔ Customized Overlap |
|----------|------------------------------|---------------------------------------|
| Loading state machine | **100%** (same gate, different Redux flags) | **~95%** (basic adds `customDatesIncomplete` bypass) |
| Data pass-through | **100%** (`energyConsumption` / `energySavings` → `energyData`) | **100%** |
| `transformDataForCharts` wiring | **100%** (mode selects chart type: `consumption` vs `other`) | **100%** |
| `EnergyLineChartAdapter` prop surface | **100%** | **~60%** (theme/surface tokens differ per variant) |
| Empty / blank state | **100%** | **~80%** (basic-only extras + blank preview) |
| Export thunk routing | **100%** (mode switches Consumption vs Savings keys) | **100%** |
| Peak/min pipeline helpers | **100%** (shared resolvers; separate widget still owns display) | **100%** |
| Memo comparator structure | **100%** | **100%** |
| **Weighted widget-layer duplication removed** | **~95%** | **~90%** |

Extracting consumption and savings **together** (single `UnifiedEnergyWidget` with `mode`) avoids duplicating the shared layer twice and keeps export/loading/theme resolvers mode-aware in one module.

---

## Shared Pipeline Diagram

```
Dashboard.jsx (variant)
  ├── slot shell / drag wrapper / duration-date controls (unchanged)
  ├── exportControl useMemo (variant chrome)
  ├── handle*Email/Download handlers (variant)
  └── UnifiedEnergyWidget  mode: consumption | savings
        ├── resolveUnifiedEnergyLoading
        ├── resolveUnifiedEnergyData
        ├── resolveUnifiedEnergyEmptyStateVariant
        ├── resolveUnifiedEnergyTheme  (basic | advanced | customized preset)
        └── UnifiedEnergyCard
              └── EnergyLineChartAdapter (unchanged, 6.2A.3A)
                    └── EnergyLineChartView

Peak/min (for peak_and_minimum_consumption widget — not extracted):
  energyData + mode
    → resolveUnifiedEnergyChartData(transformDataForCharts)
    → resolveUnifiedEnergyPeakMin(calculatePeakMinFromChartData)
    → resolveUnifiedEnergyPeakMinDisplay(formatPeakMinDisplay)

Export routing (foundation, not UI):
  mode + thunks
    → resolveUnifiedEnergyExportActions
    → createEnergyExportActionMap[Consumption | Savings]
```

---

## Prop Matrix

### Shared props (`UnifiedEnergyWidget`)

| Prop | Type | Owner |
|------|------|-------|
| `mode` | `'consumption' \| 'savings'` | Variant (`UNIFIED_ENERGY_WIDGET_MODES`) |
| `title` | string | Variant (`getWidgetTitle`) |
| `energyData` | object | Redux (`memoizedEnergyConsumption` / `memoizedEnergySavings`) |
| `allEnergyChartsReady` | boolean | Variant orchestration |
| `energyLoading` | boolean | Redux loading flag per mode |
| `chartLoadingFlag` | boolean | Variant `chartLoading.energyConsumption` / `.energySavings` |
| `colors` | string[] | Variant palette useMemo |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | Variant |
| `transformDataForCharts` | function | Variant (unchanged) |
| `selectedDuration` | string | Variant date state |
| `currentDate` | string | Variant date state |
| `currentYear` | number | Variant date state |
| `selectedAreas` | array | Variant area selection |
| `exportControl` | ReactNode | Variant export button chrome |
| `ChartLoader` | component | Variant |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `chartSurface` | `energyLineChartSurface` (light/dark) | — | — |
| `customDatesIncomplete` | `energyCustomNeedsDates` | — | — |
| `energyLightFullCardHeightPx` | `ENERGY_LIGHT_FULL_CARD_HEIGHT_PX` | — | — |
| `emptyStateExtras` | `renderEnergyLineChartEmptyExtras()` | — | — |
| `blankChartPreview` | `consumptionBlankPreview` | — | — |
| `advancedSurface` | — | `unifiedEnergyAdvancedSurface` | — |
| `customizedSurface` | — | — | `consumptionCustomizedSurface` / `savingsCustomizedSurface` (incl. `legendSeriesName`) |
| `chartHeaderStyle` | yes | yes | yes |

### Export / email dependency matrix

| Layer | Consumption | Savings | Modified |
|-------|-------------|---------|----------|
| Email thunk | `sendEnergyConsumptionEmail` | `sendEnergySavingsEmail` | No |
| Download thunk | `downloadEnergyConsumption` | `downloadEnergySavings` | No |
| Export map key | `ENERGY_EXPORT_WIDGET_KEYS.CONSUMPTION` | `ENERGY_EXPORT_WIDGET_KEYS.SAVINGS` | No |
| Widget resolver | `resolveUnifiedEnergyExportActions(mode, thunks)` | Same (mode branch) | **New** |
| Dashboard handlers | `handleConsumptionEmail/Download` | `handleSavingsEmail/Download` | No |
| Export UI (`exportControl`) | `consumptionExportControl` useMemo | `savingsExportControl` useMemo | No |
| Redux slice / APIs | Unchanged | Unchanged | No |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/energy/UnifiedEnergyWidget.jsx` | Loading + data + theme resolution, memo adapter |
| `src/shared/dashboard/widgets/energy/UnifiedEnergyCard.jsx` | `EnergyLineChartAdapter` wiring |
| `src/shared/dashboard/widgets/energy/unifiedEnergyTheme.js` | Theme presets, loading, chart data, peak/min, export resolvers |
| `src/shared/dashboard/widgets/energy/unifiedEnergyMemoCompare.js` | Memo comparator + legacy/shared loading + peak/min pipeline |
| `src/shared/dashboard/widgets/energy/energyWidgetModes.js` | `consumption` / `savings` mode constants + chart type resolver |
| `src/shared/dashboard/widgets/energy/index.js` | Barrel (default + named exports) |
| `src/shared/dashboard/widgets/energy/unifiedEnergyParity.test.js` | Parity tests for both modes × three variants |

**Barrel updated:** `src/shared/dashboard/widgets/index.js` → `export * from './energy'`

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Removed `IsolatedLineChart`, local `EnergyLineChart` memo, `consumptionChartProps`/`savingsChartProps`; `consumption` + `savings` slots use `UnifiedEnergyWidget` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Removed inline energy line chart memos; grid slots use `UnifiedEnergyWidget` |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Removed inline memos; `energyCards` consumption/savings use `UnifiedEnergyWidget` |
| `src/shared/dashboard/widgets/index.js` | Re-export energy bundle |

**Not modified:** `EnergyLineChartAdapter`, `EnergyLineChartView`, `transformDataForCharts`, `calculatePeakMinFromChartData`, peak/min formatters, Redux/selectors/thunks/APIs, `DashboardOverview`, `SpaceUtilization`, custom graphs, widget ordering, visibility, drag/drop, `peak_and_minimum_consumption` widget.

---

## LOC Before / After

### Variant `Dashboard.jsx` (post 6.2B.4 baseline)

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/Dashboard.jsx` | 5,561 | 5,095 | **−466** |
| `advanced/Dashboard.jsx` | 4,824 | 4,332 | **−492** |
| `customized/Dashboard.jsx` | 7,009 | 6,464 | **−545** |
| **Variant total** | **17,394** | **15,891** | **−1,503** |

### Shared production modules added

| Module | LOC |
|--------|-----|
| `unifiedEnergyTheme.js` | 188 |
| `UnifiedEnergyWidget.jsx` | 112 |
| `unifiedEnergyMemoCompare.js` | 86 |
| `UnifiedEnergyCard.jsx` | 52 |
| `index.js` | 25 |
| `energyWidgetModes.js` | 17 |
| **Total production** | **480** |

### Tests added: 238 LOC, 18 tests

**Net monolith reduction:** ~1,503 LOC (variant dashboards)  
**Net codebase delta:** −1,023 LOC excluding tests (−1,503 + 480); +238 LOC tests → **−785 LOC** overall

---

## Parity Verification

| Check | Result |
|-------|--------|
| Consumption basic loading parity | PASS |
| Savings advanced loading parity | PASS |
| Customized custom-date gate (blank, not loading) | PASS |
| Loading when payload missing | PASS |
| Empty state: custom dates → blank + null data | PASS |
| Empty state: ready path preserves payload | PASS |
| Basic consumption light theme + card height | PASS |
| Advanced palette theme wiring | PASS |
| Customized consumption bold stroke + `W` fallback | PASS |
| Customized savings empty dynamic unit fallback | PASS |
| Peak/min pipeline (chart data → peak/min display) | PASS |
| Consumption export routing | PASS |
| Savings export routing | PASS |
| Export map foundation parity | PASS |
| Memo comparator (deep-equal skip, mode/loading re-render) | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 32 passed, 32 total
Tests:       300 passed, 300 total  (+18 new unified energy tests)

npm run build — PASS (Compiled successfully)
```

**Build fix applied:** `energy/index.js` now exports `export { default } from './UnifiedEnergyWidget'` so variant `import UnifiedEnergyWidget from '...'` resolves correctly.

---

## Rollback Plan

1. Restore inline `EnergyLineChart` / `IsolatedLineChart` memo components and `consumptionChartProps` / `savingsChartProps` useMemos in all three `Dashboard.jsx` files.
2. Re-import `EnergyLineChartAdapter` and chart memo comparators in each variant.
3. Revert widget slot JSX to local `<EnergyLineChart ... />` for consumption and savings.
4. Remove `UnifiedEnergyWidget` / `UNIFIED_ENERGY_WIDGET_MODES` imports and variant surface `useMemo` helpers (`unifiedEnergyAdvancedSurface`, `*CustomizedSurface`, etc.) if added solely for the widget.
5. Delete `src/shared/dashboard/widgets/energy/` directory (all 7 files).
6. Revert `export * from './energy'` in `src/shared/dashboard/widgets/index.js`.
7. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, chart primitive, or routing changes were made; rollback is presentation-layer only.

---

## Architecture

```
src/shared/dashboard/widgets/energy/
├── UnifiedEnergyWidget.jsx      # mode-aware widget adapter (memo)
├── UnifiedEnergyCard.jsx        # EnergyLineChartAdapter pass-through
├── unifiedEnergyTheme.js        # loading, data, theme, peak/min, export
├── unifiedEnergyMemoCompare.js  # props equality + pipeline helpers
├── energyWidgetModes.js         # consumption | savings constants
└── index.js                     # barrel
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- `PeakAndMinimumConsumptionWidget` extraction
- `AlertsWidget` extraction
- Space widget work
- Dashboard container extraction
- Chart layer rework (`EnergyLineChartAdapter`, `transformDataForCharts`, peak/min helpers untouched)
- Separate consumption-only or savings-only widget modules (both extracted together in 6.2B.5)
