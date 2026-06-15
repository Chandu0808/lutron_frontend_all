# Phase 6.2C.7B.1 — AreaTree GREEN Helper Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Extract pure AreaTree traversal and selection helpers only (GREEN candidates from 6.2C.7A)

---

## Executive Summary

Phase 6.2C.7B.1 extracted duplicated pure AreaTree helpers from all three variant `Dashboard.jsx` files into `src/shared/dashboard/filters/`. Handler bodies, `renderTreeNode`, dropdown JSX, Set/Clear logic, selection labels, and customized custom-graph coupling remain variant-owned.

**Verification:** `npm run build` PASS · `npm test -- --testPathPattern=shared/dashboard` → **42 suites, 457 tests** PASS (+33 new AreaTree tests)

---

## 1. Overlap Analysis

| Helper block | basic | advanced | customized | Overlap | Extracted |
|--------------|:-----:|:--------:|:----------:|:-------:|:---------:|
| `flattenAreaTree` | ✓ | ✓ | ✓ (+`area_name`) | ~95% | ✓ |
| `getAllAreaIdsFromFloor` | ✓ | ✓ | ✓ | ~98% | ✓ |
| `getAreasForFloor` | ✓ | ✓ | ✓ | ~95% | ✓ |
| `getDirectChildAreaIdsFromFloor` | ✓ (unused) | ✓ (unused) | ✓ (unused) | 100% | ✓ (module only; dead local defs removed) |
| `getAllChildAreaIds` | ✓ | ✓ | ✓ | 100% | ✓ |
| `getAllAreasFromGroup` | ✓ (legacy empty) | ✓ (legacy empty) | ✓ (tree + Redux fallback) | ~40% | ✓ (context flag) |
| `checkIfChildrenSelected` | ✓ | ✓ | ✓ | 100% | ✓ |
| `checkIfAllChildrenSelected` | ✓ | ✓ | ✓ | 100% | ✓ |
| `getAllAreaIds` (module-level) | dead | dead | dead | 100% | ✓ (removed dead locals) |
| `resolveNodeCheckState` | — | — | — | new | ✓ (shared, not wired to JSX yet) |
| `addDescendantAreaIds` / `removeDescendantAreaIds` / `mergeAreaSelections` | inline in handlers | inline | inline | logic only | ✓ (exported for 7B.2) |

**Preserved behaviors:**

- `flattenAreaTree` 100 → 15 cap unchanged
- `getAllAreaIds` 20 → 15 cap unchanged
- basic/advanced `getAllAreasFromGroup` returns `[]` (legacy: `findGroupInTree` was never invoked)
- customized group resolution: tree search + `areaGroups` fallback via `getAreaIdsFromGroup` callback
- Selection helpers accept explicit `selectionState` object (no closure coupling in shared layer)

---

## 2. Files Created

| File | LOC | Role |
|------|-----|------|
| `src/shared/dashboard/filters/areaTreeTraversal.js` | 383 | Pure traversal, flatten, group resolution, merge helpers |
| `src/shared/dashboard/filters/areaTreeSelectionHelpers.js` | 132 | Partial/full selection + `resolveNodeCheckState` |
| `src/shared/dashboard/filters/index.js` | 21 | Barrel exports |
| `src/shared/dashboard/filters/areaTreeTraversal.test.js` | 163 | Traversal unit tests |
| `src/shared/dashboard/filters/areaTreeSelectionHelpers.test.js` | 88 | Selection state tests |
| `src/shared/dashboard/filters/areaTreeParity.test.js` | 262 | Legacy vs shared parity |

**Shared production LOC:** 536  
**Shared test LOC:** 513

---

## 3. Files Modified

| File | Before | After | Δ |
|------|--------|-------|---|
| `variants/basic/screens/dashboard/Dashboard.jsx` | 4,420 | 4,121 | **−299** |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | 3,936 | 3,628 | **−308** |
| `variants/customized/screens/dashboard/Dashboard.jsx` | 5,889 | 5,592 | **−297** |
| **Dashboard total** | **14,245** | **13,341** | **−904** |

### Wiring pattern (all variants)

Thin closures bind component state to pure shared functions:

```javascript
const areaTreeSelectionState = { localSelectedAreas, localSelectedFloorIds, localSelectedGroups };
const getAreasForFloor = (_floorId) => getAreasForFloorFromTree(areaTree);
const getAllAreasFromGroup = (groupId) => resolveAreasFromGroup(groupId); // customized passes context
const getAllChildAreaIds = (node) => getAllChildAreaIdsFromNode(node, (gid) => getAllAreasFromGroup(gid));
const checkIfChildrenSelected = (node) => checkIfChildrenSelectedHelper(node, areaTreeSelectionState);
const checkIfAllChildrenSelected = (node) => checkIfAllChildrenSelectedHelper(node, areaTreeSelectionState);
```

