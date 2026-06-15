# Phase 6.2C.7A — Dashboard AreaTree Audit (READ-ONLY)

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Pre-extraction audit of Area/Floor/Group filter logic in variant `Dashboard.jsx` files  
**Stop boundary respected:** No production code changes, no shared modules, no hook extraction, no `SpaceUtilization` or `DashboardContainer` work

---

## Executive Summary

All three variant dashboards embed a large, near-identical AreaTree filter subsystem inline (~1,400–2,200 LOC each depending on variant). **Basic and advanced are ~90% structurally duplicate** for handlers, traversal helpers, tree rendering, and Set/Clear commit logic. **Customized extends the same core** with area→floor mapping, persistent area names, richer selection labels, and heavy custom-graph coupling (RED — must stay variant-owned in 7B).

**Already shared (Phase 6.1):** `useAreaTreeSelection` (`src/shared/dashboard/hooks/useAreaTreeSelection.js`, 34 LOC) holds local pre-Set selection state only.

**Highest-value 7B targets:** pure traversal + partial-selection helpers (GREEN), then selection-text/commit resolvers (YELLOW). Dropdown JSX and `renderTreeNode` styling remain variant-owned (RED).

---

## 1. State Inventory

### Redux (committed — post-Set)

| State | basic | advanced | customized | Notes |
|-------|:-----:|:--------:|:----------:|-------|
| `selectedAreas` | ✓ | ✓ | ✓ | `selectSelectedAreas`; drives `apiParams.areaIds` |
| `selectedFloor` | ✓ | ✓ | ✓ | Single floor object for expansion context |
| `selectedFloorIds` | ✓ | ✓ | ✓ | Committed floor checkboxes; takes precedence over areas in `buildDashboardApiParams` |
| `selectedGroups` | ✓ | ✓ | ✓ | Group objects (Redux) |
| `selectedGroupIds` | ✓ | ✓ | ✓ | Committed group IDs; expanded to area IDs on Set |
| `areaTree` (`floor.leafData`) | ✓ | ✓ | ✓ | Per-floor leaf payload from `getLeafByFloorID` |
| `floors` / `floorStatus` | ✓ | ✓ | ✓ | Floor list + loading |
| `areaGroups` | ✓ | ✓ | ✓ | Used in customized selection text + custom graphs |
| `customWidgetFilters` | — | — | ✓ | Redux: `{ floor_ids, area_ids }` for mixed custom-graph scope (Set button) |

### Local — `useAreaTreeSelection` (pending — pre-Set)

| State | basic | advanced | customized | Notes |
|-------|:-----:|:--------:|:----------:|-------|
| `localSelectedAreas` | ✓ | ✓ | ✓ | Checkbox picks before Set |
| `localSelectedFloorIds` | ✓ | ✓ | ✓ | Floor checkbox picks before Set |
| `localSelectedGroups` | ✓ | ✓ | ✓ | Group checkbox picks before Set |
| `expandedFloorId` | ✓ | ✓ | ✓ | Which floor row shows inline tree |
| `floorsWithSelectedAreas` | ✓ | ✓ | ✓ | Derived `Set` from `localSelectedFloorIds` |

### Local — Dashboard-owned UI / orchestration

| State | basic | advanced | customized | Notes |
|-------|:-----:|:--------:|:----------:|-------|
| `showAreaDropdown` | ✓ | ✓ | ✓ | Ribbon area-picker open/close |
| `expandedNodes` | ✓ | ✓ | ✓ | `Set` of expanded tree node IDs (`node-${id}`) |
| `allAreasLoaded` | ✓ | ✓ | ✓ | Gates `useDashboardApiParams` / initial fetch |
| `areaDropdownRef` | ✓ | ✓ | ✓ | Click-outside boundary |
| `areaTreeContainerRef` | ✓ | ✓ | ✓ | Scroll/focus anchor for expanded floor |
| `debounceTimeoutRef` | ✓ | ✓ | ✓ | Shared ref name; used by area handlers **and** API debounce |
| `previousApiParamsRef` | ✓ | ✓ | ✓ | Cleared on Set/Clear to force refetch |
| `isOperator` / role | ✓ | ✓ | ✓ | From `UseAuth()`; filters `getAvailableFloors()` |
| `expandedFloorIds` | — | — | ✓ | Declared; **no reads found** — dead state candidate |
| `visibleWidgets` | — | — | ✓ | Declared; **unused** — unrelated leftover |
| `areaIdToFloorId` | — | — | ✓ | `Map` — custom graphs + mixed Set logic |
| `currentTreeFloorId` | — | — | ✓ | Tracks active tree floor for mapping effect |
| `persistentAreaNames` | — | — | ✓ | `Map` — tooltip/chart label resolution |
| `areaIdToDisplayName` | — | — | ✓ | Derived display names for widgets |

