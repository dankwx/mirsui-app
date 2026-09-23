import React, { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { landingQuery } from '../api/queries'
import type { AchadoDaCena, FaixaDaParede, PessoaDaCena } from '../api/types'
import Cover from '../components/Cover'
import MirsuiLogo from '../components/MirsuiLogo'
import { Button } from '../components/ui'
import { recadoValido } from '../lib/recado'
import { diaMes } from '../lib/time'
import { colors, initials, tone } from '../theme'

/**
 * A primeira tela, deslogada.
 *
 * Segue a home do site, que abandonou o esqueleto de folheto (manchete, prova,
 * como funciona, vitrine, manifesto, botão) e passou a ser o produto
 * destrancado: o que enche a página é o acervo de verdade e a gente de
 * verdade. A referência lá é a home deslogada do Letterboxd, e o que dá
 * sensação de lugar inteiro é volume de conteúdo e presença de pessoas, não
 * qualidade de argumento.
 *
 * O que mudou na travessia para o telefone:
 *
 * - As fileiras horizontais por gênero da home saíram. Cada uma precisa de uma
 *   linha de título com contagem mais capas roláveis, e oito delas empilhadas
 *   numa tela de 390dp viram meia hora de rolagem. O que restou do acervo é a
 *   parede do topo e uma fileira só, com o número do catálogo junto.
 * - O número de faixas sob medição saiu de baixo dos botões e virou seção. No
 *   site ele cabe na dobra; aqui empurrava os botões para fora dela.
 * - Nada aqui é tocável de propósito. A ficha da faixa e o feed moram atrás da
 *   guarda de sessão (app/_layout.tsx), então um toque numa capa não teria
 *   para onde ir. As capas são a vitrine, e a porta é o botão.
 */

const COLUNAS_DA_PAREDE = 6
const LINHAS_DA_PAREDE = 8
const TILES = COLUNAS_DA_PAREDE * LINHAS_DA_PAREDE

export default function LandingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const onLogin = () => router.push('/login')
  const onSignup = () => router.push('/signup')

  const q = useQuery(landingQuery())
  const dados = q.data

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Hero
          parede={dados?.parede}
          insets={insets}
          onLogin={onLogin}
          onSignup={onSignup}
        />

        {q.isError ? (
          <SemSinal onRetry={() => q.refetch()} tentando={q.isFetching} />
        ) : (
          <>
            <Cena achados={dados?.achados} carregando={q.isLoading} />
            <Pessoas pessoas={dados?.pessoas} />
            <Acervo parede={dados?.parede} catalogo={dados?.catalogo} />
          </>
        )}

        <Fechamento onSignup={onSignup} />
      </ScrollView>
    </View>
  )
}

/* ------------------------------- Topo --------------------------------- */

/**
 * A parede de capas.
 *
 * O fundo do topo é o acervo de verdade: dezenas de capas do Observatório em
 * mosaico. Antes era uma fotografia, bonita e genérica, que serviria para
 * qualquer app de música. Capa de disco só serve para um.
 *
 * Sem dados ainda, as mesmas células aparecem no tom de fallback: a forma da
 * tela nasce certa e as capas preenchem por cima, em vez de a página pular de
 * um spinner para um mosaico.
 */
