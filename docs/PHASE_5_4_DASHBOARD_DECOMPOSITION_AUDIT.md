# Phase 5.4 — Dashboard Decomposition Audit

**Date:** 2026-06-10  
**Scope:** Read-only analysis of dashboard surface files across `basic`, `advanced`, and `customized`  
**Guarded files (per Phase 5.x):** `Dashboard.jsx`, `SpaceUtilization.jsx`, `Widgets.jsx`, `EnergyCustomGraphCard.jsx` — analyzed only, not modified.

---

## Executive Summary

| File | basic | advanced | customized | Notes |
|------|------:|---------:|-----------:|-------|
| `Dashboard.jsx` | 7,926 | 7,077 | 9,247 | Monolith; largest divergence in customized (+custom graphs, DnD) |
| `SpaceUtilization.jsx` | 6,759 | 5,548 | 9,474 | Customized largest (+visibility, custom scope) |
| `DashboardOverview.jsx` | 1,221 | 376 | 378 | Basic is 3× richer (visibility, shades, custom tiles) |
| `Widgets.jsx` | — | — | 1,708 | **Customized only** |
| `EnergyCustomGraphCard.jsx` | — | — | 1,929 | **Customized only** |
| **Audited total** | **16,906** | **13,001** | **22,736** | **~52,643 LOC** (heavy triplication) |

**`Widgets.jsx` / `EnergyCustomGraphCard.jsx` do not exist in basic or advanced.** Equivalents:

| customized | basic / advanced |
|------------|------------------|
| `screens/settings/widgets/Widgets.jsx` (1,708 LOC) | `screens/settings/renameWidget/RenameWidget.jsx` (basic 1,284 / advanced 291 LOC) |

**No `src/shared/dashboard/` tree exists today.** All dashboard logic lives in variant copies.

**Similarity (Dice coefficient on normalized lines — higher = more alike):**

| Pair | Dashboard | SpaceUtilization | DashboardOverview |
|------|----------:|-----------------:|------------------:|
| basic ↔ advanced | **82%** | **81%** | **47%** |
| basic ↔ customized | **68%** | **60%** | **52%** |
| advanced ↔ customized | **72%** | **66%** | **99%** |

---

## PART 1 — Logical Section Breakdown

Sections are bounded by top-level helpers, major `useEffect` clusters, and JSX render blocks. LOC is inclusive.

### 1.1 `Dashboard.jsx`

| Section | basic | advanced | customized | Purpose |
|---------|------:|---------:|-----------:|---------|
| Imports & constants | 272 | 200 | 420 | Redux imports, tab keys, chart order constants |
| Energy chart order helpers | 151 | — | — | Session/localStorage order, drag reflow (**basic only**) |
| Custom graph scope helpers | — | — | 340 | Floor/area bucket merge, thunk arg builders (**customized only**) |
| Component state, filters, area tree | 1,551 | 1,700 | 1,440 | `useState`, profile, floor/area/group pickers, tab sync |
| API fetch orchestration | 1,303 | 1,200 | 1,600 | `apiParams`, tab-scoped dispatches, race cancellation |
| Data transforms & chart memo | 1,675 | 1,072 | 2,235 | `transformDataForCharts`, `useMemo` chart configs |
| Export handlers | 1,514 | 1,371 | 1,534 | Email/download per widget |
| Widget render JSX | 1,460 | 1,534 | 1,678 | Tab panels, energy grid, space charts mount |
| **Total** | **7,926** | **7,077** | **9,247** | |

#### Variant differences by section

| Section | basic | advanced | customized |
|---------|-------|----------|------------|
| **Overview tab** | Always on; URL `/dashboard/overview` | Gated by `SHOW_OVERVIEW_TAB` feature flag | Same as advanced |
| **Widget visibility** | `useDashboardWidgetVisibility` + backend `fetchWidgetConfiguration` + `LongPressDraggable` energy reorder | Always renders all built-in widgets | `localStorage widgetVisibility` grouped map + `shouldShowEnergyWidget` |
| **Energy combined chart** | `ConsumptionSavingsCombinedChart` + `DashboardDurationFilterBar` | Inline combined chart in JSX | Inline + `EnergyCustomGraphCard` for overrides/custom |
| **Energy reorder** | `LongPressDraggable` + `dashboardChartOrder` API | Static layout | `@dnd-kit` `DndContext` sortable grid |
| **Date / export UI** | Shared filter bar component | `NativeDateInput`, `ChartExportButton`, `themeConstants` | Mix; export icons inline |
| **Custom graphs** | None | None | `EnergyCustomGraphCard`, `resolveDashboardThunkForCustomGraphPath`, scope merge utils |
| **Presentation** | `isLightSurface` energy metric styling | `CARD_BACKGROUND`, gold theme button colors | Area group name lookup, builtin API path overrides |
| **Keyboard a11y** | Shared `../../../../utils/keyboard/*` | Variant-local `pageSubNavBridge` | Shared keyboard utils |

