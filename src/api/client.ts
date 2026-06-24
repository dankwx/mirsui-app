import { API_URL } from '../config'
import type {
  AuthResponse,
  ClaimResult,
  FeedPost,
  FollowUser,
  PlaceStakeResult,
  Profile,
  ProfileComment,
  ProfileStats,
  ProfileTrack,
  RecentClaim,
  RecolherResult,
  SearchTrack,
  Stake,
  StakePreview,
  SupabaseSession,
  SupabaseUser,
  TrackDetails,
} from './types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options

  // Só anuncia JSON quando há corpo. Requisições sem body (ex.: POST/DELETE de
  // seguir, like, logout) não podem mandar Content-Type: application/json — o
  // Fastify rejeita com "Body cannot be empty when content-type is set to
  // application/json".
  const hasBody = rest.body != null

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers || {}),
      },
    })
  } catch (e) {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
      0
    )
  }

  const text = await res.text()
  const data = text ? safeJson(text) : null

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) ||
      `Erro ${res.status}`
    throw new ApiError(message, res.status)
  }

  return data as T
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/* ----------------------------- Auth ----------------------------- */

export function login(email: string, password: string) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function signup(email: string, password: string, username: string) {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, username }),
  })
}

export function logout(token?: string) {
  return request<{ message: string }>('/auth/logout', {
    method: 'POST',
    token,
  })
}

export function refresh(refreshToken: string) {
  return request<{ message: string; session: SupabaseSession; user: SupabaseUser }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    }
  )
}

export function me(token: string) {
  return request<{ user: SupabaseUser; profile: Profile | null }>('/auth/me', {
    token,
  })
}

/* --------------------------- Profiles --------------------------- */

export function getProfileTracks(profileId: string, limit = 50, offset = 0) {
  return request<{ tracks: ProfileTrack[] }>(
    `/profiles/${profileId}/tracks?limit=${limit}&offset=${offset}`
  )
}

export function getProfileComments(profileId: string, limit = 10, offset = 0) {
  return request<{ comments: ProfileComment[]; total: number }>(
    `/profiles/${profileId}/comments?limit=${limit}&offset=${offset}`
  )
}

// Lista de seguidores do perfil. Token opcional: com ele, cada usuário traz o
// isFollowing relativo a quem está vendo (para o botão de seguir/deixar).
export function getFollowers(profileId: string, token?: string) {
  return request<{ users: FollowUser[] }>(`/profiles/${profileId}/followers`, {
    token,
  })
}

// Lista de quem o perfil segue.
export function getFollowing(profileId: string, token?: string) {
  return request<{ users: FollowUser[] }>(`/profiles/${profileId}/following`, {
    token,
  })
}

// Seguir um perfil (idempotente no backend).
export function followUser(profileId: string, token: string) {
  return request<{ success: boolean; isFollowing: boolean }>(
    `/profiles/${profileId}/follow`,
    { method: 'POST', token }
  )
}

// Deixar de seguir um perfil.
export function unfollowUser(profileId: string, token: string) {
  return request<{ success: boolean; isFollowing: boolean }>(
    `/profiles/${profileId}/follow`,
    { method: 'DELETE', token }
  )
}

export function getProfileStats(profileId: string) {
  return request<ProfileStats>(`/profiles/${profileId}/stats`)
}

