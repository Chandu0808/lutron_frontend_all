import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
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
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from 'react-redux';
import { fetchFloors, deleteFloor } from '../../../redux/slice/floor/floorSlice';
import { MdDelete, MdEditSquare, MdCalculate } from 'react-icons/md';



import { selectApplicationTheme } from "../../../redux/slice/theme/themeSlice";


import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import { ConfirmDialog } from '../../../utils/FeedbackUI';

import { UseAuth } from '../../../customhooks/UseAuth';
import SettingsLayout from '../SettingsLayout';
import { getThemeButtonColor } from '../../../utils/themePageBackground';


export default function FloorComponent() {

  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const appTheme = useSelector(selectApplicationTheme);
  const backgroundColor = appTheme?.application_theme?.background || '#d2c4a2';
  const contentColor = appTheme?.application_theme?.content || 'rgba(128, 120, 100, 0.7)';
  const buttonColor = getThemeButtonColor(appTheme?.application_theme?.button, appTheme?.application_theme?.background);

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

  useEffect(() => {
    if (role !== 'Superadmin') return;
    dispatch(fetchFloors());
  }, [dispatch, role]);

  if (role !== 'Superadmin') return <Navigate to="/main" replace />;

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
    <SettingsLayout>
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
              backgroundColor: buttonColor,
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#555555',
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
            width: "100%",
            maxWidth: "900px",
            borderRadius: 1,
            overflow: "hidden",
            backgroundColor: "var(--users-table-container-bg, #fff)",
            border: "1px solid var(--users-border, #C5CDD8)",
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'var(--users-table-head-bg, #d6dde8)' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--settings-panel-text, #000)', borderBottom: '2px solid var(--users-border, #ddd)', backgroundColor: 'var(--users-table-head-bg, #d6dde8)' }}>
                  Floor
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--settings-panel-text, #000)', borderBottom: '2px solid var(--users-border, #ddd)', backgroundColor: 'var(--users-table-head-bg, #d6dde8)' }}>
                  Processor
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: 'var(--settings-panel-text, #000)', borderBottom: '2px solid var(--users-border, #ddd)', backgroundColor: 'var(--users-table-head-bg, #d6dde8)' }}>
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {floorStatus === 'loading' ? (
                <TableRow sx={{ backgroundColor: 'var(--users-table-row-bg, #fff)' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={24} sx={{ color: '#000' }} />
                  </TableCell>
                </TableRow>
              ) : floorError ? (
                <TableRow sx={{ backgroundColor: 'var(--users-table-row-bg, #fff)' }}>
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
                <TableRow sx={{ backgroundColor: 'var(--users-table-row-bg, #fff)' }}>
                  <TableCell colSpan={3} sx={{ textAlign: 'center', py: 3 }}>
                    <Typography sx={{ color: '#000' }}>
                      No floors created yet. Click "Create Floor" to add one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                floors.map((floor) => (
                  <TableRow key={floor.id} sx={{ backgroundColor: 'var(--users-table-row-bg, #fff)' }}>
                    <TableCell sx={{ color: 'var(--settings-panel-text, #000)' }}>
                      {floor.floor_name}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--settings-panel-text, #000)' }}>
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
                              backgroundColor: '#232323',
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
                              backgroundColor: '#1E1E1E',
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: '#333' }
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
                              backgroundColor: '#1E1E1E',
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '34px',
                              height: '30px',
                              '&:hover': { backgroundColor: '#333' }
                            }}
                          >
                            <MdDelete />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Correct Coordinate" arrow placement="top">
                          <IconButton
                            onClick={() => handleCorrectCoordinate(floor)}
                            sx={{
                              backgroundColor: '#1E1E1E',
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: '#333' }
                            }}
                          >
                            <FlipToBackIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Area Calculation" arrow placement="top">
                          <IconButton
                            onClick={() => handleAreaCalculation(floor)}
                            sx={{
                              backgroundColor: '#1E1E1E',
                              color: '#fff',
                              borderRadius: '6px',
                              p: 1,
                              width: '36px',
                              height: '30px',
                              '&:hover': { backgroundColor: '#333' }
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
    </SettingsLayout>
  );
}