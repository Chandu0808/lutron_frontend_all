# Phase 6.4D — SpaceUtilization Status Panels Extraction Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.4C Shared ChartLoader Extraction  
**Scope:** Extract triplicate status/error banners from SpaceUtilization variants into shared presentation components

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `SpaceStatusPanel`, `SpaceErrorPanel`, `SpaceEmptyPanel` with variant theme presets; replaced duplicated shell banners in all three `SpaceUtilization.jsx` files; wired basic empty-state delegate |
| Architecture changes | **None** — panels remain above `SpaceUtilizationContainer` in variant shells |
| Container / DnD / export / custom graph changes | **None** |
| Verification | `npm run build` PASS; **65 suites, 666 tests PASS** (+1 suite, +4 tests) |
| Variant LOC removed | **~180** (shell banners + dead commented blocks) |
| Shared module added | **~300** LOC (incl. tests) |

---

## 2. Status Panel Overlap Analysis (STEP 1)

### 2.1 Classification

| Type | Description | basic | advanced | customized | Extracted? |
|------|-------------|:-----:|:--------:|:----------:|:----------:|
| **error** | Redux `dashboardError` banner (red) | ✓ | ✓ | ✓ | ✓ → `SpaceErrorPanel` |
| **unavailable** | `hasApiErrors()` partial-failure banner (amber) | ✓ | ✓ | ✓ | ✓ → `SpaceStatusPanel` (`tone="warning"`) |
| **loading** | `dashboardLoading` banner (blue) | commented | commented | commented | Removed dead commented blocks |
| **pending** | Area-loading banner (yellow) | commented | commented | commented | Removed dead commented blocks |
| **no-data** | “No widgets visible” empty layout state | ✓ (layout delegate) | — | — | ✓ → `SpaceEmptyPanel` in `basicSpaceLayoutSlots` |

### 2.2 Duplicate vs variant-themed

| Panel | Duplicate type | Notes |
|-------|----------------|-------|
| Dashboard error banner | **EXACT** ×3 | Identical colors, padding, copy |
| API failure banner | **EXACT** ×3 | Identical colors, padding, copy |
| Commented loading/pending | **EXACT** ×3 (dead) | Deleted — not active runtime |
| Widget visibility empty state | **basic only** | MUI theme tokens; extracted to `SpaceEmptyPanel` with `shellVariant="basic"` |

### 2.3 Out of scope (not replaced)

| Pattern | Location | Reason |
|---------|----------|--------|
| Snackbar / Alert block | All `SpaceUtilization.jsx` | Hard stop — snackbar content |
| Export loading text (`Sending...`) | All variants | Export status — hard stop |
| `CenterMessage` in custom graph cards | customized `SpaceUtilization.jsx` | Custom graph pipeline — hard stop |
| `customGraphLoading` / `customGraphError` | customized | Custom graph — hard stop |
| Dashboard.jsx error panels | `Dashboard.jsx` | Dashboard status — hard stop |
| Chart view empty/loading shells | `charts/space/*` | Chart adapters — hard stop |

---

## 3. Prop Matrix

### SpaceStatusPanel

| Prop | Type | Default | Used by |
|------|------|---------|---------|
| `tone` | `'error' \| 'warning' \| 'loading' \| 'pending' \| 'unavailable'` | `'warning'` | API failure banner |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | `'basic'` | Variant shell |
| `title` | `ReactNode` | — | Primary message |
| `subtitle` | `ReactNode` | — | Secondary message |
| `children` | `ReactNode` | — | Optional extra content |

### SpaceErrorPanel

| Prop | Type | Default | Used by |
|------|------|---------|---------|
| `message` | `string \| object` | — | Redux `dashboardError` |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | `'basic'` | Variant shell |
| `subtitle` | `string` | `'Check console for detailed debugging information'` | Error helper text |

### SpaceEmptyPanel

| Prop | Type | Default | Used by |
|------|------|---------|---------|
| `title` | `string` | — | Empty-state heading |
| `subtitle` | `string` | — | Empty-state body |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized'` | `'basic'` | Theme preset for dashed panel |

### Theme tones (`spaceStatusTheme.js`)

| Tone | Background | Border | Text |
|------|------------|--------|------|
| `error` | `rgba(239, 68, 68, 0.1)` | `#ef4444` | `#ef4444` |
| `warning` / `unavailable` | `rgba(245, 158, 11, 0.1)` | `#f59e0b` | `#f59e0b` |
| `loading` | `rgba(59, 130, 246, 0.1)` | `#3b82f6` | `#3b82f6` |
| `pending` | `rgba(255, 193, 7, 0.1)` | `#ffc107` | `#ffc107` |

