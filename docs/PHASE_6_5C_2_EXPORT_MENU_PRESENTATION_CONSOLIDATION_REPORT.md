# Phase 6.5C.2 — Export Menu Presentation Consolidation Report

**Date:** 2026-06-10  
**Baseline:** Phase 6.5C.1 complete (75 suites / 717 tests after 6.5C.2)  
**Status:** COMPLETE — build PASS, shared/dashboard tests PASS

---

## 1. Audit Findings

### Dashboard variants

| Variant | Menu wrapper | Action rows | Loading labels | Classification |
|---|---|---|---|---|
| **basic** `Dashboard.jsx` | `EnergyExportMenu` + theme preset | Email + Download buttons | `⏳` emoji via `useEmoji: true` | **EXACT** (already shared; refined to actions API) |
| **basic** `ConsumptionSavingsCombinedChart.jsx` | Inline `<div data-export-dropdown-panel>` | Duplicated button JSX | `⏳` emoji | **EXACT** → migrated to `ExportMenuPanel` |
| **advanced** `Dashboard.jsx` | `ChartExportDropdown` (variant-local) | Email + Download | Plain `Sending...` / `Downloading...` | **NEAR** → migrated to `EnergyExportMenu` + advanced preset |
| **customized** `Dashboard.jsx` | `EnergyExportMenu` | Email + Download | `⏳` emoji; group chart uses leading-space labels | **EXACT** (unchanged wiring) |

### Space variants

| Variant | Menu wrapper | Action rows | Loading labels | Classification |
|---|---|---|---|---|
| **basic** `SpaceUtilization.jsx` | `SpaceChartExportMenu` thin wrapper | Via shared actions | Plain text | **EXACT** |
| **advanced** `SpaceUtilization.jsx` | Local `ChartExportDropdown` + loading-key logic | Email + Download | Plain text | **NEAR** → migrated to `SpaceChartExportMenu` (`shellVariant="advanced"`) |
| **customized** `SpaceUtilization.jsx` | `SpaceChartExportMenu` | Via shared actions | Plain text | **EXACT** |
| **customized** custom graph panel (~L1521+) | Inline buttons | Email + Download | `Sending...` / `Downloading...` | **VARIANT-ONLY** — not touched (stop boundary) |

### Handler coupling assessment

Handlers (`handleConsumptionEmail`, `handleExport`, loading maps, refs, outside-click effects) remain in variant screens and export hooks. Shared components receive only `onClick`, `loading`, and `label` props. **No abort condition triggered.**

### Outside-click / ref wiring

| Concern | Owner | Touched? |
|---|---|---|
| `exportDropdownRefs` | Variant `Dashboard.jsx` | No |
| `data-export-dropdown-panel` attribute | Shared `ExportMenuPanel` | Presentation only |
| `createAdvancedExportOutsideClickProfile` | Advanced adapter / Dashboard runtime | Class constant only (`ADVANCED_EXPORT_MENU_PANEL_CLASS`) |
| Custom graph outside-click (`customGraphExportDropdownRef`) | Customized SU | No |

---

## 2. Duplication Matrix

| Presentation element | basic | advanced | customized | Shared module |
|---|---|---|---|---|
| Panel shell (position, shadow, z-index) | theme preset | alerts CSS vars | tan palette | `ExportMenuPanel` + `exportMenuTheme.js` |
| Email row | duplicated in combined chart | `ChartExportDropdown` | shared | `ExportMenuAction` |
| Download row | duplicated in combined chart | `ChartExportDropdown` | shared | `ExportMenuAction` |
| Loading label swap | emoji / plain | plain | emoji (energy) | `resolveExportMenuLoadingLabels` |
| Disabled while loading | yes | yes | yes | `ExportMenuAction` |
| Email/download action builder | per-site | per-site | per-site | `buildEmailDownloadExportActions` |

---

## 3. Shared Component Design

```
src/shared/dashboard/export/components/
├── ExportMenuPanel.jsx        # actions[] renderer + memo
├── ExportMenuAction.jsx       # single action row
├── ExportMenuActions.jsx      # legacy 2-action fragment + buildEmailDownloadExportActions
├── EnergyExportMenu.jsx       # dashboard energy dropdown body
├── SpaceChartExportMenu.jsx   # space chart dropdown body
├── exportMenuTheme.js         # presets (basic/advanced/customized/energy)
├── exportMenuMemoCompare.js   # memo equality for panel props
├── ExportMenuPanel.test.jsx
├── exportMenuTheme.test.js
└── index.js
```

### Presentation API

```jsx
<ExportMenuPanel
  actions={[
    { key: 'email', label: 'Send By Email', loading: sending, onClick: onEmail },
    { key: 'download', label: 'Download To PC', loading: downloading, onClick: onDownload },
  ]}
  itemDefaults={preset.item}
  useEmoji={preset.useEmoji}
  panelStyle={preset.panel}
  panelDataAttribute={preset.panelDataAttribute}
/>
```