#### Section similarity (approximate, same section type across variants)

| Section | basic↔adv | basic↔cust | adv↔cust |
|---------|----------:|------------:|---------:|
| API fetch orchestration | ~88% | ~75% | ~78% |
| Data transforms | ~85% | ~70% | ~72% |
| Export handlers | ~90% | ~82% | ~85% |
| Widget render JSX | ~80% | ~65% | ~70% |
| Filters / area tree | ~85% | ~72% | ~74% |

---

### 1.2 `SpaceUtilization.jsx`

| Section | basic | advanced | customized |
|---------|------:|---------:|-----------:|
| Imports & tab-order helpers | 410 | 350 | 500 |
| Component state & tab order | 1,790 | 1,450 | 2,000 |
| API fetch & transforms | 2,300 | 2,000 | 3,000 |
| Chart render & exports | 2,259 | 1,748 | 3,974 |
| **Total** | **6,759** | **5,548** | **9,474** |

**Logical sub-areas inside component:**

| Sub-area | Widget keys touched | Notes |
|----------|---------------------|-------|
| Instant occupancy chart | `instant_occupancy_count` | `showOnlyInstantChart` prop from Dashboard |
| Utilization % chart | `utilization` | `fetchSpaceUtilizationPerArea` |
| Combined instant tab | `instant_utilization_combined` | Logs-based APIs |
| Area / group tabs | `utilization_by_area`, `utilization_by_area_group` | Inside `showChartsTab` mode |
| Peak/min utilization | `peak_and_minimum_utilization` | Commented/disabled in several paths |
| Tab drag order | — | basic: session order helpers; customized: visibility gates |
| Duration / navigation | — | Shares dashboard Redux duration state |

#### Variant differences

| Area | basic | advanced | customized |
|------|-------|----------|------------|
| Tab order persistence | Session storage + drag helpers (mirrors energy) | Simpler; smaller file | Custom widget filters + `selectCustomWidgetFilters` |
| Widget visibility | Inherited from Dashboard `useDashboardWidgetVisibility` | All tabs shown | `widgetVisibility` localStorage sections |
| LOC | Middle | Smallest | Largest (custom scope per widget) |

---

### 1.3 `DashboardOverview.jsx`

| Section | basic | advanced | customized |
|---------|------:|---------:|-----------:|
| Imports & style tokens | 120 | 95 | 95 |
| Helpers (`CircularProgressLabel`, formatters) | 230 | 105 | 105 |
| Overview cards grid | 871 | 176 | 178 |
| **Total** | **1,221** | **376** | **378** |

**Cards (logical):**

| Card key | basic | advanced | customized |
|----------|:-----:|:--------:|:------------:|
| `energy` | ✓ (visibility-gated) | ✓ always | ✓ always |
| `alerts` | ✓ | ✓ | ✓ |
| `schedules` | ✓ | ✓ | ✓ |
| `quick_controls` | ✓ | ✓ | ✓ |
| `shades` | ✓ + CO₂ teardrop | ✗ | ✗ |
| `floors` | ✓ | ✓ | ✓ |
| `space_utilization` | ✓ | ✓ | ✓ |
| Custom overview widgets | ✓ (`customOverviewWidgets.js`) | ✗ | ✗ |
| Responsive grid packing | ✓ (container queries, multi-layout) | Fixed 6-card grid | Fixed 6-card grid |
| Background | Image optional / transparent | Transparent | `dashboard-overview-bg.png` |

**advanced ↔ customized similarity: 99%** (nearly identical). **basic ↔ others: ~47–52%** (basic is a different product surface).

---

### 1.4 `Widgets.jsx` (customized only — 1,708 LOC)

