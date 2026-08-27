/** Basic variant settings layout adapter — Phase 5.2 */

export const basicSettingsLayoutAdapter = {
  variant: "basic",
  showContentHeader: true,
  headingInSidebar: false,
  getRootGridSx: () => ({
    ml: "18px",
    p: "18px",
    alignItems: "flex-start",
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
  }),
  getSidebarGridSx: (ctx) => ({
    md: 2,
    contentMd: 10,
    ...(typeof ctx.settingsSidebarColumnDividerSx === "function"
      ? ctx.settingsSidebarColumnDividerSx(
          ctx.isDefaultWhiteTheme,
          ctx.settingsSidebarMdUp
        )
      : {}),
    position: { xs: "static", md: "sticky" },
    top: { xs: "auto", md: "20px" },
    alignSelf: "flex-start",
  }),
  getContentOuterSx: (ctx) => ({
    backgroundColor: ctx.isDefaultWhiteTheme ? "#ffffff" : ctx.contentColor,
    p: 3,
    borderTopRightRadius: "10px",
    borderBottomRightRadius: "10px",
  }),
  getContentInnerSx: (ctx = {}) => {
    const base = {
      backgroundColor: "#fff",
      borderRadius: { xs: "4px", sm: "6px", md: "8px", lg: "10px" },
      p: { xs: 0.5, sm: 0.8, md: 1.2, lg: 1.5 },
      width: "100%",
      flex: "0 1 auto",
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflowX: "hidden",
      minWidth: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
    };
    // Application Monitoring: let content grow; outer panel scrolls (advanced-like).
    if (ctx.isApplicationMonitoring) {
      return {
        ...base,
        maxHeight: "none",
        overflowY: "visible",
        flex: "0 0 auto",
        pb: { xs: 2, md: 3 },
      };
    }
    return {
      ...base,
      maxHeight: { xs: "none", md: "calc(100dvh - 360px)" },
      overflowY: { xs: "visible", md: "auto" },
    };
  },
};

export default basicSettingsLayoutAdapter;
