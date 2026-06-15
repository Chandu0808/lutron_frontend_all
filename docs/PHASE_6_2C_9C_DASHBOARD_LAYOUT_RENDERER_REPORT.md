# Phase 6.2C.9C — DashboardLayoutRenderer Extraction Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.2C.9B (`EnergyLayoutRenderer`, build PASS, 529 tests)  
**Scope:** Dashboard **tab section routing** only — no `DashboardContainer`, no business logic, filters, AreaTree, DnD, or widget moves

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was centralized? | `activeTab` → section routing for overview, energy, alerts, and charts/space-utilization |
| What stayed variant-owned? | Section JSX (hooks, data, DnD, custom graphs), tab chrome, AreaTree, exports, dates, visibility |
| Dashboard LOC delta (9B → 9C) | **−4** net (−1 basic, −3 advanced, +2 customized) |
| Shared module LOC added (9C) | **~175** production + **108** tests |
| Verification | `npm run build` PASS; **51 suites, 542 tests PASS** (+13 new) |

Tab routing is now the last layout abstraction before Phase 6.2C.10 `DashboardContainer`. Each variant `Dashboard.jsx` passes pre-built section trees into `<DashboardLayoutRenderer />` while retaining all hooks and orchestration above it.

---

## 2. Overlap Analysis (Step 1 Audit)

### 2.1 Pre-extraction tab routing inventory

| Variant | Tab IDs (nav) | Section render pattern | Charts tab ID |
|---------|---------------|------------------------|---------------|
| **basic** | `overview`, `energy`, `charts`, `alerts` | `{activeTab === 'X' && (...)}` chain × 4 + dead `space-utilization && false` | `charts` |
| **advanced** | `overview` (optional), `energy`, `charts`, `alerts` | Same chain × 4 + dead `space-utilization && false` | `charts` |
| **customized** | `overview` (optional), `energy`, `space-utilization`, `alerts` | Same chain × 4; energy = large IIFE | `space-utilization` → charts content |

### 2.2 Section content by tab

| Section | basic | advanced | customized | Overlap class |
|---------|:-----:|:--------:|:----------:|:-------------:|
| **Overview** | `<DashboardOverview />` + navigate callbacks | Same props pattern | Same; customized uses `navigate()` for alerts | **NEAR** (~95% — callback style differs) |
| **Energy** | Duration filter + empty state + `EnergyLayoutRenderer` | `EnergyLayoutRenderer` only | IIFE: `energyCards`, custom graphs, DnD, `EnergyLayoutRenderer` | **VARIANT-ONLY** |
| **Charts** | `<SpaceUtilization showChartsTab />` | Same | `<SpaceUtilization dashboardApiParams={apiParams} />` (full page) | **NEAR** (same component, props differ) |
| **Alerts** | `<Alerts />` | `<Alerts />` | `<Box shell><Alerts /></Box>` | **NEAR** (customized shell wrapper) |

### 2.3 Classification summary

| Pattern | Classification | Action in 9C |
|---------|----------------|--------------|
| `activeTab === 'overview' && ...` | **EXACT** routing shape | Centralized in `DashboardLayoutRenderer` |
| `activeTab === 'energy' && ...` | **EXACT** routing shape | Centralized; content unchanged |
| `activeTab === 'charts' && ...` | **EXACT** (basic/advanced) | Centralized as `sections.charts` |
| `activeTab === 'space-utilization' && ...` | **VARIANT-ONLY** tab ID | Adapter maps → `charts` section key |
| Section JSX bodies | **VARIANT-ONLY** | Passed via `sections` prop |
| Tab nav pills / subheader chrome | **VARIANT-ONLY** | Unchanged in `Dashboard.jsx` |
| `useEffect` fetch by `activeTab` | **VARIANT-ONLY** | Unchanged |

### 2.4 Recoverable vs actual LOC

Routing conditionals were **~90 LOC** across variants, but section JSX moved into a `sections` object — net dashboard reduction is minimal. Value is structural: `Dashboard.jsx` now has a single routing entry point preparing for `DashboardContainer`.

---

## 3. Tab Routing Matrix

