/**
 * PPT-style resize border + corner handles for a FOFP marker (SVG).
 */

import React from "react";
import { useTheme } from "@mui/material";
import {
  FOFP_RESIZE_HANDLES,
  getMarkerResizeBounds,
  getResizeHandleHitSize,
  getResizeHandlePositions,
  getResizeHandleCursor,
} from "./fofpMarkerResize";

const FofpMarkerResizeHandles = ({
  centerX,
  centerY,
  halfW,
  halfH,
  onHandlePointerDown,
}) => {
  const theme = useTheme();
  const handleFill = theme.palette.common.white;
  const handleStroke = theme.palette.primary.main;
  const bounds = getMarkerResizeBounds(centerX, centerY, halfW, halfH);
  const handles = getResizeHandlePositions(bounds);
  const hitSize = getResizeHandleHitSize(halfW, halfH);
  const halfHit = hitSize / 2;

  return (
    <g
      data-fofp-resize-overlay="true"
      data-testid="fofp-resize-overlay"
      pointerEvents="none"
    >
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
        stroke={handleStroke}
        strokeWidth={1.5}
        strokeDasharray="5 4"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {FOFP_RESIZE_HANDLES.map((id) => {
        const pos = handles[id];
        return (
          <rect
            key={id}
            data-fofp-resize-handle={id}
            data-testid={`fofp-resize-handle-${id}`}
            x={pos.x - halfHit}
            y={pos.y - halfHit}
            width={hitSize}
            height={hitSize}
            fill={handleFill}
            stroke={handleStroke}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            pointerEvents="auto"
            style={{ cursor: getResizeHandleCursor(id) }}
            onPointerDown={(e) => onHandlePointerDown(e, id)}
          />
        );
      })}
    </g>
  );
};

export default FofpMarkerResizeHandles;
