  // Pie Chart Component for Area Groups - Updated to use percentages
  const StackedBarChartComponent = () => (
    <SpaceStackedBarChartAdapter
      activeOccupancyByGroup={activeOccupancyByGroup}
      activeOccupancyByGroupLoading={activeOccupancyByGroupLoading}
      anyLoading={anyLoading}
      isLoading={isLoading}
      globalLoadingProp={globalLoadingProp}
      shellVariant="basic"
      spaceShell={spaceShell}
      showChartsTab={showChartsTab}
      colorPalette={COLORS}
      requireAreaGroupName
    />
  );