### Selection display / search

| State | basic | advanced | customized | Notes |
|-------|:-----:|:--------:|:----------:|-------|
| `getAreaSelectionText()` | ✓ | ✓ | ✓ | Ribbon label; basic truncates via `truncateAreaSelectionLabel` |
| Area tree search/filter | — | — | — | **No dedicated search state** in any variant |
| Preset selections | — | — | — | **No `handlePresetSelection`** — not implemented |

### Checked / partial-check state

| Mechanism | basic | advanced | customized | Notes |
|-----------|:-----:|:--------:|:----------:|-------|
| Checkbox `checked` | ✓ | ✓ | ✓ | Derived per node in `renderTreeNode` |
| `indeterminate` (partial) | ✓ | ✓ | ✓ | `ref` + `checkIfChildrenSelected` / `checkIfAllChildrenSelected` |
| Redux “partial” flags | — | — | — | Partial state is **UI-only** until Set commits |

---

## 2. Handler Inventory

| Handler / helper | Overlap % | Risk | Notes |
|------------------|-----------|------|-------|
| `getAvailableFloors` | **100%** | LOW | Operator floor ACL filter; identical logic |
| `loadAllAreasFromAllFloors` | **~70%** | MED | Same loop; customized adds `areaIdToFloorId` + `persistentAreaNames` mapping |
| `handleFloorChange` | **~98%** | LOW | Expand/collapse floor; `getLeafByFloorID` |
| `handleFloorCheckboxClick` | **~95%** | MED | Multi-floor select + auto-expand + area cascade |
| `getAreasForFloor` | **100%** | LOW | Tree traversal for floor’s area IDs |
| `getDirectChildAreaIdsFromFloor` | **100%** | LOW | Direct children only |
| `handleAreaChange` | **~95%** | LOW | Legacy bulk setter (mostly commented dispatch) |
| `handleToggleNode` | **100%** | LOW | `expandedNodes` toggle |
| `checkIfChildrenSelected` | **100%** | LOW | Partial selection detection |
| `checkIfAllChildrenSelected` | **100%** | LOW | Full subtree selection |
| `renderTreeNode` | **~85%** | **HIGH** | Same structure; advanced uses `areaTreeTextColor` + CSS classes; customized adds `floorName` param + tooltips |
| `handleAreaCheckboxChange` | **~90%** | MED | Descendant cascade; customized adds floor context on group paths |
| `handleGroupCheckboxChange` | **~85%** | MED | `getAllAreasFromGroup`; customized uses `currentTreeFloorId` |
| `handleIntermediateParentCheckboxChange` | **~90%** | MED | Parent node bulk select |
| `getAllChildAreaIds` | **100%** | LOW | Recursive descendant IDs |
| `getAllAreasFromGroup` | **~90%** | MED | Tree search for `group_id`; logging differs |
| `getAllAreaIdsFromFloor` | **100%** | LOW | Full floor subtree area IDs |
| `flattenAreaTree` | **~95%** | LOW | 100-area cap → slice(0,15); customized comments reference this |
| `getAllAreaCodes` / `getAllLeafNodes` / `getAllAreaIds` | **100%** | LOW | Copied from `AreaTreeDialog.jsx` comment |
| `getAreaSelectionText` | **~60%** | MED | basic/advanced simpler; customized adds group name resolution + `·` join |
| Set button onClick | **~75%** | **HIGH** | Floor-priority commit identical; customized adds `setCustomWidgetFilters` split |
| Clear All onClick | **~90%** | MED | customized also clears `customWidgetFilters` |
| `handlePresetSelection` | N/A | — | **Does not exist** |
| `handleTreeExpand` / `handleTreeCollapse` | N/A | — | Folded into `handleToggleNode` + `handleFloorChange` |

### Dependencies (common)

