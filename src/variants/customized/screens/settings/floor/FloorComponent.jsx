import React from 'react';
import { Navigate } from 'react-router-dom';
import { Grid } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectApplicationTheme } from '../../../redux/slice/theme/themeSlice';
import { ConfirmDialog } from '../../../utils/FeedbackUI';
import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../../customhooks/UseAuth';
import SettingsSidebar from '../../../components/SettingsSidebar';
import { settingsGridContainerSx } from '../../../utils/settingsPageLayout';
import FloorSettingsContent from '../../../../../shared/settings/floor/FloorSettingsContent';
import {
  fetchFloors,
  deleteFloor,
  setFloorSortMode,
  reorderFloors,
  selectFloors,
  selectManualSortEnabled,
} from '../../../redux/slice/floor/floorSlice';

export default function FloorComponent() {
  const appTheme = useSelector(selectApplicationTheme);
  const buttonColor = appTheme?.application_theme?.button || '#232323';
  const { role } = UseAuth();
  const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(role);

  if (role !== 'Superadmin') return <Navigate to="/setting/main" replace />;

  return (
    <Grid container sx={settingsGridContainerSx}>
      <SettingsSidebar items={visibleSidebarItemsWithPaths} />
      <Grid
        item
        xs={12}
        md={9}
        sx={{
          p: 3,
          borderTopRightRadius: '10px',
          borderBottomRightRadius: '10px',
        }}
      >
        <FloorSettingsContent
          buttonColor={buttonColor}
          fetchFloors={fetchFloors}
          deleteFloor={deleteFloor}
          setFloorSortMode={setFloorSortMode}
          reorderFloors={reorderFloors}
          selectFloors={selectFloors}
          selectManualSortEnabled={selectManualSortEnabled}
          ConfirmDialog={ConfirmDialog}
        />
      </Grid>
    </Grid>
  );
}
