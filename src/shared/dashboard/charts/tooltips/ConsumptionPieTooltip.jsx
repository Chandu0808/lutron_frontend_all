import React, { useMemo } from 'react';
import { Tooltip } from 'recharts';
import { formatConsumptionPieTooltipValue } from '../config/consumptionPieChartConfig';

/**
 * Recharts tooltip formatter for consumption pie charts.
 */
export function ConsumptionPieTooltip({
  theme,
  pieData,
  cssTooltipStyle,
  active,
  payload,
  label,
}) {
  if (!active || !payload?.length) return null;

  const name = payload[0]?.name ?? label;
  const value = formatConsumptionPieTooltipValue(pieData, name);

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
    <div style={contentStyle}>
      <p style={{ margin: 0, color: theme.tooltipText, fontWeight: 600 }}>{name}</p>
      <p style={{ margin: '4px 0 0', color: theme.tooltipText }}>{value}</p>
    </div>
  );
}

/** Hook-style factory for Recharts Tooltip content prop. */
export function useConsumptionPieTooltipContent(theme, pieData, cssTooltipStyle) {
  return useMemo(
    () =>
      function ConsumptionPieTooltipContent(props) {
        return (
          <ConsumptionPieTooltip
            {...props}
            theme={theme}
            pieData={pieData}
            cssTooltipStyle={cssTooltipStyle}
          />
        );
      },
    [theme, pieData, cssTooltipStyle]
  );
}

/** Legacy formatter tuple for default Recharts Tooltip (advanced/basic inline parity). */
export function createConsumptionPieTooltipFormatter(pieData) {
  return (value, name) => [formatConsumptionPieTooltipValue(pieData, name), name];
}

export function ConsumptionPieDefaultTooltip({ theme, pieData, cssTooltipStyle }) {
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
      formatter={createConsumptionPieTooltipFormatter(pieData)}
      labelStyle={{ color: theme.tooltipText }}
    />
  );
}
