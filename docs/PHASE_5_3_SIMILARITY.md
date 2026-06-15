# Phase 5.3 — Layout Similarity Report

Generated: 2026-06-10T12:56:53.718Z

## Note

No standalone Sidebar.jsx exists — mobile sidebar is the Topbar `Drawer` (SharedSidebar in Phase 5.3).

## MainLayout.jsx

| Variant | LOC | Hash |
|---------|----:|------|
| basic | 45 | `faad1b2e6dce` |
| advanced | 31 | `d62361a4118d` |
| customized | 34 | `c26134e356b5` |

### Token similarity (Jaccard)

- **basic vs advanced**: 70.0%
- **basic vs customized**: 66.7%
- **advanced vs customized**: 80.8%

### Shared pattern presence

| Pattern | basic | advanced | customized |
|---------|:-----:|:--------:|:----------:|
| `fetchApplicationTheme` | — | — | — |
| `TopbarComponent` | ✓ | ✓ | ✓ |
| `HeatmapControls` | ✓ | ✓ | ✓ |
| `HeatMap` | ✓ | ✓ | ✓ |
| `Footer` | ✓ | ✓ | ✓ |
| `Outlet` | — | — | — |
| `useLocation` | — | — | — |
| `isDashboard` | — | — | — |
| `/heatmap` | ✓ | ✓ | ✓ |
| `drawerOpen` | — | — | — |
| `Drawer` | — | — | — |
| `AppBar` | — | — | — |
| `handleLogout` | — | — | — |
| `fetchProfile` | — | — | — |

## TopbarComponent.jsx

| Variant | LOC | Hash |
|---------|----:|------|
| basic | 1112 | `29e62dfe23d6` |
| advanced | 958 | `2e9960b71017` |
| customized | 836 | `2655ca2c1149` |

### Token similarity (Jaccard)

- **basic vs advanced**: 43.9%
- **basic vs customized**: 50.4%
- **advanced vs customized**: 74.1%

### Shared pattern presence

| Pattern | basic | advanced | customized |
|---------|:-----:|:--------:|:----------:|
| `fetchApplicationTheme` | — | ✓ | — |
| `TopbarComponent` | ✓ | ✓ | ✓ |
| `HeatmapControls` | — | — | — |
| `HeatMap` | — | — | — |
| `Footer` | — | — | — |
| `Outlet` | — | — | — |
| `useLocation` | ✓ | ✓ | ✓ |
| `isDashboard` | — | — | — |
| `/heatmap` | ✓ | ✓ | ✓ |
| `drawerOpen` | ✓ | ✓ | ✓ |
| `Drawer` | ✓ | ✓ | ✓ |
| `AppBar` | ✓ | ✓ | ✓ |
| `handleLogout` | ✓ | ✓ | ✓ |
| `fetchProfile` | ✓ | ✓ | ✓ |

## Consolidation recommendation

| Area | Similarity | Strategy |
|------|------------|----------|
| MainLayout shell | Low (basic 410 LOC vs ~185) | SharedMainLayout + per-variant adapters |
| Topbar | Low (~72–78% token overlap) | SharedSidebar + shared hooks; variant branding via adapter |
| Mobile sidebar (Drawer) | High across variants | SharedSidebar component |
| Footer | Identical pattern | Render via SharedMainLayout binding |
| Route highlighting | Shared util exists | `topbarNavActive.js` + `useTopbarRouteHighlight` |