- **Redux:** `getLeafByFloorID`, `setSelectedAreas`, `setSelectedFloorIds`, `setSelectedGroups`, `setSelectedGroupIds`, `setSelectedFloor`, `clearDataCache`
- **Local hook:** `useAreaTreeSelection` return values
- **Refs:** `debounceTimeoutRef`, `areaDropdownRef`, `previousApiParamsRef`
- **External:** `UseAuth`, `isSuperadminRole`, `userProfile.floors` (operator ACL)

---

## 3. Render Tree Analysis

### Identical across variants

- Recursive `renderTreeNode` structure: checkbox + expand chevron + children
- Node typing: `isFloorNode`, `isAreaNode`, `isGroupNode`, `isIntermediateParent`
- Selection derivation: `isSelected`, `isIndeterminate` from local + child checks
- Floor list dropdown: map `getAvailableFloors()` → floor row + conditional inline tree
- Set/Clear footer when any local selection non-empty

### Differs (variant-owned — RED in 7B)

| Concern | basic | advanced | customized |
|---------|-------|----------|------------|
| Label color | `#333` inline | `areaTreeTextColor` CSS var | `#333` + `maxWidth` / ellipsis |
| Checkbox class | none | `dashboard-area-tree-checkbox` | none |
| Label class | none | `dashboard-area-tree-label` | none |
| `renderTreeNode` arity | `(node, level)` | `(node, level)` | `(node, level, floorName)` — tooltips |
| Ribbon label | `truncateAreaSelectionLabel(getAreaSelectionText())` | full text | full text + richer group/floor join |
| Dropdown chrome | basic ribbon styles | gold theme vars | customized legacy styles |
| Operator empty state | ✓ | ✓ | ✓ (same message pattern) |

**Recommendation:** Keep `renderTreeNode` and dropdown JSX in each `Dashboard.jsx`. Extract only **pure selection math** and **commit resolvers** feeding props into render.

---

## 4. Dependency Mapping

### Data flow (committed selection → APIs)

```mermaid
flowchart TD
  subgraph LocalPicker["Local picker (pre-Set)"]
    LAS[localSelectedAreas]
    LFI[localSelectedFloorIds]
    LGR[localSelectedGroups]
    EFI[expandedFloorId]
    EN[expandedNodes]
  end

  subgraph SetClear["Set / Clear buttons"]
    SET[Set onClick]
    CLR[Clear onClick]
  end

  subgraph ReduxCommitted["Redux committed"]
    SA[selectedAreas]
    SFI[selectedFloorIds]
    SGI[selectedGroupIds]
    SF[selectedFloor]
    CWF[customWidgetFilters - customized only]
  end

  subgraph SharedHooks["Shared dashboard hooks"]
    UAP[useDashboardApiParams]
    UDD[useDashboardDates]
    UDW[useDashboardWidgets]
    UDE[useDashboardExports]
    UDV[useDashboardVisibility]
  end

  subgraph APICore["API layer"]
    BAP[buildDashboardApiParams]
    FETCH[dispatch chart thunks]
  end

  LAS --> SET
  LFI --> SET
  LGR --> SET
  SET --> SA
  SET --> SFI
  SET --> SGI
  SET --> SF
  SET --> CWF
  CLR --> SA
  CLR --> SFI

  SA --> UAP
  SFI --> UAP
  AAL[allAreasLoaded] --> UAP
  UAP --> BAP
  BAP --> FETCH

  SA --> UDW
  SA --> UDE
  SFI --> UDE
  areaTree --> UDW
  areaTree --> chart transforms

  SA --> UDV
  UDV -.->|no direct coupling| LocalPicker

  subgraph CustomizedOnly["Customized only (RED)"]
    A2F[areaIdToFloorId Map]
    PAN[persistentAreaNames]
    CG[fetchCustomGraphData / custom graph helpers]
  end

  A2F --> CG
  CWF --> CG
  SET --> CWF
  loadAll[loadAllAreasFromAllFloors] --> A2F
```

### Hook / module inputs from AreaTree

| Consumer | Inputs from AreaTree | Coupling strength |
|----------|---------------------|-------------------|
| `useDashboardApiParams` | `selectedAreas`, `selectedFloorIds`, `allAreasLoaded` | **Hard** — null params block all fetches |
| `useDashboardDates` | none direct | None |
| `useDashboardWidgets` | none direct | None |
| `useDashboardExports` | `selectedAreas`, `selectedFloorIds` in `selection` | Medium — export email scope |
| `useDashboardVisibility` | none | None |
| `buildDashboardApiParams` | areas vs floors mutual exclusion | **Hard** — shape contract |
| Chart transforms | `selectedAreas`, `areaTree` (basic/advanced/customized options) | Medium — axis labels |
| `fetchDataForActiveTab` | reads `apiParams` only | Indirect |
| Custom graph pipeline (customized) | `areaIdToFloorId`, `selectedAreas`, `customWidgetFilters`, `areaGroups` | **Hard** — separate from builtin `apiParams` |

