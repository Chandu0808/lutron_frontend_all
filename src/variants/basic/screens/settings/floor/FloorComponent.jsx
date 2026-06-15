import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Grid,
  Box,
  Button,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  CircularProgress,
  IconButton,
  Snackbar,
  useMediaQuery,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from 'react-redux';
import { fetchFloors, deleteFloor } from '../../../redux/slice/floor/floorSlice';
import { SidebarItems, getVisibleSidebarItems } from '../../../utils/sidebarItems';

import { MdDelete, MdEditSquare, MdCalculate } from 'react-icons/md';



import { selectApplicationTheme } from "../../../redux/slice/theme/themeSlice";
import { isLightSurface } from "../../../utils/themeOnSurface";
import { settingsSidebarColumnDividerSx } from "../../../utils/settingsSidebarTabStyles";
import SettingsSidebarNav from "../../../components/SettingsSidebarNav";


import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import { ConfirmDialog } from '../../../utils/FeedbackUI';

import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../../customhooks/UseAuth';


export default function FloorComponent() {

  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || '#ffffff';
  const contentColor = appTheme?.application_theme?.content || '#ffffff';
  const buttonColor = appTheme?.application_theme?.button || '#232323';
  const isDefaultWhiteTheme = isLightSurface(contentColor);
  const actionBlue = isDefaultWhiteTheme ? '#1565C0' : buttonColor;

  // Add responsive breakpoints
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const settingsSidebarMdUp = useMediaQuery(theme.breakpoints.up('md'));

  const floors = useSelector((state) => state.floor.floors);
  const floorStatus = useSelector((state) => state.floor.status);
  const floorError = useSelector((state) => state.floor.error);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showDeleteError, setShowDeleteError] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('');

  // Add confirmation dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { role } = UseAuth();
  const visibleSidebarItems = getVisibleSidebarItems(role);
  const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(role);

  if (role !== 'Superadmin') return <Navigate to="/main" replace />;

  useEffect(() => {

    // if (floorStatus === 'idle') {
    dispatch(fetchFloors());
    // }
  }, [dispatch]);

  const handleDelete = async (floor) => {
    setFloorToDelete(floor);
    setShowDeleteDialog(true);
  };

  // const handleConfirmDelete = async () => {
  //   if (floorToDelete) {
  //     try {
  //       await dispatch(deleteFloor(floorToDelete.id)).unwrap();
  //       setShowDeleteSuccess(true);
  //       // No need to refetch, the reducer will remove it from state
  //     } catch (err) {
  //       setDeleteErrorMessage(err.message || 'Failed to delete floor. Please try again.');
  //       setShowDeleteError(true);
  //     }
  //   }
  //   setShowDeleteDialog(false);
  //   setFloorToDelete(null);
  // };

  const handleConfirmDelete = async () => {
    if (!floorToDelete) return;

    setDeleting(true); //  start

    try {
      await dispatch(deleteFloor(floorToDelete.id)).unwrap();
      setShowDeleteSuccess(true);
    } catch (err) {
      setDeleteErrorMessage(err.message || 'Failed to delete');
      setShowDeleteError(true);
    }

    setDeleting(false); //  end
    setShowDeleteDialog(false);
    setFloorToDelete(null);
  };

  const handleCorrectCoordinate = (floor) => {
    navigate(`/correct-coordinate/${floor.id}`);
  };

  const handleAreaCalculation = (floor) => {
    navigate(`/area-calculation/${floor.id}`);
  };

  const handleRefreshFloors = () => {
    dispatch(fetchFloors());
  };

  return (
    <Grid
      container
      sx={{
        maxWidth: "100%",
        //backgroundColor: theme.palette.custom.navbarBg,
        borderRadius: "10px",
        alignItems: "flex-start",
        p: '18px',
        ml: '18px'
      }}
    >
      {/* Full-width header (title + 2 horizontal dividers) */}
      <Grid item xs={12} sx={{ pt: '18px', mb: 1.5 }}>
        <Typography
          variant="h6"
          sx={{
            color: theme.palette.text.secondary,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 0.5,
            mb: 1,
          }}
        >
          Settings
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Box sx={{ height: '1px', width: '100%', backgroundColor: '#e5e7eb' }} />
          <Box sx={{ height: '1px', width: '100%', backgroundColor: '#e5e7eb' }} />
        </Box>
      </Grid>

      {/* Sidebar */}
      <Grid
        item
        xs={12}
        md={2}
        sx={{
          p: 0,
          ...settingsSidebarColumnDividerSx(isDefaultWhiteTheme, settingsSidebarMdUp && !isTablet),
        }}
      >
        <SettingsSidebarNav items={visibleSidebarItemsWithPaths} />
      </Grid>

      {/* Main Content */}
      <Grid
        item
        xs={12}
        md={10}
        sx={{
          backgroundColor: isDefaultWhiteTheme ? '#ffffff' : contentColor,
          p: 3,
          borderTopRightRadius: "10px",
          borderBottomRightRadius: "10px",
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography variant="h5" sx={{ color: theme.palette.text.primary }}>
          </Typography>
          <Button
            variant="contained"
            sx={{
              backgroundColor: actionBlue,
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: isDefaultWhiteTheme ? '#0d47a1' : '#555555',
              },
              borderRadius: '8px',
              textTransform: 'none',
              px: 3,
              py: 1,
            }}
            onClick={() => navigate('/createfloor')}
          >
            Create Floor
          </Button>
        </Box>
        <TableContainer
          component={Paper}
          sx={{
            width: '80%',
            maxWidth: '900px',
            // mx: 'auto',
            // mt: 2,
            borderRadius: 1,
            overflow: "hidden",
            backgroundColor: backgroundColor,
            display: 'flex',
            alignItems: 'flex-start'
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: backgroundColor }}>
                <TableCell sx={{ fontWeight: 600, color: '#000' }}>
                  Floor
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#000' }}>
                  Processor
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#000' }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floorStatus === 'loading' ? (
                <TableRow sx={{ backgroundColor: '#fff' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={24} sx={{ color: '#000' }} />
                  </TableCell>
                </TableRow>
              ) : floorError ? (
                <TableRow sx={{ backgroundColor: '#fff' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography sx={{ color: 'red', mb: 1 }}>
                      Failed to load floors. Please check the processor connection.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleRefreshFloors}
                    >
                      Retry
                    </Button>
                  </TableCell>
                </TableRow>
              ) : floors.length === 0 ? (
                <TableRow sx={{ backgroundColor: '#fff' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography sx={{ color: '#000' }}>
                      No floors created yet. Click "Create Floor" to add one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                floors.map((floor) => (
                  <TableRow key={floor.id} sx={{ backgroundColor: '#fff' }}>
                    <TableCell sx={{ color: '#000' }}>
                      {floor.floor_name}
                    </TableCell>
                    <TableCell sx={{ color: '#000' }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {Array.from(
                          new Map((floor.processors || []).map(p => [
                            typeof p === 'string' ? p : p.processor_id,
                            p
                          ])).values()
                        ).map((processor, pIdx) => (
                          <Box
                            key={pIdx}
                            sx={{
                              backgroundColor: isDefaultWhiteTheme ? actionBlue : '#232323',
                              color: '#fff',
                              borderRadius: '4px',
                              px: 1,
                              py: 0.5,
                              fontSize: '0.8rem',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {typeof processor === 'string'
                              ? processor
                              : `PR ${processor.processor_id}`}
                          </Box>
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#000' }}>
                      <Box display="flex" alignItems="center" gap={1.5}>

                        <Tooltip title="Edit Floor" arrow placement="top">
                          <IconButton
                            onClick={() => navigate(`/editfloor/${floor.id}`)}
                            sx={{
                              backgroundColor: actionBlue,
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: actionBlue }
                            }}
                          >
                            <MdEditSquare />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Floor" arrow placement="top">
                          <IconButton
                            onClick={() => handleDelete(floor)}
                            disabled={showDeleteDialog}
                            sx={{
                              backgroundColor: actionBlue,
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '34px',
                              height: '30px',
                              '&:hover': { backgroundColor: actionBlue }
                            }}
                          >
                            <MdDelete />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Correct Coordinate" arrow placement="top">
                          <IconButton
                            onClick={() => handleCorrectCoordinate(floor)}
                            sx={{
                              backgroundColor: actionBlue,
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: actionBlue }
                            }}
                          >
                            <FlipToBackIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Area Calculation" arrow placement="top">
                          <IconButton
                            onClick={() => handleAreaCalculation(floor)}
                            sx={{
                              backgroundColor: actionBlue,
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: actionBlue }
                            }}
                          >
                            <MdCalculate />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Snackbar for deletion */}
        <Snackbar
          open={showDeleteSuccess}
          autoHideDuration={3000}
          onClose={() => setShowDeleteSuccess(false)}
          message="Floor deleted successfully!"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          ContentProps={{
            sx: {
              backgroundColor: buttonColor,
              color: '#fff',
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }
          }}
        />

        {/* Error Snackbar for deletion */}
        <Snackbar
          open={showDeleteError}
          autoHideDuration={5000}
          onClose={() => setShowDeleteError(false)}
          message={deleteErrorMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          ContentProps={{
            sx: {
              backgroundColor: '#d32f2f',
              color: '#fff',
              borderRadius: '12px',
              px: 3,
              py: 1.5,
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
            }
          }}
        />

        {/* Delete Floor Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteDialog}
          title="Delete Floor"
          message={`Are you sure you want to delete floor "${floorToDelete?.floor_name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setFloorToDelete(null);
          }}
          confirmDisabled={deleting}   //  add this
        />
        {/* <ConfirmDialog
          open={showDeleteDialog}
          title="Delete Floor"
          message={`Are you sure you want to delete floor "${floorToDelete?.floor_name}"?`}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteDialog(false);
            setFloorToDelete(null);
          }}
        /> */}
      </Grid>
    </Grid>
  );
}