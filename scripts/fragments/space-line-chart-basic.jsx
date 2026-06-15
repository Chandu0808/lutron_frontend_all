  // Occupancy trends chart (filled area under curve — same data/tooltips as before)
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
      shellVariant="basic"
      spaceShell={spaceShell}
    />
  );
