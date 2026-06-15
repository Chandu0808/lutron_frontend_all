const fs = require("fs");
const path = require("path");

const advancedRoot = path.join(__dirname, "../src/variants/advanced");
const sharedRegistryRoot = path.join(__dirname, "../src/shared/theme/registry");
const presetsRoot = path.join(sharedRegistryRoot, "presets");
const writerFiles = [
  ["applyAdvancedCssVariables.js", path.join(sharedRegistryRoot, "applyAdvancedCssVariables.js")],
  ["dynamicThemeTokens.js", path.join(advancedRoot, "utils/dynamicThemeTokens.js")],
  ["theme3PageChrome.js", path.join(advancedRoot, "utils/theme3PageChrome.js")],
  ["premiumThemeTokens.js", path.join(sharedRegistryRoot, "premiumThemeTokens.js")],
  ["dashboardChartChrome.js", path.join(sharedRegistryRoot, "dashboardChartChrome.js")],
  ["settingsSidebarTabStyles.js", path.join(sharedRegistryRoot, "settingsSidebarTabStyles.js")],
  ["gold.js", path.join(presetsRoot, "gold.js")],
  ["theme3.js", path.join(presetsRoot, "theme3.js")],
  ["theme4.js", path.join(presetsRoot, "theme4.js")],
  ["defaultSlate.js", path.join(presetsRoot, "defaultSlate.js")],
];

function extractWriterVars(content, name) {
  const vars = new Set();
  const quotedSetProperty = /setProperty\s*\(\s*['"]--([^'"]+)['"]/g;
  let m;
  while ((m = quotedSetProperty.exec(content))) vars.add(m[1]);

  if (name === "premiumThemeTokens.js") {
    const premiumKeys = /['"]--((?:premium|topbar-nav-pill-shadow)[^'"]*)['"]/g;
    while ((m = premiumKeys.exec(content))) vars.add(m[1]);
  }

  return vars;
}

const writers = {};
for (const [name, fp] of writerFiles) {
  const content = fs.readFileSync(fp, "utf8");
  for (const v of extractWriterVars(content, name)) {
    if (!writers[v]) writers[v] = [];
    if (!writers[v].includes(name)) writers[v].push(name);
  }
}

for (const variable of Object.keys(writers)) {
  writers[variable] = writers[variable].filter(
    (w) => w !== "ThemeContext.jsx" && w !== "applyAdvancedCssVariables.js"
  );
  if (writers[variable].length === 0) delete writers[variable];
}

// Orchestrator-only vars (core + theme3 inline) tracked separately
const orchestratorPath = path.join(sharedRegistryRoot, "applyAdvancedCssVariables.js");
const orchestratorContent = fs.readFileSync(orchestratorPath, "utf8");
for (const v of extractWriterVars(orchestratorContent, "applyAdvancedCssVariables.js")) {
  if (!writers[v]) writers[v] = [];
  if (!writers[v].includes("applyAdvancedCssVariables.js")) {
    writers[v].push("applyAdvancedCssVariables.js");
  }
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (/\.(jsx?|css)$/.test(ent.name)) files.push(p);
  }
  return files;
}

