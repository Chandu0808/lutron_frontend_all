  // Add Savings Strategy Chart component
  // Add Savings Strategy Donut (Recharts, same style as Utilization)
  const SavingsStrategyChart = React.memo(({ title, isLoading = false }) => (
    <SavingsStrategyChartAdapter
      title={title}
      savingsByStrategy={savingsByStrategy}
      isLoading={isLoading}
      globalLoading={globalLoading}
      shellVariant="advanced-card"
      ChartLoader={ChartLoader}
      outerStyleOverride={{
        background: cardBackground,
        border: CARD_BORDER,
        boxShadow: CARD_SHADOW,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
      }}
      plotStyleOverride={{
        height: '360px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: 'transparent',
        userSelect: 'none',
      }}
      headerStyleOverride={chartHeaderStyle}
      loaderHeight="300px"
      cssTooltipStyle={DASHBOARD_CHART_TOOLTIP_STYLE}
      resolveThemeColor={(name) => getThemeAwareSavingsStrategyColor(name, backgroundColor)}
      resolveSegmentLabelColors={(segmentColor) => resolvePieChartLabelColors(backgroundColor, segmentColor)}
      cardClassName="chart-card-animated"
    />
  ), savingsStrategyChartPropsAreEqual);
