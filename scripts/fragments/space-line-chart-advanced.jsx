  // Line Chart Component - Remove hardcoded sample data
  const LineChartComponent = () => (
    <SpaceLineChartAdapter
      occupancyCount={occupancyCount}
      occupancyCountLoading={occupancyCountLoading}
      anyLoading={anyLoading}
      isLoading={isLoading}
      globalLoadingProp={globalLoadingProp}
      selectedDuration={selectedDuration}
      currentDate={currentDate}
      currentYear={currentYear}
      customDateRange={customDateRange}
      isNavigating={isNavigating}
      shellVariant="advanced"
      lineSeriesColor={occupancyLineColor}
      cardBackground={CARD_BACKGROUND}
      cardBorder={CARD_BORDER}
      cardShadow={CARD_SHADOW}
    />
  );
