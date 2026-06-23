import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import * as api from '../api/client'
import type { RecentClaim } from '../api/types'
import Cover from '../components/Cover'
import MirsuiLogo from '../components/MirsuiLogo'
import { Button, Pill } from '../components/ui'
import { timeAgo } from '../lib/time'
import { colors } from '../theme'

export default function LandingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const onLogin = () => router.push('/login')
  const onSignup = () => router.push('/signup')
  const [claims, setClaims] = useState<RecentClaim[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .getRecentClaims(6)
      .then((res) => active && setClaims(res.claims || []))
      .catch(() => {})
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  return (
    <View style={styles.root}>
      {/* Nav fixa */}
      <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
        <View style={styles.logoRow}>
          <MirsuiLogo size={26} />
          <Text style={styles.logoText}>mirsui</Text>
        </View>
        <View style={styles.navBtns}>
          <Button label="Entrar" variant="light" onPress={onLogin} style={styles.navBtn} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={styles.hero}>
          <Pill accent>● A cena, ao vivo</Pill>
          <Text style={styles.heroTitle}>
            mir? sui<Text style={{ color: colors.acc }}>.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Você vai entender <Text style={styles.italic}>daqui 6 meses</Text>.
          </Text>
          <Text style={styles.heroBody}>
            Cave som antes de todo mundo. Carimba, e fica registrado que a
            descoberta foi sua.
          </Text>

          <View style={styles.ctaCol}>
            <Button label="Criar conta grátis  →" onPress={onSignup} />
            <Button label="Já tenho conta" variant="light" onPress={onLogin} />
          </View>
          <Text style={styles.fine}>
            ARQUIVO MUSICAL CURATORIAL · Nº 047 · 12 JANELAS ABERTAS
          </Text>
        </View>

        {/* SUBINDO NA CENA */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Pill accent>● Subindo na cena</Pill>
            <Text style={styles.sectionTitle}>O que tá sendo carimbado agora.</Text>
            <Text style={styles.sectionSub}>
              Ainda dá tempo de salvar antes de virar tendência.
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.acc} style={{ marginTop: 24 }} />
          ) : claims.length === 0 ? (
            <Text style={styles.empty}>A cena está em silêncio por enquanto.</Text>
          ) : (
            <View style={styles.list}>
              {claims.map((c, i) => (
                <View key={c.id} style={styles.claimRow}>
                  <Text style={styles.rank}>
                    #{String(i + 1).padStart(2, '0')}
                  </Text>
                  <Cover
                    seed={c.artist_name}
                    thumbnail={c.track_thumbnail}
                    size={56}
                    radius={9}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.claimTitle} numberOfLines={1}>
                      {c.track_title}
                    </Text>
                    <Text style={styles.claimArtist} numberOfLines={1}>
                      {c.artist_name}
                    </Text>
                  </View>
                  <Text style={styles.ago}>{timeAgo(c.claimedat)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* MANIFESTO */}
        <View style={styles.manifesto}>
          <Text style={styles.manifestoText}>
            O algoritmo te entrega o que já bombou. O Mirsui guarda o que você
            ouviu <Text style={styles.italic}>antes</Text>.
          </Text>
          <Text style={styles.sig}>Mirsui — acervo de quem ouve primeiro</Text>
        </View>

        {/* CTA FINAL */}
        <View style={styles.endCta}>
          <Text style={styles.endTitle}>Entra e começa a cavar.</Text>
          <Text style={styles.endBody}>
            Som novo todo dia. Carimba o que você curtir e monta o histórico de
            quem ouviu antes.
          </Text>
          <Button label="Criar conta grátis  →" onPress={onSignup} style={{ marginTop: 18 }} />
          <Text style={styles.fine}>Grátis · sem cartão · sem algoritmo</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.bg,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  navBtns: { flexDirection: 'row', gap: 8 },
  navBtn: { minHeight: 40, paddingHorizontal: 18 },

  hero: { paddingHorizontal: 22, paddingTop: 36, gap: 14 },
  heroTitle: {
    color: colors.text,
    fontSize: 58,
    fontWeight: '800',
    letterSpacing: -3,
    lineHeight: 60,
  },
  heroSub: { color: colors.text, fontSize: 20, fontWeight: '600' },
  italic: { fontStyle: 'italic', color: colors.acc },
  heroBody: { color: colors.text2, fontSize: 16, lineHeight: 24, maxWidth: 420 },
  ctaCol: { gap: 10, marginTop: 10 },
  fine: {
    color: colors.text3,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 14,
    textTransform: 'uppercase',
  },

  section: { paddingHorizontal: 22, paddingTop: 48 },
  sectionHead: { gap: 10 },
  sectionTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 32,
  },
  sectionSub: { color: colors.text2, fontSize: 15, lineHeight: 22 },
  empty: { color: colors.text3, marginTop: 20, fontSize: 14 },

  list: { marginTop: 22, gap: 14 },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { color: colors.text3, fontSize: 12, fontWeight: '700', width: 26 },
  claimTitle: { color: colors.text, fontSize: 15.5, fontWeight: '700' },
  claimArtist: { color: colors.text2, fontSize: 13, marginTop: 2 },
  ago: { color: colors.text3, fontSize: 11 },

  manifesto: {
    marginTop: 56,
    marginHorizontal: 22,
    paddingVertical: 36,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  manifestoText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  sig: { color: colors.text3, fontSize: 13, marginTop: 16, fontStyle: 'italic' },

  endCta: { paddingHorizontal: 22, paddingTop: 48, alignItems: 'flex-start' },
  endTitle: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  endBody: { color: colors.text2, fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 420 },
})
