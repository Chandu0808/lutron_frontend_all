const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, '..', 'src', 'variants', 'basic', 'screens', 'dashboard', 'Dashboard.jsx');
const lines = fs.readFileSync(dashboardPath, 'utf8').split(/\r?\n/);

const extras = lines.slice(3590, 3845).join('\n').replace(/^\s*\{showDurationControls && \(\s*\n/, '').replace(/\s*\)\}\s*$/, '');
const blank = lines.slice(3858, 3886).join('\n').replace(/^\s*\{blank \? \(\s*\n/, '').replace(/\s*\) : [^}]+\}\s*$/, '');

const fragment = `  const renderEnergyLineChartEmptyExtras = () => (
${extras}
  );

  const renderEnergyLineBlankPreview = (ec) => (
${blank.replace(/\bec\./g, 'ec.')}
  );

  // Update the EnergyLineChart component to handle combined areas
  const EnergyLineChart = React.memo(({ title, data, colors = ['#e57373', '#64b5f6', '#81c784', '#ffd54f'], onEmail, onDownload, isLoading = false, chartSurface = 'dark', emptyStateVariant = 'message', showDurationControls = false }) => {
    const ec = React.useMemo(() => resolveEnergyChartTheme({ chartSurface }), [chartSurface]);
    const light = chartSurface === 'light';
    const energyLightLineOuterStyle = light
      ? { height: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX, minHeight: ENERGY_LIGHT_FULL_CARD_HEIGHT_PX }
      : {};

    const exportControl = (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          data-export-menu="true"
          onClick={() => setShowExportDropdown(prev => ({ ...prev, [title]: !prev[title] }))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: ec.exportBtn,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <FileUploadOutlined sx={{ fontSize: 18, color: 'inherit', flexShrink: 0 }} aria-hidden />
          Export
        </button>
        {showExportDropdown[title] && (
          <div
            data-export-dropdown-panel
            ref={(el) => { exportDropdownRefs.current[title] = el; }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: ec.dropdownBg,
              border: ec.dropdownBorder,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '180px',
              padding: '8px 0',
            }}
          >
            <button
              onClick={onEmail}
              disabled={exportLoading[\`\${title}_email\`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[\`\${title}_email\`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[\`\${title}_email\`] ? ec.dropdownMuted : ec.dropdownText,
                fontWeight: '500',
                borderBottom: \`1px solid \${ec.dropdownSep}\`,
                opacity: exportLoading[\`\${title}_email\`] ? 0.6 : 1,
              }}
            >
              {exportLoading[\`\${title}_email\`] ? '⏳ Sending...' : 'Send By Email'}
            </button>
            <button
              onClick={onDownload}
              disabled={exportLoading[\`\${title}_download\`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[\`\${title}_download\`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[\`\${title}_download\`] ? ec.dropdownMuted : ec.dropdownText,
                fontWeight: '500',
                opacity: exportLoading[\`\${title}_download\`] ? 0.6 : 1,
              }}
            >
              {exportLoading[\`\${title}_download\`] ? '⏳ Downloading...' : 'Download To PC'}
            </button>
          </div>
        )}
      </div>
    );

    return (
      <EnergyLineChartAdapter
        title={title}
        data={data}
        colors={colors}
        onEmail={onEmail}
        onDownload={onDownload}
        isLoading={isLoading}
        chartSurface={chartSurface}
        emptyStateVariant={emptyStateVariant}
        transformDataForCharts={transformDataForCharts}
        selectedDuration={selectedDuration}
        currentDate={currentDate}
        currentYear={currentYear}
        selectedAreas={selectedAreas}
        shellVariant="basic-energy"
        strokeWidthProfile="standard"
        exportControl={exportControl}
        emptyStateExtras={showDurationControls ? renderEnergyLineChartEmptyExtras() : null}
        blankChartPreview={emptyStateVariant === 'blank' ? renderEnergyLineBlankPreview(ec) : null}
        ChartLoader={ChartLoader}
        outerStyleOverride={energyLightLineOuterStyle}
        titleStyleOverride={{ ...chartHeaderStyle, color: ec.header }}
        loaderLight={light}
      />
    );
  }, energyLineChartPropsAreEqual);

`;

fs.writeFileSync(path.join(__dirname, 'fragments', 'energy-line-chart-basic.jsx'), fragment);
console.log('wrote basic fragment', fragment.split('\n').length, 'lines');
