/** Basic variant settings layout adapter — Phase 5.2 */

export const basicSettingsLayoutAdapter = {
  variant: "basic",
  showContentHeader: true,
  headingInSidebar: false,
  getRootGridSx: () => ({ ml: "18px", p: "18px" }),
  getSidebarGridSx: (ctx) => ({
    md: 2,
    contentMd: 10,
    ...(typeof ctx.settingsSidebarColumnDividerSx === "function"
      ? ctx.settingsSidebarColumnDividerSx(
          ctx.isDefaultWhiteTheme,
          ctx.settingsSidebarMdUp
        )
      : {}),
  }),
  getContentOuterSx: (ctx) => ({
    backgroundColor: ctx.isDefaultWhiteTheme ? "#ffffff" : ctx.contentColor,
    p: 3,
    borderTopRightRadius: "10px",
    borderBottomRightRadius: "10px",
  }),
  getContentInnerSx: () => ({
    backgroundColor: "#fff",
    borderRadius: { xs: "4px", sm: "6px", md: "8px", lg: "10px" },
    p: { xs: 0.5, sm: 0.8, md: 1.2, lg: 1.5 },
    width: "100%",
    flex: "0 1 auto",
    minHeight: "auto",
    display: "flex",
    flexDirection: "column",
    overflow: "visible",
  }),
};

export default basicSettingsLayoutAdapter;
