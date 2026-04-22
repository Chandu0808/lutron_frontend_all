import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Snackbar,
  Switch,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import { useDispatch, useSelector } from 'react-redux';
import { UseAuth, getVisibleSidebarItemsWithPaths } from '../../../customhooks/UseAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  fetchProcessorsListAll,
  discoverProcessors,
  toggleHandshakeStatus,
  processorHandshake,
  pingProcessorTerminal,
} from '../../../redux/slice/processor/processorSlice';
import { selectApplicationTheme } from '../../../redux/slice/theme/themeSlice';
import { darken } from '@mui/material/styles';

const ProcessorsSettings = () => {
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { role: currentUserRole } = UseAuth();
  const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(currentUserRole);

  const appTheme = useSelector(selectApplicationTheme);
  const buttonColor = appTheme?.application_theme?.button || '#232323';

  const { processorsListAll, listAllStatus, listAllError, discoverStatus } = useSelector(
    (state) => state.processor
  );

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [handshakeProcessorId, setHandshakeProcessorId] = useState(null);
  const [toggleBusyId, setToggleBusyId] = useState(null);
  const [pingBusyId, setPingBusyId] = useState(null);

  const pageBusy = handshakeProcessorId !== null;
  const listLoading = listAllStatus === 'loading';
  const discoverLoading = discoverStatus === 'loading';

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadList = useCallback(() => {
    dispatch(fetchProcessorsListAll());
  }, [dispatch]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleDiscover = async () => {
    const result = await dispatch(discoverProcessors());
    if (discoverProcessors.fulfilled.match(result)) {
      showSnackbar('Discovery completed.', 'success');
      dispatch(fetchProcessorsListAll());
    } else {
      const msg = result.payload?.message || 'No processor found.';
      showSnackbar(msg, result.payload?.status === 404 ? 'info' : 'error');
    }
  };

  const handleRefresh = () => {
    loadList();
  };

  const handleToggleHandshake = async (row) => {
    if (row.handshake_status === null || pageBusy || toggleBusyId === row.id) return;
    setToggleBusyId(row.id);
    try {
      await dispatch(toggleHandshakeStatus(row.id)).unwrap();
      showSnackbar('Handshake status updated.', 'success');
      loadList();
    } catch (e) {
      showSnackbar(typeof e === 'string' ? e : 'Could not toggle handshake status.', 'error');
    } finally {
      setToggleBusyId(null);
    }
  };

  const handleHandshake = async (processorId) => {
    if (pageBusy) return;
    setHandshakeProcessorId(processorId);
    try {
      const data = await dispatch(processorHandshake(processorId)).unwrap();
      const msg = data?.message || 'Certificate handshake completed successfully.';
      showSnackbar(msg, 'success');
      loadList();
    } catch (e) {
      const text = typeof e === 'string' ? e : 'Handshake failed.';
      const isTimeout =
        text.toLowerCase().includes('timeout') || text.toLowerCase().includes('timed out');
      showSnackbar(text, isTimeout ? 'warning' : 'error');
      loadList();
    } finally {
      setHandshakeProcessorId(null);
    }
  };

  const handlePing = async (processorId) => {
    if (pageBusy || pingBusyId !== null) return;
    setPingBusyId(processorId);
    try {
      await dispatch(pingProcessorTerminal(processorId)).unwrap();
      showSnackbar('Ping terminal started on the API server (if supported).', 'success');
    } catch (e) {
      showSnackbar(typeof e === 'string' ? e : 'Ping terminal failed.', 'error');
    } finally {
      setPingBusyId(null);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        p: { xs: 0.3, sm: 0.5, md: 1, lg: 1.5 },
        position: 'relative',
      }}
    >
      {pageBusy && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: (theme) => theme.zIndex.modal - 1,
            backgroundColor: 'rgba(0,0,0,0.15)',
            pointerEvents: 'all',
          }}
        />
      )}

      <Box
        sx={{
          width: '100%',
          mx: 'auto',
          px: { xs: 0.3, sm: 0.5, md: 1, lg: 1.5 },
        }}
      >
        <Grid container spacing={{ xs: 0.3, sm: 0.5, md: 1, lg: 1 }}>
          <Grid
            item
            xs={12}
            md={3}
            sx={{
              order: { xs: 1, md: 1 },
              p: { xs: 0.3, sm: 0.5, md: 1, lg: 1.5 },
              borderRadius: { xs: '4px', lg: '8px' },
              mb: { xs: 0.3, lg: 0 },
            }}
          >
            <Typography
              variant="h6"
              sx={{
                mb: { xs: 0.8, sm: 1, md: 1.5, lg: 2 },
                color: theme.palette.text.secondary,
                fontSize: { xs: '12px', sm: '14px', md: '16px', lg: '20px' },
              }}
            >
              Settings
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: isTablet ? 'row' : 'column',
                flexWrap: isTablet ? 'wrap' : 'nowrap',
                gap: isTablet ? 1 : 0,
                justifyContent: isTablet ? 'flex-start' : 'flex-start',
                alignItems: isTablet ? 'flex-start' : 'stretch',
              }}
            >
              {visibleSidebarItemsWithPaths.map((item) => (
                <Box
                  key={item.label}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                  }}
                  sx={{
                    backgroundColor:
                      location.pathname === item.path
                        ? theme.palette.custom?.containerBg || '#f5f5f5'
                        : 'transparent',
                    color:
                      location.pathname === item.path
                        ? theme.palette.text.primary
                        : theme.palette.text.secondary,
                    px: isTablet ? 1.5 : { xs: 0.8, sm: 1, md: 1.5, lg: 2 },
                    py: isTablet ? 0.8 : { xs: 0.3, sm: 0.5, md: 0.8, lg: 1 },
                    borderRadius: '4px',
                    mb: isTablet ? 0 : { xs: 0.2, sm: 0.3, md: 0.5, lg: 0.8 },
                    mr: isTablet ? 1 : 0,
                    fontSize: isTablet ? '11px' : { xs: '9px', sm: '10px', md: '12px', lg: '14px' },
                    fontWeight: location.pathname === item.path ? 600 : 400,
                    cursor: 'pointer',
                    minWidth: isTablet ? 'auto' : '100%',
                    textAlign: isTablet ? 'center' : 'left',
                    whiteSpace: isTablet ? 'nowrap' : 'normal',
                    '&:hover': {
                      backgroundColor: theme.palette.custom?.containerBg || '#f5f5f5',
                    },
                    ...(isTablet && {
                      flex: '0 0 auto',
                      border: '1px solid rgba(255,255,255,0.1)',
                      minHeight: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }),
                  }}
                >
                  {item.label}
                </Box>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} lg={9} sx={{ order: { xs: 2, lg: 2 } }}>
            <Box
              sx={{
                backgroundColor: '#fff',
                borderRadius: { xs: '4px', sm: '6px', md: '8px', lg: '10px' },
                p: { xs: 0.5, sm: 0.8, md: 1.2, lg: 1.5 },
                width: '100%',
                minHeight: 'fit-content',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <MemoryIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 'bold',
                      fontSize: { xs: '14px', sm: '16px', md: '18px' },
                    }}
                  >
                    Processors
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    onClick={handleDiscover}
                    disabled={pageBusy || discoverLoading || listLoading}
                    startIcon={discoverLoading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                    sx={{
                      backgroundColor: buttonColor,
                      color: '#fff',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: darken(buttonColor, 0.12) },
                    }}
                  >
                    {discoverLoading ? 'Discovering…' : 'Discover Processor'}
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleRefresh}
                    disabled={pageBusy || listLoading}
                    startIcon={<RefreshIcon />}
                    sx={{
                      backgroundColor: buttonColor,
                      color: '#fff',
                      textTransform: 'none',
                      '&:hover': { backgroundColor: darken(buttonColor, 0.12) },
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>

              {listAllError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {listAllError}
                </Alert>
              )}

              {listLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}

              {!listLoading && !listAllError && processorsListAll.length > 0 && (
                <TableContainer
                  component={Paper}
                  sx={{
                    borderRadius: 1,
                    boxShadow: 1,
                    overflow: 'auto',
                    maxHeight: 640,
                  }}
                >
                  <Table size="small" sx={{ minWidth: 720 }}>
                    <TableHead>
                      <TableRow>
                        {['SI.NO', 'IPv4', 'System', 'Serial', 'Handshake status', 'Handshake', 'Ping'].map(
                          (h) => (
                            <TableCell
                              key={h}
                              sx={{
                                fontWeight: 600,
                                fontSize: '13px',
                                textAlign: 'center',
                                borderBottom: '2px solid #ddd',
                                backgroundColor: '#cdc0a0',
                              }}
                            >
                              {h}
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processorsListAll.map((row, index) => {
                        const sid = row.id;
                        const hs = row.handshake_status;
                        const toggleDisabled =
                          hs === null || hs === undefined || pageBusy || toggleBusyId === sid;
                        const switchChecked = hs === true;
                        const rowHandshakeLoading = handshakeProcessorId === sid;
                        return (
                          <TableRow
                            key={sid ?? index}
                            sx={{
                              '&:nth-of-type(odd) td': { backgroundColor: '#fafafa' },
                              '&:hover td': { backgroundColor: 'rgba(0,0,0,0.03)' },
                            }}
                          >
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                              {sid}
                            </TableCell>
                            <TableCell align="center">{row.ipv4 ?? '—'}</TableCell>
                            <TableCell align="center">{row.system ?? '—'}</TableCell>
                            <TableCell align="center">{row.serial ?? '—'}</TableCell>
                            <TableCell align="center">
                              <Switch
                                checked={switchChecked}
                                disabled={toggleDisabled}
                                onChange={() => handleToggleHandshake(row)}
                                inputProps={{
                                  'aria-label': `Handshake status for processor ${sid}`,
                                }}
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#2e7d32' },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#81c784',
                                  },
                                  '& .MuiSwitch-switchBase': { color: hs === false ? '#c62828' : undefined },
                                  '& .MuiSwitch-track':
                                    hs === false ? { backgroundColor: '#ffcdd2' } : undefined,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="contained"
                                size="small"
                                disabled={pageBusy || rowHandshakeLoading}
                                onClick={() => handleHandshake(sid)}
                                sx={{
                                  minWidth: 130,
                                  backgroundColor: buttonColor,
                                  textTransform: 'none',
                                  '&:hover': { backgroundColor: darken(buttonColor, 0.12) },
                                }}
                              >
                                {rowHandshakeLoading ? (
                                  <>
                                    <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                                    Handshaking…
                                  </>
                                ) : (
                                  'Handshake'
                                )}
                              </Button>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                disabled={pageBusy || pingBusyId !== null}
                                onClick={() => handlePing(sid)}
                                sx={{
                                  minWidth: 88,
                                  textTransform: 'none',
                                  borderColor: '#8d7b5e',
                                  color: '#5d4d38',
                                }}
                              >
                                {pingBusyId === sid ? <CircularProgress size={16} /> : 'Ping'}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {!listLoading && !listAllError && processorsListAll.length === 0 && (
                <Box
                  sx={{
                    py: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography>No processors in the database.</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Use Discover Processor to scan the network.
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProcessorsSettings;
