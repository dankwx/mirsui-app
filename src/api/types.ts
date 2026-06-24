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
  discover_rating: number | null
  claim_message: string | null
  youtube_url: string | null
  username: string
  display_name: string | null
  avatar_url: string | null
  likes_count: number
  comments_count: number
}

// GET /feed/recent-claims → claims
export interface RecentClaim {
  id: number
  track_title: string
  artist_name: string
  track_thumbnail: string
  track_url: string
  claimedat: string
}

// GET /profiles/:id/tracks → faixas reivindicadas pelo usuário
export interface ProfileTrack {
  id: number
  track_url: string
  track_uri: string | null
  track_title: string
  artist_name: string
  album_name: string
  popularity: number
  discover_rating: number | null
  track_thumbnail: string | null
  position: number
  claimedat: string | null
  likes_count: number
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

// GET /tracks/spotify/:id → detalhes completos de uma faixa (página de track)
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
    id: string
    name: string
    uri: string
    popularity: number
    duration_ms: number
    album: {
      name: string | null
      image: string | null
      release_date: string | null
    }
    artists: { id: string; name: string }[]
    spotify_url: string
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
