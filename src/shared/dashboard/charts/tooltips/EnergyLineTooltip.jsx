import React from 'react';
import { formatPeakMinTimeLabel } from '../transforms/formatPeakMinTimeLabel';

/**
 * Energy line chart tooltip — week date→weekday conversion matches legacy inline tooltip.
 */
export function EnergyLineTooltip({
  active,
  payload,
  label,
  theme,
  dynamicUnit,
  selectedDuration,
  currentDate,
  useCssTooltipStyle = false,
  cssTooltipStyle,
}) {
  if (!active || !payload || !payload.length) return null;

  const formattedLabel = formatPeakMinTimeLabel(label, selectedDuration, currentDate);

  const boxStyle = useCssTooltipStyle
    ? { ...cssTooltipStyle, padding: '10px' }
    : {
        backgroundColor: theme.tooltipBg,
        border: theme.tooltipBorder,
        borderRadius: '4px',
        padding: '10px',
        color: theme.tooltipText,
        fontSize: '12px',
      };

  return (
    <div style={boxStyle}>
      <p
        style={{
          margin: '0 0 8px 0',
          fontWeight: 'bold',
          borderBottom: `1px solid ${theme.tooltipTitleBorder}`,
          paddingBottom: '4px',
        }}
      >
        {formattedLabel}
      </p>
      {payload.map((entry, index) => (
        <p
          key={index}
          style={{
            margin: '4px 0',
            color: theme.tooltipText,
            fontWeight: '500',
          }}
        >
          {entry.name}: {entry.value}
          {dynamicUnit ? ` ${dynamicUnit}` : ''}
        </p>
      ))}
    </div>
  );
}