| Section | LOC (est.) | Content |
|---------|----------:|---------|
| Imports & Redux bindings | ~100 | `groupOccupancySlice`, `selectCustomWidgetFilters` |
| Built-in widget list & rename | ~350 | Title edit, visibility switches, builtin API overrides |
| Custom graph create dialog | ~400 | Type, page, API path, scope mode, group picker |
| Custom graph edit / delete | ~250 | Inline edit, duplicate name guard |
| Visibility persistence | ~200 | `widgetVisibility` localStorage, energy/space maps |
| Settings shell JSX | ~400 | `SettingsSidebar`, Superadmin guard |
| **Total** | **1,708** | |

**basic/advanced equivalent:** `RenameWidget.jsx` — rename only; no custom graph CRUD, no visibility toggles (basic has separate widget configuration via `fetchWidgetConfiguration` in dashboard utils).

---

### 1.5 `EnergyCustomGraphCard.jsx` (customized only — 1,929 LOC)

| Section | LOC (est.) | Content |
|---------|----------:|---------|
| Payload & palette helpers | ~257 | Pie row builders, API path detectors, color hash |
| Legend subcomponents | ~150 | `EnergyPieDualLegendColumn` |
| Component state | ~150 | Export menu, color picker, series focus |
| Scope / tooltip resolution | ~200 | Area→group maps, floor labels |
| Chart type router | ~400 | bar / line / pie / table branches |
| Recharts render trees | ~600 | Line, Bar, Pie, responsive containers |
| Export integration | ~170 | Email/download via `onExport` callback |
| **Total** | **1,929** | |

---

## PART 2 — Widget Inventory

Canonical keys from `src/variants/basic/utils/dashboardWidgetVisibilityCore.js` (`WIDGET_VISIBILITY_SECTION`).

| Widget key | Component / render site | Redux dependencies | Variants | Class |
|------------|-------------------------|-------------------|----------|-------|
| `energy` | `DashboardOverview.jsx` card | `getDashboardOverview`, `selectDashboardOverview` | all | near-shared |
| `alerts` | Overview card + `Alerts.jsx` tab | `getDashboardOverview`, `alertsSlice` thunks | all | near-shared |
| `schedules` | Overview card | `getDashboardOverview` | all | near-shared |
| `quick_controls` | Overview card (nav only) | — | all | near-shared |
| `shades` | Overview card + `CarbonFootprintTeardrop` | `shadesWidgetSettings` (local) | **basic only** | variant-only |
| `floors` | Overview card | `getDashboardOverview` | all | near-shared |
| `space_utilization` | Overview card | `getDashboardOverview` | all | near-shared |
| `consumption` | `Dashboard.jsx` LineChart | `fetchUnifiedEnergyConsumptionSavingsData`, `selectUnifiedEnergyConsumption` | all | near-shared |
| `savings` | `Dashboard.jsx` LineChart | `selectUnifiedEnergySavings` | all | near-shared |
| `consumption_saving` | `ConsumptionSavingsCombinedChart` (basic) / inline combined | `fetchUnifiedEnergyConsumptionSavingsData` | all | near-shared |
| `savings_by_strategy` | `Dashboard.jsx` PieChart | `fetchSavingsByStrategy`, `selectSavingsByStrategy` | all | near-shared |
| `total_consumption_by_group` | Pie in Dashboard / `EnergyCustomGraphCard` | `fetchTotalConsumptionByGroup`, `selectTotalConsumptionByGroup` | all | near-shared |
| `light_power_density` | `Dashboard.jsx` chart | `fetchLightPowerDensity`, `selectLightPowerDensity` | all | near-shared |
| `peak_and_minimum_consumption` | `Dashboard.jsx` chart | `selectUnifiedPeakMinConsumption` | all | near-shared |
| `utilization` | `SpaceUtilization.jsx` | `fetchSpaceUtilizationPerArea` | all | near-shared |
| `utilization_by_area_group` | `SpaceUtilization.jsx` tab | `fetchOccupancyByGroup` | all | near-shared |
| `utilization_by_area` | `SpaceUtilization.jsx` tab | `fetchOccupancyCount` | all | near-shared |
| `peak_and_minimum_utilization` | `SpaceUtilization.jsx` (partial/disabled) | `fetchPeakMinOccupancy` (commented in places) | all | near-shared |
| `instant_occupancy_count` | `SpaceUtilization.jsx` | `fetchInstantOccupancyCount`, `selectInstantOccupancyCount` | all | near-shared |
| `instant_utilization_combined` | `SpaceUtilization.jsx` combined | `fetchOccupancyByGroupFromLogs`, `fetchSpaceUtilizationPerFromLogs` | all | near-shared |
| `custom_graph:{id}` | `EnergyCustomGraphCard.jsx` | `fetchCustomGraphs`, `createCustomGraph`, `resolveDashboardThunkForCustomGraphPath` | **customized only** | variant-only |

