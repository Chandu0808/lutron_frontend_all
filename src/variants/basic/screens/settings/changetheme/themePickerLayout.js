/** Shared layout for Settings → Theme color-picker columns (visible gap between cards). */

export const themePickerCardsGridSx = (columns = 3) => ({
  display: 'grid',
  width: '100%',
  alignItems: 'stretch',
  columnGap: { xs: 2, md: 3 },
  rowGap: { xs: 2, md: 3 },
  gridTemplateColumns: {
    xs: '1fr',
    md: columns === 2 ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
  },
  margin: '1em',
  boxSizing: 'border-box',
});

export const themePickerCardCellSx = {
  display: 'flex',
  minWidth: 0,
  width: '100%',
  height: '100%',
};

export const themePickerCardColumnSx = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

export const themePickerCardSurfaceSx = {
  backgroundColor: 'white',
  padding: '1em',
  borderRadius: '1em',
  width: '100%',
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12)',
};

export const themePickerTitleSpacerSx = {
  fontWeight: 'bold',
  fontSize: '1rem',
  color: 'text.primary',
  mb: 1,
  minHeight: 28,
  lineHeight: 1.4,
  visibility: 'hidden',
};
