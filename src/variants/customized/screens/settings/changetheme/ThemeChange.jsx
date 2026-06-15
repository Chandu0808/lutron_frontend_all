import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, Button, Grid, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SettingsSidebar from '../../../components/SettingsSidebar';
import HexColorPicker from '../../../utils/HexColorPicker';
import '../../../styles/HexColorPicker.css';
import {
    clearBackgroundImage,
    fetchApplicationTheme,
    fetchBackgroundImage,
    fetchHeatMapTheme,
    fetchThemeSettings,
    selectApplicationTheme,
    selectBackgroundImage,
    selectHeatMapTheme,
    updateApplicationTheme,
    updateBackgroundImage,
    updateHeatMapTheme
} from '../../../redux/slice/theme/themeSlice';
import { Snackbar, Alert } from '@mui/material';
import { ThemeContext } from '../theme/ThemeContext';
import { UseAuth, getVisibleSidebarItemsWithPaths } from '../../../customhooks/UseAuth';
import { isLightSurface } from '../../../utils/themeOnSurface';
import { settingsSidebarColumnDividerSx } from '../../../utils/settingsSidebarTabStyles';
import { getLutronDataClient } from '../../../redux/slice/home/homeSlice';
import UiVariantSelector from '../../../../../components/UiVariantSelector';
import FofpThemeColorCard from './FofpThemeColorCard';