### Classification summary

| Class | Count | Examples |
|-------|------:|----------|
| **shared** | 0 | No extracted shared dashboard modules yet |
| **near-shared** | 19 | All built-in energy/space/overview widgets (same keys, triplicated JSX) |
| **variant-only** | 2+ | `shades` (basic), `custom_graph:*` (customized), custom overview tiles (basic) |

### Widget title / rename source

| Variant | Source | Storage |
|---------|--------|---------|
| all | `fetchRenameWidgets` → `getWidgetList` | `groupOccupancySlice` |
| basic | + `fetchWidgetConfiguration` / `saveWidgetVisibility` | Backend + `lutron_dashboard_widget_visibility_v1` |
| customized | + `Widgets.jsx` visibility UI | `widgetVisibility` localStorage + builtin overrides |

---

## PART 3 — State Analysis

### 3.1 Redux selectors (cross-variant core)

| Selector | Slice | Used by |
|----------|-------|---------|
| `selectSelectedFloor`, `selectSelectedAreas`, `selectSelectedFloorIds`, `selectSelectedGroups`, `selectSelectedGroupIds` | `dashboardSlice` | Dashboard, SpaceUtilization |
| `selectSelectedDuration`, `selectCustomDateRange`, `selectCurrentDate`, `selectCurrentYear`, `selectIsNavigating` | `dashboardSlice` | Dashboard, SpaceUtilization |
| `selectGlobalLoading`, `selectFilteredData` | `dashboardSlice` | Dashboard |
| `selectUnifiedEnergyConsumption`, `selectUnifiedEnergySavings`, `selectUnifiedPeakMinConsumption` | `unifiedEnergySlice` | Dashboard |
| `selectTotalConsumptionByGroup`, `selectLightPowerDensity`, `selectSavingsByStrategy` | `dashboardSlice` | Dashboard |
| `selectOccupancyCount`, `selectOccupancyByGroup`, `selectInstantOccupancyCount` | `dashboardSlice` | Dashboard, SpaceUtilization |
| `selectFloors`, `selectAreaTree` | `floorSlice` | Dashboard, SpaceUtilization |
| `selectDashboardOverview` (+ loading/error) | `homeSlice` | Dashboard, DashboardOverview |
| `selectProfile` | `userlogin` | Dashboard (email export scope) |
| `getWidgetList` | `groupOccupancySlice` | Dashboard, SpaceUtilization, Widgets |
| `selectWidgetConfiguration` | `groupOccupancySlice` | **basic** visibility hook only |
| `selectCustomWidgetFilters` | `dashboardSlice` | **customized** only |
| `selectCustomGraphs` | `groupOccupancySlice` | **customized** Widgets + Dashboard |

### 3.2 Redux thunks (cross-variant core)

| Thunk group | Examples |
|-------------|----------|
| **Energy fetch** | `fetchUnifiedEnergyConsumptionSavingsData`, `fetchSavingsByStrategy`, `fetchTotalConsumptionByGroup`, `fetchLightPowerDensity` |
| **Space fetch** | `fetchSpaceUtilizationPerArea`, `fetchInstantOccupancyCount`, `fetchOccupancyByGroup`, `fetchOccupancyByGroupFromLogs`, `fetchSpaceUtilizationPerFromLogs` |
| **Export** | `downloadEnergyConsumption`, `sendEnergyConsumptionEmail`, (+ 10 parallel download/send pairs) |
| **Scope mutation** | `setSelectedAreas`, `setSelectedDuration`, `setCustomDateRange`, `clearDashboardData` |
| **Overview** | `getDashboardOverview` |
| **Widgets** | `fetchRenameWidgets`, `fetchWidgetConfiguration` (basic), `fetchCustomGraphs`, `createCustomGraph` (customized) |

