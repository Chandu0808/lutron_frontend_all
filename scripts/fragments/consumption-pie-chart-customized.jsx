  // Update the ConsumptionPieChart component to maintain same height
  const ConsumptionPieChart = React.memo(({ title, data, onEmail, onDownload, isLoading = false }) => {
    const exportControl = (
      <>
        <button
          onClick={() => setShowExportDropdown(prev => ({ ...prev, [title]: !prev[title] }))}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FileUploadIcon fontSize="small" /> Export
        </button>
        {showExportDropdown[title] && (
          <div
            ref={el => exportDropdownRefs.current[title] = el}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: '#CDC0A0',
              border: '1px solid #444',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 1000,
              minWidth: '180px',
              padding: '8px 0'
            }}
          >
            <button
              onClick={onEmail}
              disabled={exportLoading[`${title}_email`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[`${title}_email`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[`${title}_email`] ? '#999' : '#fff',
                fontWeight: '500',
                borderBottom: '1px solid #444',
                opacity: exportLoading[`${title}_email`] ? 0.6 : 1
              }}
            >
              {exportLoading[`${title}_email`] ? '⏳ Sending...' : ' Send By Email'}
            </button>
            <button
              onClick={onDownload}
              disabled={exportLoading[`${title}_download`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[`${title}_download`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[`${title}_download`] ? '#999' : '#fff',
                fontWeight: '500',
                opacity: exportLoading[`${title}_download`] ? 0.6 : 1
              }}
            >
              {exportLoading[`${title}_download`] ? '⏳ Downloading...' : ' Download To PC'}
            </button>
          </div>
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
        areaIdToDisplayName={areaIdToDisplayName}
        shellVariant="customized-builtin"
        exportControl={exportControl}
        ChartLoader={ChartLoader}
        cardShellStyle={BUILTIN_CHART_CARD}
        cardHeaderStyle={BUILTIN_CHART_HEADER_ROW}
        plotStyleOverride={BUILTIN_PIE_PLOT_BOX}
        loaderHeight={BUILTIN_CHART_LOADER_HEIGHT}
        showFetchErrorState
        showZeroSegmentsState
      />
    );
  }, consumptionPieChartPropsAreEqual);
