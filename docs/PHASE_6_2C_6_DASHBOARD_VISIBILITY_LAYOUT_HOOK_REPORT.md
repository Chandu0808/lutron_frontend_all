# Phase 6.2C.6 — Dashboard Visibility & Layout Hook

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract duplicated visibility/layout orchestration from variant `Dashboard.jsx` into `useDashboardVisibility` and pure layout resolvers  
**Stop boundary respected:** No `DashboardContainer`, AreaTree, DnD/LongPressDraggable, widget JSX, Redux/API, routes, or `SpaceUtilization` changes

---

## Executive Summary

Visibility gating, energy slot ordering, row placement, customized card order/span, and localStorage sync previously duplicated across variant dashboards are centralized under `src/shared/dashboard/container/`. Variants retain drag handlers, card chrome, and widget rendering.

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test -- --testPathPattern=shared/dashboard` | PASS — 39 suites, 424 tests |
| Parity tests | PASS — `dashboardVisibilityParity.test.js` (22 cases) |

---

## Overlap Analysis

| Legacy block | Variants | Extracted to |
|--------------|----------|--------------|
| `applyEnergy*ChartOrder`, `buildEnergyDashboardRows` | **basic** (~180 LOC module-level) | `dashboardLayoutResolvers.js` |
| `energyVisibleSlotOrder`, `showEnergyStandaloneDurationFilter`, chart-order `useEffect`s | **basic** (~150 LOC) | `useDashboardVisibility` (basic branch) |
| `parseWidgetVisibilityFromLocalStorage` + sync listeners | **customized** (~70 LOC) | `useDashboardVisibility` (customized branch) |
| `shouldShowEnergyWidget` | **customized** (already in 6.2C.5 resolvers) | Composed in hook |
| `readDashboardOrder/Span`, merge/sort visible cards | **customized** (~60 LOC) | `dashboardLayoutResolvers.js` + hook |
| `getEnergyCardCol`, grid column template | **customized** (~15 LOC) | `resolveEnergyCardColumnSpan`, `resolveEnergyGridColumnTemplate` |
| All widgets always visible | **advanced** | `useDashboardVisibility` (advanced branch) |

**Not extracted (variant-owned):**

- `LongPressDraggable`, `onReorderEnergySlots`, `liftedFullOrderFromVisibleReorder`
- Customized `DndContext` / `SortableDashboardItem` / `toggleEnergyFullscreen`
- `useDashboardWidgetVisibility` (basic) — still sourced from `variants/basic/utils`; hook composes it
- `SpaceUtilization.jsx` layout/visibility (6.2C.7+ boundary)
- Advanced fixed `Grid` layout

**Reused:**

- `shared/dashboard/utils/dashboardWidgetVisibilityCore` (`isWidgetVisibleInMap`)
- `widgetVisibilityResolvers.js` (`resolveCustomizedEnergyWidgetVisible`, `resolveEnergyWidgetVisible`)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/container/dashboardLayoutResolvers.js` | Pure visibility/order/placement resolvers |
| `src/shared/dashboard/container/visibilityMemoCompare.js` | Stable visibility-order signature helpers |
| `src/shared/dashboard/container/hooks/useDashboardVisibility.js` | Variant-aware visibility/layout hook |
| `src/shared/dashboard/container/dashboardVisibilityParity.test.js` | Parity tests |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/dashboard/container/hooks/index.js` | Export `useDashboardVisibility` |
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Hook for energy visibility/order/rows; removed ~180 LOC module helpers |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Wired `useDashboardVisibility({ variant: 'advanced' })` |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Hook for grouped visibility, card order/span, ordered layout resolution |

---

## LOC Before/After

Non-blank line counts (vs 6.2C.5):

| Area | Before (6.2C.5) | After (6.2C.6) | Delta |
|------|-----------------|----------------|-------|
| basic `Dashboard.jsx` | 4,313 | 4,047 | **−266** |
| advanced `Dashboard.jsx` | 3,557 | 3,562 | +5 |
| customized `Dashboard.jsx` | 5,528 | 5,427 | **−101** |
| **Dashboard total** | **13,398** | **13,036** | **−362** |
| shared container (production) | — | 617 | **+617** |
| shared container (tests) | — | 207 | +207 |
| **Net (incl. tests)** | — | — | **+462** |

Production-only net: **+255** (shared extraction + tests; dashboard −362).

Cumulative dashboard total vs 6.2C.1 audit (15,469): **−2,433** (−15.7%).

---

## Test Results

```
npm run build                          → PASS (Compiled successfully)
npm test -- --testPathPattern=shared/dashboard --watchAll=false
                                       → 39 passed, 424 passed
```

**New parity coverage (`dashboardVisibilityParity.test.js`):**

- Widget visibility (visible slot order, all-visible check, standalone duration gate)
- Hidden widget calculations (standalone/combined order reflow, hidden slot ids)
- Widget order (normalize, derive from titles, merge, sort)
- Placement (dashboard rows, grid columns, card span, ordered cards)
- Customized localStorage order/span helpers
- Visibility memo signature compare

---

## Rollback Plan

1. Restore inline visibility/layout logic in all three `Dashboard.jsx` files.
2. Remove `useDashboardVisibility` imports from variant dashboards.
3. Delete:
   - `src/shared/dashboard/container/dashboardLayoutResolvers.js`
   - `src/shared/dashboard/container/visibilityMemoCompare.js`
   - `src/shared/dashboard/container/hooks/useDashboardVisibility.js`
   - `src/shared/dashboard/container/dashboardVisibilityParity.test.js`
4. Revert `src/shared/dashboard/container/hooks/index.js` export.
5. Verify: `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## Hook Contract

`useDashboardVisibility({ variant, ... })`:

**basic** — requires `visibilityMap`, `isWidgetVisible`, `dispatch`, `saveDashboardChartOrder`, chart-order Redux selectors, `widgetList`, `energyReflowLocked`, `dragTranslateKeys`. Returns `energyVisibleSlotOrder`, `energyDashboardRows`, `showEnergyStandaloneDurationFilter`, `setEnergyChartOrder`, etc.

**customized** — requires `locationPathname`, `getEffectiveBuiltinDashboardPage`, `dispatch`, `fetchRenameWidgets`, `fetchCustomGraphs`. Returns `shouldShowEnergyWidget`, `resolveEnergyCardLayout`, `writeEnergyCardOrder/Span`, `getEnergyCardCol`, etc.

**advanced** — optional `showOverviewTab`. Returns always-visible `isWidgetVisible` / `shouldRenderWidget`.

---

## Next Phase Boundary

**6.2C.7** — AreaTree extraction. Do not create `DashboardContainer`.
