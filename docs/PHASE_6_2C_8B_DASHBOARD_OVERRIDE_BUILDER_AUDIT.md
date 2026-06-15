# Phase 6.2C.8B — Override Builder Duplication Audit

**Date:** 2026-06-10  
**Status:** STEP 1 complete — implementation blocked until audit sign-off  
**Baseline:** Phase 6.2C.8A (`DashboardWidgetRenderer`, `widgetRenderMap`, `widgetSlotResolvers`, `buildEnergyWidgetRenderContext`)

---

## 1. Executive Summary

After 6.2C.8A, widget **routing JSX** is centralized. Remaining Dashboard duplication is almost entirely in:

| Category | Est. duplicated LOC (3 variants) | Extractability |
|----------|----------------------------------|----------------|
| `energyWidgetRenderContext` data bag | ~105 (35 × 3, ~95% identical) | **High** |
| `overrides` object assembly | ~75 (25 × 3) | **High** |
| Surface object builders | ~145 | **Medium** (variant-specific shapes) |
| Export-control JSX injection | ~720 | **Low in 8B** (JSX stays variant-owned; inject via refs) |
| Render-context `useMemo` dep arrays | ~120 | **High** (via `useDashboardRenderContext`) |
| Basic-only embedded strategy props | ~15 | **Out of scope** (`consumption_saving`) |

**Primary 8B target:** move override map construction + shared context data bag + surface factory wiring into `widgetOverrideBuilders.js`, `widgetRenderContextBuilders.js`, `dashboardVariantPresets.js`, and `useDashboardRenderContext.js`. Export JSX remains in Dashboard; builders accept pre-built `exportControl` nodes.

---

## 2. Inventory by Category

### 2.1 Energy widget override objects (`consumption`, `savings`)

| Field | basic | advanced | customized |
|-------|-------|----------|--------------|
| Surface key | `chartSurface` | `advancedSurface` | `customizedSurface` |
| `exportControl` | ✓ theme-aware JSX | ✓ `ChartExportButton` | ✓ legacy button JSX |
| `blankChartPreview` | ✓ consumption only | — | — |
| `emptyStateExtras` | ✓ consumption only | — | — |
| `energyLightFullCardHeightPx` | ✓ both | — | — |

**Overlap:** Both keys share the same surface family per variant; consumption has extra basic-only empty-state fields.

### 2.2 Pie widget override objects (`savings_by_strategy`, `total_consumption_by_group`)

| Field | basic | advanced | customized |
|-------|-------|----------|--------------|
| Surface key | `chartSurface` | `advancedSurface` | `customizedSurface` |
| `exportControl` | group only | group only | group only |
| `energyLightFullCardHeightPx` | ✓ both | — | — |

**`savings_by_strategy` surface shape:**
- basic: `{ chartSurface, energyLightFullCardHeightPx }`
- advanced: pie surface with `resolveThemeColor`, `resolveSegmentLabelColors`, `loaderHeight: '300px'`
- customized: `{ cardShellStyle: BUILTIN_CHART_CARD, plotStyleOverride: BUILTIN_PIE_PLOT_BOX, loaderHeight }`

**`total_consumption_by_group` surface shape:**
- basic: same as strategy + `exportControl`
- advanced: pie surface with `resolveThemePalette`, `resolveSegmentLabelColors`
- customized: pie surface + `cardHeaderStyle: BUILTIN_CHART_HEADER_ROW`

### 2.3 Savings widget override objects

Same as pie strategy row above (`savings_by_strategy`). No separate savings-line overrides beyond unified energy `savings` key.

### 2.4 Peak/min override objects (`peak_and_minimum_consumption`)

| Field | basic | advanced | customized |
|-------|-------|----------|--------------|
| `chartSurface` | `energyLineChartSurface` | — | — |
| `metricPanelBorder` | — | ✓ (context + override) | — |

Peak widget body is rendered via `DashboardWidgetRenderer`; **metric panel chrome** (header, 200px shell, unit selector for LPD) stays variant-owned and is **not** part of override map.

### 2.5 Metric panel overrides (`light_power_density`)

| Field | basic | advanced | customized |
|-------|-------|----------|--------------|
| `chartSurface` | `energyMetricLight ? 'light' : 'dark'` | — | — |
| `metricPanelBorder` | — | ✓ on context (LPD widget) | — |

LPD **panel chrome** (title, unit `<select>` / MUI `Select`, `BUILTIN_COMPACT_PANEL`) remains inline in each Dashboard — out of 8B scope per stop boundary.

### 2.6 Render-context builders

All three variants call `buildEnergyWidgetRenderContext({...})` inside an identical-shaped `useMemo`:

