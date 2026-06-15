# Phase 6.3F — Space Layout Renderer Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3E `SpaceWidgetRenderer`  
**Scope:** Centralize SpaceUtilization tab/section layout orchestration (mirrors Dashboard `EnergyLayoutRenderer` / `DashboardLayoutRenderer`)

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `SpaceLayoutRenderer` + layout resolvers/adapters; replaced duplicated tab/section assembly in all three `SpaceUtilization.jsx` variants |
| Layout modes | `dynamic-rows` (basic), `fixed-sections` (advanced + customized main), `sortable-grid` (customized charts) |
| Variant `SpaceUtilization.jsx` LOC removed | **−1,514** gross vs 6.3E |
| Shared `space/container` module growth | **+1,086** LOC (layout layer on top of 6.3E widget layer) |
| UI / behavior changes | **None** — export chrome, DnD, combined chart, custom graphs, fullscreen remain in variant runtime delegates |
| Verification | `npm run build` PASS; **61 suites, 648 tests PASS** (+20 new) |

---

## 2. Overlap Analysis (STEP 1 Audit)

### 2.1 Shared layouts (centralized)

| Layout concern | basic | advanced | customized | Classification |
|----------------|:-----:|:--------:|:----------:|:--------------|
| Charts tab routing (`showChartsTab`) | ✓ | ✓ | ✓ | **EXACT** |
| Main utilization tab routing | ✓ | ✓ | ✓ | **EXACT** |
| Widget slot order iteration | ✓ | ✓ | ✓ | **EXACT** |
| Charts row pairing (`buildSpaceChartsDashboardRows`) | ✓ | — | — | **EXACT** (moved to shared) |
| Advanced two-column section (group+peak \| area) | — | ✓ | ✓ main | **EXACT** |
| Empty-state when no visible widgets | ✓ | — | — | **EXACT** |
| Charts duration filter chrome (basic standalone) | ✓ | — | — | **EXACT** |

### 2.2 Variant-only layouts (kept in variants via `runtime`)

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|:--------------|
| `instant_utilization_combined` | ✓ | — | — | **VARIANT-ONLY** (`renderCustomSlot`) |
| Custom graph cards / override graphs | — | — | ✓ | **VARIANT-ONLY** (inside sortable grid delegate) |
| `LongPressDraggable` wrap | ✓ | — | — | **VARIANT-ONLY** (`wrapSlot`) |
| `SortableDashboardItem` + `DndContext` grid | — | — | ✓ | **VARIANT-ONLY** (`renderSortableLayout`) |
| Export dropdown JSX | ✓ | ✓ | ✓ | **Not moved** (`renderWidgetSlot` helpers) |
| Fullscreen shells | — | — | ✓ | **Not moved** (SortableDashboardItem props) |

### 2.3 Duplication matrix (pre-6.3F)

| Block | basic | advanced | customized | Lines (approx) |
|-------|:-----:|:--------:|:----------:|---------------:|
| Charts tab outer structure + row loop | ✓ | ✓ | ✓ | ~400 × 3 |
| Main tab two-column structure | — | ✓ | ✓ | ~300 × 2 |
| Per-slot `slotId ===` switch + card chrome | ✓ | ✓ | ✓ | ~150 × 5 slots × 2 tabs |
| Empty-state panels | ✓ | — | — | ~40 × 2 |
| `buildSpaceChartsDashboardRows` | ✓ | — | — | ~25 |

---

## 3. Layout Matrix

| `activeTab` | Mode | Adapter | Section structure |
|-------------|------|---------|-------------------|
| `charts` | `dynamic-rows` | `createBasicSpaceLayoutAdapter` | Paired rows from `buildSpaceChartsDashboardRows` |
| `utilization` | `dynamic-rows` | `createBasicSpaceLayoutAdapter` | One slot per row |
| `charts` | `fixed-sections` | `createAdvancedSpaceLayoutAdapter` | Instant full-width → split (group+peak \| area) |
| `utilization` | `fixed-sections` | `createAdvancedSpaceLayoutAdapter` | Utilization full-width → split |
| `charts` | `sortable-grid` | `createCustomizedSpaceLayoutAdapter` | `runtime.renderSortableLayout` (DnD grid) |
| `utilization` | `fixed-sections` | customized adapter override | Same split as advanced |

---

## 4. Prop / Runtime Matrix

### `SpaceLayoutRenderer` props

| Prop | Purpose |
|------|---------|
| `activeTab` | `SPACE_TAB_IDS.CHARTS` \| `SPACE_TAB_IDS.UTILIZATION` |
| `layoutContext` | From `buildSpaceLayoutContext()` — order, flags, `widgetRenderContext` |
| `adapter` | Variant layout adapter from `create*SpaceLayoutAdapter()` |
| `runtime` | Variant delegates (see below) |

### `buildSpaceLayoutContext` fields

