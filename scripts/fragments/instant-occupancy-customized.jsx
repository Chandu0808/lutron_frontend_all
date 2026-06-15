  // Instant Occupancy Count Chart Component
  const InstantOccupancyChartComponent = () => (
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
      shellVariant="customized"
      isFullscreen={isInstantOccupancyFullscreen}
    />
  );
