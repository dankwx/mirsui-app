// Espelha utils/feedHelpers.formatTimestamp do front, em pt-BR.
export function formatTimestamp(ts: string | null): string {
  if (!ts) return ''
  const date = new Date(ts)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)

  if (diff < 30) return 'agora mesmo'
  if (diff < 60) return `${diff}s`
  const min = Math.floor(diff / 60)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w} sem`
  const meses = Math.floor(d / 30)
  // Plural de verdade: sem isto o feed dizia "há 9mês", que é o tipo de coisa
  // que faz o produto inteiro parecer de brincadeira. "mês" não pluraliza com
  // "s", então concatenar não resolvia.
  if (meses < 12) return meses === 1 ? '1 mês' : `${meses} meses`
  const anos = Math.floor(d / 365)
  return anos === 1 ? '1 ano' : `${anos} anos`
}

export function timeAgo(ts: string | null): string {
  if (!ts) return ''
  const v = formatTimestamp(ts)
  return v === 'agora mesmo' ? 'agora mesmo' : `há ${v}`
}

export function ordLabel(n: number | null | undefined): string {
  if (!n || n < 1) return '—'
  return `${n}ª`
}

const MESES = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
]

/**
 * "14 nov". Espelha `diaMes` da home do site.
 *
 * A landing usa data absoluta, e não tempo relativo: o feed conta o que está
 * acontecendo agora, a landing mostra um registro. "há 3 meses" envelhece a
 * cena; "14 nov" é só quando foi.
 */
export function diaMes(ts: string | null): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}
