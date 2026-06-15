  // Instant Occupancy Count Chart Component (`chartSurface="light"` for combined Space Utilization card)
  const InstantOccupancyChartComponent = ({ chartSurface = 'dark' } = {}) => (
    <InstantOccupancyChartAdapter
      instantOccupancyCount={instantOccupancyCount}
      instantOccupancyCountLoading={instantOccupancyCountLoading}
      instantOccupancyCountError={instantOccupancyCountError}
      anyLoading={anyLoading}
      isLoading={isLoading}
      globalLoadingProp={globalLoadingProp}
      selectedDuration={selectedDuration}
      currentDate={currentDate}
      currentYear={currentYear}
      customDateRange={customDateRange}
      isNavigating={isNavigating}
      shellVariant="basic"
      chartSurface={chartSurface}
      showChartsTab={showChartsTab}
      enableUtilizationFooter
    />
  );
