# Phase 6.5A.3 — Dashboard AreaTree Orchestration Parity Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.4E technical debt register item **M3**  
**Scope:** Wiring-only — adopt `useDashboardAreaTreeOrchestration` in advanced and customized Dashboard variants

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Replaced inline AreaTree orchestration in advanced/customized `Dashboard.jsx` with shared `useDashboardAreaTreeOrchestration` |
| Hook API changes | Optional wiring params only (`clearAllOptions`, `selectAllContextExtras`, `selectionTextExtras`, `getAllAreasFromGroupOverride`, `extraReduxActions`) — no behavior redesign |
| Architecture changes | **None** — AreaTree UI, resolvers, custom graph pipeline untouched |
| Verification | `npm run build` PASS; **68 suites, 682 tests PASS** (+1 suite, +6 tests vs 6.5A.2) |
| Variant duplication removed | **~134 LOC** inline orchestration across advanced + customized |

---

## 2. Duplication Audit (STEP 1)

### 2.1 Pre-fix variant matrix

| Concern | basic | advanced | customized | shared hook |
|---------|:-----:|:--------:|:----------:|:-----------:|
| selection text | ✓ hook | ✗ inline | ✗ inline | ✓ |
| set all | ✓ hook | ✗ inline | ✗ inline | ✓ |
| clear all | ✓ hook | ✗ inline | ✗ inline | ✓ |
| checkbox state | ✓ hook | ✗ inline | ✗ inline | ✓ |
| selected ids / helpers | ✓ hook | ✗ inline | ✗ inline | ✓ |

### 2.2 Customized-only inline deltas (preserved via hook wiring)

| Concern | Prior inline behavior | Wiring approach |
|---------|----------------------|-----------------|
| `customWidgetFilters` on Clear/Set | `includeCustomWidgetFilters: true` + `dispatch(setCustomWidgetFilters)` | `clearAllOptions`, `extraReduxActions` |
| Mixed-scope Set | `areaIdToFloorId` passed to `buildSelectAllResolution` | `selectAllContextExtras` |
| Selection text | `areaGroups`, `selectedGroupIds` in resolver context | `selectionTextExtras` |
| Group area resolution | Custom `resolveAreasFromGroup` options | `getAllAreasFromGroupOverride` adapter closure |
| `flattenAreaTree` | Local wrapper with `includeAreaName: true` | **Remains in customized Dashboard** (not orchestration) |

### 2.3 Confirmation

All duplicated orchestration logic already existed in `useDashboardAreaTreeOrchestration` and underlying `shared/dashboard/filters` resolvers. Customized gaps were wiring-only and resolved with thin optional hook inputs — no custom graph logic moved into shared modules.

---

## 3. Wiring Summary (STEP 2)

### 3.1 Advanced

Replaced ~67 lines of inline helpers and bulk handlers with:

```javascript
useDashboardAreaTreeOrchestration({
  variant: 'advanced',
  dispatch,
  reduxActions: { clearDataCache, setSelectedAreas, ... },
  floors, areaTree, selectedFloorIds, selectedAreas,
  localSelectedFloorIds, setLocalSelectedFloorIds,
  localSelectedAreas, setLocalSelectedAreas,
  localSelectedGroups, setLocalSelectedGroups,
  setFloorsWithSelectedAreas, setExpandedFloorId, setExpandedNodes,
  previousApiParamsRef, setShowAreaDropdown,
});
```

Moved `previousApiParamsRef`, `showAreaDropdown`, and `expandedNodes` above the hook call (matching basic ordering).

### 3.2 Customized

Same hook with customized adapter closures:

```javascript
useDashboardAreaTreeOrchestration({
  variant: 'customized',
  ...
  clearAllOptions: { includeCustomWidgetFilters: true },
  selectAllContextExtras: { areaIdToFloorId },
  selectionTextExtras: { areaGroups, selectedGroupIds },
  getAllAreasFromGroupOverride: (groupId) =>
    resolveAreasFromGroup(groupId, { areaTree, areaGroups, searchTree: true, resolveGroupRecordAreas: getAreaIdsFromGroup }),
  extraReduxActions: { setCustomWidgetFilters },
});
```

### 3.3 Hook delta (optional wiring only)

Extended `useDashboardAreaTreeOrchestration` to accept optional:

