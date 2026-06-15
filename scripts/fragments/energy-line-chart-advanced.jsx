  // Update the EnergyLineChart component to handle combined areas
  const EnergyLineChart = React.memo(({ title, data, colors = ['#e57373', '#64b5f6', '#81c784', '#ffd54f'], onEmail, onDownload, isLoading = false }) => {
    const exportControl = (
      <>
        <ChartExportButton
          onClick={() => setShowExportDropdown(prev => ({ ...prev, [title]: !prev[title] }))}
        />
        {showExportDropdown[title] && (
          <ChartExportDropdown
            innerRef={(el) => { exportDropdownRefs.current[title] = el; }}
            panelStyle={{ marginTop: 0 }}
            onEmail={onEmail}
            onDownload={onDownload}
            emailLoading={exportLoading[`${title}_email`]}
            downloadLoading={exportLoading[`${title}_download`]}
          />
        )}
      </>
    );

    return (
      <EnergyLineChartAdapter
        title={title}
        data={data}
        colors={colors}
        onEmail={onEmail}
        onDownload={onDownload}
        isLoading={isLoading}
        transformDataForCharts={transformDataForCharts}
        selectedDuration={selectedDuration}
        currentDate={currentDate}
        currentYear={currentYear}
        selectedAreas={selectedAreas}
        shellVariant="advanced-card"
        strokeWidthProfile="standard"
        exportControl={exportControl}
        ChartLoader={ChartLoader}
        outerStyleOverride={{ background: cardBackground, border: CARD_BORDER, boxShadow: CARD_SHADOW }}
        titleStyleOverride={chartHeaderStyle}
        cssTooltipStyle={DASHBOARD_CHART_TOOLTIP_STYLE}
        resolveThemePalette={(count, opts) => buildThemeAwareChartPalette(backgroundColor, count, opts)}
      />
    );
  }, energyLineChartPropsAreEqual);
