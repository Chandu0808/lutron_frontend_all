# Phase 6.2C.8A — DashboardWidgetRenderer Extraction Report

**Date:** 2026-06-10  
**Scope:** Widget routing/render orchestration only (no DashboardContainer, layout, DnD, AreaTree, exports, dates, visibility hooks, custom graphs, SpaceUtilization, Redux changes).

---

## 1. Duplication Audit

### 1.1 Widget render patterns (pre-extraction)

| Variant | Pattern | Location |
|---------|---------|----------|
| **basic** | `renderEnergyDraggableSlot(slotId)` — `switch(slotId)` inside `LongPressDraggable` | ~2681–2937 |
| **advanced** | Inline JSX in MUI `Grid` layout (no switch) | ~3026–3263 |
| **customized** | `energyCards[]` with `{ key, render }` + `buildEnergyBuiltinRender` wrapper | ~4841–5016 |

Overview tab uses variant-owned `<DashboardOverview />` (not Dashboard.jsx switch chains).

### 1.2 Duplication matrix

| Widget / concern | basic | advanced | customized | Overlap |
|------------------|:-----:|:--------:|:----------:|:-------:|
| `UnifiedEnergyWidget` consumption/savings | ✓ switch | ✓ inline | ✓ energyCards | ~80% props |
| `SavingsByStrategyWidget` | ✓ | ✓ | ✓ | ~90% |
| `TotalConsumptionByGroupWidget` | ✓ | ✓ | ✓ (+`areaIdToDisplayName`) | ~85% |
| `LightPowerDensityWidget` | ✓ + metric chrome | ✓ + metric chrome | ✓ + `BUILTIN_COMPACT_PANEL` | ~60% (chrome differs) |
| `PeakMinConsumptionWidget` | ✓ + Box shell | ✓ + div shell | ✓ + compact panel | ~70% |
| Title via `getWidgetTitle` / `energyWidgetTitles` | ✓ | ✓ | ✓ | shared hook |
| Visibility gating | slot-order hook | always show | `shouldShowEnergyWidget` | variant-specific |

### 1.3 Classification

**Exact duplicates (now centralized):**
- Widget key → component routing for 6 energy keys
- Prop assembly via `widgetPropBuilders` (`buildUnifiedEnergyWidgetProps`, etc.)
- Title resolution delegation to `widgetVisibilityResolvers`

**Near duplicates (variant overrides remain in Dashboard):**
- `chartSurface` / `advancedSurface` / `customizedSurface` per widget
- Export control JSX per widget
- Metric panel chrome for LPD / peak-min (header, unit selector, card shell)
- `energyLightFullCardHeightPx`, `emptyStateExtras`, `blankChartPreview` (basic only)

**Customized-only (unchanged):**
- `buildEnergyBuiltinRender(key, fallback, () => widget)` DnD/span wrapper
- `energyCustomCards` from `customGraphs` (`custom_graph:*`)
- `areaIdToDisplayName` on TotalConsumptionByGroup (passed via context)

**Basic-only (unchanged, out of scope):**
- `consumption_saving` case — `ConsumptionSavingsCombinedChart` + embedded `SavingsByStrategyWidget`

**Out of scope (not in render map):**
- `consumption_saving`, `shades`, `custom_graph:*`, utilization widgets, SpaceUtilization

---

## 2. Files Created

```
src/shared/dashboard/container/
├── DashboardWidgetRenderer.jsx      (71 LOC)
├── widgetRenderMap.js               (117 LOC)
├── widgetSlotResolvers.js           (297 LOC)
├── widgetRendererMemoCompare.js   (8 LOC)
├── index.js                         (19 LOC — updated exports)
├── dashboardWidgetRendererParity.test.jsx (254 LOC)
└── widgetSlotResolvers.test.js      (237 LOC)
```

**Production LOC added:** ~512  
**Test LOC added:** ~491

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replaced 6 energy switch bodies + `renderLightingPowerDensity` with `<DashboardWidgetRenderer />`; added `energyWidgetRenderContext` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Replaced 6 inline Grid widget blocks + `renderLightingPowerDensity` with renderer |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Replaced 6 `energyCards` widget bodies + `renderLightingPowerDensity` with renderer |
| `src/shared/dashboard/container/index.js` | Barrel exports for renderer module |

**Unchanged (stop boundary respected):**
- Layout placement, grid structure, DnD wrappers, `LongPressDraggable`, card shells, export controls, custom graph rendering, `DashboardOverview`, `SpaceUtilization`, visibility hooks, date/export orchestration.

---

## 4. Widget Routing Matrix

| Widget key | Renderer type | Component | basic | advanced | customized |
|------------|---------------|-----------|:-----:|:--------:|:----------:|
| `energy` | `overview_tile` | `OverviewMetricTile` | map | map | map |
| `alerts` | `overview_alerts` | *(variant-owned — null output)* | map | map | map |
| `schedules` | `overview_tile` | `OverviewMetricTile` | map | map | map |
| `quick_controls` | `overview_tile` | `OverviewMetricTile` | map | map | map |
| `floors` | `overview_tile` | `OverviewMetricTile` | map | map | map |
| `space_utilization` | `overview_tile` | `OverviewMetricTile` | map | map | map |
| `consumption` | `unified_energy` | `UnifiedEnergyWidget` | wired | wired | wired |
| `savings` | `unified_energy` | `UnifiedEnergyWidget` | wired | wired | wired |
| `savings_by_strategy` | `savings_by_strategy` | `SavingsByStrategyWidget` | wired | wired | wired |
| `total_consumption_by_group` | `total_consumption_by_group` | `TotalConsumptionByGroupWidget` | wired | wired | wired |
| `light_power_density` | `light_power_density` | `LightPowerDensityWidget` | wired* | wired* | wired* |
| `peak_and_minimum_consumption` | `peak_min_consumption` | `PeakMinConsumptionWidget` | wired* | wired* | wired* |

