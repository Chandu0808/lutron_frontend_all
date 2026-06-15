/**
 * Calibrated floor viewport fit for FOFP layout viewer.
 * Extracted for unit tests and to skip fit when layout size is not ready.
 */

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

export const clampZoom = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(n.toFixed(2))));
};

/**
 * @returns {{ scale: number, x: number, y: number } | null}
 */
export const computeCalibratedTransform = (viewportW, viewportH, bounds) => {
  const w = Number(viewportW);
  const h = Number(viewportH);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return null;
  }

  const b = bounds || {};
  const width = Number(b.width);
  const height = Number(b.height);
  const xLeft = Number(b.xLeft);
  const yTop = Number(b.yTop);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  const scale = clampZoom(
    Math.min(1, (w - 48) / width, (h - 48) / height)
  );

  return {
    scale,
    x: (w - width * scale) / 2 - (Number.isFinite(xLeft) ? xLeft : 0) * scale,
    y: (h - height * scale) / 2 - (Number.isFinite(yTop) ? yTop : 0) * scale,
  };
};
