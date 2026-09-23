import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/client'
import { ApiError } from '../api/client'
import { chaveDaGravacao, feedQuery, marcarSalvaNoCache, prefetchUserProfile } from '../api/queries'
import type { FeedPost } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Cover from '../components/Cover'
import FeedItem, { quemSalvou } from '../components/FeedItem'
import MirsuiLogo from '../components/MirsuiLogo'
import SaveButton, { type SaveState } from '../components/SaveButton'
import { Button, Pill } from '../components/ui'
import { recadoValido } from '../lib/recado'
import { timeAgo } from '../lib/time'
import { trackId } from '../lib/track'
import { colors } from '../theme'

/**
 * O feed.
 *
 * Espelha a /feed do site, com três diferenças que a tela de telefone impõe:
 *
 * - Sem as abas "Da cena" / "De quem você segue". No site a segunda existe
 *   desativada, esperando o backend fornecer a relação; aqui uma aba que abre
 *   sempre vazia, logo abaixo da barra de abas do próprio app, seria duas
 *   navegações concorrendo pelo mesmo dedo.
 * - Sem a coluna lateral de achados recentes. Ela é a mesma lista do feed,
 *   deduplicada por gravação: no site preenche a largura que sobra, e numa
 *   coluna só viraria a mesma lista duas vezes.
 * - "Carregar mais" virou rolagem infinita (`onEndReached`), que é o gesto
 *   nativo para isso.
 */

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const { user, getValidToken } = useAuth()

  const feedQ = useInfiniteQuery(feedQuery(getValidToken))
  const posts = useMemo<FeedPost[]>(() => feedQ.data?.pages.flat() ?? [], [feedQ.data])

  /**
   * O estado de "salvando" mora aqui, e não em cada linha, porque salvar é por
   * MÚSICA e não por achado: a mesma faixa pode aparecer duas vezes no feed,
   * salva por pessoas diferentes. Já o "está salva" mora no cache do React
   * Query (`saved_by_me`), atualizado de forma otimista para todos os posts da
   * mesma gravação de uma vez — senão a tela se contradiz sozinha.
   */
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<{ chave: string; mensagem: string } | null>(null)

  const salvar = useCallback(
    async (post: FeedPost) => {
      const chave = chaveDaGravacao(post)
      if (!chave || salvando || post.saved_by_me) return

      setSalvando(chave)
      setErro(null)
      const desfazer = marcarSalvaNoCache(queryClient, chave)

      try {
        const token = await getValidToken()
        if (!token) throw new ApiError('Entre de novo para salvar.', 401)

        await api.claimTrack(
          {
            trackUri: post.track_uri!,
            isrc: post.isrc,
            trackName: post.track_title,
            artistName: post.artist_name,
            albumName: post.album_name,
            spotifyUrl: post.track_url,
            trackThumbnail: post.track_thumbnail || '',
            popularity: post.popularity,
          },
          token
        )
      } catch (e) {
        // 409 é "você já tinha salvado": para quem tocou o resultado é o mesmo
        // que salvar agora, então o otimista fica de pé. O botão é que estava
        // desatualizado.
        if (!(e instanceof ApiError && e.status === 409)) {
          desfazer()
          const mensagem =
            e instanceof ApiError ? e.message : 'Não foi possível salvar.'
          setErro({ chave, mensagem })
        }
      } finally {
        setSalvando(null)
      }
    },
    [queryClient, getValidToken, salvando]
  )

  const estadoDeSalvar = useCallback(
    (post: FeedPost): SaveState => {
      const chave = chaveDaGravacao(post)
      return {
        salva: post.saved_by_me,
        ocupada: !!chave && salvando === chave,
        erro: erro?.chave === chave ? erro.mensagem : null,
        // Sem `track_uri` o backend não tem como calcular a posição, então não
        // existe salvamento possível — e a linha não mostra botão nenhum.
        podeSalvar: !!post.track_uri,
        onSave: () => salvar(post),
      }
    },
    [salvando, erro, salvar]
  )

  const abrirFaixa = useCallback((item: Parameters<typeof trackId>[0]) => {
    const id = trackId(item)
    if (id) router.push(`/track/${id}`)
  }, [])

  const abrirPerfil = useCallback(
    (userId: string) => {
      if (!userId) return
      prefetchUserProfile(queryClient, userId, getValidToken)
      router.push(`/user/${userId}`)
    },
    [queryClient, getValidToken]
  )

  const carregando = feedQ.isLoading
  const atualizando = feedQ.isRefetching && !feedQ.isFetchingNextPage
  const falhou = feedQ.isError

  const drop = posts[0]
  const resto = useMemo(() => posts.slice(1), [posts])

  const cabecalho = (
    <View>
      <Ticker posts={posts} falhou={falhou} />

      <View style={styles.topBar}>
        <MirsuiLogo size={24} />
        <Text style={styles.logoText}>mirsui</Text>
      </View>

      <View style={styles.editorial}>
        <Pill accent>● A cena, ao vivo</Pill>
        <Text style={styles.h1}>Quem ouviu primeiro o quê.</Text>
      </View>

      {drop && (
        <Drop
          post={drop}
          ehMeu={drop.user_id === user?.id}
          save={estadoDeSalvar(drop)}
          onOpen={abrirFaixa}
          onOpenUser={abrirPerfil}
        />
      )}

      {(carregando || resto.length > 0) && (
        <Text style={styles.tituloDaLista}>Achados da cena</Text>
      )}
    </View>
  )

  if (carregando) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.pad}>
          <View style={[styles.esqueletoLinha, { width: 140, height: 22, marginTop: 30 }]} />
          <View style={styles.esqueletoDrop} />
          {Array.from({ length: 4 }, (_, i) => (
            <View key={i} style={styles.esqueletoItem}>
              <View style={styles.esqueletoCapa} />
              <View style={{ flex: 1 }}>
                <View style={[styles.esqueletoLinha, { width: '45%' }]} />
                <View style={[styles.esqueletoLinha, { width: '70%', marginTop: 10, height: 15 }]} />
                <View style={[styles.esqueletoLinha, { width: '35%', marginTop: 10 }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={resto}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedItem
            post={item}
            ehMeu={item.user_id === user?.id}
            save={estadoDeSalvar(item)}
            onOpen={abrirFaixa}
            onOpenUser={abrirPerfil}
          />
        )}
        ListHeaderComponent={cabecalho}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => feedQ.refetch()}
            tintColor={colors.acc}
          />
        }
        onEndReached={() => {
          if (feedQ.hasNextPage && !feedQ.isFetchingNextPage) feedQ.fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          falhou ? (
            // Falha de rede não pode cair no estado vazio: aí a tela afirmaria
            // que a cena está parada, que é uma coisa que a gente não sabe.
            <Vazio
              titulo="Não conseguimos carregar a cena"
              corpo="O problema é do nosso lado, não seu. Nada foi perdido: os achados continuam salvos."
              acao={
                <Button
                  label="Tentar de novo"
                  variant="ghost"
                  onPress={() => feedQ.refetch()}
                  style={{ marginTop: 18 }}
                />
              }
            />
          ) : posts.length > 0 ? (
            <Vazio
              titulo="Por enquanto, só o drop de hoje"
              corpo="A cena está quieta agora. Volte mais tarde para os próximos achados."
            />
          ) : (
            <Vazio
              titulo="O radar ainda está em silêncio"
              corpo="Ninguém salvou nada ainda. Seja o primeiro e seu nome abre o histórico da faixa."
            />
          )
        }
        ListFooterComponent={
          feedQ.isFetchingNextPage ? (
            <ActivityIndicator color={colors.acc} style={{ marginVertical: 26 }} />
          ) : null
        }
      />
    </View>
  )
}

