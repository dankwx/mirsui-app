import React, { useCallback, useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as api from '../api/client'
import type { TrackClaimer, TrackDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import Cover from '../components/Cover'
import MirsuiLoader from '../components/MirsuiLoader'
import TrackActions from '../components/TrackActions'
import TrackPreviewBar from '../components/TrackPreviewBar'
import TrackSelo from '../components/TrackSelo'
import { BackButton, Button } from '../components/ui'
import { colors, initials } from '../theme'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Respeita a precisão do Spotify (ano / ano-mês / ano-mês-dia).
function formatReleaseDate(date?: string | null): string | null {
  if (!date) return null
  const [y, m, d] = date.split('-')
  if (d) return `${parseInt(d, 10)} ${MONTHS[parseInt(m, 10) - 1]} ${y}`
  if (m) return `${MONTHS[parseInt(m, 10) - 1]} ${y}`
  return y
}

function formatFollowers(n?: number | null): string | null {
  if (n == null) return null
  if (n >= 1_000_000) {
    const m = (n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '')
    return `${m} mi`
  }
  if (n >= 1_000) return `${Math.round(n / 1000)} mil`
  return n.toLocaleString('pt-BR')
}

function formatDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  const sec = Math.floor((ms % 60000) / 1000)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

function claimWhen(ts: string | null): string {
  if (!ts) return ''
  const date = new Date(ts)
  const days = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (days < 1) return 'hoje'
  if (days < 30) return days === 1 ? 'há 1 dia' : `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'há 1 mês' : `há ${months} meses`
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export default function TrackScreen({ trackId }: { trackId: string }) {
  const insets = useSafeAreaInsets()
  const { getValidToken, isAuthenticated } = useAuth()

  const [details, setDetails] = useState<TrackDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estado do claim, elevado do TrackActions porque selo e "A prova" dependem dele.
  const [claimed, setClaimed] = useState(false)
  const [position, setPosition] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [claiming, setClaiming] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const token = (await getValidToken()) ?? undefined
      const data = await api.getTrackDetails(trackId, token)
      setDetails(data)
      setClaimed(data.userClaim.claimed)
      setPosition(data.userClaim.position)
      setTotal(data.totalClaims)
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar a faixa.')
    } finally {
      setLoading(false)
    }
  }, [trackId, getValidToken])

  useEffect(() => {
    load()
  }, [load])

  const handleClaim = useCallback(
    async (message: string) => {
      if (!details || claiming || claimed) return
      setClaiming(true)
      try {
        const token = await getValidToken()
        if (!token) throw new Error('Faça login para reivindicar.')
        const t = details.track
        const res = await api.claimTrack(
          {
            trackUri: t.uri,
            trackName: t.name,
            artistName: t.artists.map((a) => a.name).join(', '),
            albumName: t.album.name || '',
            spotifyUrl: t.spotify_url,
            trackThumbnail: t.album.image || '',
            popularity: t.popularity,
            claimMessage: message || undefined,
          },
          token
        )
        setClaimed(true)
        setPosition(res.position)
        setTotal((n) => n + 1)
        // Recarrega em segundo plano para refletir o usuário em "A prova".
        load()
      } catch (e: any) {
        // 409 = já reivindicada: recarrega para reconciliar posição/contagem.
        if (e?.status === 409) {
          setClaimed(true)
          load()
        } else {
          setError(e?.message || 'Erro ao reivindicar a faixa.')
        }
      } finally {
        setClaiming(false)
      }
    },
    [details, claiming, claimed, getValidToken, load]
  )

  const handleShare = useCallback(() => {
    if (!details) return
    const t = details.track
    const artistNames = t.artists.map((a) => a.name).join(', ')
    Share.share({
      message: `${t.name} — ${artistNames}\nCravei essa faixa antes de virar mainstream 🌱\n${t.spotify_url}`,
    }).catch(() => {})
  }, [details])

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <MirsuiLoader size={48} />
      </View>
    )
  }

  if (error || !details) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top, paddingHorizontal: 24 }]}>
        <Text style={styles.errorText}>{error || 'Faixa não encontrada.'}</Text>
        <Button label="Tentar de novo" variant="light" onPress={load} style={{ marginTop: 16 }} />
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} style={{ marginTop: 10 }} />
      </View>
    )
  }

  const t = details.track
  const artistNames = t.artists.map((a) => a.name).join(', ') || 'Artista Desconhecido'
  const releaseYear = t.album.release_date ? parseInt(t.album.release_date.slice(0, 4), 10) : null

  const specs = [
    details.genre && { k: 'Gênero', v: details.genre },
    t.album.release_date && { k: 'Lançamento', v: formatReleaseDate(t.album.release_date)! },
    details.followers != null && {
      k: 'Ouvintes',
      v: `${formatFollowers(details.followers)} seguidores`,
    },
  ].filter(Boolean) as { k: string; v: string }[]

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ===== HERO ===== */}
        <View style={styles.hero}>
          <BackButton onPress={() => router.back()} style={{ marginBottom: 16 }} />

          <View style={styles.coverWrap}>
            {t.album.image ? (
              <Image source={{ uri: t.album.image }} style={styles.cover} contentFit="cover" transition={150} />
            ) : (
              <Cover seed={artistNames + t.name} size={CARD} radius={10} fontSize={84} />
            )}
          </View>

          <Text style={styles.title}>{t.name}</Text>
          <Text style={styles.artists}>{artistNames}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{t.album.name || 'Álbum'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{releaseYear || '—'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name="time-outline" size={12} color={colors.text2} />
            <Text style={styles.metaText}>{formatDuration(t.duration_ms)}</Text>
          </View>

          <TrackActions
            claimed={claimed}
            position={position}
            total={total}
            loading={claiming}
            onClaim={handleClaim}
            onShare={handleShare}
          />
        </View>

        {/* ===== Ficha técnica ===== */}
        {specs.length > 0 && (
          <View style={styles.specs}>
            {specs.map((s, i) => (
              <View key={s.k} style={[styles.spec, i > 0 && styles.specBorder]}>
                <Text style={styles.specKey}>{s.k.toUpperCase()}</Text>
                <Text style={styles.specVal}>{s.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== Prévia + Selo ===== */}
        <View style={styles.body}>
          <TrackPreviewBar
            videoId={details.youtubeVideoId}
            spotifyUrl={t.spotify_url}
            trackTitle={t.name}
            artistName={artistNames}
          />
          <TrackSelo
            claimed={claimed}
            position={position}
            trackTitle={t.name}
            artistName={artistNames}
            year={releaseYear}
            isLoggedIn={isAuthenticated}
            onShare={handleShare}
          />
        </View>

        {/* ===== A PROVA ===== */}
        {details.topClaimers.length > 0 && (
          <ProofSection
            claimers={details.topClaimers}
            total={total}
            popularity={t.popularity}
          />
        )}
      </ScrollView>
    </View>
  )
}

/* ---------- "A prova" (seção em papel claro) ---------- */
function ProofSection({
  claimers,
  total,
  popularity,
}: {
  claimers: TrackClaimer[]
  total: number
  popularity: number
}) {
  const first = claimers[0]
  const firstName = first?.display_name || first?.username || 'Alguém'

  return (
    <View style={styles.proof}>
      <Text style={styles.proofKicker}>★ A PROVA</Text>
      <Text style={styles.proofHeadline}>
        {firstName} ouviu <Text style={{ color: PROOF_BRICK }}>antes</Text> do mundo.
      </Text>
      <Text style={styles.proofLede}>
        A janela abre quando a faixa ainda é obscura e fecha quando vira tendência. Reivindicar
        dentro dela é o que entra pra história.
      </Text>

      {/* Timeline */}
      <View style={styles.timelineCard}>
        <View style={styles.timelineTrack}>
          <View style={styles.timelineFill} />
          <View style={[styles.timelineNode, { left: '8%', backgroundColor: PROOF_ACC }]} />
          <View style={[styles.timelineNode, { left: '76%', backgroundColor: PROOF_BRICK }]} />
        </View>
        <View style={styles.timelineLabels}>
          <View>
            <Text style={styles.tlStrong}>{firstName} reivindicou</Text>
            <Text style={styles.tlMuted}>{claimWhen(first?.claimedat)} · obscura</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.tlStrong, { color: PROOF_BRICK }]}>em alta agora</Text>
            <Text style={styles.tlMuted}>pico · {popularity} popular.</Text>
          </View>
        </View>
      </View>

      {/* Reivindicações */}
      <View style={styles.proofListHead}>
        <Text style={styles.proofListTitle}>Reivindicações</Text>
        <Text style={styles.proofListMeta}>{total} no total · janela fechada</Text>
      </View>

      <View style={{ gap: 10 }}>
        {claimers.map((c, i) => {
          const name = c.display_name || c.username || 'Usuário'
          const pos = c.position ?? i + 1
          const isFirst = pos === 1
          return (
            <View key={c.user_id} style={styles.claimerRow}>
              <View style={styles.rankWrap}>
                {isFirst ? (
                  <Ionicons name="trophy" size={17} color={PROOF_BRICK} />
                ) : (
                  <Text style={styles.rankNum}>{String(pos).padStart(2, '0')}</Text>
                )}
              </View>
              <View style={styles.claimerAvatar}>
                {c.avatar_url ? (
                  <Image source={{ uri: c.avatar_url }} style={styles.claimerAvatarImg} />
                ) : (
                  <Text style={styles.claimerAvatarIni}>{initials(name)}</Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.claimerName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={styles.claimerMeta} numberOfLines={1}>
                  {isFirst ? 'primeiro a reivindicar' : 'reivindicou'} · {claimWhen(c.claimedat)}
                </Text>
              </View>
              {isFirst && (
                <View style={styles.hipsterBadge}>
                  <Text style={styles.hipsterText}>1º hipster</Text>
                </View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const CARD = 260
const PROOF_BG = '#ece3d2'
const PROOF_CARD = '#efe7d6'
const PROOF_INK = '#16120c'
const PROOF_BRICK = '#c14a26'
const PROOF_ACC = '#cdef36'
const ink = (o: number) => `rgba(22,18,12,${o})`

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.text2, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  /* hero */
  hero: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 32 },
  coverWrap: { width: CARD, maxWidth: '100%', alignSelf: 'center' },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  title: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.8,
    lineHeight: 44,
    marginTop: 24,
  },
  artists: { color: colors.acc, fontSize: 20, fontWeight: '700', marginTop: 10, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  metaText: { color: colors.text2, fontSize: 12.5 },
  metaDot: { color: colors.text3 },

  /* ficha técnica */
  specs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 20,
  },
  spec: { flex: 1, paddingVertical: 18, paddingRight: 16 },
  specBorder: { borderLeftWidth: 1, borderLeftColor: colors.line, paddingLeft: 16 },
  specKey: { color: colors.text3, fontSize: 10, letterSpacing: 1.6 },
  specVal: { color: colors.text, fontSize: 14.5, fontWeight: '600', marginTop: 8 },

  /* corpo */
  body: { paddingHorizontal: 20, paddingTop: 28, gap: 18 },

  /* A prova */
  proof: { backgroundColor: PROOF_BG, paddingHorizontal: 20, paddingVertical: 44, marginTop: 32 },
  proofKicker: { color: PROOF_BRICK, fontSize: 11, fontWeight: '700', letterSpacing: 2.4 },
  proofHeadline: {
    color: PROOF_INK,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.4,
    lineHeight: 36,
    marginTop: 14,
  },
  proofLede: { color: ink(0.6), fontSize: 12.5, lineHeight: 19, marginTop: 14 },
  timelineCard: {
    marginTop: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ink(0.1),
    backgroundColor: PROOF_CARD,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
  },
  timelineTrack: { height: 3, borderRadius: 2, backgroundColor: ink(0.2), marginVertical: 12 },
  timelineFill: {
    position: 'absolute',
    left: '8%',
    right: '24%',
    height: 3,
    borderRadius: 2,
    backgroundColor: PROOF_INK,
  },
  timelineNode: {
    position: 'absolute',
    top: -6.5,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: PROOF_INK,
    marginLeft: -8,
  },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  tlStrong: { color: PROOF_INK, fontSize: 11, fontWeight: '700' },
  tlMuted: { color: ink(0.5), fontSize: 11, marginTop: 2 },
  proofListHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 14,
  },
  proofListTitle: { color: PROOF_INK, fontSize: 22, fontWeight: '800', letterSpacing: -0.6 },
  proofListMeta: { color: ink(0.5), fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  claimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ink(0.1),
    backgroundColor: PROOF_CARD,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rankWrap: { width: 24, alignItems: 'center' },
  rankNum: { color: PROOF_BRICK, fontSize: 17, fontWeight: '700' },
  claimerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#cdef36',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ink(0.1),
  },
  claimerAvatarImg: { width: '100%', height: '100%' },
  claimerAvatarIni: { color: PROOF_INK, fontSize: 15, fontWeight: '800' },
  claimerName: { color: PROOF_INK, fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  claimerMeta: { color: ink(0.55), fontSize: 11, marginTop: 2 },
  hipsterBadge: {
    backgroundColor: PROOF_INK,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  hipsterText: {
    color: PROOF_ACC,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
})
