# Phase 6.2B.2 — Overview Tile Bundle Extraction Report

**Status:** COMPLETE  
**Date:** 2026-06-10  
**Scope:** GREEN overview tiles (`energy`, `schedules`, `quick_controls`, `floors`, `space_utilization`)

---

## Pre-Work Audit Summary

| Tile | Basic vs Adv/Cust content | Basic vs Adv/Cust styling |
|------|---------------------------|---------------------------|
| **Energy** | Identical data model (`savings_percent`, `savings_kw`, `consumption_kw`) | Basic: cqi/cqh responsive ring + labels; Grid: fixed rem + 136px ring |
| **Schedules** | Identical (`schedule.next` → event text) | Basic: "Next Event" + compact meta; Grid: "Next event" + larger type |
| **Quick Controls** | Identical static copy | Basic: footer meta sizing; Grid: body1 sizing |
| **Floors** | Identical (`floors.count` → count or `—`) | Basic: oversized responsive icon/count; Grid: 88px icon + 4.25rem count |
| **Space Utilization** | Identical (`occupied_percent` or empty) | Basic: responsive ring; Grid: 146px ring + larger caption |

**Advanced vs customized:** Tile bodies were ~99% identical; only outer shell background differs (transparent vs `dashboardOverviewBg`).

**Alerts tile:** Untouched in all variants.

---

## Overlap Analysis

| Category | Overlap |
|----------|---------|
| Tile data models (5 tiles) | **100%** |
| Empty-state copy | **100%** |
| Icon selection | **100%** |
| Metric formatting (`toFixed(2) kW`, `%` ring) | **100%** |
| Presentation tokens (typography, ring geometry) | **~65%** (basic responsive vs grid fixed) |
| Layout orchestration (grid spans, visibility) | **0%** (stays in `DashboardOverview`) |
| **Weighted duplication removed from tile bodies** | **~88%** |

---

## Tile Prop Matrix

### Shared props (`OverviewMetricTile`)

| Prop | Type | Purpose |
|------|------|---------|
| `tileType` | `energy` \| `schedules` \| `quick_controls` \| `floors` \| `space_utilization` | Selects renderer + model resolver |
| `title` | string (optional) | Override default tile title |
| `energy` | object | Energy tile payload |
| `schedule` | object | Schedules tile payload (`schedule.next`) |
| `floorsCount` | number \| null | Floors count |
| `spaceUtil` | object | Space utilization payload |
| `onClick` | function | Navigation handler (variant-owned) |
| `cardSx` | object | Merged shell styles (card + grid span) |

### Variant props

| Prop | Basic | Advanced / Customized |
|------|-------|----------------------|
| `themeVariant` | `OVERVIEW_THEME_VARIANTS.BASIC` | `OVERVIEW_THEME_VARIANTS.GRID` |
| `cardVariant` | `responsive` (default) | `fixed` (default) |
| `surfaceVariant` | `default` | `default` |
| `cardSx` | `cardStyle` + dynamic grid span / bottom-row width | `cardStyle` inside MUI `Grid item` |

### Stays in `DashboardOverview`

- Data fetching props (`data`, `loading`, `error`)
- Visibility gating (`isWidgetVisible`)
- Dynamic grid layout (`tileFivePos`, `useSevenTileLayout`, flex bottom row)
- Alerts tile rendering
- Shades + custom overview widgets (basic only)
- Page-level loading/error shells

---

## Files Created

| File | Purpose |
|------|---------|
| `src/shared/dashboard/widgets/overview/OverviewMetricTile.jsx` | Memoized tile adapter |
| `src/shared/dashboard/widgets/overview/OverviewMetricTileCard.jsx` | Tile body rendering + ring/icon components |
| `src/shared/dashboard/widgets/overview/OverviewMetricTileTheme.js` | Basic vs grid theme presets |
| `src/shared/dashboard/widgets/overview/OverviewTileGrid.jsx` | Basic grid span helpers |
| `src/shared/dashboard/widgets/overview/overviewTileTypes.js` | Tile type constants + model resolvers |
| `src/shared/dashboard/widgets/overview/overviewTileMemoCompare.js` | Memo comparator + parity helpers |
| `src/shared/dashboard/widgets/overview/index.js` | Barrel exports |
| `src/shared/dashboard/widgets/overview/overviewTileParity.test.js` | Model/theme/grid/memo parity |
| `src/shared/dashboard/widgets/overview/OverviewMetricTileCard.test.jsx` | Card presentation tests |

