# Phase 7.0 — Post-Refactor Opportunity Assessment

**Date:** 2026-06-10  
**Status:** Read-only assessment (no production code changes)  
**Baseline:** Phase 6 complete — 65 suites, 666 tests, build passing  
**Scope:** Whether additional architecture work should continue after dashboard/space containerization

---

## 1. Executive Summary

Phase 6 successfully established **shared container, renderer, export, filter, widget, and presentation layers** for dashboard and space utilization. The remaining frontend weight is **not a failure of Phase 6** — it reflects **domain-specific surfaces** (heatmap, custom graphs, DnD grids, settings) that were intentionally left variant-owned.

| Question | Answer |
|----------|--------|
| Is more architecture work *required*? | **No** — system is maintainable at current test coverage |
| Is more architecture work *beneficial*? | **Selectively yes** — highest ROI is hygiene (6.5), not monolith surgery |
| Largest remaining debt | Customized **custom graph + DnD + fullscreen** stack (~4,500+ LOC) |
| Recommended path | **Option B — Small Phase 6.5 cleanup package** |

---

## 2. STEP 1 — Remaining Largest Files

### 2.1 Top 25 by LOC (`src/**/*.js`, `src/**/*.jsx`)

| Rank | File | LOC | Classification |
|-----:|------|----:|----------------|
| 1 | `shared/theme/registry/themeRegistryManifest.js` | 5,265 | **Feature complexity** — generated theme manifest data |
| 2 | `variants/customized/screens/dashboard/Dashboard.jsx` | 5,210 | **Architecture debt** — energy shell + custom graphs + DnD |
| 3 | `variants/customized/screens/dashboard/SpaceUtilization.jsx` | 5,088 | **Intentionally variant-owned** — custom graphs + sortable grid |
| 4 | `variants/basic/screens/heatmap/HeatMap.jsx` | 4,796 | **Feature complexity** — separate product surface |
| 5 | `variants/advanced/screens/heatmap/HeatMap.jsx` | 4,769 | **Feature complexity** |
| 6 | `variants/customized/screens/heatmap/HeatMap.jsx` | 4,404 | **Feature complexity** |
| 7 | `variants/basic/screens/heatmap/HeatMap - Copy.jsx` | 4,140 | **Architecture debt** — stale duplicate file |
| 8 | `variants/advanced/screens/heatmap/HeatMap_original.jsx` | 3,815 | **Architecture debt** — backup copy |
| 9 | `variants/customized/screens/heatmap/HeatMap_original.jsx` | 3,814 | **Architecture debt** — backup copy |
| 10 | `variants/basic/screens/dashboard/Dashboard.jsx` | 3,727 | **Candidate for future work** — post-container shell |
| 11 | `variants/advanced/screens/dashboard/Dashboard.jsx` | 3,281 | **Candidate for future work** |
| 12 | `variants/customized/redux/slice/dashboard/dashboardSlice.js` | 2,947 | **Feature complexity** — Redux domain |
| 13 | `variants/basic/redux/slice/dashboard/dashboardSlice.js` | 2,800 | **Feature complexity** |
| 14 | `variants/advanced/redux/slice/dashboard/dashboardSlice.js` | 2,791 | **Feature complexity** |
| 15 | `shared/settings/schedule/ScheduleDetails.jsx` | 2,374 | **Feature complexity** — settings module |
| 16 | `variants/advanced/screens/heatmap/AreaSettingsDialog.jsx` | 2,329 | **Feature complexity** |
| 17 | `variants/basic/screens/heatmap/AreaSettingsDialog.jsx` | 2,252 | **Feature complexity** |
| 18 | `variants/customized/screens/heatmap/AreaSettingsDialog.jsx` | 2,008 | **Feature complexity** |
| 19 | `variants/customized/components/dashboard/EnergyCustomGraphCard.jsx` | 1,929 | **Architecture debt** — partial extraction; still large |
| 20 | `shared/settings/schedule/AddEvent.jsx` | 1,901 | **Feature complexity** |
| 21 | `variants/advanced/screens/heatmap/AreaSettingsDialog .jsx` | 1,841 | **Architecture debt** — duplicate filename variant |
| 22 | `variants/advanced/screens/settings/home/HomeComponent.jsx` | 1,720 | **Feature complexity** |
| 23 | `variants/customized/screens/settings/widgets/Widgets.jsx` | 1,707 | **Feature complexity** |
| 24 | `variants/basic/screens/dashboard/SpaceUtilization.jsx` | 1,673 | **Acceptable** — DnD + combined chart |
| 25 | `variants/customized/screens/settings/home/HomeComponent.jsx` | 1,672 | **Feature complexity** |

