import React from 'react';
import { Tooltip } from 'recharts';
import { formatSavingsStrategyTooltipValue } from './savingsStrategyConfig';

export function SavingsStrategyDefaultTooltip({ theme, cssTooltipStyle }) {
  const contentStyle = theme.useCssTooltipVars
    ? cssTooltipStyle
    : {
        backgroundColor: theme.tooltipBg,
        border: theme.tooltipBorder,
        borderRadius: '4px',
        color: theme.tooltipText,
        fontSize: '12px',
      };

  return (
    <Tooltip
      contentStyle={contentStyle}
      formatter={(value, name) => [formatSavingsStrategyTooltipValue(value), name]}
      labelStyle={{ color: theme.tooltipText }}
    />
  );
}
