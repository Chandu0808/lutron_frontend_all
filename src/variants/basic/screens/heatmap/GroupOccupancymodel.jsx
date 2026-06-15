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
import { darken } from '@mui/material/styles';
import { DEFAULT_APP_CONTENT, isWhiteAreaPickerChrome } from '../../utils/themeOnSurface';

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
  const backgroundColor = appTheme?.application_theme?.background || '#d2c4a2';
  const contentColor = appTheme?.application_theme?.content || DEFAULT_APP_CONTENT;
  const buttonColor = appTheme?.application_theme?.button || '#232323';
  const whiteChrome = isWhiteAreaPickerChrome(contentColor);
  const chromeBlue = '#1565C0';
  const dialogBg = whiteChrome ? '#ffffff' : backgroundColor;
  const chromeText = whiteChrome ? chromeBlue : '#ffffff';
  const chromeBorder = whiteChrome ? chromeBlue : buttonColor;

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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        }
      }}
      PaperProps={{ 
        sx: { 
          borderRadius: 2,
          position: 'relative'
        } 
      }}
    >
      <Box
        sx={{
          backgroundColor: dialogBg,
          borderRadius: 2,
          px: 5,
          py: 2,
          minWidth: 400,
          position: 'relative',
          border: whiteChrome ? `2px solid ${chromeBlue}` : 'none',
        }}
      >
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: chromeText,
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogTitle sx={{ fontWeight: 'bold', fontSize: 20, px: 0, pt: 0, color: chromeText }}>
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
                    // MUI OutlinedInput renders the outline as a <fieldset> with class `MuiOutlinedInput-notchedOutline`.
                    // Set both selectors to win over MUI defaults.
                    '& fieldset, & .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${chromeBorder} !important`,
                      borderWidth: '1px',
                    },
                    '&:hover fieldset, &:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${chromeBorder} !important`,
                    },
                    '&.Mui-focused fieldset, &.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${chromeBorder} !important`,
                      borderWidth: '2px',
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
            <InputLabel id="group-label"></InputLabel>
            <Select
              labelId="group-label"
              value={selectedGroup}
              onChange={handleGroupChange}
              displayEmpty
              sx={{
                ...(whiteChrome && {
                  '& .MuiSelect-icon': {
                    color: `${chromeBlue} !important`,
                  },
                  '& fieldset': {
                    borderColor: `${chromeBlue} !important`,
                  },
                  '&:hover fieldset': {
                    borderColor: `${chromeBlue} !important`,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: `${chromeBlue} !important`,
                  },
                }),
              }}
              input={
                <OutlinedInput
                  placeholder="Select Areagroup"
                  notched={false}
                  sx={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: `${chromeBorder} !important`,
                      borderWidth: '1px',
                    },
                    '&:hover fieldset': {
                      borderColor: `${chromeBorder} !important`,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: `${chromeBorder} !important`,
                      borderWidth: '2px',
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

          {/* Mode Toggle Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
            {modeOptions.map((mode) => {
              const isActive = status && status !== "Mixed" && status === mode;
              const isCurrentModeUpdating = isUpdating && isActive;
              const activeBg = whiteChrome ? chromeBlue : buttonColor;
              const inactiveText = whiteChrome ? '#000' : chromeBlue;
              
              return (
                <Button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={!selectedGroup || loading || updating || isUpdating}
                  sx={{
                    borderRadius: 1,
                    textTransform: 'none',
                    minWidth: 100,
                    height: 45,
                    fontWeight: 500,
                    fontSize: 15,
                    backgroundColor: isActive ? activeBg : '#fff',
                    color: isActive ? '#fff' : inactiveText,
                    border: `1px solid ${chromeBlue}`,
                    boxShadow: 1,
                    '&:hover': {
                      backgroundColor: isActive
                        ? darken(activeBg, 0.12)
                        : '#eee',
                    },
                    position: 'relative',
                  }}
                >
                  {isCurrentModeUpdating ? (
                    <CircularProgress 
                      size={20} 
                      sx={{ color: '#fff' }} 
                    />
                  ) : (
                    mode.toUpperCase()
                  )}
                </Button>
              );
            })}
          </Box>
          {selectedGroup && status === "Mixed" && (
            <Box
              sx={{
                textAlign: 'center',
                mt: 1,
                color: whiteChrome ? chromeBlue : 'red',
                fontWeight: 500,
              }}
            >
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