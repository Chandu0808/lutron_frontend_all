# Phase 6.3E — Space Widget Renderer Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3D space export hook  
**Scope:** Centralize SpaceUtilization widget routing (mirrors Dashboard 6.2C.8A `DashboardWidgetRenderer`)

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `SpaceWidgetRenderer` + slot resolvers; replaced duplicated adapter/widget switch blocks in all three `SpaceUtilization.jsx` variants |
| Widget keys in render map | 5 (`utilization`, `utilization_by_area_group`, `utilization_by_area`, `instant_occupancy_count`, `peak_and_minimum_utilization`) |
| Excluded from map | `instant_utilization_combined` (basic-only; stays in variant) |
| Variant LOC removed | **−24** gross (−11 basic, −10 advanced, −3 customized vs 6.3D) |
| Shared container module added | **818** LOC (production + tests) |
| UI / behavior changes | **None** — card chrome, export dropdowns, tab layout, DnD, custom graphs unchanged |
| Verification | `npm run build` PASS; **59 suites, 628 tests PASS** (+31 new) |

---

## 2. Overlap Analysis (STEP 1 Audit)

### 2.1 Widget routing classification

| Widget key | Renderer target | basic | advanced | customized | Overlap |
|------------|-----------------|:-----:|:--------:|:----------:|:-------:|
| `utilization` | `SpaceLineChartAdapter` | ✓ | ✓ | ✓ | **EXACT** |
| `utilization_by_area_group` | `SpaceStackedBarChartAdapter` | ✓ | ✓ | ✓ | **EXACT** |
| `instant_occupancy_count` | `InstantOccupancyChartAdapter` | ✓ | ✓ | ✓ | **EXACT** |
| `peak_and_minimum_utilization` | `SpacePeakMinCards` | ✓ | ✓ | ✓ | **EXACT** (6.3C) |
| `utilization_by_area` | `UtilizationByAreaList` | ✓ | ✓ | ✓ | **EXACT** (6.3C) |
| `instant_utilization_combined` | combined card + instant section | ✓ | — | — | **VARIANT-ONLY** (basic) |

### 2.2 Duplication matrix (pre-6.3E)

| Concern | basic | advanced | customized | Classification |
|---------|-------|----------|------------|----------------|
| `LineChartComponent` wrapper | ✓ | ✓ | ✓ | **EXACT** (shellVariant only) |
| `StackedBarChartComponent` wrapper | ✓ | ✓ | ✓ | **NEAR** (card shell / group label / requireAreaGroupName) |
| `InstantOccupancyChartComponent` wrapper | ✓ | ✓ | ✓ | **NEAR** (chartSurface, footer, fullscreen) |
| `SpacePeakMinCards` inline props | ✓ | ✓ | ✓ | **NEAR** (main vs charts loading contract) |
| `UtilizationByAreaList` inline props | ✓ | ✓ | ✓ | **NEAR** (active vs main payload, layoutMode) |
| Chart `ChartLoader` ternary gates | ✓ | ✓ | ✓ | **EXACT** pattern (key-specific loading flags) |
| Card chrome + export JSX | ✓ | ✓ | ✓ | **Not moved** (per stop boundary) |
| DnD / `LongPressDraggable` / `SortableDashboardItem` | ✓ | — | ✓ | **Not moved** |
| Custom graph rendering | — | — | ✓ | **Not moved** |

### 2.3 Title fallbacks (variant chrome still resolves titles)

| Widget | Charts tab fallback | Main tab fallback |
|--------|---------------------|-------------------|
| `utilization` | Utilization | Utilization |
| `utilization_by_area_group` | Occupancy by Group | Utilization By Area Groups |
| `instant_occupancy_count` | Instant Occupancy Count | Instant Occupancy Count |
| `peak_and_minimum_utilization` | Peak & Minimum Utilization | Peak & Minimum Utilization |
| `utilization_by_area` | Utilization By Area | Utilization By Area |

Customized export headers additionally use `generateDynamicChartTitle()` — unchanged in variants.

### 2.4 Loading gates (centralized in `resolveSpaceWidgetLoading`)

| Widget | Loading expression |
|--------|-------------------|
| `utilization` | `occupancyCountLoading \|\| anyLoading \|\| isLoading \|\| globalLoadingProp` |
| `instant_occupancy_count` | `instantOccupancyCountLoading \|\| shared` |
| `utilization_by_area_group` (charts / `selectorMode: active`) | `activeOccupancyByGroupLoading \|\| shared` |
| `utilization_by_area_group` (main / `selectorMode: main`) | `occupancyByGroupLoading \|\| shared` |
| `peak_and_minimum_utilization` | Internal (`SpacePeakMinCards`) |
| `utilization_by_area` | Internal (`UtilizationByAreaList`) |

---

## 3. Widget Matrix

| `widgetKey` | `SPACE_WIDGET_RENDERER_TYPES` | Component |
|-------------|------------------------------|-----------|
| `utilization` | `LINE_CHART` | `SpaceLineChartAdapter` |
| `utilization_by_area_group` | `STACKED_BAR_CHART` | `SpaceStackedBarChartAdapter` |
| `instant_occupancy_count` | `INSTANT_OCCUPANCY_CHART` | `InstantOccupancyChartAdapter` |
| `peak_and_minimum_utilization` | `PEAK_MIN_CARDS` | `SpacePeakMinCards` |
| `utilization_by_area` | `UTILIZATION_BY_AREA_LIST` | `UtilizationByAreaList` |

