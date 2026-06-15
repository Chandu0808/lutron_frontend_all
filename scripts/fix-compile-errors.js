#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

for (const v of ["basic", "advanced", "customized"]) {
  const dir = path.join(ROOT, "src/variants", v, "screens/schedule");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".jsx")) continue;
    const p = path.join(dir, f);
    let s = fs.readFileSync(p, "utf8");
    if (!s.includes("Phase 5.2")) continue;
    s = s.replace(
      /from '\.\.\/\.\.\/utils\/fixedActionBarStyles'/g,
      "from '../../../../utils/fixedActionBarStyles'"
    );
    s = s.replace(
      /from '\.\.\/\.\.\/utils\/scheduleActionPriority'/g,
      "from '../../../../utils/scheduleActionPriority'"
    );
    fs.writeFileSync(p, s);
  }
}

for (const v of ["basic", "advanced", "customized"]) {
  const dir = path.join(ROOT, "src/variants", v, "screens/settings/fofp");
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".js")) continue;
    const p = path.join(dir, f);
    let s = fs.readFileSync(p, "utf8");
    s = s.replace(/\nexport \{ default \} from [^\n]+;\n?/g, "\n");
    fs.writeFileSync(p, s);
  }
}

console.log("fix-compile-errors.js complete");
