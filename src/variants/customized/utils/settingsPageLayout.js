/** Top edge rule on settings pages inside the olive panel (customized). */
export const settingsPageShellSx = {
  width: '100%',
  maxWidth: '100%',
  margin: 0,
  boxSizing: 'border-box',
  borderTop: '1px solid rgba(255, 255, 255, 0.28)',
};

/** Grid shell aligned with Users / Floor settings pages. */
export const settingsGridContainerSx = {
  ml: '18px',
  alignItems: 'flex-start',
  maxWidth: '100%',
  boxSizing: 'border-box',
};

export const settingsSidebarGridItemSx = {
  p: 2,
  borderTopLeftRadius: '10px',
  borderBottomLeftRadius: '10px',
};

export const settingsTitleTypographySx = {
  mb: { xs: 0.8, sm: 1, md: 1.5, lg: 2 },
  fontSize: 24,
  fontWeight: 600,
  letterSpacing: 0.5,
  paddingTop: '18px',
  marginBottom: '16px',
  color: '#fff',
};

/** Outer shell — matches Settings → Help (`help-container`). */
export const settingsHelpLayoutShellSx = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  p: '18px',
  ml: '16px',
  boxSizing: 'border-box',
  overflow: 'visible',
};

export const settingsHelpLayoutGridSx = {
  flex: 1,
  overflow: 'hidden',
  width: '100%',
};

export const settingsHelpLayoutGridContainerSx = {
  width: '100%',
  maxWidth: '100%',
  alignItems: 'flex-start',
  boxSizing: 'border-box',
};

/** Right column spacing — matches Help content column. */
export const settingsHelpLayoutContentColumnSx = {
  order: { xs: 1, lg: 2 },
  p: 2,
  overflow: 'hidden',
  width: '100%',
};

/** White panel — matches Help `Paper` (rounded, full width). */
export const settingsHelpWhitePaperSx = {
  p: 2,
  borderRadius: 2,
  width: '100%',
  maxWidth: 'none',
  bgcolor: '#fff',
  m: 0,
  boxSizing: 'border-box',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
};
