// Definições centrais de queries do React Query. Cada query é declarada UMA vez
// aqui (via `queryOptions`) e reutilizada tanto pela tela que consome o dado
// quanto pelo prefetch — assim a queryKey e o queryFn nunca saem de sincronia.
//
// Padrão do app: leitura de dados sempre passa por React Query (cache +
// stale-while-revalidate). Ver docs/data-fetching.md.

import {
  infiniteQueryOptions,
  queryOptions,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import * as api from './client'
import type { FeedPost } from './types'

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
}

export const landingKeys = {
  root: ['landing'] as const,
}

export const stakeKeys = {
  list: ['stakes'] as const,
  points: ['stakes', 'points'] as const,
}

// Dados públicos do perfil (usado ao visitar o perfil de outro usuário).
// Autenticada: o token traz o isFollowing junto, então o botão seguir/seguindo
// já abre no estado certo (sem flash de "Seguir" antes de validar).
export const profileInfoQuery = (profileId: string, getToken: TokenGetter) =>
  queryOptions({
    queryKey: profileKeys.info(profileId),
    queryFn: async () => {
      const token = (await getToken()) ?? undefined
      const { profile, isFollowing } = await api.getProfile(profileId, token)
      return { profile, isFollowing }
    },
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

/* ----------------------------- Landing -------------------------------- */

// A primeira tela inteira numa chamada. Pública: nada aqui depende de token.
export const landingQuery = () =>
  queryOptions({
    queryKey: landingKeys.root,
    queryFn: () => api.getLanding(),
  })

/* ------------------------------- Feed --------------------------------- */

const FEED_PAGE = 5

/**
 * Feed paginado. `pageParam` é o offset; `data.pages.flat()` dá a lista.
 *
 * O token vai em toda página porque é ele que faz o backend responder
 * `saved_by_me` (ver api.getFeed). Ele não entra na queryKey de propósito: o
 * access token do Supabase rotaciona a cada hora, e chavear por ele jogaria o
 * feed inteiro fora a cada renovação.
 */
export const feedQuery = (getToken: TokenGetter) =>
  infiniteQueryOptions({
    queryKey: feedKeys.list,
    queryFn: async ({ pageParam }) => {
      const token = await getToken()
      const res = await api.getFeed(FEED_PAGE, pageParam, token ?? undefined)
      return res.posts || []
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < FEED_PAGE) return undefined
      return allPages.reduce((n, page) => n + page.length, 0)
    },
  })

/* ------------------------- Salvar uma faixa ---------------------------- */

/**
 * A chave da GRAVAÇÃO, que é por onde "salvar" se identifica.
 *
 * Salvar é por música, não por achado: a mesma faixa pode aparecer duas vezes
 * no feed, salva por pessoas diferentes, e salvar numa tem que marcar a outra
 * na hora — senão a tela se contradiz sozinha. O `isrc` vem primeiro porque é
 * a identidade canônica; o `track_uri` atende as linhas antigas, que não têm
 * ISRC nenhum.
 */
export function chaveDaGravacao(post: {
  isrc?: string | null
  track_uri?: string | null
}): string | null {
  return post.isrc || post.track_uri || null
}

/**
 * Marca no cache do feed todos os posts da mesma gravação como salvos.
 *
 * Devolve o estado anterior para o rollback. Salvar é mão única, então só há
 * um sentido a desfazer: o otimista que não confirmou.
 */
export function marcarSalvaNoCache(qc: QueryClient, chave: string) {
  const anterior = qc.getQueryData<InfiniteData<FeedPost[]>>(feedKeys.list)

  qc.setQueryData<InfiniteData<FeedPost[]>>(feedKeys.list, (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p) =>
              chaveDaGravacao(p) === chave && !p.saved_by_me
                ? // o contador do servidor não conhece o que acabou de ser salvo
                  { ...p, saved_by_me: true, savers_count: p.savers_count + 1 }
                : p
            )
          ),
        }
      : old
  )

  return () => qc.setQueryData(feedKeys.list, anterior)
}

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

// Aquece o perfil de OUTRO usuário antes de navegar até ele (toque numa linha de
// seguidores/seguindo). Assim a tela /user/:id abre já com os dados em cache, sem
// o flicker de spinner — é o "prefetch no item de lista" do data-fetching.md.
export function prefetchUserProfile(
  qc: QueryClient,
  profileId: string,
  getToken: TokenGetter
) {
  void qc.prefetchQuery(profileInfoQuery(profileId, getToken))
  void qc.prefetchQuery(profileTracksQuery(profileId))
  void qc.prefetchQuery(profileCommentsQuery(profileId))
  void qc.prefetchQuery(profileStatsQuery(profileId))
  prefetchSocialLists(qc, profileId, getToken)
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
