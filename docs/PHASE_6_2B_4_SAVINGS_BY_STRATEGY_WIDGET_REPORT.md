# Phase 6.2B.4 — SavingsByStrategyWidget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `savings_by_strategy` widget from all three `Dashboard.jsx` variants

---

## Pre-Work Audit Summary

All three variants already delegated donut rendering to `SavingsStrategyChartAdapter` (Phase 6.2A.3C). Remaining duplication was the **widget adapter layer**: loading gate, theme/surface props, embedded/custom-date modes, and slot invocation.

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| Loading gate | `!allEnergyChartsReady \|\| chartLoading.savingsByStrategy \|\| globalLoading \|\| !savingsByStrategy` | Same | Same |
| Custom-date placeholder | `customDatesIncomplete` → adapter `custom-range-placeholder` | — | — |
| Embedded mode | Combined `consumption_saving` slot | — | — |
| Adapter shell | `basic-energy` + light/dark/embedded | `advanced-card` + palette resolvers | `customized-builtin` |
| Export UI | **Not wired** (thunks exist in slice) | **Not wired** | **Not wired** |
| Export thunks | `sendSavingsByStrategyEmail` / `downloadSavingsByStrategy` | Same | Same |
| Chart layer | `SavingsStrategyChartAdapter` | Same | Same |

**Verified:** All variants use shared `SavingsStrategyChartAdapter` — no chart rework performed.

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| Loading state machine | **100%** |
| Payload pass-through (`savingsByStrategy`) | **100%** |
| `SavingsStrategyChartAdapter` wiring | **100%** |
| Empty / placeholder / transitional status (via adapter) | **100%** |
| Theme/surface tokens | **~50%** (basic embedded/light/dark, advanced palette, customized builtin) |
| Export thunk identifiers | **100%** (UI unwired — preserved) |
| **Weighted widget-layer duplication removed** | **~90%** |

---

## Prop Matrix

### Shared props (`SavingsByStrategyWidget`)

| Prop | Type | Owner |
|------|------|-------|
| `title` | string | Variant (`getWidgetTitle`) |
| `savingsByStrategy` | object | Redux `selectSavingsByStrategy` |
| `allEnergyChartsReady` | boolean | Variant orchestration |
| `chartLoadingSavingsByStrategy` | boolean | Variant `chartLoading` |
| `globalLoading` | boolean | Variant |
| `ChartLoader` | component | Variant |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `chartSurface` | `energyLineChartSurface` | — | — |
| `embedded` | combined slot only | — | — |
| `customDatesIncomplete` | `energyCustomNeedsDates` | — | — |
| `energyLightFullCardHeightPx` | yes | — | — |
| `advancedSurface` | — | card + palette resolvers | — |
| `customizedSurface` | — | — | `BUILTIN_*` styles |
| `chartHeaderStyle` | yes | yes | yes |

### Export / email dependency matrix

| Layer | Dependency | Modified |
|-------|------------|----------|
| Dedicated thunks | `sendSavingsByStrategyEmail`, `downloadSavingsByStrategy` | No |
| Widget resolver | `resolveSavingsByStrategyExportActions(thunks)` | **New** |
| API-path resolver | `resolveSavingsByStrategyApiPathExportActions` → `sendEnergySavingsEmail` / `downloadEnergySavings` | **New** (custom-graph path parity) |
| Export UI in Dashboard | None (still unwired) | No |
| Redux slice | Unchanged | No |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/SavingsByStrategyWidget.jsx` | Loading + theme resolution, memo adapter |
| `src/shared/dashboard/widgets/SavingsByStrategyCard.jsx` | `SavingsStrategyChartAdapter` wiring |
| `src/shared/dashboard/widgets/savingsByStrategyTheme.js` | Theme presets, loading, export resolvers |
| `src/shared/dashboard/widgets/savingsByStrategyMemoCompare.js` | Memo comparator + status helpers |
| `src/shared/dashboard/widgets/savingsByStrategyParity.test.js` | Parity + routing tests |

**Barrel updated:** `src/shared/dashboard/widgets/index.js`

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Removed inline `SavingsStrategyChart` memo; 2 slots use `SavingsByStrategyWidget` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Removed inline memo; grid slot uses widget |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Removed inline memo; energy card uses widget |
| `src/shared/dashboard/widgets/index.js` | Re-export savings-by-strategy bundle |

**Not modified:** `SavingsStrategyChartAdapter`, `SavingsStrategyChartView`, `savingsStrategyToPieRows`, Redux/API, `DashboardOverview`, `SpaceUtilization`, widget ordering/visibility/drag-drop.

---

## LOC Before / After

### Variant `Dashboard.jsx` (post 6.2B.3 baseline)

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/Dashboard.jsx` | 5,632 | 5,561 | **−71** |
| `advanced/Dashboard.jsx` | 4,829 | 4,824 | **−5** |
| `customized/Dashboard.jsx` | 7,008 | 7,009 | **+1** |
| **Variant total** | **17,469** | **17,394** | **−75** |

### Shared production modules added

| Module | LOC |
|--------|-----|
| `savingsByStrategyTheme.js` | 259 |
| `SavingsByStrategyWidget.jsx` | 84 |
| `savingsByStrategyMemoCompare.js` | 85 |
| `SavingsByStrategyCard.jsx` | 35 |
| **Total production** | **463** |

### Tests added: 239 LOC, 19 tests

**Net monolith reduction:** ~75 LOC  
**Net codebase delta:** +388 LOC (shared − variant removal, excluding tests)

---

## Parity Verification

| Check | Result |
|-------|--------|
| Basic loading parity | PASS |
| Advanced loading parity | PASS |
| Customized loading parity | PASS |
| Custom-date placeholder gate | PASS |
| Empty-null status | PASS |
| Zero/transitional placeholder donut | PASS |
| Ready status | PASS |
| Basic light/embedded themes | PASS |
| Advanced palette theme | PASS |
| Customized builtin theme | PASS |
| Dedicated export thunk routing | PASS |
| API-path export routing | PASS |
| Memo comparator | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 31 passed, 31 total
Tests:       282 passed, 282 total  (+19 new)

npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. Restore inline `SavingsStrategyChart` memo components in all three `Dashboard.jsx` files.
2. Re-import `SavingsStrategyChartAdapter` and `savingsStrategyChartPropsAreEqual`.
3. Revert widget slot JSX to `<SavingsStrategyChart ... />`.
4. Remove `SavingsByStrategyWidget` imports and variant surface `useMemo` helpers.
5. Delete `SavingsByStrategy*.jsx`, `savingsByStrategy*.js`, and parity test.
6. Revert `widgets/index.js` savings-by-strategy exports.
7. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, chart, or routing changes were made; rollback is presentation-only.

---

## Architecture

```
Dashboard.jsx (variant)
  ├── slot shell / drag wrapper (unchanged)
  └── SavingsByStrategyWidget
        ├── resolveSavingsByStrategyLoading
        ├── resolveSavingsByStrategyTheme
        ├── resolveSavingsByStrategyExportActions (thunk map)
        └── SavingsByStrategyCard
              └── SavingsStrategyChartAdapter (unchanged, 6.2A.3C)
                    └── SavingsStrategyChartView
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- `ConsumptionWidget` / `SavingsWidget` extraction
- `AlertsWidget` extraction
- Space widget work
- Chart layer rework (6.2A.3C artifacts untouched)
- Export UI wiring (remains unwired per legacy behavior)
