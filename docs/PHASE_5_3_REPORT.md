# Phase 5.3 — Shared Layout Migration Report

Generated: 2026-06-10T12:56:53.781Z

## Summary

Adopted `SharedAppShell` via `SharedMainLayout` with per-variant adapters. Mobile sidebar drawer consolidated into `SharedSidebar`. Variant `TopbarComponent` files retain branding/theme; drawer logic shared.

## LOC Impact

| Area | Before (variants) | After (wrappers) | Net removed |
|------|------------------:|-----------------:|------------:|
| MainLayout (all variants) | 781 | 110 | **671** |
| Topbar drawer sections (est.) | — | — | **~244** |
| Shared app layout modules | 0 | 1018 | (new shared infra) |

## Layout Similarity (see PHASE_5_3_SIMILARITY.md)

| File | basic vs advanced | basic vs customized |
|------|------------------:|--------------------:|
| MainLayout | ~45% tokens | ~42% tokens |
| TopbarComponent | ~72% tokens | ~75% tokens |
| Sidebar | N/A — embedded Drawer → `SharedSidebar` | |

## Files Created

- `src/shared/layout/app/SharedMainLayout.jsx`
- `src/shared/layout/app/SharedTopbar.jsx` (hooks + frame)
- `src/shared/layout/app/SharedSidebar.jsx`
- `src/shared/layout/app/appLayoutPathUtils.js`
- `src/shared/layout/app/useSidebarDrawer.js`
- `src/shared/layout/app/useTopbarRouteHighlight.js`
- `src/shared/layout/app/bindAppLayoutModule.js`
- Adapters: basic, advanced, customized

## Variant-Only Layout Code (retained)

- Full `TopbarComponent.jsx` per variant (branding, theme chrome, desktop nav tabs)
- `SettingsSidebar.jsx` (customized)
- `SettingsSidebarNav.jsx` (basic/advanced)
- Variant theme utils (`themePageBackground`, `scheduleFormLayout`, etc.)

## SharedAppShell Wiring

| Variant | MainLayout | SharedAppShell |
|---------|------------|----------------|
| basic | `SharedMainLayout` + `basicMainLayoutAdapter` | ✓ |
| advanced | `SharedMainLayout` + `advancedMainLayoutAdapter` | ✓ |
| customized | `SharedMainLayout` + `customizedMainLayoutAdapter` | ✓ |

Route paths unchanged — `App.js` not modified.

## Dashboard & Guarded Files

- `src/variants/basic/screens/dashboard/Dashboard.jsx` — not modified
- `src/variants/advanced/screens/dashboard/Dashboard.jsx` — not modified
- `src/variants/customized/screens/dashboard/Dashboard.jsx` — not modified
- `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` — not modified
- `src/variants/advanced/screens/dashboard/SpaceUtilization.jsx` — not modified
- `src/variants/customized/screens/dashboard/SpaceUtilization.jsx` — not modified
- `src/variants/customized/screens/settings/widgets/Widgets.jsx` — not modified
- `EnergyCustomGraphCard.jsx` — not found in expected paths

## Verification

- [x] `appLayoutPathUtils.test.js` — route helpers
- [x] `useSidebarDrawer.test.js` — collapse state
- [x] `bindAppLayoutModule.test.js` — binding registration
- [x] Existing `settingsRouteManifest` + shared tests pass
- [x] RBAC via unchanged `isTopbarNavItemActive` / `UseAuth`
