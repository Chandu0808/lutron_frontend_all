# Phase 6.4E — Final Shared Dashboard/Space Architecture Audit

**Date:** 2026-06-10  
**Status:** Read-only audit (no production code changes)  
**Baseline:** Phases 6.2C.* (dashboard container), 6.3.* (space extraction), 6.4A–6.4D (cleanup + shared presentation)  
**Scope:** `src/shared/dashboard/**` and variant `Dashboard.jsx` / `SpaceUtilization.jsx` shells

---

## 1. Executive Summary

| Metric | 6.4A (pre-cleanup) | 6.4E (final) | Δ |
|--------|-------------------:|-------------:|--:|
| Shared `dashboard/` total LOC | 29,805 | **33,206** | +3,401 |
| Shared production LOC | 21,035 | **23,427** | +2,392 |
| Shared test LOC | 8,770 | **9,779** | +1,009 |
| Shared files (*.js/*.jsx) | 266 | **278** | +12 |
| Test suites (`shared/dashboard`) | 63 | **65** | +2 |
| Tests | 658 | **666** | +8 |
| `Dashboard.jsx` (3 variants) | 11,297 | **12,218** | +921* |
| `SpaceUtilization.jsx` (3 variants) | 7,030 | **7,269** | +239* |
| Space layout slot helpers | 747 | **772** | +25 |

\*Variant LOC drift vs 6.4A reflects ongoing variant edits and line-count methodology; net **SpaceUtilization shell weight decreased** after 6.4B–6.4D extractions (−~150 LOC in SU variants vs 6.4C baseline, offset by other variant changes).

**Verdict:** Container architecture is **stable and production-ready**. Shared layers (`container/`, `space/container/`, `widgets/`, `filters/`, `export/`, `space/`) form a coherent stack with **no circular barrel dependencies**. Remaining weight is **intentionally variant-owned** (custom graphs, DnD, export JSX, Dashboard monoliths) or **low-risk hygiene** (unused barrels, test-only exports).

**Safe Remove candidates discovered:** None requiring immediate action beyond items already addressed in 6.4B–6.4D. New candidates are **barrel-trim only** (LOW risk) — see §2.4.

---

## 2. STEP 1 — Shared API Audit

### 2.1 Import topology

```
variants/Dashboard.jsx ──────► container/, container/layout, container/helpers, filters/
variants/DashboardOverview.jsx ► widgets/overview, widgets/alerts (sub-barrels)
variants/SpaceUtilization.jsx ► space/container, space/components, space/components/status
variants/*SpaceLayoutSlots.jsx ► space/container (SpaceWidgetRenderer)

shared/dashboard internals:
  DashboardContainer ──► container/layout
  SpaceUtilizationContainer ──► space/container (direct)
  SpaceWidgetRenderer ──► space/widgets, charts/space (direct paths)
  *ContainerAdapter ──► space/export (direct paths)

UNUSED as import targets:
  export/index.js, widgets/index.js, charts/space/index.js, space/transforms/index.js
```

No `src/shared/dashboard/index.js` root barrel (intentional).

### 2.2 Symbol classification — `container/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `DashboardContainer` | 3× `Dashboard.jsx` | **public API** |
| `useDashboardContainer` | 3× `Dashboard.jsx` | **public API** |
| `DashboardWidgetRenderer` | 3× `Dashboard.jsx` | **public API** |
| `basic/advanced/customizedDashboardContainerAdapter` | respective `Dashboard.jsx` | **public API** |
| `buildBasic/Advanced/CustomizedEnergyWidgetRenderContext` | respective `Dashboard.jsx` | **public API** |
| `useDashboardAreaTreeOrchestration` | `basic/Dashboard.jsx` only | **public API** (partially adopted) |
| `resolveWidget*`, `buildEnergyWidgetRenderContext`, render map constants | internal `container/*`, tests | **internal only** |
| `dashboardWidgetRendererPropsAreEqual` | `DashboardWidgetRenderer.jsx` | **internal only** (re-exported from barrel) |
| Layout re-exports (`EnergyLayoutRenderer`, registries, adapters) | variants import `container/layout` directly | **barrel-only** (via `container/index.js`) |
| `container/hooks/*` (39 symbols) | `useDashboardContainer.js` only | **internal only** |

### 2.3 Symbol classification — `space/container/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `SpaceUtilizationContainer` | 3× `SpaceUtilization.jsx` | **public API** |
| `useSpaceUtilizationContainer` | 3× `SpaceUtilization.jsx` | **public API** |
| `SpaceLayoutRenderer` | 3× `SpaceUtilization.jsx` | **public API** |
| `basic/advanced/customizedSpaceContainerAdapter` | respective `SpaceUtilization.jsx` | **public API** |
| `create*SpaceLayoutAdapter`, `SPACE_TAB_IDS` | respective variants + slots | **public API** |
| `buildSpaceChartsDashboardRows` | `basic/SpaceUtilization.jsx` | **public API** |
| `resolveSpaceActiveTab` | `advanced/SpaceUtilization.jsx` | **public API** |
| `SpaceWidgetRenderer` | 3× `*SpaceLayoutSlots.jsx` | **public API** |
| Layout constants (`BASIC_SPACE_SLOT_REGISTRY`, etc.) | tests + internal adapters | **internal only** / **test-only** |
| `resolveSpaceWidget*`, render map, `buildSpaceWidgetRenderContext` | internal renderers/adapters, tests | **internal only** |
| `buildSpaceContainerWidgetContext`, `buildSpaceContainerLayoutContext` | adapters (direct import) | **internal only** (removed from barrel in 6.4B) |

### 2.4 Symbol classification — `space/components/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `bindChartLoader` | 3× `SpaceUtilization.jsx` | **public API** |
| `SpaceErrorPanel`, `SpaceStatusPanel` | 3× `SpaceUtilization.jsx` | **public API** |
| `SpaceEmptyPanel` | `basicSpaceLayoutSlots.jsx` | **public API** |
| `ChartLoader`, `CHART_LOADER_*`, `resolveChartLoaderPreset` | internal `ChartLoader.jsx` | **internal only** (barrel re-export) |
| `SPACE_STATUS_*`, `resolveSpaceStatus*` | internal status panels | **internal only** (barrel re-export) |

### 2.5 Symbol classification — `filters/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `flattenAreaTree`, `getAllAreaIdsFromFloor`, `getAreasForFloor`, `getAllChildAreaIds`, `getAllAreasFromGroup` | 3× `Dashboard.jsx` | **public API** |
| `checkIfChildrenSelected`, `checkIfAllChildrenSelected`, `getAreaSelectionText` | 3× `Dashboard.jsx` | **public API** |
| `buildClearAllResolution`, `buildSelectAllResolution`, `shouldSkipLoadAllAreas`, `processFloorPayloadForAreaLoad` | 3× `Dashboard.jsx` | **public API** |
| `resolveAreaToggleSelection`, `resolveGroupToggleSelection`, `resolveIntermediateParentToggle`, `resolveFloorDeselectAreas` | 3× `Dashboard.jsx` | **public API** |
| `collectFloorCheckboxAreaIds`, `resolveFloorSelectAreas` | basic + advanced `Dashboard.jsx` | **public API** (partial) |
| `getTreeRoots`, `traverseAreaNodes`, `getAllAreaIds`, `mergeAreaSelections`, etc. | internal `filters/*.js` | **internal only** |
| `resolveSelectedAreaIds/FloorIds/GroupIds` | — | **test-only** |
| `resolveAreaTreeCheckboxState/SelectionState/SummaryState` | — | **test-only** |
| `getFloorSelectionText`, `getGroupSelectionText`, `getAreaSummaryText` | internal + tests | **test-only** (external) |
| `getDirectChildAreaIdsFromFloor` | — | **test-only** |

### 2.6 Symbol classification — `export/` and `space/export/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| All `export/index.js` symbols (9) | direct file imports inside `shared/dashboard` | **dead export** (barrel unused) |
| `useSpaceExports` | `useSpaceUtilizationContainer.js` (direct path) | **internal only** |
| `DEFAULT_SPACE_EXPORT_DROPDOWN_*`, `createSpaceExportOutsideClickProfile` | space container adapters (direct) | **internal only** |
| `space/export/index.js` barrel | — | **dead export** (zero production barrel imports) |

### 2.7 Symbol classification — `widgets/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `widgets/index.js` entire barrel (~80 symbols) | — | **dead export** (barrel unused) |
| `widgets/overview/*`, `widgets/alerts/*` | `DashboardOverview.jsx` (sub-barrels) | **public API** |
| Energy/peak/LPD/savings widgets | `DashboardWidgetRenderer`, tests (direct paths) | **internal only** |
| `space/widgets/*` | `SpaceWidgetRenderer` (direct) | **internal only** |

### 2.8 Symbol classification — `registry/`

| Symbol | Consumers | Classification |
|--------|-----------|----------------|
| `widgetRegistry.js` exports | `widgetRegistry.test.js` only | **test-only** / orphan package |

### 2.9 New SAFE REMOVE candidates (6.4E)

| Item | Risk | Action |
|------|------|--------|
| None (production dead symbols) | — | 6.4B removed confirmed dead fns |
| Trim `export/index.js`, `widgets/index.js` barrels | LOW | Optional 6.5 — barrels have zero import sites |
| Trim theme constant re-exports from `space/components/index.js` | LOW | Optional 6.5 |
| Remove `registry/` or stop exporting | LOW | Documentation artifact only |

**No production code changes made in 6.4E.**

---

## 3. STEP 2 — Memoization Audit

### 3.1 Comparator inventory (25 `*MemoCompare*` source files)

| Comparator | Wired to `memo()`? | External consumer? | Notes |
|------------|:------------------:|:------------------:|-------|
| `dashboardContainerPropsAreEqual` | ✓ | No | **Gap:** omits `orchestration` prop |
| `spaceUtilizationContainerPropsAreEqual` | ✓ | No | Includes `orchestration` |
| `dashboardWidgetRendererPropsAreEqual` | ✓ | Barrel only | Missing `widgetProps` override compare |
| `spaceWidgetRendererPropsAreEqual` | ✓ | No | Includes `chartLoaderHeight`, `overrides` |
| `dashboardLayoutRendererPropsAreEqual` | ✓ | Barrel only | — |
| `spaceLayoutRendererPropsAreEqual` | ✓ | No | — |
| `energyLayoutRendererPropsAreEqual` | ✓ | Barrel only | — |
| `chartLoaderPropsAreEqual` | ✓ | No | 6.4C |
| `spaceStatus*PropsAreEqual` (×3) | ✓ | No | 6.4D |
| Widget/chart comparators (×14) | ✓ | Mostly internal | `legacy*` fns = test-only |
| `createVisibilityOrderSignature` | helper | `useDashboardVisibility` | Not a `memo()` comparator |

### 3.2 Duplicate comparator patterns

| Pattern | Dashboard | Space | Assessment |
|---------|-----------|-------|------------|
| Container props compare | 4 fields, no `orchestration` | 5 fields with `orchestration` | **Inconsistent** — medium fix candidate |
| Widget renderer compare | +`variant` | +`chartLoaderHeight`, `overrides` | **Parallel by design** |
| Layout renderer compare | `sections` map | `layoutContext` + `runtime` | **Different shapes** — not mergeable |

### 3.3 `React.memo` without custom comparator

| Component | File | Risk |
|-----------|------|------|
| `DashboardTabRenderer` | `container/layout/DashboardTabRenderer.jsx` | LOW — thin wrapper |
| `WidgetSlotRenderer` | `container/layout/WidgetSlotRenderer.jsx` | LOW — passes stable slot props |

### 3.4 `useMemo` / `useCallback` density

Heavy usage concentrated in:
- `useDashboardWidgets.js` (15), `useDashboardVisibility.js` (15)
- `useSpaceUtilizationContainer.js` (8)
- Chart adapters and energy widgets (4–9 each)

**No redundant memoization flagged for removal** without profiling. Variant `SpaceUtilization.jsx` files retain large `useMemo` orchestration blocks (runtime/context) — intentional for referential stability.

### 3.5 Never-used / test-only comparators

- `legacySpaceLineChartPropsAreEqual`, `legacySpaceStackedBarChartPropsAreEqual`, `legacyInstantOccupancyChartPropsAreEqual`
- `legacyLightPowerDensityWidgetPropsAreEqual`

---

## 4. STEP 3 — Shared Container Audit

### 4.1 Structural comparison

| Concern | DashboardContainer | SpaceUtilizationContainer |
|---------|-------------------|---------------------------|
| LOC (component) | ~25 | ~25 |
| Memo wrapper | `dashboardContainerPropsAreEqual` | `spaceUtilizationContainerPropsAreEqual` |
| Child renderer | `DashboardLayoutRenderer` (via adapter sections) | `SpaceLayoutRenderer` (via adapter `buildSections`) |
| Hook | `useDashboardContainer` (4 sub-hooks) | `useSpaceUtilizationContainer` (adapter pipeline) |
| Orchestration split | Adapter resolves hook options | Adapter builds contexts |

**Verdict:** Thin containers with **no duplicated orchestration between them**. Parallel design is appropriate.

### 4.2 Adapter responsibility matrix

**Dashboard adapters**

| Method | Purpose |
|--------|---------|
| `resolveVisibilityOptions` | Widget order/visibility |
| `resolveWidgetsOptions` | Chart loading, energy context inputs |
| `resolveDatesOptions` | Period navigation |
| `resolveExportsOptions` | Export thunk keys |
| `buildSections` | Tab → layout renderer tree |

**Space adapters**

| Method | Purpose |
|--------|---------|
| `resolveWidgetOptions` | Data sources, loading, chart context |
| `resolveLayoutOptions` | Tab visibility, slot order |
| `resolveExportOptions` | Export preset + thunks |
| `buildWidgetContext` | Widget render context |
| `buildLayoutContexts` | Charts vs main layout contexts |
| `buildSections` | `<SpaceLayoutRenderer />` |

### 4.3 Duplicated adapter code (space)

| Block | Variants | Est. duplicate LOC |
|-------|----------|-------------------:|
| `resolveWidgetOptions` header (data/loading/chart) | all 3 | ~40 each |
| `buildLoadingState` | all 3 | identical |
| `buildWidgetContext` | all 3 | identical delegation |

**Factory candidate (YELLOW/MEDIUM):** `createSpaceContainerAdapter` — deferred from 6.4A.

### 4.4 Runtime delegate boundaries

| Runtime field | Dashboard | Space |
|---------------|-----------|-------|
| `ChartLoader` | variant inline (Dashboard) / N/A | `bindChartLoader` (6.4C) |
| `renderCustomSlot` | energy combined slot | instant_utilization_combined, custom graphs |
| `renderEmptyState` | — | basic only via `renderBasicSpaceEmptyState` |
| `renderSortableLayout` | customized energy | customized charts tab |
| Export dropdown renderer | variant JSX | variant JSX (not container) |

### 4.5 Dead / ignored runtime fields

| Location | Issue |
|----------|-------|
| `useSpaceUtilizationContainer` → `buildLoadingState(widgetOptions, layoutOptions)` | Adapters ignore `layoutOptions` |
| `buildWidgetContext({ runtime, widgetOptions, loading, exports })` | Adapters use `widgetOptions` only |
| `customizedDashboardContainerAdapter.buildSections` | `orchestration` unused — delegates to `runtime.renderEnergySection` |

---

## 5. STEP 4 — Shared Renderer Audit

### 5.1 Widget key inventories

**DashboardWidgetRenderer** (`widgetRenderMap.js`)

| Key | Renders? |
|-----|----------|
| `energy`, `schedules`, `quick_controls`, `floors`, `space_utilization` | ✓ Overview tiles |
| `alerts` | **✗ returns null** (dead branch) |
| `consumption`, `savings` | ✓ Unified energy |
| `savings_by_strategy` | ✓ |
| `total_consumption_by_group` | ✓ |
| `light_power_density` | ✓ |
| `peak_and_minimum_consumption` | ✓ |

**SpaceWidgetRenderer** (`spaceWidgetRenderMap.js`)

| Key | Renders? |
|-----|----------|
| `utilization` | ✓ Line chart |
| `utilization_by_area_group` | ✓ Stacked bar |
| `instant_occupancy_count` | ✓ Instant occupancy |
| `peak_and_minimum_utilization` | ✓ Peak/min cards |
| `utilization_by_area` | ✓ Area list |
| `instant_utilization_combined` | **Not in map** — variant custom slot only |

### 5.2 Layout renderer routing

| Renderer | Modes / routing |
|----------|-----------------|
| `DashboardLayoutRenderer` | Tab → section key → `DashboardTabRenderer` |
| `EnergyLayoutRenderer` | `DYNAMIC_ROWS`, `FIXED_GRID`, `SORTABLE_GRID` |
| `SpaceLayoutRenderer` | `DYNAMIC_ROWS`, `FIXED_SECTIONS`, `SORTABLE_GRID` → widget/custom/unknown slots |

**Dead branch:** `SpaceLayoutRenderer` — unknown `layoutMode` yields empty body inside shell.

### 5.3 Resolver helper usage

All resolver helpers in `widgetSlotResolvers.js` / `spaceWidgetSlotResolvers.js` are consumed by their respective renderers or tests. **No orphan resolver exports** found post-6.4B.

### 5.4 Duplicated routing logic

| Pattern | Dashboard | Space |
|---------|-----------|-------|
| Map → type switch → component | `renderWidgetByType` | `renderSpaceWidgetByType` |
| Loading gate before render | via widget props / shells | `ChartLoader` in `SpaceWidgetRenderer` |

**Parallel, not duplicated** — different chart families.

---

## 6. STEP 5 — Remaining Large Files

### 6.1 Variant shells

| File | LOC | Classification |
|------|----:|----------------|
| `basic/Dashboard.jsx` | 3,727 | **Candidate for future work** — energy + area tree shell |
| `advanced/Dashboard.jsx` | 3,281 | **Candidate for future work** |
| `customized/Dashboard.jsx` | 5,210 | **Candidate for future work** — largest variant |
| `basic/SpaceUtilization.jsx` | 1,673 | **Acceptable** — DnD + combined chart + tab chrome |
| `advanced/SpaceUtilization.jsx` | 508 | **Acceptable** — thinnest shell (reference target) |
| `customized/SpaceUtilization.jsx` | 5,088 | **Intentionally variant-owned** — custom graphs + DnD |

### 6.2 Variant slot helpers

| File | LOC | Classification |
|------|----:|----------------|
| `basicSpaceLayoutSlots.jsx` | 364 | **Acceptable** — export chrome, combined slot |
| `advancedSpaceLayoutSlots.jsx` | 199 | **Acceptable** |
| `customizedSpaceLayoutSlots.jsx` | 209 | **Acceptable** |

### 6.3 Shared container modules

| Module | LOC | Classification |
|--------|----:|----------------|
| `shared/dashboard/container/` | 7,559 | **Acceptable** — core dashboard stack |
| `shared/dashboard/space/container/` | 2,871 | **Acceptable** |
| `shared/dashboard/space/components/` | 510 | **Acceptable** — 6.4C/6.4D additions |
| `shared/dashboard/space/` (total) | 5,678 | **Acceptable** |
| `shared/dashboard/widgets/` | 5,140 | **Acceptable** |
| `shared/dashboard/filters/` | 2,481 | **Acceptable** |
| `shared/dashboard/export/` | 440 | **Acceptable** |

### 6.4 Phase 6.4 impact on variant SU LOC

| Variant | Pre-6.4C | Post-6.4D | Δ |
|---------|--------:|----------:|--:|
| basic SU | 1,733 | 1,673 | −60 |
| advanced SU | 568 | 508 | −60 |
| customized SU | 5,148 | 5,088 | −60 |

---

## 7. STEP 6 — Technical Debt Register

Full register: **[PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md](./PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md)**

Summary counts: **4 HIGH**, **10 MEDIUM**, **12 LOW** items.

---

## 8. STEP 7 — Final Recommendation

### Option 1 — Stop now (maintenance mode) ✓ Recommended

**Rationale:**
- Container layers are wired, tested (666 tests), and build-clean
- Shared extraction goals for Phase 6 are met
- Further refactors without product drivers increase regression risk
- Remaining debt is **documented and bounded**

**Maintenance mode actions:**
- New features go through existing container/adapter paths
- Only SAFE REMOVE hygiene when touching nearby code
- Keep parity tests green for `shared/dashboard`

### Option 2 — Optional Phase 6.5 cleanup package

Low-risk bundle (~1–2 weeks):

| Priority | Item | Est. savings |
|----------|------|-------------:|
| 1 | Barrel trim (`export/`, `widgets/`, theme re-exports) | noise reduction |
| 2 | Wire `useDashboardAreaTreeOrchestration` to adv/cust Dashboard | ~140 LOC |
| 3 | Shared `ChartLoader` in Dashboard.jsx (mirror 6.4C) | ~75 LOC |
| 4 | `dashboardContainerPropsAreEqual` + `orchestration` fix | bug-prevention |
| 5 | Snackbar shell extraction (optional) | ~90 LOC |

**Not in 6.5:** custom graphs, DnD grid, export JSX, adapter factories (medium risk).

### Option 3 — Future Phase 7 candidates

| Phase | Scope | Risk |
|-------|-------|------|
| 7A | Custom graph container + pipeline extraction | HIGH |
| 7B | Dashboard.jsx shell reduction (area tree, email gate, exports) | HIGH |
| 7C | `createSpaceContainerAdapter` / `createDashboardContainerAdapter` factories | MEDIUM |
| 7D | Export dropdown presentational component | MEDIUM |
| 7E | Fullscreen wrapper shared layer (customized) | MEDIUM |

---

## 9. Verification Snapshot (audit session)

```
npm test -- --testPathPattern=shared/dashboard
→ 65 suites, 666 tests PASS
```

No production files modified in Phase 6.4E.

---

## 10. Hard Stop Compliance

| Constraint | Status |
|------------|--------|
| No production refactors | ✓ |
| No custom graph moves | ✓ |
| No adapter/container/renderer/export/DnD changes | ✓ |
| Audit only | ✓ |

---

## 11. Related Documents

| Document | Phase |
|----------|-------|
| [PHASE_6_4A_ARCHITECTURE_AUDIT.md](./PHASE_6_4A_ARCHITECTURE_AUDIT.md) | Initial post-extraction audit |
| [PHASE_6_4B_SAFE_REMOVE_CLEANUP_REPORT.md](./PHASE_6_4B_SAFE_REMOVE_CLEANUP_REPORT.md) | Tier 1 dead code |
| [PHASE_6_4C_SHARED_CHART_LOADER_REPORT.md](./PHASE_6_4C_SHARED_CHART_LOADER_REPORT.md) | ChartLoader extraction |
| [PHASE_6_4D_SPACE_STATUS_PANELS_REPORT.md](./PHASE_6_4D_SPACE_STATUS_PANELS_REPORT.md) | Status panels extraction |
| [PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md](./PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md) | Debt register |

---

*End of Phase 6.4E final architecture audit.*
