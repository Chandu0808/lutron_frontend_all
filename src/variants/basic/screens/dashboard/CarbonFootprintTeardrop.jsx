import React from 'react'
import { Box, Typography } from '@mui/material'
import { formatCo2Number } from '../../utils/shadesWidgetSettings'
import co2GreenIcon from '../../assets/images/co2-green-icon.png'

const VALUE_COLOR = '#00263e'
const UNIT_COLOR = '#000000'

/**
 * Carbon footprint gauge — green CO2 icon with leaves and stacked values (reference UI).
 * @param {number|null} co2Kg
 */
function CarbonFootprintTeardrop({ co2Kg }) {
  const displayValue = formatCo2Number(co2Kg)
  const hasValue = co2Kg != null && Number.isFinite(Number(co2Kg))

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        textAlign: 'center',
      }}
      aria-label={hasValue ? `Carbon footprint ${displayValue} kilograms CO2` : 'Carbon footprint unavailable'}
    >
      {/* Green CO2 Leaf Icon */}
      <Box
        component="img"
        src={co2GreenIcon}
        alt="CO2 Icon"
        sx={{
          width: 'min(92%, min(8rem, 42cqi, 46cqh))',
          height: 'min(58%, min(8rem, 42cqi, 46cqh))',
          maxWidth: '100%',
          objectFit: 'contain',
          flexShrink: 0,
          mb: { xs: 0.50, sm: 0.1 },
          userSelect: 'none',
        }}
      />

      {/* Value */}
      <Typography
        component="div"
        sx={{
          fontWeight: 700,
          color: VALUE_COLOR,
          fontSize: 'clamp(1.5rem, 0.9rem + 4cqi, 2.1rem)',
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
        }}
      >
        {displayValue}
      </Typography>

      {/* Unit */}
      <Typography
        component="div"
        sx={{
          mt: 0.25,
          color: UNIT_COLOR,
          fontSize: 'clamp(0.62rem, 0.42rem + 1.8cqi, 0.82rem)',
          lineHeight: 1.1,
          fontWeight: 500,
        }}
      >
        kg CO
        <Box component="span" sx={{ fontSize: '0.72em', verticalAlign: 'sub', lineHeight: 0 }}>
          2
        </Box>
      </Typography>
    </Box>
  )
}

export default React.memo(CarbonFootprintTeardrop)