### 3.3 Local state (representative `useState` clusters)

| Cluster | Keys (sample) | Layer candidate |
|---------|---------------|-----------------|
| **Tab / route** | `activeTab` | `hooks/useDashboardTabRoute` |
| **Area picker** | `localSelectedAreas`, `localSelectedFloorIds`, `expandedNodes`, `showAreaDropdown` | `hooks/useDashboardAreaScope` |
| **Chart UI** | `lightingUnit`, `exportMenuOpen`, `focusedSeriesByGraph` | per-widget hook |
| **Loading** | `chartLoading`, `allEnergyChartsReady`, `snackbarOpen` | `hooks/useDashboardLoading` |
| **Energy order** | `energyChartOrder`, `energyReflowLocked` | `hooks/useEnergyChartLayout` (basic/customized differ) |
| **Visibility** | `widgetVisibility` (customized), visibility map (basic) | `hooks/useWidgetVisibility` adapter |
| **Custom graph UI** | `customSeriesColors`, `colorPickerOpen` | `EnergyCustomGraphCard` internal |

### 3.4 URL params / routes

| Path | Tab key | Variants |
|------|---------|----------|
| `/dashboard/overview` | `overview` | basic always; advanced/customized if `SHOW_OVERVIEW_TAB` |
| `/dashboard/energy` | `energy` | all |
| `/dashboard/spaceutilization` | `charts` | all |
| `/dashboard/alerts` | `alerts` | all |

**Implementation:** `getTabFromPath` / `getPathFromTab` + `useLocation().pathname` sync in `Dashboard.jsx`. No query-string filter state in URL (scope lives in Redux + local picker state).

### 3.5 Reusable dashboard state layers (proposed)

```
Layer 1 — ScopeFilterState     Redux dashboardSlice (duration, floors, areas, groups)
Layer 2 — ChartDataCache       Redux dashboardSlice + unifiedEnergySlice normalized payloads
Layer 3 — WidgetMetaState      groupOccupancySlice (titles, custom graphs)
Layer 4 — WidgetVisibility     Adapter: basic=backend+localStorage, customized=localStorage map
Layer 5 — LayoutOrderState     Adapter: basic=LongPressDraggable+API, customized=dnd-kit, advanced=static
Layer 6 — OverviewSummary      homeSlice (decoupled from monolith)
Layer 7 — CustomScopeOverlay   customized only (customWidgetFilters, per-graph scope draft)
```

---

## PART 4 — Custom Graph Analysis

### 4.1 `EnergyCustomGraphCard.jsx` (1,929 LOC)

**Role:** Unified renderer for customized energy (and some space) widgets — both user-defined `custom_graph:{id}` entries and built-in widgets with API/path overrides from `builtinWidgetOverrides.js`.

| Concern | Owner | Shared potential |
|---------|-------|------------------|
| Pie row normalization | `buildTotalConsumptionByGroupPieRows`, `normalizeTotalConsumptionByGroupPayload` | **High** — pure utils |
| API path → thunk | `dashboardCustomGraphThunkResolver.js` | **High** — binding table |
| Scope merge into params | `mergeCustomGraphScopeIntoApiParams.js`, `applyCustomGraphGroupScopedParams.js` | **Medium** — customized domain |
| Chart rendering (Recharts) | `EnergyCustomGraphCard.jsx` | **Medium** — after data adapter |
| Series colors / legend | In-component + `localStorage customGraphSeriesColors` | **Low** — presentation |
| Export | Delegates to Dashboard `handleExport` | **High** — shared export contract |

**Props contract (API surface to Dashboard):**

```text
g, chartHeaderStyle, customGraphData, customGraphLoading, customGraphError,
transformDataForCharts, onExport, areaGroups, areaIdToDisplayName,
areaIdToFloorId, floors, dashboardApiParams
```

### 4.2 Related graph builder files (customized)

