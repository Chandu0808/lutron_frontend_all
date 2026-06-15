import { useCallback } from "react";

/**
 * Runtime theme reload handler shared across variants.
 */
export function useThemeReload({
  backgroundImage,
  setBackgroundImage,
  setTheme,
  applyCssVariables,
  createAppTheme,
  resolveReloadBackgroundImage,
}) {
  return useCallback(
    (uiColors = {}, bgImage) => {
      const next = resolveReloadBackgroundImage(bgImage, backgroundImage);
      applyCssVariables(uiColors, next);
      const newTheme = createAppTheme(uiColors, next);
      setTheme({ ...newTheme });
      setBackgroundImage(next);
    },
    [
      backgroundImage,
      setBackgroundImage,
      setTheme,
      applyCssVariables,
      createAppTheme,
      resolveReloadBackgroundImage,
    ]
  );
}