function Mosaico({ faixas }: { faixas?: FaixaDaParede[] }) {
  // Fileiras de células `flex: 1` com `aspectRatio: 1`, e não uma conta com a
  // largura da janela: a primeira versão dividia `useWindowDimensions().width`
  // por seis e sobrava uma tira do fundo à direita, porque a largura da janela
  // não é a largura de quem desenha (barra de rolagem na web, área segura no
  // aparelho). Assim o mosaico encosta na borda por construção.
  const linhas = useMemo(
    () =>
      Array.from({ length: LINHAS_DA_PAREDE }, (_, l) =>
        Array.from(
          { length: COLUNAS_DA_PAREDE },
          (_, c) => faixas?.[l * COLUNAS_DA_PAREDE + c] ?? null
        )
      ),
    [faixas]
  )

  return (
    <View style={styles.mosaico} pointerEvents="none">
      {linhas.map((linha, l) => (
        <View key={l} style={styles.mosaicoLinha}>
          {linha.map((f, c) => (
            <View
              key={c}
              style={[styles.tile, { backgroundColor: tone(f?.artist || `vazio-${l}-${c}`) }]}
            >
              {f?.cover && (
                <Image
                  source={{ uri: f.cover }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={220}
                />
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

/**
 * O véu que segura a legibilidade do texto sem apagar o mosaico.
 *
 * Transparente em cima, sólido embaixo: as capas ficam à vista na faixa da
 * logo e o texto pousa em fundo cheio. A primeira tentativa cobria tudo com
 * uma opacidade só, e as capas simplesmente sumiam, o que anula o motivo de
 * elas existirem.
 *
 * `expo-linear-gradient` porque o React Native não tem gradiente nativo e
 * empilhar Views semitransparentes deixa degraus visíveis. A primeira tentativa
 * usou react-native-svg, que já estava instalado, e não desenhava nada na web:
 * um `<Rect width="100%">` dentro de um `<Svg>` sem dimensão explícita não tem
 * de quem herdar a porcentagem, então saía um retângulo de tamanho zero e o
 * mosaico ficava em brilho cheio embaixo da manchete.
 */
function Veu() {
  return (
    <LinearGradient
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      // Escuro na faixa da nav, aberto no meio, sólido embaixo. Sem o primeiro
      // degrau a logo e o "Entrar" pousavam direto em cima de capa clara e
      // sumiam; com opacidade única, o mosaico inteiro sumia junto.
      colors={[
        'rgba(22,18,12,0.78)',
        'rgba(22,18,12,0.30)',
        'rgba(22,18,12,0.80)',
        'rgba(22,18,12,0.97)',
        'rgba(22,18,12,1)',
      ]}
      locations={[0, 0.16, 0.45, 0.62, 0.78]}
    />
  )
}

function Hero({
  parede,
  insets,
  onLogin,
  onSignup,
}: {
  parede?: FaixaDaParede[]
  insets: EdgeInsets
  onLogin: () => void
  onSignup: () => void
}) {
  return (
    <View style={styles.hero}>
      <Mosaico faixas={parede} />
      <Veu />

      <View style={[styles.nav, { paddingTop: insets.top + 12 }]}>
        <View style={styles.logoRow}>
          <MirsuiLogo size={26} />
          <Text style={styles.logoText}>mirsui</Text>
        </View>
        <Pressable
          onPress={onLogin}
          style={({ pressed }) => [styles.navEntrar, pressed && { opacity: 0.7 }]}
          hitSlop={8}
        >
          <Text style={styles.navEntrarText}>Entrar</Text>
        </Pressable>
      </View>

      {/* A janela onde o mosaico aparece limpo, antes do texto pousar nele. */}
      <View style={styles.heroJanela} />

      <View style={styles.heroTexto}>
        <Text style={styles.h1}>Fica registrado que foi você.</Text>
        <Text style={styles.lede}>
          Salve uma faixa antes dela estourar. A ordem em que você chegou fica
          gravada, e ninguém tira de você.
        </Text>
        <View style={styles.heroBotoes}>
          <Button label="Criar conta grátis" variant="paper" onPress={onSignup} />
          <Button label="Já tenho conta" variant="ghost" onPress={onLogin} />
        </View>
      </View>
    </View>
  )
}

/* ---------------------------- O que salvaram --------------------------- */

function Avatar({
  url,
  nome,
  size = 26,
}: {
  url: string | null
  nome: string
  size?: number
}) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={[styles.avatarIni, { fontSize: size * 0.4 }]}>
          {(nome || 'U').charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  )
}

function Achado({ item }: { item: AchadoDaCena }) {
  const quem = item.display_name || item.username || 'alguém'
  const recado = recadoValido(item.claim_message)

  return (
    <View style={styles.achado}>
      <Cover
        seed={item.artist_name}
        thumbnail={item.track_thumbnail}
        size={64}
        radius={6}
      />

      <View style={styles.achadoCorpo}>
        <Text style={styles.achadoTitulo} numberOfLines={1}>
          {item.track_title}
        </Text>
        <Text style={styles.achadoArtista} numberOfLines={1}>
          {item.artist_name}
        </Text>

        <View style={styles.achadoMeta}>
          <Avatar url={item.avatar_url} nome={quem} />
          <Text style={styles.achadoQuem} numberOfLines={1}>
            {quem}
          </Text>
          <Text style={styles.achadoOrdem}>
            {/* Lima só no primeiro lugar, igual ao resto do app: é ali que
                "você chegou cedo" quer dizer alguma coisa. */}
            <Text style={item.position === 1 ? styles.primeiro : styles.ordem}>
              {item.position}ª
            </Text>
            {' a salvar · '}
            {diaMes(item.claimedat)}
          </Text>
        </View>

        {recado && <Text style={styles.recado}>{recado}</Text>}
      </View>
    </View>
  )
}

function Cena({
  achados,
  carregando,
}: {
  achados?: AchadoDaCena[]
  carregando: boolean
}) {
  if (!carregando && (!achados || achados.length === 0)) return null

  return (
    <View style={styles.secao}>
      <Text style={styles.h2}>O que a cena salvou.</Text>
      <View style={styles.lista}>
        {achados
          ? achados.slice(0, 6).map((item) => <Achado key={item.id} item={item} />)
          : // Esqueleto com a forma final da linha, não um spinner: a tela não
            // muda de layout quando os dados chegam.
            Array.from({ length: 4 }, (_, i) => (
              <View key={i} style={styles.achado}>
                <View style={styles.esqueletoCapa} />
                <View style={styles.achadoCorpo}>
                  <View style={[styles.esqueletoLinha, { width: '62%' }]} />
                  <View style={[styles.esqueletoLinha, { width: '38%', marginTop: 8 }]} />
                  <View style={[styles.esqueletoLinha, { width: '50%', marginTop: 14 }]} />
                </View>
              </View>
            ))}
      </View>
    </View>
  )
}

/* ------------------------------ Pessoas -------------------------------- */

function Pessoas({ pessoas }: { pessoas?: PessoaDaCena[] }) {
  if (!pessoas || pessoas.length === 0) return null

  return (
    <View style={styles.secaoLarga}>
      {/* Rótulo em vez de manchete: esta é a coluna lateral da home do site, e
          ela não disputa atenção com "O que a cena salvou". */}
      <Text style={[styles.rotulo, styles.secaoPad]}>Quem está aqui</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pessoasFileira}
      >
        {pessoas.map((p) => (
          <View key={p.username} style={styles.pessoa}>
            <Avatar url={p.avatar_url} nome={p.display_name || p.username} size={44} />
            <Text style={styles.pessoaNome} numberOfLines={1}>
              {p.display_name || p.username}
            </Text>
            <Text style={styles.pessoaNumero} numberOfLines={1}>
              {p.faixas} no acervo
            </Text>
            {p.primeiros > 0 && (
              <Text style={[styles.pessoaNumero, styles.primeiro]} numberOfLines={1}>
                {p.primeiros} em 1º
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      <Text style={[styles.notaDeRodape, styles.secaoPad]}>
        A cena está começando agora. É exatamente por isso que dá pra chegar em
        primeiro.
      </Text>
    </View>
  )
}

/* ------------------------------- Acervo -------------------------------- */

function Acervo({
  parede,
  catalogo,
}: {
  parede?: FaixaDaParede[]
  catalogo?: number
}) {
  // Outra fatia da mesma parede: se fossem as primeiras capas, a fileira
  // repetiria exatamente o que já está no topo da tela.
  const faixas = parede?.slice(TILES, TILES + 14) ?? []
  if (faixas.length === 0) return null

  return (
    <View style={styles.secaoLarga}>
      <View style={styles.secaoPad}>
        <Text style={styles.h2}>O acervo que a gente mede.</Text>
        {!!catalogo && (
          <Text style={styles.acervoNumero}>
            {catalogo.toLocaleString('pt-BR')} faixas sob medição diária. O
            histórico começa agora.
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.acervoFileira}
      >
        {faixas.map((f, i) => (
          <View key={`${f.isrc ?? f.title}-${i}`} style={styles.acervoItem}>
            <View style={[styles.acervoCapa, { backgroundColor: tone(f.artist) }]}>
              {f.cover ? (
                <Image
                  source={{ uri: f.cover }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={180}
                />
              ) : (
                <Text style={styles.acervoIni}>{initials(f.artist)}</Text>
              )}
            </View>
            <Text style={styles.acervoTitulo} numberOfLines={1}>
              {f.title}
            </Text>
            <Text style={styles.acervoArtista} numberOfLines={1}>
              {f.artist}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

/* ----------------------------- Fechamento ------------------------------ */

function Fechamento({ onSignup }: { onSignup: () => void }) {
  return (
    <View style={styles.fechamento}>
      {/* A primeira frase é o que a gente não é, então recua. A segunda é a
          promessa, e fica em contraste cheio. */}
      <Text style={styles.manifestoFraco}>
        O algoritmo te entrega o que já bombou.
      </Text>
      <Text style={styles.manifestoForte}>
        O Mirsui guarda o que você ouviu antes.
      </Text>
      <Button
        label="Criar conta grátis"
        variant="paper"
        onPress={onSignup}
        style={{ marginTop: 30, alignSelf: 'flex-start', paddingHorizontal: 30 }}
      />
      <Text style={styles.rodapeFino}>Grátis, sem cartão, sem algoritmo</Text>
    </View>
  )
}

/**
 * A cena não carregou.
 *
 * Separado de "não veio nada" de propósito: uma falha de rede caindo no estado
 * vazio faria a tela afirmar que a cena está parada, que é uma coisa que a
 * gente não sabe. O topo continua de pé porque a landing precisa converter
 * mesmo quando a listagem falha.
 */
function SemSinal({ onRetry, tentando }: { onRetry: () => void; tentando: boolean }) {
  return (
    <View style={[styles.secao, styles.semSinal]}>
      <Text style={styles.semSinalTitulo}>Não deu pra carregar a cena</Text>
      <Text style={styles.semSinalCorpo}>
        O problema é do nosso lado, não seu. Nada foi perdido: os achados
        continuam salvos.
      </Text>
      <Button
        label={tentando ? 'Tentando' : 'Tentar de novo'}
        variant="ghost"
        loading={tentando}
        onPress={onRetry}
        style={{ marginTop: 18, alignSelf: 'flex-start' }}
      />
    </View>
  )
}

/* -------------------------------- Estilo -------------------------------- */

const PAD = 22

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  hero: { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: colors.line },
  mosaico: { ...StyleSheet.absoluteFillObject },
  mosaicoLinha: { flexDirection: 'row' },
  tile: { flex: 1, aspectRatio: 1 },

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAD,
    paddingBottom: 10,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoText: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.8 },
  navEntrar: {
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  navEntrarText: { color: colors.text, fontSize: 13.5, fontWeight: '600' },

  heroJanela: { height: 132 },
  heroTexto: { paddingHorizontal: PAD, paddingBottom: 36 },
  h1: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 43,
  },
  lede: {
    color: colors.text2,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 420,
  },
  heroBotoes: { gap: 10, marginTop: 26 },

  secao: { paddingHorizontal: PAD, paddingTop: 44 },
  // Seções com fileira rolável: o padding é por dentro, para as capas poderem
  // encostar na borda da tela e sinalizarem que tem mais coisa fora dela.
  secaoLarga: { paddingTop: 44 },
  secaoPad: { paddingHorizontal: PAD },

  h2: {
    color: colors.text,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 30,
  },
  rotulo: {
    color: colors.text3,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  lista: { marginTop: 20, gap: 10 },
  achado: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  achadoCorpo: { flex: 1, minWidth: 0 },
  achadoTitulo: {
    color: colors.text,
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  achadoArtista: { color: colors.text3, fontSize: 13, marginTop: 2 },
  achadoMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  achadoQuem: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  achadoOrdem: { color: colors.text3, fontSize: 11.5 },
  ordem: { color: colors.text2, fontWeight: '700' },
  primeiro: { color: colors.acc, fontWeight: '700' },
  recado: {
    color: colors.text2,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    marginTop: 12,
    paddingLeft: 11,
    // Laranja: alguém escreveu isto com a própria mão. É a camada humana, a
    // mesma de seguir e de recado.
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(232,115,74,0.5)',
  },

  avatar: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  avatarIni: { color: colors.text2, fontWeight: '800' },

  pessoasFileira: { paddingHorizontal: PAD, paddingTop: 16, gap: 10 },
  pessoa: {
    width: 148,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    gap: 1,
  },
  pessoaNome: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 6 },
  pessoaNumero: { color: colors.text3, fontSize: 11.5, lineHeight: 16 },
  notaDeRodape: {
    color: colors.text3,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 16,
    maxWidth: 380,
  },

  acervoNumero: { color: colors.text2, fontSize: 14, lineHeight: 21, marginTop: 12 },
  acervoFileira: { paddingHorizontal: PAD, paddingTop: 18, gap: 12 },
  acervoItem: { width: 116 },
  acervoCapa: {
    width: 116,
    height: 116,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  acervoIni: {
    color: 'rgba(236,227,210,0.15)',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1,
  },
  acervoTitulo: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 8 },
  acervoArtista: { color: colors.text3, fontSize: 12, marginTop: 2 },

  esqueletoCapa: { width: 64, height: 64, borderRadius: 6, backgroundColor: colors.fill2 },
  esqueletoLinha: { height: 11, borderRadius: 4, backgroundColor: colors.fill2 },

  semSinal: {
    marginHorizontal: PAD,
    marginTop: 44,
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line2,
    borderStyle: 'dashed',
  },
  semSinalTitulo: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.4 },
  semSinalCorpo: { color: colors.text2, fontSize: 14, lineHeight: 21, marginTop: 8 },

  fechamento: { paddingHorizontal: PAD, paddingTop: 76, paddingBottom: 30 },
  manifestoFraco: {
    color: colors.text3,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.8,
    lineHeight: 36,
  },
  manifestoForte: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.8,
    lineHeight: 36,
    marginTop: 10,
  },
  rodapeFino: {
    color: colors.text3,
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 16,
    textTransform: 'uppercase',
  },
})
