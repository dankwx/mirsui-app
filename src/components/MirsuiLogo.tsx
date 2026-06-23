import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

// Réplica do logo do front (components/MirsuiLogo).
export default function MirsuiLogo({ size = 32 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx="50" cy="50" r="49" fill="#16120c" />
      <Path
        d="M50 1 a49 49 0 0 1 0 98 a24.5 24.5 0 0 1 0-49 a24.5 24.5 0 0 0 0-49z"
        fill="#cdef36"
      />
      <Circle cx="50" cy="25.5" r="7.2" fill="#16120c" />
      <Circle cx="50" cy="74.5" r="7.2" fill="#cdef36" />
    </Svg>
  )
}
