import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import HexColorPicker from '../../../utils/HexColorPicker';
import {
    fetchFofpConfig,
    updateFofpConfig,
    selectFofpConfig,
    selectFofpConfigError,
} from '../../../redux/slice/fofp/fofpSlice';
import {
    DEFAULT_FOFP_MARKER_COLOR,
    normalizeFofpHex,
    resolveFofpThemePickerColor,
} from '../../heatmap/fofpColorUtils';
import {
    BASIC_THEME_PICKER_HEX,
    themePickerCardCellSx,
    themePickerCardColumnSx,
    themePickerCardSurfaceSx,
    themePickerTitleSpacerSx,
} from './themePickerLayout';

/**
 * FOFP color card for Settings → Theme (isolated from app/heatmap pickers).
 */
const FofpThemeColorCard = ({
    renderTabs,
    dynamicButtonColor,
    actionButtonLabel,
    onSaveMessage,
    themePickerActionsSx,
}) => {
    const dispatch = useDispatch();
    const fofpConfig = useSelector(selectFofpConfig);
    const fofpConfigError = useSelector(selectFofpConfigError);
    const [activeFofpTab, setActiveFofpTab] = useState('FOFP');
    const [fofpColorMap, setFofpColorMap] = useState({
        FOFP: DEFAULT_FOFP_MARKER_COLOR,
    });
    const [selectedFofpColor, setSelectedFofpColor] = useState(DEFAULT_FOFP_MARKER_COLOR);

    useEffect(() => {
        dispatch(fetchFofpConfig());
    }, [dispatch]);

    useEffect(() => {
        if (fofpConfig?.marker_color) {
            const hex = normalizeFofpHex(fofpConfig.marker_color);
            setFofpColorMap({ FOFP: hex });
            setSelectedFofpColor(hex);
        }
    }, [fofpConfig?.marker_color]);

    const handleFofpColorSave = async () => {
        const color = resolveFofpThemePickerColor(fofpColorMap.FOFP);
        try {
            const saved = await dispatch(updateFofpConfig({ marker_color: color })).unwrap();
            const hex = normalizeFofpHex(saved?.marker_color || color);
            setFofpColorMap({ FOFP: hex });
            setSelectedFofpColor(hex);
            onSaveMessage('FOFP color saved successfully.');
        } catch {
            onSaveMessage('Failed to save FOFP color.');
        }
    };

    const actionsSx = themePickerActionsSx ?? {
        mt: 'auto',
        pt: 1,
        minHeight: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    return (
        <Box sx={themePickerCardCellSx}>
            <Box sx={themePickerCardColumnSx}>
                <Typography variant="subtitle1" sx={themePickerTitleSpacerSx} aria-hidden>
                    &nbsp;
                </Typography>
                <Box
                    className="color-picker-card"
                    sx={themePickerCardSurfaceSx}
                    data-testid="fofp-theme-color-card"
                >
                    {renderTabs(
                        ['FOFP'],
                        activeFofpTab,
                        setActiveFofpTab,
                        fofpColorMap,
                        setSelectedFofpColor
                    )}
                    {fofpConfigError && (
                        <Typography
                            variant="caption"
                            color="error"
                            sx={{ display: 'block', mb: 1 }}
                            data-testid="fofp-theme-config-error"
                        >
                            {fofpConfigError}
                        </Typography>
                    )}
                    <HexColorPicker
                        colorMap={fofpColorMap}
                        setColorMap={setFofpColorMap}
                        selectedColor={selectedFofpColor}
                        setSelectedColor={setSelectedFofpColor}
                        activeTarget={activeFofpTab}
                        width={BASIC_THEME_PICKER_HEX.width}
                        height={BASIC_THEME_PICKER_HEX.height}
                        hexRadius={BASIC_THEME_PICKER_HEX.hexRadius}
                    />
                    <Box sx={actionsSx}>
                        <Button
                            className="save-button"
                            onClick={handleFofpColorSave}
                            data-testid="fofp-theme-color-save"
                            sx={{
                                backgroundColor: dynamicButtonColor,
                                color: actionButtonLabel,
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
    );
};

export default FofpThemeColorCard;
