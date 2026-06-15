# Phase 6.5A.1 — Dashboard ChartLoader Extraction Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 7.0 opportunity assessment (6.5 package item #3)  
**Scope:** Mirror Phase 6.4C for Dashboard variants — presentation-only extraction

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `shared/dashboard/components/ChartLoader`; replaced inline loaders in basic/advanced/customized `Dashboard.jsx` |
| Architecture changes | **None** — `runtime.ChartLoader` wiring unchanged |
| Container / renderer / export / DnD changes | **None** |
| Verification | `npm run build` PASS; **66 suites, 670 tests PASS** (+1 suite, +4 tests vs 6.4E) |
| Variant LOC removed | **~135** (~45 per Dashboard variant) |
| Shared module added | **~236** LOC (incl. tests) |

---

## 2. Loader Overlap Analysis (STEP 1)

### 2.1 Overlap matrix

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|----------------|
| full-card loader | ✓ | ✓ | ✓ | **EXACT** — flex column, centered |
| chart-area loader | ✓ (`height` prop) | ✓ | ✓ | **EXACT** |
| spinner CSS | 40×40 border ring | same | same | **EXACT** |
| keyframe injection | per-variant `useEffect` | same | same | **EXACT duplicate** (removed) |
| height handling | default `300px` | same | same | **EXACT** |
| theme tokens | `light` prop (white/blue vs `#767061`) | `transparent` bg | `#767061` bg | **Theme-only** |
| default message | `"Loading chart data..."` | same | same | **EXACT** |

### 2.2 Theme preset summary

| Variant | Container | Spinner | Message color | Notes |
|---------|-----------|---------|---------------|-------|
| basic (dark) | `#767061`, `#ddd` border | `#555` / `#fff` | `#fff` | Default |
| basic (`light={true}`) | `#ffffff`, `#e0e0e0` border | `#e0e0e0` / `#1565C0` | `rgba(0,0,0,0.87)` | Via `loaderLight` from energy themes |
| advanced | `transparent`, `#ddd` border | `#555` / `#fff` | `#fff` | Matches pre-extraction |
| customized | `#767061`, `#ddd` border | `#555` / `#fff` | `#fff` | Matches pre-extraction |

### 2.3 Runtime consumption (unchanged)

```
Dashboard.jsx
  const ChartLoader = bindDashboardChartLoader('basic' | 'advanced' | 'customized')
       ↓ runtime.ChartLoader / widget props
EnergyChartCardShell / PieChartCardShell / SavingsStrategyChartView
       ↓ LoaderComponent
UnifiedEnergyWidget / chart adapters
       ↓
DashboardWidgetRenderer (indirect via widget loading states)
```

No changes to `DashboardContainer`, `useDashboardContainer`, `DashboardWidgetRenderer`, or chart adapters.

### 2.4 Out of scope

| Item | Reason |
|------|--------|
| `space/components/ChartLoader` | Separate surface (6.4C); no message by default on SU |
| Custom graph loaders | Hard stop |
| SpaceUtilization `bindChartLoader` | Already extracted in 6.4C |

---

## 3. Prop Matrix

| Prop | Type | Default | basic | advanced | customized |
|------|------|---------|:-----:|:--------:|:----------:|
| `height` | `string` | `300px` | ✓ | ✓ | ✓ |
| `message` | `string` | `"Loading chart data..."` | ✓ | ✓ | ✓ |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | `'basic'` | pinned via factory | pinned | pinned |
| `light` | `boolean` | `false` | ✓ (energy light themes) | — | — |
| `fullWidth` | `boolean` | `true` | ✓ | ✓ | ✓ |
| `minHeight` | `string` | — | optional | optional | optional |

---

## 4. Files Created

```
src/shared/dashboard/components/
├── ChartLoader.jsx              (86 LOC)
├── chartLoaderTheme.js          (102 LOC)
├── chartLoaderMemoCompare.js    (9 LOC)
├── index.js                     (7 LOC)
└── DashboardChartLoader.test.jsx (32 LOC)
```

**Total new:** ~236 LOC

Exports: `ChartLoader`, `bindDashboardChartLoader`, theme constants, `resolveDashboardChartLoaderPreset`.

---

## 5. Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/Dashboard.jsx` | `bindDashboardChartLoader('basic')`; removed inline loader + spin/pulse `useEffect` |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | `bindDashboardChartLoader('advanced')`; same removals |
| `variants/customized/screens/dashboard/Dashboard.jsx` | `bindDashboardChartLoader('customized')`; same removals |

---

## 6. LOC Before / After

### Dashboard variants

| File | Before (7.0) | After | Δ |
|------|-------------:|------:|--:|
| `basic/Dashboard.jsx` | 3,727 | 3,682 | **−45** |
| `advanced/Dashboard.jsx` | 3,281 | 3,236 | **−45** |
| `customized/Dashboard.jsx` | 5,210 | 5,165 | **−45** |
| **Variant subtotal** | | | **−135** |

### Shared module (new)

| Path | LOC |
|------|----:|
| `shared/dashboard/components/*` | **+236** |

### Net project delta

| Metric | Value |
|--------|------:|
| Variant LOC removed | −135 |
| Shared LOC added | +236 |
| **Net** | **+101** |

Net positive reflects theme presets, `light` surface support, memo compare, tests, and single keyframe injection replacing three duplicate blocks.

---

## 7. Test Results

### Build

```
npm run build
```

**Result:** PASS — `Compiled successfully.`

### Tests

```
npm test -- --testPathPattern=shared/dashboard --watchAll=false
```

**Result:** PASS — **66 suites, 670 tests** (+1 suite, +4 tests vs Phase 6.4E)

### New tests (`DashboardChartLoader.test.jsx`)

| Test | Assertion |
|------|-----------|
| Default basic render | Default message + spinner |
| `light` prop | `data-light="true"` on basic |
| Height prop | `data-height` reflects value |
| `bindDashboardChartLoader` | Pins `shellVariant` |

Existing widget/chart parity tests (e.g. `loaderLight` expectations) pass unchanged.

---

## 8. Relationship to Phase 6.4C

| Aspect | Space (`space/components`) | Dashboard (`dashboard/components`) |
|--------|--------------------------|-----------------------------------|
| Factory | `bindChartLoader` | `bindDashboardChartLoader` |
| Default message | omitted | `"Loading chart data..."` |
| `light` prop | no | yes (basic only) |
| Animation name | `chartLoaderSpin` | `dashboardChartLoaderSpin` |
| Style element id | `shared-chart-loader-spin-keyframes` | `shared-dashboard-chart-loader-spin-keyframes` |

Intentionally parallel architecture, separate modules to avoid coupling dashboard energy shells to space widget renderer.

---

## 9. Rollback Plan

1. Restore inline `ChartLoader` + `useEffect` spin blocks in each `Dashboard.jsx` from git history.
2. Remove `bindDashboardChartLoader` imports and module-level `ChartLoader` constants.
3. Delete `src/shared/dashboard/components/` directory.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

**Single-commit revert** (once committed):

```bash
git revert <phase-6.5a.1-commit-sha>
```

---

## 10. Hard Stop Boundary — Compliance

| Constraint | Status |
|------------|--------|
| Presentation-only | ✓ |
| No renderer changes | ✓ |
| No container/orchestration changes | ✓ |
| No export / DnD / widget / chart adapter changes | ✓ |
| No area-tree / custom-graph changes | ✓ |
| Runtime wiring unchanged | ✓ |

---

*End of Phase 6.5A.1 report.*
