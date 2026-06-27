// Helpers de apresentação dos Stakes. O cálculo (multiplicador, pontos) é todo
// no backend (ver mirsui-backend/src/lib/stakePoints.ts e Stake.md); aqui só
// formatamos e classificamos o que vem de lá. Espelha utils/stakeMultiplier.ts
// e a lógica de "tier"/"badge" do StakesContent do front (Next.js).
import type { Stake } from '../api/types'
import { colors } from '../theme'

// Formata o multiplicador como "x2,4" (pt-BR, uma casa).
export function formatMultiplier(mult: number): string {
  return 'x' + mult.toFixed(1).replace('.', ',')
}

// Número inteiro em pt-BR (ex.: 1234 -> "1.234").
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR')
}

export type Tier = 'BAIXA' | 'MÉDIA' | 'ALTA'

export function tier(pop: number): Tier {
  return pop < 34 ? 'BAIXA' : pop < 67 ? 'MÉDIA' : 'ALTA'
}

export interface Badge {
  tier: Tier
  text: string
  // cor do texto/borda do selo e do número do multiplicador
  color: string
  border: string
  bg: string
  multColor: string
}

// Selo de raridade da faixa pela popularidade (0-100). Quanto menor a
// popularidade, mais "raro" o achado e maior o multiplicador.
export function badge(pop: number): Badge {
  const t = tier(pop)
  if (t === 'BAIXA') {
    return {
      tier: t,
      text: 'ACHADO RARO',
      color: colors.acc,
      border: 'rgba(205,239,54,0.4)',
      bg: 'rgba(205,239,54,0.16)',
      multColor: colors.acc,
    }
  }
  if (t === 'MÉDIA') {
    return {
      tier: t,
      text: 'SUBINDO',
      color: 'rgba(236,227,210,0.82)',
      border: 'rgba(236,227,210,0.22)',
      bg: 'rgba(236,227,210,0.1)',
      multColor: colors.acc,
    }
  }
  return {
    tier: t,
    text: 'NA BOCA DO POVO',
    color: 'rgba(236,227,210,0.5)',
    border: 'rgba(236,227,210,0.18)',
    bg: 'transparent',
    multColor: 'rgba(236,227,210,0.62)',
  }
}

// ---- movimento / feedback ----
// Por que o stake deu (ou não deu) pontos. Os pontos só sobem quando a
// popularidade da faixa cresce (ver Stake.md). Aqui a gente traduz o
// baseline → agora numa frase humana + cor, pra explicar mesmo o "0".
export type Movement = {
  tone: 'up' | 'flat' | 'down'
  delta: number
  color: string
  arrow: string
  headline: string
  sub: string
}

export function movement(s: Stake): Movement {
  const from = Math.round(s.baseline_popularity)
  const to = Math.round(s.last_popularity)
  const delta = to - from
  const pts = fmt(s.accumulated_points)
  const ptsLabel = s.accumulated_points === 1 ? 'ponto' : 'pontos'

  if (delta > 0) {
    return {
      tone: 'up',
      delta,
      color: colors.acc,
      arrow: '↑',
      headline: `Subiu ${from} → ${to}`,
      sub:
        s.accumulated_points > 0
          ? `Já rendeu ${pts} ${ptsLabel}`
          : 'Vira ponto na próxima medição',
    }
  }
  if (delta < 0) {
    return {
      tone: 'down',
      delta,
      color: '#d98359',
      arrow: '↓',
      headline: `Caiu ${from} → ${to}`,
      sub:
        s.accumulated_points > 0
          ? `Rendeu ${pts} ${ptsLabel} antes de cair`
          : 'Pontos só entram quando ela cresce',
    }
  }
  return {
    tone: 'flat',
    delta: 0,
    color: 'rgba(236,227,210,0.62)',
    arrow: '→',
    headline: `Parada em ${to}`,
    sub:
      s.accumulated_points > 0
        ? `Rendeu ${pts} ${ptsLabel} no caminho`
        : 'Não se mexeu desde o seu stake',
  }
}
