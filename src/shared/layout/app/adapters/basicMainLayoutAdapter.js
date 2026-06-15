/**
 * Basic variant MainLayout adapter — Phase 5.3
 */

import {
  isDashboardRoute,
  isHeatmapRoute,
  isActivityReportRoute,
  isScheduleRoute,
  isQuickControlsRoute,
  isSettingsMainLayoutRoute,
  isLutronWebsiteRoute,
  normalizeLayoutPathname,
} from "../appLayoutPathUtils";

function getSettingsSectionLabelForBreadcrumb(pathname) {
  if (!pathname || typeof pathname !== "string") return "";
  const p = normalizeLayoutPathname(pathname);
  if (p === "/main") return "Home";
  if (p === "/alerts" || p.startsWith("/alerts/")) return "Alerts";
  if (p === "/email-server" || p.startsWith("/email-server/")) return "Email Server";
  if (p === "/theme-change" || p.startsWith("/theme-change/")) return "Theme";
  if (p === "/users" || p.startsWith("/users/")) return "User Management";
  if (p === "/area-size-load" || p.startsWith("/area-size-load/")) return "Area Size for Energy";
  if (p === "/manage-area-groups" || p.startsWith("/manage-area-groups/")) return "Area Groups";
  if (p === "/rename-widget" || p.startsWith("/rename-widget/")) return "Widgets";
  if (p === "/floor" || p.startsWith("/floor/")) return "Floors";
  if (p === "/processors" || p.startsWith("/processors/")) return "Processors";
  if (p === "/fofp" || p.startsWith("/fofp/")) return "FOFP";
  if (p === "/create-help" || p.startsWith("/create-help/")) return "Help";
  if (p === "/manage-sensors" || p.startsWith("/manage-sensors/")) return "Manage Sensors";
  if (p === "/manage-modules" || p.startsWith("/manage-modules/")) return "Manage Modules";
  return "";
}

export const basicMainLayoutAdapter = {
  variant: "basic",

  getFrameSx(ctx) {
    return {
      width: "100%",
      minHeight: ctx.isDashboard ? "auto" : "calc(100vh - 100px)",
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
    const useWhiteContentShell =
      whiteChrome &&
      (isActivityReport || isSettingsMainLayoutRoute(location.pathname, "basic"));
    const layoutShellBg = useWhiteContentShell ? "#ffffff" : backgroundColor;
    const mainContentPanelBg =
      useWhiteContentShell || whiteChrome ? "#ffffff" : contentColor;
    const showBlueHeaderStripForWhiteTheme =
      whiteChrome &&
      (isScheduleRoute(location.pathname) || isQuickControlsRoute(location.pathname));
    const showSecondaryRibbon =
      isActivityReport ||
      location.pathname === "/get-help" ||
      isSettingsMainLayoutRoute(location.pathname, "basic") ||
      showBlueHeaderStripForWhiteTheme;

    const { getSettingsHomeTabLabelFromSearch, getSettingsUsersActionSuffixFromSearch } =
      breadcrumbUtils;

    const secondaryRibbonBreadcrumbText = (() => {
      if (isActivityReport) return "Activity Report";
      if (
        location.pathname === "/get-help" ||
        location.pathname.startsWith("/get-help/")
      ) {
        return "Help";
      }
      if (isSettingsMainLayoutRoute(location.pathname, "basic")) {
        const section = getSettingsSectionLabelForBreadcrumb(location.pathname);
        let text = section ? `Settings > ${section}` : "Settings";
        if (normalizeLayoutPathname(location.pathname) === "/main") {
          text += ` > ${getSettingsHomeTabLabelFromSearch(location.search)}`;
        }
        if (
          normalizeLayoutPathname(location.pathname) === "/users" ||
          normalizeLayoutPathname(location.pathname).startsWith("/users/")
        ) {
          const usersSuffix = getSettingsUsersActionSuffixFromSearch(location.search);
          if (usersSuffix) text += ` > ${usersSuffix}`;
        }
        return text;
      }
      if (isScheduleRoute(location.pathname)) return "Schedule";
      if (isQuickControlsRoute(location.pathname)) return "Quick Control";
      return "";
    })();

    const secondaryRibbonBreadcrumbRestDisplay = secondaryRibbonBreadcrumbText
      ? secondaryRibbonBreadcrumbText.replace(/ > /g, " › ")
      : "";

    return {
      isDashboard,
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
      isLutronWebsite: isLutronWebsiteRoute(location.pathname),
    };
  },

  getContentPaddingTop(ctx) {
    return ctx.showSecondaryRibbon && !ctx.isHeatmap
      ? { xs: "84px", sm: "84px", md: "86px", lg: "86px" }
      : "50px";
  },

  shouldBypassContentPanel(ctx) {
    return ctx.isDashboard;
  },

  useDashboardRouteClass(ctx) {
    return ctx.isDashboard;
  },
};

export default basicMainLayoutAdapter;
