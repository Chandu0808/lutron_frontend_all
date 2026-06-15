# Phase 6.2C.9B — EnergyLayoutRenderer Extraction Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.2C.9A audit approved; Phase 6.2C.8A `DashboardWidgetRenderer` in place  
**Scope:** Energy-tab **layout placement only** — no `DashboardContainer`, no DnD moves, no custom-graph moves, no SpaceUtilization

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was centralized? | Row/grid iteration, slot placement, and widget-slot invocation for the energy tab across basic, advanced, and customized |
| What stayed variant-owned? | DnD (`LongPressDraggable`, `@dnd-kit`), persistence, metric chrome styling, `consumption_saving` combined chart, `energyCards` / custom graphs |
| Net dashboard LOC change | **−1,085** across three `Dashboard.jsx` files |
| Shared module LOC added | **549** production + **190** tests |
| Verification | `npm run build` PASS; `npm test -- --testPathPattern=shared/dashboard` — **50 suites, 529 tests PASS** |

---

## 2. Overlap Analysis

### 2.1 Pre-extraction duplication (from 9A audit)

| Concern | basic | advanced | customized | Overlap before 9B |
|---------|:-----:|:--------:|:----------:|:-----------------:|
| Row / grid iteration | `energyDashboardRows.map` | 3 hardcoded `Grid` blocks | `orderedEnergyCards.map` in CSS grid | Placement logic only (~30%) |
| Slot → widget routing | `renderEnergyDraggableSlot` switch | Inline per-`Grid` item | `energyCards[].render` | Already centralized in 8A |
| Metric panel chrome (LPD / peak) | Inline in switch | Inline in grid cells | `BUILTIN_COMPACT_PANEL` + `renderLightingPowerDensity` | Shell structure ~40%; styling 0% |
| DnD wrapper | `LongPressDraggable` per slot | None | `SortableDashboardItem` per card | 0% — intentionally variant-owned |
| Custom combined chart | `consumption_saving` case | N/A | N/A | basic-only |
| Custom graphs | N/A | N/A | `custom_graph:*` cards | customized-only |

### 2.2 Post-extraction ownership

| Layer | Owner | Notes |
|-------|-------|-------|
| **Placement** | `EnergyLayoutRenderer` | `dynamic-rows`, `fixed-grid`, `sortable-grid` |
| **Slot metadata** | Layout adapters | Registry, row descriptors, grid constants — no Redux/hooks |
| **Widget body** | `DashboardWidgetRenderer` (8A) | Unchanged |
| **Shell chrome** | Variant `adapterRuntime.getShellProps` | Styling tokens passed via props; not moved to shared |
| **DnD** | Variant `adapterRuntime.wrapSlot` / `wrapCard` | basic `LongPressDraggable`; customized `SortableDashboardItem` |
| **Custom slots** | Variant `adapterRuntime.renderCustomSlot` | basic `consumption_saving` only |
| **Card descriptors** | customized `energyCards` + `energyCustomCards` | Renderer iterates; does not build cards |

### 2.3 Intentional non-overlap (stop boundary)

Not extracted and not modified:

- `DashboardContainer`, `DashboardLayoutRenderer`
- `LongPressDraggable`, `SortableDashboardItem` implementations
- `@dnd-kit` `DndContext` / `SortableContext` (customized)
- `energyCards`, `buildEnergyBuiltinRender`, `energyCustomCards`, custom graph rendering
- `SpaceUtilization`, AreaTree, exports, dates, visibility hooks
- Widget implementations

---

## 3. Prop Matrix

### 3.1 `EnergyLayoutRenderer`

| Prop | Type | Required | Used by mode | Description |
|------|------|:--------:|--------------|-------------|
| `variant` | `'basic' \| 'advanced' \| 'customized'` | ✓ | all | Passed through to `WidgetSlotRenderer` / `DashboardWidgetRenderer` |
| `layoutMode` | `ENERGY_LAYOUT_MODES.*` | ✓ | all | `dynamic-rows` \| `fixed-grid` \| `sortable-grid` |
| `rows` | `string[][]` | basic, advanced | placement | Slot IDs per row (from visibility hook or fixed registry) |
| `cards` | `{ key, render }[]` | customized | placement | Pre-built card descriptors; renderer calls `render()` only |
| `context` | `EnergyWidgetRenderContext` | basic, advanced | widget | From `buildEnergyWidgetRenderContext` (8A) |
| `adapter` | object | ✓ | all | Metadata: registry, sx resolvers, grid spacing — no hooks |
| `adapterRuntime` | object | ✓ | all | Variant-injected callbacks (DnD, shells, custom slots) |
| `theme` | MUI theme | basic | row sx | Used by `resolveBasicSlotColumnSx` for spacing calc |
| `gridOptions` | `{ gridColumns, visibleCount }` | customized | sortable grid | Passed to `resolveSortableGridSx` and `getCardCol` |

### 3.2 `adapter` contracts (metadata only)

