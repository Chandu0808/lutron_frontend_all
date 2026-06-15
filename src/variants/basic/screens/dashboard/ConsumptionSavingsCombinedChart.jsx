/**
 * Combined Consumption + Savings chart.
 * Blue series = consumption. Red dashed horizontal line = connected load ceiling for the view
 * (max connected-load value in the series — same role as a “full load / 100% of budget” line in reference UIs).
 * Savings are not drawn as an area; tooltip lists Consumption, Savings, Connected load.
 * Export menu matches standalone Consumption chart (Send By Email / Download To PC) when parent passes API handlers; otherwise optional client CSV export.
 */

import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import FileUploadOutlined from '@mui/icons-material/FileUploadOutlined';
import {
  ExportMenuPanel,
  EXPORT_MENU_COPY,
  buildEmailDownloadExportActions,
  resolveEnergyExportMenuPresetFromTheme,
} from '../../../../shared/dashboard/export/components';
import {
  computeCo2KgFromEnergySavings,
  formatCo2Kg,
  summarizeMergedConsumptionSavings,
} from '../../utils/shadesWidgetSettings';
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

const CONSUMPTION_COLOR = '#1565C0';
const CONNECTED_LOAD_COLOR = '#C62828';

const chartHeaderStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: '#000000'
};

/** Same target as `Dashboard` ENERGY_LIGHT_FULL_CARD_HEIGHT_PX — keeps combined Energy card aligned with standalone white-theme charts. */
const ENERGY_COMBINED_CARD_MIN_HEIGHT_PX = 420 + 228;

/** Matches Energy line chart light-theme export dropdown (`Dashboard` EnergyLineChart). */
const EXPORT_MENU_STYLES = {
  dropdownBg: '#ffffff',
  dropdownBorder: '1px solid rgba(0,0,0,0.15)',
  dropdownText: 'rgba(0, 0, 0, 0.87)',
  dropdownMuted: 'rgba(0, 0, 0, 0.45)',
  dropdownSep: 'rgba(0, 0, 0, 0.12)',
};

