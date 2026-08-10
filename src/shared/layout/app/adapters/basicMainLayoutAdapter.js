/**
 * Basic variant MainLayout adapter — Phase 5.3
 */

import {
  isDashboardRoute,
  isHeatmapRoute,
  isActivityReportRoute,
  isScheduleRoute,
  isQuickControlsRoute,
  isLutronWebsiteRoute,
  normalizeLayoutPathname,
} from "../appLayoutPathUtils";
import {
  BASIC_SETTINGS_HOME_PATH,
  BASIC_SETTINGS_SIDEBAR_PATHS,
  getBasicSettingsSectionLabel,
  isBasicAreaGroupSettingsChildRoute,
  isBasicMaintenanceRoute,
  isBasicSettingsAppRoute,
} from "../../../../variants/basic/utils/basicSettingsPaths";

export const basicMainLayoutAdapter = {
  variant: "basic",

  getFrameSx(ctx) {
    const useNaturalHeight = ctx.isDashboard || ctx.isSettingsLayout;
    return {
      width: "100%",
      minHeight: useNaturalHeight ? "auto" : "calc(100vh - 100px)",
      backgroundColor: ctx.layoutShellBg,
      backgroundImage: "var(--app-background-image, none)",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      pb: "22px",
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

  buildContext({
    location,
    appTheme,
    themeUtils,
    breadcrumbUtils,
    clientData,
    projectData,
  }) {
    const { DEFAULT_APP_BACKGROUND, DEFAULT_APP_CONTENT, isWhiteAreaPickerChrome } =
      themeUtils;
    const backgroundColor =
      appTheme?.application_theme?.background || DEFAULT_APP_BACKGROUND;
    const contentColor =
      appTheme?.application_theme?.content || DEFAULT_APP_CONTENT;
    const whiteChrome = isWhiteAreaPickerChrome(contentColor);
    const isActivityReport = isActivityReportRoute(location.pathname);
    const isDashboard = isDashboardRoute(location.pathname);
    const isSettingsLayout = isBasicSettingsAppRoute(
      location.pathname,
      BASIC_SETTINGS_HOME_PATH
    );
    // Area Groups create/edit are Settings chrome even if path is root-level.
    const isAreaGroupSettingsChild = isBasicAreaGroupSettingsChildRoute(
      location.pathname
    );
    const useWhiteContentShell =
      whiteChrome &&
      (isActivityReport || isSettingsLayout);
    // Default / light content theme: always use white page shell (Energy, Heatmap,
    // Settings, etc.). Prevents a stale gold application_theme.background from
    // painting beige behind white content panels.
    const layoutShellBg = whiteChrome ? "#ffffff" : backgroundColor;
    const mainContentPanelBg =
      useWhiteContentShell || whiteChrome ? "#ffffff" : contentColor;
    const showBlueHeaderStripForWhiteTheme =
      whiteChrome &&
      (isScheduleRoute(location.pathname) || isQuickControlsRoute(location.pathname));
    const isBasicMaintenanceRouteActive = isBasicMaintenanceRoute(location.pathname);
    const isLutronWebsite = isLutronWebsiteRoute(location.pathname);
    const showSecondaryRibbon =
      isActivityReport ||
      location.pathname === "/get-help" ||
      location.pathname.startsWith("/get-help/") ||
      isBasicMaintenanceRouteActive ||
      isSettingsLayout ||
      isAreaGroupSettingsChild ||
      isLutronWebsite ||
      showBlueHeaderStripForWhiteTheme;

    const { getSettingsUsersActionSuffixFromSearch } = breadcrumbUtils;

    const secondaryRibbonBreadcrumbText = (() => {
      if (isLutronWebsite) return "Home";
      if (isBasicMaintenanceRouteActive) return "Settings > Maintenance";
      if (isActivityReport) return "Activity Report";
      if (
        location.pathname === "/get-help" ||
        location.pathname.startsWith("/get-help/")
      ) {
        return "Help";
      }
      if (isScheduleRoute(location.pathname)) return "Schedule";
      if (isQuickControlsRoute(location.pathname)) return "Quick Control";
      if (isSettingsLayout || isAreaGroupSettingsChild) {
        const section = getBasicSettingsSectionLabel(location.pathname);
        let text = section ? `Settings > ${section}` : "Settings";
        if (
          normalizeLayoutPathname(location.pathname) === BASIC_SETTINGS_SIDEBAR_PATHS.Users ||
          normalizeLayoutPathname(location.pathname).startsWith(
            `${BASIC_SETTINGS_SIDEBAR_PATHS.Users}/`
          )
        ) {
          const usersSuffix = getSettingsUsersActionSuffixFromSearch(location.search);
          if (usersSuffix) text += ` > ${usersSuffix}`;
        }
        return text;
      }
      return "";
    })();

    const secondaryRibbonBreadcrumbRestDisplay = secondaryRibbonBreadcrumbText
      ? secondaryRibbonBreadcrumbText.replace(/ > /g, " › ")
      : "";

    return {
      isDashboard,
      isSettingsLayout,
      layoutShellBg,
      mainContentPanelBg,
      whiteChrome,
      showSecondaryRibbon,
      secondaryRibbonBreadcrumbText,
      secondaryRibbonBreadcrumbRestDisplay,
      showScheduleHeaderDropdown:
        whiteChrome && isScheduleRoute(location.pathname),
      useFixedContentViewport:
        location.pathname === "/lutronwebsite-page" || isHeatmapRoute(location.pathname),
      isHeatmap: isHeatmapRoute(location.pathname),
      isLutronWebsite,
    };
  },

  getContentPaddingTop(ctx) {
    return ctx.showSecondaryRibbon && !ctx.isHeatmap
      ? { xs: "98px", sm: "98px", md: "98px", lg: "98px" }
      : "50px";
  },

  shouldBypassContentPanel(ctx) {
    return ctx.isDashboard;
  },

  useDashboardRouteClass(ctx) {
    return ctx.isDashboard;
  },

  getContentPanelSx({ ctx, location, contentPanelRadius }) {
    const pathname = location.pathname;

    if (ctx.isSettingsLayout) {
      return {
        width: "100%",
        mx: "auto",
        backgroundColor: ctx.mainContentPanelBg,
        borderRadius: contentPanelRadius,
        flexGrow: 0,
        overflowY: "visible",
        overflowX: "hidden",
        height: "auto",
        maxHeight: "none",
        minHeight: "auto",
        mb: 0,
        p: 0,
      };
    }

    return {
      width: "100%",
      mx: "auto",
      backgroundColor: ctx.mainContentPanelBg,
      borderRadius: contentPanelRadius,
      flexGrow: 1,
      overflowY: ctx.useFixedContentViewport ? "hidden" : "auto",
      overflowX: "hidden",
      height: ctx.useFixedContentViewport ? "calc(100vh - 187px)" : "auto",
      maxHeight: ctx.useFixedContentViewport ? "calc(100vh - 187px)" : "none",
      minHeight:
        pathname === "/dashboard"
          ? "calc(100vh - 50px)"
          : pathname === "/lutronwebsite-page"
            ? "calc(100vh - 187px)"
            : pathname === "/heatmap"
              ? "calc(100vh - 167px)"
              : pathname === "/lutron"
                ? "calc(100vh - 141px)"
                : "calc(100vh - 107px)",
      mb:
        pathname === "/dashboard" || pathname === "/lutron"
          ? { xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 4, "3xl": 5, "4xl": 6 }
          : 0,
      p:
        pathname === "/dashboard" || pathname === "/lutron" || pathname === "/schedule"
          ? { xs: 2, sm: 2, md: 3, lg: 3, xl: 4, xxl: 5, "3xl": 6, "4xl": 7 }
          : 0,
    };
  },
};

export default basicMainLayoutAdapter;