### Notable gap

`buildDashboardApiParams` does **not** include `selectedGroupIds`. Group selections are expanded to `selectedAreas` on Set. Customized additionally writes `customWidgetFilters` for mixed floor/area custom graphs.

---

## 5. Customized Extensions Audit

Beyond basic/advanced, customized adds:

| Extension | LOC (approx) | Coupling point | 7B classification |
|-----------|-------------|----------------|-------------------|
| `areaIdToFloorId` state + merge effects | ~120 | `loadAllAreasFromAllFloors`, per-floor `getLeafByFloorID` effect | YELLOW (mapping) / RED when used by custom graphs |
| `persistentAreaNames` Map | ~80 | Chart tooltips, custom widget labels | RED (custom graph) |
| `currentTreeFloorId` | ~15 | Tree mapping effect | YELLOW |
| Extended `loadAllAreasFromAllFloors` | +~130 vs basic | Recursive walk (no 15-area cap for mapping) | YELLOW |
| `getAreaSelectionText` group/floor join | +~100 | Ribbon only | YELLOW |
| Set → `setCustomWidgetFilters` mixed split | ~45 | `areaIdToFloorId.get(aid)` vs `finalFloorIds` | **RED** |
| Module helpers: `resolveAreaIdsForCustomEnergyPieTable`, `extendDashboardFloorIdsWithWidgetAreaFloors`, `collectAreaIdsFromAreaGroupRecord` | ~120 at top of file | Custom graph fetch orchestration | **RED** |
| `buildCustomizedTransformChartOptions({ areaTree, areaGroups, floors, ... })` | dependency | Chart axis naming | YELLOW |
| `areaIdToDisplayName` / floor label utils | ~50 | Widget props | RED |
| `getAreaIdsFromGroup` (duplicate of collect helper) | ~25 | Local helper near DnD | GREEN candidate (dedupe) |
| Preload missing floor mappings `useEffect` | ~25 | `customGraphs` + `selectedAreas` | RED |

**Custom graph fetch** (`fetchCustomGraphData` block ~lines 900–1840) is the largest customized-only consumer of area-tree mappings. **Must not move in 7B.**

---

## 6. Extraction Candidate Classification

### GREEN — pure helpers (extract first)

| Block | Est. LOC (×1 shared) | Variants |
|-------|---------------------|----------|
| `flattenAreaTree` | ~30 | 3× duplicate |
| `getAllAreaIds` / `getAllChildAreaIds` / `getAllAreaIdsFromFloor` | ~80 | 3× |
| `getAreasForFloor` / `getDirectChildAreaIdsFromFloor` | ~60 | 3× |
| `checkIfChildrenSelected` / `checkIfAllChildrenSelected` | ~90 | 3× |
| `getAvailableFloors` (role ACL) | ~20 | 3× |
| Node ID factory `node-${id}` | ~5 | 3× |
| `mergeAreaSelections` / descendant add-remove pure | ~60 | logic inside handlers |

### YELLOW — state orchestration & text (extract second)

| Block | Est. LOC | Notes |
|-------|----------|-------|
| Extend `useAreaTreeSelection` → `useDashboardAreaTree` | ~150 | Fold `showAreaDropdown`, `expandedNodes`, click-outside |
| `loadAllAreasFromAllFloors` orchestration | ~100 basic/adv, +130 customized mapping | Variant config flag |
| Handler bodies (floor/area/group checkbox) | ~400 | Dispatch + local setters via hook API |
| `resolveAreaSelectionLabel` / `getAreaSelectionText` core | ~120 | Customized extends with group resolver |
| Set/Clear **commit resolvers** (pure output: Redux actions to dispatch) | ~80 | Customized variant adds `customWidgetFilters` payload |
| `allAreasLoaded` gating coordination | ~40 | Tied to `useDashboardApiParams` |

### RED — keep variant-owned