| Canonical section | basic `activeTab` | advanced `activeTab` | customized `activeTab` | Section component |
|-------------------|-------------------|----------------------|------------------------|-------------------|
| `overview` | `overview` | `overview` | `overview` (if enabled) | `DashboardOverview` |
| `energy` | `energy` | `energy` | `energy` | `EnergyLayoutRenderer` (+ variant wrappers) |
| `charts` | `charts` | `charts` | `space-utilization` → `charts` | `SpaceUtilization` |
| `alerts` | `alerts` | `alerts` | `alerts` | `Alerts` |

### Adapter tab ordering metadata

| Adapter | `TAB_ORDER` |
|---------|-------------|
| `BASIC_DASHBOARD_LAYOUT_ADAPTER` | overview → energy → charts → alerts |
| `ADVANCED_DASHBOARD_LAYOUT_ADAPTER` | overview → energy → charts → alerts |
| `CUSTOMIZED_DASHBOARD_LAYOUT_ADAPTER` | overview → energy → space-utilization → alerts |

Advanced nav may hide overview via `SHOW_OVERVIEW_TAB` (variant-owned); adapter documents full order. Customized uses `resolveCustomizedDashboardTabOrder(overviewEnabled)` helper when overview gating is needed outside the adapter.

---

## 4. Prop Matrix

### 4.1 `DashboardLayoutRenderer`

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `activeTab` | string | ✓ | Current tab from variant state / URL sync |
| `variant` | `'basic' \| 'advanced' \| 'customized'` | ✓ | Passed for memo identity |
| `sections` | `Record<sectionKey, ReactNode>` | ✓ | Pre-built section trees from variant |
| `adapter` | layout adapter object | ✓ | Tab→section mapping metadata |

**Does not accept:** hooks, Redux, fetch callbacks, AreaTree, DnD config.

### 4.2 `DashboardTabRenderer`

| Prop | Type | Description |
|------|------|-------------|
| `tabId` | string | Canonical section key (`overview`, `energy`, `charts`, `alerts`) |
| `sectionProps` | `{ Wrapper?, wrapperProps? }` | Optional shell wrapper (unused in current wiring — content includes shells) |
| `children` | ReactNode | Active section content |

### 4.3 Layout adapter contract

| Field | Type | Description |
|-------|------|-------------|
| `variant` | string | Variant identifier |
| `TAB_ORDER` | string[] | Nav tab ordering metadata |
| `resolveSectionKey(activeTab)` | function | Maps tab ID → canonical section key or `null` |

No hooks. No Redux.

### 4.4 `dashboardLayoutResolvers.js` exports

| Function | Purpose |
|----------|---------|
| `resolveDashboardSectionKey(activeTab, adapter)` | Tab → section key |
| `isDashboardTabRoutable(activeTab, adapter)` | Whether tab renders a section |
| `resolveDashboardSectionContent(activeTab, sections, adapter)` | Lookup section JSX |
| `resolveDashboardSectionProps(activeTab, adapter)` | Optional wrapper props |
| `listRoutableDashboardSections(adapter)` | Deduped section list from tab order |

---

## 5. Files Created

```
src/shared/dashboard/container/layout/
├── DashboardLayoutRenderer.jsx              (26 LOC)
├── DashboardTabRenderer.jsx                 (16 LOC)
├── dashboardLayoutResolvers.js              (38 LOC)
├── dashboardLayoutMemoCompare.js            (8 LOC)
├── dashboardLayoutParity.test.jsx           (108 LOC)
└── adapters/
    ├── basicDashboardLayoutAdapter.js       (24 LOC)
    ├── advancedDashboardLayoutAdapter.js    (29 LOC)
    └── customizedDashboardLayoutAdapter.js  (34 LOC)
```

**Also extended:** `layoutTypes.js` — `DASHBOARD_SECTION_IDS`, `DASHBOARD_TAB_IDS` (+11 LOC)

**Production LOC added (9C):** ~175  
**Test LOC added (9C):** 108

---

## 6. Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/Dashboard.jsx` | Replaced 4 `activeTab ===` blocks + dead `space-utilization` with `<DashboardLayoutRenderer />` |
| `src/variants/advanced/screens/dashboard/Dashboard.jsx` | Same |
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Same; energy IIFE and custom graphs remain inside `sections.energy` |
| `src/shared/dashboard/container/layout/index.js` | Export dashboard layout symbols |
| `src/shared/dashboard/container/index.js` | Re-export `DashboardLayoutRenderer`, adapters |

---

## 7. LOC Before / After

