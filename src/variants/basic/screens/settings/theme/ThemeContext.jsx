// src/screens/settings/theme/ThemeContext.jsx
import React from "react";
import { useSelector } from "react-redux";
import {
  fetchThemeSettings,
  selectThemeSettings,
  selectThemeLoading,
  selectThemeError,
  selectApplicationTheme,
} from "../../../redux/slice/theme/themeSlice";
import {
  DEFAULT_PUBLIC_BG,
  normalizeBackgroundPath,
} from "../../../utils/normalizeBackgroundPath";
import {
  DEFAULT_APP_BACKGROUND,
  DEFAULT_APP_CONTENT,
  isWhiteAreaPickerChrome,
} from "../../../utils/themeOnSurface";
import { pickThemeBackgroundImage } from "../../../../../shared/theme/utils/themeBackgroundImage";
import {
  createThemeContext,
  createNormalizeUiColors,
  createNormalizedBackgroundResolvers,
  ThemeMuiProviderShell,
  useThemeProviderBootstrap,
} from "../../../../../shared/theme/context";
import { createBasicAppTheme } from "../../../../../shared/theme/mui/createBasicAppTheme";
import {
  WhiteThemeCheckboxCheckedIcon,
  WhiteThemeCheckboxIndeterminateIcon,
  WhiteThemeCheckboxUncheckedIcon,
} from "../../../utils/whiteThemeCheckboxIcons";
const DEFAULT_TAB_COLOR = '#1976d2';
/** Default action buttons (contained / outlined / text) — semantic colors stay on palette. */
const BUTTON_BLUE = '#1565C0';

const normalizeUiColors = createNormalizeUiColors({
  background: DEFAULT_APP_BACKGROUND,
  content: DEFAULT_APP_CONTENT,
  button: "#232323",
  error: "#d32f2f",
});

const backgroundResolvers = createNormalizedBackgroundResolvers(
  normalizeBackgroundPath
);

const applyCssVariables = (uiColors = {}, bgImage = "") => {
  if (typeof document === "undefined") return;

  const { background, content, button } = normalizeUiColors(uiColors);
  const isDefaultWhiteTheme = isWhiteAreaPickerChrome(content);
  const root = document.documentElement;

  // Default/light content: keep body/html white so Settings does not show a beige band.
  const cssBackground = isDefaultWhiteTheme ? DEFAULT_APP_BACKGROUND : background;
  root.style.setProperty("--app-background", cssBackground);
  root.style.setProperty("--app-content", content);
  root.style.setProperty("--app-button", button);
  root.style.setProperty("--app-checkbox-accent", isDefaultWhiteTheme ? BUTTON_BLUE : "auto");
  root.style.setProperty("--app-checkbox-border", isDefaultWhiteTheme ? "#D1D1D1" : "transparent");
  if (bgImage && String(bgImage).trim()) {
    root.style.setProperty("--app-background-image", `url(${bgImage})`);
  } else {
    root.style.setProperty("--app-background-image", "none");
  }
  /* Native <input type="checkbox"> (Dashboard tree, schedules, etc.) — see index.css */
  root.classList.toggle("app-native-checkbox-light", Boolean(isDefaultWhiteTheme));
};

const createAppTheme = (uiColors = {}, bgImage = "") =>
  createBasicAppTheme({
    normalizeUiColors,
    isWhiteAreaPickerChrome,
    uiColors,
    bgImage,
    tabColor: DEFAULT_TAB_COLOR,
    buttonBlue: BUTTON_BLUE,
    checkboxIcons: {
      uncheckedIcon: <WhiteThemeCheckboxUncheckedIcon />,
      checkedIcon: <WhiteThemeCheckboxCheckedIcon />,
      indeterminateIcon: <WhiteThemeCheckboxIndeterminateIcon />,
    },
  });

export const ThemeContext = createThemeContext(DEFAULT_PUBLIC_BG);

export const ThemeProviderCustom = ({ children }) => {
  const applicationTheme = useSelector(selectApplicationTheme);

  const { theme, backgroundImage, reloadTheme } = useThemeProviderBootstrap({
    createAppTheme,
    applyCssVariables,
    fetchThemeSettings,
    selectThemeSettings,
    selectThemeLoading,
    selectThemeError,
    initialBackgroundImage: "",
    mountCssBackground: "",
    resolveApiBackgroundImage: backgroundResolvers.fromApi,
    resolveReloadBackgroundImage: backgroundResolvers.onReload,
    applicationTheme,
    pickThemeBackgroundImage,
  });

  return (
    <ThemeContext.Provider value={{ theme, backgroundImage, reloadTheme }}>
      <ThemeMuiProviderShell theme={theme}>
        {children}
      </ThemeMuiProviderShell>
    </ThemeContext.Provider>
  );
};
