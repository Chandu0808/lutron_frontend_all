# Phase 6.2A.3C — SavingsStrategyChart Extraction Report

**Date:** 2026-06-10  
**Scope:** Presentation-only extraction of `SavingsStrategyChart` for `savings_by_strategy` widget.  
**Out of scope:** widget extraction, `DashboardOverview`, space charts, instant occupancy, custom graphs, Redux/APIs.

---

## Summary

Duplicated inline `SavingsStrategyChart` implementations (~1,226 LOC across three variant `Dashboard.jsx` files) were replaced with thin `React.memo` wrappers delegating to `SavingsStrategyChartAdapter` → `SavingsStrategyChartView`. All variants use shared `savingsStrategyToPieRows` (6.2A.1) — duplicated inline pie-row generation removed from dashboards.

| Check | Result |
|-------|--------|
| Build (`npm run build`) | **PASS** |
| Tests (`npm test -- --testPathPattern=shared/dashboard`) | **131 / 131 PASS** |
| Net LOC removed (production code, approx.) | **~350** |

---

## Overlap Percentage (Pre-Extraction Audit)

| Comparison | Overlap |
|------------|---------|
| Advanced ↔ Customized (pie render + data pipeline) | **~92%** |
| All three (status machine + `savingsStrategyToPieRows` + Recharts structure) | **~85%** |
| Basic unique surface (`embedded`, `chartSurface`, `customDatesIncomplete`) | **~25% variant-only** |
| **Weighted overall duplication** | **~78%** |

---

## SavingsStrategyChart Prop Matrix

### Basic variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `isLoading`, `embedded`, `chartSurface`, `customDatesIncomplete` |
| **Props used** | All; `savingsByStrategy` + `globalLoading` from Dashboard closure via adapter |
| **Variant-only** | `embedded` tab in combined energy widget, light/dark/`ENERGY_LIGHT_FULL_CARD_HEIGHT_PX`, `customDatesIncomplete` grey placeholder donut |
| **Legend** | Vertical right; 11px; segment-colored leader labels |
| **Colors** | `embedded-light` palette vs standalone dark palette |
| **Tooltip** | Light: white bg; dark: `#807864` |
| **Loading** | `ChartLoader` + `globalLoading` gate |
| **Empty** | Null payload message; zero-total message; transitional → loading |
| **Export** | Commented out (unchanged) — no export UI wired |

### Advanced variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `isLoading` |
| **Variant-only** | `cardBackground` shell, `getThemeAwareSavingsStrategyColor`, `resolvePieChartLabelColors`, `DASHBOARD_CHART_TOOLTIP_STYLE` |
| **Legend** | Vertical right, white text |
| **Colors** | Theme-aware HSL palette with fixed-map fallback |
| **Tooltip** | CSS-var tooltip style |
| **Loading** | 300px `ChartLoader` |
| **Export** | Commented out (unchanged) |

### Customized variant

| Category | Details |
|----------|---------|
| **Props accepted** | `title`, `isLoading` |
| **Variant-only** | `BUILTIN_CHART_*` layout constants |
| **Legend** | Same as advanced (no theme-aware labels) |
| **Colors** | Fixed `standalone-dark` strategy map |
| **Tooltip** | `#807864` inline style |
| **Loading** | `BUILTIN_CHART_LOADER_HEIGHT` |
| **Export** | Commented out (unchanged) |

### Normalized via adapter

| Concern | Shared module |
|---------|---------------|
| Pie rows | `savingsStrategyToPieRows` |
| Status machine | `SavingsStrategyChartAdapter` |
| Center label | `calculateSavingsCenterLabelValue` |
| Title % suffix | `calculateTotalSavingsPercentage` |
| Transitional data | `isSavingsStrategyTransitionalData` |

---

## Shared Interface: `SavingsStrategyChartViewProps`

Defined in `src/shared/dashboard/charts/types/savingsStrategyChartTypes.js`:

```typescript
interface SavingsStrategyChartViewProps {
  status: 'custom-range-placeholder' | 'loading' | 'empty-null' | 'empty-zero' | 'ready';
  title: string;
  headerTitle: ReactNode;
  pieData?: SavingsStrategyPieRow[];
  centerLabelValue?: number;
  theme: SavingsStrategyThemeTokens;
  getSegmentColor: (strategyName: string) => string;
  resolveSegmentLabelColors?: (segmentColor: string) => LabelColors;
  outerStyle?: CSSProperties;
  plotStyle?: CSSProperties;
  headerStyle?: CSSProperties;
  showHeader?: boolean;
  loaderMessage?: string;
  emptyNullMessage?: string;
  emptyZeroMessage?: string;
  LoaderComponent?: ComponentType;
  loaderHeight?: string;
  loaderLight?: boolean;
  cssTooltipStyle?: object;
  cardClassName?: string;
}
```

---

## Files Added

