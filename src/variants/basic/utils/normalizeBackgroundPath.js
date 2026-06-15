/** Default when theme has no image (matches ThemeContext) */
export const DEFAULT_PUBLIC_BG = "/assets/defaultBg.png";

/**
 * Some APIs store a bad filename: "default@g.png" instead of "defaultBg.png".
 * Fixes that so the browser can load the image from `public`.
 */
export function normalizeBackgroundPath(url) {
  if (url == null || typeof url !== "string" || !url.trim()) {
    return DEFAULT_PUBLIC_BG;
  }
  return url
    .trim()
    .split("default@g")
    .join("defaultBg");
}

/** Auth/settings pages: only show a background when the API has a custom image. */
export function resolveAuthPageBackgroundUrl(url) {
  if (url == null || typeof url !== "string" || !url.trim()) {
    return null;
  }
  return normalizeBackgroundPath(url);
}