| File | LOC | Role |
|------|----:|------|
| `utils/dashboardCustomGraphThunkResolver.js` | ~132 | Maps `api_path` → Redux thunk + selector |
| `utils/mergeCustomGraphScopeIntoApiParams.js` | — | Reads/writes per-graph floor/area scope |
| `utils/applyCustomGraphGroupScopedParams.js` | — | Area-group scoped API params |
| `utils/intersectDashboardGraphFloors.js` | — | Floor ceiling intersection |
| `utils/buildTotalConsumptionByGroupPieRows.js` | — | Pie data rows |
| `utils/normalizeTotalConsumptionByGroupPayload.js` | — | Wh normalization |
| `utils/builtinWidgetOverrides.js` | — | Per-builtin API path overrides |
| `utils/builtinWidgetDashboardPage.js` | — | energy vs space page assignment |
| `utils/customWidgetFloorBuckets.js` | — | Mixed floor+area bucket builder |
| `components/dashboard/ChartSizeBox.jsx` | — | Sized plot wrapper |
| `utils/useGraphSize.js` / `graphSizesStore.js` | — | Persisted graph dimensions |
| `screens/settings/widgets/CustomGraphScopeSection.jsx` | — | Settings UI for scope |
| `screens/settings/widgets/CustomGraphScopedGroupPicker.jsx` | — | Group picker UI |

### 4.3 Shared logic vs variant presentation vs API

| Layer | Shared logic candidate | Variant presentation | API dependencies |
|-------|------------------------|----------------------|------------------|
| Thunk resolution | `resolveDashboardThunkForCustomGraphPath` | — | `/dashboard/*` endpoints via existing thunks |
| Payload normalization | pie/energy sum helpers | — | Same as built-in widgets |
| Scope algebra | floor bucket merge | — | `floor_ids`, `area_ids`, `custom_area_group_ids` |
| Card chrome | — | header, plot background, export dropdown | — |
| Chart types | data shape mappers | Recharts colors, legend layout | `graph_type`: bar, line, pie, table |
| Settings CRUD | validation helpers | `Widgets.jsx` MUI shell | `createCustomGraph`, `fetchCustomGraphs` |

---

## PART 5 — Target Architecture

Proposed tree under `src/shared/dashboard/` (bindings + adapters pattern, consistent with Phase 5.1–5.3):

```text
src/shared/dashboard/
├── bindDashboardModule.js              # Variant injects slices, theme, feature flags
├── adapters/
│   ├── basicDashboardAdapter.js        # Widget visibility backend, LongPressDraggable
│   ├── advancedDashboardAdapter.js     # SHOW_OVERVIEW_TAB, themeConstants exports
│   └── customizedDashboardAdapter.js   # custom graphs, dnd-kit, widgetVisibility map
├── hooks/
│   ├── useDashboardTabRoute.js         # URL ↔ tab sync
│   ├── useDashboardApiParams.js        # dateParams + apiParams memo
│   ├── useDashboardAreaScope.js        # floor/area/group picker state machine
│   ├── useWidgetVisibility.js          # facade over visibility adapters
│   ├── useEnergyChartLayout.js         # order persistence (per variant strategy)
│   └── useDashboardExports.js          # handleExport factory
├── filters/
│   ├── DashboardFilterBar.jsx          # from DashboardDurationFilterBar (basic)
│   ├── AreaTreePicker.jsx              # extracted area tree block
│   └── DurationNavigator.jsx           # week/month/custom navigation
├── state/
│   ├── dashboardScopeSelectors.js      # re-export facade (no slice move in 6.x)
│   └── widgetVisibilityCore.js         # move from basic/utils (already pure)
├── charts/
│   ├── transformDataForCharts.js       # pure transforms
│   ├── ConsumptionSavingsCombinedChart.jsx
│   ├── EnergyLineChart.jsx
│   ├── EnergyPieChart.jsx
│   ├── PeakMinChart.jsx
│   └── LightingPowerDensityChart.jsx
├── widgets/
│   ├── registry.js                     # widget key → component + thunk map
│   ├── EnergyWidgetSlot.jsx
│   ├── SpaceWidgetSlot.jsx
│   └── OverviewWidgetCard.jsx
├── containers/
│   ├── DashboardShell.jsx              # tabs, subnav, snackbar shell
│   ├── DashboardEnergyTab.jsx
│   ├── DashboardSpaceTab.jsx           # mounts SpaceUtilization
│   ├── DashboardOverviewTab.jsx
│   └── DashboardAlertsTab.jsx        # mounts Alerts
├── space/
│   └── SpaceUtilization.jsx            # slim orchestrator after widget extraction
├── overview/
│   └── DashboardOverview.jsx           # adapter-driven card grid
├── custom-graphs/                      # customized adapter loads this subtree
│   ├── EnergyCustomGraphCard.jsx
│   ├── customGraphThunkResolver.js
│   └── mergeCustomGraphScope.js
└── settings/
    └── WidgetsSettingsPanel.jsx        # rename + visibility + custom CRUD (customized superset)
```