| Field | basic | advanced | customized |
|-------|:-----:|:--------:|:----------:|
| `SLOT_REGISTRY` | ✓ | ✓ | — |
| `resolveRowSx` / `resolveBasicRowSx` | ✓ | — | — |
| `resolveSlotColumnSx` / `resolveBasicSlotColumnSx` | ✓ | — | — |
| `getSlotMeta` | ✓ | ✓ | — |
| `GRID_SPACING` | — | ✓ | — |
| `GRID_ITEM_PROPS` | — | ✓ | — |
| `resolveGridRowSx` | — | ✓ | — |
| `resolveSortableGridSx` | — | — | ✓ |

### 3.3 `adapterRuntime` contracts (variant-injected)

| Callback | basic | advanced | customized | Purpose |
|----------|:-----:|:--------:|:----------:|---------|
| `wrapSlot(slotId, content)` | ✓ | — | — | Inject `LongPressDraggable` |
| `renderCustomSlot(slotId)` | ✓ | — | — | `consumption_saving` combined chart |
| `getShellProps(slotId)` | ✓ | ✓ | — | Metric panel chrome for LPD / peak |
| `wrapCard(key, col, content)` | — | — | ✓ | Inject `SortableDashboardItem` |
| `getCardCol(key, visibleCount)` | — | — | ✓ | Span / column for sortable grid |

### 3.4 `WidgetSlotRenderer`

| Prop | Type | Description |
|------|------|-------------|
| `widgetKey` | string | Delegated to `DashboardWidgetRenderer` |
| `variant` | string | Dashboard variant |
| `context` | object | Widget render context |
| `shellType` | `'none' \| 'metric-panel' \| 'compact-panel'` | Shell selection |
| `shellProps` | object | Variant-owned styling: `outerStyle`, `headerTitle`, `bodyContent`, etc. |
| `children` | ReactNode | Optional override of widget body |

---

## 4. Files Created

```
src/shared/dashboard/container/layout/
├── EnergyLayoutRenderer.jsx           (171 LOC)
├── WidgetSlotRenderer.jsx             (126 LOC)
├── layoutTypes.js                     (14 LOC)
├── energyLayoutMemoCompare.js         (13 LOC)
├── index.js                           (34 LOC)
├── energyLayoutRendererParity.test.jsx (190 LOC)
└── adapters/
    ├── basicLayoutAdapter.js          (105 LOC)
    ├── advancedLayoutAdapter.js       (47 LOC)
    └── customizedLayoutAdapter.js       (39 LOC)
```

**Production LOC added:** 549  
**Test LOC added:** 190

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replaced `energyDashboardRows.map` + `renderEnergyDraggableSlot` with `<EnergyLayoutRenderer />`; added `basicEnergyLayoutAdapter` + `basicEnergyLayoutRuntime` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Replaced 3 fixed `Grid` widget blocks with `<EnergyLayoutRenderer />`; removed inline `renderLightingPowerDensity`; added `advancedEnergyLayoutAdapter` + `advancedEnergyLayoutRuntime` |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Replaced inner grid `orderedEnergyCards.map` with `<EnergyLayoutRenderer />` inside existing `DndContext` / `SortableContext`; `energyCards`, custom graphs, `SortableDashboardItem` unchanged |
| `src/shared/dashboard/container/index.js` | Re-export layout module symbols |

---

## 6. LOC Before / After

### 6.1 Dashboard monoliths (9A baseline → post-9B)

| File | Before (9A) | After | Δ |
|------|-------------|-------|---|
| `basic/.../Dashboard.jsx` | 3,906 | 3,564 | **−342** |
| `advanced/.../Dashboard.jsx` | 3,408 | 3,039 | **−369** |
| `customized/.../Dashboard.jsx` | 5,239 | 4,865 | **−374** |
| **Total** | **12,553** | **11,468** | **−1,085** |

### 6.2 Shared module balance

| Category | LOC |
|----------|-----|
| Removed from dashboards | −1,085 |
| Added (layout production) | +549 |
| Added (parity tests) | +190 |
| **Net production delta** | **≈ −536** |

Customized shows the smallest dashboard reduction (−374 LOC file delta but only −1 LOC net in prior estimate) because `energyCards`, `buildEnergyBuiltinRender`, `renderLightingPowerDensity`, and DnD shell remain in the variant file — only the grid iteration loop moved to shared.

---

## 7. Wiring Summary by Variant

### 7.1 basic — `dynamic-rows`

```jsx
<EnergyLayoutRenderer
  variant="basic"
  layoutMode={BASIC_LAYOUT_MODE}
  rows={energyDashboardRows}
  context={energyWidgetRenderContext}
  adapter={basicEnergyLayoutAdapter}
  adapterRuntime={basicEnergyLayoutRuntime}
  theme={theme}
/>
```

- `basicEnergyLayoutAdapter`: `BASIC_ENERGY_SLOT_REGISTRY`, `resolveBasicRowSx`, `resolveBasicSlotColumnSx`
- `basicEnergyLayoutRuntime`: `wrapSlot` → `LongPressDraggable`; `renderCustomSlot` → `ConsumptionSavingsCombinedChart`; `getShellProps` → LPD / peak metric panels
- `energyDraggableReflow` and `onReorderEnergySlots` unchanged upstream

### 7.2 advanced — `fixed-grid`

