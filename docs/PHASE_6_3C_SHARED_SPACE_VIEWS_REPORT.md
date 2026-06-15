# Phase 6.3C — Shared Space View Components Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3B space transform foundation  
**Scope:** Extract `peak_and_minimum_utilization` + `utilization_by_area` view components only

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `SpacePeakMinCards` and `UtilizationByAreaList` shared widgets; wired basic/advanced/customized `SpaceUtilization.jsx` as thin adapters |
| Variant LOC removed | **−1,707** gross (−503 basic, −533 advanced, −671 customized vs 6.3B) |
| Shared widgets added | **882** production + **373** test LOC |
| UI behavior | **Preserved** — loading/empty states, themes, tab routing, group filtering, sort/cap |
| Verification | `npm run build` PASS; **56 suites, 581 tests PASS** (+23 new) |

---

## 2. Overlap Analysis

### 2.1 Duplicated before 6.3C

| Concern | basic | advanced | customized | Overlap |
|---------|:-----:|:--------:|:----------:|:-------:|
| Peak/min metric cards (2 panels) | `renderSpacePeakMinOccupancyCards` | inline JSX ×2 tabs | inline JSX ×2 tabs | **~95%** |
| Peak/min loading resolver | per-call boolean | `instantOccupancyCountLoading \|\| anyLoading…` | same + fixed height row | **90%** |
| Peak/min display formatting | `formatPeakMinTime` bridge | IIFE + `formatPeakMinTime` | IIFE + `formatPeakMinTime` | **100%** (transform in 6.3B) |
| Utilization-by-area list shell | inline ternary ×3 | inline ternary ×2 | inline ternary ×2 | **~90%** |
| Area row rendering | `areaData.map` ×3 | `areaData.map` ×2 | `areaData.map` ×2 | **~98%** |
| `processAreaData` / rows | shared transform (6.3B) | shared transform | shared transform + group opts | **data layer done** |

### 2.2 Intentionally not extracted (out of scope)

- Export dropdowns / `handleExport`
- `SpaceLineChartAdapter`, `SpaceStackedBarChartAdapter`, `InstantOccupancyChartAdapter`
- Custom graph pipeline + `peakMinForOccupancyCustomGraphCard`
- DnD / `SortableDashboardItem` shells
- `SpaceInstantUtilizationCombinedChart`

---

## 3. Files Created

```
src/shared/dashboard/space/widgets/
├── SpacePeakMinCards.jsx
├── SpacePeakMinCard.jsx
├── spacePeakMinTheme.js
├── spacePeakMinMemoCompare.js
├── spacePeakMinParity.test.js
├── UtilizationByAreaList.jsx
├── UtilizationByAreaRow.jsx
├── utilizationByAreaTheme.js
├── utilizationByAreaMemoCompare.js
├── utilizationByAreaParity.test.js
└── index.js
```

---

## 4. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Thin adapters; removed inline peak/min + area list |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Thin adapters; removed `peakMinMetricCard*` sx helpers |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Thin adapters; `processOptions` for group filter |

---

## 5. Prop Matrix

### 5.1 `SpacePeakMinCards`

| Prop | Type | basic | advanced | customized |
|------|------|-------|----------|------------|
| `showChartsTab` | boolean | ✓ | ✓ | ✓ |
| `instantOccupancyCount` | object | ✓ | ✓ | ✓ |
| `occupancyCount` | object | ✓ | ✓ | ✓ |
| `selectedDuration` | string | ✓ | ✓ | ✓ |
| `currentDate` | string/Date | ✓ | ✓ | ✓ |
| `shellVariant` | `basic \| advanced \| customized` | basic | advanced | customized |
| `chartSurface` | `light \| dark` | ✓ | — | — |
| `metricPanelBorder` | string | — | ✓ | — |
| `isLargeScreen` | boolean | ✓ | ✓ | ✓ |
| `instantOccupancyCountLoading` | boolean | charts tab | charts tab | charts tab |
| `anyLoading` | boolean | ✓ | ✓ | ✓ |
| `isLoading` | boolean | ✓ | ✓ | ✓ |
| `globalLoadingProp` | boolean | ✓ | ✓ | ✓ |
| `includeInstantLoading` | boolean | main tab: `false` | main tab: `false` | main tab: `false` |
| `isLoading` (explicit override) | boolean | main tab peak | main tab peak | main tab peak |

**Internal:** `resolveSpacePeakMinModel` + `resolveSpacePeakMinDataSource`; `reformatTimeLabels` default `true` for variant parity.

### 5.2 `UtilizationByAreaList`

