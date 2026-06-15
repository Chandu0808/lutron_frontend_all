/** Default when theme has no custom image (public asset). */
export const DEFAULT_PUBLIC_BG = "/assets/defaultBg.png";

/**
 * Some APIs store a bad filename: "default@g.png" instead of "defaultBg.png".
 */
export function normalizeBackgroundPath(url) {
  if (url == null || typeof url !== "string" || !url.trim()) {
    return DEFAULT_PUBLIC_BG;
  }
  return url.trim().split("default@g").join("defaultBg");
}

/** Auth pages: only show a background when the API has a custom image. */
export function resolveAuthPageBackgroundUrl(url) {
  if (url == null || typeof url !== "string" || !url.trim()) {
    return null;
  }
  return normalizeBackgroundPath(url);
}

/** Pick first defined background candidate (empty string is intentional). */
export function pickThemeBackgroundImage(...candidates) {
  for (const value of candidates) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return undefined;
}
