// O endereço da ficha de uma faixa, a partir do que a linha em mãos tem.
//
// Espelha utils/trackHref.ts do site, com uma diferença: o site põe um slug
// legível antes do ISRC porque a URL dele é indexada pelo Google. Aqui a rota
// é interna (`/track/[id]`), ninguém lê o endereço, então o id vai puro.
//
// A ordem de preferência segue a do identificador canônico:
//
//   1. `isrc` — o código da GRAVAÇÃO, que é o endereço desde a migration 023.
//      É o que o backend atende em GET /tracks/isrc/:isrc.
//   2. o id do Spotify espremido de `track_url`/`track_uri` — a rota antiga
//      (GET /tracks/spotify/:id) continua respondendo, traduzindo para ISRC
//      pelo banco local. É o que mantém de pé as linhas salvas antes da 023.
//   3. `null`, e quem chamou não navega. Antes disto o app montava a rota com
//      o que achasse pela frente e abria uma tela que nunca ia carregar.

export const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/

/**
 * `track_url` guarda a URL completa do Spotify, às vezes com `?si=`, e
 * `track_uri` guarda `spotify:track:<id>`. O regex aceita as duas formas.
 *
 * Os 22 caracteres são de propósito: sem o tamanho fixo, um `track_uri` no
 * formato novo (`isrc:USUM72409273`) casaria em `track:` e devolveria lixo.
 */
const ID_DO_SPOTIFY = /(?:track[:/])([A-Za-z0-9]{22})/

export interface OrigemDoLink {
  isrc?: string | null
  track_url?: string | null
  track_uri?: string | null
}

export function trackId(origem: OrigemDoLink | null | undefined): string | null {
  if (!origem) return null

  const isrc = origem.isrc?.trim().toUpperCase()
  if (isrc && ISRC_RE.test(isrc)) return isrc

  const bruto = origem.track_url || origem.track_uri || ''
  const m = bruto.match(ID_DO_SPOTIFY)
  return m ? m[1] : null
}

/** O id é um ISRC (e não um id do Spotify vindo de uma linha antiga)? */
export function isIsrc(id: string): boolean {
  return ISRC_RE.test(id.trim().toUpperCase())
}