Shell presets define responsive banner padding/fonts (shared across variants today) and variant-specific empty-panel surfaces.

---

## 4. Files Created

```
src/shared/dashboard/space/components/status/
├── SpaceStatusPanel.jsx           (42 LOC)
├── SpaceErrorPanel.jsx            (31 LOC)
├── SpaceEmptyPanel.jsx            (49 LOC)
├── spaceStatusTheme.js            (100 LOC)
├── spaceStatusMemoCompare.js      (22 LOC)
├── index.js                       (9 LOC)
└── spaceStatusPanels.test.jsx     (47 LOC)
```

**Total new:** ~300 LOC

Also updated: `src/shared/dashboard/space/components/index.js` — re-exports status module.

---

## 5. Files Modified

| File | Change |
|------|--------|
| `variants/basic/screens/dashboard/SpaceUtilization.jsx` | `SpaceErrorPanel` + `SpaceStatusPanel`; removed inline banners + commented dead blocks |
| `variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Same with `shellVariant="advanced"` |
| `variants/customized/screens/dashboard/SpaceUtilization.jsx` | Same with `shellVariant="customized"` |
| `variants/basic/screens/dashboard/basicSpaceLayoutSlots.jsx` | `renderBasicSpaceEmptyState` → `SpaceEmptyPanel` |

**Not modified:** `SpaceWidgetRenderer`, `SpaceLayoutRenderer`, `SpaceUtilizationContainer`, adapters, DnD, exports, custom graphs.

---

## 6. LOC Before / After

### Variant shells

| File | Before (6.4C) | After | Δ |
|------|----------------:|------:|--:|
| `basic/SpaceUtilization.jsx` | 1,733 | 1,673 | **−60** |
| `advanced/SpaceUtilization.jsx` | 568 | 508 | **−60** |
| `customized/SpaceUtilization.jsx` | 5,148 | 5,088 | **−60** |
| `basicSpaceLayoutSlots.jsx` | ~377 | 364 | **−13** |
| **Variant subtotal** | | | **~−193** |

### Shared module (new)

| Path | LOC |
|------|----:|
| `space/components/status/*` | **+300** |

### Net project delta

| Metric | Value |
|--------|------:|
| Variant LOC removed | ~−193 |
| Shared LOC added | +300 |
| **Net** | **+107** |

Net positive LOC reflects shared module structure, theme presets, memo compares, and tests replacing three copy-pasted banner blocks.

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

**Result:** PASS — **65 suites, 666 tests** (+1 suite, +4 tests vs Phase 6.4C)

### New tests (`spaceStatusPanels.test.jsx`)

| Test | Assertion |
|------|-----------|
| `SpaceStatusPanel` warning | Renders tone, title, subtitle |
| `SpaceErrorPanel` | Prefixes `Error:` to message |
| `SpaceErrorPanel` null guard | Returns null without message |
| `SpaceEmptyPanel` | Renders title/subtitle with shell variant |

Existing `spaceLayoutRendererParity` and container parity tests pass unchanged.

---

## 8. Wiring Example

```jsx
// SpaceUtilization.jsx (all variants)
import { SpaceErrorPanel, SpaceStatusPanel } from '.../space/components/status';

<SpaceErrorPanel message={dashboardError} shellVariant="basic" />

{hasApiErrors() && (
  <SpaceStatusPanel
    tone="warning"
    shellVariant="basic"
    title="Some data endpoints are experiencing issues"
    subtitle="Some charts may display limited or no data. Please try again later."
  />
)}
```

```jsx
// basicSpaceLayoutSlots.jsx
<SpaceEmptyPanel
  shellVariant="basic"
  title="No Space Utilization widgets are visible"
  subtitle={isCharts ? '...' : '...'}
/>
```

---

## 9. Rollback Plan

1. Restore inline `Box` banners in each `SpaceUtilization.jsx` from git history.
2. Restore `renderBasicSpaceEmptyState` inline JSX in `basicSpaceLayoutSlots.jsx`.
3. Delete `src/shared/dashboard/space/components/status/` directory.
4. Revert `space/components/index.js` status re-exports.
5. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

**Single-commit revert** (once committed):

```bash
git revert <phase-6.4d-commit-sha>
```

---

## 10. Hard Stop Boundary — Compliance

| Constraint | Status |
|------------|--------|
| No new hooks | ✓ |
| No `SpaceWidgetRenderer` changes | ✓ |
| No `SpaceLayoutRenderer` changes | ✓ |
| No `SpaceUtilizationContainer` changes | ✓ |
| No `DashboardContainer` changes | ✓ |
| No export / DnD / custom graph changes | ✓ |
| No chart adapter changes | ✓ |
| Status panel extraction only | ✓ |

---

*End of Phase 6.4D report.*
