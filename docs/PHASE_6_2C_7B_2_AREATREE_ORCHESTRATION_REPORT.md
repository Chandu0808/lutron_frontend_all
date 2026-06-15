# Phase 6.2C.7B.2 — AreaTree Orchestration Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Prerequisite:** Phase 6.2C.7B.1 GREEN helpers (`areaTreeTraversal.js`, `areaTreeSelectionHelpers.js`)  
**Scope:** YELLOW AreaTree orchestration — Set/Clear, selection text, load-all planning, checkbox resolution

---

## Executive Summary

Remaining duplicated AreaTree orchestration across basic, advanced, and customized `Dashboard.jsx` files was extracted into four new pure modules under `src/shared/dashboard/filters/`. Variants now use thin `applyAreaTreeSet` / `applyAreaTreeClearAll` closures and shared resolvers for checkbox toggles and ribbon labels.

**Preserved:** `renderTreeNode`, dropdown JSX, handler signatures, customized `persistentAreaNames` side effects, `customWidgetFilters` mixed-scope Set logic, custom-graph code (untouched).

**Verification:** `npm run build` PASS · `npm test -- --testPathPattern=shared/dashboard` → **47 suites, 488 tests** PASS (+31 new)

---

## 1. Duplication Audit (Step 1)

| Subsystem | basic | advanced | customized | Overlap | Classification |
|-----------|:-----:|:--------:|:----------:|:-------:|----------------|
| Set button commit logic | ✓ | ✓ | ✓ extended | basic≈adv **100%** | **YELLOW** → `buildSelectAllResolution` |
| Clear All commit logic | ✓ | ✓ | ✓ +`customWidgetFilters` | **~95%** | **YELLOW** → `buildClearAllResolution` |
| `getAreaSelectionText` | ✓ | ✓ | ✓ extended | basic≈adv **100%** | **YELLOW** → `areaTreeSelectionText.js` |
| Floor selection label | ✓ | ✓ | ✓ (joined) | **100%** | `getFloorSelectionText` |
| Group selection label | ✓ | ✓ | ✓ names | **~60%** | `getGroupSelectionText` |
| Area summary label | ✓ | ✓ | ✓ | **~85%** | `getAreaSummaryText` |
| `loadAllAreasFromAllFloors` | ✓ | ✓ | ✓ +maps | **~70%** | **YELLOW** → `processFloorPayloadForAreaLoad` |
| Area checkbox toggle | ✓ | ✓ | ✓ +name map | **~90%** | `resolveAreaToggleSelection` |
| Group checkbox toggle | ✓ | ✓ | ✓ | **100%** | `resolveGroupToggleSelection` |
| Intermediate parent toggle | ✓ | ✓ | ✓ +name map | **~90%** | `resolveIntermediateParentToggle` |
| Floor deselect areas | ✓ | ✓ | ✓ | **100%** | `resolveFloorDeselectAreas` |
| Floor select areas merge | ✓ | ✓ | — (no auto-select) | basic≈adv | `resolveFloorSelectAreas` |
| Node checkbox state | ✓ | ✓ | ✓ | **100%** (7B.1) | `resolveAreaTreeCheckboxState` |

### Exact duplicates (basic ≡ advanced)

- Set/Clear Redux commit branches (floor-priority over areas)
- `getAreaSelectionText` priority chain (floors → groups → areas → project name)
- Checkbox toggle math (area/group/intermediate)
- `loadAllAreasFromAllFloors` flatten-only collection loop

### Near duplicates

- Advanced `getAreasForFloor` used `Array.isArray` roots (already unified in 7B.1 `getTreeRoots`)

### Customized-only behavior (preserved via options)

| Behavior | Mechanism |
|----------|-----------|
| `searchTree` + `areaGroups` group resolution | `getAllAreasFromGroup` context (7B.1) |
| Multi-part ribbon labels (`Floor · groups · areas`) | `variant: 'customized'` in `getAreaSelectionText` |
| `setCustomWidgetFilters` mixed floor/area split on Set | `buildSelectAllResolution({ variant: 'customized', areaIdToFloorId })` |
| `customWidgetFilters: null` on Clear | `buildClearAllResolution({ includeCustomWidgetFilters: true })` |
| Full-tree area→floor + name mapping on bulk load | `processFloorPayloadForAreaLoad` + `buildAreaMappingsFromFloorPayload` |
| `persistentAreaNames` on area/intermediate select | **Variant-owned** in customized handlers (RED, not moved) |
| Floor checkbox does not auto-select all areas | **Variant-owned** (customized handler unchanged) |

