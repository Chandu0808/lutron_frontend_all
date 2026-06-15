#!/usr/bin/env node
/**
 * Phase 5.4 Dashboard Decomposition Audit — read-only analysis
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function lines(rel) {
  return read(rel).split(/\r?\n/);
}
function loc(rel) {
  return lines(rel).length;
}

function normalizeLine(s) {
  return s
    .replace(/\/\/.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lineSimilarity(a, b) {
  const la = lines(a).map(normalizeLine).filter((x) => x.length > 3);
  const lb = lines(b).map(normalizeLine).filter((x) => x.length > 3);
  const setB = new Set(lb);
  let inter = 0;
  for (const x of la) if (setB.has(x)) inter++;
  const union = new Set([...la, ...lb]).size;
  return union ? Math.round((inter / union) * 100) : 100;
}

function sectionLOC(fileLines, ranges) {
  const out = {};
  for (const [name, start, end] of ranges) {
    out[name] = Math.max(0, end - start + 1);
  }
  return out;
}

// Section boundaries derived from function markers + comment blocks (1-based line numbers)
const DASHBOARD_SECTIONS = {
  basic: [
    ["imports_and_constants", 1, 272],
    ["energy_chart_order_helpers", 273, 423],
    ["component_state_filters_area_tree", 424, 1974],
    ["api_fetch_orchestration", 1975, 3277],
    ["data_transforms_chart_memo", 3278, 4952],
    ["export_handlers", 4953, 6466],
    ["widget_render_jsx", 6467, 7926],
  ],
  advanced: [
    ["imports_and_constants", 1, 200],
    ["component_state_filters_area_tree", 201, 1900],
    ["api_fetch_orchestration", 1901, 3100],
    ["data_transforms_chart_memo", 3101, 4172],
    ["export_handlers", 4173, 5543],
    ["widget_render_jsx", 5544, 7077],
  ],
  customized: [
    ["imports_and_constants", 1, 420],
    ["custom_graph_scope_helpers", 421, 760],
    ["component_state_visibility_dnd", 761, 2200],
    ["api_fetch_orchestration", 2201, 3800],
    ["data_transforms_chart_memo", 3801, 6035],
    ["export_handlers", 6036, 7569],
    ["widget_render_jsx", 7570, 9247],
  ],
};

const SPACE_SECTIONS = {
  basic: [
    ["imports_and_helpers", 1, 410],
    ["component_state_tabs_order", 411, 2200],
    ["api_fetch_transforms", 2201, 4500],
    ["chart_render_exports", 4501, 6759],
  ],
  advanced: [
    ["imports_and_helpers", 1, 350],
    ["component_state_tabs_order", 351, 1800],
    ["api_fetch_transforms", 1801, 3800],
    ["chart_render_exports", 3801, 5548],
  ],
  customized: [
    ["imports_and_helpers", 1, 500],
    ["component_state_visibility", 501, 2500],
    ["api_fetch_transforms", 2501, 5500],
    ["chart_render_exports", 5501, 9474],
  ],
};

const OVERVIEW_SECTIONS = {
  basic: [
    ["imports_styles", 1, 120],
    ["helpers_subcomponents", 121, 350],
    ["overview_cards_grid", 351, 1221],
  ],
  advanced: [
    ["imports_styles", 1, 95],
    ["helpers_subcomponents", 96, 200],
    ["overview_cards_grid", 201, 376],
  ],
  customized: [
    ["imports_styles", 1, 95],
    ["helpers_subcomponents", 96, 200],
    ["overview_cards_grid", 201, 378],
  ],
};

function extractWidgetKeys(content) {
  const keys = new Set();
  const patterns = [
    /getWidgetTitle\(['"]([^'"]+)['"]/g,
    /normalizeDashboardWidgetKey\(['"]([^'"]+)['"]/g,
    /isWidgetVisible\(['"]([^'"]+)['"]/g,
    /shouldShowEnergyWidget\(['"]([^'"]+)['"]/g,
    /case ['"]([^'"]+)['"]:/g,
    /'([a-z][a-z0-9_]+)'/g,
  ];
  const known = new Set([
    "consumption", "consumption_saving", "savings", "savings_by_strategy",
    "total_consumption_by_group", "light_power_density", "peak_and_minimum_consumption",
    "utilization", "utilization_by_area_group", "utilization_by_area",
    "peak_and_minimum_utilization", "instant_occupancy_count", "instant_utilization_combined",
    "energy", "alerts", "schedules", "quick_controls", "shades", "floors", "space_utilization",
  ]);
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      if (known.has(m[1]) || m[1].startsWith("custom_graph:")) keys.add(m[1]);
    }
  }
  return [...keys].sort();
}

function extractReduxDeps(content) {
  const thunks = new Set();
  const selectors = new Set();
  const reThunk = /\b(fetch|download|send|clear|set|get|create|update|delete)\w+/g;
  const reSel = /\bselect\w+/g;
  let m;
  while ((m = reThunk.exec(content))) {
    const w = m[0];
    if (w.startsWith("select")) continue;
    if (["fetchFloors", "getLeafByFloorID", "getDashboardOverview"].includes(w) || w.match(/^(fetch|download|send|set|clear|get)/))
      thunks.add(w);
  }
  while ((m = reSel.exec(content))) selectors.add(m[0]);
  return {
    thunks: [...thunks].sort(),
    selectors: [...selectors].sort(),
  };
}

function extractUseState(content) {
  const states = [];
  const re = /useState\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(content))) {
    const before = content.slice(Math.max(0, m.index - 80), m.index);
    const varMatch = before.match(/const \[(\w+)/);
    if (varMatch) states.push(varMatch[1]);
  }
  return [...new Set(states)];
}

const files = {
  Dashboard: {
    basic: "src/variants/basic/screens/dashboard/Dashboard.jsx",
    advanced: "src/variants/advanced/screens/dashboard/Dashboard.jsx",
    customized: "src/variants/customized/screens/dashboard/Dashboard.jsx",
  },
  SpaceUtilization: {
    basic: "src/variants/basic/screens/dashboard/SpaceUtilization.jsx",
    advanced: "src/variants/advanced/screens/dashboard/SpaceUtilization.jsx",
    customized: "src/variants/customized/screens/dashboard/SpaceUtilization.jsx",
  },
  DashboardOverview: {
    basic: "src/variants/basic/screens/dashboard/DashboardOverview.jsx",
    advanced: "src/variants/advanced/screens/dashboard/DashboardOverview.jsx",
    customized: "src/variants/customized/screens/dashboard/DashboardOverview.jsx",
  },
  Widgets: { customized: "src/variants/customized/screens/settings/widgets/Widgets.jsx" },
  EnergyCustomGraphCard: { customized: "src/variants/customized/components/dashboard/EnergyCustomGraphCard.jsx" },
};

const report = { sections: {}, similarity: {}, widgets: {}, state: {} };

for (const [comp, variants] of Object.entries(files)) {
  report.sections[comp] = {};
  for (const [v, rel] of Object.entries(variants)) {
    const l = loc(rel);
    let secs = null;
    if (comp === "Dashboard") secs = DASHBOARD_SECTIONS[v];
    if (comp === "SpaceUtilization") secs = SPACE_SECTIONS[v];
    if (comp === "DashboardOverview") secs = OVERVIEW_SECTIONS[v];
    if (secs) {
      report.sections[comp][v] = { total: l, ...sectionLOC(lines(rel), secs), ranges: secs };
    } else {
      report.sections[comp][v] = { total: l };
    }
  }
}

const pairs = [
  ["basic", "advanced"],
  ["basic", "customized"],
  ["advanced", "customized"],
];
for (const [comp, variants] of Object.entries(files)) {
  if (Object.keys(variants).length < 2) continue;
  report.similarity[comp] = {};
  for (const [a, b] of pairs) {
    if (variants[a] && variants[b]) {
      report.similarity[comp][`${a}_vs_${b}`] = lineSimilarity(variants[a], variants[b]);
    }
  }
}

// Widget inventory from dashboardWidgetVisibilityCore + file scans
const core = read("src/variants/basic/utils/dashboardWidgetVisibilityCore.js");
const builtinKeys = [...core.matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1]).filter((k) => k !== "overview" && k.length > 2);

const widgetMap = {
  consumption: { component: "inline LineChart in Dashboard.jsx", redux: ["fetchUnifiedEnergyConsumptionSavingsData", "selectUnifiedEnergyConsumption"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  savings: { component: "inline LineChart in Dashboard.jsx", redux: ["selectUnifiedEnergySavings"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  consumption_saving: { component: "ConsumptionSavingsCombinedChart (basic) / inline combined (adv/cust)", redux: ["fetchUnifiedEnergyConsumptionSavingsData"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  savings_by_strategy: { component: "inline PieChart in Dashboard.jsx", redux: ["fetchSavingsByStrategy", "selectSavingsByStrategy"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  total_consumption_by_group: { component: "inline PieChart / EnergyCustomGraphCard (custom pie)", redux: ["fetchTotalConsumptionByGroup", "selectTotalConsumptionByGroup"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  light_power_density: { component: "inline chart in Dashboard.jsx", redux: ["fetchLightPowerDensity", "selectLightPowerDensity"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  peak_and_minimum_consumption: { component: "inline chart in Dashboard.jsx", redux: ["selectUnifiedPeakMinConsumption"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  utilization: { component: "SpaceUtilization.jsx", redux: ["fetchSpaceUtilizationPerArea"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  utilization_by_area_group: { component: "SpaceUtilization.jsx tab", redux: ["fetchOccupancyByGroup"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  utilization_by_area: { component: "SpaceUtilization.jsx tab", redux: ["fetchOccupancyCount"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  peak_and_minimum_utilization: { component: "SpaceUtilization.jsx (commented/disabled in places)", redux: [], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  instant_occupancy_count: { component: "SpaceUtilization.jsx instant chart", redux: ["fetchInstantOccupancyCount", "selectInstantOccupancyCount"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  instant_utilization_combined: { component: "SpaceUtilization.jsx combined tab", redux: ["fetchOccupancyByGroupFromLogs", "fetchSpaceUtilizationPerFromLogs"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  energy: { component: "DashboardOverview.jsx card", redux: ["getDashboardOverview", "selectDashboardOverview"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  alerts: { component: "DashboardOverview + Alerts.jsx tab", redux: ["getDashboardOverview"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  schedules: { component: "DashboardOverview.jsx card", redux: ["getDashboardOverview"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  quick_controls: { component: "DashboardOverview.jsx card", redux: [], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  shades: { component: "DashboardOverview.jsx (basic only extended)", redux: [], variants: ["basic"], class: "variant-only" },
  floors: { component: "DashboardOverview.jsx card", redux: ["getDashboardOverview"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  space_utilization: { component: "DashboardOverview.jsx card", redux: ["getDashboardOverview"], variants: ["basic", "advanced", "customized"], class: "near-shared" },
  "custom_graph:*": { component: "EnergyCustomGraphCard.jsx", redux: ["fetchCustomGraphs", "resolveDashboardThunkForCustomGraphPath"], variants: ["customized"], class: "variant-only" },
};

report.widgets = widgetMap;

for (const [v, rel] of Object.entries(files.Dashboard)) {
  const c = read(rel);
  report.state[v] = {
    redux: extractReduxDeps(c),
    localState: extractUseState(c),
    widgetKeys: extractWidgetKeys(c),
  };
}

const outPath = path.join(ROOT, "docs/PHASE_5_4_DASHBOARD_AUDIT_DATA.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log("Wrote", outPath);
console.log(JSON.stringify(report.similarity, null, 2));