| Field | basic | advanced | customized |
|-------|:-----:|:--------:|:----------:|
| `visibleSlotOrder` | charts + main orders | — | — |
| `mergedSlotOrder` | — | — | charts DnD order |
| `showTabChrome` | standalone duration filter | — | — |
| `shouldShowWidget` | — | — | main tab |
| `widgetRenderContext` | ✓ | ✓ | ✓ |
| `chartLoaderHeights` | per-slot map | — | — |
| `buildRows` | via adapter | — | — |

### Runtime delegates

| Delegate | Used by | Responsibility |
|----------|---------|----------------|
| `renderWidgetSlot` | all | Card chrome + `<SpaceWidgetRenderer />` |
| `renderCustomSlot` | basic | `instant_utilization_combined` |
| `wrapSlot` | basic | `LongPressDraggable` |
| `renderEmptyState` | basic | No-widgets panels |
| `renderTabChrome` | basic | Duration filter above charts |
| `renderSortableLayout` | customized charts | Full DnD grid + custom graphs |

---

## 5. Files Created / Modified

### Shared (`src/shared/dashboard/space/container/`)

| File | Role |
|------|------|
| `spaceLayoutTypes.js` | Tab IDs, layout modes, slot kinds |
| `spaceLayoutAdapters.js` | Registry + `createBasic/Advanced/CustomizedSpaceLayoutAdapter` |
| `spaceLayoutResolvers.js` | `resolveSpaceTabLayout`, `buildSpaceChartsDashboardRows`, visibility, order |
| `SpaceLayoutRenderer.jsx` | Layout orchestration → `SpaceWidgetRenderer` |
| `spaceLayoutMemoCompare.js` | Memo compare |
| `spaceLayoutResolvers.test.js` | 12 tests |
| `spaceLayoutRendererParity.test.jsx` | 8 tests |
| `index.js` | Barrel exports (updated) |

### Variant slot helpers (card chrome stays out of shared renderer)

| File | Variant |
|------|---------|
| `basicSpaceLayoutSlots.jsx` | basic |
| `advancedSpaceLayoutSlots.jsx` | advanced |
| `customizedSpaceLayoutSlots.jsx` | customized |

### Variant wiring

| File | Change |
|------|--------|
| `basic/SpaceUtilization.jsx` | Charts + main tabs → `<SpaceLayoutRenderer />` |
| `advanced/SpaceUtilization.jsx` | Single renderer for both tabs |
| `customized/SpaceUtilization.jsx` | Sortable charts grid delegate + fixed main tab |

---

## 6. LOC Before / After

| Area | 6.3E | 6.3F | Δ |
|------|-----:|-----:|--:|
| basic `SpaceUtilization.jsx` | 2,501 | 1,804 | **−697** |
| advanced `SpaceUtilization.jsx` | 1,163 | 631 | **−532** |
| customized `SpaceUtilization.jsx` | 5,519 | 5,234 | **−285** |
| Variant slot helpers (new) | 0 | 784 | +784 |
| **`space/container/` total** | **818** | **1,904** | **+1,086** |

**Variant `SpaceUtilization.jsx` only:** 9,183 → 8,669 (−514)  
**Including variant slot helpers:** net variant −730 vs 6.3E shell files; layout logic consolidated in shared module.

---

## 7. Tests Added

| File | Tests | Coverage |
|------|------:|----------|
| `spaceLayoutResolvers.test.js` | 12 | Row builder, tab routing, visibility, order, context |
| `spaceLayoutRendererParity.test.jsx` | 8 | Empty state, dynamic rows, custom slots, fixed sections, wrap, tab chrome |

**Suite delta:** 628 → **648** tests (+20) across `shared/dashboard`.

---

## 8. Verification

```bash
npm run build                                          # PASS
npm test -- --testPathPattern=shared/dashboard         # 61 suites, 648 tests PASS
npm test -- --testPathPattern=shared/dashboard/space/container  # 51 tests PASS
```

---

## 9. Stop Boundary (not started)

- `SpaceUtilizationContainer`
- Export JSX extraction
- Custom graph pipeline extraction (6.3I)
- DnD extraction to shared module
- Chart adapter / widget implementation changes

---

## 10. Rollback Plan

1. Revert commits touching `src/shared/dashboard/space/container/spaceLayout*` and variant `SpaceUtilization.jsx` + `*SpaceLayoutSlots.jsx` files.
2. Restore inline charts/main tab JSX loops and local `buildSpaceChartsDashboardRows` in basic.
3. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Rollback is safe in one commit: `SpaceWidgetRenderer` (6.3E) is unchanged; layout layer is additive routing only.

---

## 11. Architecture

```
SpaceUtilization (variant)
  └── SpaceLayoutRenderer (activeTab, layoutContext, adapter, runtime)
        ├── dynamic-rows / fixed-sections / sortable-grid
        └── runtime.renderWidgetSlot → SpaceWidgetRenderer
              └── chart adapters + shared widgets (6.3C / 6.3E)
```

**Next:** Phase 6.3G `SpaceUtilizationContainer` (mirrors Dashboard 6.2C.10).