---

## 2. Files Created

| File | LOC | Responsibility |
|------|-----|----------------|
| `areaTreeSelectionText.js` | 256 | `getAreaSelectionText`, `getFloorSelectionText`, `getGroupSelectionText`, `getAreaSummaryText` |
| `areaTreeBulkActions.js` | 352 | `buildSelectAllResolution`, `buildClearAllResolution`, `loadAllAreasFromAllFloors`, mapping/load helpers |
| `areaTreeSelectionResolvers.js` | 202 | Toggle + floor deselect/select + committed ID resolvers |
| `areaTreeStateResolvers.js` | 67 | `resolveAreaTreeCheckboxState`, `resolveAreaTreeSelectionState`, `resolveAreaTreeSummaryState` |
| `areaTreeSelectionText.test.js` | 68 | Label priority + customized join |
| `areaTreeBulkActions.test.js` | 108 | Set/Clear/load/mapping |
| `areaTreeSelectionResolvers.test.js` | 98 | Toggle + floor deselect |
| `areaTreeStateResolvers.test.js` | 48 | Summary/checkbox aggregation |
| `dashboardAreaTreeParity.test.js` | 118 | Legacy vs shared end-to-end |

**Updated:** `index.js` (21 → 56 LOC) — exports all orchestration modules

**Shared production added (7B.2):** ~877 LOC  
**Shared tests added (7B.2):** ~440 LOC

---

## 3. Files Modified

| File | Before (7B.1) | After (7B.2) | Δ |
|------|---------------|--------------|---|
| `variants/basic/screens/dashboard/Dashboard.jsx` | 4,121 | 3,875 | **−246** |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | 3,628 | 3,378 | **−250** |
| `variants/customized/screens/dashboard/Dashboard.jsx` | 5,592 | 5,208 | **−384** |
| **Dashboard total** | **13,341** | **12,461** | **−880** |

### Wiring pattern

```javascript
const applyAreaTreeSet = () => {
  const resolution = buildSelectAllResolution({ variant, localSelectedFloorIds, ... });
  dispatch(clearDataCache());
  dispatch(setSelectedAreas(resolution.redux.selectedAreas));
  // ... remaining redux fields
  // customized: dispatch(setCustomWidgetFilters(resolution.redux.customWidgetFilters));
};

const getAreaSelectionText = () =>
  resolveAreaSelectionText({ variant, floors, areaTree, areaGroups, ... });
```

Handlers keep signatures; bodies call `resolveAreaToggleSelection` / `resolveGroupToggleSelection` / `resolveIntermediateParentToggle`.

---

## 4. Helper Inventory (New Exports)

### `areaTreeSelectionText.js`

- `getFloorSelectionText(floorIds, floors)`
- `getGroupSelectionText(groupIds, { variant, areaGroups })`
- `getAreaSummaryText(areaIds, { areaTree, variant })`
- `getAreaSelectionText(context)` — unified ribbon label

### `areaTreeBulkActions.js`

- `buildClearAllResolution({ includeCustomWidgetFilters })`
- `buildSelectAllResolution(context)` — basic/advanced/customized branches
- `loadAllAreasFromAllFloors(floorResults, options)` — pure aggregation
- `processFloorPayloadForAreaLoad(...)` — per-floor flatten + optional mappings
- `shouldSkipLoadAllAreas(...)` — variant skip guards
- `buildAreaMappingsFromFloorPayload(...)` — customized map entries
- `collectFloorCheckboxAreaIds(floorData)`

### `areaTreeSelectionResolvers.js`

- `resolveSelectedAreaIds` / `resolveSelectedFloorIds` / `resolveSelectedGroupIds`
- `resolveAreaToggleSelection` / `resolveGroupToggleSelection` / `resolveIntermediateParentToggle`
- `resolveFloorDeselectAreas` / `resolveFloorSelectAreas`

