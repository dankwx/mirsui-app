// Paleta e tokens visuais do Mirsui — espelham o design system do front
// (Mirsui/tailwind.config.ts, chave `mir`). Quando um valor mudar lá, muda aqui.
//
// Duas cores acentuam, e cada uma tem um assunto:
//
//   acc  (lima)     tempo e precedência. "Você chegou cedo": posição, 1º lugar,
//                   foco. Nada além disso.
//   warm (laranja)  gente. Seguir, recado, favoritar, presença de outra pessoa.
//   text (creme)    todo o resto, inclusive botão neutro e ação que se repete.
//
// O lima tem praticamente o mesmo contraste do texto sobre o fundo (14,4:1
// contra 14,6:1). Ele não escurece o bastante para virar "secundário": ou é o
// dado mais importante da tela, ou não devia estar aceso.
export const colors = {
  // Rampa de elevação. A distância entre os degraus dobrou em relação à versão
  // anterior deste arquivo (card sobre bg saiu de 1,11:1 para 1,20:1): antes
  // nada levantava do fundo e todo elemento precisava de borda para existir.
  bg: '#16120c',
  surface: '#221b12',
  card: '#2b2317',
  /** menus, sheets e pressionado — o degrau que faltava */
  raised: '#382d1d',

  line: 'rgba(236,227,210,0.12)',
  line2: 'rgba(236,227,210,0.20)',
  fill1: 'rgba(236,227,210,0.04)',
  fill2: 'rgba(236,227,210,0.08)',

  // Contraste sobre o bg: text 14,6:1 · text2 7,6:1 · text3 5,1:1. O text3
  // estava em 0.42 (3,5:1) e reprovava no WCAG AA, apesar de vestir carimbo de
  // tempo, rótulo e legenda no app inteiro.
  text: '#ece3d2',
  text2: 'rgba(236,227,210,0.70)',
  text3: 'rgba(236,227,210,0.55)',

  acc: '#cdef36',
  accSoft: 'rgba(205,239,54,0.14)',
  onAcc: '#16120c',

  warm: '#e8734a',
  warmSoft: 'rgba(232,115,74,0.14)',
  onWarm: '#16120c',

  // A família do laranja para seções de papel (a ficha da faixa). O lima é
  // ilegível sobre creme — 1,08:1, literalmente invisível.
  paper: '#ece3d2',
  paperInk: '#16120c',
  warmInk: '#a83c1c',

  danger: '#e26d5c',
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
