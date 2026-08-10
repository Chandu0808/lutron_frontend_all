import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { dispatchFetchThemeSettingsOnce } from "../../utils/bootstrapFetchGuards";
import { useThemeReload } from "./useThemeReload";

function applicationThemeHasColors(applicationTheme) {
  const at = applicationTheme?.application_theme;
  return Boolean(at?.background || at?.content || at?.button);
}

/**
 * Shared Redux bootstrap + theme state for ThemeProviderCustom.
 *
 * Variant-specific createAppTheme / applyCssVariables remain in each variant file.
 *
 * @param {boolean} [preferApplicationThemeCss=false]
 *   Advanced-only: when true, `/theme/application` owns CSS vars + MUI theme once
 *   loaded, so stale `/theme/` settings cannot overwrite the selected theme on refresh.
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
  preferApplicationThemeCss = false,
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
    dispatchFetchThemeSettingsOnce(dispatch, fetchThemeSettings, {
      alreadyLoaded: Boolean(themeSettings),
    });
  }, [dispatch, themeSettings, fetchThemeSettings]);

  useEffect(() => {
    if (!themeSettings) {
      return;
    }

    // Advanced: do not let /theme/ settings paint over a loaded application theme.
    if (preferApplicationThemeCss && applicationThemeHasColors(applicationTheme)) {
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
    preferApplicationThemeCss,
    applicationTheme,
  ]);

  // Keep CSS variables in sync with /theme/application (Advanced + Basic when wired).
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

    const ui = {
      background: at.background,
      content: at.content,
      button: at.button,
    };

    applyCssVariables(ui, appBgImage);

    // Advanced: application theme is also the MUI theme source of truth.
    if (preferApplicationThemeCss) {
      if (explicitBg !== undefined) {
        setBackgroundImage(appBgImage);
      }
      setTheme(createAppTheme(ui, appBgImage));
    }
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
    preferApplicationThemeCss,
    createAppTheme,
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