**Shared data bag (exact duplicate across variants):**
```javascript
data: {
  memoizedEnergyConsumption,
  memoizedEnergySavings,
  savingsByStrategy,
  totalConsumptionByGroup,
  lightPowerDensity,
  lightingUnit,
},
loading: {
  energyConsumptionLoading,
  energySavingsLoading,
  peakMinConsumptionLoading,
},
chartLoading,
allEnergyChartsReady,
globalLoading,
colors: { consumption: consumptionColors, savings: savingsColors },
chartHeaderStyle,
ChartLoader,
transformDataForCharts,
selectedDuration,
currentDate,
currentYear,
selectedAreas,
areaGroups,
```

**Variant-specific top-level fields:**

| Field | basic | advanced | customized |
|-------|:-----:|:--------:|:----------:|
| `energyCustomNeedsDates` | ✓ | — | — |
| `metricPanelBorder` | — | ✓ | — |
| `areaIdToDisplayName` | — | — | ✓ |

**Locations:**
- basic: `Dashboard.jsx` ~2655–2753
- advanced: `Dashboard.jsx` ~2075–2160
- customized: `Dashboard.jsx` ~3842–3928

### 2.7 Surface / palette wiring

| Surface builder | Variant | LOC | Key deps |
|-----------------|---------|-----|----------|
| `energyLineChartSurface` / `energyMetricLight` | basic | derived | `contentColor`, `isLightSurface` |
| `unifiedEnergyAdvancedSurface` | advanced | ~11 | `cardBackground`, `backgroundColor`, palette fns |
| `savingsByStrategyAdvancedSurface` | advanced | ~13 | + `getThemeAwareSavingsStrategyColor` |
| `totalConsumptionByGroupAdvancedSurface` | advanced | ~12 | + `getThemeAwarePieColors` |
| `consumptionCustomizedSurface` | customized | ~8 | `BUILTIN_*`, `consumptionTitle` |
| `savingsCustomizedSurface` | customized | ~8 | `BUILTIN_*`, `savingsTitle` |
| `savingsByStrategyCustomizedSurface` | customized | ~6 | `BUILTIN_CHART_CARD`, `BUILTIN_PIE_PLOT_BOX` |
| `totalConsumptionByGroupCustomizedSurface` | customized | ~7 | + `BUILTIN_CHART_HEADER_ROW` |
| `consumptionBlankPreview` | basic | ~4 | `energyCustomNeedsDates`, `energyLineChartSurface` |

Advanced surfaces share a **near-duplicate base** (`cardBackground`, `CARD_BORDER`, `CARD_SHADOW`, `DASHBOARD_CHART_TOOLTIP_STYLE`, `cardClassName: 'chart-card-animated'`).

### 2.8 Export-control injection

Export controls are **JSX elements** built in Dashboard `useMemo` and injected into overrides as `exportControl`. Pattern is structurally identical; styling/handlers differ.

| Control | basic | advanced | customized |
|---------|-------|----------|--------------|
| `consumptionExportControl` | ~90 LOC, theme via `resolveEnergyChartTheme` | ~26 LOC, `ChartExportButton` | ~83 LOC, hardcoded `#CDC0A0` |
| `savingsExportControl` | ~90 LOC | ~26 LOC | ~83 LOC |
| `totalConsumptionByGroupExportControl` | ~95 LOC, `resolvePieChartTheme` | ~26 LOC | ~83 LOC |

**8B boundary:** Export JSX **stays in Dashboard** (uses handlers, refs, local state). Builders accept `{ consumption, savings, totalConsumptionByGroup }` export nodes as inputs.

### 2.9 Variant title overrides

Titles flow through shared hook — **not duplicated in override objects**:

```javascript
const { consumption, savings, savingsByStrategy, totalConsumptionByGroup } = energyWidgetTitles;
// passed as titles: energyWidgetTitles
```

Resolution delegated to `resolveWidgetTitle` in `widgetSlotResolvers.js`. No 8B extraction needed beyond passing `titles` through context builder.

---

## 3. Duplication Matrix

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|----------------|
| Context data bag | ✓ | ✓ | ✓ | **Exact duplicate** |
| Context loading/chart flags | ✓ | ✓ | ✓ | **Exact duplicate** |
| Override map shape (6 keys) | ✓ | ✓ | ✓ | **Near duplicate** (surface key name differs) |
| Line chart surface | `chartSurface` | `advancedSurface` | `customizedSurface` | **Near duplicate** |
| Pie chart surface | `chartSurface` | `advancedSurface` | `customizedSurface` | **Near duplicate** |
| Export on consumption/savings/group | ✓ | ✓ | ✓ | **Near duplicate** (JSX differs) |
| `energyLightFullCardHeightPx` | ✓ | — | — | **Basic-only** |
| `emptyStateExtras` / `blankChartPreview` | ✓ | — | — | **Basic-only** |
| `energyCustomNeedsDates` in context | ✓ | — | — | **Basic-only** |
| `metricPanelBorder` | — | ✓ | — | **Advanced-only** |
| `areaIdToDisplayName` | — | — | ✓ | **Customized-only** |
| Embedded `SavingsByStrategyWidget` in combined chart | ✓ | — | — | **Basic-only, out of scope** |
| LPD/peak metric panel chrome | ✓ | ✓ | ✓ | **Variant-owned, out of scope** |
| Custom graph cards | — | — | ✓ | **Out of scope** |

