# Phase 6.3B — SpaceUtilization Cleanup & Foundation Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3A SpaceUtilization audit (GREEN items only)  
**Scope:** Dead code removal + shared space transforms — no widget/layout/container work

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Removed SAFE REMOVE dead code from basic/advanced `SpaceUtilization.jsx`; extracted `processUtilizationByAreaRows` and `resolveSpacePeakMinModel` to `src/shared/dashboard/space/transforms/` |
| Variant LOC removed | **−1,046** gross (−313 basic, −674 advanced, −59 customized) |
| Shared module added | **~353** production + **~184** test LOC |
| UI changes | **None** — peak/min cards and area lists unchanged; bridge functions preserve legacy `{ peak, min, peakTime, minTime }` shape |
| Verification | `npm run build` PASS; **54 suites, 558 tests PASS** (+12 new) |

---

## 2. Files Created

```
src/shared/dashboard/space/transforms/
├── processUtilizationByAreaRows.js       (104 LOC)
├── resolveSpacePeakMinModel.js           (60 LOC)
├── index.js                              (5 LOC)
├── processUtilizationByAreaRows.test.js  (93 LOC)
└── resolveSpacePeakMinModel.test.js      (91 LOC)
```

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Dead code removal; delegate area rows + peak/min model |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Dead code removal; delegate area rows + peak/min model |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Delegate area rows (with group filter options) + peak/min model; remove unused fetch thunks |

**Not modified (per stop boundary):** `charts/space/*` adapters, container modules, DnD, exports UI, custom graph pipeline, `SpaceInstantUtilizationCombinedChart`.

---

## 4. Dead Code Removed (SAFE REMOVE)

### 4.1 Advanced (`−674 LOC`)

| Item | Action |
|------|--------|
| `mapTimeRangeToBackend` | Removed (uncalled) |
| `calculateDateParameters` (~200 LOC) | Removed (no duration bar consumer) |
| `handlePrevious` / `handleNext` (~300 LOC) | Removed (dead — no `DashboardDurationFilterBar`) |
| `getCurrentPeriodText` | Removed |
| `getCurrentSelectionText` | Removed |
| `getNavigationButtonText` | Removed |
| `areaTree` selector | Removed (unused) |
| `validateDataStructure` | Removed (never called) |
| Unused `recharts` imports | Removed |
| Unused fetch thunk imports (×6) | Removed |
| `UseAuth` import | Removed (unused) |
| `setSelectedAreas`, `clearDataCache` imports | Removed (unused) |
| `formatDateForState`, `parseDateFromState` imports | Removed (only used by dead date block) |

**Preserved:** `fetchFloors`, `fetchRenameWidgets`, `fetchProfile`, `hasInitialized` mount effects.

### 4.2 Basic (`−313 LOC`)

| Item | Action |
|------|--------|
| `mapTimeRangeToBackend` | Removed (uncalled) |
| `calculateDateParameters` (~200 LOC) | Removed (never called — active date nav uses `handlePrevious`/`handleNext` directly) |
| `getCurrentSelectionText` | Removed |
| `getNavigationButtonText` | Removed |
| `areaTree` selector | Removed (unused) |
| `validateDataStructure` | Removed |
| Unused `recharts` imports | Removed |
| Unused fetch thunk imports (×6) | Removed |

**Preserved:** `handlePrevious`, `handleNext`, `getCurrentPeriodText`, `DashboardDurationFilterBar` wiring (active date UI).

### 4.3 Customized (`−59 LOC`)

| Item | Action |
|------|--------|
| Inline `processAreaData` useMemo | Replaced with shared transform |
| Inline `calculatePeakMinFromChartData` body | Replaced with `resolveSpacePeakMinModel` bridge |
| `validateDataStructure` | Removed |
| Unused fetch thunk imports (×6) | Removed |

**Not removed (UNKNOWN / active per 6.3A):** `calculateDateParameters`, date navigation handlers, `getCurrentSelectionText`, custom graph pipeline, `calculatePeakMinFromOccupancyPayload` in `peakMinForOccupancyCustomGraphCard`.

---

## 5. Shared Extractions

### 5.1 `processUtilizationByAreaRows(payload, options)`

