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
};

export default basicSettingsLayoutAdapter;
