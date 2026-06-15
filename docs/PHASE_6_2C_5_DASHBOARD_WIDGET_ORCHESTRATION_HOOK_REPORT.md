# Phase 6.2C.5 — Dashboard Widget Orchestration Hook

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract duplicated widget orchestration from variant `Dashboard.jsx` into `useDashboardWidgets` and pure resolvers/builders  
**Stop boundary respected:** No `DashboardContainer`, filters, area-tree, layout, DnD, custom graph slots, widget moves, or Redux slice changes

---

## Executive Summary

Widget visibility/title resolution, loading guards, memoized energy payloads, color palettes, energy-tab chart loading orchestration, and prop assembly patterns previously duplicated across three variant dashboards are now centralized under `src/shared/dashboard/container/hooks/`. Variants retain placement, card wrappers, drag/drop, layout, and custom graph rendering.

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test -- --testPathPattern=shared/dashboard` | PASS — 38 suites, 402 tests |
| Parity tests | PASS — `dashboardWidgetsParity.test.js` (22 cases) |

---

## Overlap Analysis

| Legacy block (per variant) | Overlap | Extracted to |
|----------------------------|---------|--------------|
| `chartLoading` + `allEnergyChartsReady` state | **Identical shape** (~18 LOC × 3) | `useDashboardWidgets` + `createInitialChartLoadingState` |
| Energy tab fetch batch (unified + 3 donut APIs + completion gate) | **~84 LOC × 3** | `planEnergyTabApiCalls`, `startEnergyTabLoading`, `completeEnergyTabLoading` |
| `consumptionIsLoading` / `savingsIsLoading` `useMemo` | **Identical** (~10 LOC × 3) | `resolveConsumptionIsLoading`, `resolveSavingsIsLoading` |
| Memoized energy payloads + color palettes | **Identical pattern** (~25 LOC × 3) | `stabilizeDashboardPayload` (6.2C.2) + `resolveEnergyColorPalettes` |
| `getWidgetTitle` (+ customized alias helper) | **Same contract, variant deltas** | `resolveDashboardWidgetTitle`, `resolveDashboardWidgetTitleWithAliases`, `resolveEnergyWidgetTitles` |
| `shouldShowEnergyWidget` | **customized only** (~37 LOC) | `resolveCustomizedEnergyWidgetVisible` |
| Embedded combined/savings loading guards | **basic pattern** | `resolveCombinedConsumptionSavingIsLoading`, `resolveEmbeddedSavingsByStrategyLoading` |
| Widget prop spread patterns (unified energy, donuts, LPD, peak/min) | **Repeated field sets** | `buildUnifiedEnergyWidgetProps`, `buildSavingsByStrategyWidgetProps`, etc. |

**Reused (not reimplemented):**

- `shared/dashboard/container/helpers/widgetMemoStabilizers` (`stabilizeDashboardPayload`)
- `shared/dashboard/utils/dashboardWidgetVisibilityCore` (canonical keys, `isWidgetVisibleInMap`)
- `shared/dashboard/container/helpers/dashboardDateNavigation` (`resolveEnergyCustomNeedsDates`)

**Variant-owned (unchanged):**

- DnD slot order + `deriveEnergyChartOrderFromWidgetTitles` (basic localStorage)
- Card shells, export dropdown JSX, `renderEnergyDraggableSlot`, customized grid layout
- `useDashboardWidgetVisibility` (basic) — planned for 6.2C.6
- Space-utilization chart loading patches (including customized from-logs keys)

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/container/hooks/useDashboardWidgets.js` | Widget orchestration hook |
| `src/shared/dashboard/container/hooks/widgetVisibilityResolvers.js` | Title + visibility pure resolvers |
| `src/shared/dashboard/container/hooks/widgetPropBuilders.js` | Loading guards, chart-loading patches, prop builders |
| `src/shared/dashboard/container/hooks/dashboardWidgetsParity.test.js` | Parity tests |

**Extended:**