### 7.1 Dashboard monoliths (9B → 9C)

| File | After 9B | After 9C | Δ |
|------|----------|----------|---|
| `basic/.../Dashboard.jsx` | 3,564 | 3,563 | **−1** |
| `advanced/.../Dashboard.jsx` | 3,039 | 3,036 | **−3** |
| `customized/.../Dashboard.jsx` | 4,865 | 4,867 | **+2** |
| **Total** | **11,468** | **11,466** | **−2** |

Routing conditionals removed; section content re-nested under `sections={{ ... }}` — near-zero net LOC change by design.

### 7.2 Cumulative layout module (9B + 9C)

| Category | LOC |
|----------|-----|
| 9B energy layout (production) | ~549 |
| 9C tab layout (production) | ~175 |
| Layout tests (9B + 9C) | ~298 |

---

## 8. Wiring Summary

Each variant now renders:

```jsx
<DashboardLayoutRenderer
  activeTab={activeTab}
  variant="<variant>"
  adapter={VARIANT_DASHBOARD_LAYOUT_ADAPTER}
  sections={{
    overview: <DashboardOverview ... />,
    energy: <>{/* variant energy content unchanged */}</>,
    charts: <SpaceUtilization ... />,
    alerts: <Alerts ... /> /* or Box-wrapped in customized */,
  }}
/>
```

**Preserved unchanged:**
- `LongPressDraggable`, `SortableDashboardItem`, `@dnd-kit` contexts (inside `sections.energy`)
- `EnergyCustomGraphCard`, `energyCards` IIFE (customized)
- Tab pill nav, subheader chrome, AreaTree, export menus, date filters
- `useEffect` data fetching keyed on `activeTab`

---

## 9. Test Results

### 9.1 `dashboardLayoutParity.test.jsx` (13 tests)

| Test | Assertion |
|------|-----------|
| Adapter key resolution | basic/advanced canonical keys; customized `space-utilization` → `charts` |
| basic × 4 tabs | Only matching section testid rendered |
| advanced × 4 tabs | Same |
| customized space-utilization | Routes to charts section; custom graph slot preserved |
| Unroutable tab | Returns empty DOM |

### 9.2 Full suite

```
npm run build                          → Compiled successfully
npm test -- --testPathPattern=shared/dashboard
  → 51 suites passed, 542 tests passed (+13 vs 9B baseline)
```

---

## 10. Rollback Plan

### 10.1 Full rollback (9C only)

1. Delete new 9C files under `layout/` (DashboardLayoutRenderer, DashboardTabRenderer, dashboardLayoutResolvers, dashboardLayoutMemoCompare, 3 dashboard layout adapters, dashboardLayoutParity.test.jsx)
2. Revert `layoutTypes.js` DASHBOARD_SECTION_IDS additions
3. Revert `layout/index.js` and `container/index.js` exports
4. Restore `{activeTab === 'X' && (...)}` chains in basic, advanced, customized `Dashboard.jsx`
5. Delete this report
6. Run build + shared/dashboard tests

### 10.2 Partial rollback

Keep adapters/resolvers for metadata; unwired variants can use direct conditionals again.

### 10.3 Independence

- Phase 6.2C.9B `EnergyLayoutRenderer` is independent — rollback 9C does not affect energy placement
- Phase 6.2C.8A `DashboardWidgetRenderer` unaffected

---

## 11. Stop Boundary Compliance

| Constraint | Compliant |
|------------|:---------:|
| No `DashboardContainer` | ✓ |
| No exports/dates/AreaTree move | ✓ |
| No DnD move | ✓ |
| No custom graph / `EnergyCustomGraphCard` move | ✓ |
| No `SpaceUtilization` / `DashboardOverview` / `Alerts` internals move | ✓ |
| No widget implementation changes | ✓ |
| Tab section routing only | ✓ |

---

## 12. Next Step — Phase 6.2C.10

With tab routing centralized, `Dashboard.jsx` per variant is structurally:

```
hooks (exports, dates, widgets, visibility)
AreaTree orchestration
section props / JSX assembly
<DashboardLayoutRenderer sections={...} />
```

Phase 6.2C.10 `DashboardContainer` can lift hooks + AreaTree + section assembly while `DashboardLayoutRenderer` + `EnergyLayoutRenderer` + `DashboardWidgetRenderer` form the render stack.
