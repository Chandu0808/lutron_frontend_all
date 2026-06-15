# Phase 6.1A — Dashboard Infrastructure Extraction Report

**Date:** 2026-06-10  
**Scope:** Shared dashboard hooks, utils, registry, tests. Widget JSX **not** extracted.  
**Variants wired:** basic, advanced, customized

---

## Summary

Phase 6.1A extracts duplicated dashboard infrastructure (date range, API params, area-tree local state, time-range mapping, widget visibility core, pie normalizers) into `src/shared/dashboard/`. All three variant `Dashboard.jsx` files now consume the shared hooks while preserving the same `apiParams` / `apiParamsString` contract and chart query shapes.

| Check | Status |
|-------|--------|
| `npm run build` | Pass |
| Shared unit tests (27) | Pass |
| Widget components extracted | No (by design) |
| Visual behavior changed | No |

---

## STEP 1 — State Analysis (Dashboard.jsx + SpaceUtilization.jsx)

### `apiParams` state

| Surface | Shape | Gating | Wired to shared |
|---------|-------|--------|-----------------|
| `Dashboard.jsx` (×3) | `{ areaIds, floorIds, timeRange, startDate, endDate, isNavigating }` | `selectedDuration`, `allAreasLoaded`, custom dates ready | `useDashboardApiParams` |
| `SpaceUtilization.jsx` (×3) | Inline `area_ids` / `time_range` in dispatch calls | Own `calculateDateParameters` + snackbar validation | `buildDashboardApiParams` helpers only (via slices); date format helpers shared |

**Finding:** `apiParams` construction was triplicated (~80 LOC × 3). Floor IDs take precedence over area IDs. `apiParamsString` is a stable JSON serialization for effect deduplication.

### Area tree state

| Field | Purpose | Location |
|-------|---------|----------|
| `localSelectedFloorIds` | Pre-Set floor picks | `useAreaTreeSelection` |
| `localSelectedAreas` | Pre-Set area picks | `useAreaTreeSelection` |
| `localSelectedGroups` | Pre-Set group picks | `useAreaTreeSelection` |
| `floorsWithSelectedAreas` | Checkbox display Set | `useAreaTreeSelection` (+ sync effect) |
| `expandedFloorId` | Single-floor accordion | `useAreaTreeSelection` |
| `expandedFloorIds` | Multi-floor expand (customized only) | Remains local in customized `Dashboard.jsx` |

**Finding:** Handlers (`handleFloorToggle`, tree render, Set button) remain in monoliths. Only pre-Set local state was extracted.

### Date range state

| Source | Fields | Shared module |
|--------|--------|---------------|
| Redux | `selectedDuration`, `customDateRange`, `isNavigating`, `currentDate`, `currentYear` | — |
| Derived | `dateParams`, `calculateDateParameters`, `stableDateRef` | `useDashboardDateRange` + `dashboardDateState` |
| SpaceUtilization | Local `calculateDateParameters` with validation toasts | `formatDateForState` / `parseDateFromState` only |

**Finding:** Navigation vs non-navigation week/month/year logic is identical across variants; custom range overrides duration key.

### Filter state

| Filter | Storage | Extracted? |
|--------|---------|------------|
| Area / floor / group scope | Redux (`selectedAreas`, `selectedFloorIds`, `selectedGroups`) + local pre-Set | Partial (local only) |
| Duration / custom dates | Redux `dashboard` slice | Yes (date hooks) |
| Widget visibility | Redux + `dashboardWidgetVisibilityCore` | Utils shared; basic hook unchanged |
| Alert type (Alerts tab) | `Alerts.jsx` local | No |
| Energy custom graph buckets | `EnergyCustomGraphCard.jsx` (customized) | No |
| Custom widget floor buckets | `customWidgetFloorBuckets` (customized) | No |

---

## STEP 2 — Shared Hooks Created

```
src/shared/dashboard/hooks/
├── useDashboardApiParams.js    (51 LOC)
├── useDashboardDateRange.js    (37 LOC)
└── useAreaTreeSelection.js     (31 LOC)
```