\* Inner widget only; metric panel chrome / unit selector remain variant-owned.

**Not in map:** `consumption_saving`, `shades`, `custom_graph:*`, all space/utilization keys.

---

## 5. LOC Before / After

### Dashboard.jsx (variant monoliths)

| Variant | Before | After | Delta |
|---------|--------|-------|-------|
| basic | 3,875 | 3,906 | +31 |
| advanced | 3,378 | 3,408 | +30 |
| customized | 5,208 | 5,239 | +31 |
| **Total** | **12,461** | **12,553** | **+92** |

### Duplication removed vs. context added

| Removed from dashboards | ~280 LOC (inline widget JSX + prop spreads) |
| Added to dashboards | ~372 LOC (`energyWidgetRenderContext` overrides + renderer calls) |
| Centralized in shared module | ~512 LOC production |

**Net codebase:** ~+400 LOC overall. Dashboard monoliths are slightly larger because variant-specific `overrides` (surfaces, export controls, basic-only empty-state extras) must remain in each variant. The **routing switch/case duplication** (~280 LOC of repeated widget JSX) is eliminated and replaced by single-line `<DashboardWidgetRenderer />` calls.

> Note: The original 1,000–1,500 LOC dashboard reduction target assumed chrome/surface assembly would also move. Per stop boundary, chrome and overrides stay variant-owned, so net dashboard LOC reduction is not achieved in this phase.

---

## 6. Architecture

```
Dashboard.jsx (variant)
  ├── energyWidgetRenderContext (useMemo + buildEnergyWidgetRenderContext)
  ├── LongPressDraggable / Grid / buildEnergyBuiltinRender  ← unchanged shells
  └── <DashboardWidgetRenderer widgetKey context variant />
           │
           ├── resolveWidgetRenderer(widgetKey)     → widgetRenderMap
           ├── resolveWidgetVisibility(widgetKey)   → widgetVisibilityResolvers
           ├── resolveWidgetProps(widgetKey, ctx)   → widgetPropBuilders
           └── render shared widget component
```

**Pure resolvers (`widgetSlotResolvers.js`):**
- `resolveWidgetRenderer()` — map lookup
- `resolveWidgetVisibility()` — delegates to `resolveEnergyWidgetVisible`
- `resolveWidgetProps()` — delegates to `build*WidgetProps` helpers
- `resolveWidgetTitle()` — delegates to `resolveDashboardWidgetTitle*`
- `buildEnergyWidgetRenderContext()` — assembles context bag (no React)

---

## 7. Tests Added

### `widgetSlotResolvers.test.js`
- Renderer lookup for all energy + overview keys
- Unsupported key handling (`consumption_saving`, `custom_graph:*`, `utilization`)
- Title lookup (hook titles, alias keys, defaults)
- Visibility lookup (basic map, advanced always-true, explicit `visible=false`)
- Prop assembly for all 6 energy keys + overview tile
- `buildEnergyWidgetRenderContext` assembly

### `dashboardWidgetRendererParity.test.jsx`
- Every supported energy widget key (6)
- Every supported overview tile key (5)
- Unsupported widget key → null
- `visible={false}` → null
- `visible={true}` → renders
- Title resolution parity with `resolveWidgetProps`
- Prop pass-through parity (consumption mode/title)
- Pre-resolved `widgetProps` override path
- `alerts` mapped but returns null (variant-owned)

---

## 8. Build & Test Results

```text
npm run build                          → PASS (Compiled successfully)
npm test -- --testPathPattern=shared/dashboard → PASS
  49 suites, 523 tests (34 new tests in this phase)
```

---

## 9. Parity Verification

| Check | Status |
|-------|--------|
| Build compiles | ✓ |
| All existing `shared/dashboard` tests pass | ✓ |
| New renderer/resolver tests pass | ✓ |
| `consumption_saving` basic path untouched | ✓ |
| Custom graph cards untouched | ✓ |
| LPD/peak metric chrome untouched | ✓ |
| DnD / `LongPressDraggable` wrappers untouched | ✓ |
| `DashboardOverview` untouched | ✓ |
| No Redux / visibility hook moves | ✓ |

---

## 10. Rollback Plan

1. Revert commits touching:
   - `src/shared/dashboard/container/DashboardWidgetRenderer.jsx`
   - `src/shared/dashboard/container/widgetRenderMap.js`
   - `src/shared/dashboard/container/widgetSlotResolvers.js`
   - `src/shared/dashboard/container/widgetRendererMemoCompare.js`
   - `src/shared/dashboard/container/index.js`
   - `src/shared/dashboard/container/*.test.*`
   - All three `Dashboard.jsx` variants
2. Restore direct widget imports (`UnifiedEnergyWidget`, `SavingsByStrategyWidget`, etc.) in each variant.
3. Restore inline switch/Grid/energyCards widget JSX from git history.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard` to confirm baseline.

**Single-file rollback alternative:** Keep shared module but revert only the three `Dashboard.jsx` wiring changes; dashboards regain inline widgets while shared code becomes unused (safe, no runtime impact until re-wired).

---

## 11. Next Phase Candidates (out of scope for 8A)

- Move variant-specific `overrides` builders into shared config factories per variant (would recover dashboard LOC)
- Wire `DashboardOverview` tiles through `DashboardWidgetRenderer` (overview tab)
- `DashboardContainer` / `DashboardLayoutRenderer` (explicitly deferred)