/* ------------------------------- Ticker -------------------------------- */

/**
 * O mural da cena.
 *
 * Sempre o nome de quem salvou, mesmo sendo você: isto é fofoca da cena, não
 * uma frase dirigida a quem está lendo.
 *
 * Sem animação: no site a faixa desliza infinitamente, e num telefone um laço
 * perpétuo custa bateria e ignora quem pediu menos movimento. Aqui ela mostra
 * o mais recente e para.
 */
function Ticker({ posts, falhou }: { posts: FeedPost[]; falhou: boolean }) {
  const texto = useMemo(() => {
    const itens = posts
      .slice(0, 6)
      .map((p) => `${quemSalvou(p, false).toUpperCase()} SALVOU ${p.track_title.toUpperCase()}`)
    if (itens.length > 0) return itens.join('   ✦   ')
    // Sem dados por falha, a cena pode estar cheia. Dizer que está em silêncio
    // seria afirmar o que a gente não sabe.
    return falhou
      ? 'SEM SINAL DA CENA AGORA'
      : 'A CENA ESTÁ EM SILÊNCIO. SEJA O PRIMEIRO A SALVAR'
  }, [posts, falhou])

  return (
    <View style={styles.ticker}>
      <Text style={styles.tickerAoVivo}>● AO VIVO</Text>
      <Text style={styles.tickerText} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  )
}

/* ------------------------------- O drop -------------------------------- */