---

## 4. Exact vs Near vs Customized-Only

### Exact duplicates (safe to centralize in 8B)
1. `buildEnergyWidgetRenderContext` **data/loading/chartLoading/colors** field list
2. Override map **key set**: `consumption`, `savings`, `savings_by_strategy`, `total_consumption_by_group`, `light_power_density`, `peak_and_minimum_consumption`
3. Export injection **slots**: consumption + savings + total_consumption_by_group
4. Title passthrough: `titles: energyWidgetTitles`, `widgetList`, `getWidgetTitle`

### Near duplicates (centralize with variant preset parameter)
1. Surface prop name: `chartSurface` vs `advancedSurface` vs `customizedSurface`
2. Advanced pie/line surface factory base object
3. Customized `BUILTIN_*` surface templates (line vs pie)
4. Basic `chartSurface` derivation from `energyLineChartSurface` / `energyMetricLight`

### Basic-only paths (preset flag, not shared default)
- `energyLightFullCardHeightPx` on 4 widget overrides
- `emptyStateExtras`, `blankChartPreview` on consumption
- `energyCustomNeedsDates` in context
- `consumption_saving` embedded strategy widget props (not in render map)

### Advanced-only paths
- `metricPanelBorder` on context + peak override
- Theme-aware advanced surface palette functions

### Customized-only paths
- `areaIdToDisplayName` on context
- `legendSeriesName` in line surfaces (title-driven)
- `BUILTIN_COMPACT_PANEL` chrome around LPD/peak (layout, not override builder)

---

## 5. Proposed 8B Module Responsibilities

> Inferred from STEP 2–3 (user message truncated at "Presets should contain only"). Confirm before implementation.

### `dashboardVariantPresets.js`
Presets should contain **only metadata** (no JSX, no Redux, no hooks):
- `variant` string (`basic` | `advanced` | `customized`)
- `surfaceKey` (`chartSurface` | `advancedSurface` | `customizedSurface`)
- `widgetOverrideKeys` per widget type (line, pie, metric)
- `contextFields` flags (`energyCustomNeedsDates`, `metricPanelBorder`, `areaIdToDisplayName`)
- `basicEnergyChrome` flags (`energyLightFullCardHeightPx`, `emptyStateExtras`, `blankChartPreview`)

### `widgetOverrideBuilders.js`
Pure functions:
- `buildLineEnergyWidgetOverrides(preset, inputs)`
- `buildPieWidgetOverrides(preset, inputs)`
- `buildMetricWidgetOverrides(preset, inputs)`
- `buildEnergyWidgetOverridesMap(preset, surfaces, exportControls, basicExtras?)`

### `widgetRenderContextBuilders.js`
Pure functions:
- `buildEnergyWidgetContextData(inputs)` — shared data/loading bag
- `buildEnergyWidgetRenderContextFromPreset(preset, shared, overrides)` — wraps `buildEnergyWidgetRenderContext`

### `useDashboardRenderContext.js`
Hook:
- Accepts variant preset + dashboard state slices
- Memoizes surfaces, override map, full context
- Returns `{ energyWidgetRenderContext, surfaces, overrides }`

---

## 6. Expected LOC Impact (post-8B)

| File | Current | Target delta |
|------|---------|--------------|
| basic `Dashboard.jsx` | 3,906 | −80 to −120 |
| advanced `Dashboard.jsx` | 3,408 | −60 to −90 |
| customized `Dashboard.jsx` | 5,239 | −50 to −80 |
| New shared builders | 0 | +250 to +350 |
| **Net** | | −40 to −140 (dashboard-heavy reduction) |

Export JSX (~720 LOC) intentionally **not** moved in 8B.

---

## 7. Stop Boundary (unchanged from 8A)

**DO NOT:**
- Build `DashboardContainer` / layout renderer
- Move DnD, `LongPressDraggable`, AreaTree UI
- Move custom graph code (`custom_graph:*`, `EnergyCustomGraphCard`)
- Move export handler implementations (only accept injected controls)
- Move metric panel chrome (LPD header, unit selector, `BUILTIN_COMPACT_PANEL`)
- Modify widget component implementations

---

## 8. Open Items

1. **User spec truncated** at STEP 3: "Presets should contain only …" — need remainder for preset field whitelist and wiring steps (4–8 if any).
2. Confirm whether `buildEnergyWidgetRenderContext` in `widgetSlotResolvers.js` migrates to `widgetRenderContextBuilders.js` or delegates to it.
3. Confirm whether basic `consumption_saving` embedded strategy overrides get a shared builder helper (optional, low priority).

---

## 9. Sign-off

| Step | Status |
|------|--------|
| STEP 1 — Audit | ✅ Complete |
| STEP 2+ — Implementation | ⏸ Blocked pending audit sign-off + truncated spec |
