const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../src/variants");
const VARIANTS = ["basic", "advanced", "customized"];
const FOLDERS = ["screens", "components", "redux", "utils", "customhooks", "layouts", "config", "styles"];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function relFromVariant(variant, absPath) {
  return path.relative(path.join(ROOT, variant), absPath).replace(/\\/g, "/");
}

function hashContent(content) {
  let h = 0;
  for (let i = 0; i < content.length; i++) {
    h = (Math.imul(31, h) + content.charCodeAt(i)) | 0;
  }
  return h;
}

function normalizeForCompare(content) {
  return content
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a, b) {
  if (a === b) return 100;
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (na === nb) return 99;
  if (na.length === 0 && nb.length === 0) return 100;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length / longer.length > 0.85) {
    return Math.round((shorter.length / longer.length) * 95);
  }
  const aLines = new Set(na.split(" ").filter(Boolean));
  const bLines = new Set(nb.split(" ").filter(Boolean));
  let inter = 0;
  for (const t of aLines) if (bLines.has(t)) inter++;
  const union = aLines.size + bLines.size - inter;
  return union === 0 ? 0 : Math.round((inter / union) * 100);
}

const variantFiles = {};
for (const v of VARIANTS) {
  variantFiles[v] = {};
  for (const folder of FOLDERS) {
    const dir = path.join(ROOT, v, folder);
    variantFiles[v][folder] = walk(dir).map((f) => ({
      rel: relFromVariant(v, f),
      abs: f,
      content: fs.readFileSync(f, "utf8"),
    }));
  }
}

const report = { folders: {}, triplicate: [], pairwise: {} };

for (const folder of FOLDERS) {
  const sets = {};
  for (const v of VARIANTS) {
    for (const f of variantFiles[v][folder] || []) {
      const base = f.rel.split("/").pop();
      if (!sets[base]) sets[base] = {};
      sets[base][v] = f;
    }
  }

  const counts = {
    basic: (variantFiles.basic[folder] || []).length,
    advanced: (variantFiles.advanced[folder] || []).length,
    customized: (variantFiles.customized[folder] || []).length,
  };

  const inAll3 = [];
  const in2 = [];
  const variantOnly = { basic: [], advanced: [], customized: [] };

  for (const [base, byVariant] of Object.entries(sets)) {
    const present = VARIANTS.filter((v) => byVariant[v]);
    if (present.length === 3) {
      const sBA = similarity(byVariant.basic.content, byVariant.advanced.content);
      const sBC = similarity(byVariant.basic.content, byVariant.customized.content);
      const sAC = similarity(byVariant.advanced.content, byVariant.customized.content);
      const avgSim = Math.round((sBA + sBC + sAC) / 3);
      const exact = sBA === 100 && sBC === 100 && sAC === 100;
      inAll3.push({ file: base, rel: byVariant.basic.rel, avgSim, exact, sBA, sBC, sAC });
    } else if (present.length === 2) {
      const [a, b] = present;
      in2.push({
        file: base,
        variants: present,
        sim: similarity(byVariant[a].content, byVariant[b].content),
      });
    } else {
      variantOnly[present[0]].push(base);
    }
  }

  report.folders[folder] = { counts, inAll3, in2, variantOnly };
}

// Summary stats
let totalTri = 0;
let exactTri = 0;
let highSimTri = 0;
for (const folder of FOLDERS) {
  const d = report.folders[folder];
  totalTri += d.inAll3.length;
  exactTri += d.inAll3.filter((x) => x.exact).length;
  highSimTri += d.inAll3.filter((x) => x.avgSim >= 90).length;
}

console.log(JSON.stringify({ summary: { totalTri, exactTri, highSimTri }, folders: report.folders }, null, 2));
