# Phase 6.2B.3 — TotalConsumptionByGroupWidget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `total_consumption_by_group` widget from all three `Dashboard.jsx` variants

---

## Pre-Work Audit Summary

All three variants already delegated pie rendering to `ConsumptionPieChartAdapter` (Phase 6.2A.3B). Remaining duplication was the **widget adapter layer**: loading gate, theme/surface props, export control wiring, and slot invocation.

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| Loading gate | `!allEnergyChartsReady \|\| chartLoading.totalConsumptionByGroup \|\| !totalConsumptionByGroup` | Same | Same |
| Adapter shell | `basic-energy` + `chartSurface` light/dark | `advanced-card` + theme palette resolvers | `customized-builtin` + fetch/zero-segment states |
| Area lookup | `areaGroups` only | `areaGroups` only | `areaGroups` + `areaIdToDisplayName` |
| Export dropdown key | `total_consumption_by_group` | Display `title` | Display `title` (with alias title resolver) |
| Export loading key | `total_consumption_by_group_*` | `Consumption by Group_*` (legacy) | `Consumption by Group_*` (legacy) |
| Export thunks | `sendTotalConsumptionByGroupEmail` / `downloadTotalConsumptionByGroup` | Same | Same |
| Chart layer | `ConsumptionPieChartAdapter` | Same | Same |

**Verified:** All variants use shared `ConsumptionPieChartAdapter` — no chart rework performed.

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| Loading state machine | **100%** |
| Selector payload pass-through | **100%** |
| `ConsumptionPieChartAdapter` wiring | **100%** |
| Export thunk targets (`energyExportActionMap`) | **100%** |
| Theme/surface tokens | **~55%** (basic responsive light/dark, advanced CSS vars, customized builtin card) |
| Export UI chrome | **~40%** (basic themed dropdown, advanced `ChartExportButton`, customized dark dropdown) |
| **Weighted widget-layer duplication removed** | **~85%** |

---

## Prop Matrix

### Shared props (`TotalConsumptionByGroupWidget`)

| Prop | Type | Owner |
|------|------|-------|
| `title` | string | Variant (`getWidgetTitle` / `getWidgetTitleWithAliases`) |
| `totalConsumptionByGroup` | object | Redux selector (variant passes) |
| `allEnergyChartsReady` | boolean | Variant orchestration |
| `chartLoadingTotalConsumptionByGroup` | boolean | Variant `chartLoading` |
| `areaGroups` | object | Redux selector |
| `areaIdToDisplayName` | Map (optional) | Customized only |
| `exportControl` | ReactNode | Variant-built (export UI chrome) |
| `ChartLoader` | component | Variant |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `chartSurface` | `energyLineChartSurface` | — | — |
| `energyLightFullCardHeightPx` | `ENERGY_LIGHT_FULL_CARD_HEIGHT_PX` | — | — |
| `advancedSurface` | — | card bg/border/shadow + palette resolvers | — |
| `customizedSurface` | — | — | `BUILTIN_*` style refs |
| `chartHeaderStyle` | yes | yes | yes |

### Export / email dependency matrix

