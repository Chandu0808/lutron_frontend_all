/**
 * Basic SettingsLayout — Phase 5.2 thin wrapper over SharedSettingsShell
 */
import React from "react";
import { useTheme, useMediaQuery } from "@mui/material";
import { useSelector } from "react-redux";
import { UseAuth, getVisibleSidebarItemsWithPaths } from "../../customhooks/UseAuth";
import { selectApplicationTheme } from "../../redux/slice/theme/themeSlice";
import { isLightSurface } from "../../utils/themeOnSurface";
import { settingsSidebarColumnDividerSx } from "../../utils/settingsSidebarTabStyles";
import SettingsSidebarNav from "../../components/SettingsSidebarNav";
import SharedSettingsShell from "../../../../shared/layout/SharedSettingsShell";
import { basicSettingsLayoutAdapter } from "../../../../shared/layout/adapters/basicSettingsLayoutAdapter";

const SettingsLayout = ({ children }) => {
  const theme = useTheme();
  const settingsSidebarMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const { role } = UseAuth();
  const sidebarItems = getVisibleSidebarItemsWithPaths(role);
  const appTheme = useSelector(selectApplicationTheme);
  const contentColor = appTheme?.application_theme?.content || "#ffffff";
  const isDefaultWhiteTheme = isLightSurface(contentColor);

  return (
    <SharedSettingsShell
      adapter={{
        ...basicSettingsLayoutAdapter,
        getSidebarGridSx: (ctx) => ({
          md: 2,
          contentMd: 10,
          ...settingsSidebarColumnDividerSx(isDefaultWhiteTheme, settingsSidebarMdUp),
        }),
      }}
      NavigationComponent={SettingsSidebarNav}
      sidebarItems={sidebarItems}
      themeContext={{
        contentColor,
        isDefaultWhiteTheme,
        settingsSidebarMdUp,
        settingsSidebarColumnDividerSx,
        theme,
      }}
    >
      {children}
    </SharedSettingsShell>
  );
};

export default SettingsLayout;
export { isPathActive, normalizeSettingsPath, getActiveSettingsRouteItem } from "../../../../shared/layout/settingsPathUtils";
