# Phase 6.2C.4 — Dashboard Date Orchestration Hook

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract duplicated date navigation/state orchestration from variant `Dashboard.jsx` into `useDashboardDates`  
**Stop boundary respected:** No `DashboardContainer`, filters, exports, layout, widgets, Redux slice changes, or `SpaceUtilization` modifications

---

## Executive Summary

Date navigation orchestration previously duplicated across three variant dashboards (after 6.2C.2 pure resolvers) is now centralized in `useDashboardDates`. The hook composes `useDashboardDateRange`, reuses 6.2C.2 navigation helpers, and returns handlers/labels consumed by existing date picker chrome (unchanged).

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `npm test -- --testPathPattern=shared/dashboard` | PASS — 37 suites, 380 tests |
| Parity tests | PASS — `dashboardDatesParity.test.js` (11 cases) |

---

## Overlap Analysis

| Legacy block (per variant) | Overlap | Extracted to |
|----------------------------|---------|--------------|
| `useDashboardDateRange` + `calculateDateParameters` wrapper | **Identical** (~20 LOC) | `useDashboardDates` (composes existing hook) |
| `energyCustomNeedsDates` guard | **basic only**, logic portable | `resolveEnergyCustomNeedsDates` |
| `handlePrevious` / `handleNext` thin wrappers | **Byte-for-byte** (~50 LOC each variant) | `useDashboardDates` handlers |
| `getCurrentPeriodText` wrapper | **Identical** (~8 LOC) | `getCurrentPeriodText` via `getDashboardPeriodText` |
| Redux dispatch sequence after navigation | **Identical** | `applyDashboardPeriodNavigationResolution` |

**Reused (not reimplemented):**

- `shared/dashboard/hooks/useDashboardDateRange`
- `shared/dashboard/container/helpers/dashboardDateNavigation` (`resolvePreviousPeriodNavigation`, `resolveNextPeriodNavigation`, `DASHBOARD_NAVIGATION_CHART_LOADING`)
- `shared/dashboard/container/helpers/dashboardPeriodText` (`getDashboardPeriodText`)

**Not extracted:** `handleDurationChange`, `getCurrentSelectionText`, duration dropdown UI, `DashboardDurationFilterBar`, initial-load date reset `useEffect`, area-tree filters.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/container/hooks/useDashboardDates.js` | Date orchestration hook |
| `src/shared/dashboard/container/hooks/dashboardDatesParity.test.js` | Parity tests |

**Also extended (helper surface, no behavior change):**

- `dashboardDateNavigation.js` — added `resolveEnergyCustomNeedsDates`, `applyDashboardPeriodNavigationResolution`
- `container/helpers/index.js` — exports new helpers
- `container/hooks/index.js` — exports `useDashboardDates`

**Production LOC added:** 139 (hook) + ~25 (helper extensions) ≈ **164**  
**Test LOC added:** 191

---

## Files Modified

| File | Changes |
|------|---------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replace inline date range + navigation + period text with `useDashboardDates`; consume `energyCustomNeedsDates` from hook |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same (no `energyCustomNeedsDates` consumer) |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same |

Removed per-variant imports: `useDashboardDateRange`, `calculateDashboardDateParameters`, date navigation helpers used only for orchestration.

---

## LOC Reduction

Non-blank lines (`Measure-Object -Line`).

| Variant | After 6.2C.3 | After 6.2C.4 | Δ (6.2C.4) |
|---------|-------------:|-------------:|-----------:|
| basic | 4,420 | 4,369 | **−51** |
| advanced | 3,663 | 3,613 | **−50** |
| customized | 5,665 | 5,615 | **−50** |
| **Dashboard subtotal** | **13,748** | **13,597** | **−151** |
| Shared hook/helpers (prod) | — | +164 | +164 |
| **Net (6.2C.4)** | | | **+13** |

Cumulative vs Phase 6.2C.1 audit baseline (15,469 dashboard LOC): **−1,872** dashboard LOC removed across 6.2C.2–6.2C.4 before shared module additions.

---

## Parity Test Coverage

`dashboardDatesParity.test.js` verifies:

- **Previous navigation** — day shift, month `selectedMonthForData`
- **Next navigation** — future guard, week `T00`/`T23` suffixes
- **Custom date mode** — incomplete-date guard, future-blocked loading flag, inclusive range shift
- **Period text** — week and custom same-month labels via `getDashboardPeriodText`
- **Date synchronization** — `applyDashboardPeriodNavigationResolution` Redux dispatch order

---

## Test Results

```
npm run build
→ Compiled successfully

npm test -- --testPathPattern=shared/dashboard --watchAll=false
→ Test Suites: 37 passed, 37 total
→ Tests:       380 passed, 380 total
```

---

## Rollback Plan

1. Restore per-variant `useDashboardDateRange`, `calculateDateParameters`, `handlePrevious`, `handleNext`, `getCurrentPeriodText`, and `energyCustomNeedsDates` (basic) inline blocks.
2. Remove `useDashboardDates` import/call from all three `Dashboard.jsx` files.
3. Delete `useDashboardDates.js` and `dashboardDatesParity.test.js`; revert helper additions in `dashboardDateNavigation.js` if desired.
4. Re-run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## Next Phase Boundary (not implemented)

- `DashboardContainer` shell
- Area-tree / filter extraction
- Widget fetch orchestration
- Duration-change handler extraction (`handleDurationChange` remains variant-owned)
