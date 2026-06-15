# Phase 6.2B.7 — Dashboard Alerts Widget Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** Dashboard overview Alerts tile from all three `DashboardOverview.jsx` variants

---

## Pre-Work Audit Summary

All three variants rendered an inline Alerts overview tile fed by `data?.alerts` from the dashboard overview API. Advanced and customized were **nearly identical**; basic differed in preview count, typography, and scroll layout.

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| Preview count | `top_5.slice(0, 5)` | `top_5.slice(0, 3)` | Same as advanced |
| Count badge | 1rem circle, 0.625rem font | 24px circle, 14px font | Same as advanced |
| Header layout | `cardHeader` wrapper + divider | Inline title + divider | Same as advanced |
| List layout | Scrollable flex column, truncated rows | Static list | Same as advanced |
| Empty state | `No alerts` (0.8rem) | `No alerts` (1.3rem) | Same as advanced |
| More-alerts link | Red, border-top, clamp font | Red, 1.3rem | Same as advanced |
| Time formatting | `formatAlertTime` local helper | Same helper (duplicated) | Same helper (duplicated) |
| Click handler | `onNavigateToAlerts` on card | Same | Same |
| Visibility | `showAlertsTile` / widget visibility | Always in grid | Always in grid |
| Overview loading | Page-level `CircularProgress` gates tile | Same | Same |
| Alert tab/page | Not touched | Not touched | Not touched |

**Verified:** `Alerts.jsx`, alert exports, email flows, filters, Redux, and APIs were not modified.

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| `formatAlertTime` helper | **100%** (identical logic, duplicated 3×) |
| Display model (`total`, preview slice, `moreCount`) | **100%** (slice count differs basic vs grid) |
| Count badge when `total > 0` | **100%** (size tokens differ) |
| Alert row structure (type + location/time) | **100%** |
| Empty state copy | **100%** |
| More-alerts footer | **100%** |
| Click navigation | **100%** (variant passes `onClick`) |
| Advanced ↔ Customized tile markup | **100%** |
| Basic vs grid theme tokens | **~60%** |
| **Weighted widget-layer duplication removed** | **~88%** |

---

## Dependency Map

```
Dashboard overview API payload
  └── data.alerts { total, top_5[] }
        └── DashboardOverview.jsx (variant)
              ├── visibility / grid placement / cardSx (variant)
              ├── onNavigateToAlerts click handler (variant)
              └── AlertsWidget
                    ├── resolveAlertsWidgetStatus(loading)
                    ├── resolveAlertsTheme(shellVariant)
                    ├── resolveAlertsDisplayModel(alerts, maxPreviewCount)
                    │     └── formatAlertRowSubtitle → formatAlertTime
                    └── AlertsCard
                          ├── header (title + count badge + divider)
                          ├── loading → CircularProgress
                          ├── empty → "No alerts"
                          └── ready → preview list + "N more alerts"

Not in scope (unchanged):
  Alerts.jsx (alert tab/page)
  Alert export / email thunks
  Alert filters / Redux selectors
```

---

## Prop Matrix

### Shared props (`AlertsWidget`)

| Prop | Type | Owner |
|------|------|-------|
| `alerts` | object | Overview `data?.alerts` |
| `loading` | boolean | Optional per-tile loading (overview currently gates at page level) |
| `onClick` | function | Variant (`onNavigateToAlerts`) |
| `cardSx` | object | Variant (grid span + card chrome) |
| `shellVariant` | `'basic' \| 'advanced' \| 'customized' \| 'grid'` | Variant |
| `title` | string | Default `'Alerts'` |

### Variant-only concerns

| Concern | Basic | Advanced | Customized |
|---------|-------|----------|------------|
| `shellVariant` | `"basic"` | `"advanced"` | `"customized"` |
| Grid placement | Dynamic `overviewSevenGridSpanSx` / tile position maps | MUI `Grid item md={4}` | MUI `Grid item md={4}` |
| Visibility gate | `showAlertsTile` | Always shown | Always shown |
| `cardSx` | `cardStyle` + responsive grid span | `cardStyle` | `cardStyle` + background image on parent |

### Export / email dependency matrix

