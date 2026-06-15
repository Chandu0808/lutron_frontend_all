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
      shellVariant="customized"
      isFullscreen={isUtilizationFullscreen}
    />
  );