// Atualiza o próprio perfil (display_name, description, avatar_url, username)
export function updateProfile(
  profileId: string,
  body: Partial<Pick<Profile, 'display_name' | 'description' | 'avatar_url' | 'username'>>,
  token: string
) {
  return request<{ profile: Profile }>(`/profiles/${profileId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(body),
  })
}

// Envia uma nova foto de perfil (base64) e devolve o profile atualizado.
export function uploadAvatar(
  profileId: string,
  imageBase64: string,
  contentType: string,
  token: string
) {
  return request<{ avatar_url: string; profile: Profile }>(
    `/profiles/${profileId}/avatar`,
    {
      method: 'POST',
      token,
      body: JSON.stringify({ image_base64: imageBase64, content_type: contentType }),
    }
  )
}

/* ----------------------------- Tracks --------------------------- */

// Detalhes completos da faixa para a página de track. Token opcional: quando
// presente, a resposta inclui o status de claim do próprio usuário.
export function getTrackDetails(spotifyId: string, token?: string) {
  return request<TrackDetails>(`/tracks/spotify/${spotifyId}`, { token })
}

// Reivindicar uma faixa (claim). O backend calcula a posição.
export function claimTrack(
  body: {
    trackUri: string
    trackName: string
    artistName: string
    albumName: string
    spotifyUrl: string
    trackThumbnail: string
    popularity: number
    claimMessage?: string
  },
  token: string
) {
  return request<ClaimResult>('/tracks/claim', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
}

export function favoriteTrack(trackId: number, token: string) {
  return request<{ success: boolean; is_favorited: boolean }>(
    `/tracks/${trackId}/favorite`,
    { method: 'POST', token }
  )
}

export function unfavoriteTrack(trackId: number, token: string) {
  return request<{ success: boolean; is_favorited: boolean }>(
    `/tracks/${trackId}/favorite`,
    { method: 'DELETE', token }
  )
}

export function deleteTrack(trackId: number, token: string) {
  return request<{ success: boolean }>(`/tracks/${trackId}`, {
    method: 'DELETE',
    token,
  })
}

/* ----------------------------- Feed ----------------------------- */

export function getFeed(limit = 5, offset = 0) {
  return request<{ posts: FeedPost[]; total: number }>(
    `/feed?limit=${limit}&offset=${offset}`
  )
}

export function getRecentClaims(limit = 4) {
  return request<{ claims: RecentClaim[] }>(`/feed/recent-claims?limit=${limit}`)
}

export function getUserLikes(trackIds: number[], token?: string) {
  return request<{ liked_tracks: number[] }>('/feed/user-likes', {
    method: 'POST',
    token,
    body: JSON.stringify({ track_ids: trackIds }),
  })
}

/* --------------------------- Likes ------------------------------ */

export function likeTrack(trackId: number, token: string) {
  return request<{ success: boolean }>(`/tracks/${trackId}/like`, {
    method: 'POST',
    token,
  })
}

export function unlikeTrack(trackId: number, token: string) {
  return request<{ success: boolean; deleted: number }>(
    `/tracks/${trackId}/like`,
    {
      method: 'DELETE',
      token,
    }
  )
}

/* ----------------------------- Stakes --------------------------- */

// Busca faixas no Spotify (capa/metadados/ISRC) para escolher no stake.
export function searchTracks(query: string, limit = 10) {
  return request<{ tracks: SearchTrack[] }>(
    `/tracks/search?q=${encodeURIComponent(query)}&limit=${limit}`
  )
}

// Lista os stakes ativos/removidos do usuário (ver Stake.md).
export function getStakes(token: string) {
  return request<{ stakes: Stake[]; maxSlots: number }>('/stakes', { token })
}

// Prévia do multiplicador antes de dar stake (resolve no Deezer na hora).
export function getStakePreview(
  params: { isrc?: string | null; artist: string; title: string },
  token: string
) {
  const qs = new URLSearchParams({ artist: params.artist, title: params.title })
  if (params.isrc) qs.set('isrc', params.isrc)
  return request<StakePreview>(`/stakes/preview?${qs.toString()}`, { token })
}

// Dá stake numa faixa. O multiplicador oficial é calculado e travado no backend.
export function placeStake(
  body: {
    trackId: string
    trackUri: string
    trackTitle: string
    artistName: string
    albumName?: string
    trackThumbnail?: string
    isrc?: string
  },
  token: string
) {
  return request<PlaceStakeResult>('/stakes', {
    method: 'POST',
    token,
    body: JSON.stringify(body),
  })
}

// Recolhe um stake: coleta os pontos se >= 7 dias, senão só libera a vaga.
export function recolherStake(stakeId: string, token: string) {
  return request<RecolherResult>(`/stakes/${stakeId}/recolher`, {
    method: 'POST',
    token,
  })
}

// Total de pontos recolhidos pelo usuário (sistema isolado de Stakes).
export function getStakePoints(token: string) {
  return request<{ total: number }>('/stakes/points', { token })
}
