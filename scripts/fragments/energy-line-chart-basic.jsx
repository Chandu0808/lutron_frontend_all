  const renderEnergyLineChartEmptyExtras = () => (
          {showDurationControls && (
            <div style={{ width: '100%', maxWidth: 330, margin: '0 auto 10px auto' }}>
              <div style={{ position: 'relative', width: '100%', marginBottom: '8px' }}>
                <select
                  value={selectedDuration}
                  onChange={handleDurationChange}
                  disabled={globalLoading}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: globalLoading ? '#f5f5f5' : 'white',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: globalLoading ? 'not-allowed' : 'pointer',
                    opacity: globalLoading ? 0.6 : 1,
                    fontFamily: 'inherit',
                    appearance: 'none',
                    backgroundImage:
                      'url("data:image/svg+xml;charset=US-ASCII,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 4 5\'><path fill=\'%231565C0\' d=\'M2 0L0 2h4zm0 5L0 3h4z\'/></svg>")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 8px center',
                    backgroundSize: '10px',
                    paddingRight: '28px',
                    minHeight: '32px',
                  }}
                >
                  <option value="">Select Duration</option>
                  <option value="this-day">This Day</option>
                  <option value="this-week">This Week</option>
                  <option value="this-month">This Month</option>
                  <option value="this-year">This Year</option>
                  <option value="custom">Custom Period</option>
                </select>
              </div>
              <div
                style={{
                  background: 'white',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  border: '1px solid #ccc',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  flexWrap: 'nowrap',
                  minHeight: '32px',
                }}
              >
                {selectedDuration === 'custom' ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isLargeScreen ? '6px' : isMediumScreen ? '4px' : '2px',
                      width: '100%',
                      justifyContent: 'center',
                      flexWrap: 'nowrap',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ position: 'relative', minWidth: 0, flex: '1 1 auto', maxWidth: '45%' }}>
                      {!((customDateRange.startDate || '').split('T')[0]) && (
                        <span
                          style={{
                            position: 'absolute',
                            left: isLargeScreen ? 8 : 6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#333',
                            fontSize: isLargeScreen ? '12px' : '11px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          DD-MM-YYYY
                        </span>
                      )}
                      <input
                        type="date"
                        value={(customDateRange.startDate || '').split('T')[0]}
                        onChange={(e) =>
                          dispatch(
                            setCustomDateRangeImmediate({
                              startDate: e.target.value,
                              endDate: (customDateRange.endDate || '').split('T')[0],
                            })
                          )
                        }
                        style={{
                          padding: isLargeScreen ? '6px' : isMediumScreen ? '4px' : '3px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          fontSize: isLargeScreen ? '12px' : '11px',
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          minWidth: 0,
                          width: '100%',
                          boxSizing: 'border-box',
                          color: ((customDateRange.startDate || '').split('T')[0]) ? undefined : 'transparent',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontWeight: 600,
                        color: '#333',
                        fontSize: isLargeScreen ? '12px' : isMediumScreen ? '11px' : '10px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      to
                    </span>
                    <div style={{ position: 'relative', minWidth: 0, flex: '1 1 auto', maxWidth: '45%' }}>
                      {!((customDateRange.endDate || '').split('T')[0]) && (
                        <span
                          style={{
                            position: 'absolute',
                            left: isLargeScreen ? 8 : 6,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#333',
                            fontSize: isLargeScreen ? '12px' : '11px',
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            pointerEvents: 'none',
                            userSelect: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          DD-MM-YYYY
                        </span>
                      )}
                      <input
                        type="date"
                        value={(customDateRange.endDate || '').split('T')[0]}
                        onChange={(e) =>
                          dispatch(
                            setCustomDateRangeImmediate({
                              startDate: (customDateRange.startDate || '').split('T')[0],
                              endDate: e.target.value,
                            })
                          )
                        }
                        style={{
                          padding: isLargeScreen ? '6px' : isMediumScreen ? '4px' : '3px',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          fontSize: isLargeScreen ? '12px' : '11px',
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          minWidth: 0,
                          width: '100%',
                          boxSizing: 'border-box',
                          color: ((customDateRange.endDate || '').split('T')[0]) ? undefined : 'transparent',
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={
                        globalLoading
                          ? undefined
                          : (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handlePrevious()
                          }
                      }
                      disabled={globalLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: globalLoading ? '#ccc' : '#1565C0',
                        cursor: globalLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        userSelect: 'none',
                        textAlign: 'center',
                        opacity: globalLoading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        padding: '2px 6px',
                        borderRadius: '2px',
                        transition: 'all 0.2s ease',
                      }}
                      title="Previous"
                    >
                      ‹ Previous
                    </button>
                    <span
                      style={{
                        color: '#333',
                        fontWeight: 500,
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        textAlign: 'center',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        flex: 1,
                        padding: '0 8px',
                      }}
                      title={getCurrentPeriodText()}
                    >
                      {getCurrentPeriodText()}
                    </span>
                    <button
                      onClick={
                        globalLoading
                          ? undefined
                          : (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleNext()
                          }
                      }
                      disabled={globalLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: globalLoading ? '#ccc' : '#1565C0',
                        cursor: globalLoading ? 'not-allowed' : 'pointer',
                        fontWeight: 500,
                        fontSize: '12px',
                        fontFamily: 'inherit',
                        userSelect: 'none',
                        textAlign: 'center',
                        opacity: globalLoading ? 0.5 : 1,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        padding: '2px 6px',
                        borderRadius: '2px',
                        transition: 'all 0.2s ease',
                      }}
                      title="Next"
                    >
                      Next ›
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
  );

  const renderEnergyLineBlankPreview = (ec) => (
            {blank ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={Array.from({ length: 24 }, (_, i) => ({ date: `${String(i).padStart(2, '0')}:00` }))}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid stroke={ec.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke={ec.axis}
                    fontSize={10}
                    tick={{ fill: ec.tick, fontWeight: 600, fontSize: 10 }}
                    axisLine={{ stroke: ec.axis }}
                    tickLine={{ stroke: ec.axis }}
                    interval={3}
                    angle={-45}
                    textAnchor="end"
                    height={44}
                    type="category"
                  />
                  <YAxis
                    stroke={ec.axis}
                    fontSize={10}
                    tick={{ fill: ec.tick, fontWeight: 600, fontSize: 10 }}
                    axisLine={{ stroke: ec.axis }}
                    tickLine={{ stroke: ec.axis }}
                    width={50}
                    tickCount={6}
                  />
                </LineChart>
              </ResponsiveContainer>
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
              disabled={exportLoading[`${title}_email`]}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                cursor: exportLoading[`${title}_email`] ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: exportLoading[`${title}_email`] ? ec.dropdownMuted : ec.dropdownText,
                fontWeight: '500',
                borderBottom: `1px solid ${ec.dropdownSep}`,
                opacity: exportLoading[`${title}_email`] ? 0.6 : 1,
              }}
            >
              {exportLoading[`${title}_email`] ? '⏳ Sending...' : 'Send By Email'}
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
                color: exportLoading[`${title}_download`] ? ec.dropdownMuted : ec.dropdownText,
                fontWeight: '500',
                opacity: exportLoading[`${title}_download`] ? 0.6 : 1,
              }}
            >
              {exportLoading[`${title}_download`] ? '⏳ Downloading...' : 'Download To PC'}
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