| Layer | Dependency | Modified |
|-------|------------|----------|
| Thunks | `sendTotalConsumptionByGroupEmail`, `downloadTotalConsumptionByGroup` | No |
| Export map | `createEnergyExportActionMap` → `TOTAL_CONSUMPTION_BY_GROUP` | No |
| API path resolver | `resolveEnergyExportByApiPath` (custom graphs) | No |
| Handler bodies | `handleConsumptionByGroupEmail/Download` in `Dashboard.jsx` | No |
| Export UI | Variant `useMemo` export controls | Stays in variant |
| Shared resolver | `resolveTotalConsumptionByGroupExportActions(thunks)` | **New** |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/TotalConsumptionByGroupWidget.jsx` | Loading + theme resolution, memo adapter |
| `src/shared/dashboard/widgets/TotalConsumptionByGroupCard.jsx` | `ConsumptionPieChartAdapter` wiring |
| `src/shared/dashboard/widgets/totalConsumptionByGroupTheme.js` | Theme presets, loading, export key helpers |
| `src/shared/dashboard/widgets/totalConsumptionByGroupMemoCompare.js` | Memo comparator + parity helpers |
| `src/shared/dashboard/widgets/totalConsumptionByGroupParity.test.js` | Parity + routing tests |

**Barrel updated:** `src/shared/dashboard/widgets/index.js`

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Removed inline `ConsumptionPieChart` memo; slot uses `TotalConsumptionByGroupWidget` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same |
| `src/shared/dashboard/widgets/index.js` | Re-export TCG widget bundle |

**Not modified:** `ConsumptionPieChartAdapter`, `ConsumptionPieChartView`, `pieChartNormalizers`, Redux/API, `DashboardOverview`, `SpaceUtilization`, `EnergyCustomGraphCard`, custom graphs.

---

## LOC Before / After

### Variant `Dashboard.jsx` (post 6.2B.1 baseline)

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/Dashboard.jsx` | 5,650 | 5,632 | **−18** |
| `advanced/Dashboard.jsx` | 4,817 | 4,829 | **+12** |
| `customized/Dashboard.jsx` | 7,007 | 7,008 | **+1** |
| **Variant total** | **17,474** | **17,469** | **−5** |

> Export UI chrome remains variant-owned per scope; net variant delta is small because `ConsumptionPieChart` memo removal is offset by explicit `useMemo` export controls.

### Shared production modules added

| Module | LOC |
|--------|-----|
| `totalConsumptionByGroupTheme.js` | 177 |
| `TotalConsumptionByGroupWidget.jsx` | 86 |
| `TotalConsumptionByGroupCard.jsx` | 53 |
| `totalConsumptionByGroupMemoCompare.js` | 68 |
| **Total production** | **384** |

### Tests added: 251 LOC, 18 tests

**Shared widget layer extracted:** ~255 LOC of duplicated adapter logic consolidated into 384 LOC shared modules.

---

## Parity Verification

| Check | Result |
|-------|--------|
| Basic loading parity | PASS |
| Advanced loading parity | PASS |
| Customized loading parity | PASS |
| Empty payload (no pie rows) | PASS |
| Zero-segment payload | PASS |
| Basic theme (light surface + height) | PASS |
| Advanced theme (card surface) | PASS |
| Customized theme (fetch/zero-segment flags) | PASS |
| Export thunk routing | PASS |
| Export dropdown/loading key resolution | PASS |
| Memo comparator | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 30 passed, 30 total
Tests:       263 passed, 263 total  (+18 new)

npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. Restore inline `ConsumptionPieChart` memo components in all three `Dashboard.jsx` files.
2. Re-import `ConsumptionPieChartAdapter` and `consumptionPieChartPropsAreEqual`.
3. Revert widget slot JSX to `<ConsumptionPieChart ... />`.
4. Remove `TotalConsumptionByGroupWidget` imports and variant `useMemo` export helpers.
5. Delete `TotalConsumptionByGroup*.jsx`, `totalConsumptionByGroup*.js`, and parity test.
6. Revert `widgets/index.js` TCG exports.
7. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, chart, or routing changes were made; rollback is presentation-only.

---

## Architecture

```
Dashboard.jsx (variant)
  ├── export handlers (unchanged)
  ├── exportControl useMemo (variant UI chrome)
  └── TotalConsumptionByGroupWidget
        ├── resolveTotalConsumptionByGroupLoading
        ├── resolveTotalConsumptionByGroupTheme
        ├── resolveTotalConsumptionByGroupExportActions (thunk map)
        └── TotalConsumptionByGroupCard
              └── ConsumptionPieChartAdapter (unchanged, 6.2A.3B)
                    └── ConsumptionPieChartView
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- `ConsumptionWidget` / `SavingsWidget` extraction
- `AlertsWidget` extraction
- `DashboardOverview` work
- `SpaceUtilization` work
- Chart layer rework (6.2A.3B artifacts untouched)
