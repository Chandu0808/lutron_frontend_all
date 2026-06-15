# Phase 6.3D — Space Export Orchestration Hook Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3C shared space view components  
**Scope:** Centralize SpaceUtilization export/email orchestration only (mirrors Dashboard 6.2C.3)

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Extracted duplicated `handleExport` orchestration from basic/advanced/customized `SpaceUtilization.jsx` into `useSpaceExports` |
| Variant LOC removed | **−288** gross (−108 basic, −89 advanced, −91 customized vs 6.3C) |
| Shared export module added | **426** production + **263** test LOC |
| UI changes | **None** — export dropdown JSX, buttons, and email-dialog flow unchanged |
| Verification | `npm run build` PASS; **57 suites, 597 tests PASS** (+16 new) |

---

## 2. Overlap Analysis (STEP 1 Audit)

### 2.1 Classification by widget

| Widget | dropdownKey | basic | advanced | customized | Overlap |
|--------|-------------|:-----:|:--------:|:----------:|:-------:|
| `utilization` | `line` | ✓ | ✓ | ✓ | **EXACT** |
| `utilization_by_area_group` | `pie` | ✓ | ✓ | ✓ | **EXACT** |
| `utilization_by_area` | `table` | ✓ | ✓ | ✓ | **EXACT** |
| `instant_occupancy_count` | `instant` | ✓ | ✓ | ✓ | **EXACT** |
| `instant_utilization_combined` | `instantCombined` | ✓ | — | — | **VARIANT-ONLY** (basic) |
| `peak_and_minimum_utilization` | `peak` | UI commented | UI commented | UI commented | **VARIANT-ONLY** (dead UI; routing exists if invoked) |

### 2.2 Orchestration blocks

| Block | basic | advanced | customized | Classification |
|-------|-------|----------|------------|----------------|
| `handleExport(action, chartTitle, dropdownKey)` | ~100 LOC | ~100 LOC | ~100 LOC | **EXACT** |
| Thunk map (12 space thunks) | inline | inline | inline | **EXACT** |
| `buildChartApiParams` call | no `selectedGroupIds` | no `selectedGroupIds` | includes `selectedGroupIds` | **NEAR** |
| Email success message | `` `${chartTitle} report sent...` `` | `Email sent successfully!` | `Email sent successfully!` | **NEAR** (preset) |
| Download success message | `` `${chartTitle} report downloaded...` `` | `Download started successfully!` | same as advanced | **NEAR** |
| Outside-click profile | `data-export-menu` + panel | `data-chart-export` + class | Export text + `#CDC0A0` panel | **VARIANT-ONLY** |
| Default menu state | includes `instantCombined` | 5 keys | 5 keys | **VARIANT-ONLY** |
| `handleEmailDialogOpen` | variant-local | variant-local | variant-local | **Not moved** (email server guard) |

### 2.3 Not extracted (per stop boundary)

- `ExportDropdown` JSX components
- `ChartExportButton` / `ChartExportDropdown` (advanced)
- Custom graph export pipeline (customized)
- `resolveSpaceExportThunks` routing map (already shared in `export/spaceExportActionMap.js`)
- Redux thunks / API contracts
- Dashboard `useDashboardExports`

---

## 3. Export Matrix

### 3.1 Thunk routing (`resolveSpaceExportThunks` — unchanged)

| Widget / key | Charts tab | Main tab |
|--------------|------------|----------|
| Instant (`instant`, `instantCombined`) | instant occupancy thunks | occupancy count thunks |
| Area group (`pie`) | `*_from_logs` group thunks | regular group thunks |
| Utilization by area (`table` / title) | `*_from_logs` per-area thunks | regular per-area thunks |
| Utilization line (`line` / title) | occupancy count thunks | occupancy count thunks |

### 3.2 `useSpaceExports` props

| Prop | basic | advanced | customized |
|------|-------|----------|------------|
| `dispatch` | ✓ | ✓ | ✓ |
| `showSnackbar` | ✓ | ✓ | ✓ |
| `showChartsTab` | ✓ | ✓ | ✓ |
| `selection.selectedAreas` | ✓ | ✓ | ✓ |
| `selection.selectedFloorIds` | ✓ | ✓ | ✓ |
| `selection.selectedGroupIds` | — | — | ✓ |
| `selection.selectedDuration` | ✓ | ✓ | ✓ |
| `selection.customDateRange` | ✓ | ✓ | ✓ |
| `selection.isNavigating` | ✓ | ✓ | ✓ |
| `thunks` (12 space export thunks) | ✓ | ✓ | ✓ |
| `openEmailDialog` | `handleEmailDialogOpen` | same | same |
| `messagePreset` | `basic` | `advanced` | `customized` |
| `defaultDropdownState` | `DEFAULT_SPACE_EXPORT_DROPDOWN_BASIC` | `DEFAULT_SPACE_EXPORT_DROPDOWN_STANDARD` | same |
| `outsideClickProfile` | `SPACE_EXPORT_OUTSIDE_CLICK_PROFILES.basic` | `createSpaceExportOutsideClickProfile(CHART_EXPORT_DROPDOWN_CLASS)` | `SPACE_EXPORT_OUTSIDE_CLICK_PROFILES.customized` |
| `outsideClickEvent` | `mousedown` (default) | same | same |

