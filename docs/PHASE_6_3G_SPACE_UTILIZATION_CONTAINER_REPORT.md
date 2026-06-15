# Phase 6.3G — Space Utilization Container Report

**Date:** 2026-06-10  
**Status:** Complete  
**Baseline:** Phase 6.3F `SpaceLayoutRenderer`  
**Scope:** Shared orchestration container mirroring `DashboardContainer`

---

## 1. Executive Summary

| Question | Answer |
|----------|--------|
| What was done? | Created `SpaceUtilizationContainer` + `useSpaceUtilizationContainer` + variant adapters; centralized exports, loading, widget/layout context orchestration |
| Architecture | `SpaceUtilizationContainer` → `SpaceLayoutRenderer` → `SpaceWidgetRenderer` |
| Variant `SpaceUtilization.jsx` LOC | **−89** gross vs 6.3F |
| Shared `space/container` growth | **+712** LOC (container layer on 6.3F) |
| UI / behavior changes | **None** — export JSX, DnD, combined chart, custom graphs, fullscreen remain in variants |
| Verification | `npm run build` PASS; **63 suites, 658 tests PASS** (+10 new) |

---

## 2. Overlap Analysis (STEP 1 Audit)

### 2.1 Shared orchestration (centralized)

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|:--------------|
| `useSpaceExports` | ✓ | ✓ | ✓ | **EXACT** → `useSpaceUtilizationContainer` |
| Loading aggregation (`anyLoading`) | ✓ | ✓ | ✓ | **EXACT** → `aggregateSpaceLoading` |
| Active data source selection | ✓ | ✓ | ✓ | **EXACT** → `resolveSpaceActiveDataSources` |
| `buildSpaceWidgetRenderContext` | ✓ | ✓ | ✓ | **EXACT** → adapter `buildWidgetContext` |
| `buildSpaceLayoutContext` | ✓ | ✓ | ✓ | **EXACT** → adapter `buildLayoutContexts` |
| Title resolution (`getWidgetTitle`) | ✓ | ✓ | ✓ | **EXACT** → `createSpaceWidgetTitleResolver` |
| Visibility / slot order in context | ✓ | — | ✓ | **EXACT** → `resolveLayoutOptions` + visibility |
| Export option wiring | ✓ | ✓ | ✓ | **EXACT** → `resolveExportOptions` |

### 2.2 Variant-owned (kept in variants)

| Concern | basic | advanced | customized | Classification |
|---------|:-----:|:--------:|:----------:|:--------------|
| Export dropdown JSX | ✓ | ✓ | ✓ | **VARIANT-ONLY** |
| DnD (`LongPressDraggable`, sortable grid) | ✓ | — | ✓ | **VARIANT-ONLY** |
| `instant_utilization_combined` | ✓ | — | — | **VARIANT-ONLY** |
| Custom graph pipeline | — | — | ✓ | **VARIANT-ONLY** |
| Fullscreen wrappers | — | — | ✓ | **VARIANT-ONLY** |
| Tab chrome (duration filter) | ✓ | — | — | **VARIANT-ONLY** (`layoutRuntime`) |
| DnD order state / effects | ✓ | — | ✓ | **VARIANT-ONLY** |
| Error / snackbar shells | ✓ | ✓ | ✓ | **VARIANT-ONLY** |

### 2.3 Duplication matrix (pre-6.3G)

| Block | basic | advanced | customized | Lines (approx) |
|-------|:-----:|:--------:|:----------:|---------------:|
| `useSpaceExports` call + options | ✓ | ✓ | ✓ | ~35 × 3 |
| `buildSpaceWidgetRenderContext` useMemo | ✓ | ✓ | ✓ | ~70 × 3 |
| `buildSpaceLayoutContext` useMemo(s) | ✓ | ✓ | ✓ | ~25–50 × 3 |
| `anyLoading` / active data derivation | ✓ | ✓ | ✓ | ~10 × 3 |
| Direct `<SpaceLayoutRenderer />` wiring | ✓ | ✓ | ✓ | ~10 × 3 |

---

## 3. Adapter Matrix

| Method | basic | advanced | customized |
|--------|-------|----------|--------------|
| `resolveWidgetOptions` | data, loading, shell, chart | same + advanced shell | + `shouldShowWidget`, customized shell |
| `resolveLayoutOptions` | charts/main visible order, tab chrome flag | `showChartsTab`, `showOnlyInstantChart` | + `spaceMergedOrder`, `shouldShowWidget` |
| `resolveExportOptions` | basic preset + outside click | advanced preset | customized preset + group ids |
| `buildLayoutContexts` | separate charts + main contexts | single shared context | charts (merged order) + main |
| `buildSections` | `SpaceLayoutRenderer` | `SpaceLayoutRenderer` | charts → `chartsLayoutRuntime`; main → fixed override |
| `resolveLayoutContextForTab` | charts vs main | shared | charts vs main |

---

## 4. Prop / Runtime Matrix

### `useSpaceUtilizationContainer(adapter, runtime)` returns