| Prop | Type | basic | advanced | customized |
|------|------|-------|----------|------------|
| `payload` | object | `active*` or `spaceUtilizationPerArea` | same | same + main tab `spaceUtilizationPerArea` |
| `processOptions` | object | default strict | default strict | `{ strictOccupiedType: false, selectedGroupIds, areaGroups }` |
| `dataLoading` | boolean | per-tab loading flag | per-tab | per-tab |
| `anyLoading` | boolean | ✓ | ✓ | ✓ |
| `isLoading` | boolean | ✓ | ✓ | ✓ |
| `globalLoadingProp` | boolean | ✓ | ✓ | ✓ |
| `shellVariant` | preset | basic | advanced | customized |
| `chartSurface` | `light \| dark` | ✓ | — | — |
| `customizedTheme` | string | — | — | `theme` (`default_white` aware) |
| `layoutMode` | `scroll \| fill \| flex` | scroll | fill | flex |
| `isLargeScreen` | boolean | ✓ | ✓ | ✓ |
| `emptyMessage` | string | default | default | default |

**Internal:** `processUtilizationByAreaRows`; view states `loading | empty | pending | no-rows | rows`.

---

## 6. LOC Before / After

### Variant `SpaceUtilization.jsx` (vs 6.3B end state)

| Variant | 6.3B | 6.3C | Δ |
|---------|-----:|-----:|--:|
| basic | 3,123 | 2,620 | **−503** |
| advanced | 1,795 | 1,262 | **−533** |
| customized | 6,284 | 5,613 | **−671** |
| **Total** | **11,202** | **9,495** | **−1,707** |

### Shared `space/widgets/` (new in 6.3C)

| Category | LOC |
|----------|----:|
| Production | 882 |
| Tests | 373 |
| **Total** | **1,255** |

### Cumulative (6.3A → 6.3C variant files)

| Variant | 6.3A | 6.3C | Δ |
|---------|-----:|-----:|--:|
| basic | 3,436 | 2,620 | −816 |
| advanced | 2,469 | 1,262 | −1,207 |
| customized | 6,343 | 5,613 | −730 |
| **Total** | **12,248** | **9,495** | **−2,753** |

### Net codebase delta (6.3C only)

| Metric | Value |
|--------|------:|
| Variant LOC removed | −1,707 |
| Widget LOC added | +1,255 |
| **Net** | **−452** |

---

## 7. Tests Added

| File | Tests | Coverage |
|------|------:|----------|
| `spacePeakMinParity.test.js` | 11 | Loading parity, peak/min values, charts vs main tab source, themes, memo |
| `utilizationByAreaParity.test.js` | 12 | Loading, view states, sort/cap, customized group filter, themes, memo |

**Suite delta:** 558 → **581** tests (+23) across `shared/dashboard`.

---

## 8. Parity Verification

### Build

```
npm run build → Compiled successfully
```

### Tests

```
npm test -- --testPathPattern=shared/dashboard
→ 56 suites passed, 581 tests passed
```

### Behavioral parity checklist

| Concern | Status |
|---------|--------|
| Peak/min loading (charts vs main tab) | ✓ `includeInstantLoading` / explicit `isLoading` |
| Charts-tab vs main-tab data source | ✓ `resolveSpacePeakMinDataSource` |
| Peak/min time double-format path | ✓ `reformatTimeLabels` in widget |
| Variant themes (basic stretch, advanced border, customized 220px row) | ✓ theme presets |
| Area list loading / empty / pending | ✓ `resolveUtilizationByAreaViewState` |
| Sort descending + 100% cap | ✓ via `processUtilizationByAreaRows` |
| Customized group filter | ✓ `processOptions` |
| Chart adapters untouched | ✓ |

---

## 9. Stop Boundary Compliance

| Constraint | Status |
|------------|--------|
| No `useSpaceExports` | ✓ |
| No `SpaceWidgetRenderer` | ✓ |
| No `SpaceLayoutRenderer` | ✓ |
| No `SpaceUtilizationContainer` | ✓ |
| No export UI move | ✓ |
| No custom graph extraction | ✓ |
| No DnD move | ✓ |
| No chart adapter changes | ✓ |

---

## 10. Rollback Plan

### Full rollback (6.3C only)

1. Delete `src/shared/dashboard/space/widgets/` directory
2. Restore peak/min + utilization-by-area inline JSX in all three `SpaceUtilization.jsx` files from git/backup
3. Re-add variant helpers: `renderSpacePeakMinOccupancyCards`, `areaData` useMemo, `calculatePeakMinFromChartData` where needed
4. Delete this report
5. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`

### Partial rollback

- Keep widgets but revert one variant wiring (e.g. customized only) if a layout regression is found
- 6.3B transforms remain valid without widgets

---

## 11. Next Phase Preview (not started)

Per 6.3A roadmap:

- **6.3D:** `useSpaceExports` + export hook extraction
- **6.3E+:** `SpaceWidgetRenderer`, `SpaceLayoutRenderer`, `SpaceUtilizationContainer`

---

## 12. Recommendation

Phase 6.3C is **complete**. Builtin peak/min and utilization-by-area views are centralized; variants pass tab context, loading flags, and theme presets only. Ready for export hook extraction (6.3D) when approved.
