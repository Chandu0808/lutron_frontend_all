import { useCallback, useEffect, useRef } from "react";
import { markerResizeFromHandle } from "../../../../screens/settings/fofp/fofpMarkerResize";
import { resolveFofpMarkerHalfAxes } from "../../../../screens/heatmap/fofpMarkerDimensions";

/**
 * Ephemeral resize: RAF-batched DOM preview, commit patch on pointerup.
 */
export const useMarkerResizeSession = ({
  isEditing,
  positionsByZoneId,
  resolvedSize,
  onMarkerStyleChange,
  clientPointToSvg,
  resizingZoneId,
  setResizingZoneId,
}) => {
  const resizeDragRef = useRef(null);
  const livePatchRef = useRef(null);
  const resizeRafRef = useRef(null);
  const resizeOverlayRef = useRef(null);

  const registerResizeOverlay = useCallback((el) => {
    resizeOverlayRef.current = el;
  }, []);

  const applyResizeOverlayPatch = useCallback((pos, patch) => {
    const root = resizeOverlayRef.current;
    if (!root || !pos || !patch) return;
    const cx = Number(pos.x);
    const cy = Number(pos.y);
    const halfX =
      patch.shape_size_x != null ? Number(patch.shape_size_x) : null;
    const halfY =
      patch.shape_size_y != null ? Number(patch.shape_size_y) : null;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const shape = root.querySelector("[data-fofp-resize-shape]");
    const ring = root.querySelector("[data-fofp-resize-ring]");
    if (shape && halfX != null && halfY != null) {
      const tag = shape.tagName?.toLowerCase();
      if (tag === "circle") {
        shape.setAttribute("r", String(Math.max(halfX, halfY)));
      } else if (tag === "ellipse") {
        shape.setAttribute("rx", String(halfX));
        shape.setAttribute("ry", String(halfY));
      } else if (tag === "rect") {
        shape.setAttribute("x", String(cx - halfX));
        shape.setAttribute("y", String(cy - halfY));
        shape.setAttribute("width", String(halfX * 2));
        shape.setAttribute("height", String(halfY * 2));
      }
    }
    if (ring && halfX != null && halfY != null) {
      ring.setAttribute("cx", String(cx));
      ring.setAttribute("cy", String(cy));
      ring.setAttribute("rx", String(halfX + 3));
      ring.setAttribute("ry", String(halfY + 3));
    }
  }, []);

  const endResizeMode = useCallback(() => {
    resizeDragRef.current = null;
    livePatchRef.current = null;
    if (resizeRafRef.current != null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    setResizingZoneId(null);
  }, [setResizingZoneId]);

  /** End active handle drag only; keep resize chrome until user clicks away. */
  const commitResize = useCallback(() => {
    const drag = resizeDragRef.current;
    const patch = livePatchRef.current;
    resizeDragRef.current = null;
    livePatchRef.current = null;
    if (resizeRafRef.current != null) {
      window.cancelAnimationFrame(resizeRafRef.current);
      resizeRafRef.current = null;
    }
    if (drag && patch && typeof onMarkerStyleChange === "function") {
      onMarkerStyleChange(drag.zoneId, patch);
    }
  }, [onMarkerStyleChange]);

  useEffect(() => {
    const onPointerMove = (e) => {
      const drag = resizeDragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      if (resizeRafRef.current != null) return;
      resizeRafRef.current = window.requestAnimationFrame(() => {
        resizeRafRef.current = null;
        const active = resizeDragRef.current;
        if (!active) return;
        const pt = clientPointToSvg(e.clientX, e.clientY);
        if (!pt) return;
        const pos = positionsByZoneId.get(Number(active.zoneId));
        if (!pos) return;
        const { halfX, halfY } = resolveFofpMarkerHalfAxes(pos, resolvedSize);
        const patch = markerResizeFromHandle(
          active.handleId,
          pt.x,
          pt.y,
          pos.x,
          pos.y,
          halfX,
          halfY
        );
        livePatchRef.current = patch;
        applyResizeOverlayPatch(
          { ...pos, ...patch },
          patch
        );
      });
    };

    const onPointerUp = (e) => {
      const drag = resizeDragRef.current;
      if (drag && drag.pointerId === e.pointerId) commitResize();
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (resizeRafRef.current != null) window.cancelAnimationFrame(resizeRafRef.current);
    };
  }, [
    applyResizeOverlayPatch,
    clientPointToSvg,
    commitResize,
    positionsByZoneId,
    resolvedSize,
  ]);

  const handleResizeHandlePointerDown = useCallback(
    (e, handleId) => {
      if (!isEditing || resizingZoneId == null) return;
      e.preventDefault();
      e.stopPropagation();
      const target = e.currentTarget;
      if (target?.setPointerCapture) {
        try {
          target.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      livePatchRef.current = null;
      resizeDragRef.current = {
        zoneId: resizingZoneId,
        handleId,
        pointerId: e.pointerId,
      };
    },
    [isEditing, resizingZoneId]
  );

  return {
    registerResizeOverlay,
    handleResizeHandlePointerDown,
    endResizeMode,
    resizeDragRef,
  };
};