| File | Change |
|------|--------|
| `src/shared/dashboard/container/hooks/index.js` | Re-exports hook, resolvers, builders |

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | `useDashboardWidgets()`; removed inline chart-loading state, energy fetch batch, loading memos, title helpers |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same; theme-aware colors via hook options |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same; `resolveCustomizedEnergyWidgetVisible` for `shouldShowEnergyWidget`; alias titles via hook |

---

## LOC Reduction

Non-blank line counts:

| Area | Before (6.2C.4) | After (6.2C.5) | Delta |
|------|-----------------|----------------|-------|
| basic `Dashboard.jsx` | 4,369 | 4,313 | **−56** |
| advanced `Dashboard.jsx` | 3,613 | 3,557 | **−56** |
| customized `Dashboard.jsx` | 5,615 | 5,528 | **−87** |
| **Dashboard total** | **13,597** | **13,398** | **−199** |
| shared hooks (production) | — | 682 | **+682** |
| shared hooks (tests) | — | 299 | +299 |
| **Net (incl. tests)** | — | — | **+782** |

Production-only net: **+483** (shared extraction + parity tests; dashboard monoliths −199).

Cumulative dashboard total vs 6.2C.1 audit baseline (15,469): **−2,071** (−13.4%).

---

## Test Results

```
npm run build                          → PASS (Compiled successfully)
npm test -- --testPathPattern=shared/dashboard --watchAll=false
                                       → 38 passed, 402 passed
```

**New parity coverage (`dashboardWidgetsParity.test.js`):**

- Visibility resolution (basic/advanced/customized, aliases, custom graphs)
- Title resolution (exact key, customized `dropdown_name`, alias walk)
- Widget ordering helpers (alias key stability)
- Loading guards (consumption, savings, combined, embedded savings-by-strategy)
- Energy tab chart-loading patches + API call plan
- Prop assembly (`buildUnifiedEnergyWidgetProps`, color palettes)

---

## Rollback Plan

1. Restore inline widget orchestration in all three `Dashboard.jsx` files (chart-loading state, energy fetch batch, loading memos, title helpers, customized `shouldShowEnergyWidget`).
2. Remove imports of `useDashboardWidgets` / `resolveCustomizedEnergyWidgetVisible` from variant dashboards.
3. Delete:
   - `src/shared/dashboard/container/hooks/useDashboardWidgets.js`
   - `src/shared/dashboard/container/hooks/widgetVisibilityResolvers.js`
   - `src/shared/dashboard/container/hooks/widgetPropBuilders.js`
   - `src/shared/dashboard/container/hooks/dashboardWidgetsParity.test.js`
4. Revert `src/shared/dashboard/container/hooks/index.js` exports to pre-6.2C.5 state.
5. Verify: `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## Hook Contract

`useDashboardWidgets({ variant, widgetList, energyConsumption, energySavings, … })` returns:

- **State:** `chartLoading`, `setChartLoading`, `allEnergyChartsReady`, `setAllEnergyChartsReady`
- **Titles:** `energyWidgetTitles`, `getWidgetTitle`, `getWidgetTitleWithAliases` (customized)
- **Data:** `memoizedEnergyConsumption`, `memoizedEnergySavings`, `consumptionColors`, `savingsColors`
- **Loading guards:** `consumptionIsLoading`, `savingsIsLoading`, `combinedConsumptionSavingIsLoading`, `embeddedSavingsByStrategyLoading`
- **Fetch helpers:** `startEnergyTabLoading`, `completeEnergyTabLoading`, `planEnergyTabApiCalls`
- **Dates:** `energyCustomNeedsDates` (via `resolveEnergyCustomNeedsDates`)

Variants pass `dateActions` consumers (`setChartLoading`) to `useDashboardDates` unchanged.

---

## Next Phase Boundary

**6.2C.6** (if planned): basic `useDashboardWidgetVisibility` → shared visibility hook. Do not create `DashboardContainer`.
