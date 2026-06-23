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
  if (w < 5) return `${w}sem`
  const months = Math.floor(d / 30)
  if (months < 12) return `${months}mês`
  return `${Math.floor(d / 365)}a`
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
