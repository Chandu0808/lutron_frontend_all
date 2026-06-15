# Phase 6.5B — Safe Consolidation Bundle Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.5A.3 (68 suites, 682 tests)  
**Scope:** LOW/MEDIUM-risk technical debt consolidation only — no architecture or behavior changes

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Dashboard status panel extraction (M2), barrel cleanup (L1–L3), palette constant (L9), dead export trim (L2) |
| Items documented only | M8 (closed), L6, L7, L10 |
| Architecture / behavior changes | **None** |
| Verification | `npm run build` PASS; **70 suites, 690 tests PASS** (+2 suites, +8 tests) |
| Net production LOC | **≈ −120** (variant duplication removed; barrels deleted) |

---

## 2. Overlap Audit

### M2 — Dashboard status panels (implemented)

| Cluster | basic | advanced | customized | Shared component |
|---------|:-----:|:--------:|:----------:|------------------|
| Area-tree loading | inline | inline (+ `textColor`) | inline | `DashboardAreaTreeInlineStatus` |
| Area-tree error | inline | inline | inline | `DashboardAreaTreeInlineStatus` |
| Area-tree empty | inline | inline (+ `textColor`) | inline | `DashboardAreaTreeInlineStatus` |
| Operator no-floors panel | inline | inline | inline | `DashboardOperatorNoFloorsPanel` |
| `dashboardError` banner | inline | inline | inline | `DashboardErrorBanner` |
| Email Snackbar | inline | inline | inline | **Out of scope** (hard stop) |

Copy, visibility rules, and inline styles preserved via `dashboardStatusTheme.js` constants.

### M8 — Dashboard ChartLoader (documented / closed)

| Check | basic | advanced | customized |
|-------|:-----:|:--------:|:----------:|
| `bindDashboardChartLoader` | ✓ | ✓ | ✓ |
| Inline `ChartLoader` | ✗ | ✗ | ✗ |
| Spinner `@keyframes` in variant | ✗ | ✗ | ✗ |

No runtime loader duplication remains. No code changes required.

### L1 — Root barrels

| Barrel | Production imports | Action |
|--------|-------------------|--------|
| `shared/dashboard/export/index.js` | 0 | **Deleted** |
| `shared/dashboard/widgets/index.js` | 0 | **Deleted** |

### L2 — Stale container barrel export

| Export | Consumers | Action |
|--------|-----------|--------|
| `buildCustomizedEnergyWidgetRenderContext` | 0 (customized uses `buildEnergyWidgetRenderContext`) | **Removed from barrel** |
| Other `container/index.js` exports | production + tests | Kept |

### L3 — Direct-path-only barrels

| Barrel | Production barrel imports | Action |
|--------|--------------------------|--------|
| `charts/space/index.js` | 0 | **Deleted** |
| `space/transforms/index.js` | 0 | **Deleted** |
| `space/export/index.js` | 0 via barrel (adapters used barrel) | **Deleted**; adapters rewired to `export/spaceExportMenuState` |

### L6 — `OVERVIEW_ALERTS` (documented / left intact)

| Signal | Finding |
|--------|---------|
| `DashboardWidgetRenderer` | Returns `null` for `OVERVIEW_ALERTS` |
| Registry | Maps `alerts` → `OVERVIEW_ALERTS` |
| Runtime alerts UI | Variant-owned (`DashboardOverview` / adapter sections) |
| Tests | `dashboardWidgetRendererParity.test.jsx` asserts intentional null |

**Action:** Document only — branch is a registry placeholder with active test coverage; removal would be a renderer/registry change with no runtime benefit.

### L7 — `legacy*PropsAreEqual` (documented / left intact)

| Symbol | Runtime consumers | Test consumers |
|--------|------------------:|---------------:|
| `legacySpaceLineChartPropsAreEqual` | 0 | ✓ |
| `legacySpaceStackedBarChartPropsAreEqual` | 0 | ✓ |
| `legacyInstantOccupancyChartPropsAreEqual` | 0 | ✓ |
| `legacyLightPowerDensityWidgetPropsAreEqual` | 0 | ✓ |
| `legacyEnergyLineChartPropsAreEqual` | 0 | ✓ (test-local) |

**Action:** Leave untouched per criteria (test consumers exist). Barrel re-exports removed incidentally with `widgets/index.js` and `charts/space/index.js` deletion; parity tests import memo modules directly.

### L9 — Color palette (implemented)

| Variant | Before | After |
|---------|--------|-------|
| basic | inline `COLORS` | `SPACE_CHART_DEFAULT_COLORS` |
| customized | inline `COLORS` | `SPACE_CHART_DEFAULT_COLORS` |
| advanced | inline `DEFAULT_CHART_COLORS` + theme wrapper | `SPACE_CHART_DEFAULT_COLORS` + theme wrapper (unchanged behavior) |

