import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  IconButton,
  Button,
  OutlinedInput,
  ListSubheader,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAreaGroups,
  fetchGroupOccupancyStatus,
  updateGroupOccupancy,
  selectAreaGroups,
  selectGroupOccupancyStatus,
  selectGroupOccupancyLoading,
  selectGroupOccupancyUpdating,
  selectAreaGroupsLoading
} from '../../redux/slice/settingsslice/heatmap/groupOccupancySlice';
import { selectApplicationTheme } from '../../redux/slice/theme/themeSlice';
import { HEATMAP_SETTINGS_DIALOG_PAPER_BG } from './AreaSettingsDialog';
import { getThemeButtonColor } from '../../utils/themePageBackground';

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

const modeOptions = ['Disabled', 'Auto', 'Vacancy'];

const GroupOccupancyModel = ({ open, onClose, currentUserRole }) => {
  const dispatch = useDispatch();
  const areaGroups = useSelector(selectAreaGroups);
  const status = useSelector(selectGroupOccupancyStatus);
  const loading = useSelector(selectGroupOccupancyLoading);
  const updating = useSelector(selectGroupOccupancyUpdating);
  const areaGroupsLoading = useSelector(selectAreaGroupsLoading);
  const appTheme = useSelector(selectApplicationTheme);
  const buttonColor = getThemeButtonColor(appTheme?.application_theme?.button, appTheme?.application_theme?.background);

  const [selectedGroup, setSelectedGroup] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch area groups on open and reset selection when closed
  useEffect(() => {
    if (open) {
      dispatch(fetchAreaGroups());
    } else {
      // Reset selection when dialog closes
      setSelectedGroup('');
    }
  }, [open, dispatch]);

  // Auto-select first group when area groups are loaded
  useEffect(() => {
    const userGroups = areaGroups?.user_area_groups || [];
    if (userGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(String(userGroups[0].group_id));
    }
  }, [areaGroups, selectedGroup]);

  // Fetch group occupancy status when group changes
  useEffect(() => {
    if (open && selectedGroup) {
      dispatch(fetchGroupOccupancyStatus(selectedGroup));
    }
  }, [open, selectedGroup, dispatch]);

  // Handle mode change
  const handleModeChange = (mode) => {
    if (!selectedGroup) return;
    
    setIsUpdating(true);
    setShowSuccessMessage(false);
    
    dispatch(updateGroupOccupancy({ groupId: selectedGroup, mode }))
      .then(() => {
        dispatch(fetchGroupOccupancyStatus(selectedGroup));
        setIsUpdating(false);
        setShowSuccessMessage(true);
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      })
      .catch(() => {
        setIsUpdating(false);
      });
  };

  const handleGroupChange = (e) => {
    setSelectedGroup(e.target.value);
  };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      BackdropProps={{
        sx: {
          // Match Add Action dialog overlay
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
        },
      }}
      PaperProps={{
        sx: {
          backgroundColor: 'transparent',
          boxShadow: 'none',
          position: 'relative',
        },
      }}
    >
      {/* Previous dark premium panel - kept for quick rollback
      background: linear-gradient(160deg, #0a1428 0%, #152238 45%, #1a2d4a 100%)
      */}
      <Box
        sx={{
          px: 3.5,
          py: 2.5,
          minWidth: 400,
          maxWidth: '90vw',
          position: 'relative',
          background: HEATMAP_SETTINGS_DIALOG_PAPER_BG,
          borderRadius: '18px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
          color: buttonColor,
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: buttonColor,
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.06)' },
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: 18,
            px: 0,
            pt: 0,
            pb: 1,
            color: buttonColor,
          }}
        >
          Edit Occupancy
        </DialogTitle>

        <DialogContent sx={{ px: 0 }}>
          {/* Group/Area Dropdown */}
          {/* <FormControl fullWidth size="small" sx={{ mt: 2, mb: 3 }}>
            <InputLabel id="group-label"></InputLabel>
            <Select
              labelId="group-label"
              value={selectedGroup}
              onChange={handleGroupChange}
              displayEmpty
              input={
                <OutlinedInput
                  placeholder="Select Areagroup"
                  notched={false}
                  sx={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    px: 1.5,
                  }}
                />
              }
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                  },
                },
              }}
            >
              <MenuItem value="">
                <em>Select Areagroup</em>
              </MenuItem>
              {(areaGroups?.user_area_groups || []).map((group) => (
                <MenuItem key={group.group_id} value={String(group.group_id)}>
                  {group.name.toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl> */}
          <FormControl fullWidth size="small" sx={{ mt: 2, mb: 3 }}>
            <InputLabel id="group-label" sx={{ display: 'none' }} />
            <Select
              labelId="group-label"
              value={selectedGroup}
              onChange={handleGroupChange}
              displayEmpty
              sx={{
                color: '#111',
                '& .MuiSelect-icon': { color: '#111' },
              }}
              input={
                <OutlinedInput
                  placeholder="Select Areagroup"
                  notched={false}
                  sx={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    color: buttonColor,
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#cccccc',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: buttonColor,
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: buttonColor,
                    },
                    px: 1.5,
                  }}
                />
              }
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                  },
                },
              }}
            >
              {/* User Groups - No label, no special groups for any user */}
              {(areaGroups?.user_area_groups || []).map((group) => (
                <MenuItem
                  key={`user-${group.group_id}`}
                  value={String(group.group_id)}
                  sx={{
                    pl: 2,
                    fontWeight: 500,
                  }}
                >
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Mode buttons — same pattern as Add Action > Occupancy in Action.jsx */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            {modeOptions.map((mode) => {
              const isActive =
                status &&
                status !== 'Mixed' &&
                String(status).toLowerCase() === mode.toLowerCase();
              const isCurrentModeUpdating = isUpdating && isActive;

              return (
                <Button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={!selectedGroup || loading || updating || isUpdating}
                  disableElevation
                  variant="outlined"
                  sx={{
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    minWidth: 100,
                    height: 45,
                    fontWeight: 700,
                    fontSize: 16,
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    ...(isActive
                      ? {
                          backgroundColor: buttonColor,
                          color: '#ffffff',
                          border: 'none',
                          '&.MuiButton-outlined': {
                            backgroundColor: buttonColor,
                            color: '#ffffff',
                            border: 'none',
                          },
                        }
                      : {
                          backgroundColor: '#ffffff',
                          color: buttonColor,
                          border: '1px solid #cccccc',
                          '&.MuiButton-outlined': {
                            backgroundColor: '#ffffff',
                            color: buttonColor,
                            borderColor: '#cccccc',
                          },
                        }),
                    '&.Mui-disabled': {
                      opacity: 0.55,
                    },
                  }}
                >
                  {isCurrentModeUpdating ? (
                    <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                  ) : (
                    mode.toUpperCase()
                  )}
                </Button>
              );
            })}
          </Box>
          {selectedGroup && status === "Mixed" && (
            <Box sx={{ textAlign: 'center', mt: 1, color: 'red', fontWeight: 500 }}>
              Occupancy status is mixed for this group.
            </Box>
          )}
          
          {/* Success Message */}
          {showSuccessMessage && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Alert 
                severity="success" 
                sx={{ 
                  backgroundColor: '#4caf50',
                  color: '#fff',
                  '& .MuiAlert-icon': {
                    color: '#fff'
                  }
                }}
              >
                Occupancy mode updated successfully!
              </Alert>
            </Box>
          )}
        </DialogContent>
      </Box>
    </Dialog>
  );
};

export default GroupOccupancyModel;