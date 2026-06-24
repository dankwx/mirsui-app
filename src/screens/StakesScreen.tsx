import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import * as api from '../api/client'
import { ApiError } from '../api/client'
import type { SearchTrack, Stake } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui'
import { badge, fmt, formatMultiplier } from '../lib/stake'
import { colors, tone } from '../theme'

// Regras da feature (ver Stake.md): 3 vagas e coleta só libera após 7 dias.
const MAX_SLOTS = 3
const MIN_DAYS = 7

/* --------------------------------------------------------------------------
 * Toast leve (sem dependência): banner animado no rodapé.
 * ------------------------------------------------------------------------ */
type ToastTone = 'ok' | 'err'
type ToastState = { msg: string; tone: ToastTone } | null

function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  const anim = useRef(new Animated.Value(0)).current
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(
    (msg: string, t: ToastTone = 'ok') => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      setToast({ msg, tone: t })
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }).start()
      hideTimer.current = setTimeout(() => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setToast(null))
      }, 2600)
    },
    [anim]
  )

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    },
    []
  )

  return { toast, show, anim }
}

/* --------------------------------------------------------------------------
 * Capa: thumbnail real do Spotify, com fallback tonal.
 * ------------------------------------------------------------------------ */
function CoverFill({
  thumbnail,
  seed,
}: {
  thumbnail?: string | null
  seed: string
}) {
  if (thumbnail) {
    return (
      <Image
        source={{ uri: thumbnail }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={150}
      />
    )
  }
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: tone(seed) }]} />
  )
}

/* --------------------------------------------------------------------------
 * Tela principal
 * ------------------------------------------------------------------------ */
