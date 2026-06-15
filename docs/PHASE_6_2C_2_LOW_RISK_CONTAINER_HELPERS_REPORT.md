# Phase 6.2C.2 — Low-Risk Dashboard Container Helpers

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract LOW-risk helpers identified in Phase 6.2C.1 only  
**Stop boundary respected:** No `DashboardContainer`, `useDashboardDates`, or `useDashboardExports`

---

## Executive Summary

Low-risk, pure helper modules were extracted from the three variant `Dashboard.jsx` monoliths into `src/shared/dashboard/container/helpers/`. Variant dashboards now call shared resolvers for date navigation outcomes, period labels, alert-type toggles, export click-outside detection, and widget memo/transform stabilizers.

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test -- --testPathPattern=shared/dashboard` | PASS — 35 suites, 356 tests |
| Parity tests | PASS — `containerHelpersParity.test.js` (24 cases) |

---

## Overlap Analysis (Phase 6.2C.1 LOW-risk items)

| Legacy block | Variants | Overlap | Extracted module |
|--------------|----------|---------|------------------|
| `handlePrevious` / `handleNext` | basic, advanced, customized | **Byte-for-byte** logic (~192 + ~197 LOC each) | `dashboardDateNavigation.js` — pure resolvers + `DASHBOARD_NAVIGATION_CHART_LOADING` |
| `getCurrentPeriodText` | all 3 | **Identical** (~60 LOC each) | `dashboardPeriodText.js` |
| `handleTypeToggle` | all 3 | **Identical** (toggle + filterKey bump + dropdown refresh) | `alertTypeFilters.js` |
| Export click-outside `useEffect` | all 3 | **Same pattern**, 3 detection profiles | `exportMenuUtils.js` |
| `memoizedEnergyConsumption` / `memoizedEnergySavings` | all 3 | **Identical** JSON.stringify ref pattern | `widgetMemoStabilizers.js` |
| `transformDataForCharts` useCallback | basic/advanced identical; customized extended signature | **Shared builder** preserves option shapes | `widgetMemoStabilizers.js` |

**Not extracted (per stop boundary):** area-tree filters, `fetchDataForActiveTab`, export thunk handlers, layout/visibility, custom graphs, `SpaceUtilization`.

---

## Files Created

```
src/shared/dashboard/container/helpers/
├── dashboardDateNavigation.js   (pure prev/next resolvers, chart-loading flags)
├── dashboardPeriodText.js       (getDashboardPeriodText)
├── alertTypeFilters.js          (toggle, normalize, dropdown refresh)
├── exportMenuUtils.js           (outside-click profiles + menu state helpers)
├── widgetMemoStabilizers.js     (payload stabilizer + transform builders)
├── index.js                     (barrel export)
└── containerHelpersParity.test.js
```

**Production LOC added:** 576  
**Test LOC added:** 442

---

## Files Modified

| File | Changes |
|------|---------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Import helpers; thin `handlePrevious`/`handleNext`; delegate period text, alert toggle, export outside-click, memo stabilizers, standard transform builder |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same as basic; advanced export profile via `createAdvancedExportOutsideClickProfile(CHART_EXPORT_DROPDOWN_CLASS)` |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same as basic; customized transform builder + `customizedLegacy` export profile |

---

## LOC Reduction

Counts use non-blank lines (`Measure-Object -Line`), matching Phase 6.2C.1 audit methodology.

| Variant | Before (6.2C.1) | After (6.2C.2) | Δ |
|---------|----------------:|---------------:|--:|
| basic | 4,959 | 4,591 | **−368** |
| advanced | 4,203 | 3,834 | **−369** |
| customized | 6,307 | 5,936 | **−371** |
| **Dashboard subtotal** | **15,469** | **14,361** | **−1,108** |
| Shared helpers (prod) | 0 | 576 | +576 |
| **Net duplicate elimination** | — | — | **−532** |

Variant dashboards retain thin dispatch wrappers (~50 LOC navigation each) so Redux/setState side effects stay in the component layer — intentionally **not** promoted to hooks.

---

## Parity Test Coverage

`containerHelpersParity.test.js` proves shared outputs match legacy inline implementations for:

- `getDashboardPeriodText` — 8 duration/custom fixtures vs inlined legacy
- `resolvePreviousPeriodNavigation` — day/month/custom shift semantics
- `resolveNextPeriodNavigation` — future guard, `T00:00:00`/`T23:59:59` suffixes, custom ISO forward navigation, loading flag when blocked
- Alert-type toggle/normalize/filterKey bump
- Export menu state + outside-click profiles (basic + advanced)
- `stabilizeDashboardPayload` reference preservation
- Standard/customized transform option shapes passed to `sharedTransformDataForCharts`
- `DASHBOARD_NAVIGATION_CHART_LOADING` excludes `instantOccupancyCount` (legacy parity)

---

## Test Results

```
npm run build
→ Compiled successfully

npm test -- --testPathPattern=shared/dashboard --watchAll=false
→ Test Suites: 35 passed, 35 total
→ Tests:       356 passed, 356 total
```

---

## Rollback Plan

1. Revert imports and inline implementations in all three `Dashboard.jsx` files (restore `handlePrevious`, `handleNext`, `getCurrentPeriodText`, `handleTypeToggle`, export `useEffect`, memo stabilizers, `transformDataForCharts`).
2. Delete `src/shared/dashboard/container/helpers/` directory.
3. Re-run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Single-commit revert is safe: no database migrations, no API changes, no widget behavior changes.

---

## Next Phase Boundary (not implemented)

- `useDashboardDates` — would wrap navigation + Redux dispatch
- `useDashboardExports` — would wrap export thunk suite
- `DashboardContainer` — would own filter/fetch/layout orchestration

Phase 6.2C.2 intentionally stopped at **stateless helpers** only.
