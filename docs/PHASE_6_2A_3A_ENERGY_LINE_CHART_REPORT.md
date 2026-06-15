# Phase 6.2A.3A — EnergyLineChart Extraction Report

**Date:** 2026-06-10  
**Scope:** Presentation-only extraction of duplicated `EnergyLineChart` into shared chart primitives.  
**Out of scope (not touched):** widget extraction, `DashboardOverview`, custom graphs, widget visibility, Redux slices, APIs, pie/space/savings chart extraction.

---

## Summary

Duplicated inline `EnergyLineChart` implementations (~2,394 LOC across three variant `Dashboard.jsx` files) were replaced with thin variant wrappers that delegate to `EnergyLineChartAdapter` → `EnergyLineChartView`. Data fetching, selectors, thunks, export/email handlers, and widget slots remain in `Dashboard.jsx`.

| Check | Result |
|-------|--------|
| Build (`npm run build`) | **PASS** |
| Tests (`npm test -- --testPathPattern=shared/dashboard`) | **100 / 100 PASS** |
| Net LOC removed (approx.) | **~623** |

---

## EnergyLineChart Prop Matrix

### Basic variant

| Category | Props |
|----------|-------|
| **Accepted** | `title`, `data`, `colors`, `onEmail`, `onDownload`, `isLoading`, `chartSurface`, `emptyStateVariant`, `showDurationControls` |
| **Used in render** | All accepted props; `onEmail`/`onDownload` wired into export dropdown; `chartSurface` → theme; `emptyStateVariant`/`showDurationControls` → empty-state chrome |
| **Variant-only** | `chartSurface` (light/dark `ec` tokens), `emptyStateVariant` (`message` \| `blank`), `showDurationControls` (duration picker in empty state), `ENERGY_LIGHT_FULL_CARD_HEIGHT_PX` override, `FileUploadOutlined` export UI, `renderEnergyLineChartEmptyExtras`, `renderEnergyLineBlankPreview` |
| **Normalizable** | `chartSurface` → `resolveEnergyChartTheme({ chartSurface })`; export UI → `exportControl` slot; empty extras → `emptyStateExtras` / `blankChartPreview` props on adapter |

### Advanced variant

| Category | Props |
|----------|-------|
| **Accepted** | `title`, `data`, `colors`, `onEmail`, `onDownload`, `isLoading` |
| **Used in render** | All accepted; export via `ChartExportButton` / `ChartExportDropdown` |
| **Variant-only** | `cardBackground` / `CARD_BORDER` / `CARD_SHADOW` shell, `DASHBOARD_CHART_TOOLTIP_STYLE`, `buildThemeAwareChartPalette` color resolver, `chartHeaderStyle` |
| **Normalizable** | Shell chrome → `shellVariant="advanced-card"` + `outerStyleOverride`; palette → `resolveThemePalette`; tooltip → `cssTooltipStyle` |

### Customized variant

| Category | Props |
|----------|-------|
| **Accepted** | `title`, `data`, `colors`, `onEmail`, `onDownload`, `isLoading`, `legendSeriesName` |
| **Used in render** | All accepted; `legendSeriesName` overrides Recharts legend label |
| **Variant-only** | `BUILTIN_CHART_*` layout constants, `dynamicUnitFallback='W'`, `strokeWidthProfile='bold'`, custom export dropdown (`FileUploadIcon`), static legend below chart |
| **Normalizable** | Layout → `cardShellStyle` / `cardHeaderStyle` / `plotStyleOverride`; legend → `legendSeriesName`; stroke → `strokeWidthProfile` |

### Dead code removed

`calculatedPeakMin` was computed inside all three legacy inline implementations but never used in render. Peak/min display remains a separate dashboard widget using `calculatePeakMinFromChartData(energyConsumptionChartData)` — unchanged.

---

## Shared Interface: `EnergyLineChartViewProps`

Defined in `src/shared/dashboard/charts/views/energyLineChartTypes.js`:

```typescript
interface EnergyLineChartViewProps {
  chartData: Array<Record<string, unknown>>;
  seriesNames: string[];
  seriesColors: string[];
  chartConfig: EnergyLineChartConfig;
  theme: EnergyChartThemeTokens;
  dynamicUnit: string;
  yAxisLimit: number | null | undefined;
  formatXAxisLabel: (value: string, index: number) => string;
  selectedDuration: string;
  selectedAreaCount: number;
  title: string;
  currentDate: string;
  legendSeriesName?: string | null;
  chartKey: string;
  cssTooltipStyle?: object;
}
```

Adapter-level props (variant wrappers → `EnergyLineChartAdapter`) additionally accept shell/export slots: `shellVariant`, `exportControl`, `emptyStateExtras`, `blankChartPreview`, `ChartLoader`, style overrides, `transformDataForCharts`, and dashboard context (`selectedDuration`, `currentDate`, `currentYear`, `selectedAreas`).

---

## Files Added

