const scheduleMenuItemSx = {
  color: 'var(--schedule-select-menu-text, #000)',
  fontSize: 14,
  minHeight: 36,
  '&:hover': {
    backgroundColor:
      'var(--schedule-select-menu-hover, rgba(61, 74, 92, 0.12)) !important',
  },
  '&.Mui-focusVisible': {
    backgroundColor:
      'var(--schedule-select-menu-hover, rgba(61, 74, 92, 0.12)) !important',
  },
  '&.Mui-selected': {
    backgroundColor:
      'var(--schedule-modal-item-selected-bg, #3d4a5c) !important',
    color: 'var(--schedule-modal-item-selected-text, #fff) !important',
  },
  '&.Mui-selected:hover': {
    backgroundColor:
      'var(--schedule-select-menu-selected-hover, rgba(61, 74, 92, 0.28)) !important',
    color: 'var(--schedule-modal-item-selected-text, #fff) !important',
  },
  '&.Mui-selected.Mui-focusVisible': {
    backgroundColor:
      'var(--schedule-select-menu-selected-hover, rgba(61, 74, 92, 0.28)) !important',
    color: 'var(--schedule-modal-item-selected-text, #fff) !important',
  },
};

/** Shared MUI Select menu styling (Schedule filter, Add Event, Action dialogs). */
export const scheduleFilterMenuProps = {
  PaperProps: {
    className: 'schedule-filter-menu',
    sx: {
      backgroundColor:
        'var(--schedule-select-menu-bg, var(--heatmap-select-menu-bg, #d6dde8))',
      borderRadius: '10px',
      mt: 0.5,
      boxShadow: '0 10px 24px rgba(0,0,0,0.22)',
      '& .MuiMenuItem-root': scheduleMenuItemSx,
    },
  },
  MenuListProps: {
    className: 'schedule-filter-menu-list',
    sx: {
      py: 0.5,
      '& .MuiMenuItem-root': scheduleMenuItemSx,
    },
  },
};

/** Outlined Select field on schedule forms (Add Event, Schedule Details). */
export const scheduleSelectFieldSx = {
  borderRadius: '8px',
  fontSize: 14,
  backgroundColor: 'var(--schedule-select-bg, #fff)',
  color: 'var(--schedule-select-text, inherit)',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--schedule-panel-border, #ccc)',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--home-tab-active-color, #3d3629)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--home-tab-active-color, #3d3629)',
    borderWidth: '1px',
  },
  '& .MuiSelect-icon': {
    color: 'var(--schedule-select-text, inherit)',
  },
};
