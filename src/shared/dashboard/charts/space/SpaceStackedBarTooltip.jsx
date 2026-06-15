import React from 'react';

export function SpaceStackedBarTooltip({ active, payload, label, theme }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: theme.tooltipBg,
        background: theme.tooltipBg,
        border: theme.tooltipBorder,
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
        {label}
      </p>
      {payload.map((entry, index) => (
        <p
          key={index}
          style={{
            margin: '4px 0',
            color: entry.color,
            fontWeight: '500',
          }}
        >
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

export default SpaceStackedBarTooltip;