### 2.2 Dashboard / space focus (post-Phase 6)

| File | LOC | vs 6.4E | Notes |
|------|----:|--------:|-------|
| customized `Dashboard.jsx` | 5,210 | stable | #1 dashboard debt |
| customized `SpaceUtilization.jsx` | 5,088 | stable | Custom graphs dominate |
| basic `Dashboard.jsx` | 3,727 | stable | Container-wired; shell remains large |
| advanced `Dashboard.jsx` | 3,281 | stable | Thinnest dashboard variant |
| advanced `SpaceUtilization.jsx` | 508 | stable | **Reference shell** |
| basic `SpaceUtilization.jsx` | 1,673 | stable | LongPressDraggable + tab chrome |
| `shared/dashboard/container/` | 7,559 | +2% | Mature shared stack |
| `shared/dashboard/space/container/` | 2,871 | +9% | Mature shared stack |
| `shared/dashboard/space/components/` | 510 | new in 6.4C/D | ChartLoader + status panels |

### 2.3 Classification summary

| Category | Count in top 25 | Examples |
|----------|----------------:|----------|
| **Feature complexity** | 14 | HeatMap, settings, Redux slices, theme manifest |
| **Architecture debt** | 7 | Customized dashboard/SU, EnergyCustomGraphCard, heatmap copies |
| **Intentionally variant-owned** | 1 | customized SU (by design per 6.3G) |
| **Acceptable / future work** | 3 | basic SU, basic/advanced Dashboard |

---

## 3. STEP 2 — Phase 7 Candidate Matrix

| Candidate | Risk | Est. LOC affected | Benefit | Recommendation |
|-----------|------|------------------:|---------|----------------|
| **A. Custom Graph Framework** | **HIGH** | ~4,000–5,500 | Single pipeline for fetch/render/export; reduces customized monoliths | **Defer to 7A** — only if product prioritizes custom-graph velocity |
| **B. Dashboard Shell Reduction** | **HIGH** | ~3,000–5,000 per variant | Thinner `Dashboard.jsx`; wire area-tree hook, shared ChartLoader, email gate | **Defer to 7B** — high value but touches energy + area selection |
| **C. Shared DnD Infrastructure** | **MEDIUM–HIGH** | ~500–800 | Extract `SortableDashboardItem` + grid wiring; unify with `LongPressDraggable` policy | **Partial 6.5/7C** — extract sortable item first; keep gesture models separate |
| **D. Export JSX Framework** | **MEDIUM** | ~200–250 × 3 variants | Shared export dropdown presentation; logic already in hooks | **6.5 candidate** — presentation only, not thunk wiring |
| **E. Fullscreen Framework** | **MEDIUM** | ~350–450 | Shared fullscreen wrapper for sortable cards | **7C/E bundle** — duplicate `SortableDashboardItem` already embeds fullscreen |

---

## 4. STEP 3 — ROI Analysis

Scoring: **1 = poor ROI**, **10 = excellent ROI** (higher = better return for effort).