### `areaTreeStateResolvers.js`

- `resolveAreaTreeCheckboxState` — wraps 7B.1 `resolveNodeCheckState`
- `resolveAreaTreeSelectionState` — pending-selection flags
- `resolveAreaTreeSummaryState` — display sets + label

---

## 5. LOC Before / After Summary

| Metric | 7B.1 end | 7B.2 end | Δ |
|--------|----------|----------|---|
| Dashboard LOC (3 variants) | 13,341 | 12,461 | **−880** |
| Shared filters production | 536 | ~1,413 | **+877** |
| Shared filters tests | 513 | ~953 | **+440** |
| **Net production LOC** | — | — | **≈ −3** (dashboard savings ≈ shared addition) |

Cumulative vs pre-7B (14,245 dashboard LOC): **−1,784 dashboard**, **+1,413 shared** → **~−371 net production**

---

## 6. Test Results

```text
npm test -- --testPathPattern=shared/dashboard/filters --watchAll=false
Test Suites: 8 passed, 8 total
Tests:       64 passed, 64 total

npm test -- --testPathPattern=shared/dashboard --watchAll=false
Test Suites: 47 passed, 47 total
Tests:       488 passed, 488 total
```

### New coverage (7B.2)

| Area | Tests |
|------|-------|
| Select all / floor priority | `areaTreeBulkActions.test.js` |
| Clear all | `areaTreeBulkActions.test.js` |
| Summary text (basic/customized) | `areaTreeSelectionText.test.js` |
| Area/floor/group resolution | `areaTreeSelectionResolvers.test.js` |
| Customized `searchTree` Set | `areaTreeBulkActions.test.js`, `dashboardAreaTreeParity.test.js` |
| Empty / partial / full selection | `areaTreeSelectionHelpers.test.js`, parity suites |
| Mapping bulk load | `areaTreeBulkActions.test.js` |

```text
npm run build
Compiled successfully.
```

Dashboard chunks reduced ~426–990 B gzip (131/252/159).

---

## 7. Parity Verification

| Check | Result |
|-------|--------|
| basic/advanced Set floor-priority | PASS — `dashboardAreaTreeParity.test.js` |
| basic/advanced Clear shape | PASS |
| customized `customWidgetFilters` split | PASS — mixed floor [1] + area on floor 2 |
| Selection text legacy basic | PASS |
| customized multi-part label | PASS — `areaTreeSelectionText.test.js` |
| Group expansion on Set | PASS |
| Floor deselect cross-floor areas | PASS |
| `searchTree: false` basic group empty | PASS (7B.1 preserved) |

---

## 8. Stop Boundary Confirmation

| Item | Status |
|------|--------|
| `useDashboardAreaTree` hook | NOT created |
| `renderTreeNode` extraction | NOT done |
| Dropdown JSX changes | NOT done |
| `SpaceUtilization` | NOT touched |
| Custom graph fetch (`fetchCustomGraphData`) | NOT touched |
| DnD | NOT touched |
| Widgets / exports / dates / visibility hooks | NOT touched |
| Redux slice / API contract | UNCHANGED |

---

## 9. Rollback Plan

1. Revert imports in basic/advanced/customized `Dashboard.jsx` to pre-7B.2 inline orchestration.
2. Restore inline `getAreaSelectionText`, Set/Clear onClick, `loadAllAreasFromAllFloors`, checkbox bodies from git.
3. Delete:
   - `areaTreeSelectionText.js`
   - `areaTreeBulkActions.js`
   - `areaTreeSelectionResolvers.js`
   - `areaTreeStateResolvers.js`
   - Associated `*.test.js` files
4. Restore `index.js` to 7B.1 exports only.
5. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## 10. Recommended Next Steps

Per 6.2C.7A audit — remaining RED (variant-owned):

- `renderTreeNode` + dropdown JSX (~400 LOC each) — optional future `useDashboardAreaTree` UI phase (explicitly out of scope)
- Customized `persistentAreaNames` effects — stay with custom-graph domain
- `SpaceUtilization` AreaTree blocks — separate phase

No further AreaTree extraction required for functional parity; optional UI-only consolidation only if product requests it.