| Block | Est. LOC (per variant) | Reason |
|-------|------------------------|--------|
| `renderTreeNode` JSX | ~115–130 | Theme/chrome differences |
| Area dropdown JSX (floor rows, scroll containers) | ~350–450 | Layout + styling |
| Customized `areaIdToFloorId` → custom graph pipeline | ~600+ | Custom graph domain |
| `setCustomWidgetFilters` mixed-selection split | ~45 | Custom graph API contract |
| `debounceTimeoutRef` sharing with API layer | — | Split ref in 7B to avoid hook entanglement |
| `SpaceUtilization` embedded tab | — | Out of scope |

---

## 7. Proposed Shared Structure (Design Only)

Target: `src/shared/dashboard/filters/` (new in 7B — **not created in 7A**)

### `areaTreeTraversal.js` (~180 LOC, GREEN, risk LOW)

**Responsibilities:**

- `flattenAreaTree(treeData, options?)` — preserve 100→15 cap as option
- `traverseAreaNodes(tree, visitor)` — unified walk for `tree` / `areas` shapes
- `getAllAreaIdsFromNode(node)` / `getAllChildAreaIds(node)`
- `getAllAreaIdsFromFloor(floorData)` / `getAreasForFloor(floorId, areaTree)`
- `findGroupInTree(nodes, groupId)` / `getAllAreasFromGroup(groupId, areaTree)`

### `areaTreeSelectionHelpers.js` (~150 LOC, GREEN/YELLOW, risk LOW–MED)

**Responsibilities:**

- `checkIfChildrenSelected(node, selectionState)`
- `checkIfAllChildrenSelected(node, selectionState)`
- `resolveNodeCheckState(node, selectionState)` → `{ checked, indeterminate }`
- `applyAreaToggle(currentAreas, areaId, node, mode)` — pure add/remove with descendants
- `applyGroupToggle(...)` — pure group expand to area IDs
- `getAvailableFloors(floors, userProfile, role)` — operator ACL

### `areaTreeResolvers.js` (~200 LOC, YELLOW, risk MED)

**Responsibilities:**

- `resolveAreaSelectionText(context)` — variant: `basic | advanced | customized`
- `resolveCommittedSelectionFromLocal(localState, areaTree, options)` — Set button output
- `resolveClearSelectionActions()` — action list for Clear All
- `resolveFloorPriorityApiScope(selectedFloorIds, selectedAreas)` — mirrors `buildDashboardApiParams` rules
- Customized-only: `resolveCustomWidgetFilterSplit(...)` — **called from Dashboard, not from shared fetch**

### `useDashboardAreaTree.js` (~250 LOC, YELLOW, risk MED–HIGH)

**Responsibilities:**

- Compose `useAreaTreeSelection` + dropdown UI state (`showAreaDropdown`, `expandedNodes`)
- Expose handler factories: `createFloorCheckboxHandler`, `createAreaCheckboxHandler`, etc.
- Manage `allAreasLoaded` + optional `loadAllAreasFromAllFloors` lifecycle
- Return: `getAreaSelectionText`, `nodeCheckState`, `availableFloors`, refs bundle
- Accept `variant` config: `{ theme: 'basic'|'advanced'|'customized', enableGroupLabels, onCommitCustomFilters }`

### Optional: `areaTreeMemoCompare.js` (~20 LOC)

- Stable signatures for selection state (similar to 6.2C.6 `visibilityMemoCompare`)

---

## 8. Success Criteria (Estimates for 7B)

| Metric | Estimate |
|--------|----------|
| Duplicated LOC today (handlers + helpers + text, excl. JSX) | ~2,400–2,700 across 3 dashboards |
| Extractable to shared (GREEN + YELLOW) | ~550–700 LOC new modules |
| Removable from each Dashboard | basic **~750–850**, advanced **~750–850**, customized **~500–600** (handlers/helpers; keeps RED blocks) |
| **Net dashboard reduction** | **~2,000–2,300 LOC** |
| **Net after shared addition** | **~1,300–1,600 LOC reduction** |
| JSX remaining per variant | ~400–500 LOC area dropdown (RED, stays) |

### Verification baseline (unchanged after 7A)

| Check | Result |
|-------|--------|
| Production source modified | **None** (7A) |
| `npm run build` | Unchanged (no code edits) |
| Deliverable | This document only |

---

## 9. Duplication Matrix (Summary)

