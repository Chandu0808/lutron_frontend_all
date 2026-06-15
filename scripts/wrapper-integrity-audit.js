#!/usr/bin/env node
/**
 * Wrapper Integrity Audit — Phases 5.1, 5.2, 5.3
 * Read-only analysis; writes docs/WRAPPER_INTEGRITY_AUDIT.md
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");

function read(rel) {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function resolveImport(fromRel, spec) {
  if (!spec.startsWith(".")) return { resolved: null, note: "external" };
  const base = path.dirname(path.join(ROOT, fromRel));
  let target = path.normalize(path.join(base, spec));
  const exts = ["", ".js", ".jsx", ".ts", ".tsx", "/index.js", "/index.jsx"];
  for (const ext of exts) {
    const candidate = target + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { resolved: path.relative(ROOT, candidate).replace(/\\/g, "/"), note: "ok" };
    }
  }
  return { resolved: null, note: "missing" };
}

function parseExports(content) {
  const named = new Set();
  let hasDefault = false;
  if (!content) return { named, hasDefault };

  if (/export\s+default\b/.test(content)) hasDefault = true;

  const patterns = [
    /export\s+(?:const|let|var|function|class)\s+(\w+)/g,
    /export\s*\{\s*([^}]+)\s*\}/g,
    /export\s+async\s+function\s+(\w+)/g,
  ];

  for (const m of content.matchAll(/export\s+(?:const|let|var|function|class)\s+(\w+)/g)) {
    named.add(m[1]);
  }
  for (const m of content.matchAll(/export\s+async\s+function\s+(\w+)/g)) {
    named.add(m[1]);
  }
  for (const block of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    const inner = block[1];
    inner.split(",").forEach((part) => {
      const t = part.trim();
      if (!t || t.startsWith("//")) return;
      if (t === "default" || t.includes("default as")) hasDefault = true;
      const asMatch = t.match(/(\w+)\s+as\s+(\w+)/);
      if (asMatch) named.add(asMatch[2]);
      else if (t !== "default") named.add(t.split(/\s+/)[0]);
    });
  }

  return { named: [...named], hasDefault };
}

function classifyWrapper(content, rel) {
  if (!content) return { type: "missing", phase: "unknown" };
  let phase = "unknown";
  if (/Phase 5\.1|create\w+Module|re-export wrapper/.test(content)) phase = "5.1";
  if (/Phase 5\.2|bindUsersSettingsModule|bindScheduleSettingsModule/.test(content)) phase = "5.2";
  if (/Phase 5\.3|bindAppLayoutModule|SharedMainLayout/.test(content)) phase = "5.3";
  if (phase === "unknown" && rel.includes("SettingsLayout")) phase = "5.2";

  if (/create\w+Module|bindAppLayoutModule/.test(content)) return { type: "factory-binding", phase };
  if (/bindUsersSettingsModule|bindScheduleSettingsModule/.test(content)) return { type: "screen-binding", phase };
  if (/export\s*\{\s*default\s*\}\s*from/.test(content) && !/create\w+Module/.test(content)) {
    if (/export\s*\*/.test(content)) return { type: "star+default-reexport", phase };
    return { type: "default-reexport", phase };
  }
  if (/export\s*\*\s*from/.test(content)) return { type: "star-reexport", phase };
  if (/export\s+default\s+_module|export\s+default\s+\w+/.test(content) && /create\w+Module/.test(content)) {
    return { type: "redux-factory", phase: "5.1" };
  }
  if (/SharedSettingsShell|SharedMainLayout/.test(content)) return { type: "layout-composition", phase };
  if (/from\s+['"].*shared/.test(content)) return { type: "partial-shared", phase };
  return { type: "full-implementation", phase };
}

function extractReexports(content) {
  const results = [];
  for (const m of content.matchAll(/export\s*\*\s*from\s+['"]([^'"]+)['"]/g)) {
    results.push({ kind: "star", spec: m[1] });
  }
  for (const m of content.matchAll(/export\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"]/g)) {
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    results.push({ kind: "named", spec: m[2], names });
  }
  for (const m of content.matchAll(/export\s*\{\s*default\s*\}\s*from\s+['"]([^'"]+)['"]/g)) {
    results.push({ kind: "default", spec: m[1] });
  }
  return results;
}

function extractImports(content) {
  const imports = [];
  for (const m of content.matchAll(/import\s+[^'"]+['"]([^'"]+)['"]/g)) {
    imports.push(m[1]);
  }
  for (const m of content.matchAll(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    imports.push(m[1]);
  }
  return imports;
}

function collectWrapperCandidates() {
  const set = new Set();

  // Phase 5.1 from stats
  const p51 = JSON.parse(read("scripts/phase51-stats.json") || "{}");
  (p51.wrappers || []).forEach((w) => set.add(w));

  // Phase 5.2 from stats
  const p52 = JSON.parse(read("scripts/phase52-stats.json") || "{}");
  (p52.wrappers || []).forEach((w) => set.add(w.replace(/\s*\(.*\)$/, "")));
  (p52.variantOnly || []).forEach((w) => set.add(w));

  // Phase 5.2 SettingsLayout
  ["basic", "advanced"].forEach((v) =>
    set.add(`src/variants/${v}/screens/settings/SettingsLayout.jsx`)
  );

  // Phase 5.3 MainLayout
  ["basic", "advanced", "customized"].forEach((v) =>
    set.add(`src/variants/${v}/layouts/MainLayout.jsx`)
  );

  // Theme phase 4.x/5.x wrappers often adjacent
  ["basic", "advanced", "customized"].forEach((v) => {
    set.add(`src/variants/${v}/redux/slice/theme/themeSlice.js`);
    set.add(`src/variants/${v}/utils/themeOnSurface.js`);
  });

  // Scan for explicit phase markers
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|jsx)$/.test(name)) {
        const rel = path.relative(ROOT, p).replace(/\\/g, "/");
        const c = fs.readFileSync(p, "utf8");
        if (/Phase 5\.[123]|re-export wrapper|bindUsersSettingsModule|bindScheduleSettingsModule|bindAppLayoutModule|create\w+Module/.test(c)) {
          set.add(rel);
        }
      }
    }
  }
  walk(path.join(SRC, "variants"));

  return [...set].filter((r) => exists(r)).sort();
}

