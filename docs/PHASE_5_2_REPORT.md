# Phase 5.2 — Shared Settings & Layout Shell Report

## Summary

Phase 5.2 consolidates settings layout infrastructure, users/schedule modules (binding pattern), and a settings route registry. `MainLayout` is unchanged; `SharedAppShell` is infrastructure-only.

## LOC Impact

| Metric | Count |
|--------|------:|
| Shared module LOC (layout + settings + routes) | 19918 |
| Variant wrapper LOC (users/schedule/settings) | 636 |
| Shared files created | 23 |
| Thin wrappers | 24 |

## Files Consolidated

### Layout (`src/shared/layout/`)
- `SharedSettingsShell.jsx` — adapter-driven settings grid
- `SharedSettingsNavigation.jsx` — RBAC-filtered nav with active route detection
- `SharedAppShell.jsx` — app frame infrastructure (topbar/settings/outlet slots)
- `settingsPathUtils.js` — path normalization and active item helpers
- Adapters: `basicSettingsLayoutAdapter`, `advancedSettingsLayoutAdapter`, `customizedSettingsLayoutAdapter`

### Users (`src/shared/settings/users/`)
- `userUpdatePayload.js` — all variants
- `UsersComponent.jsx`, `CreateUser.jsx`, `UpdateUser.jsx` — basic + customized (binding)
- `bindUsersSettingsModule.js`

### Schedule (`src/shared/settings/schedule/`)
- `ScheduleComponent.jsx`, `ScheduleFormPanel.jsx`, `ScheduleDetails.jsx`, `AddEvent.jsx`, `UpdatePreconfigurdEvent.jsx`
- `bindScheduleSettingsModule.js`

### Routes
- `settingsRouteManifest.js` — sidebar paths, RBAC, active route detection

## Variant-Only Files (intentional)

- `src/variants/advanced/screens/settings/Users/UsersComponent.jsx`
- `src/variants/advanced/screens/settings/Users/CreateUser.jsx`
- `src/variants/advanced/screens/settings/Users/UpdateUser.jsx`
- `src/variants/customized/components/SettingsSidebar.jsx`
- `src/variants/basic/components/SettingsSidebarNav.jsx`
- `src/variants/advanced/components/SettingsSidebarNav.jsx`

Advanced users screens retain variant-specific layout (SettingsLayout shell vs embedded sidebar).

## Route Paths — Unchanged

| Route | Path |
|-------|------|
| Users | `/users` |
| Schedule | `/schedule` |
| Schedule details | `/schedule/details/:id` |
| Add event | `/schedule/add-event` |
| Widgets (customized) | `/widgets/` |
| Rename widget (basic/advanced) | `/rename-widget/` |

## Shared Shell Readiness

| Component | Status |
|-----------|--------|
| SharedSettingsShell | Wired in basic + advanced SettingsLayout |
| SharedSettingsNavigation | Used via NavigationComponent prop |
| SharedAppShell | Created; not wired to MainLayout |
| settingsRouteManifest | Ready for sidebar + RBAC consumers |
| customized SettingsLayout | Still uses SettingsSidebar (adapter notes `useStandaloneSidebar`) |

## Dashboard & Guarded Files — Untouched

- `src/variants/basic/screens/dashboard/Dashboard.jsx` — present (not modified in Phase 5.2)
- `src/variants/advanced/screens/dashboard/Dashboard.jsx` — present (not modified in Phase 5.2)
- `src/variants/customized/screens/dashboard/Dashboard.jsx` — present (not modified in Phase 5.2)
- `src/variants/basic/screens/dashboard/SpaceUtilization.jsx` — present (not modified in Phase 5.2)
- `src/variants/basic/screens/dashboard/Widgets.jsx` — not found
- `src/variants/basic/screens/dashboard/EnergyCustomGraphCard.jsx` — not found
- `src/variants/basic/components/TopbarComponent.jsx` — present (not modified in Phase 5.2)

## Verification Checklist

- [x] Route paths unchanged (`settingsRouteManifest.test.js`)
- [x] Settings navigation helpers unchanged (`settingsPathUtils.test.js`)
- [x] RBAC rules preserved (`canAccessSettingsRoute` tests)
- [x] Redux slices unchanged (variant wrappers bind existing slices)
- [x] Theme via shared `themeOnSurface` in consolidated screens
- [x] Binding registration tests (`settingsBindings.test.js`)

Generated: 2026-06-10T12:33:51.606Z