/**
 * A faixa em destaque.
 *
 * Fundo `surface`, e não papel claro: o app inteiro é escuro, e um bloco creme
 * no meio da rolagem fazia parecer que a pessoa tinha caído em outro aplicativo
 * por três segundos. O site também usa `mir-surface` aqui — o papel lá é
 * exclusividade da ficha da faixa, onde a tela inteira muda.
 */
function Drop({
  post,
  ehMeu,
  save,
  onOpen,
  onOpenUser,
}: {
  post: FeedPost
  ehMeu: boolean
  save: SaveState
  onOpen: (post: FeedPost) => void
  onOpenUser: (userId: string) => void
}) {
  const quem = quemSalvou(post, ehMeu)
  const recado = recadoValido(post.claim_message)

  return (
    <View style={styles.drop}>
      <Text style={styles.dropKicker}>O DROP DE HOJE</Text>

      <Pressable onPress={() => onOpen(post)}>
        <Cover
          seed={post.artist_name}
          thumbnail={post.track_thumbnail}
          size={168}
          radius={12}
          fontSize={60}
        />
        <Text style={styles.dropTitle} numberOfLines={2}>
          {post.track_title}
        </Text>
        <Text style={styles.dropArtist} numberOfLines={1}>
          {post.artist_name}
        </Text>
      </Pressable>

      {recado ? (
        <Text style={styles.dropRecado}>{recado}</Text>
      ) : (
        <Text style={styles.dropBody}>
          <Text style={styles.dropQuem} onPress={() => onOpenUser(post.user_id)}>
            {quem}
          </Text>
          {' achou cedo e salvou '}
          {timeAgo(post.claimedat) || 'recentemente'}.
        </Text>
      )}

      <View style={styles.dropAcao}>
        <SaveButton state={save} tamanho="destaque" />
        <Text style={styles.dropMeta}>
          {ehMeu ? 'Você foi' : `${quem} foi`} {post.position}ª a salvar
          {post.savers_count > 1 ? ` · ${post.savers_count} já salvaram` : ''}
        </Text>
      </View>
    </View>
  )
}

/* ----------------------------- Estado vazio ---------------------------- */

function Vazio({
  titulo,
  corpo,
  acao,
}: {
  titulo: string
  corpo: string
  acao?: React.ReactNode
}) {
  return (
    <View style={styles.vazio}>
      <Text style={styles.vazioTitulo}>{titulo}</Text>
      <Text style={styles.vazioCorpo}>{corpo}</Text>
      {acao}
    </View>
  )
}

/* -------------------------------- Estilo -------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { paddingHorizontal: 20 },

  // Barra escura, não lima cheia: uma faixa lima de ponta a ponta seria o
  // elemento mais alto da tela inteira, e o que ela carrega é fofoca da cena,
  // não a conquista de ninguém. Só o "AO VIVO" fica aceso.
  ticker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: -20,
  },
  tickerAoVivo: { color: colors.acc, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  tickerText: { color: colors.text2, fontSize: 11, fontWeight: '700', letterSpacing: 1, flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 18 },
  logoText: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.6 },

  editorial: { paddingTop: 26, gap: 13 },
  h1: {
    color: colors.text,
    fontSize: 33,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 35,
  },

  drop: {
    marginTop: 26,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
  },
  dropKicker: {
    color: colors.text3,
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 18,
  },
  dropTitle: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 30,
    marginTop: 20,
  },
  dropArtist: { color: colors.text2, fontSize: 13, marginTop: 5 },
  dropBody: { color: colors.text2, fontSize: 15, lineHeight: 23, marginTop: 14 },
  dropQuem: { color: colors.text, fontWeight: '700' },
  dropRecado: {
    color: colors.text2,
    fontSize: 15,
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 14,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(232,115,74,0.5)',
  },
  dropAcao: { marginTop: 20, gap: 12 },
  dropMeta: { color: colors.text3, fontSize: 12 },

  tituloDaLista: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.9,
    marginTop: 34,
    marginBottom: 2,
  },

  esqueletoDrop: {
    height: 300,
    borderRadius: 18,
    backgroundColor: colors.fill1,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 26,
    marginBottom: 34,
  },
  esqueletoItem: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  esqueletoCapa: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.fill2 },
  esqueletoLinha: { height: 11, borderRadius: 4, backgroundColor: colors.fill2 },

  vazio: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderStyle: 'dashed',
    borderRadius: 13,
    paddingHorizontal: 24,
    paddingVertical: 34,
    marginTop: 16,
    alignItems: 'center',
  },
  vazioTitulo: {
    color: colors.text,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  vazioCorpo: {
    color: colors.text2,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 340,
  },
})