Arrays were byte-identical; advanced theme-aware path preserved.

### L10 — WidgetSlot / Tab memo (documented / left intact)

| Component | Memo | Dedicated comparator |
|-----------|------|-------------------|
| `WidgetSlotRenderer` | `memo` | None |
| `DashboardTabRenderer` | `memo` | None |
| `EnergyLayoutRenderer` | `memo` + comparator | ✓ |
| `DashboardLayoutRenderer` | `memo` + comparator | ✓ |

No measurable duplication; thin wrappers use default shallow `memo` intentionally.

---

## 3. Files Created

```
src/shared/dashboard/components/status/
├── dashboardStatusTheme.js
├── dashboardStatusMemoCompare.js
├── DashboardErrorBanner.jsx
├── DashboardOperatorNoFloorsPanel.jsx
├── DashboardAreaTreeInlineStatus.jsx
├── index.js
└── dashboardStatusPanels.test.jsx

src/shared/dashboard/space/constants/
├── chartPalette.js
└── chartPalette.test.js
```

---

## 4. Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/Dashboard.jsx` | Wired status panels |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | Wired status panels |
| `variants/customized/screens/dashboard/Dashboard.jsx` | Wired status panels |
| `variants/basic/advanced/customized/.../SpaceUtilization.jsx` | Import shared palette |
| `shared/dashboard/container/index.js` | Removed dead export |
| `space/container/adapters/*SpaceContainerAdapter.js` | Direct export menu import |

---

## 5. Files Deleted

| File | Reason |
|------|--------|
| `shared/dashboard/export/index.js` | L1 — zero production consumers |
| `shared/dashboard/widgets/index.js` | L1 — zero production consumers |
| `shared/dashboard/charts/space/index.js` | L3 — direct-path-only consumers |
| `shared/dashboard/space/transforms/index.js` | L3 — direct-path-only consumers |
| `shared/dashboard/space/export/index.js` | L3 — rewired to direct paths |

---

## 6. LOC Delta

| Area | Approx. LOC |
|------|------------:|
| Dashboard status shared module | +200 |
| Dashboard variant inline removal | −180 |
| Barrel files deleted | −150 |
| Palette constant + tests | +25 |
| Adapter import fixes | ±0 |
| **Net (production)** | **≈ −120** |
| **Net (incl. tests)** | **+105** |

---

## 7. Verification Results

### Build

```
npm run build
```

**Result:** PASS — `Compiled successfully.`

### Tests

```
npm test -- --testPathPattern=shared/dashboard
```

| Metric | 6.5A.3 baseline | 6.5B result | Delta |
|--------|----------------:|------------:|------:|
| Suites | 68 | 70 | +2 |
| Tests | 682 | 690 | +8 |
| Failures | 0 | 0 | — |

### Required searches

| Pattern | Result |
|---------|--------|
| `rg "OVERVIEW_ALERTS" src/` | 3 hits — registry + renderer null branch (documented) |
| `rg "legacy.*PropsAreEqual" src/` | 12 hits — all test or definition sites (left intact) |
| `rg "export/index" src/` | 0 hits |
| `rg "widgets/index" src/` | 0 hits |

---

## 8. Stop-Boundary Verification

| Boundary | Status |
|----------|--------|
| No container architecture changes | ✓ |
| No renderer architecture changes | ✓ (L6 documented only) |
| No DnD changes | ✓ |
| No custom graph changes | ✓ |
| No chart implementation changes | ✓ |
| No API changes | ✓ |
| No Redux changes | ✓ |
| Snackbars untouched | ✓ |

---

## 9. Rollback Plan

1. Restore deleted barrel files from git (5 files).
2. Revert `container/index.js` export and adapter import paths.
3. Restore inline status JSX in three `Dashboard.jsx` files.
4. Delete `components/status/` and `space/constants/chartPalette.*`.
5. Restore inline `COLORS` in SpaceUtilization variants.
6. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard` (expect 68 suites / 682 tests).

---

## 10. Success Criteria

| Criterion | Status |
|-----------|--------|
| Build passes | ✓ |
| All existing tests pass | ✓ |
| No behavior changes | ✓ |
| No container changes | ✓ |
| No renderer changes | ✓ |
| No DnD / custom graph / API / Redux changes | ✓ |
| M2 status extraction complete | ✓ |
| M8 loader parity validated | ✓ |
| L1/L3 barrel cleanup | ✓ |
| L6/L7/L10 documented where not removable | ✓ |
