const usersInputText = 'var(--users-input-text, rgba(0, 0, 0, 0.87))';
const usersInputLabelText = 'var(--users-input-label-text, rgba(0, 0, 0, 0.6))';
const usersInputPlaceholderText = 'var(--users-input-placeholder-text, rgba(0, 0, 0, 0.42))';

export const outlinedSelectInputSurface = 'var(--users-input-bg, #fff)';

export const outlinedSelectLabelSx = {
  zIndex: 1,
  color: usersInputLabelText,
  '&.Mui-focused': { color: usersInputText },
  '&.MuiInputLabel-shrink': {
    backgroundColor: outlinedSelectInputSurface,
    px: 0.75,
  },
};

export const outlinedSelectFloorsLabelSx = {
  zIndex: 1,
  color: usersInputLabelText,
  '&.Mui-focused': { color: usersInputText },
  backgroundColor: outlinedSelectInputSurface,
  px: 0.75,
};

/** Outlined TextField / Select surfaces on white modal fields. */
export const usersFormFieldSx = {
  backgroundColor: 'var(--users-input-bg, #fff)',
  borderRadius: 1,
  color: usersInputText,
  '& .MuiOutlinedInput-root': {
    color: usersInputText,
  },
  '& .MuiOutlinedInput-input': {
    color: usersInputText,
    WebkitTextFillColor: usersInputText,
  },
  '& .MuiOutlinedInput-input::placeholder': {
    color: usersInputPlaceholderText,
    opacity: 1,
  },
  '& .MuiSelect-select': {
    color: usersInputText,
  },
  '& .MuiSelect-icon': {
    color: usersInputLabelText,
  },
  '& .MuiInputLabel-root': {
    color: usersInputLabelText,
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: usersInputText,
  },
  '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--users-border, #C5CDD8)' },
  '& .MuiOutlinedInput-root:hover fieldset': { borderColor: 'var(--home-tab-active-color, #3D4A5C)' },
};

export const usersReadonlyFieldSx = {
  backgroundColor: 'var(--users-readonly-field-bg, #f0f2f5)',
  borderRadius: 1,
  '& .MuiOutlinedInput-root': {
    color: 'var(--users-readonly-field-text, rgba(0, 0, 0, 0.87))',
  },
  '& .MuiOutlinedInput-input': {
    color: 'var(--users-readonly-field-text, rgba(0, 0, 0, 0.87))',
    WebkitTextFillColor: 'var(--users-readonly-field-text, rgba(0, 0, 0, 0.87))',
  },
  '& .MuiOutlinedInput-root fieldset': { borderColor: 'var(--users-border, #C5CDD8)' },
};

/** MUI Select menu styling — theme-aware via CSS vars (gold = cream panel). */
export const premiumSelectMenuProps = {
  autoFocus: false,
  PaperProps: {
    sx: {
      backgroundColor: 'var(--users-select-menu-bg, #ffffff)',
      color: 'var(--settings-panel-text, #1c2330)',
      border: '1px solid var(--users-border, #C5CDD8)',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
      maxHeight: 320,
      '& .MuiMenuItem-root': {
        color: 'var(--settings-panel-text, #1c2330)',
        '&:hover': { backgroundColor: 'var(--users-select-menu-hover, #D6DDE8)' },
        '&.Mui-selected': {
          backgroundColor: 'var(--users-select-menu-hover, #D6DDE8)',
          color: 'var(--settings-panel-text, #1c2330)',
          '&:hover': { backgroundColor: 'var(--users-border, #C5CDD8)' },
        },
        '&.Mui-disabled': {
          color: 'var(--settings-panel-muted-text, #4A586C)',
          opacity: 0.85,
        },
      },
      '& .MuiListSubheader-root': {
        backgroundColor: 'var(--users-select-menu-bg, #ffffff)',
        color: 'var(--settings-panel-text, #1c2330)',
      },
      '& .MuiListItemText-primary': {
        color: 'var(--settings-panel-text, #1c2330)',
      },
    },
  },
};