| File | LOC | Role |
|------|-----|------|
| `charts/views/EnergyLineChartView.jsx` | 215 | Pure Recharts line chart |
| `charts/views/EnergyLineChartAdapter.jsx` | 184 | Transform + shell + view wiring |
| `charts/views/energyLineChartMemoCompare.js` | 45 | Shared `React.memo` comparator |
| `charts/views/energyLineChartTypes.js` | 80 | JSDoc typedefs |
| `charts/shells/EnergyChartCardShell.jsx` | 273 | Loading / empty / ready card chrome |
| `charts/config/energyLineChartConfig.js` | 134 | Axis/dot/line config + series helpers |
| `charts/config/energyLineColorPalette.js` | 84 | Palette + chart kind resolver |
| `charts/themes/energyChartTheme.js` | 136 | Theme token resolver |
| `charts/tooltips/EnergyLineTooltip.jsx` | 61 | Shared tooltip content |
| `charts/energy/index.js` | 8 | Barrel re-exports |
| `charts/config/energyLineChartConfig.test.js` | 89 | Config/palette unit tests |
| `charts/views/energyLineChartMemoCompare.test.js` | 95 | Memo comparator parity |
| `charts/energyLineChartParity.test.js` | 168 | Dataset/export/peak-min parity |
| `charts/shells/EnergyChartCardShell.test.jsx` | 75 | Loading/empty/ready shell tests |
| `scripts/build-basic-energy-fragment.js` | — | Basic empty-state fragment builder |
| `scripts/phase63a-splice-energy-line-chart.js` | — | Splice automation |
| `scripts/fragments/energy-line-chart-{basic,advanced,customized}.jsx` | — | Variant wrapper fragments |

**Shared module total:** ~1,220 LOC (excluding tests/scripts)

---

## Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/Dashboard.jsx` | Inline `EnergyLineChart` (~1,019 LOC) → adapter wrapper (~113 LOC) + basic-only empty-state helpers (~293 LOC) |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | Inline `EnergyLineChart` (~701 LOC) → adapter wrapper (~43 LOC) |
| `variants/customized/screens/dashboard/Dashboard.jsx` | Inline `EnergyLineChart` (~674 LOC) → adapter wrapper (~102 LOC) |

**Imports added (all variants):**

```js
import EnergyLineChartAdapter, { energyLineChartPropsAreEqual } from '../../../../shared/dashboard/charts/views/EnergyLineChartAdapter'
```

**Basic-only additional import:**

```js
import { resolveEnergyChartTheme } from '../../../../shared/dashboard/charts/themes/energyChartTheme'
```

---

## LOC Accounting

| Metric | LOC |
|--------|-----|
| Removed inline implementations | ~2,394 |
| Added shared modules | ~1,220 |
| Added variant wrappers + basic empty helpers | ~551 |
| **Net reduction** | **~623** |

---

## Parity Verification

| Requirement | Test / Evidence | Status |
|-------------|-----------------|--------|
| Consumption widget identical datasets | `energyLineChartParity.test.js` — basic/advanced/customized `chartData`, `seriesNames`, `seriesColors` | **PASS** |
| Savings widget identical datasets | Same test file — savings title parity | **PASS** |
| Peak/min overlay identical | `calculatePeakMinFromChartData` on transformed consumption data (peak=270, min=0) | **PASS** |
| Empty state identical | `EnergyChartCardShell.test.jsx` — message + blank preview variants | **PASS** |
| Loading state identical | `EnergyChartCardShell.test.jsx` — loader message | **PASS** |
| Export actions unchanged | `energyLineChartParity.test.js` + existing `energyExportActionMap.test.js` | **PASS** |
| Email actions unchanged | Consumption/Savings email thunks resolve via `createEnergyExportActionMap` | **PASS** |

---

## React.memo Comparator Audit

Shared comparator: `energyLineChartPropsAreEqual` in `energyLineChartMemoCompare.js`.

Compared against replicated legacy inline comparator from pre-extraction `Dashboard.jsx`:

- Scalar props: `title`, `isLoading`, `colors`, `onEmail`, `onDownload`
- Optional variant props: `chartSurface`, `legendSeriesName`, `emptyStateVariant`, `showDurationControls`
- Data: reference inequality with **JSON deep-equal short-circuit** (skip re-render when content matches)

**Result:** For all prop-matrix pairs in `energyLineChartMemoCompare.test.js`, `legacy === shared` (including deep-equal data with different references).

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

Test Suites: 14 passed, 14 total
Tests:       100 passed, 100 total
```

New 6.2A.3A tests: **31** (config: 9, memo: 14, parity: 8, shell: 4)

---

## Architecture (post-extraction)

```
Dashboard.jsx (per variant)
  └── EnergyLineChart (thin memo wrapper)
        ├── exportControl (variant-specific UI)
        └── EnergyLineChartAdapter
              ├── transformDataForCharts (from Dashboard closure)
              ├── EnergyChartCardShell (loading | empty | ready)
              └── EnergyLineChartView (pure Recharts)
                    └── EnergyLineTooltip
```

---

## Constraints Respected

- No widget slot changes
- No route changes
- No Redux state / API / selector / thunk changes
- Export/email handlers remain in `Dashboard.jsx`
- No pie, space, or savings chart extraction
- No `DashboardOverview` or custom graph changes

---

## Next Phase (not started)

6.2A.3B+ — pie charts, savings charts, space charts, widget extraction (6.2B) per roadmap.
