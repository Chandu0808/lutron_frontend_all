# Phase 6.2C.3 — Dashboard Export Orchestration Hook

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract duplicated export/email orchestration from variant `Dashboard.jsx` into shared hooks  
**Stop boundary respected:** No `DashboardContainer`, filters, area-tree logic, UI changes, API/Redux changes, or `SpaceUtilization` modifications

---

## Executive Summary

Energy dashboard export orchestration (download/email dispatch, loading guards, snackbar outcomes, menu state) is now centralized in `src/shared/dashboard/container/hooks/`. Variant dashboards retain export button/dropdown rendering and pass variant-specific key profiles into `useDashboardExports`.

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test -- --testPathPattern=shared/dashboard` | PASS — 36 suites, 369 tests |
| Parity tests | PASS — `dashboardExportParity.test.js` (13 cases) |

---

## Overlap Analysis

| Legacy block (per variant) | Overlap | Extracted to |
|----------------------------|---------|--------------|
| `handleConsumptionEmail` / `handleConsumptionDownload` | **Identical** (~75 LOC each variant) | `useDashboardExports` + `runEnergyEmailExport` / `runEnergyDownloadExport` |
| `handleSavingsEmail` / `handleSavingsDownload` | **Identical** | same |
| `handleConsumptionByGroupEmail` / `handleConsumptionByGroupDownload` | **Identical** (group uses `calculateDateParameters`) | `buildGroupEnergyExportApiParams` + shared handlers |
| `handleEnergyCustomGraphExport` | **Customized only** (~110 LOC) | `runCustomGraphEnergyExport` + `resolveEnergyExportByApiPath` |
| `showExportDropdown` / `exportLoading` / `exportDropdownRefs` | **Same state shape** all variants | `useExportMenuState` (inside hook) |
| Export outside-click `useEffect` | Wired in 6.2C.2 helpers | Absorbed into `useDashboardExports` via `outsideClickProfile` |
| Inline `result.type.endsWith('/fulfilled')` + payload error checks | **Triplicated** | `chartExportResults` via `resolveEmailExportOutcome` / `resolveDownloadExportOutcome` |

**Not extracted (variant-owned per spec):** `consumptionExportControl`, `savingsExportControl`, `totalConsumptionByGroupExportControl` useMemos; `ChartExportButton` / legacy dropdown JSX; Peak & Min dead export UI in advanced.

**Not touched:** `SpaceUtilization` export handlers, Redux slices, APIs, widget export buttons.

---

## Prop Matrix (`useDashboardExports`)

| Prop | basic | advanced | customized | Notes |
|------|-------|----------|------------|-------|
| `dispatch` | ✓ | ✓ | ✓ | Redux dispatch |
| `showSnackbar` | ✓ | ✓ | ✓ | Variant-local MUI snackbar helper |
| `userProfile` | ✓ | ✓ | ✓ | Email guard |
| `selection.selectedAreas` | ✓ | ✓ | ✓ | |
| `selection.selectedFloorIds` | ✓ | ✓ | ✓ | |
| `selection.selectedDuration` | ✓ | ✓ | ✓ | |
| `selection.customStartDate` | ✓ | ✓ | ✓ | |
| `selection.customEndDate` | ✓ | ✓ | ✓ | |
| `selection.isNavigating` | ✓ | ✓ | ✓ | |
| `calculateDateParameters` | ✓ | ✓ | ✓ | Group exports only |
| `thunks` | 14 energy/space thunks | same | same | Passed from variant Redux imports |
| `keys.consumption` | `DEFAULT_CONSUMPTION_EXPORT_KEYS` | same | same | `Consumption_*` loading keys |
| `keys.savings` | `DEFAULT_SAVINGS_EXPORT_KEYS` | same | same | `Savings_*` loading keys |
| `keys.totalConsumptionByGroup` | `createBasicGroupExportKeys(TOTAL_CONSUMPTION_BY_GROUP_EXPORT_KEY)` | `createAdvancedGroupExportKeys()` | same as advanced | Preserves legacy menu/loading key quirks |
| `outsideClickProfile` | `EXPORT_MENU_OUTSIDE_CLICK_PROFILES.basic` | `createAdvancedExportOutsideClickProfile(CHART_EXPORT_DROPDOWN_CLASS)` | `customizedLegacy` | From 6.2C.2 helpers |
| `enableCustomGraphExport` | `false` | `false` | `true` | Enables `handleEnergyCustomGraphExport` |

### Hook return (consumed by variant export UI)

| Return key | Purpose |
|------------|---------|
| `exportDropdownRefs` | Dropdown container refs |
| `showExportDropdown` / `setShowExportDropdown` | Per-menu open state |
| `exportLoading` | Per-action loading flags |
| `handleConsumptionEmail` / `handleConsumptionDownload` | Consumption orchestration |
| `handleSavingsEmail` / `handleSavingsDownload` | Savings orchestration |
| `handleConsumptionByGroupEmail` / `handleConsumptionByGroupDownload` | Group chart orchestration |
| `handleEnergyCustomGraphExport` | Customized custom-graph export only |
| `handleExport` | Legacy no-op stub (parity) |

---

## Files Created

```
src/shared/dashboard/container/hooks/
├── exportActionResolvers.js   (API param builders, dispatch runners, outcome resolvers)
├── exportMenuState.js         (menu/loading state + variant key factories)
├── useDashboardExports.js     (orchestration hook)
├── index.js                   (barrel)
└── dashboardExportParity.test.js
```

**Production LOC:** 490  
**Test LOC:** 268

---

## Files Modified

| File | Changes |
|------|---------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replaced ~245 LOC handlers/state/effect with `useDashboardExports` call (~50 LOC) |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same; advanced outside-click profile |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same + `enableCustomGraphExport` |

Removed dead imports: `buildChartApiParams`, `resolveEnergyExportByApiPath` from variant dashboards (now internal to hook layer).

---

## LOC Reduction

Non-blank line counts (`Measure-Object -Line`).

| Variant | After 6.2C.2 | After 6.2C.3 | Δ (6.2C.3) |
|---------|-------------:|-------------:|-----------:|
| basic | 4,591 | 4,420 | **−171** |
| advanced | 3,834 | 3,663 | **−171** |
| customized | 5,936 | 5,665 | **−271** |
| **Dashboard subtotal** | **14,361** | **13,748** | **−613** |
| Shared hooks (prod) | 0 | 490 | +490 |
| **Net (6.2C.3)** | | | **−123** |

Cumulative vs Phase 6.2C.1 audit baseline (15,469 dashboard LOC): **−655** net after helpers (6.2C.2, +576) + hooks (6.2C.3, +490).

---

## Parity Test Coverage

`dashboardExportParity.test.js` verifies:

- Standard/group API param builders match legacy `buildChartApiParams` usage
- Built-in widget action resolution via `createEnergyExportActionMap`
- Email/download outcome resolution vs legacy `endsWith('/fulfilled')` + payload error checks
- `runEnergyEmailExport` success + rejected error snackbars
- `runEnergyDownloadExport` success path
- `runCustomGraphEnergyExport` api_path resolution + unsupported endpoint guard
- Export loading key factories (basic vs advanced group key legacy mismatch preserved)

---

## Test Results

```
npm run build
→ Compiled successfully

npm test -- --testPathPattern=shared/dashboard --watchAll=false
→ Test Suites: 36 passed, 36 total
→ Tests:       369 passed, 369 total
```

---

## Rollback Plan

1. Restore inline export handlers, `useState` for `showExportDropdown`/`exportLoading`, and outside-click `useEffect` in all three `Dashboard.jsx` files.
2. Re-add `buildChartApiParams` imports to variants.
3. Delete `src/shared/dashboard/container/hooks/` directory.
4. Re-run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## Next Phase Boundary (not implemented)

- `DashboardContainer` — full orchestration shell
- Area-tree / filter extraction
- Export control useMemo UI extraction (6.2C.6 / M5)
- `useSpaceExports` for `SpaceUtilization` (separate phase)