export default function StakesScreen() {
  const insets = useSafeAreaInsets()
  const { getValidToken, isAuthenticated } = useAuth()
  const { toast, show, anim: toastAnim } = useToast()

  const [stakes, setStakes] = useState<Stake[]>([])
  const [points, setPoints] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // modal de dar stake
  const [modalSlot, setModalSlot] = useState<number | null>(null)
  const [openInfo, setOpenInfo] = useState<Record<string, boolean>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  /* ---- carregar stakes + pontos ---- */
  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setError(null)
      const token = await getValidToken()
      if (!token) {
        setStakes([])
        setPoints(null)
        setLoading(false)
        if (!opts.silent) setError('Faça login para dar stake em faixas.')
        return
      }
      try {
        const [stakesRes, pointsRes] = await Promise.allSettled([
          api.getStakes(token),
          api.getStakePoints(token),
        ])
        if (stakesRes.status === 'fulfilled') {
          setStakes(stakesRes.value.stakes ?? [])
          if (!opts.silent) setError(null)
        } else if (!opts.silent) {
          setError('Não foi possível carregar seus stakes.')
        }
        if (pointsRes.status === 'fulfilled') {
          setPoints(pointsRes.value.total ?? 0)
        }
      } finally {
        setLoading(false)
      }
    },
    [getValidToken]
  )

  useEffect(() => {
    load()
  }, [load])

  // Atualiza em silêncio ao voltar para a aba (dias/pontos mudam com o tempo).
  useFocusEffect(
    useCallback(() => {
      let active = true
      if (active) load({ silent: true })
      return () => {
        active = false
      }
    }, [load])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load({ silent: true })
    setRefreshing(false)
  }, [load])

  /* ---- recolher / esvaziar vaga ---- */
  const recolher = useCallback(
    async (s: Stake) => {
      setBusyId(s.id)
      try {
        const token = await getValidToken()
        if (!token) {
          show('Sessão expirada. Entre de novo.', 'err')
          return
        }
        const data = await api.recolherStake(s.id, token)
        if (data.collected) {
          show(`+${fmt(data.points)} pontos pra sua conta`)
        } else {
          show('Vaga liberada')
        }
        setOpenInfo((p) => ({ ...p, [s.id]: false }))
        await load({ silent: true })
      } catch (e) {
        show(
          e instanceof ApiError ? e.message : 'Erro ao recolher',
          'err'
        )
      } finally {
        setBusyId(null)
      }
    },
    [getValidToken, load, show]
  )

  const onStakePlaced = useCallback(
    async (title: string, multiplier: number) => {
      show(`Stake feito! "${title}" · ${formatMultiplier(multiplier)}`)
      setModalSlot(null)
      await load({ silent: true })
    },
    [load, show]
  )

  /* ---- derivados ---- */
  const slots: (Stake | null)[] = useMemo(
    () => [0, 1, 2].map((i) => stakes[i] ?? null),
    [stakes]
  )
  const used = Math.min(stakes.length, MAX_SLOTS)
  const free = MAX_SLOTS - used

  const toggleInfo = (id: string) =>
    setOpenInfo((p) => ({ ...p, [id]: !p[id] }))

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.acc}
            colors={[colors.acc]}
          />
        }
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.kicker}>DÊ STAKE NA FAIXA ANTES DELA BOMBAR</Text>
          <Text style={styles.title}>Stakes</Text>
          <Text style={styles.lead}>
            Você tem{' '}
            <Text style={styles.leadStrong}>
              {free} {free === 1 ? 'vaga' : 'vagas'}
            </Text>{' '}
            pra dar stake em faixas que acha que vão subir. Quanto mais escondida
            a faixa, maior o multiplicador. Seu faro, em jogo.
          </Text>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <View style={styles.dot} />
              <Text style={styles.metaText}>
                {used} DE {MAX_SLOTS} VAGAS EM JOGO
              </Text>
            </View>
            <Text style={styles.metaDivider}>·</Text>
            <Text style={styles.metaText}>COLETA LIBERA EM {MIN_DAYS} DIAS</Text>
            {points != null && (
              <>
                <Text style={styles.metaDivider}>·</Text>
                <Text style={styles.metaText}>
                  {fmt(points)} PONTOS RECOLHIDOS
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ESTADOS */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.acc} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            {isAuthenticated && (
              <Button
                label="Tentar de novo"
                variant="ghost"
                onPress={() => load()}
                style={{ marginTop: 14 }}
              />
            )}
          </View>
        ) : (
          <View style={styles.slots}>
            {slots.map((s, i) =>
              s ? (
                <FilledSlot
                  key={s.id}
                  stake={s}
                  index={i}
                  busy={busyId === s.id}
                  open={!!openInfo[s.id]}
                  onToggleInfo={() => toggleInfo(s.id)}
                  onRecolher={() => recolher(s)}
                />
              ) : (
                <EmptySlot key={`empty-${i}`} index={i} onPress={() => setModalSlot(i)} />
              )
            )}
          </View>
        )}
      </ScrollView>

      {/* TOAST */}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { bottom: insets.bottom + 18 },
            toast.tone === 'err' && styles.toastErr,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text
            style={[styles.toastText, toast.tone === 'err' && { color: '#fff' }]}
          >
            {toast.msg}
          </Text>
        </Animated.View>
      )}

      {/* MODAL DAR STAKE */}
      <StakeModal
        slot={modalSlot}
        onClose={() => setModalSlot(null)}
        onPlaced={onStakePlaced}
        getValidToken={getValidToken}
        onError={(m) => show(m, 'err')}
      />
    </View>
  )
}

/* --------------------------------------------------------------------------
 * Vaga livre
 * ------------------------------------------------------------------------ */
function EmptySlot({ index, onPress }: { index: number; onPress: () => void }) {
  const vaga = '0' + (index + 1)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.empty, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.emptyPlus}>
        <Ionicons name="add" size={30} color={colors.acc} />
      </View>
      <Text style={styles.emptyVaga}>VAGA {vaga} · LIVRE</Text>
      <Text style={styles.emptyTitle}>Dê stake numa faixa antes dela bombar</Text>
      <View style={styles.emptyCta}>
        <Text style={styles.emptyCtaText}>Escolher faixa →</Text>
      </View>
    </Pressable>
  )
}

/* --------------------------------------------------------------------------
 * Vaga ocupada
 * ------------------------------------------------------------------------ */
