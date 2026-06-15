# Phase 6.2C.10A — Customized DashboardContainer Wiring Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.2C.10 (`DashboardContainer` for basic + advanced; customized adapter ready)  
**Scope:** Wire customized dashboard to existing `DashboardContainer` + `customizedDashboardContainerAdapter` only — no architecture moves

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What changed? | `customized/Dashboard.jsx` now uses `useDashboardContainer(customizedDashboardContainerAdapter, runtime)` and `<DashboardContainer />` |
| Energy section | Unchanged logic — extracted to `renderEnergySection(orchestration)` and passed via `runtime` |
| Direct hooks removed | `useDashboardVisibility`, `useDashboardWidgets`, `useDashboardDates`, `useDashboardExports` |
| All variants on container? | **Yes** — basic, advanced, and customized all render via `DashboardContainer` |
| Verification | `npm run build` PASS; **52 suites, 546 tests PASS** |

---

## 2. Wiring Changes (customized only)

### 2.1 Hook composition

**Before (10C):**

```js
useDashboardVisibility({ variant: 'customized', ... })
useDashboardWidgets({ variant: 'customized', ... })
useDashboardDates({ dispatch, dateActions, ... })
useDashboardExports({ dispatch, showSnackbar, ... })
```

**After (10A):**

```js
const orchestration = useDashboardContainer(customizedDashboardContainerAdapter, {
  locationPathname, getEffectiveBuiltinDashboardPage, dispatch,
  fetchRenameWidgets, fetchCustomGraphs, widgetList,
  energyConsumption, energySavings, energyConsumptionLoading, energySavingsLoading,
  savingsByStrategy, globalLoading, selectedDuration, customStartDate, customEndDate,
  backgroundColor, dateActions, customDateRange, isNavigating, currentDate, currentYear,
  setIsDataLoading, setSelectedMonthForData, showSnackbar, userProfile,
  selectedAreas, selectedFloorIds, exportThunks,
})

const { visibility, widgets, dates, exports } = orchestration
```

`toggleEnergyCardSpan` moved to after orchestration destructuring (depends on `setEnergyCardSpan` / `writeEnergyCardSpan` from visibility).

### 2.2 Energy delegate

`renderEnergySection` is a `useCallback` containing the **unchanged** energy IIFE body:

- `readBuiltinWidgetOverrides` / `buildEnergyBuiltinRender`
- `energyCards` + `energyCustomCards`
- `DndContext` / `SortableContext` / `EnergyLayoutRenderer` / `SortableDashboardItem`
- Custom graph cards via `EnergyCustomGraphCard`

Passed through container runtime:

```js
runtime={{
  ...,
  renderEnergySection,
  alertsShellClassName: DASHBOARD_ALERTS_SHELL_CLASS,
}}
```

`customizedDashboardContainerAdapter.buildSections` delegates:

```js
energy: typeof renderEnergySection === 'function' ? renderEnergySection(orchestration) : null
```

### 2.3 Layout render swap

**Before:**

```jsx
<DashboardLayoutRenderer
  activeTab={activeTab}
  variant="customized"
  adapter={CUSTOMIZED_DASHBOARD_LAYOUT_ADAPTER}
  sections={{ overview, energy, charts, alerts }}
/>
```

**After:**

```jsx
<DashboardContainer
  variant="customized"
  adapter={customizedDashboardContainerAdapter}
  activeTab={activeTab}
  orchestration={orchestration}
  runtime={{ DashboardOverview, SpaceUtilization, Alerts, ..., renderEnergySection }}
/>
```

Overview, charts (`SpaceUtilization`), and alerts shells are assembled in `customizedDashboardContainerAdapter.buildSections` (unchanged from 10C adapter).

---

## 3. Stop Boundary Compliance

| Constraint | Status |
|------------|--------|
| No custom graph code move | ✓ |
| No `EnergyCustomGraphCard` move | ✓ |
| No DnD / `SortableDashboardItem` / `LongPressDraggable` move | ✓ |
| No custom graph fetch pipeline move | ✓ |
| No exports / widget / chart implementation move | ✓ |
| No `SpaceUtilization` move | ✓ |
| No new container architecture | ✓ — reused existing adapter + container |

