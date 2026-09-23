import React from 'react'
import Svg, { Circle, Path } from 'react-native-svg'

/**
 * Os ícones da home do site, que usa lucide-react (licença ISC). Os traços
 * são os mesmos, copiados do lucide, para a seta diagonal e o disco terem o
 * mesmo desenho nas duas pontas. Ionicons não tem a seta diagonal, e ela é o
 * sinal de "acesso/continuidade" do club.
 */
type Nome =
  | 'arrow-up-right'
  | 'arrow-down'
  | 'plus'
  | 'rotate-ccw'
  | 'check'
  | 'disc-3'
  | 'sun'
  | 'moon'

const TRACOS: Record<Nome, React.ReactNode> = {
  'arrow-up-right': (
    <>
      <Path d="M7 7h10v10" />
      <Path d="M7 17 17 7" />
    </>
  ),
  'arrow-down': (
    <>
      <Path d="M12 5v14" />
      <Path d="m19 12-7 7-7-7" />
    </>
  ),
  plus: (
    <>
      <Path d="M5 12h14" />
      <Path d="M12 5v14" />
    </>
  ),
  'rotate-ccw': (
    <>
      <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <Path d="M3 3v5h5" />
    </>
  ),
  check: <Path d="M20 6 9 17l-5-5" />,
  'disc-3': (
    <>
      <Circle cx="12" cy="12" r="10" />
      <Path d="M6 12c0-1.7.7-3.2 1.8-4.2" />
      <Circle cx="12" cy="12" r="2" />
      <Path d="M18 12c0 1.7-.7 3.2-1.8 4.2" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2" />
      <Path d="M12 20v2" />
      <Path d="m4.93 4.93 1.41 1.41" />
      <Path d="m17.66 17.66 1.41 1.41" />
      <Path d="M2 12h2" />
      <Path d="M20 12h2" />
      <Path d="m6.34 17.66-1.41 1.41" />
      <Path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  moon: <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
}

export default function ClubIcon({
  name,
  size = 16,
  color,
  strokeWidth = 2,
}: {
  name: Nome
  size?: number
  color: string
  strokeWidth?: number
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRACOS[name]}
    </Svg>
  )
}
