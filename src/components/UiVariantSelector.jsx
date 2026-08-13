import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import {
  Box,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  getUiVariant,
  setUiVariant,
  syncUiVariantToBackend,
  UI_VARIANT_LABELS,
  UI_VARIANTS,
  isSuperAdminRole,
} from '../utils/uiVariant';
import { remapPathnameForVariant } from '../utils/variantRouteMap';

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

/**
 * @param {{ lightChrome?: boolean, compact?: boolean }} props
 * When lightChrome is true, label/select/menu use dark text (white panel).
 * When compact is true, vertical spacing is reduced (basic theme page).
 */
export default function UiVariantSelector({ lightChrome = false, compact = false }) {
  const profileRole = useSelector((state) => state.user?.profile?.role);
  const role = useMemo(() => resolveUserRole(profileRole), [profileRole]);
  const canSwitchVariant = isSuperAdminRole(role);

  const [uiVariant, setUiVariantState] = useState(() => getUiVariant());

  const handleChange = async (e) => {
    const next = e.target.value;
    if (next === uiVariant) return;
    setUiVariant(next);
    setUiVariantState(next);
    const { pathname, search, hash } = window.location;
    const remapped = remapPathnameForVariant(pathname, next);
    if (remapped !== pathname) {
      window.history.replaceState(null, '', `${remapped}${search}${hash}`);
    }
    // Align backend active variant; theme thunks also pass ?variant= from localStorage.
    // Reload even if sync fails so the selected UI still comes up.
    await syncUiVariantToBackend(next);
    window.location.reload();
  };

  if (!canSwitchVariant) {
    return null;
  }

  return (
    <Box sx={{ mb: compact ? 0.5 : 2, maxWidth: 360 }}>
      <FormControl fullWidth size="small">
        <Select
          id="lutron-ui-variant-select"
          value={uiVariant}
          onChange={handleChange}
          inputProps={{ 'aria-label': 'Application variant' }}
          sx={lightChrome ? lightChromeSelectSx : undefined}
          MenuProps={
            lightChrome
              ? {
                  PaperProps: {
                    sx: {
                      bgcolor: '#fff',
                      color: '#000',
                      '& .MuiMenuItem-root': { color: '#000' },
                      '& .MuiMenuItem-root.Mui-selected': {
                        backgroundColor: 'rgba(21, 101, 192, 0.08)',
                        color: '#000',
                      },
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
        sx={{
          mt: compact ? 0.25 : 0.5,
          display: 'block',
          ...(lightChrome ? { color: 'rgba(0, 0, 0, 0.6)' } : {}),
        }}
      >
        Changing this reloads the application with the selected interface.
      </Typography>
    </Box>
  );
}