function FilledSlot({
  stake: s,
  index,
  busy,
  open,
  onToggleInfo,
  onRecolher,
}: {
  stake: Stake
  index: number
  busy: boolean
  open: boolean
  onToggleInfo: () => void
  onRecolher: () => void
}) {
  const vaga = '0' + (index + 1)
  const removida = s.status === 'removida'
  const podeColetar = s.can_collect
  const mult = Number(s.multiplier)
  const b = badge(s.baseline_popularity)

  const statusDot = removida ? '#8a8175' : podeColetar ? colors.acc : '#e0a84a'
  const statusLabel = removida
    ? 'Removida do Spotify'
    : podeColetar
      ? 'Livre pra recolher'
      : `Segurando há ${s.days_held}d`

  const borderColor = removida
    ? 'rgba(236,227,210,0.08)'
    : podeColetar
      ? 'rgba(205,239,54,0.4)'
      : colors.line

  return (
    <View
      style={[
        styles.card,
        { borderColor, opacity: removida ? 0.6 : 1 },
        podeColetar && !removida && styles.cardHot,
      ]}
    >
      {/* CAPA */}
      <View style={styles.cover}>
        <CoverFill
          thumbnail={s.track_thumbnail}
          seed={s.artist_name + s.track_title}
        />
        {/* scrim topo p/ leitura do status */}
        <View style={styles.coverTopScrim} />
        <View style={styles.coverTopRow}>
          <View style={styles.statusWrap}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: statusDot },
                !removida && { shadowColor: statusDot },
              ]}
            />
            <Text
              style={[
                styles.statusLabel,
                removida && { color: 'rgba(236,227,210,0.6)' },
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.vagaTag}>VAGA {vaga}</Text>
        </View>
      </View>

      {/* CONTEÚDO */}
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {s.track_title}
          </Text>
          {!removida && s.last_day_gain > 0 && (
            <View style={styles.gainPill}>
              <Text style={styles.gainText}>+{fmt(s.last_day_gain)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.artistName} numberOfLines={1}>
          {s.artist_name}
        </Text>

        {/* AÇÃO */}
        <View style={styles.actionWrap}>
          {removida ? (
            <>
              <Button
                label={busy ? 'Esvaziando…' : 'Esvaziar vaga'}
                variant="ghost"
                loading={busy}
                onPress={onRecolher}
              />
              <Text style={styles.helper}>
                Faixa saiu do Spotify · não vale mais
              </Text>
            </>
          ) : podeColetar ? (
            <>
              <Button
                label={
                  busy
                    ? 'Recolhendo…'
                    : `Recolher · ${fmt(s.accumulated_points)} pts`
                }
                variant="acc"
                loading={busy}
                onPress={onRecolher}
              />
              <Text style={styles.helper}>
                Trava cumprida · recolha quando quiser
              </Text>
            </>
          ) : (
            <>
              <View style={styles.lockedBtn}>
                <Text style={styles.lockedBtnText}>
                  {s.accumulated_points > 0
                    ? `${fmt(s.accumulated_points)} pts acumulados`
                    : 'Acumulando pontos…'}
                </Text>
              </View>
              <View style={styles.lockedHelperRow}>
                <Text style={styles.helper}>
                  Libera em {s.days_to_collect}{' '}
                  {s.days_to_collect === 1 ? 'dia' : 'dias'}
                </Text>
                <Text style={styles.helperDivider}>·</Text>
                <Pressable onPress={onRecolher} disabled={busy} hitSlop={8}>
                  <Text style={styles.helperLink}>
                    {busy ? 'removendo…' : 'remover assim mesmo'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* TOGGLE INFOS */}
        <Pressable onPress={onToggleInfo} style={styles.infoToggle} hitSlop={6}>
          <Text style={styles.infoToggleText}>
            {open ? 'esconder infos' : 'ver infos do stake'}
          </Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={colors.text2}
          />
        </Pressable>

        {open && (
          <View style={styles.infoPanel}>
            <View style={styles.infoMultRow}>
              <View>
                <Text style={styles.infoLabel}>MULTIPLICADOR DO STAKE</Text>
                <Text style={styles.infoMult}>{formatMultiplier(mult)}</Text>
              </View>
              <View
                style={[
                  styles.rareBadge,
                  { borderColor: b.border, backgroundColor: b.bg },
                ]}
              >
                <Text style={[styles.rareBadgeText, { color: b.color }]}>
                  {b.text}
                </Text>
              </View>
            </View>

            <View>
              <View style={styles.popRow}>
                <Text style={styles.infoLabelSm}>
                  POPULARIDADE QUANDO DEU STAKE
                </Text>
                <Text style={styles.infoLabelSm}>agora {s.last_popularity}</Text>
              </View>
              <View style={styles.popTrack}>
                <View
                  style={[
                    styles.popFill,
                    { width: `${Math.min(100, s.baseline_popularity)}%` },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.infoFoot}>
              {fmt(s.pessoas_deram_stake)}{' '}
              {s.pessoas_deram_stake === 1
                ? 'pessoa deu stake'
                : 'pessoas deram stake'}{' '}
              · {fmt(s.accumulated_points)} pontos acumulados
              {!removida && s.last_day_gain > 0
                ? ` · +${fmt(s.last_day_gain)} na última medição`
                : ''}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

/* --------------------------------------------------------------------------
 * Modal: buscar faixa + conferir e dar stake
 * ------------------------------------------------------------------------ */
function StakeModal({
  slot,
  onClose,
  onPlaced,
  getValidToken,
  onError,
}: {
  slot: number | null
  onClose: () => void
  onPlaced: (title: string, multiplier: number) => void
  getValidToken: () => Promise<string | null>
  onError: (msg: string) => void
}) {
  const insets = useSafeAreaInsets()
  const open = slot != null

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchTrack[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchTrack | null>(null)
  const [previewMult, setPreviewMult] = useState<number | null>(null)
  const [previewPop, setPreviewPop] = useState<number | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [staking, setStaking] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reseta tudo quando abre/fecha.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setSelected(null)
      setPreviewMult(null)
      setPreviewPop(null)
    }
  }, [open])

  // Busca no Spotify (debounce 300ms, mínimo 2 chars).
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api.searchTracks(q, 12)
        setResults(data.tracks ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [query])

  const selectTrack = useCallback(
    async (t: SearchTrack) => {
      setSelected(t)
      setPreviewMult(null)
      setPreviewPop(null)
      setPreviewing(true)
      try {
        const token = await getValidToken()
        if (!token) return
        const data = await api.getStakePreview(
          { isrc: t.isrc, artist: t.artist, title: t.title },
          token
        )
        if (data.matched) {
          setPreviewMult(typeof data.multiplier === 'number' ? data.multiplier : null)
          setPreviewPop(typeof data.popularity === 'number' ? data.popularity : null)
        }
      } catch {
        // sem prévia: o multiplicador real é travado ao dar stake
      } finally {
        setPreviewing(false)
      }
    },
    [getValidToken]
  )

  const confirm = useCallback(async () => {
    if (!selected) return
    setStaking(true)
    try {
      const token = await getValidToken()
      if (!token) {
        onError('Sessão expirada. Entre de novo.')
        return
      }
      const data = await api.placeStake(
        {
          trackId: selected.id,
          trackUri: selected.uri,
          trackTitle: selected.title,
          artistName: selected.artist,
          albumName: selected.albumName ?? undefined,
          trackThumbnail: selected.cover ?? selected.thumbnail ?? undefined,
          isrc: selected.isrc ?? undefined,
        },
        token
      )
      onPlaced(selected.title, Number(data.stake.multiplier))
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Erro ao dar stake')
    } finally {
      setStaking(false)
    }
  }, [selected, getValidToken, onPlaced, onError])

  return (
    <Modal
      visible={open}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalKicker}>
              DAR STAKE NA VAGA {slot != null ? '0' + (slot + 1) : ''}
            </Text>
            <Text style={styles.modalTitle}>
              {selected ? 'Confira e dê stake' : 'Buscar faixa'}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.modalClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        {selected ? (
          <DetailView
            track={selected}
            previewMult={previewMult}
            previewPop={previewPop}
            previewing={previewing}
            staking={staking}
            onBack={() => {
              setSelected(null)
              setPreviewMult(null)
              setPreviewPop(null)
            }}
            onConfirm={confirm}
            bottomInset={insets.bottom}
          />
        ) : (
          <SearchView
            query={query}
            setQuery={setQuery}
            searching={searching}
            results={results}
            onSelect={selectTrack}
            bottomInset={insets.bottom}
          />
        )}
      </View>
    </Modal>
  )
}

/* ---- view de busca ---- */
function SearchView({
  query,
  setQuery,
  searching,
  results,
  onSelect,
  bottomInset,
}: {
  query: string
  setQuery: (s: string) => void
  searching: boolean
  results: SearchTrack[]
  onSelect: (t: SearchTrack) => void
  bottomInset: number
}) {
  const trimmed = query.trim()
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            autoFocus
            placeholder="Nome da faixa ou artista…"
            placeholderTextColor={colors.text3}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text3} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(t) => t.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item)}
            style={({ pressed }) => [styles.resultRow, pressed && { opacity: 0.6 }]}
          >
            <View style={styles.resultCover}>
              <CoverFill thumbnail={item.thumbnail} seed={item.artist + item.title} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.resultTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.resultArtist} numberOfLines={1}>
                {item.artist}
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.text3} />
          </Pressable>
        )}
        ListEmptyComponent={
          trimmed.length < 2 ? (
            <View style={styles.searchEmpty}>
              <View style={styles.searchEmptyIcon}>
                <Ionicons name="search" size={24} color={colors.acc} />
              </View>
              <Text style={styles.searchEmptyTitle}>
                Busque a faixa que vai bombar
              </Text>
              <Text style={styles.searchEmptySub}>
                Comece a digitar o nome. Você confere as infos dela antes de
                confirmar o stake.
              </Text>
            </View>
          ) : searching ? (
            <View style={styles.searchLoading}>
              <ActivityIndicator color={colors.acc} />
            </View>
          ) : (
            <View style={styles.searchLoading}>
              <Text style={styles.searchEmptySub}>
                Nenhuma faixa encontrada pra “{trimmed}”.
              </Text>
            </View>
          )
        }
      />
    </View>
  )
}

