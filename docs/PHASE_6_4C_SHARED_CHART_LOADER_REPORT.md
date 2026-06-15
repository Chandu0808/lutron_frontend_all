# Phase 6.4C — Shared ChartLoader Extraction Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.4B Safe Remove Cleanup  
**Scope:** Extract triplicate inline `ChartLoader` from SpaceUtilization variants into `shared/dashboard/space/components/`

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created shared `ChartLoader` with variant theme presets; replaced inline loaders in basic/advanced/customized `SpaceUtilization.jsx` |
| Architecture changes | **None** — still passed via `runtime.ChartLoader` → `SpaceWidgetRenderer` |
| Container / DnD / export changes | **None** |
| Verification | `npm run build` PASS; **64 suites, 662 tests PASS** (+1 suite, +4 tests) |
| Variant LOC removed | **~99** (33 per variant) |
| Shared module added | **~201** LOC (incl. tests) |

---

## 2. Loader Overlap Analysis (STEP 1)

### 2.1 Pattern classification

| Pattern | Description | basic | advanced | customized |
|---------|-------------|:-----:|:--------:|:----------:|
| **full-card loader** | Flex container filling chart card area with themed background + border | ✓ | ✓ | ✓ |
| **chart-area loader** | Same component; height driven by `chartLoaderHeight` from layout slots | ✓ | ✓ | ✓ |
| **centered spinner** | 40×40 CSS border spinner, `chartLoaderSpin` animation | ✓ | ✓ | ✓ |
| **fixed-height loader** | Default `height='300px'` when no `chartLoaderHeight` passed | ✓ | ✓ | ✓ |

All three variants used the **same structural pattern** — only theme tokens differed.

### 2.2 Pre-extraction differences

| Aspect | basic | advanced | customized |
|--------|-------|----------|------------|
| Container background | `#ffffff` | `CARD_BACKGROUND` + `CARD_SHADOW` (CSS vars) | `#767061` |
| Container border | `1px solid #e5e7eb` | `1px solid #ddd` | `1px solid #ddd` |
| Spinner colors | Light gray (`#e5e7eb` / `#9ca3af`) | Dark (`#555` / `#fff`) | Dark (`#555` / `#fff`) |
| Message text | Not shown | Not shown | Not shown |
| `@keyframes spin` injection | Per-variant `useEffect` | Per-variant `useEffect` | Per-variant `useEffect` |
| Consumption path | `runtime.ChartLoader` → `SpaceWidgetRenderer` | Same | Same |

### 2.3 Out of scope (not replaced)

| Pattern | Location | Reason |
|---------|----------|--------|
| Export dropdown loading text | All variants (`Sending...`, `Downloading...`) | Export UI — hard stop |
| Custom graph `CenterMessage` loader | customized `SpaceUtilization.jsx` | Custom graph pipeline — hard stop |
| `customGraphLoading` state | customized | Custom graph — hard stop |
| Dashboard inline `ChartLoader` | `basic/advanced/customized/Dashboard.jsx` | Dashboard widgets — hard stop |
| Chart view internal spinners | `charts/space/*View.jsx` | Chart adapters — hard stop |

### 2.4 Overlap verdict

**EXACT structural duplicate ×3** with **VARIANT-ONLY theme tokens**. Safe to extract with `shellVariant` presets.

---

## 3. Prop Matrix

| Prop | Type | Default | basic SU | advanced SU | customized SU | Notes |
|------|------|---------|:--------:|:-----------:|:-------------:|-------|
| `height` | `string` | preset `defaultHeight` (`300px`) | via `chartLoaderHeight` | via `chartLoaderHeight` | via `chartLoaderHeight` | Passed by `SpaceWidgetRenderer` |
| `message` | `string` | `undefined` | — | — | — | Supported for future use; SU variants omit |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | `'basic'` | `'basic'` | `'advanced'` | `'customized'` | Pinned via `bindChartLoader()` |
| `fullWidth` | `boolean` | `true` | ✓ | ✓ | ✓ | `width: 100%` on container |
| `minHeight` | `string` | `undefined` | — | — | — | Optional; not used by SU today |

### Theme preset fields (`chartLoaderTheme.js`)

