# Phase 6.4E — Technical Debt Register

**Date:** 2026-06-10  
**Status:** Read-only register (no code changes)  
**Baseline:** Post Phase 6.4D (ChartLoader + status panels extracted)  
**Scope:** Remaining debt after dashboard/space containerization (6.2C–6.4D)

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| **LOW** | Hygiene, stale exports, small duplication; low regression risk |
| **MEDIUM** | Meaningful LOC savings or consistency wins; needs targeted tests |
| **HIGH** | Large monoliths, high coupling, or behavior-sensitive refactors |

---

## HIGH

| ID | Item | Location | Est. LOC | Notes |
|----|------|----------|--------:|-------|
| H1 | **Custom graph pipeline** | `customized/SpaceUtilization.jsx` (~2,500+ inline) | 2,500+ | Fetch, render, export, color picker, scope — intentionally variant-owned per 6.3G |
| H2 | **Dashboard.jsx monoliths** | `basic` 3,727 / `advanced` 3,281 / `customized` 5,210 | 12,218 | Energy shell, area tree, exports, inline ChartLoader still in Dashboard (not SpaceUtilization) |
| H3 | **Customized sortable grid + DnD** | `customized/SpaceUtilization.jsx` + `customizedSpaceLayoutSlots.jsx` | ~800+ | `DndContext`, `SortableDashboardItem`, merged order — coupled to custom graphs |
| H4 | **Fullscreen wrappers** | `customized/SpaceUtilization.jsx` (48 references) | ~400+ | Customized-only chart fullscreen chrome |

---

## MEDIUM

| ID | Item | Location | Est. LOC | Notes |
|----|------|----------|--------:|-------|
| M1 | **Export dropdown JSX triplication** | All `SpaceUtilization.jsx` + Dashboard variants | ~200 × 3 SU | `ExportDropdown` / `ChartExportDropdown` inline; export *logic* shared via hooks |
| M2 | **Snackbar + Alert blocks** | All `SpaceUtilization.jsx` (~30 LOC each) | ~90 | Status *panels* extracted (6.4D); snackbar intentionally left in variants |
| M3 | **Area-tree orchestration split** | `useDashboardAreaTreeOrchestration` vs inline adv/cust | ~70 × 2 | Basic wired; advanced/customized Dashboard keep inline apply/clear/set |
| M4 | **Space container adapter duplication** | `basic/advanced/customizedSpaceContainerAdapter.js` | ~180 | `resolveWidgetOptions`, `buildLoadingState`, `buildWidgetContext` near-identical |
| M5 | **Dashboard container adapter duplication** | `*DashboardContainerAdapter.js` | ~120 | `resolveWidgetsOptions` / `resolveDatesOptions` overlap across variants |
| M6 | **Variant slot helpers** | `*SpaceLayoutSlots.jsx` (364 / 199 / 209 LOC) | 772 | Per-variant widget chrome, export buttons, combined chart slot |
| M7 | **`dashboardContainerPropsAreEqual` gap** | `container/dashboardContainerMemoCompare.js` | — | Omits `orchestration` compare; space container includes it — potential stale-render edge |
| M8 | **Dashboard inline ChartLoader** | All `Dashboard.jsx` (~25 LOC × 3) | ~75 | SpaceUtilization uses shared `bindChartLoader` (6.4C); Dashboard not yet |
| M9 | **Email dialog / profile gate** | All `SpaceUtilization.jsx` | ~50 × 3 | `handleEmailDialogOpen`, profile fetch patterns duplicated |
| M10 | **Date navigation handlers** | `basic/customized SpaceUtilization.jsx` | ~180 × 2 | Advanced delegates more to shared views; basic/customized retain large handler blocks |

---

## LOW

| ID | Item | Location | Est. LOC | Notes |
|----|------|----------|--------:|-------|
| L1 | **Unused root barrels** | `export/index.js`, `widgets/index.js` | — | Zero import sites; all consumers use direct file paths |
| L2 | **Stale barrel re-exports** | `container/index.js` (layout block), `space/components/index.js` (theme constants) | — | Production imports sub-barrels or direct paths |
| L3 | **`charts/space/index.js`, `space/transforms/index.js`** | Barrels with direct-path-only consumers | — | Organizational noise |
| L4 | **`registry/widgetRegistry.js`** | `shared/dashboard/registry/` | 227 | Metadata only; consumed by its own test |
| L5 | **Filters state resolvers** | `resolveAreaTree*State`, `resolveSelected*Ids` | ~120 | Test-only exports; not wired to variants |
| L6 | **`OVERVIEW_ALERTS` dead branch** | `DashboardWidgetRenderer.jsx` | ~5 | Map entry resolves props but renderer returns `null` |
| L7 | **Legacy `legacy*PropsAreEqual`** | Chart/widget memo files | ~40 | Parity-test-only; not wired to components |
| L8 | **Commented dashboard/area loading banners** | Removed in 6.4D from SU variants | 0 | Was triplicate dead code — resolved |
| L9 | **Pastel `COLORS` constant ×3** | SU variant files | ~3 × 3 | Same 8-color array in basic/advanced/customized |
| L10 | **Default memo on `WidgetSlotRenderer` / `DashboardTabRenderer`** | `container/layout/` | — | Shallow compare only; no dedicated comparator file |
| L11 | **`space/export/index.js` barrel** | Zero production barrel imports | — | Adapters import direct paths; hook imports `useSpaceExports` directly |
| L12 | **Re-exported memo comparators** | `container/index.js`, `layout/index.js` | — | `dashboardWidgetRendererPropsAreEqual` etc. — no external consumers |

---

## Debt by Theme (cross-reference)

| Theme | IDs | Highest severity |
|-------|-----|------------------|
| Custom graph pipeline | H1, H3, H4 | HIGH |
| DnD abstractions | H3 | HIGH |
| Export JSX duplication | M1, M9 | MEDIUM |
| Variant slot helpers | M6 | MEDIUM |
| Fullscreen wrappers | H4 | HIGH |
| Container adapter factories | M4, M5 | MEDIUM |
| Barrel / dead export hygiene | L1–L3, L11–L12 | LOW |
| Shared presentation (loaders, status) | M8, L8 | LOW (SU loaders/status done) |

---

## Resolved in Phase 6.4 (no longer open)

| Item | Phase | Status |
|------|-------|--------|
| Unused `useDashboardAreaTreeOrchestration` import in `useDashboardContainer` | 6.4B | ✓ Removed |
| `resolveDashboardContainerOrchestrationKey`, `dashboardContainerSectionsAreEqual` | 6.4B | ✓ Removed |
| `resolveSpaceContainerActiveTab` duplicate | 6.4B | ✓ Consolidated |
| Stale `space/container` memo comparator barrel exports | 6.4B | ✓ Trimmed |
| Inline `ChartLoader` in SpaceUtilization variants | 6.4C | ✓ Shared component |
| Error/API status banners in SpaceUtilization | 6.4D | ✓ Shared panels |
| Basic empty-state panel | 6.4D | ✓ `SpaceEmptyPanel` |

---

*End of technical debt register.*
