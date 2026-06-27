import React, { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { StakeSnapshot } from '../api/types'
import * as api from '../api/client'
import { formatMultiplier } from '../lib/stake'
import { colors } from '../theme'

// Gráfico de evolução da popularidade de um stake (série diária do Deezer).
// Espelha o StakeChartModal do front (Next.js): a série vem junto do GET /stakes
// (abre instantâneo); se não vier, busca em /stakes/:id/snapshots como fallback.

const ACC = colors.acc
const MUTED = 'rgba(236,227,210,0.22)'
const MONO = 'monospace'

const fmtInt = (n: number) => Math.round(n).toLocaleString('pt-BR')

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(d)
}

export default function StakeChartModal({
  stakeId,
  title,
  artist,
  baseline,
  current,
  multiplier,
  accumulatedPoints,
  initialSnapshots,
  getValidToken,
  onClose,
}: {
  stakeId: string
  title: string
  artist: string
  baseline: number
  current: number
  multiplier: number
  accumulatedPoints: number
  // série já carregada (vem do GET /stakes). Se vier, abre instantâneo;
  // se for undefined, o modal busca sozinho (fallback).
  initialSnapshots?: StakeSnapshot[]
  getValidToken: () => Promise<string | null>
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const [snaps, setSnaps] = useState<StakeSnapshot[] | null>(
    initialSnapshots ?? null
  )
  const [error, setError] = useState(false)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  useEffect(() => {
    // já temos a série (veio do GET /stakes): nada a buscar, abre instantâneo
    if (initialSnapshots !== undefined) return

    let alive = true
    setSnaps(null)
    setError(false)
    ;(async () => {
      try {
        const token = await getValidToken()
        if (!token) throw new Error('no token')
        const data = await api.getStakeSnapshots(stakeId, token)
        if (alive) setSnaps(data.snapshots ?? [])
      } catch {
        if (alive) setError(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [stakeId, initialSnapshots, getValidToken])

  // domínio do eixo Y com auto-zoom (estilo Apple Health): aperta na faixa real
  // dos dados pra mostrar movimento, mas com rótulos honestos 0–100.
  const scale = useMemo(() => {
    const vals = (snaps ?? [])
      .map((s) => s.popularity)
      .concat(baseline, current)
    const lo = Math.min(...vals)
    const hi = Math.max(...vals)
    const span = hi - lo
    const pad = Math.max(2, span * 0.25)
    const yMin = Math.max(0, Math.floor(lo - pad))
    const yMax = Math.min(100, Math.ceil(hi + pad))
    const range = Math.max(1, yMax - yMin)
    return { yMin, yMax, range }
  }, [snaps, baseline, current])

  const yPct = (v: number) => ((v - scale.yMin) / scale.range) * 100

  // dia em foco: tap, ou o último por padrão
  const resolvedFocus =
    focusIdx != null
      ? focusIdx
      : snaps && snaps.length > 0
        ? snaps.length - 1
        : null
  const focus =
    resolvedFocus != null && snaps ? snaps[resolvedFocus] : null

  const delta = Math.round(current) - Math.round(baseline)
  const deltaColor =
    delta > 0 ? ACC : delta < 0 ? '#d98359' : 'rgba(236,227,210,0.6)'

  return (
    <Modal
      visible
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.kicker}>EVOLUÇÃO DA POPULARIDADE</Text>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.close} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: 22,
            paddingBottom: insets.bottom + 28,
          }}
        >
          {/* readout do dia em foco */}
          <View style={styles.readout}>
            <View>
              <Text style={styles.readoutLabel}>
                {focus ? fmtDate(focus.date).toUpperCase() : 'POPULARIDADE'}
              </Text>
              <View style={styles.readoutValueRow}>
                <Text style={styles.readoutValue}>
                  {focus ? Math.round(focus.popularity) : Math.round(current)}
                </Text>
                <Text style={styles.readoutMax}>/ 100</Text>
              </View>
            </View>
            {focus && focus.pointsGain > 0 ? (
              <View style={styles.gainPill}>
                <Text style={styles.gainPillText}>
                  +{fmtInt(focus.pointsGain)} pts nesse dia
                </Text>
              </View>
            ) : (
              <Text style={styles.readoutHint}>
                {focus && resolvedFocus === 0
                  ? 'dia do stake'
                  : 'sem ganho nesse dia'}
              </Text>
            )}
          </View>

          {/* chart */}
          {error ? (
            <View style={styles.chartState}>
              <Text style={styles.chartStateText}>
                Não foi possível carregar o histórico.
              </Text>
            </View>
          ) : snaps == null ? (
            <View style={styles.chartState}>
              <ActivityIndicator color={colors.acc} />
            </View>
          ) : snaps.length === 0 ? (
            <View style={styles.chartState}>
              <Text style={styles.chartStateText}>Sem medições ainda.</Text>
            </View>
          ) : (
            <Chart
              snaps={snaps}
              baseline={baseline}
              yPct={yPct}
              yMin={scale.yMin}
              yMax={scale.yMax}
              focusIdx={resolvedFocus}
              onFocus={setFocusIdx}
            />
          )}

          {/* legenda */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: ACC }]} />
              <Text style={styles.legendText}>rendeu pontos</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: MUTED }]} />
              <Text style={styles.legendText}>sem ganho</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendDash} />
              <Text style={styles.legendText}>
                seu stake ({Math.round(baseline)})
              </Text>
            </View>
          </View>

          {/* rodapé */}
          <View style={styles.footer}>
            <Text style={[styles.footerStrong, { color: deltaColor }]}>
              {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} {Math.round(baseline)} →{' '}
              {Math.round(current)}
            </Text>
            <Text style={styles.footerDivider}>·</Text>
            <Text style={styles.footerText}>
              multiplicador {formatMultiplier(Number(multiplier))}
            </Text>
            <Text style={styles.footerDivider}>·</Text>
            <Text style={styles.footerText}>
              {fmtInt(accumulatedPoints)} pts acumulados
            </Text>
          </View>

          {snaps && snaps.length === 1 && (
            <Text style={styles.note}>
              Medimos 1× por dia — volte amanhã pra ver a faixa começar a
              desenhar a curva.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

function Chart({
  snaps,
  baseline,
  yPct,
  yMin,
  yMax,
  focusIdx,
  onFocus,
}: {
  snaps: StakeSnapshot[]
  baseline: number
  yPct: (v: number) => number
  yMin: number
  yMax: number
  focusIdx: number | null
  onFocus: (i: number | null) => void
}) {
  const baseY = yPct(baseline)
  return (
    <View style={styles.chartRow}>
      {/* eixo Y */}
      <View style={styles.yAxis}>
        <Text style={styles.axisText}>{yMax}</Text>
        <Text style={styles.axisText}>{Math.round((yMax + yMin) / 2)}</Text>
        <Text style={styles.axisText}>{yMin}</Text>
      </View>

      {/* plot */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.plot}>
          {/* linha de baseline (onde você deu stake) */}
          <View style={[styles.baselineLine, { bottom: `${baseY}%` }]} />

          {/* barras */}
          <View style={styles.bars}>
            {snaps.map((s, i) => {
              const h = Math.max(2, yPct(s.popularity))
              const earned = s.pointsGain > 0
              const active = focusIdx === i
              return (
                <Pressable
                  key={i}
                  onPress={() => onFocus(i)}
                  style={styles.barTouch}
                >
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${h}%`,
                        backgroundColor: earned ? ACC : MUTED,
                        opacity: active ? 1 : 0.55,
                      },
                    ]}
                  />
                </Pressable>
              )
            })}
          </View>
        </View>

        {/* eixo X: primeira e última data */}
        <View style={styles.xAxis}>
          <Text style={styles.axisText}>{fmtDate(snaps[0].date)}</Text>
          {snaps.length > 1 && (
            <Text style={styles.axisText}>
              {fmtDate(snaps[snaps.length - 1].date)}
            </Text>
          )}
        </View>
      </View>
    </View>
  )
}

const CHART_H = 200

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  kicker: {
    color: colors.acc,
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: MONO,
    marginBottom: 6,
  },
  title: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: -1 },
  artist: { color: colors.text2, fontSize: 12, fontFamily: MONO, marginTop: 3 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // readout
  readout: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 20,
  },
  readoutLabel: {
    color: colors.text2,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: MONO,
  },
  readoutValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 4 },
  readoutValue: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1.6,
    lineHeight: 40,
  },
  readoutMax: { color: colors.text2, fontSize: 12, fontFamily: MONO, marginBottom: 4 },
  readoutHint: { color: colors.text3, fontSize: 11, fontFamily: MONO },
  gainPill: {
    backgroundColor: colors.accSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gainPillText: { color: colors.acc, fontSize: 12, fontWeight: '700', fontFamily: MONO },

  // chart
  chartState: {
    height: CHART_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartStateText: {
    color: colors.text2,
    fontSize: 12,
    fontFamily: MONO,
    textAlign: 'center',
  },
  chartRow: { flexDirection: 'row', gap: 12 },
  yAxis: {
    height: CHART_H,
    width: 28,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 2,
  },
  axisText: { color: colors.text3, fontSize: 9, fontFamily: MONO },
  plot: { height: CHART_H, position: 'relative' },
  baselineLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(236,227,210,0.4)',
  },
  bars: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  barTouch: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // legenda
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  legendDash: {
    width: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(236,227,210,0.5)',
  },
  legendText: { color: colors.text2, fontSize: 10.5, fontFamily: MONO },

  // rodapé
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  footerStrong: { fontSize: 11, fontFamily: MONO, fontWeight: '700' },
  footerText: { color: colors.text2, fontSize: 11, fontFamily: MONO },
  footerDivider: { color: colors.text3, fontSize: 10 },
  note: {
    color: colors.text3,
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: MONO,
    marginTop: 14,
  },
})
