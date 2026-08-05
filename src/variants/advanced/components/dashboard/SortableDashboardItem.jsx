import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Drag/rearrange + span/fullscreen chrome for advanced dashboard cards.
 * spanMode "energy" uses 12 for full width; "space" uses 2 for full width.
 */
export default function SortableDashboardItem({
  id,
  disabled,
  order,
  span,
  spanMode = 'energy',
  showSpanToggle,
  onToggleSpan,
  showHeightToggle,
  isFullscreen,
  onToggleFullscreen,
  rowSpan,
  children,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  const [isHovered, setIsHovered] = useState(false);
  const showControls = Boolean(isFullscreen || isHovered);
  const isFullWidth = spanMode === 'space' ? span === 2 : span === 12;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    cursor: disabled || isFullscreen ? 'default' : 'grab',
    touchAction: 'none',
    width: '100%',
    height: isFullscreen ? '100%' : 'auto',
    order: typeof order === 'number' ? order : undefined,
    gridColumn: isFullWidth ? '1 / -1' : undefined,
    gridRow: rowSpan && Number(rowSpan) > 1 ? `span ${Number(rowSpan)}` : undefined,
    minHeight: 0,
    minWidth: 0,
    boxSizing: 'border-box',
    position: isFullscreen ? 'fixed' : 'relative',
    ...(isFullscreen
      ? {
          inset: 0,
          zIndex: 2000,
          background: 'rgba(0,0,0,0.55)',
          padding: 48,
          display: 'flex',
          flexDirection: 'column',
        }
      : null),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(!disabled && !isFullscreen ? listeners : {})}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (isFullscreen) e.stopPropagation();
      }}
      onClick={(e) => {
        if (!isFullscreen) return;
        if (e?.target === e?.currentTarget && typeof onToggleFullscreen === 'function') {
          onToggleFullscreen(id);
          return;
        }
        e.stopPropagation();
      }}
    >
      {showSpanToggle || showHeightToggle ? (
        <div
          style={{
            opacity: showControls ? 1 : 0,
            pointerEvents: showControls ? 'auto' : 'none',
            transition: 'opacity 150ms ease',
          }}
        >
          {showSpanToggle ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof onToggleSpan === 'function') onToggleSpan(id);
              }}
              title={isFullWidth ? 'Make half width' : 'Make full width'}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 5,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {isFullWidth ? '½' : '↔'}
            </button>
          ) : null}
          {showHeightToggle ? (
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (typeof onToggleFullscreen === 'function') onToggleFullscreen(id);
              }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{
                position: 'absolute',
                top: 36,
                right: 8,
                zIndex: 5,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(0,0,0,0.35)',
                color: '#fff',
                borderRadius: 999,
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              ↕
            </button>
          ) : null}
        </div>
      ) : null}
      {isFullscreen ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            filter: 'saturate(1.35) brightness(1.08)',
          }}
        >
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (typeof onToggleFullscreen === 'function') onToggleFullscreen(id);
            }}
            title="Close"
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              zIndex: 3000,
              border: '1px solid rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              borderRadius: 999,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
            }}
          >
            ✕
          </button>
          <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {children}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
