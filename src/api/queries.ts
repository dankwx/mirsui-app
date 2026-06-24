// Definições centrais de queries do React Query. Cada query é declarada UMA vez
// aqui (via `queryOptions`) e reutilizada tanto pela tela que consome o dado
// quanto pelo prefetch — assim a queryKey e o queryFn nunca saem de sincronia.
//
// Padrão do app: leitura de dados sempre passa por React Query (cache +
// stale-while-revalidate). Ver docs/data-fetching.md.

import {
  infiniteQueryOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query'
import * as api from './client'
import type { FeedPost } from './types'
import type { FeedPostUI } from '../components/FeedItem'

// Getter de token de acesso (vem do AuthContext). Queries autenticadas o
// recebem por parâmetro em vez de acoplar ao contexto — assim continuam
// declarativas e reutilizáveis no prefetch.
export type TokenGetter = () => Promise<string | null>

// Chaves hierárquicas: ['profile', id, ...]. Invalidar ['profile', id] derruba
// tudo do perfil de uma vez.
export const profileKeys = {
  root: (id: string) => ['profile', id] as const,
  info: (id: string) => ['profile', id, 'info'] as const,
  tracks: (id: string) => ['profile', id, 'tracks'] as const,
  comments: (id: string) => ['profile', id, 'comments'] as const,
  stats: (id: string) => ['profile', id, 'stats'] as const,
  followers: (id: string) => ['profile', id, 'followers'] as const,
  following: (id: string) => ['profile', id, 'following'] as const,
}

export const feedKeys = {
  list: ['feed'] as const,
  recentClaims: ['feed', 'recent-claims'] as const,
}

export const stakeKeys = {
  list: ['stakes'] as const,
  points: ['stakes', 'points'] as const,
}

// Dados públicos do perfil (usado ao visitar o perfil de outro usuário).
export const profileInfoQuery = (profileId: string) =>
  queryOptions({
    queryKey: profileKeys.info(profileId),
    queryFn: () => api.getProfile(profileId).then((r) => r.profile),
  })

export const profileTracksQuery = (profileId: string) =>
  queryOptions({
    queryKey: profileKeys.tracks(profileId),
    queryFn: () => api.getProfileTracks(profileId).then((r) => r.tracks),
  })

export const profileCommentsQuery = (profileId: string) =>
  queryOptions({
    queryKey: profileKeys.comments(profileId),
    queryFn: () => api.getProfileComments(profileId).then((r) => r.comments),
  })

export const profileStatsQuery = (profileId: string) =>
  queryOptions({
    queryKey: profileKeys.stats(profileId),
    queryFn: () => api.getProfileStats(profileId),
  })

// Listas sociais (seguidores OU seguindo, conforme `type`). O token é opcional,
// mas quando presente cada usuário traz o isFollowing relativo a quem está
// vendo (para o botão seguir/deixar).
export type FollowListType = 'followers' | 'following'

export const followListQuery = (
  profileId: string,
  type: FollowListType,
  getToken: TokenGetter
) =>
  queryOptions({
    queryKey: profileKeys[type](profileId),
    queryFn: async () => {
      const token = (await getToken()) ?? undefined
      const res =
        type === 'following'
          ? await api.getFollowing(profileId, token)
          : await api.getFollowers(profileId, token)
      return res.users ?? []
    },
  })

/* ------------------------------- Feed --------------------------------- */

const FEED_PAGE = 5

// Decora os posts com o estado de like do usuário atual. Falha de likes não é
// fatal: o feed aparece mesmo sem essa informação.
async function decorateWithLikes(
  raw: FeedPost[],
  getToken: TokenGetter
): Promise<FeedPostUI[]> {
  if (raw.length === 0) return []
  let liked = new Set<number>()
  try {
    const token = await getToken()
    const res = await api.getUserLikes(
      raw.map((p) => p.id),
      token ?? undefined
    )
    liked = new Set(res.liked_tracks || [])
  } catch {
    // sem likes não é erro fatal
  }
  return raw.map((p) => ({ ...p, isLiked: liked.has(p.id) }))
}

// Feed paginado (infinite). pageParam é o offset; cada página é um array já
// decorado com isLiked. data.pages.flat() dá a lista completa.
export const feedQuery = (getToken: TokenGetter) =>
  infiniteQueryOptions({
    queryKey: feedKeys.list,
    queryFn: async ({ pageParam }) => {
      const res = await api.getFeed(FEED_PAGE, pageParam)
      return decorateWithLikes(res.posts || [], getToken)
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < FEED_PAGE) return undefined
      return allPages.reduce((n, page) => n + page.length, 0)
    },
  })

export const recentClaimsQuery = () =>
  queryOptions({
    queryKey: feedKeys.recentClaims,
    queryFn: () => api.getRecentClaims(4).then((r) => r.claims || []),
  })

/* ------------------------------ Stakes -------------------------------- */

export const stakesQuery = (getToken: TokenGetter) =>
  queryOptions({
    queryKey: stakeKeys.list,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Faça login para dar stake em faixas.')
      return (await api.getStakes(token)).stakes ?? []
    },
  })

export const stakePointsQuery = (getToken: TokenGetter) =>
  queryOptions({
    queryKey: stakeKeys.points,
    queryFn: async (): Promise<number | null> => {
      const token = await getToken()
      if (!token) return null
      return (await api.getStakePoints(token)).total ?? 0
    },
  })

// Dispara em background o carregamento dos dados do perfil. Chamado assim que a
// sessão é restaurada/criada (já temos o profileId), de modo que, quando o
// usuário abrir a aba Perfil, os dados já estejam no cache. Fire-and-forget:
// erros são tratados quando a tela de fato consome a query.
export function prefetchProfile(qc: QueryClient, profileId: string) {
  void qc.prefetchQuery(profileTracksQuery(profileId))
  void qc.prefetchQuery(profileCommentsQuery(profileId))
  void qc.prefetchQuery(profileStatsQuery(profileId))
}

// Aquece as listas sociais (seguidores/seguindo) para o modal abrir instantâneo
// já na primeira vez. Chamado quando a tela de perfil monta (já temos token).
export function prefetchSocialLists(
  qc: QueryClient,
  profileId: string,
  getToken: TokenGetter
) {
  void qc.prefetchQuery(followListQuery(profileId, 'followers', getToken))
  void qc.prefetchQuery(followListQuery(profileId, 'following', getToken))
}

// Aquece os dados das outras abas (stakes) logo após o login. O feed é a aba
// inicial e já monta sozinho, então não precisa de prefetch.
export function prefetchHome(qc: QueryClient, getToken: TokenGetter) {
  void qc.prefetchQuery(stakesQuery(getToken))
  void qc.prefetchQuery(stakePointsQuery(getToken))
}
