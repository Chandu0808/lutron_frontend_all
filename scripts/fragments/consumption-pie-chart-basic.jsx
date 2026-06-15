  // Update the ConsumptionPieChart component to maintain same height
  const ConsumptionPieChart = React.memo(({ title, data, onEmail, onDownload, isLoading = false, chartSurface = 'dark' }) => {
    const light = chartSurface === 'light';
    const dc = useMemo(() => resolvePieChartTheme({ chartSurface }), [chartSurface]);
    const energyLightPieOuterStyle = light
      ? { height: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX, minHeight: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX }
      : {};

    const pieTitleStyle = useMemo(
      () => ({ ...chartHeaderStyle, color: dc.header }),
      [dc]
    );

    const exportMenuKey = TOTAL_CONSUMPTION_BY_GROUP_EXPORT_KEY;

    const exportControl = (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          data-export-menu="true"
          onClick={() =>
            setShowExportDropdown((prev) => ({
              ...prev,
              [exportMenuKey]: !prev[exportMenuKey],
            }))
          }
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: dc.exportBtn,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <FileUploadOutlined sx={{ fontSize: 18, color: 'inherit', flexShrink: 0 }} aria-hidden />
          Export
        </button>
        {showExportDropdown[exportMenuKey] && (
          <div
            data-export-dropdown-panel
            ref={(el) => {
              exportDropdownRefs.current[exportMenuKey] = el;
            }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: dc.dropdownBg,
              border: dc.dropdownBorder,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '180px',
              padding: '8px 0',
            }}
          >
            <button
              type="button"
              onClick={onEmail}
              disabled={exportLoading[`${exportMenuKey}_email`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[`${exportMenuKey}_email`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[`${exportMenuKey}_email`] ? dc.dropdownMuted : dc.dropdownText,
                fontWeight: '500',
                borderBottom: `1px solid ${dc.dropdownSep}`,
                opacity: exportLoading[`${exportMenuKey}_email`] ? 0.6 : 1,
              }}
            >
              {exportLoading[`${exportMenuKey}_email`] ? '⏳ Sending...' : 'Send By Email'}
            </button>
            <button
              type="button"
              onClick={onDownload}
              disabled={exportLoading[`${exportMenuKey}_download`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[`${exportMenuKey}_download`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[`${exportMenuKey}_download`] ? dc.dropdownMuted : dc.dropdownText,
                fontWeight: '500',
                opacity: exportLoading[`${exportMenuKey}_download`] ? 0.6 : 1,
              }}
            >
              {exportLoading[`${exportMenuKey}_download`] ? '⏳ Downloading...' : 'Download To PC'}
            </button>
          </div>
        )}
      </div>
    );

    return (
      <ConsumptionPieChartAdapter
        title={title}
        data={data}
        onEmail={onEmail}
        onDownload={onDownload}
        isLoading={isLoading}
        chartSurface={chartSurface}
        areaGroups={areaGroups}
        shellVariant="basic-energy"
        exportControl={exportControl}
        ChartLoader={ChartLoader}
        outerStyleOverride={energyLightPieOuterStyle}
        titleStyleOverride={pieTitleStyle}
        loaderLight={light}
      />
    );
  }, consumptionPieChartPropsAreEqual);