| Field | basic | advanced | customized |
|-------|-------|----------|------------|
| `defaultHeight` | `300px` | `300px` | `300px` |
| `container.backgroundColor` / `background` | `#ffffff` | CSS var gradient | `#767061` |
| `container.border` | `#e5e7eb` | `#ddd` | `#ddd` |
| `container.boxShadow` | — | CSS var shadow | — |
| `spinner` | Light gray ring | Dark ring | Dark ring |
| `message.color` | `rgba(0,0,0,0.87)` | `#fff` | `#fff` |

---

## 4. Files Created

```
src/shared/dashboard/space/components/
├── ChartLoader.jsx              (80 LOC)
├── chartLoaderTheme.js          (75 LOC)
├── chartLoaderMemoCompare.js    (8 LOC)
├── index.js                     (6 LOC)
└── ChartLoader.test.jsx         (32 LOC)
```

**Total new:** 201 LOC

---

## 5. Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/SpaceUtilization.jsx` | Import `bindChartLoader`; module-level `ChartLoader = bindChartLoader('basic')`; removed inline loader + spin `useEffect` |
| `variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Same with `'advanced'` |
| `variants/customized/screens/dashboard/SpaceUtilization.jsx` | Same with `'customized'` |

**Not modified (hard stop):** `SpaceWidgetRenderer`, `SpaceLayoutRenderer`, `SpaceUtilizationContainer`, adapters, DnD, exports, custom graphs, Dashboard.jsx.

---

## 6. LOC Before / After

### Variant shells (inline loader blocks only)

| File | Before (post-6.4B) | After | Δ |
|------|---------------------:|------:|--:|
| `basic/SpaceUtilization.jsx` | 1,766 | 1,733 | **−33** |
| `advanced/SpaceUtilization.jsx` | 601 | 568 | **−33** |
| `customized/SpaceUtilization.jsx` | 5,181 | 5,148 | **−33** |
| **Variant subtotal** | | | **−99** |

### Shared module (new)

| File | LOC |
|------|----:|
| `space/components/*` | **+201** |

### Net project delta

| Metric | Value |
|--------|------:|
| Variant LOC removed | −99 |
| Shared LOC added | +201 |
| **Net** | **+102** |

Net positive LOC is expected: theme presets, memo compare, single keyframe injection, and unit tests replace three copy-pasted inline blocks.

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

**Result:** PASS — **64 suites, 662 tests** (+1 suite, +4 tests vs Phase 6.4B)

### New tests (`ChartLoader.test.jsx`)

| Test | Assertion |
|------|-----------|
| Default render | Basic preset, spinner present |
| Height prop | `data-height` reflects passed value |
| Optional message | Text rendered when `message` provided |
| `bindChartLoader` | Pins `shellVariant` on bound component |

---

## 8. Wiring Diagram

```
SpaceUtilization.jsx (variant)
  const ChartLoader = bindChartLoader('basic' | 'advanced' | 'customized')
       ↓ runtime.ChartLoader
useSpaceUtilizationContainer → adapter.buildWidgetContext
       ↓ context.ChartLoader
SpaceWidgetRenderer
  if (isLoading) return <ChartLoader height={chartLoaderHeight} />
```

No changes to container or renderer code — only the component reference now points to the shared implementation.

---

## 9. Rollback Plan

1. **Full revert:** Restore inline `ChartLoader` + spin `useEffect` in each variant `SpaceUtilization.jsx`; remove `bindChartLoader` imports.
2. **Delete shared module:** Remove `src/shared/dashboard/space/components/` directory.
3. **Verify:** `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

**Single-commit revert** (once committed):

```bash
git revert <phase-6.4c-commit-sha>
```

**Manual file list:**

- Delete: `src/shared/dashboard/space/components/*`
- Restore: `src/variants/{basic,advanced,customized}/screens/dashboard/SpaceUtilization.jsx`

---

## 10. Hard Stop Boundary — Compliance

| Constraint | Status |
|------------|--------|
| No new hooks | ✓ (`bindChartLoader` is a factory, not a hook) |
| No `SpaceWidgetRenderer` changes | ✓ |
| No `SpaceLayoutRenderer` changes | ✓ |
| No `SpaceUtilizationContainer` changes | ✓ |
| No `DashboardContainer` changes | ✓ |
| No DnD / export / custom graph changes | ✓ |
| No chart adapter changes | ✓ |
| ChartLoader extraction only | ✓ |

---

*End of Phase 6.4C report.*