const ThemeChange = () => {
    const normalizeColor = (color) => {
        if (typeof color === 'string' && color.startsWith('hsl')) {
            const [h, s, l] = color.match(/\d+/g).map(Number);
            return hslToHex(h, s, l);
        }
        return color;
    };

    const hslToHex = (h, s, l) => {
        s /= 100;
        l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;

        if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
        else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
        else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
        else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
        else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
        else[r, g, b] = [c, 0, x];

        const toHex = n => {
            const hex = Math.round((n + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const muiTheme = useTheme();
    const isTablet = useMediaQuery(muiTheme.breakpoints.between('sm', 'md'));
    const settingsSidebarMdUp = useMediaQuery(muiTheme.breakpoints.up('md'));
    const { reloadTheme } = useContext(ThemeContext);
    const appTheme = useSelector(selectApplicationTheme);
    const contentColor = appTheme?.application_theme?.content || '#ffffff';
    const isDefaultWhiteTheme = isLightSurface(contentColor);
    const heatMapTheme = useSelector(selectHeatMapTheme)
    const apibgImage = useSelector(selectBackgroundImage)
    const DEFAULT_THEME_COLORS = {
        Background: '#CDC0A0',
        Content: '#807864',
        Button: '#232323'
    };

    const [themeColorMap, setThemeColorMap] = useState({
        Background: '#ffffff',
        Content: '#000000',
        Button: '#cccccc'
    });

    const [heatmapColorMap, setHeatmapColorMap] = useState({
        Light: '#f2ff00',
        Occupancy: '#4318d1',
        Energy: '#006400'
    });
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');
    const [selectedThemeColor, setSelectedThemeColor] = useState('#ffffff');
    const [selectedHeatmapColor, setSelectedHeatmapColor] = useState('#ffffff');

    // Add responsive breakpoints
    
    const [activeThemeTab, setActiveThemeTab] = useState('Background');
    const [activeHeatmapTab, setActiveHeatmapTab] = useState('Light');
    const [dynamicButtonColor, setDynamicButtonColor] = useState('#232323');
    useEffect(() => {
        dispatch(getLutronDataClient());
        setDynamicButtonColor(themeColorMap?.Button || '#232323');
    }, [themeColorMap?.Button]);

    // const filename = file.name;  // or use a UUID generator if needed
    // const backendUrl = `http://localhost:8000/background_image/${file.name}`;
    // setBackgroundImage(backendUrl);

    useEffect(() => {
        // Only fetch if not already loaded
        if (!appTheme || !appTheme.application_theme) {
            dispatch(fetchApplicationTheme());
        }
        if (!heatMapTheme || !heatMapTheme.application_theme) {
            dispatch(fetchHeatMapTheme());
        }
        const bgApiLoaded =
            apibgImage &&
            (apibgImage.status != null || Object.prototype.hasOwnProperty.call(apibgImage, 'background_image'));
        if (!bgApiLoaded) {
            dispatch(fetchBackgroundImage());
        }
    }, [dispatch, appTheme, heatMapTheme, apibgImage]);
    useEffect(() => {
        if (appTheme?.application_theme) {
            const { background, content, button } = appTheme.application_theme;
            const updatedMap = {
                Background: background || '#ffffff',
                Content: content || '#000000',
                Button: button || '#cccccc',
            };
            setThemeColorMap(updatedMap);
            setSelectedThemeColor(updatedMap[activeThemeTab] || '#ffffff');
        }

        if (heatMapTheme?.application_theme) {
            const { light, occupancy, energy } = heatMapTheme.application_theme;

            const normalizedHeatmap = {
                Light: normalizeColor(light || '#f2ff00'),
                Occupancy: normalizeColor(occupancy || '#4318d1'),
                Energy: normalizeColor(energy || '#006400'),
            };

            setHeatmapColorMap(normalizedHeatmap);
            setSelectedHeatmapColor(normalizedHeatmap[activeHeatmapTab] || '#ffffff');
        }
    }, [appTheme, heatMapTheme]);
    const backgroundRemovedRef = useRef(false);

    useEffect(() => {
        if (backgroundRemovedRef.current) {
            const apiUrl = apibgImage?.background_image?.trim();
            setBackgroundImage(apiUrl || null);
            return;
        }
        const apiUrl = apibgImage?.background_image?.trim();
        if (apiUrl) {
            setBackgroundImage(apiUrl);
            return;
        }
        if (
            apibgImage &&
            (Object.prototype.hasOwnProperty.call(apibgImage, 'background_image') || apibgImage.status)
        ) {
            setBackgroundImage(null);
            return;
        }
        const legacyUrl = appTheme?.application_theme?.backgroundImageUrl?.trim();
        if (legacyUrl) {
            setBackgroundImage(legacyUrl);
            return;
        }
        setBackgroundImage(null);
    }, [apibgImage, appTheme]);

    // const handleThemeSave = () => {
    //     dispatch(updateApplicationTheme({
    //         background: themeColorMap.Background,
    //         content: themeColorMap.Content,
    //         button: themeColorMap.Button
    //     }));
    //     setSnackbarMessage("Theme colors saved successfully.");
    //     setSnackbarOpen(true);
    // };
    const handleThemeSave = async () => {
        const payload = {
            background: normalizeColor(themeColorMap.Background),
            content: normalizeColor(themeColorMap.Content),
            button: normalizeColor(themeColorMap.Button)
        };

        try {
            await dispatch(updateApplicationTheme(payload)).unwrap();
            reloadTheme(payload, backgroundImage);
            setSnackbarMessage("Theme colors saved successfully.");
            setSnackbarOpen(true);
            if (typeof window !== 'undefined') {
                setTimeout(() => window.location.reload(), 300);
            }
        } catch (error) {
            // Optionally handle error feedback here
        }
    };

    const handleHeatmapSave = () => {
        const payload = {
            light: normalizeColor(heatmapColorMap.Light),
            occupancy: normalizeColor(heatmapColorMap.Occupancy),
            energy: normalizeColor(heatmapColorMap.Energy),
        };

        dispatch(updateHeatMapTheme(payload));
        // Publish single energy color to CSS variable for gradient usage
        if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--heatmap-energy', normalizeColor(heatmapColorMap.Energy));
        }
        setSnackbarMessage("Heatmap colors saved successfully.");
        setSnackbarOpen(true);
    };

    // const handleThemeReset = () => {
    //     setThemeColorMap(DEFAULT_THEME_COLORS);
    //     setSelectedThemeColor(DEFAULT_THEME_COLORS[activeThemeTab]);
    //     dispatch(updateApplicationTheme({
    //         background: DEFAULT_THEME_COLORS.Background,
    //         content: DEFAULT_THEME_COLORS.Content,
    //         button: DEFAULT_THEME_COLORS.Button
    //     }));
    //     setSnackbarMessage("Theme colors reset to default.");
    //     setSnackbarOpen(true);
    // };
    const handleThemeReset = async () => {
        const defaultColors = {
            Background: '#CDC0A0',
            Content: '#807864',
            Button: '#232323',
        };

        setThemeColorMap(defaultColors);
        setSelectedThemeColor(defaultColors[activeThemeTab]);

        const payload = {
            background: normalizeColor(defaultColors.Background),
            content: normalizeColor(defaultColors.Content),
            button: normalizeColor(defaultColors.Button),
        };

        try {
            await dispatch(updateApplicationTheme(payload)).unwrap();
            reloadTheme(payload);
            setSnackbarMessage("Theme colors reset to default.");
            setSnackbarOpen(true);
            if (typeof window !== 'undefined') {
                setTimeout(() => window.location.reload(), 300);
            }
        } catch (error) {
            // Optionally handle error feedback here
        }
    };
    const sidebarItemPaths = {
        "Home": "/main",
        "Theme": "/theme-change",
        "Widgets": "/widgets/",
        "Manage Area Groups": "/manage-area-groups",
        "Area Size & Load": "/area-size-load",
        "Email Server": "/email-server/",
        "Users": "/users",
        "Floor": "/floor",
        "Help": "/create-help/"
    };
    //background image
    const [backgroundImage, setBackgroundImage] = useState(null);
    const fileInputRef = React.useRef();

    const handleBackgroundImageSave = async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            // 1. Upload image via Redux thunk (sends to /theme/background)
            const response = await dispatch(updateBackgroundImage(formData)).unwrap();

            // 2. Backend returns relative path like "/background_image/bg_1234.png"
            const backendPath = response?.background_image;

            if (backendPath) {
                backgroundRemovedRef.current = false;
                dispatch(updateApplicationTheme({ background_image: backendPath }));
                const bgResponse = await dispatch(fetchBackgroundImage()).unwrap();
                dispatch(fetchThemeSettings());
                const bgUrl = bgResponse?.background_image?.trim();
                if (bgUrl) {
                    reloadTheme(
                        {
                            background: normalizeColor(themeColorMap.Background),
                            content: normalizeColor(themeColorMap.Content),
                            button: normalizeColor(themeColorMap.Button),
                        },
                        bgUrl
                    );
                }
            }
        } catch (error) {
            // Error uploading background image
        }
    };

    const handleBackgroundImageClear = async () => {
        try {
            await dispatch(clearBackgroundImage()).unwrap();
            backgroundRemovedRef.current = true;
            setBackgroundImage(null);
            reloadTheme(
                {
                    background: normalizeColor(themeColorMap.Background),
                    content: normalizeColor(themeColorMap.Content),
                    button: normalizeColor(themeColorMap.Button),
                },
                ''
            );
            dispatch(fetchThemeSettings());
            dispatch(fetchBackgroundImage());
            dispatch(fetchApplicationTheme());
            setSnackbarSeverity('success');
            setSnackbarMessage('Background image removed.');
            setSnackbarOpen(true);
        } catch (error) {
            setSnackbarSeverity('error');
            setSnackbarMessage('Failed to remove background image.');
            setSnackbarOpen(true);
        }
    };

    const triggerFileSelect = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const renderTabs = (labels, active, setActive, colorMap, setSelectedColor) => (
        <Box className="pill-tab-container">
            {labels.map(label => (
                <button
                    key={label}
                    className={`pill-tab ${active === label ? 'active' : ''}`}
                    onClick={() => {
                        setActive(label);
                        setSelectedColor(colorMap[label] ?? '#ffffff');
                    }}
                >
                    {label}
                </button>
            ))}
        </Box>
    );

    const { role } = UseAuth();
    const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(role);
    
    const normalizedRole = role ? role.toLowerCase() : '';
    const canAccessTheme = normalizedRole === 'superadmin' || normalizedRole === 'super admin' || normalizedRole === 'admin';

    useEffect(() => {
        if (!canAccessTheme) {
            navigate('/manage-area-groups', { replace: true });
        }
    }, [canAccessTheme, navigate]);

    if (!canAccessTheme) return null;

    const themePickerTitleSx = {
        fontWeight: 'bold',
        fontSize: '1rem',
        color: 'text.primary',
        mb: 1,
        minHeight: 28,
        lineHeight: 1.4,
    };

    return (
        <Grid
            container
            sx={{
                maxWidth: '100%',
                borderRadius: '10px',
                alignItems: 'flex-start',
                p: '18px',
                ml: '18px',
            }}
        >
            <Grid item xs={12} sx={{ pt: '18px', mb: 1.5 }}>
                <Typography
                    variant="h6"
                    sx={{
                        color: muiTheme.palette.text.secondary,
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
                    ...settingsSidebarColumnDividerSx(isDefaultWhiteTheme, settingsSidebarMdUp && !isTablet),
                }}
            >
                <SettingsSidebar items={visibleSidebarItemsWithPaths} embedded />
            </Grid>

            <Grid
                item
                xs={12}
                md={10}
                sx={{
                    backgroundColor: isDefaultWhiteTheme ? '#ffffff' : contentColor,
                    p: 3,
                    borderTopRightRadius: '10px',
                    borderBottomRightRadius: '10px',
                }}
            >
                <Box sx={{ margin: "1em", marginBottom: 0 }}>
                    <UiVariantSelector />
                </Box>
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
                        columnGap: 3,
                        rowGap: 2,
                        alignItems: 'flex-start',
                        margin: '1em',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Theme Picker Card */}
                    <Box sx={{ display: 'flex', minWidth: 0 }}>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" sx={{ ...themePickerTitleSx, visibility: 'hidden' }} aria-hidden>
                                &nbsp;
                            </Typography>
                            <Box className="color-picker-card" sx={{ backgroundColor: "white", padding: "1em", borderRadius: "1em", width: '100%' }}>
                            {renderTabs(['Background', 'Content', 'Button'], activeThemeTab, setActiveThemeTab, themeColorMap, setSelectedThemeColor)}
                            <HexColorPicker
                                colorMap={themeColorMap}
                                setColorMap={setThemeColorMap}
                                selectedColor={selectedThemeColor}
                                setSelectedColor={setSelectedThemeColor}
                                activeTarget={activeThemeTab}
                                width={200}
                                height={220}
                                hexRadius={8}
                            />
                            <Box mt={2} display="flex" justifyContent="space-between" px={2} gap={2}>
                                <Button
                                    className="save-button"
                                    onClick={handleThemeReset}
                                    sx={{
                                        backgroundColor: dynamicButtonColor,
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        px: 4,
                                        py: 1,
                                        borderRadius: 1,
                                    }}
                                >
                                    Reset
                                </Button>
                                <Button
                                    className="save-button"
                                    onClick={handleThemeSave}
                                    sx={{
                                        backgroundColor: dynamicButtonColor,
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        px: 4,
                                        py: 1,
                                        borderRadius: 1,
                                    }}
                                >
                                    Save
                                </Button>
                            </Box>

                        </Box>
                        </Box>
                    </Box>

                    {/* Heatmap Picker Card */}
                    <Box sx={{ display: 'flex', minWidth: 0 }}>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Typography variant="subtitle1" sx={{ ...themePickerTitleSx, visibility: 'hidden' }} aria-hidden>
                                &nbsp;
                            </Typography>
                            <Box className="color-picker-card" sx={{ backgroundColor: "white", padding: "1em", borderRadius: "1em", width: '100%' }}>
                            {renderTabs(['Light', 'Occupancy', 'Energy'], activeHeatmapTab, setActiveHeatmapTab, heatmapColorMap, setSelectedHeatmapColor)}
                            <HexColorPicker
                                colorMap={heatmapColorMap}
                                setColorMap={setHeatmapColorMap}
                                selectedColor={selectedHeatmapColor}
                                setSelectedColor={setSelectedHeatmapColor}
                                activeTarget={activeHeatmapTab}
                                width={200}
                                height={220}
                                hexRadius={8}
                            />
                            <Box mt={2} display="flex" justifyContent="center">
                                <Button
                                    className="save-button"
                                    onClick={handleHeatmapSave}
                                    sx={{ backgroundColor: dynamicButtonColor, color: '#fff', fontWeight: 'bold', px: 4, py: 1, borderRadius: 1 }}
                                >
                                    Save
                                </Button>
                            </Box>
                        </Box>
                        </Box>
                    </Box>

                    <FofpThemeColorCard
                        renderTabs={renderTabs}
                        dynamicButtonColor={dynamicButtonColor}
                        actionButtonLabel="#fff"
                        onSaveMessage={(message) => {
                            setSnackbarMessage(message);
                            setSnackbarOpen(true);
                        }}
                    />
                </Box>
                <Box sx={{ mt: 4, p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1 } color={"white"}>
                        Choose Background
                    </Typography>

                    <Box
                        sx={{
                            width: 240,
                            height: 160,
                            border: '1px solid #ccc',
                            borderRadius: 2,
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: '#f9f9f9',
                            boxShadow: 1,
                        }}
                    >
                        {backgroundImage ? (
                            <img
                                src={backgroundImage}
                                alt="Background Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No image selected
                            </Typography>
                        )}
                    </Box>

                    <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button
                            component="label"
                            variant="outlined"
                            size="small"
                            sx={{
                                fontWeight: 'bold',
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 2,
                                py: 1,
                                color: "black",
                                backgroundColor: '#fff',
                                '&:hover': {
                                    backgroundColor: '#f0f0f0',
                                },
                            }}
                            startIcon={<i className="fas fa-pen"></i>}
                        >
                            Change Background
                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleBackgroundImageSave(file);
                                }}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            disabled={!backgroundImage}
                            onClick={handleBackgroundImageClear}
                            sx={{
                                fontWeight: 'bold',
                                borderRadius: 2,
                                textTransform: 'none',
                                px: 2,
                                py: 1,
                                color: "black",
                                backgroundColor: '#fff',
                                '&:hover': {
                                    backgroundColor: '#f0f0f0',
                                },
                            }}
                        >
                            Remove Background
                        </Button>
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
        </Grid >

    );
};

export default ThemeChange;