**Variant wrappers (thin):**

```text
src/variants/{basic,advanced,customized}/screens/dashboard/Dashboard.jsx   # bind + re-export
src/variants/customized/screens/settings/widgets/Widgets.jsx              # bind + re-export
```

**Dependency rule:** `shared/dashboard` must not import variant paths; all variant deps via `bindDashboardModule()` + adapters.

---

## PART 6 — Effort Estimate & Extraction Risk Ranking

### Easy extractions (1–3 days each, low regression risk)

| Item | LOC saved (est.) | Rationale |
|------|------------------:|-----------|
| `dashboardWidgetVisibilityCore.js` → `shared/dashboard/state/` | ~240 | Already pure; has unit tests |
| Date helpers (`formatDateForState`, `parseDateFromState`, `dateParams`) | ~200 × 3 | Identical across variants |
| `getWidgetTitle` + rename selector wiring | ~30 × 3 | Trivial facade |
| URL tab routing (`useDashboardTabRoute`) | ~80 × 3 | Isolated |
| `dashboardCustomGraphThunkResolver.js` | ~132 | Pure mapping table |
| Payload normalizers (`buildTotalConsumptionByGroupPieRows`, etc.) | ~400 | Pure functions |
| `DashboardOverview` advanced/customized merge | ~700 | 99% identical pair |

### Medium extractions (3–7 days each, moderate risk)

| Item | LOC saved (est.) | Rationale |
|------|------------------:|-----------|
| `transformDataForCharts` + chart `useMemo` configs | ~1,500 × 3 | Core behavior; needs snapshot tests |
| Per-widget chart components (6 energy + 4 space) | ~3,000 × 3 | JSX duplication collapses |
| `DashboardDurationFilterBar` + filter bar | ~400 | basic reference implementation |
| Export handler matrix (`handleExport`) | ~1,500 × 3 | Email/download parity |
| `SpaceUtilization.jsx` tab shell | ~2,000 × 3 | Still large but bounded |
| `ConsumptionSavingsCombinedChart.jsx` | ~300 | Already separate file in basic |
| Visibility adapter (basic backend vs customized localStorage) | — | Behavioral branching |

### High-risk extractions (7–15+ days each)

| Item | Risk drivers |
|------|--------------|
| **`Dashboard.jsx` fetch orchestration** | Tab-scoped batching, race refs, operator floor RBAC, reload-on-login |
| **Area tree + floor/group picker UI** | ~1,500 LOC intertwined with Redux dispatches |
| **Energy layout reorder** | Three different mechanisms (LongPress / static / dnd-kit) |
| **`EnergyCustomGraphCard.jsx` monolith** | 1,929 LOC, many chart branches, color picker, scope tooltips |
| **`Widgets.jsx` customized settings** | CRUD + validation + scope UI + builtin overrides |
| **basic `DashboardOverview` rich grid** | Custom tiles, shades CO₂, visibility-responsive layout |
| **End-to-end visual parity** | Multi-theme (advanced gold, basic light-surface metrics) |

### Aggregate effort (full decomposition)

| Phase scope | Calendar estimate | Risk |
|-------------|------------------:|------|
| Easy items only | 2–3 weeks | Low |
| Easy + medium | 6–10 weeks | Medium |
| Full monolith → shared | 4–6 months | High |

---

## PART 7 — Migration Roadmap

### Phase 6.1 — Foundation (no UI move)

**Goal:** Pure utils + bindings + tests; variants still render existing monoliths.

| Step | Deliverable |
|------|-------------|
| 6.1.1 | Create `shared/dashboard/bindDashboardModule.js` + variant bind stubs |
| 6.1.2 | Move `dashboardWidgetVisibilityCore`, date helpers, thunk resolver, payload normalizers |
| 6.1.3 | Add `useDashboardTabRoute`, `useDashboardApiParams` hooks (used alongside monolith) |
| 6.1.4 | Unit tests for transforms, visibility, custom graph resolver |
| 6.1.5 | Merge `DashboardOverview` advanced+customized → shared; basic adapter for extended cards |