| Subsystem | basic | advanced | customized | Shareable? |
|-----------|-------|----------|------------|------------|
| Redux selectors | ✓ | ✓ | ✓ | Already shared slice |
| `useAreaTreeSelection` | ✓ | ✓ | ✓ | **Already shared** |
| Traversal helpers | ✓ | ✓ | ✓ | **GREEN** |
| Checkbox handlers | ✓ | ✓ | ✓ (+floor ctx) | **YELLOW** |
| `renderTreeNode` | ✓ | ✓ | ✓ (+tooltips) | **RED** (props only) |
| Dropdown JSX | ✓ | ✓ | ✓ | **RED** |
| Selection text | ✓ | ✓ | ✓ extended | **YELLOW** |
| Set/Clear commit | ✓ | ✓ | ✓ +custom filters | **YELLOW** / partial **RED** |
| `loadAllAreas` | ✓ | ✓ | ✓ extended | **YELLOW** |
| Area→floor map | — | — | ✓ | **RED** (custom graphs) |
| `useDashboardApiParams` wiring | ✓ | ✓ | ✓ | Already shared hook |

---

## 10. Risk Assessment

| Risk | Severity | Mitigation in 7B |
|------|----------|------------------|
| Set button floor-vs-area priority regression | **High** | Parity tests on `resolveCommittedSelectionFromLocal` |
| Operator floor ACL leak | **High** | Unit tests on `getAvailableFloors` |
| Partial checkbox indeterminate wrong | Medium | Golden tests with fixture trees |
| Customized `customWidgetFilters` drift | **High** | Do not move; only add resolver called from Dashboard |
| `debounceTimeoutRef` collision (area vs API) | Medium | Split refs during hook extraction |
| `allAreasLoaded` false → no API params | Medium | Integration test with `useDashboardApiParams` |
| Theme/CSS regression in tree render | Low | Keep JSX variant-owned |
| `flattenAreaTree` 15-area cap behavior | Medium | Explicit test for >100 areas |

---

## 11. Recommended Implementation Order (Phase 6.2C.7B)

1. **`areaTreeTraversal.js`** + parity tests (fixture trees from `getLeafByFloorID` shape)
2. **`areaTreeSelectionHelpers.js`** + tests for partial/complete selection states
3. **`areaTreeResolvers.js`** — `getAreaSelectionText` for basic/advanced first
4. **Wire basic `Dashboard.jsx`** — thinnest path; validate `npm run build` + manual Set/Clear
5. **Wire advanced** — confirm theme props still passed into local `renderTreeNode`
6. **Extend resolvers for customized** selection text (group names); **do not** move custom graph blocks
7. **`useDashboardAreaTree.js`** — migrate handlers + `loadAllAreas` + dropdown state incrementally
8. **Wire customized** — last; keep `setCustomWidgetFilters` + `areaIdToFloorId` effects in Dashboard
9. **Report** `PHASE_6_2C_7B_AREATREE_EXTRACTION_REPORT.md`

**Explicitly defer:** `SpaceUtilization.jsx` area-tree blocks (parallel structure, separate phase), `AreaTreeDialog.jsx` deduplication, `groupIds` in `buildDashboardApiParams`.

---

## 12. Rollback Plan (for future 7B)

1. Restore inline handlers/helpers in three `Dashboard.jsx` files.
2. Delete `src/shared/dashboard/filters/*` and remove exports.
3. Revert `useAreaTreeSelection` consumers to pre-7B wiring if hook was replaced.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

---

## 13. Files Inspected

| File | Lines (approx) | AreaTree region (approx) |
|------|----------------|--------------------------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | 4,420 | ~770–1600 handlers; ~2714–2840 text; ~3540–3920 dropdown |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | 3,936 | ~721–1600 handlers; ~2304–2430 text; ~2610–2910 dropdown |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | 5,889 | ~2271–3220 handlers; ~3941–4140 text; ~4480–4810 Set; ~790–890 + ~2376–2490 mapping |
| `src/shared/dashboard/hooks/useAreaTreeSelection.js` | 34 | Pre-Set local state (existing) |
| `src/shared/dashboard/hooks/useDashboardApiParams.js` | 55 | Consumes committed selection |
| `src/shared/dashboard/utils/buildDashboardApiParams.js` | 141 | `areaIds` / `floorIds` mutual exclusion |

---

## Stop Boundary Confirmation

- ✅ No `Dashboard.jsx` modifications  
- ✅ No `src/shared/dashboard/filters/` created  
- ✅ No `SpaceUtilization` changes  
- ✅ No `DashboardContainer`  
- ✅ Analysis-only deliverable: this report
