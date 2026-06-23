import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../auth/AuthContext'
import * as api from '../api/client'
import type { ProfileComment, ProfileTrack } from '../api/types'
import { Button } from '../components/ui'
import EditProfileModal from '../components/EditProfileModal'
import { timeAgo } from '../lib/time'
import { colors, initials } from '../theme'

const MONTHS_UP = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const MAX_FAVORITES_HIGHLIGHT = 6

// mesma régua do front: discover_rating alto = descoberta antecipada
const isEarly = (t: ProfileTrack) => (t.discover_rating ?? 0) > 7

const hashStr = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// paleta tipográfica das capas sem thumbnail (espelha SongsList do front)
const PALETTES = [
  { bg: '#cdef36', fg: '#16120c', mut: 'rgba(22,18,12,0.6)' },
  { bg: '#231c12', fg: '#ece3d2', mut: 'rgba(236,227,210,0.5)' },
  { bg: '#c14a26', fg: '#f7ead7', mut: 'rgba(247,234,215,0.62)' },
  { bg: '#e3d8c1', fg: '#16120c', mut: 'rgba(22,18,12,0.5)' },
  { bg: '#27203a', fg: '#e7ddff', mut: 'rgba(231,221,255,0.55)' },
  { bg: '#173a4a', fg: '#dcf0fb', mut: 'rgba(220,240,251,0.55)' },
  { bg: '#3f3f17', fg: '#eef36a', mut: 'rgba(238,243,106,0.6)' },
]
const paletteFor = (t: ProfileTrack) => PALETTES[hashStr(t.track_title + '|' + t.artist_name) % PALETTES.length]

