# Phase 6.2B.1 — LightPowerDensityWidget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** `light_power_density` widget metric panel (`renderLightingPowerDensity`)

---

## Summary

Extracted duplicated `renderLightingPowerDensity()` from all three `Dashboard.jsx` variants into `src/shared/dashboard/widgets/`. Variants now use thin `LightPowerDensityWidget` wrappers (~10 LOC each). Slot shells (title, unit selector, drag wrapper) remain in variant monoliths per scope.

**Out of scope (unchanged):** Redux slices/selectors/thunks, API calls, exports/emails, `DashboardOverview`, `SpaceUtilization`, widget ordering, drag/drop, custom graphs.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/LightPowerDensityWidget.jsx` | Adapter: status, display resolution, theme wiring |
| `src/shared/dashboard/widgets/LightPowerDensityCard.jsx` | Presentational loading/ready metric panel |
| `src/shared/dashboard/widgets/lightPowerDensityTheme.js` | Basic/advanced/customized theme presets |
| `src/shared/dashboard/widgets/lightPowerDensityMemoCompare.js` | React.memo comparator + parity helpers |
| `src/shared/dashboard/widgets/index.js` | Barrel exports |
| `src/shared/dashboard/widgets/lightPowerDensityParity.test.js` | Display/status/theme/memo parity |
| `src/shared/dashboard/widgets/LightPowerDensityCard.test.jsx` | Card shell state tests |

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replaced ~86-line inline renderer with adapter wrapper |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Replaced ~87-line inline renderer with adapter wrapper |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Replaced ~103-line inline renderer with adapter wrapper |

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| Status machine (`allEnergyChartsReady` + loading flag + payload) | **100%** |
| Display resolution (`watt_per_sqft` / `watt_per_sqm` + null handling) | **100%** |
| Loading spinner structure | **~90%** (theme tokens differ) |
| Ready value typography | **100%** |
| Theme / layout tokens | **~70%** (basic light/dark, advanced CSS vars + border, customized fill + unit subtitle) |
| **Weighted duplication removed** | **~92%** |

---

## Prop Matrix

### Shared props (all variants)

| Prop | Type | Source |
|------|------|--------|
| `lightPowerDensity` | API payload | `selectLightPowerDensity` |
| `lightingUnit` | string | local `useState` |
| `allEnergyChartsReady` | boolean | parent closure |
| `chartLoadingLightPowerDensity` | boolean | `chartLoading.lightPowerDensity` |
| `isLargeScreen` | boolean | parent breakpoint |

### Variant-only props

| Prop | Basic | Advanced | Customized |
|------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| `chartSurface` | `"light"` / `"dark"` (`energyMetricLight`) | — | — |
| `metricPanelBorder` | — | `getThemeAwareMetricPanelBorder(...)` | — |

### Variant shell (stays in `Dashboard.jsx`)

| Concern | Owner |
|---------|-------|
| Card title + `getWidgetTitle` | Variant slot shell |
| Unit `<select>` / MUI `Select` | Variant slot shell |
| `LongPressDraggable` / `buildEnergyBuiltinRender` | Variant slot shell |
| Outer metric card chrome | Variant slot shell |

---

## LOC Before / After

### Variant `Dashboard.jsx`

| File | Before | After | Removed |
|------|--------|-------|---------|
| `basic/Dashboard.jsx` | 5,725 | 5,650 | **−75** |
| `advanced/Dashboard.jsx` | 4,893 | 4,817 | **−76** |
| `customized/Dashboard.jsx` | 7,100 | 7,007 | **−93** |
| **Total variant** | **17,718** | **17,474** | **−244** |

### Shared production modules added

| File | LOC |
|------|-----|
| `LightPowerDensityWidget.jsx` | 95 |
| `LightPowerDensityCard.jsx` | 95 |
| `lightPowerDensityTheme.js` | 95 |
| `lightPowerDensityMemoCompare.js` | 58 |
| `index.js` | 17 |
| **Total production** | **354** |

### Tests added

| File | LOC | Tests |
|------|-----|-------|
| `lightPowerDensityParity.test.js` | 165 | 12 |
| `LightPowerDensityCard.test.jsx` | 65 | 4 |

**Net monolith reduction:** ~244 LOC  
**Net codebase delta:** +110 LOC (shared modules − variant removal, excluding tests)

---

## Parity Verification

| Check | Result |
|-------|--------|
| Display resolution (`legacy === shared`) | PASS — sqft, sqm, null, error, missing payload |
| Status machine (loading / ready) | PASS |
| Theme presets (basic light/dark, advanced border, customized subtitle) | PASS |
| Memo comparator | PASS |
| Card shell states (loading, ready, no-data, customized subtitle) | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 27 passed, 27 total
Tests:       225 passed, 225 total  (+16 new)
```

```
npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. **Revert variant wrappers** — restore inline `renderLightingPowerDensity()` in all three `Dashboard.jsx` files and remove `LightPowerDensityWidget` imports.
2. **Remove shared modules** — delete `src/shared/dashboard/widgets/LightPowerDensity*.jsx`, `lightPowerDensity*.js`, and tests.
3. **Verify** — run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.
4. **Git** — single revert commit of this phase's file set if changes were committed together.

No Redux, routing, or API contract changes were made; rollback is UI-only and low risk.

---

## Architecture

```
Dashboard.jsx slot shell (title, unit select, drag — variant-owned)
  └── renderLightingPowerDensity()
        └── LightPowerDensityWidget (memo adapter)
              ├── resolveLightPowerDensityTheme
              ├── resolveLightPowerDensityStatus
              ├── resolveLightPowerDensityDisplay
              └── LightPowerDensityCard
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- Any other widget extraction (`savings_by_strategy`, `consumption`, etc.)
- Slot shell / drag / export extraction
- `DashboardOverview` work
