// Paleta e tokens visuais do Mirsui — espelham o design system do front (Next.js).
// Fundo terroso escuro, acento lima e "papel" claro para seções de destaque.
export const colors = {
  bg: '#16120c',
  surface: '#1c1710',
  card: '#231c12',
  line: 'rgba(236,227,210,0.12)',
  line2: 'rgba(236,227,210,0.20)',
  fill1: 'rgba(236,227,210,0.04)',
  fill2: 'rgba(236,227,210,0.08)',
  text: '#ece3d2',
  text2: 'rgba(236,227,210,0.62)',
  text3: 'rgba(236,227,210,0.42)',
  acc: '#cdef36',
  accSoft: 'rgba(205,239,54,0.14)',
  onAcc: '#16120c',
  paper: '#ece3d2',
  paperInk: '#16120c',
  danger: '#e26d5c',
  brick: '#c14a26',
} as const

// Tons de fallback para capas sem thumbnail (mesmo array do front).
const TONES = [
  '#241f1a', '#1c2320', '#27201f', '#1b2026', '#231d27', '#202420',
  '#2a201b', '#1a2326', '#25211c', '#1d2126', '#26211f', '#1f231d',
]

export function tone(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

export function initials(name: string) {
  return (name || '')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