/* ---- view de detalhe / confirmação ---- */
function DetailView({
  track,
  previewMult,
  previewPop,
  previewing,
  staking,
  onBack,
  onConfirm,
  bottomInset,
}: {
  track: SearchTrack
  previewMult: number | null
  previewPop: number | null
  previewing: boolean
  staking: boolean
  onBack: () => void
  onConfirm: () => void
  bottomInset: number
}) {
  const pop = previewPop ?? 0
  const b = badge(pop)
  const multLabel = previewing
    ? '…'
    : previewMult != null
      ? formatMultiplier(previewMult)
      : '—'

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 22,
        paddingBottom: bottomInset + 28,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} hitSlop={8} style={styles.detailBack}>
        <Ionicons name="arrow-back" size={16} color={colors.text2} />
        <Text style={styles.detailBackText}>buscar outra</Text>
      </Pressable>

      <View style={styles.detailHero}>
        <View style={styles.detailCover}>
          <CoverFill
            thumbnail={track.cover ?? track.thumbnail}
            seed={track.artist + track.title}
          />
        </View>
        <Text style={styles.detailTitle} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.detailArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>MULTIPLICADOR</Text>
          <Text style={[styles.statValue, { color: b.multColor }]}>
            {multLabel}
          </Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statTopRow}>
            <Text style={styles.statLabel}>POPULARIDADE</Text>
            <Text style={styles.statPop}>{previewing ? '…' : pop}</Text>
          </View>
          <View style={styles.popTrack}>
            <View style={[styles.popFill, { width: `${Math.min(100, pop)}%` }]} />
          </View>
        </View>
      </View>

      <Text style={styles.detailNote}>
        O multiplicador trava no valor de agora e não muda mais. A partir de{' '}
        {MIN_DAYS} dias você pode recolher os pontos — antes disso dá pra remover,
        mas zera.
      </Text>

      <Button
        label={staking ? 'Dando stake…' : `Dar stake · ${multLabel}`}
        variant="acc"
        loading={staking}
        disabled={previewing}
        onPress={onConfirm}
        style={{ marginTop: 20 }}
      />
    </ScrollView>
  )
}