| Hook | Returns | Consumers |
|------|---------|-----------|
| `useDashboardDateRange` | `dateParams`, `getCurrentDateParameters`, `stableDateRef` | All 3 `Dashboard.jsx` |
| `useDashboardApiParams` | `apiParams`, `apiParamsString` | All 3 `Dashboard.jsx` |
| `useAreaTreeSelection` | Local floor/area/group picker state | All 3 `Dashboard.jsx` |

---

## STEP 3 — Shared Utils Created

```
src/shared/dashboard/utils/
├── buildDashboardApiParams.js           (125 LOC) — apiParams, axios params, custom gating
├── dashboardDateState.js                (187 LOC) — format/parse, date parameter calc
├── mapTimeRangeToBackend.js             (18 LOC)  — UI → snake_case mapping
├── dashboardWidgetVisibilityCore.js     (220 LOC) — widget key normalization + visibility map
└── pieChartNormalizers.js               (303 LOC) — total consumption by group payloads
```

**Re-export shims (variant → shared):**

| Variant path | Points to |
|--------------|-----------|
| `basic/utils/dashboardWidgetVisibilityCore.js` | shared visibility core |
| `customized/utils/buildDashboardChartQueryParams.js` | `buildDashboardApiParams` + `mapTimeRangeToBackend` |
| `customized/utils/buildTotalConsumptionByGroupPieRows.js` | `pieChartNormalizers` |
| `customized/utils/normalizeTotalConsumptionByGroupPayload.js` | `pieChartNormalizers` |

**Slice wiring:** `dashboardSlice.js` and `unifiedEnergySlice.js` (×3) import `mapTimeRangeToBackend` from shared (`../../../../../shared/...`).

---

## STEP 4 — Widget Registry

```
src/shared/dashboard/registry/widgetRegistry.js  (198 LOC)
```

- **19 built-in widgets** inventoried (excludes variant-only `shades`)
- Sections: overview (6), energy (7), space (6)
- Metadata only: component paths, thunks, selectors, API endpoints, variant availability
- No runtime widget loader yet — registry is documentation + test anchor for Phase 6.2

---

## STEP 5 — Tests

```
src/shared/dashboard/
├── utils/dashboardDateState.test.js              (5 tests)
├── utils/buildDashboardApiParams.test.js         (6 tests)
├── utils/mapTimeRangeToBackend.test.js           (3 tests)
├── utils/pieChartNormalizers.test.js             (3 tests)
├── utils/dashboardWidgetVisibilityCore.test.js     (5 tests)
└── registry/widgetRegistry.test.js               (5 tests)
```

**Verified invariants:**

- `apiParams` null when duration unset, areas not loaded, or custom range incomplete
- `floorIds` prioritized over `areaIds` in `buildDashboardApiParams`
- `buildDashboardChartAxiosParams` maps navigating `this-day` → `time_range: custom` with explicit dates
- `mapTimeRangeToBackend` / savings variant mappings unchanged
- Widget registry counts: 19 total, 6+7+6 by section
- Visibility map normalization aliases (`consumption_by_area_groups` → `total_consumption_by_group`)

Run: `npm test -- --testPathPattern=shared/dashboard --watchAll=false`

---

## LOC Impact

### Shared infrastructure added

| Category | LOC |
|----------|-----|
| Hooks (3) | 119 |
| Utils (5) | 853 |
| Registry | 198 |
| **Infra subtotal** | **1,170** |
| Tests (6 files) | 259 |

### Duplicate logic removed (estimated)

| Target | Est. lines removed |
|--------|-------------------|
| `Dashboard.jsx` ×3 (date calc, apiParams memo, date helpers, area-tree state) | ~900 |
| `SpaceUtilization.jsx` ×3 (`formatDateForState` / `parseDateFromState`) | ~165 |
| `dashboardSlice.js` ×3 (`mapTimeRangeToBackend` blocks) | ~90 |
| `unifiedEnergySlice.js` ×3 | ~45 |
| `customized` pie/query util bodies → re-exports | ~380 |
| `basic` visibility core body → re-export | ~218 |
| **Removed subtotal** | **~1,798** |