| Layer | Dependency | Modified |
|-------|------------|----------|
| Overview alerts payload | Dashboard overview API `data.alerts` | No |
| Navigation | `onNavigateToAlerts` → Alerts tab | No |
| `Alerts.jsx` | Full alert page, filters, exports | **Not touched** |
| Alert email thunks | Unchanged | No |
| Redux / APIs | Unchanged | No |

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/alerts/AlertsWidget.jsx` | Status + theme + model resolution, memo adapter |
| `src/shared/dashboard/widgets/alerts/AlertsCard.jsx` | Header, list, empty, loading body rendering |
| `src/shared/dashboard/widgets/alerts/alertsTheme.js` | Basic vs grid theme presets |
| `src/shared/dashboard/widgets/alerts/alertsResolvers.js` | Time format, display model, status resolvers |
| `src/shared/dashboard/widgets/alerts/alertsMemoCompare.js` | Memo comparator + legacy status helpers |
| `src/shared/dashboard/widgets/alerts/index.js` | Barrel (default + named exports) |
| `src/shared/dashboard/widgets/alerts/alertsParity.test.js` | Parity tests |

**Barrel updated:** `src/shared/dashboard/widgets/index.js` → `export * from './alerts'`

---

## Files Modified

| File | Change |
|------|--------|
| `src/variants/basic/screens/dashboard/DashboardOverview.jsx` | Removed inline alerts tile; uses `AlertsWidget` with grid `cardSx` |
| `src/variants/advanced/screens/dashboard/DashboardOverview.jsx` | Removed inline alerts tile + duplicate helpers; uses `AlertsWidget` |
| `src/variants/customized/screens/dashboard/DashboardOverview.jsx` | Same as advanced |
| `src/shared/dashboard/widgets/index.js` | Re-export alerts bundle |

**Not modified:** `Alerts.jsx`, alert exports/email, alert filters, Redux, APIs, alert tab/page, dashboard container decomposition.

---

## LOC Before / After

### Variant `DashboardOverview.jsx`

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/DashboardOverview.jsx` | ~866 | 713 | **−153** |
| `advanced/DashboardOverview.jsx` | 207 | 120 | **−87** |
| `customized/DashboardOverview.jsx` | 209 | 123 | **−86** |
| **Variant total** | **~1,282** | **956** | **−326** |

### Shared production modules added

| Module | LOC |
|--------|-----|
| `AlertsCard.jsx` | 188 |
| `alertsTheme.js` | 116 |
| `AlertsWidget.jsx` | 40 |
| `alertsResolvers.js` | 35 |
| `alertsMemoCompare.js` | 26 |
| `index.js` | 18 |
| **Total production** | **423** |

### Tests added: 119 LOC, 13 tests

**Net overview reduction:** ~326 LOC  
**Net codebase delta:** +97 LOC excluding tests (−326 + 423); +119 LOC tests → **+216 LOC** overall

---

## Parity Verification

| Check | Result |
|-------|--------|
| Basic theme (5 preview, scrollable, compact badge) | PASS |
| Advanced theme (maps to grid, 3 preview) | PASS |
| Customized theme (maps to grid) | PASS |
| Loading status | PASS |
| Empty state | PASS |
| Alert count + more-count model | PASS |
| `formatAlertTime` formatting | PASS |
| Memo comparator | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 34 passed, 34 total
Tests:       330 passed, 330 total  (+13 new alerts tests)

npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. Restore inline Alerts tile JSX and local `formatAlertTime` in all three `DashboardOverview.jsx` files.
2. Restore `top3Alerts` / `top5Alerts` and `moreAlertsCount` useMemos/consts in each variant.
3. Remove `AlertsWidget` imports.
4. Delete `src/shared/dashboard/widgets/alerts/` directory (all 7 files).
5. Revert `export * from './alerts'` in `src/shared/dashboard/widgets/index.js`.
6. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, or `Alerts.jsx` changes were made; rollback is overview presentation only.

---

## Architecture

```
src/shared/dashboard/widgets/alerts/
├── AlertsWidget.jsx       # memo adapter + cardSx shell
├── AlertsCard.jsx         # header, list, empty, loading body
├── alertsTheme.js         # basic vs grid presets
├── alertsResolvers.js     # formatAlertTime, display model, status
├── alertsMemoCompare.js   # props equality
└── index.js               # barrel
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- `Alerts.jsx` modifications
- Alert export / email flow changes
- Alert filter / Redux / API changes
- Dashboard container decomposition
- Alert tab/page rework
