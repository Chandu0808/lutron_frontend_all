import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    TextField,
    Divider,
    Button,
    Grid,
    useTheme,
    useMediaQuery,
    Snackbar,
    Alert
} from '@mui/material';
import { SidebarItems, getVisibleSidebarItems } from '../../utils/sidebarItems';
import { BASIC_MANAGE_AREA_GROUPS_PATH } from '../../utils/basicSettingsPaths';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createEmail, fetchEmailConfigs, getEmailData, testEmail } from '../../redux/slice/settingsslice/heatmap/groupOccupancySlice';
import { selectApplicationTheme } from '../../redux/slice/theme/themeSlice';
import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../customhooks/UseAuth';
import { isWhiteAreaPickerChrome } from '../../utils/themeOnSurface';
import { settingsSidebarColumnDividerSx } from '../../utils/settingsSidebarTabStyles';
import SettingsSidebarNav from '../../components/SettingsSidebarNav';

const EmailServer = () => {
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const dispatch = useDispatch()
    const theme = useTheme();
    const settingsSidebarMdUp = useMediaQuery(theme.breakpoints.up('md'));
    const navigate = useNavigate();
    const emailData = useSelector(getEmailData)
    const appTheme = useSelector(selectApplicationTheme);
    const backgroundColor = appTheme?.application_theme?.background || '#ffffff';
    const contentColor = appTheme?.application_theme?.content || '#ffffff';
    const buttonColor = appTheme?.application_theme?.button || '#232323'
    const whiteChrome = isWhiteAreaPickerChrome(contentColor);
    const actionBlue = whiteChrome ? '#1565C0' : buttonColor;
    const isDefaultWhiteTheme = whiteChrome;
    const [formData, setFormData] = useState({
        serverName: '',
        port: '',
        serverEmail: '',
        senderName: '',
        sslRequired: false,
        authRequired: false,
        password: '',
        testEmail: '',
    });

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };
    const handleSendTestEmail = async () => {
        const payload = {
            to_email: formData.testEmail,
            subject: 'Test Email from LMS System'
        };
        try {
            await dispatch(testEmail(payload)).unwrap();
            setSnackbarSeverity('success');
            setSnackbarMessage('Test email sent successfully!');
        } catch (error) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to send test email!');
        } finally {
            setSnackbarOpen(true);
        }
    };
    const handleSave = async () => {
        const payload = {
            server_name: formData.serverName,
            port: Number(formData.port),
            server_email: formData.serverEmail,
            sender_name: formData.senderName,
            app_password: formData.password,
        };

        try {
            await dispatch(createEmail(payload)).unwrap();
            setSnackbarSeverity('success');
            setSnackbarMessage('Email configuration saved successfully!');
        } catch (error) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to save email configuration!');
        } finally {
            setSnackbarOpen(true);
        }
    };

    useEffect(() => {
        dispatch(fetchEmailConfigs()).then((res) => {
            const data = res.payload;
            if (Array.isArray(data) && data.length > 0) {
                const latest = data[0];
                setFormData({
                    serverName: latest.server_name || '',
                    port: latest.port?.toString() || '',
                    serverEmail: latest.server_email || '',
                    senderName: latest.sender_name || '',
                    sslRequired: true,
                    authRequired: true,
                    password: ''
                });
            }
        });
    }, []);

    const { role } = UseAuth();
    const visibleSidebarItems = getVisibleSidebarItems(role);
    const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(role);

    // Check if user has permission to access Email Server settings
    const canAccessEmailServer = () => {
        // Only Admin and Superadmin can access Email Server settings
        // All Operator roles (Not Required) according to Excel sheet
        return role === 'Superadmin' || role === 'Admin';
    };

    // Redirect unauthorized users
    useEffect(() => {
        if (!canAccessEmailServer()) {
            navigate(BASIC_MANAGE_AREA_GROUPS_PATH, { replace: true });
        }
    }, [role, navigate]);

    if (!canAccessEmailServer()) {
        return null;
    }

    return (
        <>
            <Grid container sx={{ ml: '18px', p: '18px' }}>
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

                <Grid
                    item
                    xs={12}
                    md={2}
                    sx={{
                        p: 0,
                        ...settingsSidebarColumnDividerSx(isDefaultWhiteTheme, settingsSidebarMdUp),
                    }}
                >
                    <SettingsSidebarNav items={visibleSidebarItemsWithPaths} />
                </Grid>
                <Grid
                    item
                    xs={12}
                    md={10}
                    sx={{
                        backgroundColor: whiteChrome ? '#ffffff' : contentColor,
                        p: 3,
                        borderTopRightRadius: '10px',
                        borderBottomRightRadius: '10px',
                    }}
                >
                    <Box
                        sx={{
                            mb: 2,
                            backgroundColor: 'transparent',
                            borderRadius: 0,
                            px: 0,
                            py: 0,
                        }}
                    >
                        <Typography
                            sx={{
                                color: '#000',
                                fontSize: '20px',
                                fontWeight: 600,
                            }}
                        >
                            SMTP Mail Server Settings
                        </Typography>
                    </Box>
                    <Grid container spacing={3} alignItems="flex-start">
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        color: '#000',
                                        minWidth: '120px',
                                        mr: 2,
                                        fontSize: '14px',
                                    }}
                                >
                                    Server Name
                                </Typography>
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={formData.serverName}
                                    onChange={handleChange('serverName')}
                                    variant="outlined"
                                    // placeholder="relay.cb.intra.lutron.com"
                                    sx={{
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '4px',
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        color: '#000',
                                        minWidth: '120px',
                                        mr: 2,
                                        fontSize: '14px',
                                    }}
                                >
                                    Server Email
                                </Typography>
                                <TextField
                                    fullWidth
                                    // label="Server Email"
                                    variant="outlined"
                                    size="small"
                                    value={formData.serverEmail || ''}
                                    onChange={handleChange('serverEmail')}
                                    sx={{
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '4px',
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        color: '#000',
                                        minWidth: '120px',
                                        mr: 2,
                                        fontSize: '14px',
                                    }}
                                >
                                    Sender Name
                                </Typography>
                                <TextField
                                    fullWidth
                                    // label="Sender Name"
                                    variant="outlined"
                                    size="small"
                                    value={formData.senderName || ''}
                                    onChange={handleChange('senderName')}
                                    sx={{
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '4px',
                                        },
                                    }}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        color: '#000',
                                        minWidth: '120px',
                                        mr: 2,
                                        fontSize: '14px',
                                    }}
                                >
                                    Port
                                </Typography>
                                <TextField
                                    fullWidth
                                    // label="Port"
                                    variant="outlined"
                                    size="small"
                                    value={formData.port || ''}
                                    onChange={handleChange('port')}
                                    sx={{
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '4px',
                                        },
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                    {/* Password field moved below the main grid with same width as other fields */}
                    <Grid container spacing={3} sx={{ mt: 0 }}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography
                                    sx={{
                                        color: '#000',
                                        minWidth: '120px',
                                        mr: 2,
                                        fontSize: '14px',
                                    }}
                                >
                                    Password
                                </Typography>
                                <TextField
                                    fullWidth
                                    type="password"
                                    variant="outlined"
                                    size="small"
                                    value={formData.password || ''}
                                    onChange={handleChange('password')}
                                    sx={{
                                        backgroundColor: '#fff',
                                        borderRadius: '4px',
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: '4px',
                                        },
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                    <Box display="flex" justifyContent="flex-end" gap={2} mt={1}>
                        <Button
                            variant="outlined"
                            onClick={() => setFormData({})}
                            sx={{
                                textTransform: 'none',
                                backgroundColor: '#fff',
                                color: '#1565C0',
                                borderColor: '#1565C0',
                                '&:hover': { borderColor: '#0d47a1', backgroundColor: 'rgba(21, 101, 192, 0.06)' },
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSave}
                            sx={{
                                textTransform: 'none',
                                backgroundColor: actionBlue,
                                color: '#fff',
                                '&:hover': { backgroundColor: actionBlue },
                            }}
                        >
                            Save
                        </Button>
                    </Box>
                    <Box
                        sx={{
                            mt: 3,
                            backgroundColor: 'transparent',
                            borderRadius: 0,
                            p: 0,
                        }}
                    >
                        <Typography
                            variant="subtitle1"
                            fontWeight="bold"
                            sx={{ color: '#000' }}
                        >
                            Test Email Configuration
                        </Typography>
                        <Divider
                            sx={{
                                mb: 2,
                                mt: 1,
                                borderColor: isDefaultWhiteTheme ? '#000' : 'rgba(0,0,0,0.12)',
                            }}
                        />
                        <Box sx={{ width: '100%', mb: 3 }}>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        placeholder="Enter Test Email"
                                        size="small"
                                        value={formData.testEmail}
                                        onChange={handleChange('testEmail')}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                backgroundColor: '#fff',
                                                borderRadius: 1,
                                            },
                                        }}
                                        InputProps={{
                                            style: {
                                                paddingLeft: 12,
                                                fontSize: '14px',
                                            },
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4} sx={{ mb: 2 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={handleSendTestEmail}
                                        sx={{
                                            backgroundColor: 'transparent',
                                            color: actionBlue,
                                            fontWeight: 'bold',
                                            height: 40,
                                            padding: '0 20px',
                                            borderRadius: 1,
                                            textTransform: 'none',
                                            borderColor: actionBlue,
                                            '&:hover': {
                                                borderColor: actionBlue,
                                                backgroundColor: 'rgba(21, 101, 192, 0.06)',
                                            },
                                        }}
                                    >
                                        Send Test Email
                                    </Button>
                                </Grid>
                            </Grid>
                        </Box>
                    </Box>

                </Grid>
                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                >
                    <Alert
                        onClose={() => setSnackbarOpen(false)}
                        severity={snackbarSeverity}
                        sx={{ width: '100%' }}
                    >
                        {snackbarMessage}
                    </Alert>
                </Snackbar>
            </Grid>
        </>
    )
}

export default EmailServer