---

## Files Modified

| File | Change |
|------|--------|
| `src/shared/dashboard/widgets/index.js` | Re-export overview bundle |
| `src/variants/basic/screens/dashboard/DashboardOverview.jsx` | Replaced 5 tile bodies (+ 3 flex-row duplicates); imported grid helpers |
| `src/variants/advanced/screens/dashboard/DashboardOverview.jsx` | Replaced 5 tile bodies; alerts unchanged |
| `src/variants/customized/screens/dashboard/DashboardOverview.jsx` | Replaced 5 tile bodies; alerts unchanged |

**Not modified:** `Dashboard.jsx`, `SpaceUtilization.jsx`, `Alerts.jsx`, `Widgets.jsx`, `EnergyCustomGraphCard.jsx`, Redux/API/routes.

---

## LOC Before / After

### `DashboardOverview.jsx`

| File | Before | After | Δ |
|------|--------|-------|---|
| `basic/DashboardOverview.jsx` | 1,220 | 865 | **−355** |
| `advanced/DashboardOverview.jsx` | 375 | 206 | **−169** |
| `customized/DashboardOverview.jsx` | 377 | 208 | **−169** |
| **Variant total** | **1,972** | **1,279** | **−693** |

### Shared production modules

| Module | LOC |
|--------|-----|
| `OverviewMetricTileCard.jsx` | 391 |
| `OverviewMetricTileTheme.js` | 222 |
| `overviewTileTypes.js` | 78 |
| `overviewTileMemoCompare.js` | 68 |
| `OverviewMetricTile.jsx` | 57 |
| `OverviewTileGrid.jsx` | 29 |
| `index.js` | 29 |
| **Total production** | **874** |

### Tests added: 273 LOC, 20 tests

**Net monolith reduction:** ~693 LOC  
**Net codebase delta:** +181 LOC (shared − variant removal, excluding tests)

---

## Parity Verification

| Check | Result |
|-------|--------|
| Energy tile model parity | PASS |
| Schedules tile model parity | PASS |
| Quick Controls tile model parity | PASS |
| Floors tile model parity | PASS |
| Space Utilization tile model parity | PASS |
| Empty states (energy, schedules, space util) | PASS |
| Theme resolution (basic responsive vs grid fixed) | PASS |
| Grid helper exports | PASS |
| Memo comparator | PASS |
| Card shell rendering | PASS |

---

## Test Results

```
npm test -- --testPathPattern=shared/dashboard — PASS
Test Suites: 29 passed, 29 total
Tests:       245 passed, 245 total  (+20 new)

npm run build — PASS (Compiled successfully)
```

---

## Rollback Plan

1. Restore inline tile JSX in all three `DashboardOverview.jsx` files from pre-6.2B.2 revision.
2. Remove imports of `OverviewMetricTile` and overview grid helpers from basic variant.
3. Delete `src/shared/dashboard/widgets/overview/` directory.
4. Remove `export * from './overview'` from `src/shared/dashboard/widgets/index.js`.
5. Run `npm test -- --testPathPattern=shared/dashboard` and `npm run build`.

No Redux, API, routing, or visibility changes were made; rollback is presentation-only.

---

## Architecture

```
DashboardOverview (variant)
  ├── visibility + grid layout + alerts/shades (unchanged)
  └── OverviewMetricTile (per GREEN tile)
        ├── resolveOverviewTileModel
        ├── resolveOverviewMetricTileTheme (basic | grid)
        └── OverviewMetricTileCard
              ├── CircularProgressLabel (responsive | fixed)
              └── icon / metric footer bodies
```

---

## Stop Boundary

Per phase scope, the following were **not** started:

- Energy tab widget extraction (6.2B.3+)
- Alerts tile extraction
- Overview container/grid engine extraction
- Runtime widget registry
