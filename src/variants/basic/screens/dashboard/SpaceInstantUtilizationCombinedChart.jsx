/**
 * Space Utilization Charts tab — combined card (matches Energy `ConsumptionSavingsCombinedChart` layout).
 * Header: title + tabs | Export; then `topControls`-style duration + date row; chart.
 */

import React, { useState } from 'react';
import { Box } from '@mui/material';

const TAB_ACTIVE = '#1565C0';
const TAB_INACTIVE = '#64748b';
/** Mirrors Energy combined chart title styling */
const chartHeaderStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: 600,
  color: '#000000',
  fontFamily: 'inherit',
};

export default function SpaceInstantUtilizationCombinedChart({
  cardTitle = 'Space Utilization',
  instantTabLabel,
  areaTabLabel,
  instantSection,
  areaSection,
  /** Export control — same corner as Energy (only shown on Trends tab). */
  instantTrendToolbarRight,
  /** Same role as Energy `topControls`: dropdown + date nav, centered above chart. */
  instantTrendDateNav,
}) {
  const [tab, setTab] = useState('instant');

  const stop = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  };

  return (
    <Box
      onMouseDown={stop}
      onMouseUp={stop}
      onClick={stop}
      onDoubleClick={stop}
      onContextMenu={stop}
      sx={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: { xs: '12px 14px 8px', sm: '12px 16px 8px' },
        boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
        border: '1px solid #e5e7eb',
        minHeight: 0,
        width: '100%',
        marginBottom: { xs: 0.5, sm: 1 },
      }}
    >
      {/* Same structure as Energy: left column (title + tabs) | Export */}
      <Box sx={{ marginBottom: 1 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                borderBottom: '1px solid #e5e7eb',
                paddingBottom: 0.75,
                marginBottom: 0.75,
              }}
            >
              <Box component="h3" sx={{ ...chartHeaderStyle, fontSize: { xs: '16px', lg: '18px' } }}>
                {cardTitle}
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTab('instant')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: tab === 'instant' ? TAB_ACTIVE : TAB_INACTIVE,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: tab === 'instant' ? 'underline' : 'none',
                  textUnderlineOffset: 6,
                  fontFamily: 'inherit',
                }}
              >
                {instantTabLabel}
              </button>
              <button
                type="button"
                onClick={() => setTab('area')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  color: tab === 'area' ? TAB_ACTIVE : TAB_INACTIVE,
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: tab === 'area' ? 'underline' : 'none',
                  textUnderlineOffset: 6,
                  fontFamily: 'inherit',
                }}
              >
                {areaTabLabel}
              </button>
            </Box>
          </Box>
          {tab === 'instant' && instantTrendToolbarRight != null && (
            <Box sx={{ flexShrink: 0, pt: 0.25 }}>{instantTrendToolbarRight}</Box>
          )}
        </Box>
      </Box>

      {tab === 'instant' && instantTrendDateNav != null && (
        <Box
          sx={{
            width: '100%',
            maxWidth: { xs: 200, sm: 270, md: 330 },
            mx: 'auto',
            mb: 1,
          }}
        >
          {instantTrendDateNav}
        </Box>
      )}

      {tab === 'instant' && instantSection}
      {tab === 'area' && areaSection}
    </Box>
  );
}