| Candidate | Impl. effort (1=low, 10=high) | Regression risk (1=low, 10=high) | Maintenance gain (1=low, 10=high) | User-visible impact (1=none, 10=high) | **Composite ROI** |
|-----------|:---:|:---:|:---:|:---:|:---:|
| **A. Custom Graph Framework** | 9 | 9 | 9 | 2 | **4** |
| **B. Dashboard Shell Reduction** | 8 | 8 | 8 | 3 | **5** |
| **C. Shared DnD Infrastructure** | 7 | 7 | 7 | 4 | **5** |
| **D. Export JSX Framework** | 4 | 4 | 6 | 1 | **7** |
| **E. Fullscreen Framework** | 5 | 6 | 6 | 5 | **6** |
| **6.5 Barrel / memo hygiene** | 2 | 2 | 4 | 1 | **8** |
| **6.5 Dashboard ChartLoader** | 3 | 3 | 5 | 1 | **7** |
| **6.5 Area-tree hook wiring** | 4 | 5 | 6 | 2 | **6** |

**Composite ROI** weights maintenance gain heavily, penalizes high regression risk, treats user-visible impact as secondary for internal refactors.

**Interpretation:**
- **Best next investments:** 6.5 hygiene, export JSX, Dashboard ChartLoader mirror
- **Poor near-term ROI:** Full custom graph framework (huge effort, low user-visible delta if behavior preserved)
- **Strategic but expensive:** Dashboard shell reduction, DnD unification

---

## 5. STEP 4 — Custom Graph Deep Audit

### 5.1 customized `Dashboard.jsx`

| Pipeline stage | Location | Est. LOC | Notes |
|----------------|----------|--------:|-------|
| **State** | L761–764 | ~10 | `customGraphData/Loading/Error` maps |
| **Fetch** | L869–1821 | **~950** | `fetchCustomGraphData` — area groups gate, scope merge, path routing, thunks |
| **Render** | `EnergyCustomGraphCard.jsx` | **1,929** | Separate component; line/bar/pie, floor buckets, tooltips |
| **Export** | `handleEnergyCustomGraphExport` (runtime) | ~80 | Passed into `EnergyCustomGraphCard` |
| **Mount effects** | L2359+, L1847–1870 | ~40 | `fetchCustomGraphs`, floor/area prefetch |
| **DnD placement** | L4059–4159 | ~100 | Custom cards in sortable energy grid |

**Shared utilities (already extracted):**
- `applyCustomGraphGroupScopedParams`
- `readCustomGraphScopeDraft` / `mergeCustomGraphScopeIntoApiParams`
- `resolveDashboardThunkForCustomGraphPath`
- `buildDashboardChartAxiosParams`

### 5.2 customized `SpaceUtilization.jsx`

| Pipeline stage | Location | Est. LOC | Notes |
|----------------|----------|--------:|-------|
| **State** | L994–996, L851–853 | ~25 | Data/loading/error + export open/loading |
| **Fetch** | L2535–3200 | **~665** | Parallel to Dashboard fetch; uses `dashboardApiParams` when provided |
| **Render** | L1187–2380 | **~1,193** | Inline `renderCustomGraphCard` — recharts, normalize, peak/min, pie, bar, line |
| **Export** | L1073–1159 | ~90 | `handleCustomGraphExport` — email/download via thunks |
| **Color/theme** | L859–889, L1499–1510 | ~60 | `localStorage` series colors, fullscreen dash patterns |
| **Filter coupling** | Throughout fetch/render | — | `selectedAreas`, `selectedFloorIds`, `selectedGroupIds`, `areaGroups`, `customWidgetFilters`, `dashboardApiParams` |
| **Grid integration** | L3871+, sortable charts tab | ~200 | `spaceCustomGraphs` filter + slot injection |

### 5.3 Coupling map

```
                    ┌─────────────────────┐
                    │  Redux dashboard    │
                    │  slice (selection,  │
                    │  duration, charts)  │
                    └─────────┬───────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
groupOccupancy          floor/leaf tree          customWidgetFilters
(areaGroups)                 │                        │
     │                       │                        │
     └───────────┬───────────┴───────────┬────────────┘
                 ▼                       ▼
      applyCustomGraphGroupScopedParams   readCustomGraphScopeDraft
                 │                       │
                 ▼                       ▼
         fetchCustomGraphData (Dashboard)  fetchCustomGraphData (SU)
                 │                       │
                 ▼                       ▼
    EnergyCustomGraphCard (1,929 LOC)   renderCustomGraphCard inline (~1,193 LOC)
                 │                       │
                 └───────────┬───────────┘
                             ▼
                    export handlers (variant)
```