function ConsumptionSavingsCombinedChart({
  mergedData = [],
  unit = 'kWh',
  isLoading = false,
  emptyStateVariant = 'message', // 'message' | 'blank'
  formatXAxisLabel = (v) => v,
  /** When `'this-week'`, axis labels hide duplicate Sat 24 and strip trailing ` 0` from day markers (Sun 0 → Sun). */
  selectedDuration = null,
  /** Optional — notified after legacy client-side CSV export (only when server export props are not used). */
  onDownload,
  /** Same as standalone Consumption chart: API email export. */
  onEmail,
  /** Same as standalone Consumption chart: API CSV download. */
  onDownloadReport,
  exportEmailLoading = false,
  exportDownloadLoading = false,
  title = 'Consumption & Savings',
  contentColor = 'rgba(128, 120, 100, 0.7)',
  strategyContent = null,
  strategyLoading = false,
  topControls = null,
}) {
  // Tabs like the reference image: Consumption | Savings By Strategy
  const [activeSeries, setActiveSeries] = useState('consumption'); // 'consumption' | 'strategy'
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportMenuWrapRef = useRef(null);

  const useServerExportMenu =
    typeof onEmail === 'function' && typeof onDownloadReport === 'function';

  useEffect(() => {
    const handleMouseDown = (event) => {
      if (!showExportDropdown) return;
      const wrap = exportMenuWrapRef.current;
      if (wrap && !wrap.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showExportDropdown]);

  const yAxisMax = useMemo(() => {
    if (!mergedData.length) return null;
    let max = 0;
    mergedData.forEach((row) => {
      const v = row.connectedLoad != null && row.connectedLoad !== '' ? Number(row.connectedLoad) : null;
      if (v != null && !Number.isNaN(v) && v > max) max = v;
    });
    return max > 0 ? max : null;
  }, [mergedData]);

  const summary = useMemo(
    () => summarizeMergedConsumptionSavings(mergedData),
    [mergedData]
  );

  const carbonFootprintKg = useMemo(
    () => computeCo2KgFromEnergySavings(summary.totalSavings, unit),
    [summary.totalSavings, unit]
  );

  /** Legacy client-only CSV when `onEmail` / `onDownloadReport` are not supplied. */
  const handleClientCsvDownload = useCallback(() => {
    if (!mergedData.length) return;
    const headers = ['Time', `Consumption (${unit})`, `Savings (${unit})`, `Connected Load (${unit})`];
    const rows = mergedData.map((row) => [
      row.date,
      row.consumption != null && row.consumption !== '' ? Number(row.consumption) : '',
      row.savings != null && row.savings !== '' ? Number(row.savings) : '',
      row.connectedLoad != null && row.connectedLoad !== '' ? Number(row.connectedLoad) : ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumption_savings_connected_load_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    if (typeof onDownload === 'function') onDownload();
  }, [mergedData, unit, onDownload]);

  const chartConfig = useMemo(() => {
    const n = mergedData.length;
    if (n === 96 || n === 97) return { xAxisInterval: 3, xAxisTickCount: 24, xAxisFontSize: 10, strokeWidth: 1.5, dotSize: 1.5 };
    if (n === 28 || n === 29) return { xAxisInterval: 3, xAxisTickCount: 7, xAxisFontSize: 10, strokeWidth: 2, dotSize: 3 };
    if (n >= 30 && n <= 31) return { xAxisInterval: 0, xAxisTickCount: n, xAxisFontSize: 8, strokeWidth: 2, dotSize: 3 };
    if (n === 48) return { xAxisInterval: 3, xAxisTickCount: 12, xAxisFontSize: 8, strokeWidth: 2, dotSize: 2 };
    return { xAxisInterval: 0, xAxisTickCount: Math.min(n, 12), xAxisFontSize: 10, strokeWidth: 2, dotSize: 3 };
  }, [mergedData.length]);

  const consumptionAxisTickFormatter = useCallback(
    (value, index) => {
      if (selectedDuration === 'this-week' && typeof value === 'string') {
        const t = value.trim();
        if (/^sat\s+24$/i.test(t)) return '';
        const dayAtMidnight = t.match(/^([A-Za-z]{3})\s+0$/);
        if (dayAtMidnight) return dayAtMidnight[1];
      }
      return formatXAxisLabel(value, index);
    },
    [selectedDuration, formatXAxisLabel]
  );

  const yDomain = useMemo(() => {
    if (yAxisMax != null && yAxisMax > 0) return [0, Math.ceil(yAxisMax * 1.05) || yAxisMax];
    return undefined;
  }, [yAxisMax]);

  /** Dashed line stops before the last X category so "100%" can sit to the right without overlapping dashes. */
  const connectedLoadRefSegment = useMemo(() => {
    if (yAxisMax == null || yAxisMax <= 0 || mergedData.length < 3) return null;
    const start = mergedData[0]?.date;
    const end = mergedData[mergedData.length - 2]?.date;
    if (start == null || end == null) return null;
    return [
      { x: start, y: yAxisMax },
      { x: end, y: yAxisMax },
    ];
  }, [mergedData, yAxisMax]);

  const hundredPctRefLabel = useMemo(
    () => ({
      value: '100%',
      position: 'right',
      fill: CONNECTED_LOAD_COLOR,
      fontSize: 11,
      fontWeight: 600,
      offset: 10,
    }),
    []
  );

  const hasData = useMemo(() => {
    if (activeSeries === 'strategy') return true;
    return mergedData.some((row) => {
      const v = row.consumption;
      return v != null && v !== '' && !Number.isNaN(Number(v));
    });
  }, [mergedData, activeSeries]);

  const headerCenterControls = (
    <div
      style={{
        width: 'min(330px, 100%)',
        maxWidth: '100%',
        minWidth: 0,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
    >
      {topControls}
    </div>
  );

  const headerExportOnly =
    activeSeries !== 'strategy' &&
    (useServerExportMenu ? (
      <div ref={exportMenuWrapRef} style={{ position: 'relative' }} data-energy-combined-export>
        <button
          type="button"
          data-export-menu="true"
          onClick={() => setShowExportDropdown((v) => !v)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#1565C0',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <FileUploadOutlined sx={{ fontSize: 18, color: 'inherit', flexShrink: 0 }} aria-hidden />
          Export
        </button>
        {showExportDropdown && (
          <ExportMenuPanel
            panelStyle={{
              ...resolveEnergyExportMenuPresetFromTheme(EXPORT_MENU_STYLES, { useEmoji: true }).panel,
              marginTop: '4px',
            }}
            panelDataAttribute="data-export-dropdown-panel"
            actions={buildEmailDownloadExportActions({
              onEmail: () => {
                setShowExportDropdown(false);
                onEmail();
              },
              onDownload: () => {
                setShowExportDropdown(false);
                onDownloadReport();
              },
              emailLoading: exportEmailLoading,
              downloadLoading: exportDownloadLoading,
              emailLabel: EXPORT_MENU_COPY.email,
              downloadLabel: EXPORT_MENU_COPY.download,
            })}
            itemDefaults={resolveEnergyExportMenuPresetFromTheme(EXPORT_MENU_STYLES, { useEmoji: true }).item}
            useEmoji
          />
        )}
      </div>
    ) : (
      <button
        type="button"
        onClick={handleClientCsvDownload}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          color: '#1565C0',
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        <FileUploadOutlined sx={{ fontSize: 18, color: 'inherit', flexShrink: 0 }} aria-hidden />
        Export
      </button>
    ));

  if (isLoading || (activeSeries === 'strategy' && strategyLoading)) {
    return (
      <div
        style={{
          backgroundColor: contentColor,
          borderRadius: '8px',
          padding: '12px 16px 8px 16px',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
          marginBottom: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 6 }}>
            <h3 style={chartHeaderStyle}>{title}</h3>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              width: '100%',
            }}
          >
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setActiveSeries('consumption')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: activeSeries === 'consumption' ? '#1565C0' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: activeSeries === 'consumption' ? 'underline' : 'none',
                    textUnderlineOffset: 6,
                  }}
                >
                  Consumption
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('strategy')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: activeSeries === 'strategy' ? '#1565C0' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: activeSeries === 'strategy' ? 'underline' : 'none',
                    textUnderlineOffset: 6,
                  }}
                >
                  Savings By Strategy
                </button>
              </div>
            </div>
            {headerCenterControls}
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
              }}
            >
              {headerExportOnly}
            </div>
          </div>
        </div>
        <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: '4px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #555',
              borderTop: '3px solid #333',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
        </div>
      </div>
    );
  }

  // Strategy tab uses `strategyContent` (donut); do not use the consumption line-chart blank frame here.
  if (activeSeries !== 'strategy' && (!hasData || !mergedData.length)) {
    const blank = emptyStateVariant === 'blank'
    const placeholder = blank
      ? Array.from({ length: 24 }, (_, i) => ({
        date: `${String(i).padStart(2, '0')}:00`,
        consumption: null,
        savings: null,
        connectedLoad: null,
      }))
      : []
    return (
      <div
        style={{
          backgroundColor: contentColor,
          borderRadius: '8px',
          padding: '12px 16px 8px 16px',
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
          marginBottom: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 6 }}>
            <h3 style={chartHeaderStyle}>{title}</h3>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              width: '100%',
            }}
          >
            <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <button
                  type="button"
                  onClick={() => setActiveSeries('consumption')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: activeSeries === 'consumption' ? '#1565C0' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: activeSeries === 'consumption' ? 'underline' : 'none',
                    textUnderlineOffset: 6,
                  }}
                >
                  Consumption
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('strategy')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: activeSeries === 'strategy' ? '#1565C0' : '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: activeSeries === 'strategy' ? 'underline' : 'none',
                    textUnderlineOffset: 6,
                  }}
                >
                  Savings By Strategy
                </button>
              </div>
            </div>
            {headerCenterControls}
            <div
              style={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
              }}
            >
              {headerExportOnly}
            </div>
          </div>
        </div>
        <div
          style={{
            height: '420px',
            minHeight: '380px',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            padding: '10px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            color: 'rgba(0,0,0,0.7)',
          }}
        >
          {blank ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={placeholder} margin={{ top: 20, right: 100, left: 20, bottom: 8 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#111827"
                  fontSize={10}
                  tick={{ fill: '#111827', fontWeight: 600, fontSize: 10 }}
                  axisLine={{ stroke: '#111827' }}
                  tickLine={{ stroke: '#111827' }}
                  interval={3}
                  angle={-45}
                  textAnchor="end"
                  height={44}
                  type="category"
                />
                <YAxis
                  stroke="#111827"
                  fontSize={10}
                  tick={{ fill: '#111827', fontWeight: 600, fontSize: 10 }}
                  axisLine={{ stroke: '#111827' }}
                  tickLine={{ stroke: '#111827' }}
                  width={50}
                  tickCount={6}
                />
                {/* keep area with nulls so frame matches, but no fill renders */}
                <Area type="monotone" dataKey="consumption" stroke={CONSUMPTION_COLOR} fill={CONSUMPTION_COLOR} fillOpacity={0.22} connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600 }}>
              No data available
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: contentColor,
        borderRadius: '8px',
        padding: '12px 16px 8px 16px',
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
        marginBottom: '8px',
        border: '1px solid #e5e7eb',
        minHeight: ENERGY_COMBINED_CARD_MIN_HEIGHT_PX,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 6, marginBottom: 6 }}>
          <h3 style={chartHeaderStyle}>{title}</h3>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            width: '100%',
          }}
        >
          <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <button
                type="button"
                onClick={() => setActiveSeries('consumption')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: activeSeries === 'consumption' ? '#1565C0' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: activeSeries === 'consumption' ? 'underline' : 'none',
                  textUnderlineOffset: 6,
                }}
              >
                Consumption
              </button>
              <button
                type="button"
                onClick={() => setActiveSeries('strategy')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: activeSeries === 'strategy' ? '#1565C0' : '#64748b',
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: activeSeries === 'strategy' ? 'underline' : 'none',
                  textUnderlineOffset: 6,
                }}
              >
                Savings By Strategy
              </button>
            </div>
          </div>
          {headerCenterControls}
          <div
            style={{
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'flex-start',
            }}
          >
            {headerExportOnly}
          </div>
        </div>
      </div>
      {activeSeries === 'strategy' ? (
        <div
          style={{
            height: '420px',
            minHeight: '380px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            padding: '8px',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {strategyContent}
        </div>
      ) : (
        <div
          style={{
            height: '420px',
            minHeight: '380px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            padding: '8px 8px 4px 8px',
            width: '100%'
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={mergedData}
              margin={{ top: 20, right: 100, left: 20, bottom: 8 }}
            >
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#111827"
                fontSize={chartConfig.xAxisFontSize}
                tick={{ fill: '#111827', fontWeight: 600, fontSize: chartConfig.xAxisFontSize }}
                tickFormatter={consumptionAxisTickFormatter}
                axisLine={{ stroke: '#111827' }}
                tickLine={{ stroke: '#111827' }}
                interval={chartConfig.xAxisInterval}
                angle={-45}
                textAnchor="end"
                height={40}
                type="category"
                tickCount={chartConfig.xAxisTickCount}
                allowDuplicatedCategory={false}
                scale="point"
                label={{
                  value: '(Time)',
                  position: 'insideBottomLeft',
                  offset: -5,
                  style: { textAnchor: 'start', fill: '#111827', fontSize: '12px', fontWeight: 'bold' }
                }}
              />
              <YAxis
                stroke="#111827"
                fontSize={chartConfig.xAxisFontSize}
                tick={{ fill: '#111827', fontWeight: 600, fontSize: chartConfig.xAxisFontSize }}
                axisLine={{ stroke: '#111827' }}
                tickLine={{ stroke: '#111827' }}
                width={50}
                tickCount={8}
                domain={yDomain}
                label={{
                  value: unit ? `(${unit})` : '',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 15,
                  style: { textAnchor: 'middle', fill: '#111827', fontSize: '12px', fontWeight: 'bold' }
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !mergedData.length) return null;
                  const row = mergedData.find((r) => String(r.date) === String(label));
                  if (!row) return null;
                  return (
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #333',
                        borderRadius: '4px',
                        padding: '10px',
                        color: '#000',
                        fontSize: '12px'
                      }}
                    >
                      <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', borderBottom: '1px solid #333', paddingBottom: '4px' }}>{label}</p>
                      <p style={{ margin: '4px 0' }}>Consumption: {row.consumption != null && row.consumption !== '' ? Number(row.consumption).toFixed(2) : '—'} {unit}</p>
                      <p style={{ margin: '4px 0' }}>Savings: {row.savings != null && row.savings !== '' ? Number(row.savings).toFixed(2) : '—'} {unit}</p>
                      <p style={{ margin: '4px 0' }}>Connected Load: {row.connectedLoad != null && row.connectedLoad !== '' ? Number(row.connectedLoad).toFixed(2) : '—'} {unit}</p>
                    </div>
                  );
                }}
                cursor={{ stroke: '#333', strokeWidth: 1 }}
              />
              {/* Legend removed to avoid "Consumption" label under x-axis */}
              <Area
                type="monotone"
                dataKey="consumption"
                name="Consumption"
                fill={CONSUMPTION_COLOR}
                fillOpacity={0.7}
                stroke={CONSUMPTION_COLOR}
                strokeWidth={chartConfig.strokeWidth}
                dot={{ r: chartConfig.dotSize, fill: CONSUMPTION_COLOR, stroke: '#fff', strokeWidth: 1 }}
                activeDot={{ r: 4, fill: CONSUMPTION_COLOR, stroke: '#fff', strokeWidth: 0.5 }}
                connectNulls={false}
              />
              {yAxisMax != null && yAxisMax > 0 && connectedLoadRefSegment && (
                <ReferenceLine
                  segment={connectedLoadRefSegment}
                  stroke={CONNECTED_LOAD_COLOR}
                  strokeDasharray="4 4"
                  label={hundredPctRefLabel}
                />
              )}
              {yAxisMax != null && yAxisMax > 0 && !connectedLoadRefSegment && mergedData.length > 0 && (
                <ReferenceLine
                  y={yAxisMax}
                  stroke={CONNECTED_LOAD_COLOR}
                  strokeDasharray="4 4"
                  label={hundredPctRefLabel}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary - single line, no background */}
      <div style={{ marginTop: '2px', marginBottom: '0', color: '#111827', fontSize: '14px' }}>
        Summary Total energy consumed: <strong>{summary.totalConsumption.toFixed(1)} {unit}</strong>
        {' · '}
        Savings compared to Full On: <strong>{summary.totalSavings.toFixed(2)} {unit} ({summary.savingsPercent.toFixed(0)}%)</strong>
        {' · '}
        Carbon Footprint: <strong>{formatCo2Kg(carbonFootprintKg)}</strong>
      </div>
    </div>
  );
}

export default React.memo(ConsumptionSavingsCombinedChart);