**Net:** ~628 fewer lines in the repo after accounting for shared + tests. Largest monoliths remain large:

| File | Lines (post-6.1A) |
|------|-------------------|
| basic `Dashboard.jsx` | 6,923 |
| advanced `Dashboard.jsx` | 6,110 |
| customized `Dashboard.jsx` | 8,112 |

---

## Remaining Dashboard Coupling

| Coupling | Why it remains |
|----------|----------------|
| Widget JSX in `Dashboard.jsx` | Phase 6.2 scope |
| `transformDataForCharts` | Chart-specific, variant-divergent |
| Area-tree handlers + tree render | Tied to floor slice + UI layout |
| `calculateDateParameters` wrapper in Dashboard | Thin alias over shared calc (keeps call sites stable) |
| SpaceUtilization date validation + snackbars | UX-specific; only format helpers shared |
| Redux slices (`dashboardSlice`, `unifiedEnergySlice`) | Thunks/selectors still per-variant |
| `DashboardOverview.jsx`, `Widgets.jsx`, `EnergyCustomGraphCard.jsx` | Not in 6.1A scope |
| Customized-only `expandedFloorIds` Set | Differs from hook's single `expandedFloorId` |
| `useDashboardWidgetVisibility` hook (basic) | Wraps shared core; not yet promoted to shared |

---

## Next Extraction Candidates (Phase 6.2+)

Recommended order (from preflight dependency graph):

1. **Low-risk leaf widgets** — `light_power_density`, `instant_occupancy_count` (fewer cross-widget deps)
2. **`DashboardOverview.jsx` cards** — overview section (6 widgets) behind registry keys
3. **Chart transform helpers** — `transformDataForCharts` per widget family
4. **Area-tree handlers** — extract after widget boundaries are clear
5. **`useDashboardWidgetVisibility`** — promote to `shared/dashboard/hooks/` once all variants align
6. **SpaceUtilization date hook** — optional `useSpaceUtilDateRange` with validation callback
7. **Customized-only** — `Widgets.jsx`, `EnergyCustomGraphCard.jsx`, custom widget bucket utils

---

## Files Touched

### New

- `src/shared/dashboard/**` (15 files)
- `scripts/phase61-wire-dashboard.js`
- `docs/PHASE_6_1A_REPORT.md`

### Modified

- `src/variants/{basic,advanced,customized}/screens/dashboard/Dashboard.jsx`
- `src/variants/{basic,advanced,customized}/screens/dashboard/SpaceUtilization.jsx`
- `src/variants/{basic,advanced,customized}/redux/slice/dashboard/dashboardSlice.js`
- `src/variants/{basic,advanced,customized}/redux/slice/dashboard/unifiedEnergySlice.js`
- `src/variants/basic/utils/dashboardWidgetVisibilityCore.js`
- `src/variants/customized/utils/buildDashboardChartQueryParams.js`
- `src/variants/customized/utils/buildTotalConsumptionByGroupPieRows.js`
- `src/variants/customized/utils/normalizeTotalConsumptionByGroupPayload.js`

---

## Known Issues Resolved During 6.1A

1. **Script ordering bug** — `phase61-wire-dashboard.js` could remove inline apiParams before hook injection; script now throws if injection fails; `stripStandaloneParseDateFromState` handles customized layout.
2. **Redux slice import depth** — `dashboardSlice` / `unifiedEnergySlice` require `../../../../../shared/...` (6 levels), not 4.
3. **Customized duplicate `parseDateFromState`** — Removed local copy after shared import.

---

## Phase 6.2 Entry Criteria

- [x] Shared hooks stabilize `apiParams` / date state contract
- [x] Registry lists all 19 built-in widgets
- [x] Tests guard query param and state shapes
- [ ] Pick first widget family for component extraction
- [ ] Introduce lazy widget loader using `widgetRegistry.js`
