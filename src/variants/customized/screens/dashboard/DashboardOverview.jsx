import React from 'react'
import { Box, Grid, Typography, CircularProgress } from '@mui/material'
import dashboardOverviewBg from '../../assets/images/dashboard-overview-bg.png'
import OverviewMetricTile from '../../../../shared/dashboard/widgets/overview/OverviewMetricTile'
import AlertsWidget from '../../../../shared/dashboard/widgets/alerts'
import {
  OVERVIEW_TILE_TYPES,
  OVERVIEW_THEME_VARIANTS,
} from '../../../../shared/dashboard/widgets/overview'

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 2,
  p: 2,
  height: '100%',
  minHeight: 360,
  cursor: 'pointer',
  transition: 'box-shadow 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  '&:hover': { boxShadow: 3 },
}

function DashboardOverview({
  data,
  loading,
  error,
  onNavigateToEnergy,
  onNavigateToAlerts,
  onNavigateToSpaceUtilization,
  onNavigateToSchedule,
  onNavigateToFloor,
  onNavigateToQuickControls,
}) {
  const energy = data?.energy
  const alerts = data?.alerts
  const schedule = data?.schedule?.next
  const floorsCount = data?.floors?.count
  const spaceUtil = data?.space_utilization

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Failed to load dashboard overview.</Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 460,
        position: 'relative',
        backgroundImage: `url(${dashboardOverviewBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <Grid container spacing={2} sx={{ p: 1.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <OverviewMetricTile
            tileType={OVERVIEW_TILE_TYPES.ENERGY}
            energy={energy}
            onClick={onNavigateToEnergy}
            themeVariant={OVERVIEW_THEME_VARIANTS.GRID}
            cardSx={cardStyle}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <AlertsWidget
            alerts={alerts}
            onClick={onNavigateToAlerts}
            shellVariant="customized"
            cardSx={cardStyle}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <OverviewMetricTile
            tileType={OVERVIEW_TILE_TYPES.SCHEDULES}
            schedule={schedule}
            onClick={onNavigateToSchedule}
            themeVariant={OVERVIEW_THEME_VARIANTS.GRID}
            cardSx={cardStyle}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <OverviewMetricTile
            tileType={OVERVIEW_TILE_TYPES.QUICK_CONTROLS}
            onClick={onNavigateToQuickControls}
            themeVariant={OVERVIEW_THEME_VARIANTS.GRID}
            cardSx={cardStyle}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <OverviewMetricTile
            tileType={OVERVIEW_TILE_TYPES.FLOORS}
            floorsCount={floorsCount}
            onClick={onNavigateToFloor}
            themeVariant={OVERVIEW_THEME_VARIANTS.GRID}
            cardSx={cardStyle}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <OverviewMetricTile
            tileType={OVERVIEW_TILE_TYPES.SPACE_UTILIZATION}
            spaceUtil={spaceUtil}
            onClick={onNavigateToSpaceUtilization}
            themeVariant={OVERVIEW_THEME_VARIANTS.GRID}
            cardSx={cardStyle}
          />
        </Grid>
      </Grid>
    </Box>
  )
}

export default DashboardOverview