| File | LOC | Role |
|------|-----|------|
| `charts/savings/SavingsStrategyChartView.jsx` | 248 | Pie + tooltip + legend + all shell states |
| `charts/savings/SavingsStrategyChartAdapter.jsx` | 156 | Status machine + theme + data transforms |
| `charts/savings/savingsStrategyConfig.js` | 108 | Layout, palettes, center label, messages |
| `charts/savings/savingsStrategyTheme.js` | 102 | Theme token resolver |
| `charts/savings/savingsStrategyMemoCompare.js` | 58 | Memo comparator + legacy helpers |
| `charts/savings/SavingsStrategyTooltip.jsx` | 24 | Recharts tooltip formatter |
| `charts/savings/index.js` | 18 | Barrel re-exports |
| `charts/types/savingsStrategyChartTypes.js` | 48 | JSDoc typedefs |
| `charts/savingsStrategyChartParity.test.js` | 115 | Dataset/status/memo/export tests |
| `charts/savings/SavingsStrategyChartView.test.jsx` | 68 | Loading/empty shell tests |
| `scripts/phase63c-splice-savings-strategy-chart.js` | — | Splice automation |
| `scripts/fragments/savings-strategy-chart-{basic,advanced,customized}.jsx` | — | Variant wrappers |

**Shared module total:** ~762 LOC (excluding tests/scripts)

---

## Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/Dashboard.jsx` | Inline `SavingsStrategyChart` (~497 LOC) → wrapper (~80 LOC); removed unused transform imports |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | Inline (~424 LOC) → wrapper (~30 LOC); removed unused transform imports |
| `variants/customized/screens/dashboard/Dashboard.jsx` | Inline (~305 LOC) → wrapper (~15 LOC); removed unused transform imports |

**Import added (all variants):**

```js
import SavingsStrategyChartAdapter, { savingsStrategyChartPropsAreEqual } from '../../../../shared/dashboard/charts/savings/SavingsStrategyChartAdapter'
```

---

## LOC Accounting

| Metric | LOC |
|--------|-----|
| Removed inline implementations | ~1,226 |
| Added shared modules | ~762 |
| Added variant wrappers | ~125 |
| **Net removed** | **~339** |

---

## Parity Verification

| Requirement | Test / Evidence | Status |
|-------------|-----------------|--------|
| Dataset parity (all variants) | `savingsStrategyChartParity.test.js` — shared vs legacy `savingsStrategyToPieRows` | **PASS** |
| Tooltip `NN.NN%` format | `formatSavingsStrategyTooltipValue` | **PASS** |
| Empty-null / empty-zero messages | `SavingsStrategyChartView.test.jsx` | **PASS** |
| Loading state | View shell test + status parity | **PASS** |
| Single-strategy edge case | One slice at 100% | **PASS** |
| Zero-value filtering | `savingsStrategyToPieRows` filters `value > 0` | **PASS** |
| All-zero payload | Transitional → loading (matches legacy) | **PASS** |
| Memo comparator | Deep-equal JSON short-circuit | **PASS** |
| Legacy status === shared status | Fixture matrix | **PASS** |

---

## Export Verification

| Flow | Evidence | Status |
|------|----------|--------|
| `downloadSavingsByStrategy` | Thunk remains in `dashboardSlice.js` (all variants); export UI still commented out in chart (unchanged) | **Preserved** |
| `sendSavingsByStrategyEmail` | Same — thunk wired in Redux, no Dashboard handler changes | **Preserved** |

Note: Export buttons were already commented out pre-extraction; this phase did not enable or disable export UI.

---

## Memoization Audit

**Comparator:** `savingsStrategyChartPropsAreEqual`
- Scalars: `title`, `isLoading`, `globalLoading`, `chartSurface`, `embedded`, `customDatesIncomplete`
- Payload: `savingsByStrategy` with JSON deep-equal short-circuit

**Transforms:** `useMemo` on `savingsStrategyToPieRows`, `calculateTotalSavingsPercentage`, status machine, `getSegmentColor`

**Legacy parity:** `legacySavingsStrategyPieRows` === `savingsStrategyToPieRows` for all fixture datasets in tests.

---

## Build Result

```
npm run build
Compiled successfully.
```

Chunk sizes reduced ~1.4–1.7 kB per variant dashboard bundle.

---

## Test Result

```
npm test -- --testPathPattern=shared/dashboard --watchAll=false

Test Suites: 19 passed, 19 total
Tests:       131 passed, 131 total
```

New 6.2A.3C tests: **15**

---

## Architecture (post-extraction)

```
Dashboard.jsx (per variant)
  └── SavingsStrategyChart (thin memo wrapper)
        └── SavingsStrategyChartAdapter
              ├── savingsStrategyToPieRows (6.2A.1)
              └── SavingsStrategyChartView
                    ├── loading / empty / placeholder / ready
                    ├── SavingsStrategyDefaultTooltip
                    └── segment leader-line labels
```

---

## Constraints Respected

- No widget slot changes for `savings_by_strategy`
- No Redux / selector / thunk / API / route changes
- `selectSavingsByStrategy` unchanged
- No space charts, instant occupancy, custom graphs, or `DashboardOverview` changes

---

## Next Phase (not started)

Space LineChart, StackedBar, InstantOccupancy extraction; widget extraction (6.2B).
