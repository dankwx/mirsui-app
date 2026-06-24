import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import * as api from '../api/client'
import type { FeedPost, RecentClaim } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Cover from '../components/Cover'
import FeedItem, { FeedPostUI } from '../components/FeedItem'
import MirsuiLogo from '../components/MirsuiLogo'
import { Button, Pill } from '../components/ui'
import { timeAgo, ordLabel } from '../lib/time'
import { spotifyTrackId } from '../lib/track'
import { colors } from '../theme'

// Navega até a página de track a partir de qualquer item que tenha uri/url.
function openTrack(item: { track_uri?: string | null; track_url?: string | null }) {
  const id = spotifyTrackId(item)
  if (id) router.push(`/track/${id}`)
}

const PAGE = 5

export default function FeedScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, getValidToken } = useAuth()

  const [posts, setPosts] = useState<FeedPostUI[]>([])
  const [claims, setClaims] = useState<RecentClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const decorateWithLikes = useCallback(
    async (raw: FeedPost[]): Promise<FeedPostUI[]> => {
      if (raw.length === 0) return []
      let liked = new Set<number>()
      try {
        const token = await getValidToken()
        const res = await api.getUserLikes(
          raw.map((p) => p.id),
          token ?? undefined
        )
        liked = new Set(res.liked_tracks || [])
      } catch {
        // sem likes não é erro fatal
      }
      return raw.map((p) => ({ ...p, isLiked: liked.has(p.id) }))
    },
    [getValidToken]
  )

  const load = useCallback(async () => {
    setError(null)
    try {
      const [feedRes, claimsRes] = await Promise.all([
        api.getFeed(PAGE, 0),
        api.getRecentClaims(4),
      ])
      const decorated = await decorateWithLikes(feedRes.posts || [])
      setPosts(decorated)
      setClaims(claimsRes.claims || [])
      setHasMore((feedRes.posts || []).length === PAGE)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar o feed.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [decorateWithLikes])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return
    setLoadingMore(true)
    try {
      const res = await api.getFeed(PAGE, posts.length)
      const newPosts = res.posts || []
      if (newPosts.length === 0) {
        setHasMore(false)
        return
      }
      const decorated = await decorateWithLikes(newPosts)
      setPosts((prev) => [...prev, ...decorated])
      if (newPosts.length < PAGE) setHasMore(false)
    } catch {
      // mantém o que já existe
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, loading, posts.length, decorateWithLikes])

  // Like/unlike otimista, com reversão em caso de falha.
  const toggleSave = useCallback(
    async (post: FeedPostUI) => {
      const next = !post.isLiked
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isLiked: next, likes_count: p.likes_count + (next ? 1 : -1) }
            : p
        )
      )
      try {
        const token = await getValidToken()
        if (!token) throw new Error('no token')
        if (next) await api.likeTrack(post.id, token)
        else await api.unlikeTrack(post.id, token)
      } catch {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, isLiked: !next, likes_count: p.likes_count + (next ? -1 : 1) }
              : p
          )
        )
      }
    },
    [getValidToken]
  )

  const drop = posts[0]
  const feed = useMemo(() => posts.slice(1), [posts])
  const displayName = profile?.display_name || profile?.username || user?.email || 'você'

  const header = (
    <View>
      {/* Ticker ao vivo */}
      <Ticker posts={posts} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <MirsuiLogo size={24} />
          <Text style={styles.logoText}>mirsui</Text>
        </View>
      </View>

      {/* Cabeçalho editorial */}
      <View style={styles.editorial}>
        <Pill accent>● Agora · ao vivo</Pill>
        <Text style={styles.h1}>A cena, salvando em tempo real</Text>
        <Text style={styles.lede}>
          Quem ouviu primeiro o quê — e o que ainda dá tempo de você salvar{' '}
          <Text style={{ color: colors.acc, fontWeight: '600' }}>
            antes de virar tendência
          </Text>
          .
        </Text>
        <Text style={styles.greeting}>Olá, {displayName} 👋</Text>
      </View>

      {/* O drop de hoje */}
      {drop && <DropSection post={drop} onToggleSave={toggleSave} onOpen={openTrack} />}

      {/* Reivindicações recentes */}
      {claims.length > 0 && (
        <View style={styles.claimsBox}>
          <Text style={styles.claimsTitle}>Reivindicações recentes</Text>
          {claims.map((c) => (
            <Pressable key={c.id} style={styles.claimRow} onPress={() => openTrack(c)}>
              <Cover seed={c.artist_name} thumbnail={c.track_thumbnail} size={40} radius={7} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.claimTrack} numberOfLines={1}>
                  {c.track_title}
                </Text>
                <Text style={styles.claimArtist} numberOfLines={1}>
                  {c.artist_name}
                </Text>
              </View>
              <Text style={styles.claimAgo}>{timeAgo(c.claimedat)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Text style={styles.feedHeading}>Despachos da cena</Text>
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <MirsuiLogo size={44} />
        <ActivityIndicator color={colors.acc} style={{ marginTop: 16 }} />
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <FlatList
        data={feed}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <FeedItem post={item} onToggleSave={toggleSave} onOpen={openTrack} />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 96 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.acc} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          error ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{error}</Text>
              <Button label="Tentar de novo" variant="light" onPress={load} style={{ marginTop: 14 }} />
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                {posts.length > 0
                  ? 'Por enquanto, só o drop de hoje. Volte logo para mais despachos.'
                  : 'O radar ainda está em silêncio. Seja o primeiro a salvar uma faixa.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator color={colors.acc} style={{ marginVertical: 24 }} />
          ) : null
        }
      />
    </View>
  )
}

/* ---------- Ticker ---------- */
function Ticker({ posts }: { posts: FeedPostUI[] }) {
  const text = useMemo(() => {
    const items = posts
      .slice(0, 6)
      .map(
        (p) =>
          `${(p.display_name || p.username).toUpperCase()} SALVOU ${p.track_title.toUpperCase()}`
      )
    return items.length > 0
      ? items.join('   ✦   ')
      : 'A CENA ESTÁ EM SILÊNCIO — SEJA O PRIMEIRO A SALVAR'
  }, [posts])

  return (
    <View style={styles.ticker}>
      <Text style={styles.tickerText} numberOfLines={1}>
        ● AO VIVO   ✦   {text}
      </Text>
    </View>
  )
}

/* ---------- Drop de hoje ---------- */
function DropSection({
  post,
  onToggleSave,
  onOpen,
}: {
  post: FeedPostUI
  onToggleSave: (post: FeedPostUI) => void
  onOpen?: (post: FeedPostUI) => void
}) {
  const who = post.display_name || post.username
  const early = typeof post.position === 'number' && post.position <= 10

  return (
    <View style={styles.drop}>
      <Text style={styles.dropKicker}>★ O DROP DE HOJE</Text>
      <Pressable onPress={() => onOpen?.(post)}>
        <Cover
          seed={post.artist_name}
          thumbnail={post.track_thumbnail}
          size={200}
          radius={12}
          fontSize={72}
        />
        <Text style={styles.dropTitle}>{post.track_title}</Text>
        <Text style={styles.dropArtist}>{post.artist_name}</Text>
      </Pressable>
      <Text style={styles.dropBody}>
        <Text style={{ fontWeight: '700' }}>{who}</Text> achou cedo e salvou{' '}
        {timeAgo(post.claimedat) || 'recentemente'}.{' '}
        {early
          ? 'A janela ainda está aberta — salva antes de virar tendência.'
          : 'Entre na lista de quem ouviu antes do algoritmo.'}
      </Text>
      <Pressable
        onPress={() => onToggleSave(post)}
        style={[styles.dropBtn, post.isLiked ? styles.dropBtnSaved : styles.dropBtnSave]}
      >
        <Text style={[styles.dropBtnText, post.isLiked && { color: colors.paperInk }]}>
          {post.isLiked ? '✓ Salva no seu acervo' : '+ Salvar agora'}
        </Text>
      </Pressable>
      <Text style={styles.dropMeta}>
        {ordLabel(post.position)} a salvar · {post.likes_count} no acervo
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },

  ticker: {
    backgroundColor: colors.acc,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginHorizontal: -20,
  },
  tickerText: {
    color: colors.onAcc,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  signOut: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  signOutText: { color: colors.text2, fontSize: 13, fontWeight: '600' },

  editorial: { paddingTop: 28, gap: 12 },
  h1: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.6,
    lineHeight: 38,
  },
  lede: { color: colors.text2, fontSize: 15.5, lineHeight: 23 },
  greeting: { color: colors.text3, fontSize: 13, marginTop: 2 },

  drop: {
    marginTop: 28,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  dropKicker: {
    color: colors.brick,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 18,
  },
  dropTitle: {
    color: colors.paperInk,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1.2,
    marginTop: 22,
  },
  dropArtist: { color: 'rgba(22,18,12,0.6)', fontSize: 13, marginTop: 6 },
  dropBody: { color: 'rgba(22,18,12,0.75)', fontSize: 15, lineHeight: 23, marginTop: 16 },
  dropBtn: {
    marginTop: 20,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 26,
    alignSelf: 'flex-start',
  },
  dropBtnSave: { backgroundColor: colors.bg },
  dropBtnSaved: { borderWidth: 1.5, borderColor: 'rgba(22,18,12,0.35)' },
  dropBtnText: { color: colors.acc, fontSize: 15, fontWeight: '800' },
  dropMeta: { color: 'rgba(22,18,12,0.55)', fontSize: 12, marginTop: 12 },

  claimsBox: {
    marginTop: 28,
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill1,
    gap: 14,
  },
  claimsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  claimTrack: { color: colors.text, fontSize: 14, fontWeight: '600' },
  claimArtist: { color: colors.text2, fontSize: 12, marginTop: 2 },
  claimAgo: { color: colors.text3, fontSize: 11 },

  feedHeading: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 36,
    marginBottom: 4,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderStyle: 'dashed',
    borderRadius: 13,
    padding: 36,
    marginTop: 12,
    alignItems: 'center',
  },
  emptyText: { color: colors.text3, fontSize: 13.5, textAlign: 'center', lineHeight: 20 },
})
