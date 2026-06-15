# Phase 6.2A.3B — ConsumptionPieChart Extraction Report

**Date:** 2026-06-10  
**Scope:** Presentation-only extraction of duplicated `ConsumptionPieChart` for `total_consumption_by_group` widget.  
**Out of scope (not touched):** widget extraction, `DashboardOverview`, `SavingsStrategyChart`, space charts, instant occupancy, custom graphs, Redux/APIs.

---

## Summary

Duplicated inline `ConsumptionPieChart` implementations (~1,345 LOC across three variant `Dashboard.jsx` files) were replaced with thin `React.memo` wrappers delegating to `ConsumptionPieChartAdapter` → `ConsumptionPieChartView`. All variants now use shared `pieChartNormalizers` (`buildTotalConsumptionByGroupPieRows`) for pie row transforms.

| Check | Result |
|-------|--------|
| Build (`npm run build`) | **PASS** |
| Tests (`npm test -- --testPathPattern=shared/dashboard`) | **116 / 116 PASS** |
| Net LOC removed (production code, approx.) | **~13** (deduplication value: single source of truth) |

---

## ConsumptionPieChart Prop Matrix

### Basic variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `data`, `onEmail`, `onDownload`, `isLoading`, `chartSurface` |
| **Props used** | All accepted; `chartSurface` → light/dark theme tokens; export via `TOTAL_CONSUMPTION_BY_GROUP_EXPORT_KEY` (not `title`) |
| **Variant-only** | `chartSurface`, `ENERGY_LIGHT_FULL_CARD_HEIGHT_PX` override, `FileUploadOutlined` export UI, `energyChartSlotOuterStyle` shell |
| **Legend** | Vertical right-aligned Recharts legend; segment-colored leader-line labels |
| **Colors** | Fixed `DEFAULT_CONSUMPTION_PIE_COLORS` palette |
| **Tooltip** | Inline `contentStyle` from theme tokens; formatter shows `actual_energy (consumption_percentage)` |
| **Empty state** | Centered message in plot area; export control visible |
| **Normalizable** | `chartSurface` → `resolvePieChartTheme`; export → `exportControl` slot; shell → `shellVariant="basic-energy"` |

### Advanced variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `data`, `onEmail`, `onDownload`, `isLoading` |
| **Props used** | All accepted; export dropdown keyed by `title` |
| **Variant-only** | `cardBackground`/`CARD_BORDER`/`CARD_SHADOW`, `ChartExportButton`/`ChartExportDropdown`, `getThemeAwarePieColors`, `resolvePieChartLabelColors`, `DASHBOARD_CHART_TOOLTIP_STYLE` |
| **Legend** | Same layout as basic; labels use theme-aware contrast (`resolvePieChartLabelColors`) |
| **Colors** | `getThemeAwarePieColors(backgroundColor, 8)` with fixed palette fallback |
| **Tooltip** | CSS-var tooltip style (`useCssTooltipVars: true`) |
| **Empty state** | 300px centered box, white text |
| **Normalizable** | Shell → `shellVariant="advanced-card"`; palette/labels via `resolveThemePalette` + `resolveSegmentLabelColors` |

### Customized variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `data`, `onEmail`, `onDownload`, `isLoading` |
| **Props used** | All accepted; uses `areaIdToDisplayName` for group resolution |
| **Variant-only** | `BUILTIN_CHART_*` layout, custom export dropdown (`FileUploadIcon`), fetch-error state, zero-segment fallback message |
| **Legend** | Same vertical right legend; segment-colored labels (no theme-aware label resolver) |
| **Colors** | Fixed `DEFAULT_CONSUMPTION_PIE_COLORS` |
| **Tooltip** | `#807864` background, white border/text |
| **Empty state** | `BUILTIN_CHART_EMPTY_BOX`; separate error (yellow) and zero-segment messages |
| **Normalizable** | Layout → `cardShellStyle`/`plotStyleOverride`; error/zero states → adapter flags |

