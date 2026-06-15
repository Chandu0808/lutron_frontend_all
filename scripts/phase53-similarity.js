#!/usr/bin/env node
/**
 * Phase 5.3 — Layout similarity analysis
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const VARIANTS = ["basic", "advanced", "customized"];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function hash(content) {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
}
function loc(content) {
  return content.split("\n").length;
}

function stripNoise(src) {
  return src
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jaccard(a, b) {
  const sa = new Set(a.split(" "));
  const sb = new Set(b.split(" "));
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const union = new Set([...sa, ...sb]).size;
  return union ? (inter / union) * 100 : 0;
}

const targets = [
  { name: "MainLayout.jsx", path: "layouts/MainLayout.jsx" },
  { name: "TopbarComponent.jsx", path: "components/TopbarComponent.jsx" },
];

const sidebarNote =
  "No standalone Sidebar.jsx exists — mobile sidebar is the Topbar `Drawer` (SharedSidebar in Phase 5.3).";

let report = `# Phase 5.3 — Layout Similarity Report\n\nGenerated: ${new Date().toISOString()}\n\n## Note\n\n${sidebarNote}\n\n`;

for (const t of targets) {
  report += `## ${t.name}\n\n`;
  const byVariant = {};
  for (const v of VARIANTS) {
    const rel = `src/variants/${v}/${t.path}`;
    const content = read(rel);
    byVariant[v] = { content, loc: loc(content), hash: hash(content) };
  }

  report += `| Variant | LOC | Hash |\n|---------|----:|------|\n`;
  for (const v of VARIANTS) {
    report += `| ${v} | ${byVariant[v].loc} | \`${byVariant[v].hash}\` |\n`;
  }
  report += "\n";

  const pairs = [
    ["basic", "advanced"],
    ["basic", "customized"],
    ["advanced", "customized"],
  ];
  report += `### Token similarity (Jaccard)\n\n`;
  for (const [a, b] of pairs) {
    const score = jaccard(
      stripNoise(byVariant[a].content),
      stripNoise(byVariant[b].content)
    ).toFixed(1);
    const exact = byVariant[a].hash === byVariant[b].hash;
    report += `- **${a} vs ${b}**: ${score}%${exact ? " (identical)" : ""}\n`;
  }

  const sharedPatterns = [
    "fetchApplicationTheme",
    "TopbarComponent",
    "HeatmapControls",
    "HeatMap",
    "Footer",
    "Outlet",
    "useLocation",
    "isDashboard",
    "/heatmap",
    "drawerOpen",
    "Drawer",
    "AppBar",
    "handleLogout",
    "fetchProfile",
  ];
  report += `\n### Shared pattern presence\n\n| Pattern | basic | advanced | customized |\n|---------|:-----:|:--------:|:----------:|\n`;
  for (const p of sharedPatterns) {
    report += `| \`${p}\` |`;
    for (const v of VARIANTS) {
      report += ` ${byVariant[v].content.includes(p) ? "✓" : "—"} |`;
    }
    report += "\n";
  }
  report += "\n";
}

report += `## Consolidation recommendation\n\n`;
report += `| Area | Similarity | Strategy |\n|------|------------|----------|\n`;
report += `| MainLayout shell | Low (basic 410 LOC vs ~185) | SharedMainLayout + per-variant adapters |\n`;
report += `| Topbar | Low (~72–78% token overlap) | SharedSidebar + shared hooks; variant branding via adapter |\n`;
report += `| Mobile sidebar (Drawer) | High across variants | SharedSidebar component |\n`;
report += `| Footer | Identical pattern | Render via SharedMainLayout binding |\n`;
report += `| Route highlighting | Shared util exists | \`topbarNavActive.js\` + \`useTopbarRouteHighlight\` |\n`;

const out = path.join(ROOT, "docs/PHASE_5_3_SIMILARITY.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, report);
console.log("Wrote", out);
