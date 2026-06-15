// src/components/TopbarComponent.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  CircularProgress,
  useMediaQuery,
  Avatar,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import LockResetIcon from "@mui/icons-material/LockReset";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchProfile,
  logout,
  selectProfile,
  selectProfileLoading,
  selectLogoutLoading,
  getValidToken,
} from "../redux/slice/auth/userlogin";
import {
  getLutronDataClient,
  getLutronDataProject,
  homeDataClient,
  homeDataProject,
} from "../redux/slice/home/homeSlice";
import {
  readDashboardWidgetVisibilityRaw,
  restoreDashboardWidgetVisibilityAfterStorageClear,
} from "../utils/dashboardWidgetVisibility";
import {
  readCustomOverviewWidgetsRaw,
  restoreCustomOverviewWidgetsAfterStorageClear,
} from "../utils/customOverviewWidgets";
import {
  readDashboardChartLayoutSnapshotForLogout,
  restoreDashboardChartLayoutAfterLocalStorageClear,
  readDashboardDraggableSessionSnapshotForLogout,
  restoreDashboardDraggableSessionAfterClear,
} from "../utils/dashboardChartLayoutStorage";
import {
  readUiVariantRaw,
  restoreUiVariantAfterStorageClear,
} from "../../../utils/uiVariant";
import { getSettingsHomeTabLabelFromSearch } from "../utils/settingsHomeTabParams";
import { getSettingsUsersActionSuffixFromSearch } from "../utils/settingsUsersBreadcrumbParams";
import { DEFAULT_APP_CONTENT, isWhiteAreaPickerChrome } from "../utils/themeOnSurface";
import {
  getRovingTabIndex,
  handleRovingTablistKeyDown,
} from "../../../utils/keyboard/rovingTablistKeyboard";
import {
  focusPageSubNav,
  registerTopbarNavFocusHandler,
  requestSettingsSidebarFocus,
} from "../../../utils/keyboard/pageSubNavBridge";
import { isKeyboardNavBlockedTarget } from "../../../utils/keyboard/keyboardNavUtils";
import { isSettingsAppRoute, isTopbarNavItemActive } from "../../../utils/keyboard/topbarNavActive";
import SharedSidebar from "../../../shared/layout/app/SharedSidebar";
import { useSidebarDrawer } from "../../../shared/layout/app/useSidebarDrawer";

