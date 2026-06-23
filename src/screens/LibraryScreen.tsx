import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../theme'

// Placeholder preparado para receber o acervo do usuário quando o backend
// expuser o endpoint (ex.: faixas salvas / reivindicadas pelo usuário logado).
export default function LibraryScreen() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SEU ACERVO</Text>
        <Text style={styles.title}>Biblioteca</Text>
        <Text style={styles.sub}>Tudo que você carimbou e salvou, num lugar só.</Text>
      </View>

      <View style={styles.empty}>
        <View style={styles.iconWrap}>
          <Ionicons name="bookmark-outline" size={28} color={colors.acc} />
        </View>
        <Text style={styles.emptyTitle}>Em breve</Text>
        <Text style={styles.emptyText}>
          Aqui vão aparecer as faixas que você salvou e reivindicou. A tela já
          está pronta — falta só conectar o endpoint do acervo no backend.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingTop: 24, gap: 8 },
  kicker: { color: colors.text3, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { color: colors.text, fontSize: 32, fontWeight: '800', letterSpacing: -1.4 },
  sub: { color: colors.text2, fontSize: 15, lineHeight: 22 },
  empty: {
    margin: 22,
    marginTop: 32,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    alignItems: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyText: {
    color: colors.text3,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
})
