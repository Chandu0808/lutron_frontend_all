# Phase 6.2A.1 — Shared Dashboard Transform Foundation Report

**Date:** 2026-06-10  
**Scope:** Pure transformation logic only. No widgets, charts, Redux, routes, or export/email extraction.

---

## Summary

Phase 6.2A.1 moves duplicated dashboard **data transformation** into `src/shared/dashboard/charts/transforms/`. Variant `Dashboard.jsx` and `SpaceUtilization.jsx` files now call shared pure functions through thin `useCallback` / `useMemo` adapters. Behavior, API contracts, Redux shapes, and visuals are unchanged.

| Check | Result |
|-------|--------|
| `npm run build` | Pass |
| Shared tests (`shared/dashboard`) | **43 passed** (16 new transform tests + 27 from 6.1A) |
| Widget extraction | Not started |
| Chart component extraction | Not started |
| Export/email extraction (6.2A.2) | Not started |

---

## Functions Extracted

| Module | Classification | Variants unified |
|--------|----------------|------------------|
| `transformDataForCharts.js` | Near duplicate → **options bag** | basic, advanced, customized |
| `calculatePeakMinFromChartData.js` | **Exact duplicate** | ×3 Dashboard |
| `calculatePeakMinFromOccupancyPayload.js` | Near duplicate (superset) | customized module + ×3 SpaceUtil wrapper |
| `formatPeakMinDisplay.js` | **Exact duplicate** | ×3 Dashboard |
| `formatPeakMinTimeLabel.js` | **Exact duplicate** | ×3 SpaceUtil (+ customized module) |
| `consumptionSavingMergedData.js` | **Exact duplicate** | basic Dashboard |
| `savingsStrategyToPieRows.js` | **Exact duplicate** (+ helpers) | ×3 Dashboard `SavingsStrategyChart` |
| `spaceOccupancyToRecharts.js` | **Exact duplicate** | ×3 SpaceUtil `LineChartComponent` |
| `formatEnergyXAxisLabel.js` | **Exact duplicate** | ×3 Dashboard `EnergyLineChart` |
| `formatSpaceOccupancyXAxisLabel.js` | **Exact duplicate** | ×3 SpaceUtil line chart |
| `formatSpaceInstantOccupancyXAxisLabel.js` | Near duplicate | ×3 SpaceUtil instant chart |
| `chartTransformConstants.js` | Shared constants | MONTH_NAME_TO_INDEX, etc. |

---

## Functions Intentionally NOT Extracted (Phase 6.2A.1)

| Candidate | Reason |
|-----------|--------|
| `EnergyLineChart` / `ConsumptionPieChart` / `SavingsStrategyChart` JSX | Phase 6.2A.3 — chart **rendering** forbidden |
| `getColorForStrategy` / donut label renderers | Theme/UI — not pure transform |
| Export handlers (`handleConsumptionEmail`, `handleExport`) | Phase 6.2A.2 |
| Instant occupancy **data** processing (`allData` block in `InstantOccupancyChartComponent`) | Variant-specific duration branches; defer to 6.2A.3 with instant chart view |
| `peakMinForOccupancyCustomGraphCard` | Orchestration across Redux paths — not a pure transform |
| Basic/advanced inline `ConsumptionPieChart` pie prep | Uses shared `pieChartNormalizers` in customized only; wiring deferred to 6.2A.2/6.2A.3 |
| `StackedBarChartComponent` occupancy-by-group mapping | Not in 6.2A.1 scope list |

---

## Duplicate Analysis (Pre-Extraction)

| Function | basic | advanced | customized | Resolution |
|----------|-------|----------|------------|------------|
| `transformDataForCharts` | 145 LOC | 145 LOC (identical) | +62 LOC scope/floor/group | Unified + `options` |
| `calculatePeakMinFromChartData` | 75 LOC | identical | identical | Single module |
| `spaceOccupancyToRecharts` | 488 LOC | ~488 | ~488 | Single module |
| `formatEnergyXAxisLabel` | ~175 LOC | ~175 | ~175 | Single module |
| Space axis formatters | ~200 LOC ×2 components | same | same | Two modules (occupancy vs instant `this-day` rule) |

---

## Shared Module Inventory

```
src/shared/dashboard/charts/transforms/
├── chartTransformConstants.js          (17 LOC)
├── transformDataForCharts.js           (242 LOC)
├── calculatePeakMinFromChartData.js    (63 LOC)
├── calculatePeakMinFromOccupancyPayload.js (60 LOC)
├── formatPeakMinDisplay.js             (41 LOC)
├── formatPeakMinTimeLabel.js           (40 LOC)
├── consumptionSavingMergedData.js      (49 LOC)
├── savingsStrategyToPieRows.js         (52 LOC)
├── spaceOccupancyToRecharts.js           (452 LOC)
├── formatEnergyXAxisLabel.js           (163 LOC)
├── formatSpaceOccupancyXAxisLabel.js   (183 LOC)
├── formatSpaceInstantOccupancyXAxisLabel.js (188 LOC)
├── index.js                            (18 LOC)
└── chartTransforms.test.js             (170 LOC)
```

