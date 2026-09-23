// Tipos espelhando as respostas do backend Fastify (mirsui-backend).

export interface SupabaseUser {
  id: string
  email?: string
  [key: string]: any
}

export interface SupabaseSession {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
  token_type?: string
  user?: SupabaseUser
}

export interface Profile {
  id: string
  username: string
  description?: string | null
  display_name?: string | null
  avatar_url?: string | null
  rating?: number | null
}

export interface AuthResponse {
  message: string
  user: SupabaseUser
  session: SupabaseSession | null
}

// GET /feed → posts
export interface FeedPost {
  id: number
  track_url: string
  track_title: string
  artist_name: string
  album_name: string
  popularity: number
  track_thumbnail: string | null
  user_id: string
  position: number
  claimedat: string | null
  track_uri: string | null
  /** identidade da GRAVAÇÃO; é o endereço da ficha desde a migration 023 */
  isrc: string | null
  discover_rating: number | null
  claim_message: string | null
  youtube_url: string | null
  username: string
  display_name: string | null
  avatar_url: string | null
  /**
   * Quantas pessoas salvaram esta MÚSICA (agrupando por gravação), não quantas
   * salvaram este achado: cada pessoa que salva a mesma faixa cria uma linha
   * própria. É o mesmo universo de `position`, então "3ª a salvar · 12 já
   * salvaram" fecha.
   */
  savers_count: number
  comments_count: number
  /**
   * O usuário do token já salvou esta música. Vem `false` em todos os posts
   * quando a requisição vai sem Authorization — por isso o feedQuery manda o
   * token inclusive nas páginas seguintes do offset.
   */
  saved_by_me: boolean
}

// GET /feed/recent-claims → claims
export interface RecentClaim {
  id: number
  track_title: string
  artist_name: string
  track_thumbnail: string
  track_url: string
  isrc: string | null
  claimedat: string
}

/* ----------------------------- Landing --------------------------- */

// Uma capa da parede do acervo (Observatório).
export interface FaixaDaParede {
  isrc: string | null
  title: string
  artist: string
  cover: string | null
}

// Um salvamento recente com quem salvou, para a seção "O que a cena salvou".
export interface AchadoDaCena {
  id: number
  track_title: string
  artist_name: string
  track_thumbnail: string | null
  position: number
  claimedat: string | null
  claim_message: string | null
  track_uri: string | null
  isrc: string | null
  username: string
  display_name: string | null
  avatar_url: string | null
}

// Uma pessoa da cena, com o número real de faixas dela.
export interface PessoaDaCena {
  username: string
  display_name: string | null
  avatar_url: string | null
  faixas: number
  primeiros: number
}

// GET /landing → tudo que a primeira tela precisa, numa chamada só.
export interface LandingData {
  parede: FaixaDaParede[]
  /** faixas ativas sob medição diária no Observatório */
  catalogo: number
  achados: AchadoDaCena[]
  pessoas: PessoaDaCena[]
}

// GET /profiles/:id/tracks → faixas reivindicadas pelo usuário
export interface ProfileTrack {
  id: number
  track_url: string
  track_uri: string | null
  isrc: string | null
  track_title: string
  artist_name: string
  album_name: string
  popularity: number
  discover_rating: number | null
  track_thumbnail: string | null
  position: number
  claimedat: string | null
  /** quantas pessoas salvaram esta música; o backend nunca mandou `likes_count` */
  savers_count: number
  is_favorited: boolean
}

// GET /profiles/:id/stats
export interface ProfileStats {
  followers: number
  following: number
}

// GET /profiles/:id/followers | /following → usuário numa lista social
export interface FollowUser {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  rating: number | null
  isFollowing: boolean
}

// GET /tracks/isrc/:isrc → ficha completa de uma gravação (página de track)
export interface TrackClaimer {
  user_id: string
  position: number | null
  claimedat: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface TrackDetails {
  track: {
    /** o ISRC: o id da ficha é a gravação, não o id de um serviço */
    id: string
    isrc: string | null
    deezerTrackId?: string | number | null
    name: string
    artist: string
    uri: string
    popularity: number
    duration_ms: number
    explicit?: boolean
    album: {
      name: string | null
      image: string | null
      release_date: string | null
    }
    /** prévia de 30 s do Deezer; a URL é assinada e expira em horas */
    preview?: string | null
    spotify_url: string
    /** o spotify_url aponta para a faixa exata, e não para uma busca */
    spotify_exact?: boolean
    deezer_url?: string
    /** só nas respostas antigas; o backend hoje manda `artist` */
    artists?: { id: string; name: string }[]
  }
  genre: string | null
  followers: number | null
  youtubeVideoId: string | null
  totalClaims: number
  topClaimers: TrackClaimer[]
  userClaim: { claimed: boolean; position: number | null }
}

// POST /tracks/claim → resultado da reivindicação
export interface ClaimResult {
  success: boolean
  message: string
  position: number
  youtubeUrl: string | null
}

export interface RecadoAuthor {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// GET /tracks/search → faixa do Spotify normalizada para a UI
export interface SearchTrack {
  id: string
  title: string
  artist: string
  uri: string
  isrc: string | null
  albumName: string | null
  thumbnail: string | null
  cover: string | null
}

// GET /stakes/preview → prévia do multiplicador (resolvido no Deezer)
export interface StakePreview {
  matched: boolean
  popularity?: number
  fame?: number
  multiplier?: number
}

// Ponto da série diária de popularidade de um stake (pro gráfico de evolução).
export interface StakeSnapshot {
  date: string
  popularity: number
  dayGain: number
  pointsGain: number
}

// GET /stakes → um stake do usuário (ver Stake.md)
export interface Stake {
  id: string
  track_id: string
  track_uri: string
  track_title: string
  artist_name: string
  artist_id: string | null
  album_name: string | null
  track_thumbnail: string | null
  baseline_popularity: number
  artist_popularity: number
  multiplier: number | string
  accumulated_points: number
  last_popularity: number
  last_day_gain: number
  status: 'ativa' | 'removida' | 'coletada'
  staked_at: string
  days_held: number
  days_to_collect: number
  can_collect: boolean
  pessoas_deram_stake: number
  // série diária pro gráfico (vem junto do GET /stakes → abre instantâneo)
  snapshots?: StakeSnapshot[]
}

// POST /stakes → stake recém-criado
export interface PlaceStakeResult {
  stake: Stake
}

// POST /stakes/:id/recolher → resultado do recolhimento
export interface RecolherResult {
  success: boolean
  collected: boolean
  points: number
}

// GET /profiles/:id/comments → mural de recados
export interface ProfileComment {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
  author: RecadoAuthor | null
}