### 5.4 Extraction boundaries (no implementation)

| Boundary | Extractable unit | Risk |
|----------|------------------|------|
| **B1 — Fetch service** | `useCustomGraphData({ graphs, apiParams, scope })` shared hook | MEDIUM — path routing must stay byte-stable |
| **B2 — Render card** | Unify `EnergyCustomGraphCard` + SU inline renderer → `CustomGraphCard` | HIGH — SU has space-specific occupancy/peak-min branches |
| **B3 — Export actions** | Shared `createCustomGraphExportHandler` | LOW — mirrors existing space export hook pattern |
| **B4 — Color persistence** | `useCustomGraphSeriesColors` | LOW |
| **B5 — Graph list filter** | `filterCustomGraphsForPage(page, graphs)` | LOW — energy vs space page keys |
| **Do not extract yet** | Sortable grid + fullscreen + DnD order | HIGH — couples to layout state |

**Key finding:** Dashboard already extracted **render** to `EnergyCustomGraphCard.jsx` (1,929 LOC). Space Utilization still has **~1,193 LOC inline render** plus **~665 LOC duplicate fetch**. **First 7A win:** shared fetch module + converge render onto extended `EnergyCustomGraphCard` (or rename to `CustomGraphCard`).

---

## 6. STEP 5 — DnD Audit

### 6.1 Inventory

| Primitive | basic | advanced | customized Dashboard | customized SU |
|-----------|:-----:|:--------:|:------------------:|:-------------:|
| `LongPressDraggable` | ✓ Dashboard, SU | — | — | — |
| `DndContext` | — | — | ✓ energy grid | ✓ charts tab grid |
| `SortableContext` | — | — | ✓ | ✓ |
| `SortableDashboardItem` | — | — | ✓ (~273 LOC) | ✓ (~196 LOC, nested) |
| `arrayMove` / `rectSortingStrategy` | via reflow helper | — | ✓ | ✓ |

### 6.2 Shared patterns

| Pattern | Implementation |
|---------|----------------|
| Sortable card wrapper | Nearly identical `SortableDashboardItem` in customized Dashboard + SU |
| Fullscreen overlay | Fixed inset, z-index 2000, dimmed backdrop, span/height toggles |
| Sensors | `PointerSensor`, `MouseSensor`, `TouchSensor` + `closestCenter` |
| Order persistence | Dashboard: `mergedOrder` state; SU: `spaceMergedOrder` + Redux chart order |

### 6.3 Variant-specific behavior

| Behavior | Owner |
|----------|-------|
| Long-press 5s before drag | basic only (`LongPressDraggable`, 310 LOC) |
| Pixel translate + sessionStorage offsets | basic LongPressDraggable |
| Grid sortable reorder (dnd-kit) | customized only |
| Fullscreen per card | customized only |
| Row span / height toggle chrome | customized only |
| Reflow on drop onto sibling slot | basic LongPressDraggable `reflow` config |

### 6.4 Feasibility of shared framework

| Approach | Feasibility | Recommendation |
|----------|-------------|----------------|
| Extract `SortableDashboardItem` to `shared/dashboard/dnd/` | **HIGH** — ~270 LOC duplicate | Do first in 6.5/7C |
| Unify LongPress + Sortable into one API | **LOW** — different UX models | Keep separate |
| Shared `SortableDashboardGrid` container | **MEDIUM** — grid sx differs (energy vs space) | Phase 7C after item extraction |
| Move DnD into container layer | **LOW** — violates 6.3G boundary | Do not |

---

## 7. STEP 6 — Recommended Roadmap

### Option A — Stop architecture work

**When to choose:** Team capacity focused on features; heatmap/settings priorities; Phase 6 goals met.

