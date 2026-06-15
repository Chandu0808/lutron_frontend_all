import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useThemeReload } from "./useThemeReload";

/**
 * Shared Redux bootstrap + theme state for ThemeProviderCustom.
 *
 * Variant-specific createAppTheme / applyCssVariables remain in each variant file.
 */
export function useThemeProviderBootstrap({
  createAppTheme,
  applyCssVariables,
  fetchThemeSettings,
  selectThemeSettings,
  selectThemeLoading,
  selectThemeError,
  initialBackgroundImage,
  mountCssBackground,
  resolveApiBackgroundImage,
  resolveReloadBackgroundImage,
  applicationTheme,
  pickThemeBackgroundImage,
}) {
  const dispatch = useDispatch();

  const themeSettings = useSelector(selectThemeSettings);
  const themeLoading = useSelector(selectThemeLoading);
  const themeError = useSelector(selectThemeError);

  const [theme, setTheme] = useState(() => createAppTheme({}));
  const [backgroundImage, setBackgroundImage] = useState(initialBackgroundImage);

  useEffect(() => {
    applyCssVariables({}, mountCssBackground);
  }, [applyCssVariables, mountCssBackground]);

  useEffect(() => {
    if (!themeSettings) {
      dispatch(fetchThemeSettings());
    }
  }, [dispatch, themeSettings, fetchThemeSettings]);

  useEffect(() => {
    if (!themeSettings) {
      return;
    }

    const ui = themeSettings.ui_theme_colors || {};
    const bgImage = resolveApiBackgroundImage(themeSettings.background_image);

    applyCssVariables(ui, bgImage);
    setBackgroundImage(bgImage);
    setTheme(createAppTheme(ui, bgImage));
  }, [
    themeSettings,
    applyCssVariables,
    createAppTheme,
    resolveApiBackgroundImage,
  ]);

  // Advanced-only: keep CSS variables in sync with /theme/application.
  useEffect(() => {
    if (!pickThemeBackgroundImage || applicationTheme == null) {
      return;
    }

    const at = applicationTheme?.application_theme;
    if (!at?.background && !at?.content && !at?.button) {
      return;
    }

    const explicitBg = pickThemeBackgroundImage(
      at.background_image,
      at.backgroundImageUrl,
      applicationTheme?.background_image
    );
    const appBgImage =
      explicitBg !== undefined ? explicitBg : backgroundImage;

    applyCssVariables(
      {
        background: at.background,
        content: at.content,
        button: at.button,
      },
      appBgImage
    );
  }, [
    applicationTheme,
    applicationTheme?.application_theme?.background,
    applicationTheme?.application_theme?.content,
    applicationTheme?.application_theme?.button,
    applicationTheme?.application_theme?.background_image,
    applicationTheme?.background_image,
    backgroundImage,
    applyCssVariables,
    pickThemeBackgroundImage,
  ]);

  const reloadTheme = useThemeReload({
    backgroundImage,
    setBackgroundImage,
    setTheme,
    applyCssVariables,
    createAppTheme,
    resolveReloadBackgroundImage,
  });

  return {
    theme,
    backgroundImage,
    reloadTheme,
    themeLoading,
    themeError,
  };
}
