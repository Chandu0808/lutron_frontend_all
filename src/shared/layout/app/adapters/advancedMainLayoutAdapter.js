/**
 * Advanced variant MainLayout adapter — Phase 5.3
 */

import {
  isDashboardRoute,
  isHeatmapRoute,
  isLutronWebsiteRoute,
} from "../appLayoutPathUtils";

export const advancedMainLayoutAdapter = {
  variant: "advanced",

  getFrameSx(ctx) {
    return {
      width: "100%",
      minHeight: "calc(100vh - 100px)",
      background: `var(--app-page-background, ${ctx.pageBackground})`,
      backgroundImage: "var(--app-background-image, none)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
    };
  },

  getContainerPx() {
    return {
      xs: 2,
      sm: 3,
      md: 4,
      lg: 5,
      xl: 6,
      xxl: 8,
      "3xl": 10,
      "4xl": 12,
    };
  },

  buildContext({ location, appTheme, themeUtils }) {
    const { buildAppPageBackground } = themeUtils;
    const bgColor = appTheme?.application_theme?.background || "#6f809d";
    const pageBackground = buildAppPageBackground(bgColor);
    const isDashboard = isDashboardRoute(location.pathname);
    const isLutronWebsite = isLutronWebsiteRoute(location.pathname);

    return {
      isDashboard,
      pageBackground,
      contentColor: appTheme?.application_theme?.content || "#3d4a5c",
      isHeatmap: isHeatmapRoute(location.pathname),
      isLutronWebsite,
      showSecondaryRibbon: false,
      useFixedContentViewport: false,
      mainContentPanelBg: "transparent",
    };
  },

  getContentPaddingTop() {
    return {
      xs: "78px",
      sm: "80px",
      md: "82px",
      lg: "84px",
      xl: "86px",
      xxl: "88px",
      "3xl": "90px",
      "4xl": "92px",
    };
  },

  shouldBypassContentPanel(ctx) {
    return ctx.isDashboard;
  },

  useDashboardRouteClass() {
    return false;
  },

  getContentPanelClassName() {
    return "main-layout-page-shell";
  },

  getContentPanelSx({ ctx, location, contentPanelRadius }) {
    const isLutronWebsite = ctx.isLutronWebsite;
    const pathname = location.pathname;
    return {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
      mx: "auto",
      backgroundColor: ctx.mainContentPanelBg,
      borderRadius: contentPanelRadius,
      flexGrow: 1,
      overflowY:
        isLutronWebsite || pathname.includes("/settings") || pathname === "/heatmap"
          ? "hidden"
          : "auto",
      overflowX: "hidden",
      height:
        isLutronWebsite || pathname.includes("/settings") || pathname === "/heatmap"
          ? { xs: "auto", md: "calc(100vh - 200px)" }
          : "auto",
      maxHeight:
        isLutronWebsite || pathname.includes("/settings") || pathname === "/heatmap"
          ? { xs: "none", md: "calc(100vh - 200px)" }
          : "none",
      minHeight:
        pathname === "/dashboard"
          ? { xs: "calc(100vh - 80px)", md: "calc(100vh - 50px)" }
          : isLutronWebsite
            ? { xs: "auto", md: "calc(100vh - 200px)" }
            : pathname === "/heatmap"
              ? { xs: "calc(100vh - 140px)", md: "calc(100vh - 180px)" }
              : { xs: "auto", md: "calc(100vh - 120px)" },
      mb:
        pathname === "/dashboard" || pathname === "/lutron"
          ? { xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 4, "3xl": 5, "4xl": 6 }
          : 0,
      p:
        pathname === "/dashboard"
          ? { xs: 2, sm: 2, md: 3, lg: 3, xl: 4, xxl: 5, "3xl": 6, "4xl": 7 }
          : pathname === "/lutron"
            ? { xs: 1, sm: 1.5, md: 2, lg: 2, xl: 2.5, xxl: 3, "3xl": 3.5, "4xl": 4 }
            : pathname === "/schedule"
              ? { xs: 2, sm: 2, md: 3, lg: 3, xl: 4, xxl: 5, "3xl": 6, "4xl": 7 }
              : 0,
    };
  },
};

export default advancedMainLayoutAdapter;
