import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

// Selo de descoberta: cartão lima com a "façanha" do usuário. No front há uma
// geração de PNG (OG image) para postar no story; no mobile, o botão dispara o
// compartilhamento nativo (texto + link da faixa), tratado pelo TrackScreen.
export default function TrackSelo({
  claimed,
  position,
  trackTitle,
  artistName,
  year,
  isLoggedIn,
  onShare,
}: {
  claimed: boolean
  position: number | null
  trackTitle: string
  artistName: string
  year: number | null
  isLoggedIn: boolean
  onShare: () => void
}) {
  const isFirst = position === 1
  const bigLabel = isFirst ? '1º HIPSTER' : position ? `#${position}` : '✦'
  const kicker = isFirst ? 'primeiro a cravar' : 'no acervo'

  return (
    <View style={styles.card}>
      <View style={styles.kickerRow}>
        <Ionicons name="sparkles" size={14} color={colors.onAcc} />
        <Text style={styles.kicker}>SELO DE DESCOBERTA</Text>
      </View>

      <View style={[styles.preview, claimed ? styles.previewClaimed : styles.previewLocked]}>
        {claimed ? (
          <>
            <Text style={styles.previewKicker}>{kicker}</Text>
            <Text style={styles.bigLabel}>{bigLabel}</Text>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {trackTitle}
            </Text>
            <Text style={styles.previewArtist} numberOfLines={1}>
              {artistName}
              {year ? ` · cravado ${year}` : ''}
            </Text>
          </>
        ) : (
          <View style={styles.lockWrap}>
            <Ionicons name="lock-closed" size={24} color={colors.onAcc} style={{ opacity: 0.65 }} />
            <Text style={[styles.bigLabel, { opacity: 0.65 }]}>?</Text>
          </View>
        )}
      </View>

      {claimed ? (
        <>
          <Pressable style={styles.genBtn} onPress={onShare}>
            <Ionicons name="share-social" size={16} color={colors.acc} />
            <Text style={styles.genText}>Compartilhar façanha</Text>
          </Pressable>
          <Text style={styles.foot}>mostre que você ouviu antes</Text>
        </>
      ) : (
        <Text style={styles.prompt}>
          {isLoggedIn
            ? 'Reivindique essa faixa pra desbloquear seu selo de descoberta.'
            : 'Entre e crave essa faixa pra ganhar seu selo de descoberta.'}
        </Text>
      )}
    </View>
  )
}

const overInk = (o: number) => `rgba(22,18,12,${o})`

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.acc,
    paddingHorizontal: 20,
    paddingVertical: 18,
    overflow: 'hidden',
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: overInk(0.7), fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  preview: {
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  previewClaimed: { borderColor: overInk(0.3), borderStyle: 'solid' },
  previewLocked: { borderColor: overInk(0.25), borderStyle: 'dashed' },
  previewKicker: {
    color: overInk(0.55),
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  bigLabel: {
    color: colors.onAcc,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  previewTitle: { color: colors.onAcc, fontSize: 13.5, fontWeight: '700', marginTop: 10 },
  previewArtist: { color: overInk(0.55), fontSize: 10.5, marginTop: 2 },
  lockWrap: { alignItems: 'center', paddingVertical: 8 },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: colors.onAcc,
    paddingVertical: 13,
  },
  genText: { color: colors.acc, fontSize: 13.5, fontWeight: '700' },
  foot: { color: overInk(0.55), fontSize: 10, textAlign: 'center', marginTop: 8 },
  prompt: {
    color: colors.onAcc,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 14,
  },
})