### Shared normalization (all variants post-extraction)

| Function | Source |
|----------|--------|
| `normalizeTotalConsumptionByGroupPayload` | `shared/dashboard/utils/pieChartNormalizers` |
| `buildTotalConsumptionByGroupPieRows` | `shared/dashboard/utils/pieChartNormalizers` |
| Selectors | `selectTotalConsumptionByGroup`, `selectAreaGroups` (unchanged) |

**Removed from customized Dashboard:** direct imports of `normalizeTotalConsumptionByGroupPayload` and `buildTotalConsumptionByGroupPieRows` (now via adapter). `sumAbsoluteWhFromTotalConsumptionByGroupPayload` retained for multi-floor aggregation.

---

## Shared Interface: `ConsumptionPieChartViewProps`

Defined in `src/shared/dashboard/charts/types/consumptionPieChartTypes.js`:

```typescript
interface ConsumptionPieChartViewProps {
  pieData: ConsumptionPieRow[];
  segmentColors: string[];
  theme: PieChartThemeTokens;
  resolveSegmentLabelColors?: (segmentColor: string) => {
    textFill: string;
    lineStroke: string;
    textShadow?: string;
  };
  cssTooltipStyle?: object;
}
```

---

## Files Added

| File | LOC | Role |
|------|-----|------|
| `charts/views/ConsumptionPieChartView.jsx` | 77 | Pure Recharts pie |
| `charts/views/ConsumptionPieChartAdapter.jsx` | 178 | Normalization + shell + view |
| `charts/views/ConsumptionPieSegmentLabel.jsx` | 71 | Leader-line segment labels |
| `charts/views/consumptionPieChartMemoCompare.js` | 152 | Memo comparator + legacy row builder for tests |
| `charts/shells/PieChartCardShell.jsx` | 300 | Loading/empty/error/zero/ready chrome |
| `charts/config/consumptionPieChartConfig.js` | 50 | Layout, palette, tooltip formatter |
| `charts/themes/pieChartTheme.js` | 102 | Theme token resolver |
| `charts/tooltips/ConsumptionPieTooltip.jsx` | 81 | Tooltip content + default Recharts tooltip |
| `charts/types/consumptionPieChartTypes.js` | 66 | JSDoc typedefs |
| `charts/consumption/index.js` | 14 | Barrel re-exports |
| `charts/config/consumptionPieChartConfig.test.js` | 40 | Config unit tests |
| `charts/consumptionPieChartParity.test.js` | 115 | Dataset/tooltip/export parity |
| `charts/shells/PieChartCardShell.test.jsx` | 58 | Shell state tests |
| `scripts/phase63b-splice-consumption-pie-chart.js` | — | Splice automation |
| `scripts/fragments/consumption-pie-chart-{basic,advanced,customized}.jsx` | — | Variant wrapper fragments |

**Shared module total:** ~1,077 LOC (excluding tests/scripts)

---

## Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/Dashboard.jsx` | Inline `ConsumptionPieChart` (~478 LOC) → adapter wrapper (~120 LOC) |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | Inline `ConsumptionPieChart` (~409 LOC) → adapter wrapper (~38 LOC) |
| `variants/customized/screens/dashboard/Dashboard.jsx` | Inline `ConsumptionPieChart` (~458 LOC) → adapter wrapper (~97 LOC); removed redundant normalizer imports |

**Imports added:**

```js
import ConsumptionPieChartAdapter, { consumptionPieChartPropsAreEqual } from '../../../../shared/dashboard/charts/views/ConsumptionPieChartAdapter'
```

**Basic-only additional import:**

```js
import { resolvePieChartTheme } from '../../../../shared/dashboard/charts/themes/pieChartTheme'
```

---

## LOC Accounting