| Option | Default | Purpose |
|--------|---------|---------|
| `strictOccupiedType` | `true` | basic/advanced: require numeric `occupied` |
| `selectedGroupIds` | — | customized group filter |
| `areaGroups` | — | customized group filter |

**Preserves:** error → `[]`, percentage cap at 100, descending sort, `utilized_area` / `data` array resolution.

### 5.2 `resolveSpacePeakMinModel({ dataSource, selectedDuration, currentDate })`

Composes:

- `calculatePeakMinFromOccupancyPayload`
- `formatPeakMinTimeLabel`

**Returns:**

```js
{ peakValue, peakTime, minimumValue, minimumTime }
```

Variants bridge to legacy UI shape via thin `calculatePeakMinFromChartData()` wrapper (no JSX changes).

### 5.3 `resolveSpacePeakMinDataSource({ showChartsTab, instantOccupancyCount, occupancyCount })`

Encapsulates charts-tab vs main-tab data source selection.

---

## 6. LOC Before / After

### Variant `SpaceUtilization.jsx`

| Variant | Before (6.3A) | After (6.3B) | Δ |
|---------|--------------:|-------------:|--:|
| basic | 3,436 | 3,123 | **−313** |
| advanced | 2,469 | 1,795 | **−674** |
| customized | 6,343 | 6,284 | **−59** |
| **Total** | **12,248** | **11,202** | **−1,046** |

### Shared `space/transforms/`

| Category | LOC |
|----------|----:|
| Production | 169 |
| Tests | 184 |
| **Total** | **353** |

### Net codebase delta

| Metric | Value |
|--------|------:|
| Variant LOC removed | −1,046 |
| Shared LOC added | +353 |
| **Net** | **−693** |

---

## 7. Parity Verification

### Build

```
npm run build → Compiled successfully
```

### Tests

```
npm test -- --testPathPattern=shared/dashboard
→ 54 suites passed, 558 tests passed (+12)
```

### New test coverage

| File | Tests | Validates |
|------|------:|-----------|
| `processUtilizationByAreaRows.test.js` | 7 | Sort, cap, error/empty, customized `data` array, group filter |
| `resolveSpacePeakMinModel.test.js` | 5 | Peak/min values, formatted times, tab data source, legacy shape bridge |

### Behavioral parity

| Concern | Status |
|---------|--------|
| Area list sort order | ✓ descending by percentage |
| Percentage cap | ✓ `Math.min(..., 100)` |
| Customized group filter | ✓ via `selectedGroupIds` + `areaGroups` options |
| Peak/min values | ✓ same payload derivation |
| Peak/min time labels | ✓ `formatPeakMinTimeLabel` applied in model (UI may apply again — unchanged from prior double-format path) |
| Basic date navigation | ✓ preserved (`handlePrevious`/`handleNext`/`DashboardDurationFilterBar`) |
| Advanced static layout | ✓ unchanged (dead date block only removed) |

---

## 8. Stop Boundary Compliance

| Constraint | Status |
|------------|--------|
| No `SpaceWidgetRenderer` | ✓ |
| No `SpaceLayoutRenderer` | ✓ |
| No `SpaceUtilizationContainer` | ✓ |
| No export UI move | ✓ |
| No DnD move | ✓ |
| No custom graph move | ✓ |
| No `charts/space` adapter changes | ✓ |
| No Redux/API/route changes | ✓ |

---

## 9. Rollback Plan

### Full rollback (6.3B only)

1. Delete `src/shared/dashboard/space/transforms/` directory
2. Restore `processAreaData`, `calculatePeakMinFromChartData`, dead helpers, and imports in all three `SpaceUtilization.jsx` files from git
3. Delete this report
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`

### Partial rollback

- Keep shared transforms but revert variant wiring (re-inline `processAreaData` only)
- Re-add advanced dead date block only if a hidden consumer is discovered (none found in 6.3B verification)

---

## 10. Next Phase (6.3C preview)

Per 6.3A roadmap — **not started in 6.3B:**

- `SpacePeakMinCards.jsx` shared view component
- `UtilizationByAreaList.jsx` shared view component
- Further export hook extraction (6.3D)

---

## 11. Recommendation

Phase 6.3B GREEN items are **complete**. Safe dead code removal reduced advanced `SpaceUtilization.jsx` by **27%** without behavior change. Shared transform foundation is in place for 6.3C view component extraction.