---

## 4. Files Modified

| File | Change |
|------|--------|
| `src/variants/customized/screens/dashboard/Dashboard.jsx` | Container wiring: `useDashboardContainer`, `renderEnergySection`, `<DashboardContainer />`; removed direct hooks + `DashboardLayoutRenderer` |

**No shared container files changed** — `customizedDashboardContainerAdapter.js` was already implemented in 10C.

---

## 5. LOC Before / After

### Customized monolith (10C → 10A)

| File | After 10C | After 10A | Δ |
|------|-----------|-----------|---|
| `customized/.../Dashboard.jsx` | 4,867 | 5,210 | **+343** |

The LOC increase is expected for this wiring-only phase:

- Energy IIFE logic is preserved in `renderEnergySection` (same body, plus `useCallback` dependency array)
- Verbose orchestration destructuring block replaces four shorter direct hook calls
- Overview / charts / alerts inline JSX removed (~50 LOC) — now built by adapter

### All variants — container parity (10A)

| Variant | Container | Adapter |
|---------|-----------|---------|
| basic | `DashboardContainer` | `basicDashboardContainerAdapter` |
| advanced | `DashboardContainer` | `advancedDashboardContainerAdapter` |
| customized | `DashboardContainer` | `customizedDashboardContainerAdapter` |

Current variant `Dashboard.jsx` line counts (10A):

| Variant | LOC |
|---------|-----|
| basic | 3,727 |
| advanced | 3,281 |
| customized | 5,210 |

---

## 6. Parity Verification

### Build

```
npm run build → Compiled successfully
```

### Tests

```
npm test -- --testPathPattern=shared/dashboard
→ 52 suites passed, 546 tests passed
```

### Architectural parity

```
Dashboard.jsx (each variant)
  ├── orchestration = useDashboardContainer(variantAdapter, runtime)
  └── <DashboardContainer orchestration={...} runtime={...} />
        └── DashboardLayoutRenderer
              └── EnergyLayoutRenderer (customized: via renderEnergySection)
                    └── DashboardWidgetRenderer
```

### Behavioral parity checklist

| Concern | customized 10A |
|---------|----------------|
| Visibility / card order / span persistence | via `orchestration.visibility` (same hook options) |
| Widget titles / memoized energy data | via `orchestration.widgets` |
| Date navigation / period text | via `orchestration.dates` |
| Export menus + custom graph export | via `orchestration.exports` (`customizedLegacy` profile) |
| Energy tab DnD + custom graphs | `renderEnergySection` (unchanged IIFE) |
| Overview / space / alerts tabs | adapter `buildSections` |

---

## 7. Rollback Plan

### Rollback 10A only (keep 10C container module)

1. In `customized/Dashboard.jsx`:
   - Restore imports: `useDashboardVisibility`, `useDashboardWidgets`, `useDashboardDates`, `useDashboardExports`, `DashboardLayoutRenderer`, `CUSTOMIZED_DASHBOARD_LAYOUT_ADAPTER`, export key helpers, `EXPORT_MENU_OUTSIDE_CLICK_PROFILES`
   - Remove `useDashboardContainer`, `DashboardContainer`, `customizedDashboardContainerAdapter`, `renderEnergySection`
   - Restore four direct hook calls and inline `sections={{ overview, energy, charts, alerts }}` on `DashboardLayoutRenderer`
   - Move `toggleEnergyCardSpan` back next to visibility hook
2. Delete this report
3. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`

### Full rollback (10C + 10A)

Follow Phase 6.2C.10 report §10 — removes container module and reverts basic/advanced as well.

---

## 8. Next Steps (out of scope for 10A)

- Optional LOC reduction: slim orchestration destructuring with helper or narrower picks
- Wire `useDashboardAreaTreeOrchestration` for customized (basic already uses it)
- Further chrome / API-effect extraction phases per roadmap