---

## 4. Prop Matrix

Context shape: `buildSpaceWidgetRenderContext({ variant, showChartsTab, data, loading, chart, shell, ChartLoader, getWidgetTitle, widgetList, shouldShowWidget, overrides })`

Per-render: `selectorMode: 'active' | 'main'` merged into context at call site.

| Prop source | basic | advanced | customized |
|-------------|-------|----------|------------|
| `shell.spaceShell` | ✓ | — | — |
| `shell.chartSurface` | `spaceUtilLight` | — | — |
| `shell.lineSeriesColor` / card shell | — | ✓ | — |
| `shell.colorPalette` | `COLORS` | `chartPalette` | `COLORS` |
| `shell.resolveGroupLabel` | — | — | ✓ |
| `shell.requireAreaGroupName` | default `true` | default `true` | `false` |
| `shell.isUtilizationFullscreen` | — | — | ✓ |
| `shell.isInstantOccupancyFullscreen` | — | — | ✓ |
| `shell.processOptions` | — | — | group filter |
| `shell.utilizationByAreaLayoutMode` | `scroll` | `fill` | `flex` |
| `shell.metricPanelBorder` | — | ✓ | — |
| `shell.customizedTheme` | — | — | `theme` |
| Peak min charts tab | full loading props | full + `metricPanelBorder` | full |
| Peak min main tab | `isLoading` aggregate, `includeInstantLoading: false` | same | same |
| Area list payload | `active*` vs `space*` via `selectorMode` | same | same + `processOptions` |
| Instant overrides (basic) | `chartSurface`, `enableUtilizationFooter: true` | — | — |

---

## 5. Files Created

```
src/shared/dashboard/space/container/
├── spaceWidgetRenderMap.js          # 5-key registry (no instant_utilization_combined)
├── spaceWidgetSlotResolvers.js      # resolve* + buildSpaceWidgetRenderContext
├── SpaceWidgetRenderer.jsx          # routes to adapters + 6.3C widgets
├── spaceWidgetRendererMemoCompare.js
├── spaceWidgetSlotResolvers.test.js
├── spaceWidgetRendererParity.test.jsx
└── index.js
```

### Files modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Removed 3 adapter wrappers; wired `<SpaceWidgetRenderer />` (10 call sites); kept `instant_utilization_combined` |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Same pattern (8 call sites) |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Same pattern (10 call sites) + `shouldShowWidget` in context |

---

## 6. LOC Before / After

| Area | Before (6.3D) | After (6.3E) | Δ |
|------|--------------:|-------------:|--:|
| basic `SpaceUtilization.jsx` | 2,512 | 2,501 | −11 |
| advanced `SpaceUtilization.jsx` | 1,173 | 1,163 | −10 |
| customized `SpaceUtilization.jsx` | 5,522 | 5,519 | −3 |
| **Variants total** | **9,207** | **9,183** | **−24** |
| `space/container/` (new) | 0 | 818 | +818 |
| **Net** | — | — | **+794** |

Net LOC increases because routing logic + tests moved to shared module; variants retain card chrome, exports, DnD, and layout.

---

## 7. Tests Added

| File | Tests | Coverage |
|------|------:|----------|
| `spaceWidgetSlotResolvers.test.js` | 20 | Map registry, title routing, visibility, loading parity, prop builders, context builder |
| `spaceWidgetRendererParity.test.jsx` | 11 | Widget selection, loader gates, overrides, unsupported keys |

**Suite delta:** 597 → **628** tests (+31) across `shared/dashboard`.

---

## 8. Verification

```bash
npm run build                                          # PASS
npm test -- --testPathPattern=shared/dashboard         # 59 suites, 628 tests PASS
npm test -- --testPathPattern=shared/dashboard/space/container  # 31 tests PASS
```

---

## 9. Stop Boundary (not started)

- `SpaceLayoutRenderer`
- `SpaceUtilizationContainer`
- Export JSX extraction
- Custom graph code extraction
- DnD extraction
- Chart adapter modifications

---

## 10. Rollback Plan

1. Revert commits touching `src/shared/dashboard/space/container/` and the three `SpaceUtilization.jsx` variants.
2. Restore direct imports: `SpaceLineChartAdapter`, `SpaceStackedBarChartAdapter`, `InstantOccupancyChartAdapter`, `SpacePeakMinCards`, `UtilizationByAreaList`.
3. Restore local `LineChartComponent` / `StackedBarChartComponent` / `InstantOccupancyChartComponent` wrappers and inline `ChartLoader` ternaries.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard` to confirm parity.

Single-commit rollback is safe: no adapter or API contract changes; renderer is a pure routing layer.

---

## 11. Next Phase Prerequisites

| Phase | Prerequisite |
|-------|--------------|
| 6.3F `SpaceLayoutRenderer` | 6.3E complete |
| 6.3G `SpaceUtilizationContainer` | 6.3E + 6.3F |
