const fs = require("fs");
const path = require("path");

const blocks = JSON.parse(
  fs.readFileSync(path.join(__dirname, "_preset-blocks.json"), "utf8")
);

const presetsDir = path.join(__dirname, "../src/shared/theme/registry/presets");

function dedent(text) {
  const lines = text.split("\n");
  const indents = lines
    .filter((line) => line.trim().length > 0)
    .map((line) => line.match(/^(\s*)/)[1].length);
  const min = Math.min(...indents);
  return lines.map((line) => (line.length ? line.slice(min) : line)).join("\n");
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return dedent(text)
    .split("\n")
    .map((line) => (line.length ? pad + line : line))
    .join("\n");
}

function extractVarNames(text) {
  const vars = new Set();
  const re = /setProperty\s*\(\s*["']--([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) vars.add(m[1]);
  return [...vars].sort();
}

const defaultSurface = dedent(blocks.defaultSlateSurface).replace(
  /if \(fixedGradientPageTheme\?\.id === "theme4"\)/g,
  "if (isTheme4Page)"
);

const goldJs = `import { lighten } from "@mui/material/styles";
import {
  GOLD_THEME_BUTTON_SOLID,
  GOLD_THEME_LIGHT_PANEL_BG,
  GOLD_THEME_LIGHT_SECTION_BG,
  GOLD_THEME_LIGHT_SURFACE_TEXT,
  GOLD_THEME_SURFACE_GRADIENT,
  GOLD_THEME_TAB_INDICATOR_BG,
} from "../../../../variants/advanced/config/themeConstants";
import { applySettingsSidebarTypographyVars } from "../settingsSidebarTabStyles";

/**
 * Gold preset CSS variables (Phase 4.3B extraction from ThemeContext).
 * @param {HTMLElement} root
 * @param {{ background: string, buttonStyle: { solid: string } }} context
 */
export function applyGoldPreset(root, context) {
  const { background, buttonStyle, stage = "main" } = context;

  if (stage === "heatmap") {
${indent(blocks.goldHeatmap, 4)}
    return;
  }

${indent(blocks.goldMain, 2)}

${indent(blocks.goldClassNav, 2)}
}

/** @returns {string[]} variable names set by applyGoldPreset */
export function getGoldPresetVariableNames() {
  return [
${extractVarNames(
  blocks.goldMain + blocks.goldClassNav + blocks.goldHeatmap
)
  .map((v) => `    "${v}"`)
  .join(",\n")}
  ];
}
`;

const theme4Js = `import {
  THEME_4_BUTTON_SOLID,
  THEME_4_LIGHT_PANEL_BG,
  THEME_4_LIGHT_SECTION_BG,
  THEME_4_LIGHT_SURFACE_TEXT,
  THEME_4_NAVBAR_GRADIENT,
  THEME_4_TAB_PILL_GRADIENT,
} from "../../../../variants/advanced/config/themeConstants";
import { applySettingsSidebarTypographyVars } from "../settingsSidebarTabStyles";

/**
 * Theme 4 preset CSS variables.
 * @param {HTMLElement} root
 * @param {{ stage?: 'navigation' | 'surface' }} context
 */
export function applyTheme4Preset(root, context = {}) {
  const { stage = "surface" } = context;

  if (stage === "navigation") {
${indent(blocks.theme4Nav, 4)}
    return;
  }

${indent(blocks.theme4Surface, 2)}
}

/** @returns {string[]} */
export function getTheme4PresetVariableNames() {
  return [
${extractVarNames(blocks.theme4Nav + blocks.theme4Surface)
  .map((v) => `    "${v}"`)
  .join(",\n")}
  ];
}
`;

const defaultSlateJs = `import { THEME_3_LIGHT_SURFACE_TEXT } from "../../../../variants/advanced/config/themeConstants";

/**
 * Default slate preset CSS variables (non-gold, non-custom shared surface).
 * @param {HTMLElement} root
 * @param {{
 *   stage?: 'navigation-fixed-fallback' | 'navigation-none' | 'surface' | 'heatmap',
 *   fixedGradientPageTheme?: { id?: string } | null,
 *   isTheme4Page?: boolean,
 *   customImageUrl?: string | null,
 * }} context
 */
export function applyDefaultSlatePreset(root, context = {}) {
  const {
    stage = "surface",
    fixedGradientPageTheme = null,
    isTheme4Page = false,
    customImageUrl = null,
  } = context;

  if (stage === "navigation-fixed-fallback") {
${indent(blocks.defaultNavFixedElse, 4)}
    return;
  }

  if (stage === "navigation-none") {
${indent(blocks.defaultNavNone, 4)}
    return;
  }

  if (stage === "heatmap") {
${indent(blocks.defaultHeatmap, 4)}
    return;
  }

${indent(defaultSurface, 2)}
}

/** @returns {string[]} */
export function getDefaultSlatePresetVariableNames() {
  return [
${extractVarNames(
  blocks.defaultNavFixedElse +
    blocks.defaultNavNone +
    defaultSurface +
    blocks.defaultHeatmap
)
  .map((v) => `    "${v}"`)
  .join(",\n")}
  ];
}
`;

if (!fs.existsSync(presetsDir)) fs.mkdirSync(presetsDir, { recursive: true });
fs.writeFileSync(path.join(presetsDir, "gold.js"), goldJs);
fs.writeFileSync(path.join(presetsDir, "theme4.js"), theme4Js);
fs.writeFileSync(path.join(presetsDir, "defaultSlate.js"), defaultSlateJs);
console.log("Wrote preset modules");
