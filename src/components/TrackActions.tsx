import React, { useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

// Ações da faixa: reivindicar (com nota opcional) e compartilhar, mais a linha
// de status do claim. O claim em si é feito pelo TrackScreen (que detém o
// estado de claimed/position/total); aqui é a UI.
export default function TrackActions({
  claimed,
  position,
  total,
  loading,
  onClaim,
  onShare,
}: {
  claimed: boolean
  position: number | null
  total: number
  loading: boolean
  onClaim: (message: string) => void
  onShare: () => void
}) {
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')

  const submit = () => {
    if (loading || claimed) return
    onClaim(message.trim())
  }

  return (
    <View>
      <View style={styles.actionsRow}>
        <Pressable
          onPress={submit}
          disabled={loading || claimed}
          style={[styles.claimBtn, claimed ? styles.claimed : styles.unclaimed]}
        >
          {loading ? (
            <ActivityIndicator color={claimed ? colors.text2 : colors.onAcc} size="small" />
          ) : (
            <Ionicons
              name={claimed ? 'heart' : 'heart-outline'}
              size={17}
              color={claimed ? colors.text2 : colors.onAcc}
            />
          )}
          <Text style={[styles.claimText, claimed ? styles.claimedText : styles.unclaimedText]}>
            {claimed
              ? `Reivindicada${position ? ` · #${position}` : ''}`
              : 'Reivindicar'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setShowMessage((s) => !s)}
          disabled={claimed}
          style={[styles.iconBtn, claimed && { opacity: 0.5 }]}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.text2} />
        </Pressable>

        <Pressable onPress={onShare} style={styles.iconBtn}>
          <Ionicons name="share-outline" size={17} color={colors.text2} />
        </Pressable>
      </View>

      {showMessage && !claimed && (
        <View style={styles.msgBox}>
          <View style={styles.msgHead}>
            <Text style={styles.msgTitle}>Deixe uma nota ao reivindicar (opcional)</Text>
            <Pressable onPress={() => setShowMessage(false)}>
              <Ionicons name="close" size={16} color={colors.text3} />
            </Pressable>
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            maxLength={280}
            multiline
            placeholder="Por que essa faixa importa pra você…"
            placeholderTextColor={colors.text3}
            style={styles.msgInput}
          />
          <View style={styles.msgFoot}>
            <Text style={styles.counter}>{message.length}/280</Text>
            <Pressable onPress={submit} disabled={loading} style={styles.msgSubmit}>
              {loading ? (
                <ActivityIndicator color={colors.onAcc} size="small" />
              ) : (
                <Ionicons name="send" size={14} color={colors.onAcc} />
              )}
              <Text style={styles.msgSubmitText}>Reivindicar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.statusRow}>
        <View style={styles.dot} />
        {claimed ? (
          <Text style={styles.statusText}>
            Você é o{' '}
            <Text style={styles.statusStrong}>{position ? `${position}º` : `${total}º`}</Text> a
            reivindicar · entrou pra história dessa faixa
          </Text>
        ) : (
          <Text style={styles.statusText}>
            <Text style={styles.statusStrong}>{total}</Text>
            {total === 1 ? ' já reivindicou' : ' já reivindicaram'} · seja o{' '}
            <Text style={styles.statusStrong}>{total + 1}º</Text> antes de virar mainstream
          </Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 22 },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  unclaimed: { backgroundColor: colors.acc },
  claimed: { borderWidth: 1, borderColor: colors.line2, backgroundColor: 'transparent' },
  claimText: { fontSize: 14, fontWeight: '700' },
  unclaimedText: { color: colors.onAcc },
  claimedText: { color: colors.text2 },
  iconBtn: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 11,
    padding: 12,
  },
  msgBox: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 12,
  },
  msgHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  msgTitle: { color: colors.text, fontSize: 12.5, fontWeight: '600', flex: 1 },
  msgInput: {
    minHeight: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  msgFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  counter: { color: colors.text3, fontSize: 10.5 },
  msgSubmit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.acc,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  msgSubmitText: { color: colors.onAcc, fontSize: 12.5, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 22 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.acc,
    marginTop: 6,
  },
  statusText: { color: colors.text2, fontSize: 13.5, lineHeight: 20, flex: 1 },
  statusStrong: { color: colors.text, fontWeight: '700' },
})
