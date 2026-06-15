  // Update the ConsumptionPieChart component to maintain same height
  const ConsumptionPieChart = React.memo(({ title, data, onEmail, onDownload, isLoading = false }) => {
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
      <ConsumptionPieChartAdapter
        title={title}
        data={data}
        onEmail={onEmail}
        onDownload={onDownload}
        isLoading={isLoading}
        areaGroups={areaGroups}
        shellVariant="advanced-card"
        exportControl={exportControl}
        ChartLoader={ChartLoader}
        outerStyleOverride={{ background: cardBackground, border: CARD_BORDER, boxShadow: CARD_SHADOW }}
        titleStyleOverride={chartHeaderStyle}
        cssTooltipStyle={DASHBOARD_CHART_TOOLTIP_STYLE}
        resolveThemePalette={(count) => getThemeAwarePieColors(backgroundColor, count)}
        resolveSegmentLabelColors={(segmentColor) => resolvePieChartLabelColors(backgroundColor, segmentColor)}
      />
    );
  }, consumptionPieChartPropsAreEqual);