- `clearAllOptions` → forwarded to `buildClearAllResolution`
- `selectAllContextExtras` → spread into `buildSelectAllResolution` context
- `selectionTextExtras` → spread into `getAreaSelectionText` context
- `getAllAreasFromGroupOverride` → replaces default group resolver when provided
- `extraReduxActions.setCustomWidgetFilters` → dispatched when `customWidgetFilters` present on resolution

---

## 4. Files Modified

| File | Action |
|------|--------|
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Wired shared hook; removed inline orchestration |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Wired shared hook + customized adapter closures |
| `src/shared/dashboard/container/useDashboardAreaTreeOrchestration.js` | Optional wiring params for customized |
| `src/shared/dashboard/container/tests/useDashboardAreaTreeOrchestration.test.js` | **Created** |

### Hard-stop boundaries respected

No changes to: AreaTree UI/`renderTreeNode`, dropdown JSX, `DashboardContainer`, renderers, exports, widgets, charts, DnD, custom graph pipeline, SpaceUtilization.

---

## 5. LOC Before / After

| Area | Approx. LOC |
|------|------------:|
| Advanced `Dashboard.jsx` inline orchestration removed | **−67** |
| Customized `Dashboard.jsx` inline orchestration removed | **−67** |
| Advanced + customized hook wiring added | **+72** |
| Hook optional wiring extension | **+29** |
| New parity tests | **+230** |
| **Net (production code)** | **≈ −33** |
| **Net (incl. tests)** | **+197** |

Current file sizes: advanced `Dashboard.jsx` 3200 lines; customized 5134 lines; hook 191 lines.

---

## 6. Tests Added (STEP 3)

**File:** `src/shared/dashboard/container/tests/useDashboardAreaTreeOrchestration.test.js`

| # | Case | Validates |
|---|------|-----------|
| 1 | Advanced selection text | Matches direct `getAreaSelectionText` resolver |
| 2 | Advanced Set All | Redux payload matches `buildSelectAllResolution` |
| 3 | Advanced Clear All | Local + redux side effects match `buildClearAllResolution` |
| 4 | Customized mixed-scope Set | `customWidgetFilters` floor/area split preserved |
| 5 | Customized Clear All | `setCustomWidgetFilters(null)` dispatched |
| 6 | Customized selection text | `areaGroups` + `selectedGroupIds` extras honored |

---

## 7. Verification Results

### 7.1 Build

```
npm run build
```

**Result:** PASS — `Compiled successfully.`

### 7.2 Test suite

```
npm test -- --testPathPattern=shared/dashboard
```

| Metric | 6.5A.2 baseline | 6.5A.3 result | Delta |
|--------|----------------:|--------------:|------:|
| Suites | 67 | 68 | +1 |
| Tests | 676 | 682 | +6 |
| Failures | 0 | 0 | — |

---

## 8. Behavioral Parity Checklist

| Criterion | Status |
|-----------|--------|
| All three Dashboard variants use `useDashboardAreaTreeOrchestration` | ✓ |
| Advanced selection text unchanged | ✓ (resolver parity test) |
| Advanced Set All unchanged | ✓ (resolver parity test) |
| Advanced Clear All unchanged | ✓ (resolver parity test) |
| Customized mixed-scope Set preserved | ✓ (`customWidgetFilters` test) |
| Customized persistent area names / `areaIdToDisplayName` | ✓ (unchanged — not in orchestration scope) |
| Custom graph filters coupling preserved | ✓ (`setCustomWidgetFilters` on Clear/Set) |
| Floor checkbox / toggle handlers | ✓ (unchanged in variant files) |
| No AreaTree architecture changes | ✓ |

### Post-fix variant matrix

| Variant | Shared hook |
|---------|:-----------:|
| basic | ✓ |
| advanced | ✓ |
| customized | ✓ |

---

## 9. Rollback Plan

1. Revert `useDashboardAreaTreeOrchestration.js` optional-param extension.
2. Restore inline orchestration blocks in advanced and customized `Dashboard.jsx`.
3. Delete `container/tests/useDashboardAreaTreeOrchestration.test.js`.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard` to confirm baseline (67 suites, 676 tests).

---

## 10. Success Criteria

| Criterion | Status |
|-----------|--------|
| All three Dashboard variants use `useDashboardAreaTreeOrchestration` | ✓ |
| Advanced behavior unchanged | ✓ |
| Customized behavior unchanged | ✓ |
| Custom graph coupling preserved | ✓ |
| Build passes | ✓ |
| All tests pass | ✓ |
| No AreaTree architecture changes | ✓ |
