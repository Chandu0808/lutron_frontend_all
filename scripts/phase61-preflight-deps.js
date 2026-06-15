#!/usr/bin/env node
/**
 * Phase 6.1 preflight — import graph + cycle detection (read-only)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VARIANTS = ["basic", "advanced", "customized"];

const SEED_FILES = [];
for (const v of VARIANTS) {
  for (const f of [
    `src/variants/${v}/screens/dashboard/Dashboard.jsx`,
    `src/variants/${v}/screens/dashboard/SpaceUtilization.jsx`,
    `src/variants/${v}/screens/dashboard/DashboardOverview.jsx`,
    `src/variants/${v}/redux/slice/dashboard/dashboardSlice.js`,
    `src/variants/${v}/redux/slice/dashboard/unifiedEnergySlice.js`,
    `src/variants/${v}/redux/slice/dashboard/alertsSlice.js`,
    `src/variants/${v}/redux/slice/home/homeSlice.js`,
    `src/variants/${v}/utils/dashboardWidgetVisibilityCore.js`,
    `src/variants/${v}/utils/dashboardWidgetVisibility.js`,
  ]) {
    const p = path.join(ROOT, f);
    if (fs.existsSync(p)) SEED_FILES.push(f);
  }
}
if (fs.existsSync(path.join(ROOT, "src/variants/basic/screens/dashboard/ConsumptionSavingsCombinedChart.jsx"))) {
  SEED_FILES.push("src/variants/basic/screens/dashboard/ConsumptionSavingsCombinedChart.jsx");
}
if (fs.existsSync(path.join(ROOT, "src/variants/basic/screens/dashboard/SpaceInstantUtilizationCombinedChart.jsx"))) {
  SEED_FILES.push("src/variants/basic/screens/dashboard/SpaceInstantUtilizationCombinedChart.jsx");
}
if (fs.existsSync(path.join(ROOT, "src/shared/redux/slices/createHomeModule.js"))) {
  SEED_FILES.push("src/shared/redux/slices/createHomeModule.js");
  SEED_FILES.push("src/shared/redux/slices/createAlertsModule.js");
}

const importRe = /import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
const resolved = new Map();
const edges = [];

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.dirname(path.join(ROOT, fromFile));
  let candidate = path.normalize(path.join(base, spec));
  const tries = [
    candidate,
    candidate + ".js",
    candidate + ".jsx",
    path.join(candidate, "index.js"),
    path.join(candidate, "index.jsx"),
  ];
  for (const t of tries) {
    if (fs.existsSync(t)) return path.relative(ROOT, t).replace(/\\/g, "/");
  }
  return null;
}

function walk(file, depth = 0, seen = new Set()) {
  if (seen.has(file) || depth > 12) return;
  seen.add(file);
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return;
  let content;
  try {
    content = fs.readFileSync(full, "utf8");
  } catch {
    return;
  }
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(content))) {
    const target = resolveImport(file, m[1]);
    if (!target) continue;
    edges.push([file, target]);
    if (
      target.includes("/dashboard/") ||
      target.includes("/redux/slice/dashboard") ||
      target.includes("/redux/slice/home") ||
      target.includes("dashboardWidget") ||
      target.includes("/shared/redux/slices/create")
    ) {
      walk(target, depth + 1, seen);
    }
  }
}

for (const f of SEED_FILES) walk(f);

const graph = {};
for (const [a, b] of edges) {
  if (!graph[a]) graph[a] = new Set();
  graph[a].add(b);
}

function findCycles() {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();
  const pathArr = [];

  function dfs(node) {
    if (stack.has(node)) {
      const idx = pathArr.indexOf(node);
      cycles.push([...pathArr.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    pathArr.push(node);
    for (const n of graph[node] || []) dfs(n);
    pathArr.pop();
    stack.delete(node);
  }

  for (const n of Object.keys(graph)) dfs(n);
  return cycles;
}

const cycles = findCycles();
const uniqueCycles = [];
const sig = new Set();
for (const c of cycles) {
  const s = c.join(" -> ");
  if (!sig.has(s)) {
    sig.add(s);
    uniqueCycles.push(c);
  }
}

const out = {
  seedCount: SEED_FILES.length,
  edgeCount: edges.length,
  nodeCount: new Set(edges.flat()).size,
  cycles: uniqueCycles.slice(0, 20),
  cycleCount: uniqueCycles.length,
};

fs.writeFileSync(path.join(ROOT, "docs/PHASE_6_1_PREFLIGHT_GRAPH.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
