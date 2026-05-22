/**
 * Per-zone marker half-axes (horizontal / vertical) for FOFP stretch + resize.
 */

import {
  clampFofpMarkerSize,
  FOFP_DEFAULT_MARKER_SIZE,
} from "./fofpMarkerShapes";

/** Resolve half-width, half-height, and legacy shape_size from position row. */
export const resolveFofpMarkerHalfAxes = (
  position,
  globalMarkerSize = FOFP_DEFAULT_MARKER_SIZE
) => {
  const base = clampFofpMarkerSize(
    position?.shape_size != null ? position.shape_size : globalMarkerSize
  );
  const halfX = clampFofpMarkerSize(
    position?.shape_size_x != null ? position.shape_size_x : base
  );
  const halfY = clampFofpMarkerSize(
    position?.shape_size_y != null ? position.shape_size_y : base
  );
  return {
    halfX,
    halfY,
    shapeSize: Math.max(halfX, halfY),
  };
};

/** Patch object for onMarkerStyleChange after resize. */
export const buildMarkerSizePatch = (halfX, halfY) => {
  const hx = clampFofpMarkerSize(halfX);
  const hy = clampFofpMarkerSize(halfY);
  return {
    shape_size_x: hx,
    shape_size_y: hy,
    shape_size: Math.max(hx, hy),
  };
};
