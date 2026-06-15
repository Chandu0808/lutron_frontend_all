const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../src/variants/advanced/screens/settings/theme/ThemeContext.jsx"
);
const content = fs.readFileSync(filePath, "utf8");
const startMarker = '  root.style.setProperty(\n    "--app-background-image",';
const endMarker = "\n};\n\nconst createAppTheme";

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);
if (startIdx === -1 || endIdx === -1) {
  console.error("Markers not found", { startIdx, endIdx });
  process.exit(1);
}

const orchestrator = `  root.style.setProperty(
    "--app-background-image",
    customImageUrl ? \`url(\${customImageUrl})\` : "none"
  );

  const fixedGradientPageTheme = getFixedGradientPageTheme(background);
  const isGoldTheme = usesGoldPageTheme(background);
  const isTheme3Page = fixedGradientPageTheme?.id === "theme3";
  const isTheme4Page = fixedGradientPageTheme?.id === "theme4";
  const isCustomTheme = usesCustomApplicationTheme(background);
  const dashboardCardBackground = isGoldTheme
    ? GOLD_THEME_SURFACE_GRADIENT
    : isTheme4Page
      ? THEME_4_TAB_PILL_GRADIENT
      : isTheme3Page
        ? THEME_3_TAB_PILL_GRADIENT
        : isCustomTheme
          ? null
          : "linear-gradient(180deg, #2a3445 0%, #1c2330 100%)";
  if (dashboardCardBackground) {
    root.style.setProperty("--dashboard-card-background", dashboardCardBackground);
  }

  const presetContext = {
    background,
    content,
    button,
    buttonStyle,
    customImageUrl,
    fixedGradientPageTheme,
    isTheme4Page,
  };

  if (isGoldTheme) {
    applyGoldPreset(root, { ...presetContext, stage: "main" });
    applyGoldPremiumThemeTokens(root);
    applyGoldPreset(root, { ...presetContext, stage: "heatmap" });
  } else {
    clearPremiumThemeTokens(root);
    document.documentElement.classList.remove(
      "gold-theme",
      "theme-3-page",
      "theme-4-page",
      "custom-theme"
    );

    if (isCustomTheme) {
      applyDynamicThemeTokens(root, {
        background,
        content,
        button,
        buttonStyle,
        customImageUrl,
      });
    } else if (fixedGradientPageTheme) {
      document.documentElement.classList.add(fixedGradientPageTheme.className);
      root.style.setProperty("--app-page-background", fixedGradientPageTheme.gradient);
      root.style.setProperty("--footer-background", fixedGradientPageTheme.gradient);
      root.style.setProperty(
        "--footer-background-color",
        fixedGradientPageTheme.anchor
      );
      root.style.removeProperty("--footer-background-image");
      if (isTheme3Page) {
        root.style.setProperty(
          "--settings-theme-pill-active-bg",
          THEME_3_TAB_PILL_GRADIENT
        );
        root.style.setProperty("--settings-theme-pill-active-text", "#ffffff");
        root.style.setProperty(
          "--settings-theme-pill-inactive-border",
          "#C5CDD8"
        );
        root.style.setProperty(
          "--settings-theme-action-button-bg",
          THEME_3_TAB_PILL_GRADIENT
        );
        root.style.setProperty(
          "--settings-theme-action-button-text",
          "#ffffff"
        );
        root.style.setProperty(
          "--settings-sidebar-active-bg",
          THEME_3_TAB_PILL_GRADIENT
        );
        root.style.setProperty("--settings-panel-border", "#C5CDD8");
        root.style.setProperty("--settings-panel-text", "#1a2a42");
        root.style.setProperty("--app-page-text", THEME_3_LIGHT_SURFACE_TEXT);
        root.style.setProperty("--app-page-muted-text", "rgba(26, 42, 66, 0.72)");
        root.style.setProperty("--dashboard-select-field-text", THEME_3_LIGHT_SURFACE_TEXT);
        root.style.setProperty("--quick-control-page-text", THEME_3_LIGHT_SURFACE_TEXT);
        root.style.removeProperty("--topbar-navbar-background");
        root.style.setProperty("--topbar-nav-pill-bg", "rgba(244, 246, 249, 0.95)");
        root.style.setProperty("--topbar-nav-active-text", "#1a2a42");
        root.style.setProperty("--topbar-nav-inactive-text", "#ffffff");
        root.style.setProperty("--topbar-profile-menu-bg", THEME_3_LIGHT_PANEL_BG);
        root.style.setProperty("--topbar-profile-menu-text", THEME_3_LIGHT_SURFACE_TEXT);
        root.style.setProperty("--topbar-profile-menu-border", "#C5CDD8");
        root.style.setProperty("--topbar-profile-menu-hover-bg", THEME_3_LIGHT_SECTION_BG);
        root.style.setProperty("--topbar-profile-menu-icon", "rgba(26, 42, 66, 0.72)");
        applyTheme3PremiumThemeTokens(root);
      } else if (isTheme4Page) {
        applyTheme4Preset(root, { stage: "navigation" });
      } else {
        applyDefaultSlatePreset(root, {
          ...presetContext,
          stage: "navigation-fixed-fallback",
        });
      }
    } else {
      applyDefaultSlatePreset(root, {
        ...presetContext,
        stage: "navigation-none",
      });
    }

    if (!isCustomTheme) {
      applyDefaultSlatePreset(root, { ...presetContext, stage: "surface" });
    }

    if (isTheme4Page) {
      applyTheme4Preset(root, { stage: "surface" });
      applyTheme4PremiumThemeTokens(root);
    } else if (isTheme3Page) {
      applyTheme3HeatmapChrome(root);
    } else if (!isCustomTheme) {
      applyDefaultSlatePreset(root, { ...presetContext, stage: "heatmap" });
    }
  }

  if (isTheme3Page) {
    applyTheme3PageChrome(root);
  }

  root.style.setProperty(
    "--topbar-navbar-background",
    resolveApplicationNavbarBackground(background, content, button)
  );

  applyDashboardChartChrome(root, {
    isGoldTheme,
    isTheme3Page,
    isTheme4Page,
    isCustomTheme,
  });
`;

const head = content.slice(0, startIdx);
const tail = content.slice(endIdx);
const next = head + orchestrator + tail;
fs.writeFileSync(filePath, next);
console.log("ThemeContext applyCssVariables replaced");
