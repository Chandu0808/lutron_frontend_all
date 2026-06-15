# Phase 6.2C.10 — DashboardContainer Extraction Report

**Date:** 2026-06-10  
**Status:** Complete (basic + advanced wired; customized adapter ready)  
**Baseline:** Phase 6.2C.9C (`DashboardLayoutRenderer`, 546 tests)  
**Scope:** Shared dashboard orchestration container — no widget/chart/SpaceUtilization/DnD/custom-graph moves

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was centralized? | Hook composition (`useDashboardContainer`), section assembly (`DashboardContainer` + adapters), area-tree orchestration hook (`useDashboardAreaTreeOrchestration`) |
| Render stack | `DashboardContainer` → `DashboardLayoutRenderer` → `EnergyLayoutRenderer` → `DashboardWidgetRenderer` |
| Custom graph pipeline | **Untouched** — customized adapter delegates `sections.energy` to `runtime.renderEnergySection()` |
| Dashboard LOC delta (9C → 10C) | basic **−115**, advanced **−33**, customized **0** (pending wiring) |
| Shared container LOC | **~750** production + **~110** tests |
| Verification | `npm run build` PASS; **52 suites, 546 tests PASS** (+4 new) |

---

## 2. Overlap Analysis

### 2.1 Pre-extraction (per variant `Dashboard.jsx`)

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|:----------------|
| `useDashboardVisibility` call + options | ✓ | ✓ | ✓ | **EXACT** shape — now in `useDashboardContainer` |
| `useDashboardWidgets` call + options | ✓ | ✓ | ✓ | **EXACT** |
| `useDashboardDates` call + options | ✓ | ✓ | ✓ | **EXACT** |
| `useDashboardExports` call + options | ✓ | ✓ | ✓ | **NEAR** (customized enables custom graph export) |
| Area tree apply/clear/set + selection text | ✓ | ✓ | ✓ | **EXACT** — `useDashboardAreaTreeOrchestration` (basic wired) |
| Section JSX (`overview` / `energy` / `charts` / `alerts`) | ✓ | ✓ | ✓ | **NEAR** — moved to container adapters |
| Energy layout runtime (DnD, combined chart) | basic | — | customized | **VARIANT-ONLY** — stays in `Dashboard.jsx` via `runtime` |
| Tab chrome, subheader, AreaTree UI | ✓ | ✓ | ✓ | **VARIANT-ONLY** |
| API fetch `useEffect` by `activeTab` | ✓ | ✓ | ✓ | **VARIANT-ONLY** |

### 2.2 Post-extraction ownership

| Layer | Owner |
|-------|-------|
| Hook orchestration | `useDashboardContainer` + variant adapter `resolve*Options` |
| Section trees | `adapter.buildSections({ orchestration, runtime })` |
| Tab routing | `DashboardLayoutRenderer` (9C) |
| Energy placement | `EnergyLayoutRenderer` (9B) |
| Widget bodies | `DashboardWidgetRenderer` (8A) |
| Custom graphs + DnD | Variant `Dashboard.jsx` (`renderEnergySection`, `energyLayoutRuntime`) |
| AreaTree UI | Variant `Dashboard.jsx` (chrome) |
| AreaTree resolution logic | `useDashboardAreaTreeOrchestration` (basic wired) |

### 2.3 Stop boundary compliance

| Constraint | Status |
|------------|--------|
| No widget/chart implementation changes | ✓ |
| No SpaceUtilization / DashboardOverview / Alerts internals move | ✓ |
| No `EnergyCustomGraphCard` / custom graph fetch move | ✓ |
| No DnD move (`LongPressDraggable`, `SortableDashboardItem`) | ✓ |
| No Redux contract changes | ✓ |
| Customized custom-graph pipeline local | ✓ (adapter uses `renderEnergySection` delegate) |

---

## 3. Adapter Matrix

| Adapter | Visibility | Widgets | Dates | Exports | `buildSections` | Variant-only runtime |
|---------|------------|---------|-------|---------|-----------------|----------------------|
| `basicDashboardContainerAdapter` | `visibilityMap`, reorder keys | standard energy inputs | standard date actions | basic outside-click profile | full sections + `EnergyLayoutRenderer` | `energyLayoutRuntime`, export controls, duration filter |
| `advancedDashboardContainerAdapter` | `showOverviewTab` | + theme color fns | standard | advanced outside-click profile | full sections | `widgetContextOverrides`, metric shells |
| `customizedDashboardContainerAdapter` | pathname + custom graph fetch | standard | standard | `customizedLegacy` + custom graph export | overview/charts/alerts + **`renderEnergySection`** | entire energy IIFE + DnD |

### `useDashboardContainer` composition order

```
useDashboardVisibility(adapter.resolveVisibilityOptions(runtime))
  → useDashboardWidgets(adapter.resolveWidgetsOptions({ ...runtime, visibility }))
  → useDashboardDates(adapter.resolveDatesOptions({ ...runtime, widgets }))
  → useDashboardExports(adapter.resolveExportsOptions({ ...runtime, dates }))
```

---

## 4. Prop / Runtime Matrix

### `DashboardContainer`