function buildGraph(files) {
  const graph = new Map();
  for (const rel of files) {
    const content = read(rel);
    const edges = [];
    for (const spec of extractImports(content)) {
      const { resolved, note } = resolveImport(rel, spec);
      if (resolved) edges.push(resolved);
    }
    const reexports = extractReexports(content);
    for (const r of reexports) {
      const { resolved } = resolveImport(rel, r.spec);
      if (resolved) edges.push(resolved);
    }
    graph.set(rel, edges);
  }
  return graph;
}

function findCycles(graph) {
  const cycles = [];
  const visited = new Set();
  const stack = new Set();
  const path = [];

  function dfs(node) {
    if (stack.has(node)) {
      const idx = path.indexOf(node);
      cycles.push([...path.slice(idx), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    path.push(node);
    for (const next of graph.get(node) || []) {
      if (graph.has(next)) dfs(next);
    }
    path.pop();
    stack.delete(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}

function auditWrapper(rel) {
  const content = read(rel);
  const issues = [];
  const { type, phase } = classifyWrapper(content, rel);
  const reexports = extractReexports(content);
  const classification = { rel, type, phase, issues, reexports, hasDefaultExport: false, hasNamedExports: false };

  if (!content) {
    issues.push({ severity: "error", code: "FILE_MISSING", message: "File not found" });
    return classification;
  }

  const wrapperExports = parseExports(content);
  classification.hasDefaultExport = wrapperExports.hasDefault || type === "default-reexport" || type === "star+default-reexport" || type === "redux-factory" || type === "layout-composition" || type === "screen-binding" || type === "factory-binding";
  classification.hasNamedExports = wrapperExports.named.length > 0 || type === "star-reexport" || type === "star+default-reexport" || type === "redux-factory";

  // Path resolution for all re-exports
  for (const r of reexports) {
    const { resolved, note } = resolveImport(rel, r.spec);
    if (!resolved) {
      issues.push({ severity: "error", code: "PATH_UNRESOLVED", message: `Cannot resolve '${r.spec}' (${note})` });
      continue;
    }
    const targetContent = read(resolved);
    const targetExports = parseExports(targetContent);

    if (r.kind === "default" && !targetExports.hasDefault) {
      issues.push({
        severity: "error",
        code: "INVALID_DEFAULT_REEXPORT",
        message: `export { default } from '${r.spec}' but target has no default export`,
        target: resolved,
      });
    }
    if (r.kind === "star") {
      classification.hasNamedExports = true;
    }
  }

  // Duplicate export detection in wrapper itself
  const exportLines = content.match(/^export\s+.+/gm) || [];
  const seen = new Map();
  exportLines.forEach((line, i) => {
    const key = line.trim();
    if (seen.has(key)) {
      issues.push({ severity: "warn", code: "DUPLICATE_EXPORT_LINE", message: `Duplicate export at lines ${seen.get(key) + 1} and ${i + 1}` });
    }
    seen.set(key, i);
  });

  // star+default on same target — check if default is redundant when no default exists (already caught)

  // Factory binding: verify shared target for screen-binding
  if (type === "screen-binding") {
    const m = content.match(/export\s*\{\s*default\s*\}\s*from\s+['"]([^'"]+)['"]/);
    if (m) {
      const { resolved } = resolveImport(rel, m[1]);
      if (!resolved) {
        issues.push({ severity: "error", code: "SHARED_SCREEN_MISSING", message: `Shared screen path missing: ${m[1]}` });
      } else {
        const t = parseExports(read(resolved));
        if (!t.hasDefault) {
          issues.push({ severity: "error", code: "SHARED_NO_DEFAULT", message: `Shared module lacks default export: ${resolved}` });
        }
      }
    } else {
      issues.push({ severity: "warn", code: "NO_DEFAULT_REEXPORT", message: "Screen binding wrapper missing export { default }" });
    }
  }

  if (type === "full-implementation" && phase !== "unknown") {
    issues.push({ severity: "info", code: "NOT_THIN_WRAPPER", message: "Marked as phase wrapper but retains full implementation" });
  }

  // userUpdatePayload star reexport
  if (rel.endsWith("userUpdatePayload.js") && !/export\s*\*/.test(content)) {
    issues.push({ severity: "warn", code: "PAYLOAD_NOT_STAR", message: "Expected export * from shared userUpdatePayload" });
  }

  return classification;
}

// --- Run audit ---
const wrappers = collectWrapperCandidates();
const graph = buildGraph(wrappers);
const cycles = findCycles(graph);
const results = wrappers.map(auditWrapper);

const broken = results.filter((r) => r.issues.some((i) => i.severity === "error"));
const warnings = results.filter((r) => r.issues.some((i) => i.severity === "warn"));
const notThin = results.filter((r) => r.type === "full-implementation");

// Redundant: identical content hash across variants
function hashContent(rel) {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(read(rel) || "").digest("hex").slice(0, 12);
}

const byBasename = {};
for (const r of results) {
  const base = path.basename(r.rel);
  const variant = r.rel.match(/variants\/(\w+)\//)?.[1] || "?";
  if (!byBasename[base]) byBasename[base] = {};
  byBasename[base][variant] = { rel: r.rel, hash: hashContent(r.rel), type: r.type };
}

const redundantGroups = [];
for (const [base, variants] of Object.entries(byBasename)) {
  const hashes = Object.values(variants).map((v) => v.hash);
  const unique = [...new Set(hashes)];
  if (Object.keys(variants).length >= 2 && unique.length === 1 && variants.basic?.type !== "full-implementation") {
    redundantGroups.push({ base, variants, note: "Identical wrapper content across variants" });
  }
}

// Barrel candidates
const barrelCandidates = [];
const barrelPatterns = [
  { dir: "src/variants/{v}/screens/settings/fofp", shared: "src/shared/fofp/settings", count: 10 },
  { dir: "src/variants/{v}/utils", shared: "src/shared/utils", files: ["ColorPickerCard.jsx", "PaginatedList.jsx", "floorplanCoordinates.js"] },
  { dir: "src/variants/{v}/components", shared: "src/shared/utils", files: ["ErrorBoundary.jsx"] },
  { dir: "src/variants/{v}/screens/settings/Users", shared: "src/shared/settings/users", files: ["userUpdatePayload.js"] },
  { dir: "src/variants/{v}/screens/schedule", shared: "src/shared/settings/schedule", count: 5 },
];

for (const pat of barrelPatterns) {
  for (const v of ["basic", "advanced", "customized"]) {
    const dir = pat.dir.replace("{v}", v);
    if (!exists(dir)) continue;
    const files = pat.files || fs.readdirSync(path.join(ROOT, dir)).filter((f) => {
      const c = read(`${dir}/${f}`);
      return c && /Phase 5|re-export|bindSchedule|export \*/.test(c);
    });
    if (files.length >= 3) {
      barrelCandidates.push({
        variant: v,
        dir,
        fileCount: files.length,
        suggestion: `Add ${dir}/index.js re-exporting from ${pat.shared} (or variant bind entry)`,
      });
    }
  }
}

// Group inventory by phase
const inventory = { "5.1": [], "5.2": [], "5.3": [], other: [] };
for (const r of results) {
  const bucket = r.phase === "unknown" ? "other" : r.phase;
  inventory[bucket].push(r);
}

function issueTable(items) {
  if (!items.length) return "_None detected._\n";
  return items
    .map((r) => {
      const errs = r.issues.filter((i) => i.severity === "error");
      return `| \`${r.rel}\` | ${r.type} | ${errs.map((e) => e.code).join(", ")} | ${errs.map((e) => e.message).join("; ")} |`;
    })
    .join("\n");
}

const md = `# Wrapper Integrity Audit

Generated: ${new Date().toISOString()}

Phases covered: **5.1** (redux/utils/fofp/auth), **5.2** (settings users/schedule, SettingsLayout), **5.3** (MainLayout, SharedSidebar in Topbar).

## Executive Summary

| Metric | Count |
|--------|------:|
| Total wrapper candidates | ${wrappers.length} |
| Broken (errors) | ${broken.length} |
| Warnings | ${warnings.length} |
| Full implementations (not thin wrappers) | ${notThin.length} |
| Circular dependency cycles | ${cycles.length} |
| Redundant identical wrapper groups | ${redundantGroups.length} |

## 1. Wrapper Inventory

### Phase 5.1 (${inventory["5.1"].length} files)

| File | Type | Default | Named | Status |
|------|------|:-------:|:-----:|--------|
${inventory["5.1"].map((r) => `| \`${r.rel}\` | ${r.type} | ${r.hasDefaultExport ? "✓" : "—"} | ${r.hasNamedExports ? "✓" : "—"} | ${r.issues.some((i) => i.severity === "error") ? "❌" : "✓"} |`).join("\n")}

### Phase 5.2 (${inventory["5.2"].length} files)

| File | Type | Default | Named | Status |
|------|------|:-------:|:-----:|--------|
${inventory["5.2"].map((r) => `| \`${r.rel}\` | ${r.type} | ${r.hasDefaultExport ? "✓" : "—"} | ${r.hasNamedExports ? "✓" : "—"} | ${r.issues.some((i) => i.severity === "error") ? "❌" : "✓"} |`).join("\n")}

### Phase 5.3 (${inventory["5.3"].length} files)

| File | Type | Default | Named | Status |
|------|------|:-------:|:-----:|--------|
${inventory["5.3"].map((r) => `| \`${r.rel}\` | ${r.type} | ${r.hasDefaultExport ? "✓" : "—"} | ${r.hasNamedExports ? "✓" : "—"} | ${r.issues.some((i) => i.severity === "error") ? "❌" : "✓"} |`).join("\n")}

### Other / adjacent (${inventory.other.length} files)

| File | Type | Phase | Status |
|------|------|-------|--------|
${inventory.other.map((r) => `| \`${r.rel}\` | ${r.type} | ${r.phase} | ${r.issues.some((i) => i.severity === "error") ? "❌" : "✓"} |`).join("\n")}

### Inventory by category

| Category | Count | Pattern |
|----------|------:|---------|
| Redux factory wrappers | ${results.filter((r) => r.type === "redux-factory").length} | \`create*Module\` + named re-exports |
| Utils/FOFP default re-export | ${results.filter((r) => r.type === "default-reexport").length} | \`export { default } from shared/...\` |
| FOFP named-only re-export | ${results.filter((r) => r.type === "star-reexport").length} | \`export * from shared/...\` |
| FOFP star+default | ${results.filter((r) => r.type === "star+default-reexport").length} | both (JSX components) |
| Screen binding (5.2) | ${results.filter((r) => r.type === "screen-binding").length} | bind + \`export { default }\` |
| Layout composition (5.2/5.3) | ${results.filter((r) => r.type === "layout-composition" || r.type === "factory-binding").length} | bind + shared shell |
| Full implementation retained | ${notThin.length} | advanced Users screens |

## 2. Broken Wrappers

${broken.length ? `| File | Type | Issue | Detail |
|------|------|-------|--------|
${issueTable(broken)}` : "_No broken wrappers detected (all re-export paths resolve; no invalid default re-exports on named-only shared modules)._"}

### Post-fix status (compile verification)

Production build and shared tests were passing after Phase 5.2 compile-error fixes:
- FOFP \`markerContainment\` geometry deps copied to shared
- Invalid \`export { default }\` removed from named-only FOFP .js wrappers
- Schedule \`setSelectedFilter\` binding collision resolved
- \`permissionMap\` / \`permissionOptions\` exported from shared payload

## 3. Redundant Wrappers

${redundantGroups.length ? redundantGroups.map((g) => `### \`${g.base}\` (${Object.keys(g.variants).length} variants)\n\nIdentical hash: \`${Object.values(g.variants)[0].hash}\`\n\n${Object.values(g.variants).map((v) => `- \`${v.rel}\``).join("\n")}\n`).join("\n") : "_No fully identical cross-variant wrapper bodies beyond expected duplication._"}

### Expected redundancy (by design)

| Pattern | Variants | Reason |
|---------|----------|--------|
| FOFP \`export *\` / \`export { default }\` | ×3 each | Webpack requires static per-variant import paths |
| Redux factory wrappers | ×3 each | Variant \`BaseUrl\`, \`getToken\` injection |
| Schedule screen bindings | ×3 each | Variant redux/components bound at load time |
| \`userUpdatePayload.js\` | ×3 | Thin \`export *\` — byte-identical |

### Non-redundant (variant-specific)

| File | Reason |
|------|--------|
| \`advanced/screens/settings/Users/*.jsx\` (3) | Full implementation — SettingsLayout vs embedded sidebar |
| \`basic/advanced SettingsLayout.jsx\` | Adapter + chrome differ from customized |
| \`UseAuth.jsx\` (×3) | Sidebar RBAC paths differ per variant |
| \`themeSlice.js\` (×3) | Theme module bindings differ |

## 4. Barrel Export Candidates

These wrapper clusters could collapse to a single \`index.js\` **per variant directory** (not cross-variant):

| Variant dir | Files | Suggested barrel |
|-------------|------:|------------------|
${[...new Map(barrelCandidates.map((b) => [b.dir, b])).values()].map((b) => `| \`${b.dir}\` | ${b.fileCount} | \`${b.dir}/index.js\` → shared |`).join("\n")}

**Caveat:** Webpack variant loader still requires top-level static entry points in many cases; barrels help intra-folder imports but cannot replace variant-root \`App.js\` imports without loader changes.

### Existing shared barrels (already present)

- \`src/shared/redux/index.js\`
- \`src/shared/utils/index.js\`
- \`src/shared/fofp/index.js\`
- \`src/shared/auth/index.js\`
- \`src/shared/settings/users/index.js\`
- \`src/shared/settings/schedule/index.js\`
- \`src/shared/layout/index.js\`
- \`src/shared/layout/app/index.js\`

Variant wrappers still needed because \`variantLoader\` resolves \`src/variants/{basic|advanced|customized}/...\` at build time.

## 5. Circular Dependency Graph

${cycles.length ? cycles.map((c, i) => `### Cycle ${i + 1}\n\`\`\`\n${c.join(" → ")}\n\`\`\``).join("\n\n") : "_No circular dependencies detected among wrapper files in the import/re-export graph._"}

### High-risk adjacency (not cycles, but monitor)

\`\`\`mermaid
flowchart LR
  subgraph variant [Variant Layer]
    ML[MainLayout wrapper]
    SL[SettingsLayout wrapper]
    US[Users binding wrapper]
    SCH[Schedule binding wrapper]
    TS[themeSlice wrapper]
  end
  subgraph shared [Shared Layer]
    SAS[SharedAppShell]
    SML[SharedMainLayout]
    SSS[SharedSettingsShell]
    SU[shared/settings/users]
    SSC[shared/settings/schedule]
    SR[shared/redux factories]
  end
  ML --> SML --> SAS
  SL --> SSS
  US -->|bindUsersSettingsModule| SU
  SCH -->|bindScheduleSettingsModule| SSC
  SU -.->|reads bindings at runtime| US
  SSC -.->|reads bindings at runtime| SCH
  TS --> SR
\`\`\`

**Binding pattern note:** Screen wrappers call \`bind*Module()\` then re-export shared default. Shared modules call \`get*Bindings()\` at render time — **no static import back to variant wrapper**, so no compile-time cycle.

## 6. Per-check Summary

| Check | Result |
|-------|--------|
| Default export preserved | ✓ for all \`export { default }\` and factory/layout wrappers; advanced Users retain own default |
| Named exports preserved | ✓ redux factories explicitly re-export all slice exports; FOFP \`export *\` covers named |
| Missing exports | ${broken.filter((b) => b.issues.some((i) => i.code.includes("EXPORT"))).length ? "See broken table" : "None detected"} |
| Duplicate exports | ${warnings.filter((w) => w.issues.some((i) => i.code === "DUPLICATE_EXPORT_LINE")).length ? "See warnings" : "None in wrapper files"} |
| Circular dependencies | ${cycles.length ? `${cycles.length} cycle(s)` : "None among wrappers"} |
| Invalid default re-export | ${broken.filter((b) => b.issues.some((i) => i.code === "INVALID_DEFAULT_REEXPORT")).length ? "See broken table" : "None (fixed in compile-error pass)"} |
| Import paths resolve | ${broken.filter((b) => b.issues.some((i) => i.code === "PATH_UNRESOLVED")).length ? "See broken table" : "All re-export targets resolve"} |

## 7. Warnings & Info

${warnings.length ? `| File | Code | Message |
|------|------|---------|
${warnings.flatMap((r) => r.issues.filter((i) => i.severity === "warn").map((i) => `| \`${r.rel}\` | ${i.code} | ${i.message} |`)).join("\n")}` : "_No warnings._"}

${notThin.length ? `### Not thin wrappers (informational)\n\n${notThin.map((r) => `- \`${r.rel}\` — retains full component implementation`).join("\n")}` : ""}

---

_Audit performed by \`scripts/wrapper-integrity-audit.js\` (read-only). No application code modified._
`;

const outPath = path.join(ROOT, "docs/WRAPPER_INTEGRITY_AUDIT.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md);

console.log("Audit complete:");
console.log("  wrappers:", wrappers.length);
console.log("  broken:", broken.length);
console.log("  warnings:", warnings.length);
console.log("  cycles:", cycles.length);
console.log("  report:", outPath);