type Filter = 'all' | 'early' | 'fav'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'early', label: 'Antecipadas' },
  { id: 'fav', label: 'Favoritas' },
]

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const { profile, signOut, getValidToken } = useAuth()

  const [tracks, setTracks] = useState<ProfileTrack[]>([])
  const [comments, setComments] = useState<ProfileComment[]>([])
  const [social, setSocial] = useState({ followers: 0, following: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState(false)

  const profileId = profile?.id

  const load = useCallback(async () => {
    if (!profileId) return
    setError(null)
    try {
      const [tracksRes, commentsRes, statsRes] = await Promise.all([
        api.getProfileTracks(profileId),
        api.getProfileComments(profileId),
        api.getProfileStats(profileId),
      ])
      setTracks(tracksRes.tracks)
      setComments(commentsRes.comments)
      setSocial(statsRes)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar seu perfil.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profileId])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const name = profile?.display_name || profile?.username || 'Sem nome'
  const username = profile?.username || ''

  // selo editorial determinístico (igual ao front)
  const seed = hashStr(username || profileId || 'mirsui')
  const profileNo = String(seed % 1000).padStart(3, '0')
  const faroTop = (seed % 14) + 2
  const memberSince = 2023 + (seed % 2)
  const now = new Date()
  const edition = `${MONTHS_UP[now.getMonth()]} ${now.getFullYear()}`

  const earlyCount = tracks.filter(isEarly).length
  const favorites = useMemo(() => tracks.filter((t) => t.is_favorited), [tracks])
  const favCount = favorites.length

  const visibleTracks = useMemo(() => {
    if (filter === 'early') return tracks.filter(isEarly)
    if (filter === 'fav') return favorites
    return tracks
  }, [tracks, filter, favorites])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    load()
  }, [load])

  async function handleShare() {
    try {
      await Share.share({
        message: username
          ? `Confira o perfil de @${username} no Mirsui: https://mirsui.com/user/${username}`
          : 'Confira meu perfil no Mirsui',
      })
    } catch {
      // usuário cancelou
    }
  }

  async function toggleFavorite(track: ProfileTrack) {
    const next = !track.is_favorited
    setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, is_favorited: next } : t)))
    try {
      const token = await getValidToken()
      if (!token) throw new Error('no-token')
      if (next) await api.favoriteTrack(track.id, token)
      else await api.unfavoriteTrack(track.id, token)
    } catch {
      setTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, is_favorited: !next } : t)))
      Alert.alert('Ops', 'Não foi possível atualizar o favorito.')
    }
  }

  function confirmRemove(track: ProfileTrack) {
    Alert.alert('Remover faixa', `Remover "${track.track_title}" do seu acervo?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const prev = tracks
          setTracks((p) => p.filter((t) => t.id !== track.id))
          try {
            const token = await getValidToken()
            if (!token) throw new Error('no-token')
            await api.deleteTrack(track.id, token)
          } catch {
            setTracks(prev)
            Alert.alert('Ops', 'Não foi possível remover a faixa.')
          }
        },
      },
    ])
  }

  function openTrackMenu(track: ProfileTrack) {
    Alert.alert(track.track_title, track.artist_name, [
      {
        text: track.is_favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos',
        onPress: () => toggleFavorite(track),
      },
      { text: 'Abrir faixa', onPress: () => track.track_url && Linking.openURL(track.track_url) },
      { text: 'Remover do acervo', style: 'destructive', onPress: () => confirmRemove(track) },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  const openTrack = (track: ProfileTrack) => track.track_url && Linking.openURL(track.track_url)

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.acc} />
        }
      >
        {/* faixa de edição */}
        <View style={styles.editionStrip}>
          <Text style={styles.editionText}>PERFIL Nº {profileNo}</Text>
          <Text style={styles.editionText}>EDIÇÃO {edition}</Text>
        </View>

        {/* cabeçalho compacto: avatar + identidade lado a lado */}
        <View style={styles.header}>
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarIni}>{initials(name)}</Text>
                )}
              </View>
              <View style={styles.faro}>
                <Text style={styles.faroText}>FARO{'\n'}TOP {faroTop}%</Text>
              </View>
            </View>

            <View style={styles.identity}>
              <Text style={styles.sinceLine}>OUVINTE ANTECIPADO · DESDE {memberSince}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {username ? <Text style={styles.username}>@{username}</Text> : null}
            </View>
          </View>

          {profile?.description ? <Text style={styles.desc}>{profile.description}</Text> : null}

          {/* métricas: apenas seguidores e seguindo */}
          <View style={styles.statsRow}>
            <Stat value={social.followers} label="Seguidores" />
            <View style={styles.statDivider} />
            <Stat value={social.following} label="Seguindo" />
          </View>

          {/* ações */}
          <View style={styles.actions}>
            <Button
              label="Editar perfil"
              onPress={() => setEditing(true)}
              style={{ flex: 1 }}
              icon={<Ionicons name="pencil" size={15} color={colors.onAcc} />}
            />
            <Button
              label="Compartilhar"
              variant="ghost"
              onPress={handleShare}
              style={{ flex: 1 }}
              icon={<Ionicons name="arrow-redo-outline" size={16} color={colors.text2} />}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.acc} style={{ marginTop: 40 }} />
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateText}>{error}</Text>
            <Button label="Tentar de novo" variant="ghost" onPress={load} style={{ marginTop: 16 }} />
          </View>
        ) : (
          <>
            {/* FAVORITAS — seção dedicada */}
            {favCount > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>Favoritas</Text>
                  <Text style={styles.sectionMeta}>
                    {favCount} {favCount === 1 ? 'FAIXA' : 'FAIXAS'} · SELEÇÃO PESSOAL
                  </Text>
                </View>
                <View style={styles.grid}>
                  {favorites.slice(0, MAX_FAVORITES_HIGHLIGHT).map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      onPress={() => openTrack(track)}
                      onLongPress={() => openTrackMenu(track)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ACERVO SALVO */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Acervo salvo</Text>
                <Text style={styles.sectionMeta}>
                  {tracks.length} {tracks.length === 1 ? 'FAIXA' : 'FAIXAS'} · {earlyCount} ANTECIPADAS
                </Text>
              </View>

              <View style={styles.filters}>
                {FILTERS.map((f) => {
                  const active = filter === f.id
                  const count = f.id === 'early' ? earlyCount : f.id === 'fav' ? favCount : tracks.length
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setFilter(f.id)}
                      style={[styles.filterPill, active && styles.filterPillActive]}
                    >
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {f.label} {count}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {visibleTracks.length === 0 ? (
                <EmptyHint
                  icon="musical-notes-outline"
                  text={
                    filter === 'all'
                      ? 'Você ainda não reivindicou nenhuma faixa. Carimbe descobertas no feed para vê-las aqui.'
                      : 'Nenhuma faixa neste filtro.'
                  }
                />
              ) : (
                <View style={styles.grid}>
                  {visibleTracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      onPress={() => openTrack(track)}
                      onLongPress={() => openTrackMenu(track)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* RECADOS */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Recados</Text>
                <Text style={styles.sectionMeta}>{comments.length}</Text>
              </View>
              {comments.length === 0 ? (
                <EmptyHint
                  icon="chatbubble-ellipses-outline"
                  text="Nenhum recado por aqui ainda. Quando alguém deixar um recado no seu mural, ele aparece aqui."
                />
              ) : (
                <View>
                  {comments.map((c) => (
                    <CommentRow key={c.id} comment={c} />
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ paddingHorizontal: GUTTER }}>
          <Button
            label="Sair da conta"
            variant="ghost"
            onPress={signOut}
            style={{ marginTop: 12 }}
            icon={<Ionicons name="log-out-outline" size={18} color={colors.text2} />}
          />
        </View>
      </ScrollView>

      {profile ? (
        <EditProfileModal visible={editing} profile={profile} onClose={() => setEditing(false)} />
      ) : null}
    </View>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

function TrackCard({
  track,
  onPress,
  onLongPress,
}: {
  track: ProfileTrack
  onPress: () => void
  onLongPress: () => void
}) {
  const early = isEarly(track)
  const p = paletteFor(track)
  return (
    <Pressable style={styles.card} onPress={onPress} onLongPress={onLongPress} delayLongPress={250}>
      <View style={styles.cover}>
        {track.track_thumbnail ? (
          <Image source={{ uri: track.track_thumbnail }} style={styles.coverImg} contentFit="cover" />
        ) : (
          <View style={[styles.coverFallback, { backgroundColor: p.bg }]}>
            <Text style={[styles.coverArtist, { color: p.mut }]} numberOfLines={1}>
              {track.artist_name}
            </Text>
            <Text style={[styles.coverTitle, { color: p.fg }]} numberOfLines={2}>
              {track.track_title}
            </Text>
          </View>
        )}

        {early ? (
          <View style={styles.earlyTag}>
            <Ionicons name="flag" size={9} color={colors.onAcc} />
            <Text style={styles.earlyTagText}>early</Text>
          </View>
        ) : null}

        {track.is_favorited ? (
          <View style={styles.favBadge}>
            <Ionicons name="heart" size={13} color={colors.acc} />
          </View>
        ) : null}
      </View>

      <Text style={styles.cardTitle} numberOfLines={1}>
        {track.track_title}
      </Text>
      <Text style={styles.cardArtist} numberOfLines={1}>
        {track.artist_name}
      </Text>
      {track.likes_count > 0 ? (
        <Text style={styles.cardMeta}>{track.likes_count} também têm</Text>
      ) : null}
    </Pressable>
  )
}

function CommentRow({ comment }: { comment: ProfileComment }) {
  const who = comment.author?.display_name || comment.author?.username || 'Anônimo'
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        {comment.author?.avatar_url ? (
          <Image source={{ uri: comment.author.avatar_url }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.commentAvatarIni}>{who.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentMeta}>
          <Text style={styles.commentWho} numberOfLines={1}>
            {who}
          </Text>
          {comment.is_pinned ? <Ionicons name="pin" size={12} color={colors.acc} /> : null}
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  )
}

function EmptyHint({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.emptyHint}>
      <Ionicons name={icon} size={22} color={colors.text3} />
      <Text style={styles.emptyHintText}>{text}</Text>
    </View>
  )
}

const GUTTER = 22

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  editionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    marginBottom: 18,
  },
  editionText: { color: colors.text3, fontSize: 10.5, letterSpacing: 1.6, fontWeight: '600' },

  header: { paddingHorizontal: GUTTER },
  identityRow: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { width: 84, marginRight: 18 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1b1813',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(205,239,54,0.45)',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarIni: { color: colors.text, fontSize: 30, fontWeight: '800' },
  faro: {
    position: 'absolute',
    bottom: -5,
    right: -10,
    backgroundColor: colors.acc,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.bg,
    paddingHorizontal: 7,
    paddingVertical: 3,
    transform: [{ rotate: '-8deg' }],
  },
  faroText: {
    color: colors.onAcc,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    lineHeight: 10,
    textAlign: 'center',
  },
  identity: { flex: 1, minWidth: 0 },
  sinceLine: { color: colors.acc, fontSize: 10, letterSpacing: 1.3, fontWeight: '700' },
  name: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -1, marginTop: 5 },
  username: { color: colors.text2, fontSize: 13.5, marginTop: 3, fontWeight: '600' },

  desc: { color: colors.text2, fontSize: 14.5, lineHeight: 21, marginTop: 16 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginTop: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  statLabel: {
    color: colors.text3,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '600',
  },
  statDivider: { width: 1, height: 22, backgroundColor: colors.line2 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },

  section: { paddingHorizontal: GUTTER, marginTop: 36 },
  sectionHead: { marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  sectionMeta: {
    color: colors.text3,
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '600',
    marginTop: 5,
  },

  filters: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  filterPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.fill1,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterPillActive: { backgroundColor: colors.acc, borderColor: colors.acc },
  filterText: { color: colors.text2, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  filterTextActive: { color: colors.onAcc },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', marginBottom: 22 },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.fill2,
  },
  coverImg: { width: '100%', height: '100%' },
  coverFallback: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  coverArtist: { fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  coverTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.6, lineHeight: 20 },
  earlyTag: {
    position: 'absolute',
    left: 8,
    top: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.acc,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  earlyTagText: {
    color: colors.onAcc,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  favBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(22,18,12,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: colors.text, fontSize: 14.5, fontWeight: '700', marginTop: 9 },
  cardArtist: { color: colors.text2, fontSize: 12, marginTop: 2 },
  cardMeta: { color: colors.text3, fontSize: 10.5, marginTop: 4 },

  commentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1b1813',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarIni: { color: colors.text, fontSize: 14, fontWeight: '800' },
  commentBody: { flex: 1, minWidth: 0 },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  commentWho: { color: colors.text, fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  commentTime: { color: colors.text3, fontSize: 11 },
  commentText: { color: colors.text2, fontSize: 14, lineHeight: 20, marginTop: 3 },

  emptyHint: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.fill1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    borderRadius: 14,
    padding: 18,
  },
  emptyHintText: { color: colors.text3, fontSize: 13, lineHeight: 19, flex: 1 },

  stateBox: { alignItems: 'center', marginTop: 40, paddingHorizontal: GUTTER },
  stateText: { color: colors.text2, fontSize: 14, textAlign: 'center', lineHeight: 20 },
})