| Prop | Type | Description |
|------|------|-------------|
| `variant` | string | `basic` \| `advanced` \| `customized` |
| `adapter` | container adapter object | Hook options + `buildSections` + `layoutAdapter` |
| `activeTab` | string | Current tab id |
| `orchestration` | `useDashboardContainer` return | Visibility, widgets, dates, exports |
| `runtime` | object | Variant components, Redux data, layout runtimes, export JSX |

### Customized energy delegate (stop-boundary pattern)

```js
// customizedDashboardContainerAdapter.buildSections
energy: typeof renderEnergySection === 'function' ? renderEnergySection(orchestration) : null
```

`renderEnergySection` remains defined in `customized/Dashboard.jsx` with the full `energyCards` / `energyCustomCards` / DnD IIFE.

---

## 5. Files Created

```
src/shared/dashboard/container/
├── DashboardContainer.jsx                    (20 LOC)
├── useDashboardContainer.js                  (37 LOC)
├── useDashboardAreaTreeOrchestration.js      (151 LOC)
├── dashboardContainerResolvers.js            (188 LOC)
├── dashboardContainerMemoCompare.js          (14 LOC)
├── adapters/
│   ├── basicDashboardContainerAdapter.js     (~210 LOC)
│   ├── advancedDashboardContainerAdapter.js (~170 LOC)
│   └── customizedDashboardContainerAdapter.js (~145 LOC)
└── tests/
    └── dashboardContainerParity.test.jsx     (~110 LOC)
```

---

## 6. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | `useDashboardContainer` + `DashboardContainer`; area tree via `useDashboardAreaTreeOrchestration` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | `useDashboardContainer` + `DashboardContainer` |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | **Not wired** — still uses direct hooks + `DashboardLayoutRenderer` (adapter ready) |
| `src/shared/dashboard/container/index.js` | Export container symbols |

---

## 7. LOC Before / After

### Dashboard monoliths (9C → 10C)

| File | After 9C | After 10C | Δ |
|------|----------|-----------|---|
| `basic/.../Dashboard.jsx` | 3,563 | 3,448 | **−115** |
| `advanced/.../Dashboard.jsx` | 3,036 | 3,003 | **−33** |
| `customized/.../Dashboard.jsx` | 4,867 | 4,867 | **0** |
| **Total** | **11,466** | **11,318** | **−148** |

### Shared container module (10C only)

~750 production LOC + ~110 test LOC

Remaining bulk in variant `Dashboard.jsx` files: tab chrome, AreaTree UI, API effects, export menu JSX, energy layout runtimes (DnD shells).

---

## 8. Architecture After 10C

```
Dashboard.jsx (variant)
  ├── Redux selectors + local state
  ├── useDashboardAreaTreeOrchestration (basic)
  ├── orchestration = useDashboardContainer(adapter, runtime)
  ├── Tab chrome + AreaTree UI
  └── <DashboardContainer orchestration={...} runtime={...} />
        └── DashboardLayoutRenderer
              └── EnergyLayoutRenderer
                    └── DashboardWidgetRenderer
```

---

## 9. Test Results

```
npm run build                          → Compiled successfully
npm test -- --testPathPattern=shared/dashboard
  → 52 suites passed, 546 tests passed (+4 container parity tests)
```

### `dashboardContainerParity.test.jsx`

- Adapter section-key resolution (basic, advanced, customized `space-utilization` → `charts`)
- Customized `renderEnergySection` delegate invoked
- `DashboardContainer` routes active tab to correct section

---

## 10. Rollback Plan

### Full rollback (10C only)

1. Delete `DashboardContainer.jsx`, `useDashboardContainer.js`, `useDashboardAreaTreeOrchestration.js`, `dashboardContainerResolvers.js`, `dashboardContainerMemoCompare.js`, `adapters/*DashboardContainerAdapter.js`, `tests/dashboardContainerParity.test.jsx`
2. Revert `container/index.js` exports
3. Restore direct hook calls + inline `DashboardLayoutRenderer` sections in basic/advanced `Dashboard.jsx`
4. Restore inline area-tree functions in basic (if orchestration hook removed)
5. Delete this report
6. Run build + `npm test -- --testPathPattern=shared/dashboard`

### Partial rollback

- Keep `useDashboardContainer` but unwired variants can call hooks directly again
- Phases 9B/9C (`EnergyLayoutRenderer`, `DashboardLayoutRenderer`) are independent

---

## 11. Remaining Work (customized wiring)

`customizedDashboardContainerAdapter` is complete. To finish customized migration:

1. Replace four hook calls with `useDashboardContainer(customizedDashboardContainerAdapter, runtime)`
2. Extract energy IIFE into `renderEnergySection(orchestration)` callback (unchanged logic)
3. Replace `<DashboardLayoutRenderer>` with `<DashboardContainer runtime={{ renderEnergySection, ... }} />`

No custom-graph code moves into shared modules.

---

## 12. Next Step — Phase 11

With container orchestration in place for basic/advanced, a future phase can:

- Wire customized using `renderEnergySection` delegate
- Lift tab chrome into a shared shell (optional)
- Introduce top-level `DashboardContainer` wrapper that owns selectors + chrome (full thin-wrapper goal)