**Shared transform LOC (excl. tests):** ~1,578  
**Test LOC:** ~170

---

## Variant Wiring

### `Dashboard.jsx` (×3)

- Imports shared transforms
- `transformDataForCharts` → thin wrapper calling `sharedTransformDataForCharts` with closure options
- Customized retains **6-arg signature** (unchanged caller contract)
- `calculatePeakMinFromChartData` → direct import
- `formatPeakMinDisplay` → wrapper with `{ unit, selectedDuration, currentDate }`
- `consumptionSavingMergedData` → shared (basic only)
- `SavingsStrategyChart` → `savingsStrategyToPieRows`, `calculateTotalSavingsPercentage`, `isSavingsStrategyTransitionalData`
- `EnergyLineChart` → `formatEnergyXAxisLabel` wrapper

### `SpaceUtilization.jsx` (×3)

- `spaceOccupancyToRecharts` replaces ~488 LOC inline processing per variant
- `calculatePeakMinFromOccupancyPayload` replaces peak-min payload logic
- `formatPeakMinTimeLabel` replaces `formatPeakMinTime` body
- Axis formatters wired for line + instant charts
- Customized: removed duplicate module-level `calculatePeakMinFromOccupancyChartPayload` / `formatPeakMinTimeLabel`

---

## LOC Removed (Estimated)

| Source | Gross removed (×3 where applicable) | Shared added | Net |
|--------|--------------------------------------:|-------------:|----:|
| `transformDataForCharts` | ~496 | 242 | ~254 |
| Peak-min chart + occupancy | ~300 | 123 | ~177 |
| `formatPeakMinDisplay` / time | ~350 | 81 | ~269 |
| `consumptionSavingMergedData` | 55 | 49 | 6 |
| Savings strategy pie prep | ~120 | 52 | ~68 |
| `spaceOccupancyToRecharts` | ~1,464 | 452 | ~1,012 |
| Energy + space axis formatters | ~2,250 | 534 | ~1,716 |
| Thin adapters (added) | — | ~120 | −120 |
| **Total** | **~5,035** | **~1,653** | **~3,382** |

### Post-6.2A.1 file sizes (approx.)

| File | Before (6.2A) | After (est.) |
|------|-------------:|-------------:|
| basic `Dashboard.jsx` | 7,624 | ~7,050 |
| basic `SpaceUtilization.jsx` | 6,714 | ~6,100 |

---

## Test Results

```bash
npm test -- --testPathPattern=shared/dashboard --watchAll=false
# 7 suites, 43 tests — all pass

npm test -- --testPathPattern=charts/transforms --watchAll=false
# 16 parity tests — basic/advanced/customized fixture coverage
```

**Parity coverage per function:**
- `transformDataForCharts` — basic area split, advanced parity, customized floor split, empty payload
- `calculatePeakMinFromChartData` — zero-min preference
- `calculatePeakMinFromOccupancyPayload` — single + multi series
- `consumptionSavingMergedData` — connected load merge
- `savingsStrategyToPieRows` — filter zeros, total %, transitional detection
- `spaceOccupancyToRecharts` — this-day hour padding
- `formatPeakMinDisplay`, `formatPeakMinTimeLabel`, `formatEnergyXAxisLabel`, `formatSpaceOccupancyXAxisLabel`

---

## Remaining Duplication (Next Phases)

| Layer | ~LOC still triplicated | Phase |
|-------|----------------------:|-------|
| `EnergyLineChart` JSX | ~2,900 | 6.2A.3 |
| `LineChartComponent` / instant chart JSX + instant data prep | ~4,500 | 6.2A.3 |
| `ConsumptionPieChart` inline pie prep (basic/advanced) | ~600 | 6.2A.3 + wire `pieChartNormalizers` |
| `SavingsStrategyChart` JSX + `getColorForStrategy` | ~1,900 | 6.2A.3 |
| Export/email handlers | ~1,400 | **6.2A.2** |
| Slot/grid shell in Dashboard/SpaceUtil | ~15,000+ | 6.2B |

---

## Scripts Added

| Script | Purpose |
|--------|---------|
| `scripts/extract-space-occupancy-transform.js` | Slice `spaceOccupancyToRecharts` from basic SpaceUtil |
| `scripts/extract-energy-axis-formatter.js` | Slice `formatEnergyXAxisLabel` from basic Dashboard |
| `scripts/extract-space-axis-formatter.js` | Slice space axis formatters |
| `scripts/phase621a1-wire-transforms.js` | Wire Dashboard transforms |
| `scripts/phase621a1-splice-spaceutil.js` | Splice SpaceUtil occupancy + axis wiring |

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| Only pure transformation logic moved | Yes |
| No widget extraction | Yes |
| No chart component extraction | Yes |
| No Redux / API / route changes | Yes |
| No visual behavior change | Yes (build + parity tests) |
| Parity tests for basic/advanced/customized | Yes |

---

## Next Step

**Phase 6.2A.2** — `buildChartApiParams` + export/email action maps (still no chart JSX extraction).