No thunk knowledge, no email validation, no outside-click logic, no export routing inside shared components.

---

## 4. Files Created

| File | LOC | Purpose |
|---|---|---|
| `ExportMenuAction.jsx` | 58 | Single menu row (label, loading, disabled, divider) |
| `exportMenuMemoCompare.js` | 35 | Shallow compare for `memo(ExportMenuPanel)` |
| `ExportMenuPanel.test.jsx` | 163 | Presentation + dashboard/space parity tests |

---

## 5. Files Modified

| File | Change |
|---|---|
| `ExportMenuPanel.jsx` | `actions[]` API, `memo`, loading-label resolution |
| `ExportMenuActions.jsx` | Uses `ExportMenuAction`; exports `buildEmailDownloadExportActions` |
| `EnergyExportMenu.jsx` | Builds `actions` for `ExportMenuPanel` |
| `SpaceChartExportMenu.jsx` | Builds `actions` for `ExportMenuPanel` |
| `exportMenuTheme.js` | Added `advanced` space preset + `resolveAdvancedEnergyExportMenuPreset` |
| `exportMenuTheme.test.js` | Advanced preset coverage |
| `index.js` | New exports |
| `variants/advanced/components/ChartExportDropdown.jsx` | Uses `ExportMenuPanel` + actions (Alerts compatibility) |
| `variants/advanced/screens/dashboard/Dashboard.jsx` | `EnergyExportMenu` replaces inline `ChartExportDropdown` for energy charts |
| `variants/advanced/screens/dashboard/SpaceUtilization.jsx` | `SpaceChartExportMenu` replaces local dropdown builder |
| `variants/basic/screens/dashboard/ConsumptionSavingsCombinedChart.jsx` | Inline menu JSX → `ExportMenuPanel` |

**Not modified (stop boundary):** `useDashboardExports`, `useSpaceExports`, `emailExportGate`, containers, renderers, custom graph export blocks, Redux, thunk maps.

---

## 6. LOC Before / After (this phase)

| Area | Before (approx.) | After (approx.) | Delta |
|---|---|---|---|
| Advanced Dashboard energy menus (×3) | ~45 LOC | ~36 LOC | −9 |
| Advanced Space `ExportDropdown` builder | ~22 LOC | ~12 LOC | −10 |
| Basic combined chart inline menu | ~46 LOC | ~22 LOC | −24 |
| Shared presentation module additions | — | ~256 LOC (incl. tests) | +256 |
| **Net production LOC** | | | **~−43** (duplication removed) |
| **Net incl. tests** | | | **~+213** |

---

## 7. Tests Added

`ExportMenuPanel.test.jsx` — 8 tests:

1. Email action rendering  
2. Download action rendering  
3. Loading label rendering (`⏳` with `useEmoji`)  
4. Disabled state rendering  
5. Click forwarding  
6. Panel data-attribute for outside-click parity  
7. Dashboard `EnergyExportMenu` loading-map parity  
8. Space `SpaceChartExportMenu` routing + loading label  

`exportMenuTheme.test.js` — +1 test for advanced preset class.

---

## 8. Build Result

```
npm run build
Compiled successfully.
```

---

## 9. Test Result

```
npm test -- --testPathPattern=shared/dashboard
Test Suites: 75 passed, 75 total
Tests:       717 passed, 717 total
```

(+1 suite / +9 tests vs post-6.5C.1 baseline)

---

## 10. Stop-Boundary Verification

| Boundary | Status |
|---|---|
| `useDashboardExports` / `useSpaceExports` | NOT touched |
| `emailExportGate` | NOT touched |
| `DashboardContainer` / `SpaceUtilizationContainer` | NOT touched |
| Widget / layout renderers | NOT touched |
| Custom graph export pipeline (SU ~L1091, ~L1521, `EnergyCustomGraphCard`) | NOT touched |
| Export thunk maps / Redux / APIs | NOT touched |
| Outside-click effect implementations | NOT touched (panel `data-*` attribute preserved) |
| DnD / fullscreen | NOT touched |

---

## 11. Rollback Plan

1. Revert commits touching `shared/dashboard/export/components/*` and variant wiring files listed in §5.
2. Restore advanced Dashboard `ChartExportDropdown` usage and advanced Space local `ExportDropdown` builder.
3. Restore `ConsumptionSavingsCombinedChart.jsx` inline button JSX.
4. Run `npm run build` and `npm test -- --testPathPattern=shared/dashboard`.

Single-commit revert is safe — presentation-only changes, no handler or contract changes.

---

## Summary

Export menu presentation is now centralized behind `ExportMenuPanel` + `ExportMenuAction` with variant-specific theming in `exportMenuTheme.js`. Dashboard (basic/advanced/customized) and Space (basic/advanced/customized) standard chart exports all render through shared components while keeping handlers, loading ownership, refs, and outside-click behavior in variant/orchestration layers.
