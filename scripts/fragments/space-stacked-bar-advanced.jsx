  // Pie Chart Component for Area Groups - Updated to use percentages
  const StackedBarChartComponent = () => (
    <SpaceStackedBarChartAdapter
      activeOccupancyByGroup={activeOccupancyByGroup}
      activeOccupancyByGroupLoading={activeOccupancyByGroupLoading}
      anyLoading={anyLoading}
      isLoading={isLoading}
      globalLoadingProp={globalLoadingProp}
      shellVariant="advanced"
      stackedBarColors={stackedBarColors}
      colorPalette={chartPalette}
      cardBackground={CARD_BACKGROUND}
      cardBorder={CARD_BORDER}
      cardShadow={CARD_SHADOW}
      requireAreaGroupName
    />
  );