### 3.3 Hook return (consumed by variant export UI)

| Return key | Purpose |
|------------|---------|
| `showExportDropdown` / `setShowExportDropdown` | Per-menu open state |
| `exportLoading` / `setExportLoading` | Per-action loading map |
| `handleExport` | Unified email/download orchestration |
| `buildSpaceExportLoadingKey` | `` `${chartTitle}_${action}` `` helper |
| `isChartExportLoading` | Loading lookup by chart title + action |

---

## 4. Files Created

```
src/shared/dashboard/space/export/
├── spaceExportResolvers.js
├── spaceExportMenuState.js
├── useSpaceExports.js
├── spaceExportParity.test.js
└── index.js
```

**Reused (unchanged):**

- `shared/dashboard/export/spaceExportActionMap.js` → `resolveSpaceExportThunks`
- `shared/dashboard/export/buildChartApiParams.js`
- `shared/dashboard/export/chartExportResults.js`

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` | Replaced `handleExport` + menu state + outside-click effect with `useSpaceExports` |
| `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` | Same |
| `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` | Same (+ `selectedGroupIds` in selection) |

---

## 6. LOC Before / After

### Variant `SpaceUtilization.jsx` (vs 6.3C)

| Variant | 6.3C | 6.3D | Δ |
|---------|-----:|-----:|--:|
| basic | 2,620 | 2,512 | **−108** |
| advanced | 1,262 | 1,173 | **−89** |
| customized | 5,613 | 5,522 | **−91** |
| **Total** | **9,495** | **9,207** | **−288** |

### Shared `space/export/` (new in 6.3D)

| Category | LOC |
|----------|----:|
| Production | 426 |
| Tests | 263 |
| **Total** | **689** |

### Net codebase delta (6.3D only)

| Metric | Value |
|--------|------:|
| Variant LOC removed | −288 |
| Export module added | +689 |
| **Net** | **+401** |

---

## 7. Tests Added

| File | Tests | Coverage |
|------|------:|----------|
| `spaceExportParity.test.js` | 16 | API params, utilization/area-group/area/instant/combined routing, peak title routing, email/download outcomes, runners, menu helpers, message presets |

**Suite delta:** 581 → **597** tests (+16) across `shared/dashboard`.

---

## 8. Parity Verification

### Build

```
npm run build → Compiled successfully
```

### Tests

```
npm test -- --testPathPattern=shared/dashboard
→ 57 suites passed, 597 tests passed
```

### Behavioral parity checklist

| Concern | Status |
|---------|--------|
| Charts-tab vs main-tab thunk routing | ✓ via existing `resolveSpaceExportThunks` |
| Customized `selectedGroupIds` in API params | ✓ `buildSpaceExportApiParams` |
| Basic chart-title success messages | ✓ `messagePreset: 'basic'` |
| Advanced/customized generic messages | ✓ preset |
| Email payload error handling | ✓ `resolveSpaceEmailExportOutcome` |
| Loading keys `` `${chartTitle}_${action}` `` | ✓ preserved |
| Outside-click menu close | ✓ variant profiles |
| Export dropdown JSX | ✓ unchanged in variants |

---

## 9. Stop Boundary Compliance

| Constraint | Status |
|------------|--------|
| No `SpaceWidgetRenderer` | ✓ |
| No `SpaceLayoutRenderer` | ✓ |
| No `SpaceUtilizationContainer` | ✓ |
| No export JSX move | ✓ |
| No export API changes | ✓ |
| No chart adapter changes | ✓ |
| No custom graph export move | ✓ |
| No Dashboard export changes | ✓ |

---

## 10. Rollback Plan

### Full rollback (6.3D only)

1. Delete `src/shared/dashboard/space/export/` directory
2. Restore `handleExport`, `showExportDropdown`/`exportLoading` state, and outside-click `useEffect` in all three `SpaceUtilization.jsx` files from git
3. Restore `buildChartApiParams` / `resolveSpaceExportThunks` imports in variants
4. Delete this report
5. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`

### Partial rollback

- Keep `spaceExportResolvers.js` but revert variant wiring to inline `handleExport` if a single variant regresses

---

## 11. Next Phase Preview (not started)

Per 6.3A roadmap:

- **6.3E+:** `SpaceWidgetRenderer`, `SpaceLayoutRenderer`, `SpaceUtilizationContainer`
- Optional: `SpaceChartExportDropdown` shared JSX (out of 6.3D scope)

---

## 12. Recommendation

Phase 6.3D is **complete**. Space export orchestration is centralized in `useSpaceExports` with variant-specific message presets and outside-click profiles. Variants now pass selection context, thunks, and `handleEmailDialogOpen` only — export UI remains local.
