import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  getUiVariant,
  setUiVariant,
  UI_VARIANT_LABELS,
  UI_VARIANTS,
  isSuperAdminRole,
} from '../utils/uiVariant';

function resolveUserRole(profileRole) {
  if (profileRole != null && String(profileRole).trim() !== '') {
    return profileRole;
  }
  try {
    const stored = localStorage.getItem('role');
    if (stored) return stored;
    const token = localStorage.getItem('lutron');
    if (token) {
      const decoded = jwtDecode(token);
      return decoded?.role ?? null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Theme settings: switch Basic / Advanced / Customized (full page reload).
 * Visible to Super Admin only.
 */
const lightChromeSelectSx = {
  color: '#000',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.23)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.4)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#000' },
  '& .MuiSvgIcon-root': { color: '#000' },
};

const lightChromeLabelSx = {
  color: 'rgba(0, 0, 0, 0.6)',
  '&.Mui-focused': { color: '#000' },
};

/**
 * @param {{ lightChrome?: boolean }} props When true, label/select/menu use dark text (white panel).
 */
export default function UiVariantSelector({ lightChrome = false }) {
  const profileRole = useSelector((state) => state.user?.profile?.role);
  const role = useMemo(() => resolveUserRole(profileRole), [profileRole]);
  const canSwitchVariant = isSuperAdminRole(role);

  const [uiVariant, setUiVariantState] = useState(() => getUiVariant());

  const handleChange = (e) => {
    const next = e.target.value;
    if (next === uiVariant) return;
    setUiVariant(next);
    setUiVariantState(next);
    window.location.reload();
  };

  if (!canSwitchVariant) {
    return null;
  }

  return (
    <Box sx={{ mb: 2, maxWidth: 360 }}>
      <FormControl fullWidth size="small">
        <InputLabel id="lutron-ui-variant-label" sx={lightChrome ? lightChromeLabelSx : undefined}>
          CC UI
        </InputLabel>
        <Select
          labelId="lutron-ui-variant-label"
          id="lutron-ui-variant-select"
          label="CC UI"
          value={uiVariant}
          onChange={handleChange}
          sx={lightChrome ? lightChromeSelectSx : undefined}
          MenuProps={
            lightChrome
              ? {
                  PaperProps: {
                    sx: {
                      color: '#000',
                      '& .MuiMenuItem-root': { color: '#000' },
                    },
                  },
                }
              : undefined
          }
        >
          {UI_VARIANTS.map((key) => (
            <MenuItem key={key} value={key}>
              {UI_VARIANT_LABELS[key]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography
        variant="caption"
        color={lightChrome ? 'text.primary' : 'text.secondary'}
        sx={{ mt: 0.5, display: 'block', ...(lightChrome ? { color: 'rgba(0, 0, 0, 0.6)' } : {}) }}
      >
        Changing this reloads the application with the selected interface.
      </Typography>
    </Box>
  );
}