**Exit criteria:** Build passes; no visual change; ≥50 pure-function tests.

---

### Phase 6.2 — Widget extraction

**Goal:** Built-in widgets render from `shared/dashboard/widgets/`; monolith shrinks to orchestration.

| Step | Deliverable |
|------|-------------|
| 6.2.1 | `widgets/registry.js` — key → component, thunks, selectors |
| 6.2.2 | Extract 6 energy chart widgets + `ConsumptionSavingsCombinedChart` |
| 6.2.3 | Extract `DashboardFilterBar` + `AreaTreePicker` |
| 6.2.4 | Extract `useDashboardExports` |
| 6.2.5 | Refactor `SpaceUtilization.jsx` to widget slots (space tab) |
| 6.2.6 | Visibility adapter wired (basic/customized behavior preserved) |
| 6.2.7 | `DashboardEnergyTab` container replaces inline energy JSX |

**Exit criteria:** `Dashboard.jsx` per variant **< 4,000 LOC**; visual regression sign-off per theme.

---

### Phase 6.3 — Custom graphs + layout adapters + thin wrappers

**Goal:** Customized-only features isolated; variants are thin wrappers.

| Step | Deliverable |
|------|-------------|
| 6.3.1 | Move `EnergyCustomGraphCard` + `custom-graphs/*` utils under shared (adapter-gated) |
| 6.3.2 | `WidgetsSettingsPanel` superset; basic/advanced get rename-only adapter |
| 6.3.3 | Layout adapters: `useEnergyChartLayout` (LongPress / dnd-kit / static) |
| 6.3.4 | `DashboardShell` owns tabs, subnav, snackbar; variant `Dashboard.jsx` → **< 200 LOC** wrapper |
| 6.3.5 | `SpaceUtilization.jsx` wrapper **< 150 LOC** |
| 6.3.6 | Delete duplicated fetch logic; single `useDashboardDataLoader` |

**Exit criteria:**

| Metric | Target |
|--------|--------|
| Variant `Dashboard.jsx` | < 200 LOC each |
| Shared dashboard tree | ~8,000–12,000 LOC (net −35k duplicate) |
| customized-only code | Behind `customizedDashboardAdapter` |
| Build + E2E smoke | All tabs, export, custom graph CRUD |

---

## Appendix A — File existence matrix

| File | basic | advanced | customized |
|------|:-----:|:--------:|:----------:|
| `screens/dashboard/Dashboard.jsx` | ✓ | ✓ | ✓ |
| `screens/dashboard/SpaceUtilization.jsx` | ✓ | ✓ | ✓ |
| `screens/dashboard/DashboardOverview.jsx` | ✓ | ✓ | ✓ |
| `screens/settings/widgets/Widgets.jsx` | ✗ | ✗ | ✓ |
| `screens/settings/renameWidget/RenameWidget.jsx` | ✓ | ✓ | ✗ (uses Widgets.jsx) |
| `components/dashboard/EnergyCustomGraphCard.jsx` | ✗ | ✗ | ✓ |
| `screens/dashboard/ConsumptionSavingsCombinedChart.jsx` | ✓ | ✗ | ✗ |
| `screens/dashboard/DashboardDurationFilterBar.jsx` | ✓ | ✗ | ✗ |
| `utils/dashboardWidgetVisibility.js` | ✓ | ✗ | ✗ |

---

## Appendix B — Key variant-only imports

| Feature | basic | advanced | customized |
|---------|-------|----------|------------|
| `useDashboardWidgetVisibility` | ✓ | — | — (inline localStorage parser) |
| `LongPressDraggable` | ✓ | — | — |
| `@dnd-kit/core` | — | — | ✓ |
| `EnergyCustomGraphCard` | — | — | ✓ |
| `SHOW_OVERVIEW_TAB` | — | ✓ | ✓ |
| `themeConstants` chart chrome | — | ✓ | partial |
| `selectCustomWidgetFilters` | — | — | ✓ |
| `shadesWidgetSettings` / custom overview | ✓ | — | — |

---

## Appendix C — Tooling

Analysis script (read-only): `scripts/phase54-dashboard-audit.js`  
Machine-readable output: `docs/PHASE_5_4_DASHBOARD_AUDIT_DATA.json`

---

*Generated as part of Phase 5.4 dashboard decomposition planning. No application code was modified.*