export default function TopbarComponent() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const profile = useSelector(selectProfile);
  const profileLoading = useSelector(selectProfileLoading);
  const logoutLoading = useSelector(selectLogoutLoading);
  const clientData = useSelector(homeDataClient);
  const projectData = useSelector(homeDataProject);
  // Safe access: some tests mount this component without the theme slice
  const applicationTheme = useSelector((state) => state?.theme?.applicationTheme);
  const contentColor = applicationTheme?.application_theme?.content || DEFAULT_APP_CONTENT;
  const isDefaultWhiteTheme = isWhiteAreaPickerChrome(contentColor);

  const logoUrl = clientData?.logo_image?.startsWith("http")
    ? clientData.logo_image
    : process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL + clientData.logo_image
      : clientData.logo_image;

  useEffect(() => {
    setClientLogoBroken(false);
  }, [logoUrl]);

  useEffect(() => {
    // Don't fetch profile if logout is in progress or if there's no valid token
    const validToken = getValidToken();
    if (!profile && !profileLoading && !logoutLoading && validToken) {
      dispatch(fetchProfile());
    }
  }, [dispatch, profile, profileLoading, logoutLoading]);


  useEffect(() => {
    // Only call this if user is authenticated and we don't have client data yet
    // Don't fetch during logout process
    const validToken = getValidToken();
    if (validToken && profile && !clientData?.name && !logoutLoading) {
      // Only fetch if we haven't tried recently (prevent multiple failed calls)
      const lastFetchTime = sessionStorage.getItem('clientDataFetchTime');
      const now = Date.now();
      if (!lastFetchTime || (now - parseInt(lastFetchTime)) > 60000) { // Only retry after 1 minute
        sessionStorage.setItem('clientDataFetchTime', now.toString());
        dispatch(getLutronDataClient()).catch(() => {
          // Silently handle errors - endpoint might not be available
        });
      }
    }
  }, [dispatch, profile, clientData?.name, logoutLoading]);

  useEffect(() => {
    const validToken = getValidToken();
    if (validToken && profile && !projectData?.name && !logoutLoading) {
      const lastFetchTime = sessionStorage.getItem("projectDataFetchTime");
      const now = Date.now();
      if (!lastFetchTime || now - parseInt(lastFetchTime, 10) > 60000) {
        sessionStorage.setItem("projectDataFetchTime", now.toString());
        dispatch(getLutronDataProject()).catch(() => { });
      }
    }
  }, [dispatch, profile, projectData?.name, logoutLoading]);

  const roleFromProfile = profile?.role;
  const roleFromStorage = localStorage.getItem('role');
  const currentRole = roleFromProfile || roleFromStorage;
  // Determine settings path based on user role
  const getSettingsPath = (role) => {
    if (role === 'Superadmin') {
      return '/main'; // Home component
    } else if (role === 'Admin') {
      return '/main'; // Manage Area Groups component
    } else {
      // Operator - redirect to first available option
      return '/main'; // Manage Area Groups component
    }
  };

  const settingsPath = getSettingsPath(currentRole);

  const [anchorEl, setAnchorEl] = useState(null);
  const [menuWidth, setMenuWidth] = useState(0);
  const { drawerOpen, openDrawer, closeDrawer } = useSidebarDrawer();
  const [clientLogoBroken, setClientLogoBroken] = useState(false);
  // Tablet and below → hamburger + drawer, hide center links
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const displayName = profile?.name || profile?.email?.split('@')[0] || "User";

  const handleMenuToggle = (e) => {
    // If menu is already open, close it
    if (anchorEl) {
      setAnchorEl(null);
      return;
    }

    // If menu is closed, open it
    setAnchorEl(e.currentTarget);
    const width = e.currentTarget?.getBoundingClientRect?.().width;
    if (width && Number.isFinite(width)) {
      setMenuWidth(Math.ceil(width));
    }
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle clicking outside the menu
  const handleClickOutside = (event) => {
    // Don't close if clicking on a menu item or if menu is already closed
    if (!anchorEl || anchorEl.contains(event.target) || event.target.closest('[role="menuitem"]')) {
      return;
    }
    handleMenuClose();
  };

  // Handle clicking outside the logout menu and keyboard events
  useEffect(() => {
    if (anchorEl) {
      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          handleMenuClose();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [anchorEl]);

  const handleResetPassword = () => {
    handleMenuClose();
    navigate("/auth/change_password");
  };

  const ribbonBg = "#1E74C5";
  /** Match inactive nav links in `navTextSx` */
  const ribbonMuted = "rgba(255, 255, 255, 0.66)";
  const ribbonBright = "#ffffff";
  const ribbonHoverMuted = "rgba(255, 255, 255, 0.88)";
  /** Single-line toolbar — keep MainLayout `paddingTop` and Dashboard fixed `top` in sync. */
  /* Taller than legacy 39px to fit ~180% text without clipping; keep paddingTop / Dashboard `top` in MainLayout in sync +~2 */
  const ribbonHeights = {
    xs: "50px",
    sm: "50px",
    md: "50px",
    lg: "50px",
    xl: "50px",
    xxl: "50px",
    "2xl": "50px",
    "3xl": "50px",
    "4xl": "50px",
    "5xl": "50px",
    "6xl": "50px",
  };

  const isSettingsPath = (p) =>
    p === settingsPath && (
      location.pathname === "/main" ||
      location.pathname === "/theme-change" ||
      location.pathname === "/rename-widget/" ||
      location.pathname.startsWith("/rename-widget/") ||
      location.pathname === "/manage-area-groups" ||
      location.pathname.startsWith("/manage-area-groups/") ||
      location.pathname === "/area-size-load" ||
      location.pathname.startsWith("/area-size-load/") ||
      location.pathname === "/email-server/" ||
      location.pathname.startsWith("/email-server/") ||
      location.pathname === "/users" ||
      location.pathname.startsWith("/users/") ||
      location.pathname === "/floor" ||
      location.pathname.startsWith("/floor/") ||
      location.pathname === "/create-help/" ||
      location.pathname.startsWith("/create-help/") ||
      location.pathname === "/manage-sensors" ||
      location.pathname.startsWith("/manage-sensors/") ||
      location.pathname === "/manage-modules" ||
      location.pathname.startsWith("/manage-modules/") ||
      location.pathname === "/processors" ||
      location.pathname.startsWith("/processors/") ||
      location.pathname === "/alerts" ||
      location.pathname.startsWith("/alerts/")
    );

  const isHeatmapPath = (p) =>
    p === "/heatmap" && (
      location.pathname === "/heatmap" ||
      location.pathname === "/create-area-model" ||
      location.pathname.startsWith("/create-area-model/") ||
      location.pathname === "/user-area-groups" ||
      location.pathname.startsWith("/user-area-groups/") ||
      location.pathname === "/create-area-group" ||
      location.pathname.startsWith("/create-area-group/") ||
      location.pathname === "/create-area-groups" ||
      location.pathname.startsWith("/create-area-groups/") ||
      location.pathname.startsWith("/update-area-groups/") ||
      location.pathname.startsWith("/update-area-group/")
    );

  const isNavItemActive = (item) => {
    if (item.path === "/dashboard") {
      return location.pathname.startsWith("/dashboard");
    }
    if (isHeatmapPath(item.path)) {
      return true;
    }
    if (isSettingsPath(item.path)) {
      return true;
    }
    if (item.path === "/get-help") {
      return location.pathname === "/get-help" || location.pathname.startsWith("/get-help/");
    }
    return location.pathname === item.path;
  };

  const getSettingsSectionLabelForBreadcrumb = (pathname) => {
    if (!pathname || typeof pathname !== "string") return "";
    const p = pathname;
    if (p === "/main") return "Home";
    if (p === "/alerts" || p.startsWith("/alerts/")) return "Alerts";
    if (p === "/email-server/" || p.startsWith("/email-server/")) return "Email Server";
    if (p === "/theme-change" || p.startsWith("/theme-change/")) return "Theme";
    if (p === "/users" || p.startsWith("/users/")) return "User Management";
    if (p === "/area-size-load" || p.startsWith("/area-size-load/")) return "Area Size for Energy";
    if (p === "/manage-area-groups" || p.startsWith("/manage-area-groups/")) return "Area Groups";
    if (p === "/rename-widget/" || p.startsWith("/rename-widget/")) return "Widgets";
    if (p === "/floor" || p.startsWith("/floor/")) return "Floors";
    if (p === "/processors" || p.startsWith("/processors/")) return "Processors";
    if (p === "/create-help/" || p.startsWith("/create-help/")) return "Help";
    if (p === "/manage-sensors" || p.startsWith("/manage-sensors/")) return "Manage Sensors";
    if (p === "/manage-modules" || p.startsWith("/manage-modules/")) return "Manage Modules";
    return "";
  };

  const settingsBreadcrumbFullText = (() => {
    if (!isSettingsPath(settingsPath)) return "";
    const section = getSettingsSectionLabelForBreadcrumb(location.pathname);
    let text = section ? `Settings > ${section}` : "Settings";
    if (location.pathname === "/main") {
      text += ` > ${getSettingsHomeTabLabelFromSearch(location.search)}`;
    }
    if (location.pathname === "/users" || location.pathname.startsWith("/users/")) {
      const usersSuffix = getSettingsUsersActionSuffixFromSearch(location.search);
      if (usersSuffix) text += ` > ${usersSuffix}`;
    }
    const prefix = String(projectData?.name || clientData?.name || "").trim();
    // On default white theme, don't prepend the client/project name (e.g. "Alvara") to Settings breadcrumbs.
    if (prefix && !isDefaultWhiteTheme) {
      text = `${prefix} > ${text}`;
    }
    return text;
  })();

  const SETTINGS_BREADCRUMB_PREFIX_MAX = 42;
  const truncateBreadcrumbPrefix = (full) => {
    if (!full || full.length <= SETTINGS_BREADCRUMB_PREFIX_MAX) return full;
    return `${full.slice(0, SETTINGS_BREADCRUMB_PREFIX_MAX - 1)}\u2026`;
  };

  const settingsBreadcrumbText = (() => {
    if (!settingsBreadcrumbFullText) return "";
    const prefix = String(projectData?.name || clientData?.name || "").trim();
    if (!prefix) return settingsBreadcrumbFullText;
    const rest = settingsBreadcrumbFullText.slice(prefix.length + 3);
    const shortPrefix = truncateBreadcrumbPrefix(prefix);
    return `${shortPrefix} > ${rest}`;
  })();

  const activityReportBreadcrumbFullText = (() => {
    if (location.pathname !== "/activity-report") return "";
    let text = "Activity Report";
    const prefix = String(projectData?.name || clientData?.name || "").trim();
    // On default white theme, don't prepend the client/project name (e.g. "Alvara") to Activity Report breadcrumb.
    if (prefix && !isDefaultWhiteTheme) text = `${prefix} > ${text}`;
    return text;
  })();

  const activityReportBreadcrumbText = (() => {
    if (!activityReportBreadcrumbFullText) return "";
    const prefix = String(projectData?.name || clientData?.name || "").trim();
    if (!prefix) return activityReportBreadcrumbFullText;
    const rest = activityReportBreadcrumbFullText.slice(prefix.length + 3);
    const shortPrefix = truncateBreadcrumbPrefix(prefix);
    return `${shortPrefix} > ${rest}`;
  })();

  const secondaryBreadcrumbText = settingsBreadcrumbText || activityReportBreadcrumbText;
  const secondaryBreadcrumbFullText =
    settingsBreadcrumbText ? settingsBreadcrumbFullText : activityReportBreadcrumbFullText;

  const leftNavItems = [
    { label: "Home", path: "/dashboard" },
    { label: "Floor", path: "/heatmap" },
  ];

  const rightNavItems = [
    { label: "Activity Report", path: "/activity-report" },
    { label: "Settings", path: settingsPath },
  ];

  const drawerMenuItems = [
    ...leftNavItems,
    ...rightNavItems,
    { label: "Help", path: "/get-help" },
  ];

  const desktopNavItems = [...leftNavItems, ...rightNavItems];
  const navTabRefs = useRef({});
  const navItemKeys = desktopNavItems.map((item) => item.label);

  const getActiveNavLabel = () => {
    for (const item of desktopNavItems) {
      if (isTopbarNavItemActive(item, location.pathname, settingsPath)) {
        return item.label;
      }
    }
    return null;
  };

  const activeNavLabel = !isMdDown ? getActiveNavLabel() : null;

  const resolveNavLabelFromEvent = (event) => {
    const target = event?.currentTarget;
    if (target) {
      for (const item of desktopNavItems) {
        const el = navTabRefs.current[item.label];
        if (el && (el === target || el.contains(target))) {
          return item.label;
        }
      }
    }
    return activeNavLabel;
  };

  const handleNavTabKeyDown = (event) => {
    const focusedLabel = resolveNavLabelFromEvent(event);

    if (event.key === "ArrowDown" && focusedLabel === "Home") {
      event.preventDefault();
      event.stopPropagation();
      focusPageSubNav("dashboard", { tabKey: "energy" });
      return;
    }

    if (event.key === "ArrowDown" && focusedLabel === "Floor") {
      event.preventDefault();
      event.stopPropagation();
      focusPageSubNav("heatmap", { tabKey: "Light" });
      return;
    }

    if (event.key === "ArrowDown" && focusedLabel === "Settings") {
      event.preventDefault();
      event.stopPropagation();
      requestSettingsSidebarFocus("Home");
      return;
    }

    handleRovingTablistKeyDown(event, {
      itemKeys: navItemKeys,
      activeKey: focusedLabel || activeNavLabel,
      keyRefs: navTabRefs,
      orientation: "horizontal",
      onActivate: (label) => {
        const item = desktopNavItems.find((entry) => entry.label === label);
        if (item) navigate(item.path);
      },
    });
  };

  useEffect(() => {
    if (isMdDown) return undefined;
    return registerTopbarNavFocusHandler((label) => {
      navTabRefs.current[label]?.focus({ preventScroll: true });
    });
  }, [isMdDown]);

  useEffect(() => {
    if (isMdDown) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/heatmap")) return;
      if (isSettingsAppRoute(location.pathname, settingsPath)) return;
      if (isKeyboardNavBlockedTarget(event.target)) return;
      if (event.target?.closest?.(".topbar-main-nav, .topbar-nav-tab, .nav-tab-btn, .heatmap-mode-tab-btn, .home-content-type-tabs, .settings-sidebar-nav-track")) {
        return;
      }
      if (!activeNavLabel) return;

      event.preventDefault();
      event.stopPropagation();
      handleRovingTablistKeyDown(
        { ...event, currentTarget: navTabRefs.current[activeNavLabel] },
        {
          itemKeys: navItemKeys,
          activeKey: activeNavLabel,
          keyRefs: navTabRefs,
          orientation: "horizontal",
          onActivate: (label) => {
            const item = desktopNavItems.find((entry) => entry.label === label);
            if (item) navigate(item.path);
          },
        }
      );
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isMdDown, activeNavLabel, navItemKeys, location.pathname, desktopNavItems, navigate, settingsPath]);

  const navTextSx = (isActive) => ({
    color: isActive ? ribbonBright : ribbonMuted,
    fontWeight: 500,
    outline: "none",
    "&:focus": { outline: "none", boxShadow: "none" },
    "&:focus-visible": { outline: "none", boxShadow: "none" },
    /* ~15% smaller than prior 16–22px */
    fontSize: {
      xs: 14,
      sm: 14,
      md: 15,
      lg: 15,
      xl: 15,
      xxl: 17,
      "2xl": 17,
      "3xl": 17,
      "4xl": 17,
      "5xl": 19,
      "6xl": 19,
    },
    cursor: "pointer",
    whiteSpace: "nowrap",
    display: "inline-block",
    width: "fit-content",
    px: 0,
    borderBottom: isActive ? "2px solid #fff" : "none",
    paddingBottom: "3px",
    boxSizing: "border-box",
    "&:hover": {
      color: isActive ? ribbonBright : ribbonHoverMuted,
      opacity: isActive ? 0.95 : 1,
    },
    transition: "border-color 0.2s, color 0.2s, opacity 0.2s",
    lineHeight: 1.35,
    verticalAlign: "bottom",
  });

  const handleLogout = async () => {
    if (logoutLoading) {
      return;
    }

    // Capture prefs before logout runs (logout thunk / future changes must not erase snapshot source)
    const widgetVisibilityRaw = readDashboardWidgetVisibilityRaw();
    const customOverviewWidgetsRaw = readCustomOverviewWidgetsRaw();
    const chartLayoutSnapshot = readDashboardChartLayoutSnapshotForLogout();
    const draggableSessionSnapshot = readDashboardDraggableSessionSnapshotForLogout();
    const uiVariantRaw = readUiVariantRaw();

    try {
      const currentToken = getValidToken();
      if (currentToken) {
        await dispatch(logout()).unwrap();
      }
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      localStorage.clear();
      restoreUiVariantAfterStorageClear(uiVariantRaw);
      restoreDashboardWidgetVisibilityAfterStorageClear(widgetVisibilityRaw);
      restoreCustomOverviewWidgetsAfterStorageClear(customOverviewWidgetsRaw);
      restoreDashboardChartLayoutAfterLocalStorageClear(chartLayoutSnapshot);
      sessionStorage.clear();
      restoreDashboardDraggableSessionAfterClear(draggableSessionSnapshot);
      navigate("/", { replace: true });
    }
  };

  const helpRouteActive = isNavItemActive({ path: "/get-help", label: "Help" });
  const userMenuOpen = Boolean(anchorEl);

  return (
    <Box
      key={`topbar-${clientData?.name || "default"}`}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10002,
        width: "100%",
        /* Match AppBar ribbon so the full fixed header is one solid blue (no theme default bleed). */
        backgroundColor: ribbonBg,
      }}
    >
      {/* Full-bleed ribbon: no horizontal padding here (was creating side gutters). Inset is on Toolbar only. */}
      <Box
        sx={{
          maxWidth: "100%",
          mx: "auto",
          width: "100%",
          px: 0,
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: ribbonBg,
            color: "#fff",
            boxShadow: "none",
            borderRadius: 0,
            border: `1px solid ${ribbonBg}`,
            overflow: "hidden",
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              minHeight: ribbonHeights,
              maxHeight: ribbonHeights,
              py: 0,
              /* Horizontal insets for nav content; ribbon background still spans full viewport width */
              px: {
                xs: 2,
                sm: 2.5,
                md: 3,
                lg: 3.5,
                xl: 4,
                xxl: 4,
                "2xl": 4,
                "3xl": 4,
                "4xl": 4,
                "5xl": 4,
                "6xl": 4,
              },
              display: "flex",
              flexWrap: "nowrap",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              overflow: "hidden",
              color: "#fff",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: "0 0 auto",
                flexShrink: 0,
                minWidth: 0,
                gap: { xs: 0.5, md: 1.5 },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  flex: "0 0 auto",
                  flexShrink: 0,
                  justifyContent: "center",
                  /* Reserved column — minWidth + width so space is actually allocated (maxWidth alone only caps). */
                  width: {
                    xs: "54px",
                    sm: "60px",
                    md: "72px",
                    lg: "84px",
                    xl: "96px",
                  },
                  minWidth: {
                    xs: "54px",
                    sm: "60px",
                    md: "72px",
                    lg: "84px",
                    xl: "96px",
                  },
                  maxWidth: {
                    xs: "54px",
                    sm: "60px",
                    md: "72px",
                    lg: "84px",
                    xl: "96px",
                  },
                  pl: 0,
                  pr: { xs: 0.25, md: 0.5 },
                  py: 0.25,
                }}
              >
                {clientData?.logo_image && !clientLogoBroken && (
                  <RouterLink
                    to="/lutron"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      minWidth: 0,
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={logoUrl}
                      alt="Client Logo"
                      onError={() => setClientLogoBroken(true)}
                      style={{
                        height: "auto",
                        maxHeight: "31px",
                        maxWidth: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                        cursor: "pointer",
                      }}
                    />
                  </RouterLink>
                )}
              </Box>

              {isMdDown && (
                <IconButton
                  edge="start"
                  color="inherit"
                  aria-label="open menu"
                  onClick={openDrawer}
                  size="small"
                >
                  <MenuIcon sx={{ fontSize: 32 }} />
                </IconButton>
              )}

              {!isMdDown && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 0.25,
                    flexWrap: "nowrap",
                  }}
                >
                  <Box
                    className="topbar-main-nav"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: { md: 3, lg: 4 },
                      flexWrap: "nowrap",
                    }}
                  >
                    {leftNavItems.map((item) => {
                      const isActive = isNavItemActive(item);
                      return (
                        <Typography
                          key={item.path}
                          component="span"
                          variant="body2"
                          role="tab"
                          aria-selected={isActive}
                          tabIndex={getRovingTabIndex(isActive)}
                          className="topbar-nav-tab"
                          ref={(el) => { navTabRefs.current[item.label] = el; }}
                          onKeyDown={handleNavTabKeyDown}
                          onClick={() => navigate(item.path)}
                          sx={navTextSx(isActive)}
                        >
                          {item.label}
                        </Typography>
                      );
                    })}
                  </Box>

                  {!!secondaryBreadcrumbText &&
                    location.pathname !== "/activity-report" &&
                    !settingsBreadcrumbText && (
                      <Typography
                        component="span"
                        variant="caption"
                        title={
                          secondaryBreadcrumbFullText !== secondaryBreadcrumbText
                            ? secondaryBreadcrumbFullText
                            : undefined
                        }
                        sx={{
                          color: ribbonBright,
                          fontWeight: 400,
                          whiteSpace: "nowrap",
                          lineHeight: 1.1,
                        }}
                      >
                        {secondaryBreadcrumbText}
                      </Typography>
                    )}
                </Box>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: { xs: 4, sm: 8 } }} aria-hidden />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flex: "0 0 auto",
                justifyContent: "flex-end",
                gap: { xs: 1, sm: 2, md: 3, lg: 4 },
                minWidth: 0,
                overflow: "visible",
              }}
            >
              {!isMdDown && (
                <Box
                  className="topbar-main-nav"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: { xs: 1, sm: 2, md: 3, lg: 4 },
                    flexWrap: "nowrap",
                  }}
                >
                  {rightNavItems.map((item) => {
                    const isActive = isNavItemActive(item);
                    return (
                      <Typography
                        key={item.path}
                        component="span"
                        variant="body2"
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={getRovingTabIndex(isActive)}
                        className="topbar-nav-tab"
                        ref={(el) => { navTabRefs.current[item.label] = el; }}
                        onKeyDown={handleNavTabKeyDown}
                        onClick={() => navigate(item.path)}
                        sx={navTextSx(isActive)}
                      >
                        {item.label}
                      </Typography>
                    );
                  })}
                </Box>
              )}

              <Box
                onClick={handleMenuToggle}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: {
                    xs: 0.25,
                    sm: 0.5,
                    md: 0.75,
                    lg: 1,
                    xl: 1.25,
                    xxl: 1.5,
                    "2xl": 1.75,
                    "3xl": 2,
                    "5xl": 2.25,
                    "6xl": 2.5
                  },
                  cursor: "pointer",
                  padding: {
                    xs: "1px 3px",
                    sm: "1px 4px",
                    md: "2px 5px",
                    lg: "2px 6px",
                    xl: "2px 6px",
                    xxl: "3px 8px",
                    "2xl": "3px 8px",
                    "3xl": "3px 8px",
                    "4xl": "3px 10px",
                    "5xl": "3px 10px",
                    "6xl": "4px 10px"
                  },
                  borderRadius: "6px",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    ...(!userMenuOpen && {
                      "& .MuiAvatar-root": {
                        color: `${ribbonHoverMuted} !important`,
                        bgcolor: "rgba(255, 255, 255, 0.16) !important",
                      },
                      "& .user-ribbon-display": { color: ribbonHoverMuted },
                      "& .user-ribbon-chevron": { color: ribbonHoverMuted },
                    }),
                  },
                  minWidth: "fit-content",
                  maxWidth: "100%"
                }}
              >
                {profileLoading ? (
                  <CircularProgress
                    size={22}
                    sx={{ color: ribbonMuted }}
                  />
                ) : (
                  <>
                    <Avatar
                      sx={{
                        width: {
                          xs: 29,
                          sm: 29,
                          md: 32,
                          lg: 32,
                          xl: 32,
                          xxl: 32,
                          "2xl": 36,
                          "3xl": 36,
                          "4xl": 36,
                          "5xl": 36,
                          "6xl": 40
                        },
                        height: {
                          xs: 29,
                          sm: 29,
                          md: 32,
                          lg: 32,
                          xl: 32,
                          xxl: 32,
                          "2xl": 36,
                          "3xl": 36,
                          "4xl": 36,
                          "5xl": 36,
                          "6xl": 40
                        },
                        fontSize: {
                          xs: "14px",
                          sm: "14px",
                          md: "16px",
                          lg: "16px",
                          xl: "16px",
                          xxl: "16px",
                          "2xl": "18px",
                          "3xl": "18px",
                          "4xl": "18px",
                          "5xl": "18px",
                          "6xl": "20px"
                        },
                        backgroundColor: userMenuOpen ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.12)",
                        color: userMenuOpen ? ribbonBright : ribbonMuted,
                        flexShrink: 0,
                        transition: "color 0.2s ease, background-color 0.2s ease",
                      }}
                    >
                      {displayName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography
                      className="user-ribbon-display"
                      variant="body2"
                      sx={{
                        color: userMenuOpen ? ribbonBright : ribbonMuted,
                        fontWeight: 500,
                        fontSize: {
                          xs: "14px",
                          sm: "14px",
                          md: "16px",
                          lg: "16px",
                          xl: "16px",
                          xxl: "16px",
                          "2xl": "18px",
                          "3xl": "18px",
                          "4xl": "18px",
                          "5xl": "18px",
                          "6xl": "20px"
                        },
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        transition: "color 0.2s ease",
                      }}
                    >
                      {displayName}
                    </Typography>
                    <ArrowDropDownIcon
                      className="user-ribbon-chevron"
                      sx={{
                        color: userMenuOpen ? ribbonBright : ribbonMuted,
                        fontSize: {
                          xs: "20px",
                          sm: "20px",
                          md: "20px",
                          lg: "20px",
                          xl: "22px",
                          xxl: "22px",
                          "2xl": "22px",
                          "3xl": "22px",
                          "4xl": "22px",
                          "5xl": "23px",
                          "6xl": "23px"
                        },
                        transition: "transform 0.2s ease, color 0.2s ease",
                        transform: anchorEl ? "rotate(180deg)" : "rotate(0deg)",
                        flexShrink: 0
                      }}
                    />
                  </>
                )}
              </Box>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                disableAutoFocus
                disableEnforceFocus
                sx={{ zIndex: 10005 }}
                slotProps={{
                  paper: {
                    elevation: 0,
                    style: { backgroundColor: "#fff" },
                    sx: {
                      bgcolor: "#fff",
                      color: "#111",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                      width: `${menuWidth || 0}px`,
                      minWidth: "160px",
                      mt: 0,
                      overflow: "hidden",
                      border: "1px solid rgba(0,0,0,0.08)",
                      maxHeight: "none",
                      zIndex: 10005,
                      "&::-webkit-scrollbar": {
                        display: "none",
                      },
                      scrollbarWidth: "none",
                    },
                  },
                  list: {
                    sx: {
                      p: 0,
                      overflow: "hidden",
                      maxHeight: "none",
                      "&::-webkit-scrollbar": {
                        display: "none",
                      },
                      scrollbarWidth: "none",
                    }
                  },
                  backdrop: {
                    onClick: handleMenuClose,
                  },
                }}
              >
                <MenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleResetPassword();
                  }}
                  sx={{
                    color: "#111",
                    fontWeight: 500,
                    justifyContent: "flex-start",
                    borderBottom: "1px solid rgba(0,0,0,0.08)",
                    px: 2,
                    py: 1.5,
                    minHeight: "48px",
                    "&:hover": {
                      backgroundColor: "rgba(0,0,0,0.04)",
                    }
                  }}
                >
                  <LockResetIcon sx={{ mr: 1.5, fontSize: 18, color: "#666" }} />
                  Reset Password
                </MenuItem>
                <MenuItem
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMenuClose();
                    await handleLogout();
                  }}
                  disabled={logoutLoading}
                  sx={{
                    color: logoutLoading ? "#9ca3af" : "#ef4444",
                    fontWeight: 600,
                    justifyContent: "flex-start",
                    px: 2,
                    py: 1.5,
                    minHeight: "48px",
                    opacity: logoutLoading ? 0.7 : 1
                  }}
                >
                  {logoutLoading ? (
                    <CircularProgress size={16} sx={{ mr: 1.5, color: "#9ca3af" }} />
                  ) : (
                    <PowerSettingsNewIcon sx={{ mr: 1.5, fontSize: 18, color: "#ef4444" }} />
                  )}
                  {logoutLoading ? "Logging out..." : "Logout"}
                </MenuItem>
              </Menu>

              <IconButton
                color="inherit"
                aria-label="Help"
                onClick={() => navigate("/get-help")}
                sx={{
                  border: helpRouteActive
                    ? "1px solid rgba(255,255,255,0.92)"
                    : "1px solid rgba(255,255,255,0.42)",
                  ml: 0.5,
                  p: 0.35,
                  color: helpRouteActive ? ribbonBright : ribbonMuted,
                  transition: "color 0.2s ease, border-color 0.2s ease",
                  "&:hover": {
                    color: helpRouteActive ? ribbonBright : ribbonHoverMuted,
                    borderColor: "rgba(255,255,255,0.65)",
                  },
                }}
                size="small"
              >
                <HelpOutlineIcon
                  sx={{
                    fontSize: 25,
                    color: "inherit",
                  }}
                />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      </Box>

      <SharedSidebar
        open={drawerOpen}
        onClose={closeDrawer}
        items={drawerMenuItems}
        isItemActive={isNavItemActive}
      />
    </Box>
  );
}