**Pros:** Zero regression risk; 666 tests guard current architecture.  
**Cons:** Customized monoliths remain; duplicate fetch/render/DnD persists.

### Option B — Small Phase 6.5 cleanup package ✓ **RECOMMENDED**

**When to choose:** Want incremental quality without opening Phase 7 risk budget.

**Package (~1–2 weeks):**

| # | Item | ROI | Risk |
|---|------|-----|------|
| 1 | Barrel trim (`export/`, `widgets/` unused barrels) | 8 | LOW |
| 2 | `dashboardContainerPropsAreEqual` + `orchestration` fix | 7 | LOW |
| 3 | Shared `ChartLoader` in `Dashboard.jsx` (mirror 6.4C) | 7 | LOW |
| 4 | Extract `SortableDashboardItem` (customized Dashboard + SU) | 6 | MEDIUM |
| 5 | Export dropdown presentational component | 7 | MEDIUM |
| 6 | Wire `useDashboardAreaTreeOrchestration` to adv/cust Dashboard | 6 | MEDIUM |

**Rationale:** Highest composite ROI, preserves Phase 6 boundaries, does not require custom-graph behavioral equivalence proofs.

### Option C — Begin Phase 7A custom graph framework

**When to choose:** Product roadmap has **heavy custom-graph feature velocity** (new chart types, scopes, APIs).

**Scope:** B1 fetch service → extend `EnergyCustomGraphCard` → B3 export handler → delete SU inline `renderCustomGraphCard`.

**Prerequisite:** Golden tests per `api_path` + graph type; screenshot or data fixtures for top 10 graphs.

### Option D — Begin Phase 7B dashboard shell reduction

**When to choose:** Dashboard variant maintenance pain exceeds custom-graph pain.

**Scope:** Area-tree hook, email gate, snackbar shell, energy section delegation audit in basic/advanced.

**Risk:** Touches primary user landing surface — higher QA burden than 6.5.

---

## 8. Final Decision

| Option | Verdict |
|--------|---------|
| **A** Stop now | Valid — architecture is **good enough** |
| **B** Phase 6.5 cleanup | **Recommended** — best effort/risk ratio |
| **C** Phase 7A custom graphs | Strategic — only with dedicated QA + product driver |
| **D** Phase 7B dashboard shell | Strategic — defer until 6.5 complete |

**Do not start B and C in parallel** — both touch customized `Dashboard.jsx` conflict zones.

---

## 9. Phase 6 Completion Checklist

| Goal | Status |
|------|--------|
| DashboardContainer architecture | ✓ Complete |
| SpaceUtilizationContainer architecture | ✓ Complete |
| Shared widget renderers | ✓ Complete |
| Shared layout renderers | ✓ Complete |
| Shared exports (logic) | ✓ Complete |
| Shared filters | ✓ Complete |
| Shared space widgets | ✓ Complete |
| Shared presentation (ChartLoader, status panels) | ✓ Complete (6.4C/D) |
| Variant shells minimized | **Partial** — advanced SU exemplar; customized intentional |
| Custom graphs extracted | **Not started** — by design |

---

## 10. Hard Stop Compliance

| Constraint | Status |
|------------|--------|
| No production code changes | ✓ |
| No component moves | ✓ |
| No container/renderer/export/DnD changes | ✓ |
| Audit only | ✓ |

---

## 11. Related Documents

| Document | Phase |
|----------|-------|
| [PHASE_6_4E_FINAL_ARCHITECTURE_AUDIT.md](./PHASE_6_4E_FINAL_ARCHITECTURE_AUDIT.md) | Final Phase 6 audit |
| [PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md](./PHASE_6_4E_TECHNICAL_DEBT_REGISTER.md) | Debt register |
| [PHASE_6_4A_ARCHITECTURE_AUDIT.md](./PHASE_6_4A_ARCHITECTURE_AUDIT.md) | Initial post-extraction audit |

---

*End of Phase 7.0 post-refactor opportunity assessment.*
