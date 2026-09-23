import { useCallback, useEffect, useState } from 'react'
import { AccessibilityInfo, Platform, useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold'
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold'
import { HankenGrotesk_400Regular } from '@expo-google-fonts/hanken-grotesk/400Regular'
import { HankenGrotesk_600SemiBold } from '@expo-google-fonts/hanken-grotesk/600SemiBold'
import { HankenGrotesk_700Bold } from '@expo-google-fonts/hanken-grotesk/700Bold'
import { HankenGrotesk_800ExtraBold } from '@expo-google-fonts/hanken-grotesk/800ExtraBold'
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold'

/**
 * A identidade "club" — a da home aprovada do site (mirsui-web/DESIGN.md).
 *
 * Convive com `theme.ts`, que é a identidade antiga (marrom/lima) e ainda veste
 * o resto do app. Não misture as duas numa tela: quem migrar outra tela para o
 * club usa estes tokens, e só estes.
 *
 * Os valores espelham `app/club.css` do site. Quando mudarem lá, mudam aqui.
 */

export interface ClubColors {
  bg: string
  surface: string
  paper: string
  text: string
  muted: string
  line: string
  /** marca, ênfase grande, detalhe de interação */
  accent: string
  /** texto pequeno que precisa de acento — não é o mesmo laranja da manchete */
  accentText: string
  accentSoft: string
  /** texto sobre o botão principal, que é neutro de alto contraste */
  onButton: string
  danger: string
}

export const clubLight: ClubColors = {
  bg: '#f7f7f2',
  surface: '#eeeee7',
  paper: '#fdfdf9',
  text: '#242522',
  muted: '#64665e',
  line: '#d9dbd2',
  accent: '#db4b27',
  accentText: '#b63a1b',
  accentSoft: '#f5e1d7',
  onButton: '#f7f7f2',
  danger: '#b3261e',
}

export const clubDark: ClubColors = {
  bg: '#1e201d',
  surface: '#282b26',
  paper: '#30332e',
  text: '#f0f0e7',
  muted: '#b2b7aa',
  line: '#42473d',
  accent: '#f57a53',
  accentText: '#f9906f',
  accentSoft: '#47332b',
  onButton: '#20221d',
  danger: '#f28b82',
}

/**
 * Fontes carregadas em app/_layout.tsx.
 *
 * Com fonte customizada, o peso mora no nome da família: `fontWeight` junto
 * dela faz o Android cair na fonte do sistema. Use `clubFonts.x` e não passe
 * `fontWeight`.
 *
 * Archivo nos títulos, Hanken Grotesk no texto, Space Grotesk nos pequenos
 * números (não é monoespaçada).
 */
export const clubFontFiles = {
  Archivo_700Bold,
  Archivo_800ExtraBold,
  HankenGrotesk_400Regular,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  SpaceGrotesk_600SemiBold,
}

export const clubFonts = {
  display: 'Archivo_800ExtraBold',
  title: 'Archivo_700Bold',
  body: 'HankenGrotesk_400Regular',
  bodySemi: 'HankenGrotesk_600SemiBold',
  bodyBold: 'HankenGrotesk_700Bold',
  bodyHeavy: 'HankenGrotesk_800ExtraBold',
  number: 'SpaceGrotesk_600SemiBold',
} as const

/* --------------------------------- Tema --------------------------------- */

// A mesma chave que o site usa no localStorage, para a escolha valer igual.
const CHAVE_DO_TEMA = 'mirsui-landing-theme'
type Preferencia = 'light' | 'dark' | null

async function lerPreferencia(): Promise<Preferencia> {
  try {
    const v =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(CHAVE_DO_TEMA)
        : await SecureStore.getItemAsync(CHAVE_DO_TEMA)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

async function gravarPreferencia(v: 'light' | 'dark') {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(CHAVE_DO_TEMA, v)
    else await SecureStore.setItemAsync(CHAVE_DO_TEMA, v)
  } catch {
    // Sem armazenamento, a escolha vale enquanto a tela estiver aberta.
  }
}

/**
 * Tema do club: segue o sistema até a pessoa escolher, e aí lembra a escolha.
 * Mesmo comportamento do ThemeToggle do site.
 */
export function useClubTheme() {
  const sistema = useColorScheme()
  const [preferencia, setPreferencia] = useState<Preferencia>(null)

  useEffect(() => {
    let vivo = true
    lerPreferencia().then((v) => vivo && v && setPreferencia(v))
    return () => {
      vivo = false
    }
  }, [])

  const dark = preferencia ? preferencia === 'dark' : sistema === 'dark'

  const alternar = useCallback(() => {
    const proxima = dark ? 'light' : 'dark'
    setPreferencia(proxima)
    gravarPreferencia(proxima)
  }, [dark])

  return { dark, c: dark ? clubDark : clubLight, alternar }
}

/** `prefers-reduced-motion` do aparelho: sem ele, nada de entrada animada. */
export function useReduceMotion() {
  const [reduzir, setReduzir] = useState(false)
  useEffect(() => {
    let vivo = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => vivo && setReduzir(v))
      .catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduzir)
    return () => {
      vivo = false
      sub.remove()
    }
  }, [])
  return reduzir
}