/* -------------------------------------------------------------------------- */
const MONO = 'monospace'

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // hero
  hero: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 6 },
  kicker: {
    color: colors.acc,
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: MONO,
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -3,
    lineHeight: 56,
  },
  lead: {
    color: colors.text2,
    fontSize: 15.5,
    lineHeight: 23,
    marginTop: 12,
  },
  leadStrong: { color: colors.text, fontWeight: '800' },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 18,
    gap: 10,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.acc },
  metaText: {
    color: colors.text2,
    fontSize: 10.5,
    letterSpacing: 1,
    fontFamily: MONO,
  },
  metaDivider: { color: colors.text3, fontSize: 10 },

  // estados
  center: { paddingVertical: 60, alignItems: 'center' },
  errorBox: {
    margin: 22,
    marginTop: 16,
    padding: 26,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    alignItems: 'center',
  },
  errorText: {
    color: colors.text2,
    fontSize: 14.5,
    lineHeight: 21,
    textAlign: 'center',
  },

  // slots
  slots: { paddingHorizontal: 22, paddingTop: 14, gap: 18 },

  // vaga livre
  empty: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(205,239,54,0.3)',
    backgroundColor: 'rgba(205,239,54,0.03)',
    paddingVertical: 34,
    paddingHorizontal: 26,
    alignItems: 'center',
    gap: 7,
  },
  emptyPlus: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: 'rgba(205,239,54,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyVaga: {
    color: colors.text3,
    fontSize: 11,
    letterSpacing: 1.5,
    fontFamily: MONO,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 23,
  },
  emptyCta: {
    marginTop: 12,
    backgroundColor: colors.acc,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyCtaText: { color: colors.onAcc, fontSize: 14, fontWeight: '700' },

  // card ocupado
  card: {
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardHot: {
    shadowColor: colors.acc,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  cover: { width: '100%', aspectRatio: 1, backgroundColor: colors.card },
  coverTopScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  coverTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 8,
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOpacity: 0.9,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
  },
  statusLabel: {
    color: '#f3ead6',
    fontSize: 13.5,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 4,
    flexShrink: 1,
  },
  vagaTag: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    letterSpacing: 1.6,
    fontFamily: MONO,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 4,
  },

  cardBody: { padding: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: -0.8,
    flexShrink: 1,
  },
  gainPill: {
    backgroundColor: colors.accSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gainText: { color: colors.acc, fontSize: 11, fontWeight: '700', fontFamily: MONO },
  artistName: {
    color: colors.text2,
    fontSize: 12.5,
    fontFamily: MONO,
    marginTop: 4,
  },

  actionWrap: { marginTop: 16 },
  helper: {
    color: colors.text3,
    fontSize: 11,
    fontFamily: MONO,
    textAlign: 'center',
    marginTop: 9,
  },
  helperDivider: { color: colors.text3, fontSize: 10, marginHorizontal: 6 },
  helperLink: {
    color: colors.text2,
    fontSize: 11,
    fontFamily: MONO,
    textDecorationLine: 'underline',
  },
  lockedHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  lockedBtn: {
    minHeight: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.fill1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBtnText: { color: colors.text2, fontSize: 14, fontWeight: '700' },

  infoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  infoToggleText: { color: colors.text2, fontSize: 12, fontFamily: MONO },

  infoPanel: { marginTop: 14, gap: 14 },
  infoMultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: colors.text3,
    fontSize: 9.5,
    letterSpacing: 1.4,
    fontFamily: MONO,
    marginBottom: 5,
  },
  infoLabelSm: { color: colors.text3, fontSize: 9.5, letterSpacing: 1, fontFamily: MONO },
  infoMult: {
    color: colors.acc,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.4,
  },
  rareBadge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  rareBadgeText: { fontSize: 9.5, fontWeight: '700', letterSpacing: 1, fontFamily: MONO },
  popRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  popTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(236,227,210,0.2)',
    overflow: 'hidden',
  },
  popFill: { height: '100%', borderRadius: 2, backgroundColor: 'rgba(236,227,210,0.9)' },
  infoFoot: { color: colors.text2, fontSize: 11.5, lineHeight: 17, fontFamily: MONO },

  // toast
  toast: {
    position: 'absolute',
    left: 22,
    right: 22,
    backgroundColor: colors.acc,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toastErr: { backgroundColor: colors.danger },
  toastText: { color: colors.onAcc, fontSize: 14, fontWeight: '700', textAlign: 'center' },

  // modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  modalKicker: {
    color: colors.acc,
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: MONO,
    marginBottom: 6,
  },
  modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // busca
  searchBarWrap: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 16, padding: 0 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  resultCover: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  resultTitle: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  resultArtist: { color: colors.text2, fontSize: 12.5, fontFamily: MONO, marginTop: 3 },
  searchEmpty: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 48 },
  searchEmptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: 'rgba(205,239,54,0.3)',
    backgroundColor: 'rgba(205,239,54,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  searchEmptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  searchEmptySub: {
    color: colors.text3,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
    fontFamily: MONO,
  },
  searchLoading: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 30 },

  // detalhe
  detailBack: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  detailBackText: { color: colors.text2, fontSize: 13, fontFamily: MONO },
  detailHero: { alignItems: 'center' },
  detailCover: {
    width: 230,
    height: 230,
    maxWidth: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 8,
  },
  detailTitle: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: 18,
  },
  detailArtist: { color: colors.text2, fontSize: 14, fontFamily: MONO, marginTop: 7 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  statTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { color: colors.text3, fontSize: 10, letterSpacing: 1.2, fontFamily: MONO },
  statValue: { fontSize: 22, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  statPop: { color: colors.text, fontSize: 13, fontWeight: '700', fontFamily: MONO },
  detailNote: {
    color: colors.text2,
    fontSize: 12.5,
    lineHeight: 20,
    fontFamily: MONO,
    marginTop: 16,
  },
})
