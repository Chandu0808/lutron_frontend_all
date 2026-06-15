import React from 'react';
import { formatInstantOccupancyTooltipLabel } from './instantOccupancyConfig';
import { shouldShowSpaceOccupancyPercentage } from './spaceLineChartConfig';

export function InstantOccupancyTooltip({
  active,
  payload,
  label,
  theme,
  selectedDuration,
  currentDate,
  customDateRange,
}) {
  if (!active || !payload || !payload.length) return null;

  const formattedLabel = formatInstantOccupancyTooltipLabel(label, {
    selectedDuration,
    currentDate,
  });
  const showPercentageInTooltip = shouldShowSpaceOccupancyPercentage(
    selectedDuration,
    customDateRange
  );

  return (
    <div
      style={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: '4px',
        padding: '10px',
        color: theme.tooltipText,
        fontSize: '12px',
        ...(theme.shellStyle || {}),
      }}
    >
      <p
        style={{
          margin: '0 0 8px 0',
          fontWeight: 'bold',
          borderBottom: `1px solid ${theme.tooltipHeadBorder}`,
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
          Occupancy: {entry.value}
          {showPercentageInTooltip ? ' %' : ''}
        </p>
      ))}
    </div>
  );
}

export default InstantOccupancyTooltip;