| Field | Purpose |
|-------|---------|
| `exports` | `useSpaceExports` output (dropdown state, `handleExport`) |
| `widgetContext` | Passed to `SpaceWidgetRenderer` via layout context |
| `layoutContext` | Active tab layout context (variant-dependent) |
| `chartsLayoutContext` | Basic/customized charts tab |
| `mainLayoutContext` | Basic/customized utilization tab |
| `loading` | Aggregated loading flags |
| `visibility` | Order / visibility metadata |

### `SpaceUtilizationContainer` props

| Prop | Purpose |
|------|---------|
| `variant` | `basic` \| `advanced` \| `customized` |
| `adapter` | Container adapter (`buildSections`) |
| `activeTab` | `SPACE_TAB_IDS.CHARTS` \| `UTILIZATION` |
| `orchestration` | Hook output |
| `runtime` | Presentation delegates (`SpaceLayoutRenderer`, layout adapter, layout runtime) |

### Variant `runtime` presentation fields

| Field | basic | advanced | customized |
|-------|:-----:|:--------:|:----------:|
| `SpaceLayoutRenderer` | ✓ | ✓ | ✓ |
| `layoutAdapter` | ✓ | ✓ | ✓ |
| `layoutRuntime` | DnD + combined + empty + chrome | widget slots | main widget slots |
| `chartsLayoutRuntime` | — | — | sortable grid delegate |
| `mainLayoutAdapter` | — | — | fixed-sections override |
| `mainLayoutRuntime` | — | — | ✓ |

---

## 5. Files Created / Modified

### Shared (`src/shared/dashboard/space/container/`)

| File | Role |
|------|------|
| `SpaceUtilizationContainer.jsx` | Orchestration shell → `adapter.buildSections` |
| `useSpaceUtilizationContainer.js` | Composes exports + widget/layout contexts |
| `spaceContainerResolvers.js` | Pure helpers (data sources, loading, titles) |
| `spaceContainerMemoCompare.js` | Memo compare |
| `adapters/basicSpaceContainerAdapter.js` | Basic orchestration |
| `adapters/advancedSpaceContainerAdapter.js` | Advanced orchestration |
| `adapters/customizedSpaceContainerAdapter.js` | Customized orchestration + sortable delegate routing |
| `adapters/index.js` | Barrel |
| `spaceContainerResolvers.test.js` | 4 tests |
| `spaceContainerParity.test.jsx` | 6 tests |
| `index.js` | Updated exports |

### Variant wiring

| File | Change |
|------|--------|
| `basic/SpaceUtilization.jsx` | `useSpaceUtilizationContainer` + `<SpaceUtilizationContainer />` × 2 |
| `advanced/SpaceUtilization.jsx` | Single container for active tab |
| `customized/SpaceUtilization.jsx` | Container with inline `chartsLayoutRuntime` delegate |

---

## 6. LOC Before / After

| Area | 6.3F | 6.3G | Δ |
|------|-----:|-----:|--:|
| basic `SpaceUtilization.jsx` | 1,804 | 1,769 | **−35** |
| advanced `SpaceUtilization.jsx` | 631 | 604 | **−27** |
| customized `SpaceUtilization.jsx` | 5,234 | 5,207 | **−27** |
| **`space/container/` total** | **1,904** | **2,616** | **+712** |

**Variant `SpaceUtilization.jsx` only:** 7,669 → 7,580 (−89)

---

## 7. Tests Added

| File | Tests | Coverage |
|------|------:|----------|
| `spaceContainerResolvers.test.js` | 4 | Data sources, loading, titles, active tab |
| `spaceContainerParity.test.jsx` | 6 | Adapter options, section routing, customized delegates |

**Suite delta:** 648 → **658** tests (+10) across `shared/dashboard`.

---

## 8. Verification

```bash
npm run build                                          # PASS
npm test -- --testPathPattern=shared/dashboard         # 63 suites, 658 tests PASS
```

---

## 9. Stop Boundary (unchanged)

- Export JSX extraction
- DnD extraction to shared module
- Custom graph pipeline extraction
- `instant_utilization_combined` move
- Chart adapter / widget implementation changes

---

## 10. Rollback Plan

1. Revert commits touching `SpaceUtilizationContainer*`, `useSpaceUtilizationContainer`, `spaceContainer*`, `adapters/*SpaceContainerAdapter*`, and variant `SpaceUtilization.jsx` wiring.
2. Restore inline `useSpaceExports`, `buildSpaceWidgetRenderContext`, `buildSpaceLayoutContext`, and direct `<SpaceLayoutRenderer />` calls.
3. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Rollback is safe in one commit: 6.3F layout/widget layers are unchanged; container is additive orchestration only.

---

## 11. Architecture

```
SpaceUtilization (variant shell)
  └── useSpaceUtilizationContainer(adapter, runtime)
        ├── useSpaceExports
        ├── buildWidgetContext
        └── buildLayoutContexts
  └── SpaceUtilizationContainer
        └── adapter.buildSections → SpaceLayoutRenderer
              └── SpaceWidgetRenderer
```

Variants remain responsible for Redux selectors, DnD state, export dropdown JSX, and layout runtime delegates.