| Metric | LOC |
|--------|-----|
| Removed inline implementations | ~1,345 |
| Added shared modules | ~1,077 |
| Added variant wrappers | ~255 |
| **Net reduction (production)** | **~13** |

Primary win: **one normalization + presentation path** for all variants (previously basic/advanced duplicated ~200 LOC of pie row logic inline).

---

## Parity Verification

| Requirement | Test / Evidence | Status |
|-------------|-----------------|--------|
| Basic vs Advanced vs Customized datasets | `consumptionPieChartParity.test.js` — shared normalizer for flat + special_area_groups payloads | **PASS** |
| Pie normalization parity | Legacy `legacyBasicAdvancedPieRows` vs `buildTotalConsumptionByGroupPieRows` for grouped flat data | **PASS** |
| Tooltip rendering parity | `formatConsumptionPieTooltipValue` matches `actual_energy (consumption_percentage)` | **PASS** |
| Empty state parity | `PieChartCardShell.test.jsx` — empty message | **PASS** |
| Single-segment edge case | One slice at ~100% for single-area payload | **PASS** |
| Zero-value rows filtered | Group with 0 Wh excluded from pieData | **PASS** |
| Loading state | Shell loader message test | **PASS** |
| Customized error/zero states | Adapter `showFetchErrorState` / `showZeroSegmentsState` flags preserved | **PASS** |

---

## Export Verification

| Flow | Evidence | Status |
|------|----------|--------|
| `downloadTotalConsumptionByGroup` | Handlers unchanged in `Dashboard.jsx`; `createEnergyExportActionMap` resolves `TOTAL_CONSUMPTION_BY_GROUP.downloadThunk` | **PASS** |
| `sendTotalConsumptionByGroupEmail` | Same map resolves `.emailThunk` | **PASS** |
| Basic export menu key | Still uses `TOTAL_CONSUMPTION_BY_GROUP_EXPORT_KEY` (not title) | **Preserved** |

---

## Memoization Audit

**Adapter comparator:** `consumptionPieChartPropsAreEqual`
- Scalar: `title`, `isLoading`, `onEmail`, `onDownload`, `chartSurface`
- Context: `areaGroups`, `areaIdToDisplayName` (reference equality)
- Data: JSON deep-equal short-circuit (same pattern as EnergyLineChart)

**Pie row transform:** `useMemo(() => buildTotalConsumptionByGroupPieRows(...), [data, areaGroups, areaLookup])`

**Legacy parity:** `legacyBasicAdvancedPieRows` replicated from pre-extraction basic/advanced inline logic; grouped flat-data name sets and percentage totals match shared normalizer in parity tests.

---

## Build Result

```
npm run build
Compiled successfully.
```

---

## Test Result

```
npm test -- --testPathPattern=shared/dashboard --watchAll=false

Test Suites: 17 passed, 17 total
Tests:       116 passed, 116 total
```

New 6.2A.3B tests: **16** (config: 4, parity: 9, shell: 3)

---

## Architecture (post-extraction)

```
Dashboard.jsx (per variant)
  └── ConsumptionPieChart (thin memo wrapper)
        ├── exportControl (variant-specific UI)
        └── ConsumptionPieChartAdapter
              ├── pieChartNormalizers (buildTotalConsumptionByGroupPieRows)
              ├── PieChartCardShell (loading | empty | error | zero-segments | ready)
              └── ConsumptionPieChartView (pure Recharts)
                    ├── ConsumptionPieSegmentLabel (leader lines)
                    └── ConsumptionPieDefaultTooltip
```

---

## Constraints Respected

- No widget slot changes for `total_consumption_by_group`
- No Redux slice / selector / thunk / API changes
- Export/email handlers remain in `Dashboard.jsx`
- No `SavingsStrategyChart`, space charts, instant occupancy, or custom graph changes
- No `DashboardOverview` changes

---

## Next Phase (not started)

6.2A.3C+ — SavingsStrategyChart, space charts, widget extraction (6.2B) per roadmap.
