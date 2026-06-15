  // Add Savings Strategy Chart component
  // Add Savings Strategy Donut (Recharts, same style as Utilization)
  const SavingsStrategyChart = React.memo(({
    title,
    isLoading = false,
    embedded = false,
    chartSurface = 'dark',
    customDatesIncomplete = false,
  }) => {
    const light = chartSurface === 'light';

    const outerStyleOverride = useMemo(() => {
      if (embedded) {
        return {
          width: '100%',
          height: '100%',
          minHeight: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 0,
          padding: 0,
          boxShadow: 'none',
          marginBottom: 0,
          flex: 1,
        };
      }
      if (light) {
        return {
          ...energyChartSlotOuterStyle,
          backgroundColor: '#ffffff',
          border: '1px solid #e8e8e8',
          height: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX,
          minHeight: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX,
        };
      }
      return energyChartSlotOuterStyle;
    }, [embedded, light]);

    const plotStyleOverride = useMemo(() => {
      if (embedded) {
        return {
          ...energyChartPlotFlexStyle,
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
        };
      }
      if (light) {
        return {
          ...energyChartPlotFlexStyle,
          backgroundColor: '#ffffff',
          border: '1px solid #e0e0e0',
        };
      }
      return energyChartPlotFlexStyle;
    }, [embedded, light]);

    const stratTitleStyle = useMemo(() => {
      if (embedded) return { ...chartHeaderStyle, color: '#1565C0' };
      if (light) return { ...chartHeaderStyle, color: '#000000' };
      return chartHeaderStyle;
    }, [embedded, light]);

    return (
      <SavingsStrategyChartAdapter
        title={title}
        savingsByStrategy={savingsByStrategy}
        isLoading={isLoading}
        globalLoading={globalLoading}
        chartSurface={chartSurface}
        embedded={embedded}
        customDatesIncomplete={customDatesIncomplete}
        shellVariant="basic-energy"
        ChartLoader={ChartLoader}
        outerStyleOverride={outerStyleOverride}
        plotStyleOverride={plotStyleOverride}
        headerStyleOverride={stratTitleStyle}
        loaderLight={light}
      />
    );
  }, savingsStrategyChartPropsAreEqual);
