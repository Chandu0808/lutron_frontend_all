export const OVERVIEW_THEME_VARIANTS = {
  BASIC: 'basic',
  GRID: 'grid',
};

export const OVERVIEW_CARD_VARIANTS = {
  RESPONSIVE: 'responsive',
  FIXED: 'fixed',
};

export const OVERVIEW_SURFACE_VARIANTS = {
  DEFAULT: 'default',
};

const bodyTextDarkBasic = { color: '#64748b' };
const bodyTextMutedBasic = { color: '#94a3b8' };
const bodyTextDarkGrid = { color: '#374151' };
const bodyTextMutedGrid = { color: '#6b7280' };

export function resolveOverviewMetricTileTheme({
  themeVariant = OVERVIEW_THEME_VARIANTS.BASIC,
  cardVariant = themeVariant === OVERVIEW_THEME_VARIANTS.BASIC
    ? OVERVIEW_CARD_VARIANTS.RESPONSIVE
    : OVERVIEW_CARD_VARIANTS.FIXED,
} = {}) {
  if (themeVariant === OVERVIEW_THEME_VARIANTS.BASIC) {
    return {
      themeVariant,
      cardVariant,
      titleStyle: {
        color: '#1565c0',
        fontWeight: 400,
        fontSize: { xs: '1.71rem', sm: '1.84rem' },
        lineHeight: 1.2,
        textAlign: 'left',
        width: '100%',
        boxSizing: 'border-box',
      },
      dividerSx: { my: 0.5, borderColor: '#e5e7eb' },
      bodyTextDark: bodyTextDarkBasic,
      bodyTextMuted: bodyTextMutedBasic,
      cardHeaderSx: {
        flexShrink: 0,
        width: '100%',
        minWidth: 0,
        minHeight: 0,
      },
      cardBodyMainSx: {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        py: 0.25,
      },
      iconInTile: (color) => ({
        color,
        fontSize: 'clamp(1.35rem, 0.75rem + 3.5cqi, 2.35rem) !important',
        width: '1em !important',
        height: '1em !important',
        flexShrink: 0,
      }),
      iconInTileLarge: (color) => ({
        color,
        fontSize: 'clamp(3.1rem, 1.35rem + 5cqh + 2.5cqi, 6.25rem) !important',
        width: '1em !important',
        height: '1em !important',
        flexShrink: 0,
      }),
      floorsIconSx: {
        color: 'secondary.main',
        fontSize: 'clamp(4.2rem, 1.8rem + 7cqh + 3.5cqi, 8.5rem) !important',
        width: '1em !important',
        height: '1em !important',
        flexShrink: 0,
      },
      labelSmall: { fontSize: 'clamp(0.58rem, 0.38rem + 2.8cqi, 0.82rem)' },
      labelMeta: { fontSize: 'clamp(0.52rem, 0.34rem + 2.4cqi, 0.72rem)' },
      labelSchedule: { fontSize: 'clamp(0.58rem, 0.36rem + 2.6cqi, 0.82rem)' },
      energyHeaderLabelSx: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.25,
        flexShrink: 0,
        mb: 0.2,
        ...bodyTextDarkBasic,
        fontSize: 'clamp(0.6rem, 0.38rem + 2.5cqi, 0.8rem)',
      },
      energyCheckIconSx: {
        color: '#22c55e',
        fontSize: 'clamp(0.65em, 0.55em + 1.25cqi, 0.95em)',
      },
      ringMode: 'responsive',
      ringColorEnergy: '#4caf50',
      ringColorSpace: '#2196f3',
      ringSizeEnergy: null,
      ringSizeSpace: null,
      savingsValueColor: '#15803d',
      floorsCountSx: {
        color: '#1976d2',
        fontSize: 'clamp(2.8rem, 1.6rem + 8cqh + 4cqi, 4.0rem)',
        textAlign: 'center',
      },
      scheduleNextLabel: 'Next Event',
      scheduleNextLabelSx: {
        ...bodyTextMutedBasic,
        fontSize: 'clamp(0.52rem, 0.34rem + 2.2cqi, 0.72rem)',
      },
      scheduleEventSx: {
        color: '#1976d2',
        ...{ fontSize: 'clamp(0.58rem, 0.36rem + 2.6cqi, 0.82rem)' },
        mt: 0.15,
        lineHeight: 1.15,
      },
      emptyTextSx: { ...bodyTextDarkBasic, fontSize: '0.8rem' },
      spaceUtilCaptionSx: {
        flexShrink: 0,
        ...bodyTextDarkBasic,
        fontSize: 'clamp(0.52rem, 0.34rem + 2.2cqi, 0.72rem)',
        lineHeight: 1.15,
        px: 0.2,
      },
      quickControlsCaptionSx: {
        ...bodyTextDarkBasic,
        ...{ fontSize: 'clamp(0.52rem, 0.34rem + 2.4cqi, 0.72rem)' },
        lineHeight: 1.2,
      },
      footerBoxSx: { flexShrink: 0, width: '100%', pt: 0.25, px: 0.25 },
      floorsFooterSx: {
        flexShrink: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        pt: 0.2,
      },
    };
  }

  return {
    themeVariant: OVERVIEW_THEME_VARIANTS.GRID,
    cardVariant: OVERVIEW_CARD_VARIANTS.FIXED,
    titleStyle: {
      color: '#1565c0',
      fontWeight: 'bold',
      fontSize: '1.7rem',
    },
    dividerSx: { mb: 1, borderColor: '#e5e7eb' },
    bodyTextDark: bodyTextDarkGrid,
    bodyTextMuted: bodyTextMutedGrid,
    cardHeaderSx: null,
    cardBodyMainSx: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      mb: 1.5,
    },
    iconInTile: (color) => ({ color, fontSize: 88 }),
    iconInTileLarge: (color) => ({ color, fontSize: 88 }),
    floorsIconSx: { color: 'secondary.main', fontSize: 88 },
    labelSmall: { fontSize: '1.2rem' },
    labelMeta: { fontSize: '1.2rem' },
    labelSchedule: { fontSize: '1.8rem' },
    energyHeaderLabelSx: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.5,
      mb: 1.25,
      ...bodyTextDarkGrid,
      fontSize: '1.35rem',
    },
    energyCheckIconSx: { color: '#22c55e', fontSize: 26 },
    ringMode: 'fixed',
    ringColorEnergy: '#4caf50',
    ringColorSpace: '#2196f3',
    ringSizeEnergy: 136,
    ringSizeSpace: 146,
    savingsValueColor: '#15803d',
    floorsCountSx: {
      color: '#1976d2',
      fontSize: '4.25rem',
      textAlign: 'center',
    },
    scheduleNextLabel: 'Next event',
    scheduleNextLabelSx: {
      ...bodyTextMutedGrid,
      fontSize: '1.45rem',
      mt: 0.75,
    },
    scheduleEventSx: {
      color: '#1976d2',
      fontSize: '1.8rem',
      mt: 0.35,
    },
    emptyTextSx: { ...bodyTextDarkGrid, fontSize: '1.55rem', mt: 0.75 },
    spaceUtilCaptionSx: {
      mt: 1.2,
      flex: 1,
      ...bodyTextDarkGrid,
      fontSize: '1.55rem',
    },
    quickControlsCaptionSx: {
      flex: 1,
      ...bodyTextDarkGrid,
      fontSize: '1.55rem',
    },
    footerBoxSx: null,
    floorsFooterSx: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flex: 1,
    },
  };
}
