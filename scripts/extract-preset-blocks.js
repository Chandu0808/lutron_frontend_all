const fs = require("fs");
const path = require("path");

const themeContextPath = path.join(
  __dirname,
  "../src/variants/advanced/screens/settings/theme/ThemeContext.jsx"
);
const lines = fs.readFileSync(themeContextPath, "utf8").split(/\r?\n/);

function sliceLines(start, end) {
  return lines.slice(start - 1, end).join("\n");
}

const blocks = {
  goldMain: sliceLines(130, 303),
  goldClassNav: sliceLines(304, 309),
  goldHeatmap: sliceLines(574, 623),
  theme4Nav: sliceLines(371, 382),
  theme4Surface: sliceLines(625, 788),
  defaultSlateSurface: sliceLines(408, 569),
  defaultNavFixedElse: sliceLines(384, 392),
  defaultNavNone: sliceLines(395, 403),
  defaultHeatmap: sliceLines(793, 814),
};

fs.writeFileSync(
  path.join(__dirname, "_preset-blocks.json"),
  JSON.stringify(blocks, null, 2)
);
console.log("Block lengths:", Object.fromEntries(
  Object.entries(blocks).map(([k, v]) => [k, v.split("\n").length])
));
