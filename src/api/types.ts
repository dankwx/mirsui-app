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

export interface RecadoAuthor {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

// GET /profiles/:id/comments → mural de recados
export interface ProfileComment {
  id: string
  content: string
  is_pinned: boolean
  created_at: string
  author: RecadoAuthor | null
}