const srcRoot = path.join(__dirname, "../src");
const consumers = {};
for (const fp of walk(advancedRoot)) {
  const rel = path.relative(srcRoot, fp).replace(/\\/g, "/");
  const content = fs.readFileSync(fp, "utf8");
  const re = /var\s*\(\s*--([^,)]+)/g;
  let m;
  while ((m = re.exec(content))) {
    const v = m[1].trim();
    if (!consumers[v]) consumers[v] = [];
    if (!consumers[v].includes(rel)) consumers[v].push(rel);
  }
  const re2 = /getPropertyValue\s*\(\s*['"]--([^'"]+)['"]/g;
  while ((m = re2.exec(content))) {
    const v = m[1];
    if (!consumers[v]) consumers[v] = [];
    if (!consumers[v].includes(rel)) consumers[v].push(rel);
  }
}

const allVars = new Set([...Object.keys(writers), ...Object.keys(consumers)]);

function categorize(v) {
  if (
    v.startsWith("settings-sidebar-font") ||
    v.startsWith("settings-sidebar-title-font") ||
    v.startsWith("settings-sidebar-line-height") ||
    v.startsWith("settings-sidebar-letter-spacing") ||
    v.startsWith("settings-sidebar-active-font")
  ) {
    return "typography";
  }
  if (v.startsWith("app-") && !v.includes("page")) return "core";
  if (v.startsWith("app-page") || v.startsWith("footer") || v.startsWith("auth-")) return "background";
  if (v.startsWith("topbar")) return "navigation";
  if (v.startsWith("settings")) return "settings";
  if (v.startsWith("dashboard-chart")) return "charts";
  if (v.startsWith("dashboard")) return "dashboard";
  if (v.startsWith("heatmap")) return "heatmap";
  if (v.startsWith("schedule") || v.startsWith("quick-control")) return "schedule";
  if (v.startsWith("users") || v.startsWith("area-groups") || v.startsWith("home-")) return "users";
  if (v.startsWith("alerts")) return "alerts";
  if (v.startsWith("activity-report")) return "activityReport";
  if (v.startsWith("premium")) return "premium";
  if (v.startsWith("help-") || v.startsWith("floor-tool")) return "settings";
  return "core";
}

function presetOwners(v, w) {
  const owners = new Set();
  if (!w || w.length === 0) return ["consumerOnly"];
  if (w.includes("applyAdvancedCssVariables.js")) {
    owners.add("gold");
    owners.add("theme3");
    owners.add("theme4");
    owners.add("custom");
    owners.add("default");
  }
  if (w.includes("dynamicThemeTokens.js")) owners.add("custom");
  if (w.includes("theme3PageChrome.js")) owners.add("theme3");
  if (w.includes("premiumThemeTokens.js")) {
    owners.add("gold");
    owners.add("theme3");
    owners.add("theme4");
    owners.add("custom");
  }
  if (w.includes("dashboardChartChrome.js")) {
    owners.add("gold");
    owners.add("theme3");
    owners.add("theme4");
    owners.add("default");
  }
  if (w.includes("settingsSidebarTabStyles.js")) {
    owners.add("gold");
    owners.add("theme3");
    owners.add("theme4");
    owners.add("custom");
  }
  if (w.includes("gold.js")) owners.add("gold");
  if (w.includes("theme3.js")) owners.add("theme3");
  if (w.includes("theme4.js")) owners.add("theme4");
  if (w.includes("defaultSlate.js")) {
    owners.add("default");
    owners.add("theme3");
    owners.add("theme4");
  }
  return [...owners].sort();
}

const entries = [...allVars].sort().map((variable) => ({
  variable,
  category: categorize(variable),
  presetOwners: presetOwners(variable, writers[variable]),
  writers: writers[variable] || [],
  consumers: (consumers[variable] || []).sort(),
}));

const writerOnlyVars = new Set(Object.keys(writers));
console.log("Total unique (writers ∪ consumers):", entries.length);
console.log("Unique writers (6 files):", writerOnlyVars.size);
console.log("Writers only (no consumer):", entries.filter((e) => e.writers.length && !e.consumers.length).length);
console.log("Consumers only:", entries.filter((e) => !e.writers.length && e.consumers.length).length);

fs.writeFileSync(path.join(__dirname, "_registry-scan.json"), JSON.stringify(entries, null, 2));

const strictOnly = new Set();
for (const [name, fp] of writerFiles) {
  const content = fs.readFileSync(fp, "utf8");
  const re = /setProperty\s*\(\s*['"]--([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content))) strictOnly.add(m[1]);
}
console.log("Strict setProperty quoted only:", strictOnly.size);

const manifestPath = path.join(__dirname, "../src/shared/theme/registry/themeRegistryManifest.js");
const manifestDir = path.dirname(manifestPath);
if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });

const manifestSource = `/**
 * Advanced theme CSS variable registry (metadata only).
 * Generated from advanced preset/token writers and consumers — do not edit entries by hand.
 * Regenerate: node scripts/generate-registry-scan.js
 */
/* eslint-disable max-lines */

export const THEME_REGISTRY_CATEGORIES = Object.freeze([
  "core",
  "background",
  "navigation",
  "settings",
  "dashboard",
  "charts",
  "heatmap",
  "schedule",
  "users",
  "alerts",
  "activityReport",
  "premium",
  "typography",
]);

export const THEME_REGISTRY_PRESETS = Object.freeze([
  "gold",
  "theme3",
  "theme4",
  "custom",
  "default",
  "consumerOnly",
]);

export const THEME_REGISTRY_WRITERS = Object.freeze([
  "applyAdvancedCssVariables.js",
  "dynamicThemeTokens.js",
  "theme3PageChrome.js",
  "premiumThemeTokens.js",
  "dashboardChartChrome.js",
  "settingsSidebarTabStyles.js",
  "gold.js",
  "theme3.js",
  "theme4.js",
  "defaultSlate.js",
]);

/** @type {ReadonlyArray<{ variable: string, category: string, presetOwners: string[], writers: string[], consumers: string[] }>} */
export const THEME_REGISTRY_ENTRIES = Object.freeze(
  ${JSON.stringify(entries, null, 2).replace(/"([^"]+)":/g, "$1:")}
);

const entriesByVariable = new Map(
  THEME_REGISTRY_ENTRIES.map((entry) => [entry.variable, entry])
);

const entriesByCategory = THEME_REGISTRY_ENTRIES.reduce((acc, entry) => {
  if (!acc[entry.category]) acc[entry.category] = [];
  acc[entry.category].push(entry);
  return acc;
}, /** @type {Record<string, typeof THEME_REGISTRY_ENTRIES>} */ ({}));

const entriesByPreset = THEME_REGISTRY_PRESETS.reduce((acc, preset) => {
  acc[preset] = THEME_REGISTRY_ENTRIES.filter((entry) =>
    entry.presetOwners.includes(preset)
  );
  return acc;
}, /** @type {Record<string, typeof THEME_REGISTRY_ENTRIES>} */ ({}));

/**
 * @param {string} category
 * @returns {ReadonlyArray<typeof THEME_REGISTRY_ENTRIES[number]>}
 */
export function getVariablesByCategory(category) {
  return Object.freeze(entriesByCategory[category] ?? []);
}

/**
 * @param {string} preset
 * @returns {ReadonlyArray<typeof THEME_REGISTRY_ENTRIES[number]>}
 */
export function getVariablesByPreset(preset) {
  return Object.freeze(entriesByPreset[preset] ?? []);
}

/**
 * @param {string} variable CSS variable name without leading \`--\`
 * @returns {{ variable: string, category: string, presetOwners: string[], writers: string[], consumers: string[] } | undefined}
 */
export function getVariableOwners(variable) {
  const key = String(variable).replace(/^--/, "");
  return entriesByVariable.get(key);
}

/** @returns {ReadonlyArray<string>} */
export function getAllRegistryVariableNames() {
  return Object.freeze(THEME_REGISTRY_ENTRIES.map((entry) => entry.variable));
}

/** @returns {ReadonlyArray<string>} */
export function getRegistryWriterVariableNames() {
  return Object.freeze(
    THEME_REGISTRY_ENTRIES.filter((entry) => entry.writers.length > 0).map(
      (entry) => entry.variable
    )
  );
}

export function validateThemeRegistryManifest() {
  const errors = [];
  const seen = new Set();

  for (const entry of THEME_REGISTRY_ENTRIES) {
    if (seen.has(entry.variable)) {
      errors.push(\`Duplicate registry entry: \${entry.variable}\`);
    }
    seen.add(entry.variable);

    if (!THEME_REGISTRY_CATEGORIES.includes(entry.category)) {
      errors.push(\`Unknown category for \${entry.variable}: \${entry.category}\`);
    }

    for (const preset of entry.presetOwners) {
      if (!THEME_REGISTRY_PRESETS.includes(preset)) {
        errors.push(\`Unknown preset owner for \${entry.variable}: \${preset}\`);
      }
    }

    for (const writer of entry.writers) {
      if (!THEME_REGISTRY_WRITERS.includes(writer)) {
        errors.push(\`Unknown writer for \${entry.variable}: \${writer}\`);
      }
    }
  }

  for (const writer of THEME_REGISTRY_WRITERS) {
    const covered = THEME_REGISTRY_ENTRIES.some((entry) => entry.writers.includes(writer));
    if (!covered) {
      errors.push(\`Writer not represented in registry: \${writer}\`);
    }
  }

  return { valid: errors.length === 0, errors };
}
`;

fs.writeFileSync(manifestPath, manifestSource);
console.log("Written", manifestPath);