**Customized-only:** `flattenAreaTree` wrapper adds `{ includeAreaName: true }`; `getAllAreasFromGroup` passes `{ areaTree, areaGroups, searchTree: true, resolveGroupRecordAreas: getAreaIdsFromGroup }`.

---

## 4. Helper Inventory (Shared Exports)

### `areaTreeTraversal.js`

| Export | Description |
|--------|-------------|
| `getTreeRoots` | Normalize `tree` / `areas` root arrays |
| `traverseAreaNodes` | Unified depth-first visitor |
| `flattenAreaTree` | Leaf area flattening with optional cap + `area_name` |
| `getAllAreaIds` | Node + descendants with 20→15 cap |
| `getAllChildAreaIds` | Descendants only; optional group resolver callback |
| `getAllAreaIdsFromFloor` | Full floor payload traversal |
| `getAreasForFloor` | Current `areaTree` scope (legacy ignores `floorId` arg at call sites) |
| `getDirectChildAreaIdsFromFloor` | Direct child `area_id` collection |
| `findGroupInTree` | Group node search + area ID collector |
| `getAllAreasFromGroup` | Context-aware; `searchTree: false` preserves basic/advanced empty behavior |
| `addDescendantAreaIds` | Pure add helper |
| `removeDescendantAreaIds` | Pure remove helper |
| `mergeAreaSelections` | Pure union helper |

### `areaTreeSelectionHelpers.js`

| Export | Description |
|--------|-------------|
| `checkIfChildrenSelected` | Any descendant selected |
| `checkIfAllChildrenSelected` | All direct children fully selected |
| `resolveNodeCheckState` | `{ isSelected, isIndeterminate, node type flags }` |

---

## 5. LOC Before / After Summary

| Metric | Value |
|--------|-------|
| Duplicated helper LOC removed (dashboards) | ~904 |
| Shared production LOC added | 536 |
| Shared test LOC added | 513 |
| **Net LOC change** | **−368** (production only) |
| Handler / JSX LOC unchanged | ~2,400+ per variant (RED/YELLOW — deferred) |

---

## 6. Test Results

```text
npm test -- --testPathPattern=shared/dashboard --watchAll=false
Test Suites: 42 passed, 42 total
Tests:       457 passed, 457 total
```

### New AreaTree suites (+33 tests)

| Suite | Tests | Coverage |
|-------|-------|----------|
| `areaTreeTraversal.test.js` | 15 | Floor/area traversal, nested descendants, group resolution, flatten caps |
| `areaTreeSelectionHelpers.test.js` | 7 | Full/partial/none selection, mixed descendants, `resolveNodeCheckState` |
| `areaTreeParity.test.js` | 11 | Legacy === shared for basic/advanced/customized fixtures |

```text
npm run build
Compiled successfully.
```

---

## 7. Stop Boundary Confirmation

| Item | Status |
|------|--------|
| `useDashboardAreaTree` hook | NOT created |
| `areaTreeResolvers.js` | NOT created |
| Set/Clear orchestration | NOT moved |
| Selection labels (`getAreaSelectionText`) | NOT moved |
| `loadAllAreasFromAllFloors` | NOT moved |
| Checkbox handlers | NOT moved (bodies intact) |
| `renderTreeNode` | NOT moved |
| `customWidgetFilters` / `areaIdToFloorId` / `fetchCustomGraphData` | NOT touched |
| `SpaceUtilization` | NOT touched |
| `DashboardContainer` | NOT touched |
| Redux/API contract | UNCHANGED |

---

## 8. Rollback Plan

1. Remove imports from `../../../../shared/dashboard/filters` in basic/advanced/customized `Dashboard.jsx`.
2. Restore inline helper implementations from git history (pre-7B.1 commit).
3. Delete `src/shared/dashboard/filters/` directory.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## 9. Recommended Next Steps (Phase 6.2C.7B.2)

Per 6.2C.7A order — YELLOW extraction only after GREEN stabilization:

1. `areaTreeResolvers.js` — Set/Clear commit resolvers, selection text core
2. `useDashboardAreaTree.js` — dropdown state + handler factories
3. Wire basic → advanced → customized (keep custom-graph RED blocks in customized Dashboard)

---

## 10. Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Group resolution behavior drift | Low | Parity tests for empty basic/advanced + customized tree/fallback |
| Partial checkbox regression | Low | Selection helper golden tests |
| `flattenAreaTree` cap regression | Low | Explicit 120-leaf cap test |
| Bundle size | Low | Build PASS; dashboard chunks reduced ~300–476 B gzip |

**Overall phase risk:** LOW — pure extraction with parity coverage and unchanged handler/JSX surfaces.
