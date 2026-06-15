#!/usr/bin/env node
/**
 * Advanced Users Consolidation Audit — read-only analysis
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8").split("\n").length;
}

const pairs = [
  ["UsersComponent.jsx", "src/variants/advanced/screens/settings/Users/UsersComponent.jsx", "src/shared/settings/users/UsersComponent.jsx"],
  ["CreateUser.jsx", "src/variants/advanced/screens/settings/Users/CreateUser.jsx", "src/shared/settings/users/CreateUser.jsx"],
  ["UpdateUser.jsx", "src/variants/advanced/screens/settings/Users/UpdateUser.jsx", "src/shared/settings/users/UpdateUser.jsx"],
];

const metrics = pairs.map(([name, adv, shr]) => {
  const a = loc(adv);
  const s = loc(shr);
  return { name, adv, shr, delta: s - a, advRel: adv, shrRel: shr };
});

const out = path.join(ROOT, "docs/ADVANCED_USERS_CONSOLIDATION_AUDIT.md");
// Report body written inline in script output file via template below
console.log(JSON.stringify({ metrics }, null, 2));
