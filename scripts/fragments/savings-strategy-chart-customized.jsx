  // Add Savings Strategy Chart component
  // Add Savings Strategy Donut (Recharts, same style as Utilization)
  const SavingsStrategyChart = React.memo(({ title, isLoading = false }) => (
    <SavingsStrategyChartAdapter
      title={title}
      savingsByStrategy={savingsByStrategy}
      isLoading={isLoading}
      globalLoading={globalLoading}
      shellVariant="customized-builtin"
      ChartLoader={ChartLoader}
      cardShellStyle={BUILTIN_CHART_CARD}
      plotStyleOverride={BUILTIN_PIE_PLOT_BOX}
      headerStyleOverride={chartHeaderStyle}
      loaderHeight={BUILTIN_CHART_LOADER_HEIGHT}
    />
  ), savingsStrategyChartPropsAreEqual);