```jsx
<EnergyLayoutRenderer
  variant="advanced"
  layoutMode={ADVANCED_LAYOUT_MODE}
  rows={ADVANCED_ENERGY_FIXED_ROWS}
  context={energyWidgetRenderContext}
  adapter={advancedEnergyLayoutAdapter}
  adapterRuntime={advancedEnergyLayoutRuntime}
/>
```

- Fixed 3-row structure preserved: pies → lines → metrics
- No DnD; metric chrome via `getShellProps` only

### 7.3 customized — `sortable-grid`

```jsx
<DndContext ...>
  <SortableContext items={mergedOrder} strategy={rectSortingStrategy}>
    <EnergyLayoutRenderer
      variant="customized"
      layoutMode={CUSTOMIZED_LAYOUT_MODE}
      cards={orderedEnergyCards}
      adapter={{ resolveSortableGridSx: resolveCustomizedSortableGridSx }}
      adapterRuntime={{ getCardCol, wrapCard: SortableDashboardItem wrapper }}
      gridOptions={{ gridColumns, visibleCount }}
    />
  </SortableContext>
</DndContext>
```

- Card ordering, custom graphs (`custom_graph:*`), and `energyCards` build logic remain in customized `Dashboard.jsx`
- Renderer only iterates `cards` and applies `wrapCard`

---

## 8. Parity Verification

### 8.1 Automated tests — `energyLayoutRendererParity.test.jsx`

| Test | Assertion |
|------|-----------|
| `buildBasicEnergyRowDescriptors` | Pairs slots; `consumption_saving` isolated full-width row |
| `ADVANCED_ENERGY_FIXED_ROWS` | Exactly 3 rows with expected slot IDs |
| `isCustomGraphEnergyCardKey` | `custom_graph:*` keys identified |
| basic `dynamic-rows` render | Widget keys `['consumption', 'savings']` in order; custom slot `consumption_saving` rendered |
| advanced `fixed-grid` render | Six widget keys in fixed order |
| customized `sortable-grid` render | Card order preserved; custom graph card wrapped and content rendered |

### 8.2 Widget key parity (pre-migration order)

| Variant | Expected rendered widget keys (visible defaults) |
|---------|--------------------------------------------------|
| basic | Follows `energyVisibleSlotOrder` → `buildEnergyDashboardRows`; `consumption_saving` is custom, not `DashboardWidgetRenderer` |
| advanced | `savings_by_strategy`, `total_consumption_by_group`, `consumption`, `savings`, `light_power_density`, `peak_and_minimum_consumption` |
| customized | Builtin keys + `custom_graph:*` via `energyCards.render`; unchanged build path |

### 8.3 Build and suite results

```
npm run build                          → Compiled successfully
npm test -- --testPathPattern=shared/dashboard
  → 50 suites passed, 529 tests passed (+6 new parity tests vs 8A baseline)
```

---

## 9. Rollback Plan

### 9.1 Fast rollback (revert 9B only)

1. Delete `src/shared/dashboard/container/layout/` directory
2. Revert `src/shared/dashboard/container/index.js` layout exports
3. Restore energy-tab JSX in:
   - `src/variants/basic/screens/dashboard/Dashboard.jsx` — `energyDashboardRows.map` + `renderEnergyDraggableSlot`
   - `src/variants/advanced/screens/dashboard/Dashboard.jsx` — 3 `Grid` blocks + `renderLightingPowerDensity`
   - `src/variants/customized/screens/dashboard/Dashboard.jsx` — inline `orderedEnergyCards.map` grid
4. Delete `docs/PHASE_6_2C_9B_ENERGY_LAYOUT_RENDERER_REPORT.md`
5. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`

### 9.2 Partial rollback

- Keep shared module but unwired: variants can import adapters for metadata without using `EnergyLayoutRenderer`
- `DashboardWidgetRenderer` (8A) is independent — no rollback coupling

### 9.3 Risk assessment

| Risk | Mitigation |
|------|------------|
| Metric shell styling drift | All chrome still defined in variant `getShellProps`; parity tests mock shells |
| DnD regression | DnD not moved; `wrapSlot` / `wrapCard` callbacks preserve exact wrappers |
| Custom graph breakage | customized cards built before renderer; parity test covers `custom_graph:*` |
| `consumption_saving` regression | `renderCustomSlot` keeps full `ConsumptionSavingsCombinedChart` tree in basic runtime |

---

## 10. Next Steps (out of scope for 9B)

Per 9A recommended path:

1. **Phase 6.2C.9C** — Tab section shell extraction (overview / energy / charts header chrome)
2. **Phase 10** — `DashboardContainer` orchestration

---

## 11. Stop Boundary Compliance

| Constraint | Compliant |
|------------|:---------:|
| No `DashboardContainer` | ✓ |
| No `DashboardLayoutRenderer` | ✓ |
| No DnD logic move | ✓ |
| No `LongPressDraggable` / `SortableDashboardItem` move | ✓ |
| No custom graph code move | ✓ |
| No `SpaceUtilization` touch | ✓ |
| No widget implementation changes | ✓ |
| Energy layout placement only | ✓ |
