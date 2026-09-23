import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { setStatusBarStyle } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { landingQuery } from '../api/queries'
import type { AchadoDaCena, GeneroDoAcervo, PessoaDaCena } from '../api/types'
import ClubIcon from '../components/club/ClubIcon'
import MirsuiMarca from '../components/club/MirsuiMarca'
import { clubFonts as F, useClubTheme, useReduceMotion, type ClubColors } from '../club'
import { recadoValido } from '../lib/recado'
import { diaMes } from '../lib/time'

/**
 * A primeira tela, deslogada — a home aprovada do site levada para o telefone.
 *
 * Referência: mirsui-web/app/(public)/page.tsx e components/Landing/*, com as
 * regras de celular de Club.module.css (até 767px e até 380px). A ordem é a
 * mesma: abertura com as capas inclinadas, "Saia do repeat." com os gêneros do
 * acervo, "Como funciona" com a demonstração do registro, a cena com gente
 * real, o fechamento com a ilustração e o rodapé com a assinatura da marca.
 *
 * O que muda na travessia:
 *
 * - No site, capa, perfil, pilha e feed são páginas abertas. No app elas moram
 *   atrás da guarda de sessão (app/_layout.tsx), então os toques que lá abrem
 *   essas páginas aqui levam ao cadastro — é a porta que existe.
 * - O modal de entrar/cadastrar do site vira as telas /login e /signup.
 * - Hover não existe: a capa que se endireita no hover se endireita no toque,
 *   e a sombra laranja do botão aparece enquanto ele está pressionado.
 * - Os dados vêm de GET /landing, e não do render do servidor. A "Seleção da
 *   casa" é local e aparece sem rede; os gêneros e a cena chegam depois.
 */

/** Curadoria editorial, não ranking nem atividade fictícia. A mesma do site. */
const SELECAO_DA_CASA = [
  { title: 'Sina', artist: 'Djavan', isrc: 'BRSME8200048', cover: require('../../assets/landing/record-4.webp'), small: require('../../assets/landing/record-4-small.webp') },
  { title: 'Requinte', artist: 'Luedji Luna', isrc: 'BCLJG2500029', cover: require('../../assets/landing/record-2.webp'), small: require('../../assets/landing/record-2-small.webp') },
  { title: 'POTE DE OURO', artist: 'Liniker', isrc: 'BK20B2400011', cover: require('../../assets/landing/record-1.webp'), small: require('../../assets/landing/record-1-small.webp') },
  { title: 'Azul, Bebê', artist: 'Rubel', isrc: 'QM7282555789', cover: require('../../assets/landing/record-3.webp'), small: require('../../assets/landing/record-3-small.webp') },
  { title: 'Ain’t I a Woman?', artist: 'Luedji Luna', isrc: 'BCLJG2000003', cover: require('../../assets/landing/record-6.webp'), small: require('../../assets/landing/record-6-small.webp') },
  { title: 'Medo Bobo', artist: 'Rubel', isrc: 'BXRUS1900001', cover: require('../../assets/landing/record-5.webp'), small: require('../../assets/landing/record-5-small.webp') },
]

const ANGULOS = [-12, 7, -6, 9, -8, 11]
const DESLOCAMENTOS = [35, 0, 20, 0, 12, 38]

const SELECAO = 'Seleção da casa'

/** Os nomes do Deezer encurtados como no site. */
function rotuloDoGenero(nome: string) {
  if (nome === 'Rap/Funk Brasileiro') return 'Rap & funk'
  if (nome === 'Samba/Pagode') return 'Samba'
  if (nome === 'Rap/Hip Hop') return 'Hip hop'
  return nome
}

const SITE = 'https://mirsui.com'
const PAD = 20

export default function LandingScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const { dark, c, alternar } = useClubTheme()
  const reduzir = useReduceMotion()
  const s = useMemo(() => criarEstilos(c), [c])

  const q = useQuery(landingQuery())

  // Status bar legível no tema claro; as outras telas continuam escuras.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(dark ? 'light' : 'dark')
      return () => setStatusBarStyle('light')
    }, [dark])
  )

  const entrar = () => router.push('/login')
  const cadastrar = () => router.push('/signup')

  // Âncoras: "Explorar os sons" e o "A cena" do rodapé rolam até a seção.
  const rolagem = useRef<ScrollView>(null)
  const ancoras = useRef<Record<string, number>>({})
  const marcar = (nome: string) => (e: { nativeEvent: { layout: { y: number } } }) => {
    ancoras.current[nome] = e.nativeEvent.layout.y
  }
  const irPara = (nome: string) =>
    rolagem.current?.scrollTo({ y: Math.max((ancoras.current[nome] ?? 0) - 12, 0), animated: !reduzir })

  const ctx: Ctx = { c, s, width, reduzir, cadastrar }

  return (
    <View style={s.root}>
      <ScrollView ref={rolagem} showsVerticalScrollIndicator={false}>
        <Abertura
          ctx={ctx}
          dark={dark}
          topo={insets.top}
          onTema={alternar}
          onEntrar={entrar}
          onExplorar={() => irPara('acervo')}
        />

        <View onLayout={marcar('acervo')}>
          <Acervo ctx={ctx} generos={q.data?.generos ?? []} />
        </View>

        <ComoFunciona ctx={ctx} />

        <View onLayout={marcar('cena')}>
          <Cena
            ctx={ctx}
            achados={q.data?.achados}
            pessoas={q.data?.pessoas ?? []}
            carregando={q.isLoading}
            falhou={q.isError}
            tentando={q.isFetching}
            onRetry={() => q.refetch()}
          />
        </View>

        <Fechamento ctx={ctx} dark={dark} />

        <Rodape
          ctx={ctx}
          base={insets.bottom}
          onCena={() => irPara('cena')}
          onTopo={() => rolagem.current?.scrollTo({ y: 0, animated: !reduzir })}
        />
      </ScrollView>
    </View>
  )
}

type Estilos = ReturnType<typeof criarEstilos>
interface Ctx {
  c: ClubColors
  s: Estilos
  width: number
  reduzir: boolean
  cadastrar: () => void
}

/* ------------------------------ Peças soltas ----------------------------- */

/**
 * O botão principal do club: neutro de alto contraste, raio pequeno. No site o
 * hover sobe 2px e revela uma sombra sólida laranja de 5px; aqui é o toque.
 */
function Botao({
  ctx,
  label,
  onPress,
  style,
  innerStyle,
  textStyle,
  iconSize = 18,
}: {
  ctx: Ctx
  label: string
  onPress: () => void
  style?: StyleProp<ViewStyle>
  /** padding e intervalo do botão; o site muda os dois por contexto */
  innerStyle?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  iconSize?: number
}) {
  const { s, c } = ctx
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={[s.botaoCasca, style]}>
      {({ pressed }) => (
        <>
          {pressed && <View style={s.botaoSombra} />}
          <View style={[s.botao, innerStyle, pressed && { transform: [{ translateY: -2 }] }]}>
            <Text style={[s.botaoTexto, textStyle]}>{label}</Text>
            <ClubIcon name="arrow-up-right" size={iconSize} color={c.onButton} />
          </View>
        </>
      )}
    </Pressable>
  )
}

/** Link secundário: texto com seta pequena, sublinhado enquanto pressionado. */
function LinkDeTexto({
  ctx,
  label,
  onPress,
  icone = 'arrow-up-right',
  iconSize = 17,
  style,
}: {
  ctx: Ctx
  label: string
  onPress: () => void
  icone?: 'arrow-up-right' | 'arrow-down'
  iconSize?: number
  style?: StyleProp<ViewStyle>
}) {
  const { s, c } = ctx
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={6} style={[s.textLink, style]}>
      {({ pressed }) => (
        <>
          <Text style={[s.textLinkTexto, pressed && s.sublinhado]}>{label}</Text>
          <ClubIcon name={icone} size={iconSize} color={c.text} />
        </>
      )}
    </Pressable>
  )
}

/** Capa com dimensões reservadas e fallback — o RecordCover do site. */
function Capa({
  ctx,
  src,
  alt,
}: {
  ctx: Ctx
  src: string | number | null
  alt: string
}) {
  const { s, c } = ctx
  const [falhou, setFalhou] = useState(false)
  useEffect(() => setFalhou(false), [src])

  return (
    <View style={s.capa} accessible accessibilityRole="image" accessibilityLabel={alt}>
      {src != null && !falhou ? (
        <Image
          source={typeof src === 'string' ? { uri: src } : src}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          onError={() => setFalhou(true)}
        />
      ) : (
        <View style={s.capaFallback}>
          <ClubIcon name="disc-3" size={42} strokeWidth={1} color={c.muted} />
        </View>
      )}
    </View>
  )
}

/** Avatar redondo com a inicial quando a foto falta ou quebra. */
function Avatar({
  ctx,
  url,
  nome,
  size = 29,
  style,
}: {
  ctx: Ctx
  url: string | null
  nome: string
  size?: number
  style?: StyleProp<ViewStyle>
}) {
  const { s } = ctx
  const [falhou, setFalhou] = useState(false)
  useEffect(() => setFalhou(false), [url])

  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
      {url && !falhou ? (
        <Image
          source={{ uri: url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={() => setFalhou(true)}
        />
      ) : (
        <Text style={s.avatarInicial}>{(nome || 'U').charAt(0).toUpperCase()}</Text>
      )}
    </View>
  )
}

/** Título de seção: Archivo 700, tracking apertado. */
function Cabecalho({ ctx, titulo, apoio }: { ctx: Ctx; titulo: string; apoio: string }) {
  const { s } = ctx
  return (
    <View>
      <Text style={s.h2} accessibilityRole="header">
        {titulo}
      </Text>
      <Text style={s.h2Apoio}>{apoio}</Text>
    </View>
  )
}

/* -------------------------------- Abertura ------------------------------- */

function Abertura({
  ctx,
  dark,
  topo,
  onTema,
  onEntrar,
  onExplorar,
}: {
  ctx: Ctx
  dark: boolean
  topo: number
  onTema: () => void
  onEntrar: () => void
  onExplorar: () => void
}) {
  const { s, c, width, cadastrar } = ctx
  const estreito = width <= 380

  // A manchete segue o clamp do site: 7,55vw entre 34 e 57px, e 7,6vw até 380.
  const h1 = estreito ? width * 0.076 : Math.min(Math.max(width * 0.0755, 34), 57)

  return (
    <View>
      <View style={[s.container, { paddingTop: topo }]}>
        <View style={s.nav}>
          <View style={s.wordmark} accessible accessibilityLabel="Mirsui">
            <MirsuiMarca size={22} ink={c.text} acc={c.accent} />
            <Text style={s.wordmarkTexto}>mirsui</Text>
          </View>
          <View style={s.navAcoes}>
            <Pressable
              onPress={onTema}
              accessibilityRole="button"
              accessibilityLabel={dark ? 'Usar tema claro' : 'Usar tema escuro'}
              hitSlop={8}
              style={({ pressed }) => [s.tema, pressed && { backgroundColor: c.surface }]}
            >
              <ClubIcon name={dark ? 'sun' : 'moon'} size={18} color={c.text} />
            </Pressable>
            <Pressable onPress={onEntrar} accessibilityRole="button" hitSlop={8}>
              {({ pressed }) => (
                <Text style={[s.entrar, pressed && { color: c.accentText }]}>Entrar</Text>
              )}
            </Pressable>
            {!estreito && (
              <Botao
                ctx={ctx}
                label="Fazer parte"
                onPress={cadastrar}
                iconSize={15}
                innerStyle={s.navCadastro}
                textStyle={s.navCadastroTexto}
              />
            )}
          </View>
        </View>

        <View style={s.heroTexto}>
          <Text style={s.eyebrow}>Seu ouvido chega antes.</Text>
          <Text
            style={[s.h1, { fontSize: h1, lineHeight: h1 * 1.045, letterSpacing: -0.063 * h1 }]}
            accessibilityRole="header"
          >
            Você ouviu primeiro.{'\n'}
            <Text style={{ color: c.accent }}>O mundo vem depois.</Text>
          </Text>
          <Text style={s.heroDescricao}>
            Descubra música, registre seus achados e encontre gente que também
            escuta fora do óbvio.
          </Text>
          <View style={[s.heroAcoes, estreito && s.heroAcoesEstreito]}>
            <Botao
              ctx={ctx}
              label="Criar meu acervo grátis"
              onPress={cadastrar}
              innerStyle={s.heroBotao}
              textStyle={s.heroBotaoTexto}
            />
            <LinkDeTexto
              ctx={ctx}
              label="Explorar os sons"
              icone="arrow-down"
              iconSize={16}
              onPress={onExplorar}
            />
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={155 + 12}
        contentContainerStyle={s.prateleira}
        accessibilityLabel="Uma seleção para começar a descobrir"
      >
        {SELECAO_DA_CASA.map((r, i) => (
          <DiscoInclinado key={r.isrc} ctx={ctx} disco={r} indice={i} />
        ))}
      </ScrollView>
    </View>
  )
}

/**
 * Uma capa da abertura: entra subindo, em sequência, e se endireita no toque —
 * o hover/foco do site. Com movimento reduzido, fica parada e inclinada.
 */
function DiscoInclinado({
  ctx,
  disco,
  indice,
}: {
  ctx: Ctx
  disco: (typeof SELECAO_DA_CASA)[number]
  indice: number
}) {
  const { s, c, reduzir, cadastrar } = ctx
  const entrada = useRef(new Animated.Value(reduzir ? 1 : 0)).current
  const toque = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (reduzir) {
      entrada.setValue(1)
      return
    }
    Animated.timing(entrada, {
      toValue: 1,
      duration: 900,
      delay: 100 + indice * 55,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start()
  }, [entrada, indice, reduzir])

  const endireitar = (para: 0 | 1) => {
    if (reduzir) return
    Animated.timing(toque, {
      toValue: para,
      duration: 450,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: true,
    }).start()
  }

  const angulo = ANGULOS[indice]
  const deslocamento = DESLOCAMENTOS[indice]

  return (
    <Pressable
      onPress={cadastrar}
      onPressIn={() => endireitar(1)}
      onPressOut={() => endireitar(0)}
      accessibilityRole="link"
      accessibilityLabel={`${disco.title}, de ${disco.artist}. Ver faixa`}
      accessibilityHint="Abre o cadastro"
    >
      <Animated.View
        style={[
          s.disco,
          {
            opacity: entrada,
            transform: [
              { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) },
              { translateY: toque.interpolate({ inputRange: [0, 1], outputRange: [deslocamento, -12] }) },
              { rotate: toque.interpolate({ inputRange: [0, 1], outputRange: [`${angulo}deg`, '0deg'] }) },
            ],
          },
        ]}
      >
        <View style={s.manga}>
          <Image source={disco.cover} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* O brilho na lombada da capa — o ::after inset do site. */}
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.2)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0)']}
            locations={[0, 0.02, 0.06]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <View style={s.discoLegenda}>
          <Text style={s.discoLegendaTexto}>{disco.artist}</Text>
          <ClubIcon name="arrow-up-right" size={13} color={c.text} />
        </View>
      </Animated.View>
    </Pressable>
  )
}

/* --------------------------------- Acervo -------------------------------- */

function Acervo({ ctx, generos }: { ctx: Ctx; generos: GeneroDoAcervo[] }) {
  const { s, c, width, reduzir, cadastrar } = ctx
  const [ativo, setAtivo] = useState(SELECAO)
  const escolhido = generos.find((g) => g.nome === ativo)

  const capas = escolhido
    ? escolhido.faixas.map((f) => ({ key: `${f.isrc}-${f.titulo}`, title: f.titulo, artist: f.artista, src: f.capa as string | number | null }))
    : SELECAO_DA_CASA.map((r) => ({ key: r.isrc, title: r.title, artist: r.artist, src: r.small as string | number | null }))

  // O grid entra de novo a cada troca de filtro, como o `key={active}` do site.
  const entrada = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (reduzir) return
    entrada.setValue(0)
    Animated.timing(entrada, {
      toValue: 1,
      duration: 300,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start()
  }, [ativo, entrada, reduzir])

  // Três colunas: 14px entre elas, dentro das margens de 20px.
  const coluna = (width - PAD * 2 - 14 * 2) / 3

  return (
    <View style={[s.container, s.secaoAcervo]}>
      <View style={s.divisoria} />
      <Cabecalho
        ctx={ctx}
        titulo="Saia do repeat."
        apoio="Seu próximo favorito pode estar onde você ainda não procurou."
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filtros}
        contentContainerStyle={s.filtrosFileira}
        accessibilityLabel="Filtrar músicas por gênero"
      >
        {[SELECAO, ...generos.map((g) => g.nome)].map((nome) => {
          const on = ativo === nome
          return (
            <Pressable
              key={nome}
              onPress={() => setAtivo(nome)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[s.filtro, on && { borderBottomColor: c.text }]}
            >
              <Text style={[s.filtroTexto, on && { color: c.text }]}>{rotuloDoGenero(nome)}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Animated.View
        style={[
          s.grade,
          {
            opacity: entrada,
            transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`Músicas: ${ativo}`}
      >
        {capas.map((r) => (
          <Pressable
            key={r.key}
            onPress={cadastrar}
            accessibilityRole="link"
            accessibilityHint="Abre o cadastro"
            style={({ pressed }) => [{ width: coluna }, pressed && { opacity: 0.75 }]}
          >
            <Capa ctx={ctx} src={r.src} alt={`Capa de ${r.title}, de ${r.artist}`} />
            <Text style={s.albumTitulo} numberOfLines={1}>
              {r.title}
            </Text>
            <Text style={s.albumArtista} numberOfLines={1}>
              {r.artist}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      <View style={s.rodapeDaSecao}>
        <Text style={s.acervoNota}>
          {escolhido
            ? `${escolhido.total.toLocaleString('pt-BR')} faixas de ${escolhido.nome} no acervo.`
            : 'Sons brasileiros, ouvidos bem abertos.'}
        </Text>
        <LinkDeTexto ctx={ctx} label="Revirar a pilha" onPress={cadastrar} />
      </View>
    </View>
  )
}

/* ------------------------------ Como funciona ---------------------------- */

const PASSOS = [
  ['01', 'Achou um som? Salva.', 'Busque uma faixa e registre a descoberta.'],
  ['02', 'O momento fica.', 'Sua posição e a data ficam no registro.'],
  ['03', 'O acervo é a sua cara.', 'Compartilhe seus achados e acompanhe os de outras pessoas.'],
] as const

function ComoFunciona({ ctx }: { ctx: Ctx }) {
  const { s, c, width, reduzir, cadastrar } = ctx
  const [salvo, setSalvo] = useState(false)

  // O registro gira de 3° para -1° quando o exemplo é salvo.
  const giro = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(giro, {
      toValue: salvo ? 1 : 0,
      duration: reduzir ? 0 : 450,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start()
  }, [giro, salvo, reduzir])

  const h2 = Math.min(Math.max(width * 0.085, 38), 55)
  const recibo = Math.min((width - PAD * 2) * 0.91, 360)

  return (
    <View style={s.como}>
      <View style={s.container}>
        <Text style={s.eyebrow}>Bom gosto deixa rastro.</Text>
        <Text
          style={[s.comoH2, { fontSize: h2, lineHeight: h2 * 1.05, letterSpacing: -0.057 * h2 }]}
          accessibilityRole="header"
        >
          O famoso{'\n'}“eu já ouvia”.{'\n'}
          <Text style={{ color: c.accentText }}>Agora, com prova.</Text>
        </Text>
        <Text style={s.comoTexto}>
          Tem uma música que ninguém conhece ainda?{'\n'}Dê a ela um lugar no seu acervo.
        </Text>

        <View style={s.passos}>
          {PASSOS.map(([n, titulo, texto]) => (
            <View key={n} style={s.passo}>
              <Text style={s.passoNumero}>{n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.passoTitulo}>{titulo}</Text>
                <Text style={s.passoTexto}>{texto}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.palco}>
          <Animated.View
            style={[
              s.recibo,
              {
                width: recibo,
                transform: [
                  { rotate: giro.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '-1deg'] }) },
                ],
              },
            ]}
          >
            <View style={s.reciboTopo}>
              <ClubIcon name="disc-3" size={21} color={c.text} />
              <Text style={s.reciboRotulo}>REGISTRO DE DESCOBERTA</Text>
              <Text style={s.reciboMarca}>m.</Text>
            </View>
            <Image
              source={require('../../assets/landing/record-1.webp')}
              style={s.reciboCapa}
              contentFit="cover"
              accessibilityLabel="Capa do álbum Caju, de Liniker"
            />
            <View style={s.reciboFaixa}>
              <Text style={s.reciboTitulo}>Pote de ouro</Text>
              <Text style={s.reciboArtista}>Liniker · Caju</Text>
            </View>

            {/* Tracejado em View própria: borda tracejada de um lado só não
                aparece no iOS. */}
            <View style={s.tracejadoCasca}>
              <View style={s.tracejado} />
            </View>
            <View style={s.reciboResultado} accessibilityLiveRegion="polite">
              <Text style={s.reciboPosicao}>{salvo ? '1º' : '→'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.reciboForte}>
                  {salvo ? 'Você chegou primeiro.' : 'Todo achado começa aqui.'}
                </Text>
                <Text style={s.reciboApoio}>
                  {salvo ? 'Seu nome faz parte dessa história.' : 'Experimente salvar esta música.'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setSalvo(!salvo)}
              accessibilityRole="button"
              style={({ pressed }) => [s.demoBotao, pressed && { transform: [{ translateY: -2 }] }]}
            >
              <ClubIcon name={salvo ? 'rotate-ccw' : 'plus'} size={salvo ? 16 : 18} color={c.onButton} />
              <Text style={s.demoBotaoTexto}>
                {salvo ? 'Experimentar de novo' : 'Registrar descoberta'}
              </Text>
            </Pressable>
            <View style={s.demoNota}>
              {salvo && <ClubIcon name="check" size={12} color={c.muted} />}
              <Text style={s.demoNotaTexto}>
                {salvo
                  ? 'Exemplo salvo nesta demonstração'
                  : 'Demonstração · nenhum registro real é criado'}
              </Text>
            </View>
          </Animated.View>

          <LinkDeTexto ctx={ctx} label="Agora, criar meu acervo" onPress={cadastrar} />
        </View>
      </View>
    </View>
  )
}

/* ---------------------------------- Cena --------------------------------- */

function Cena({
  ctx,
  achados,
  pessoas,
  carregando,
  falhou,
  tentando,
  onRetry,
}: {
  ctx: Ctx
  achados?: AchadoDaCena[]
  pessoas: PessoaDaCena[]
  carregando: boolean
  falhou: boolean
  tentando: boolean
  onRetry: () => void
}) {
  const { s, width, cadastrar } = ctx
  const estreito = width <= 380
  const colGap = estreito ? 14 : 20
  const coluna = (width - PAD * 2 - colGap) / 2

  let corpo: React.ReactNode
  if (falhou && !achados) {
    // Separado de "não veio nada": uma falha de rede no estado vazio faria a
    // tela afirmar que a cena está parada, e isso a gente não sabe.
    corpo = (
      <View style={s.semSinal}>
        <Text style={s.semSinalTitulo}>Não deu pra carregar a cena.</Text>
        <Text style={s.semSinalTexto}>
          O problema é do nosso lado, não seu. Os achados continuam salvos.
        </Text>
        <LinkDeTexto
          ctx={ctx}
          label={tentando ? 'Tentando…' : 'Tentar de novo'}
          onPress={onRetry}
        />
      </View>
    )
  } else if (carregando || !achados) {
    // Esqueleto com a forma final, para a tela não pular quando os dados chegam.
    corpo = (
      <View style={[s.gradeCena, { columnGap: colGap, rowGap: estreito ? 20 : 26 }]}>
        {Array.from({ length: 4 }, (_, i) => (
          <View key={i} style={[s.achado, { width: coluna }]}>
            <View style={s.pessoaLinha}>
              <View style={[s.avatar, s.esqueleto, { width: 29, height: 29, borderRadius: 15 }]} />
              <View style={[s.esqueleto, { height: 10, width: '55%', borderRadius: 3 }]} />
            </View>
            <View style={[s.capa, s.esqueleto, { marginTop: 17 }]} />
            <View style={[s.esqueleto, { height: 11, width: '80%', marginTop: 12, borderRadius: 3 }]} />
            <View style={[s.esqueleto, { height: 10, width: '50%', marginTop: 8, borderRadius: 3 }]} />
          </View>
        ))}
      </View>
    )
  } else if (achados.length === 0) {
    corpo = (
      <Text style={s.cenaVazia}>
        A cena está começando. Seu próximo achado pode abrir essa conversa.
      </Text>
    )
  } else {
    corpo = (
      <View style={[s.gradeCena, { columnGap: colGap, rowGap: estreito ? 20 : 26 }]}>
        {achados.slice(0, 4).map((item) => {
          const nome = item.display_name || item.username || 'Alguém da cena'
          const recado = recadoValido(item.claim_message)
          return (
            <View key={item.id} style={[s.achado, { width: coluna }]}>
              <View style={s.pessoaLinha}>
                <Avatar ctx={ctx} url={item.avatar_url} nome={nome} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Pressable
                    onPress={cadastrar}
                    disabled={!item.username}
                    accessibilityRole={item.username ? 'link' : undefined}
                  >
                    {({ pressed }) => (
                      <Text style={[s.pessoaNome, pressed && s.sublinhado]} numberOfLines={1}>
                        {nome}
                      </Text>
                    )}
                  </Pressable>
                  <Text style={s.pessoaQuando}>salvou em {diaMes(item.claimedat)}</Text>
                </View>
              </View>

              <Pressable onPress={cadastrar} accessibilityRole="link" style={s.achadoFaixa}>
                {({ pressed }) => (
                  <>
                    <Capa ctx={ctx} src={item.track_thumbnail} alt={`Capa de ${item.track_title}`} />
                    <View style={s.achadoTexto}>
                      <Text style={[s.achadoTitulo, pressed && s.sublinhado]} numberOfLines={2}>
                        {item.track_title}
                      </Text>
                      <Text style={s.achadoArtista} numberOfLines={1}>
                        {item.artist_name}
                      </Text>
                      <Text style={s.posicao}>{item.position}º a descobrir</Text>
                    </View>
                  </>
                )}
              </Pressable>

              {recado && (
                <Text style={s.recado} numberOfLines={3}>
                  “{recado}”
                </Text>
              )}
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={[s.container, s.secaoCena]}>
      <Cabecalho
        ctx={ctx}
        titulo="Música boa circula."
        apoio="Por trás de cada achado, alguém que deu o play antes."
      />
      {corpo}

      <View style={[s.rodapeDaSecao, { marginTop: 25 }]}>
        <View style={s.comunidade}>
          {pessoas.length > 0 && (
            <View style={s.pilhaDeAvatares}>
              {pessoas.slice(0, 4).map((p) => (
                <Pressable
                  key={p.username}
                  onPress={cadastrar}
                  accessibilityRole="link"
                  accessibilityLabel={`Ver acervo de ${p.nome}`}
                >
                  <Avatar ctx={ctx} url={p.avatar} nome={p.nome} style={s.avatarEmpilhado} />
                </Pressable>
              ))}
            </View>
          )}
          <Text style={s.comunidadeTexto}>A cena é pequena. O repertório, não.</Text>
        </View>
        <LinkDeTexto ctx={ctx} label="Ver todos os achados" onPress={cadastrar} />
      </View>
    </View>
  )
}

/* ------------------------------- Fechamento ------------------------------ */

function Fechamento({ ctx, dark }: { ctx: Ctx; dark: boolean }) {
  const { s, width, cadastrar } = ctx
  const h2 = Math.min(Math.max(width * 0.087, 35), 50)
  const ilustracao = Math.min(width - PAD * 2, 380)

  return (
    <View style={s.fechamento}>
      <View style={s.container}>
        {/* No escuro, a ilustração ganha a placa clara, como no site: ela é
            impressão em duas cores sobre papel e não se inverte. */}
        <View style={[s.ilustracao, { width: ilustracao }, dark && s.ilustracaoPlaca]}>
          <Image
            source={require('../../assets/landing/digging-records.webp')}
            style={{ width: '100%', aspectRatio: 960 / 640 }}
            contentFit="contain"
            accessibilityLabel="Ilustração de uma mão garimpando um disco de vinil entre capas"
          />
        </View>

        <Text
          style={[s.h2, { fontSize: h2, lineHeight: h2 * 1.07, letterSpacing: -0.055 * h2 }]}
          accessibilityRole="header"
        >
          Ainda bem que{'\n'}você chegou cedo.
        </Text>
        <Text style={s.fechamentoTexto}>
          O próximo som que vai marcar sua vida{'\n'}ainda está por aí. Vamos encontrar?
        </Text>
        <Botao
          ctx={ctx}
          label="Fazer parte do Mirsui"
          onPress={cadastrar}
          style={{ marginTop: 26 }}
          textStyle={{ fontSize: 13 }}
        />
        <Text style={s.fechamentoNota}>Seu acervo é grátis. Seu gosto é seu.</Text>
      </View>
    </View>
  )
}

/* --------------------------------- Rodapé -------------------------------- */

function Rodape({
  ctx,
  base,
  onCena,
  onTopo,
}: {
  ctx: Ctx
  base: number
  onCena: () => void
  onTopo: () => void
}) {
  const { s, c, width } = ctx
  const marca = width * 0.25

  const linkDoRodape = (label: string, onPress: () => void, seta = false) => (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={s.rodapeLink}>
      {({ pressed }) => (
        <>
          <Text style={[s.rodapeLinkTexto, pressed && s.sublinhado]}>{label}</Text>
          {seta && <ClubIcon name="arrow-up-right" size={13} color={c.text} />}
        </>
      )}
    </Pressable>
  )

  return (
    <View style={s.rodape}>
      <View style={s.container}>
        <View style={s.rodapeTopo}>
          <Text style={s.rodapeFrase}>Feito por quem ouve cedo demais.</Text>
          <View style={s.rodapeNav}>
            {linkDoRodape('A cena', onCena, true)}
            {linkDoRodape('Termos', () => Linking.openURL(`${SITE}/termos`))}
            {linkDoRodape('Privacidade', () => Linking.openURL(`${SITE}/privacidade`))}
          </View>
        </View>

        <Pressable onPress={onTopo} accessibilityRole="link" accessibilityLabel="Mirsui, voltar ao início">
          <View style={s.rodapeMarca}>
            <Text
              style={[s.rodapeMarcaTexto, { fontSize: marca, lineHeight: marca * 1.3, letterSpacing: -0.087 * marca }]}
            >
              mirsui
            </Text>
            <Text
              style={[s.rodapeMarcaSeta, { fontSize: marca * 0.73, lineHeight: marca * 1.3, letterSpacing: -0.04 * marca * 0.73 }]}
            >
              ↗
            </Text>
          </View>
        </Pressable>

        <View style={[s.rodapeBase, { paddingBottom: 20 + base }]}>
          <Text style={s.rodapeBaseTexto}>Um lugar para o seu lado B.</Text>
          <Text style={s.rodapeBaseTexto}>Descobrir é só o começo.</Text>
        </View>
      </View>
    </View>
  )
}

/* --------------------------------- Estilo -------------------------------- */

function criarEstilos(c: ClubColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    container: { paddingHorizontal: PAD },
    sublinhado: { textDecorationLine: 'underline' },
    divisoria: { height: 1, backgroundColor: c.line, marginBottom: 48 },

    /* Botões e links */
    botaoCasca: { alignSelf: 'flex-start' },
    botaoSombra: {
      ...StyleSheet.absoluteFillObject,
      top: 3,
      bottom: -3,
      borderRadius: 7,
      backgroundColor: c.accent,
    },
    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      paddingVertical: 17,
      paddingHorizontal: 24,
      borderWidth: 1,
      borderColor: c.text,
      borderRadius: 7,
      backgroundColor: c.text,
    },
    botaoTexto: { color: c.onButton, fontFamily: F.bodyBold, fontSize: 15, lineHeight: 19.5 },
    textLink: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10 },
    textLinkTexto: { color: c.text, fontFamily: F.bodyBold, fontSize: 12, lineHeight: 18 },

    /* Navegação */
    nav: {
      height: 74,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    wordmark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    wordmarkTexto: { color: c.text, fontFamily: F.display, fontSize: 28, letterSpacing: -2 },
    navAcoes: { flexDirection: 'row', alignItems: 'center', gap: 13 },
    tema: { width: 30, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    entrar: { color: c.text, fontFamily: F.bodySemi, fontSize: 14, paddingVertical: 12 },
    navCadastro: { paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
    navCadastroTexto: { fontSize: 12 },

    /* Abertura */
    heroTexto: { alignItems: 'center', paddingTop: 44 },
    eyebrow: {
      color: c.accentText,
      fontFamily: F.bodyHeavy,
      fontSize: 11,
      letterSpacing: 1.43,
      textTransform: 'uppercase',
    },
    h1: { color: c.text, fontFamily: F.display, textAlign: 'center', marginTop: 22 },
    heroDescricao: {
      color: c.muted,
      fontFamily: F.body,
      fontSize: 15,
      lineHeight: 24,
      maxWidth: 300,
      textAlign: 'center',
      marginTop: 20,
    },
    heroAcoes: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 19,
      marginTop: 25,
    },
    heroAcoesEstreito: { flexDirection: 'column', gap: 9 },
    heroBotao: { paddingVertical: 15, paddingHorizontal: 17, gap: 10 },
    heroBotaoTexto: { fontSize: 13 },
    prateleira: { gap: 12, paddingTop: 50, paddingBottom: 58, paddingHorizontal: 30 },
    disco: { width: 155 },
    manga: {
      width: 155,
      height: 155,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: c.surface,
      shadowColor: '#20201e',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 9,
      elevation: 5,
    },
    discoLegenda: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      marginTop: 13,
    },
    discoLegendaTexto: { color: c.text, fontFamily: F.bodySemi, fontSize: 11 },

    /* Seções */
    h2: { color: c.text, fontFamily: F.title, fontSize: 35, lineHeight: 37.5, letterSpacing: -1.9 },
    h2Apoio: {
      color: c.muted,
      fontFamily: F.body,
      fontSize: 14,
      lineHeight: 21.7,
      maxWidth: 300,
      marginTop: 11,
    },
    rodapeDaSecao: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 24,
      marginTop: 23,
    },

    /* Acervo */
    secaoAcervo: { paddingBottom: 48 },
    filtros: { marginTop: 22, borderBottomWidth: 1, borderBottomColor: c.line, flexGrow: 0 },
    filtrosFileira: { gap: 24 },
    filtro: {
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    filtroTexto: { color: c.muted, fontFamily: F.bodySemi, fontSize: 12 },
    grade: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 23, marginTop: 23 },
    capa: {
      width: '100%',
      aspectRatio: 1,
      overflow: 'hidden',
      borderRadius: 3,
      backgroundColor: c.surface,
    },
    capaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    albumTitulo: { color: c.text, fontFamily: F.bodyBold, fontSize: 12, lineHeight: 16.8, marginTop: 10 },
    albumArtista: { color: c.muted, fontFamily: F.body, fontSize: 11, marginTop: 2 },
    acervoNota: {
      color: c.muted,
      fontFamily: F.body,
      fontSize: 11,
      lineHeight: 16.5,
      maxWidth: 160,
      paddingTop: 8,
      flexShrink: 1,
    },

    /* Como funciona */
    como: { backgroundColor: c.surface, paddingTop: 53, paddingBottom: 55 },
    comoH2: { color: c.text, fontFamily: F.title, marginTop: 21 },
    comoTexto: { color: c.muted, fontFamily: F.body, fontSize: 14, lineHeight: 23, marginTop: 24 },
    passos: { marginTop: 30, gap: 23 },
    passo: { flexDirection: 'row', gap: 20, alignItems: 'baseline' },
    passoNumero: { color: c.accentText, fontFamily: F.number, fontSize: 12 },
    passoTitulo: { color: c.text, fontFamily: F.bodyBold, fontSize: 15, letterSpacing: -0.3 },
    passoTexto: {
      color: c.muted,
      fontFamily: F.body,
      fontSize: 13,
      lineHeight: 19.5,
      marginTop: 3,
      maxWidth: 320,
    },
    palco: { alignItems: 'center', gap: 25, marginTop: 44 },
    recibo: {
      backgroundColor: c.paper,
      paddingVertical: 21,
      paddingHorizontal: 25,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: 3,
      shadowColor: '#151910',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.27,
      shadowRadius: 18,
      elevation: 6,
    },
    reciboTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 17,
      borderBottomWidth: 1,
      borderBottomColor: c.line,
    },
    reciboRotulo: { color: c.text, fontFamily: F.bodyBold, fontSize: 9, letterSpacing: 1 },
    reciboMarca: {
      marginLeft: 'auto',
      color: c.accent,
      fontFamily: F.display,
      fontSize: 24,
      letterSpacing: -2,
    },
    reciboCapa: {
      width: '75%',
      aspectRatio: 1,
      alignSelf: 'center',
      marginTop: 23,
      borderRadius: 2,
    },
    reciboFaixa: { alignItems: 'center', paddingTop: 19, paddingBottom: 20 },
    reciboTitulo: { color: c.text, fontFamily: F.bodyHeavy, fontSize: 23, letterSpacing: -0.92 },
    reciboArtista: { color: c.muted, fontFamily: F.body, fontSize: 13, marginTop: 2 },
    tracejadoCasca: { height: 1, overflow: 'hidden' },
    tracejado: {
      height: 2,
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
    },
    reciboResultado: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: 17,
      minHeight: 78,
    },
    reciboPosicao: {
      color: c.accentText,
      fontFamily: F.title,
      fontSize: 45,
      lineHeight: 50,
      letterSpacing: -2.7,
      minWidth: 52,
    },
    reciboForte: { color: c.text, fontFamily: F.bodyBold, fontSize: 12 },
    reciboApoio: { color: c.muted, fontFamily: F.body, fontSize: 10, marginTop: 4 },
    demoBotao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      marginTop: 15,
      padding: 12,
      borderRadius: 5,
      backgroundColor: c.text,
    },
    demoBotaoTexto: { color: c.onButton, fontFamily: F.bodySemi, fontSize: 13 },
    demoNota: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 12,
    },
    demoNotaTexto: { color: c.muted, fontFamily: F.body, fontSize: 9 },

    /* Cena */
    secaoCena: { paddingVertical: 53 },
    gradeCena: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 27 },
    achado: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 20 },
    pessoaLinha: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    avatar: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: c.accentSoft,
    },
    avatarInicial: { color: c.accentText, fontFamily: F.bodyHeavy, fontSize: 12 },
    pessoaNome: { color: c.text, fontFamily: F.bodyBold, fontSize: 11 },
    pessoaQuando: { color: c.muted, fontFamily: F.body, fontSize: 10, marginTop: 1 },
    achadoFaixa: { marginTop: 17, gap: 12 },
    achadoTexto: { minHeight: 86 },
    achadoTitulo: { color: c.text, fontFamily: F.bodyBold, fontSize: 13, lineHeight: 16.9 },
    achadoArtista: { color: c.muted, fontFamily: F.body, fontSize: 12, marginTop: 4 },
    posicao: { color: c.accentText, fontFamily: F.bodyBold, fontSize: 10, marginTop: 9 },
    recado: { color: c.muted, fontFamily: F.body, fontSize: 13, lineHeight: 20.8, marginTop: 17 },
    cenaVazia: { color: c.muted, fontFamily: F.body, fontSize: 15, lineHeight: 23, marginTop: 30 },
    esqueleto: { backgroundColor: c.surface },
    semSinal: { marginTop: 30, gap: 8, alignItems: 'flex-start' },
    semSinalTitulo: { color: c.text, fontFamily: F.bodyBold, fontSize: 16 },
    semSinalTexto: { color: c.muted, fontFamily: F.body, fontSize: 14, lineHeight: 21 },
    comunidade: { alignItems: 'flex-start', gap: 10, flexShrink: 1 },
    pilhaDeAvatares: { flexDirection: 'row', paddingLeft: 5 },
    avatarEmpilhado: { borderWidth: 2, borderColor: c.bg, marginLeft: -5 },
    comunidadeTexto: { color: c.muted, fontFamily: F.body, fontSize: 11, lineHeight: 16, maxWidth: 140 },

    /* Fechamento */
    fechamento: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 40, paddingBottom: 55 },
    ilustracao: { alignSelf: 'center', marginBottom: 29, overflow: 'hidden' },
    ilustracaoPlaca: { backgroundColor: '#f7f7f2', borderRadius: 5 },
    fechamentoTexto: { color: c.muted, fontFamily: F.body, fontSize: 14, lineHeight: 22.4, marginTop: 17 },
    fechamentoNota: { color: c.muted, fontFamily: F.body, fontSize: 11, marginTop: 14 },

    /* Rodapé */
    rodape: { borderTopWidth: 1, borderTopColor: c.line, paddingTop: 29, overflow: 'hidden' },
    rodapeTopo: { gap: 20 },
    rodapeFrase: { color: c.muted, fontFamily: F.body, fontSize: 11 },
    rodapeNav: { flexDirection: 'row', gap: 25 },
    rodapeLink: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    rodapeLinkTexto: { color: c.text, fontFamily: F.body, fontSize: 11 },
    rodapeMarca: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: 24,
    },
    rodapeMarcaTexto: { color: c.text, fontFamily: F.display },
    rodapeMarcaSeta: { color: c.accent, fontFamily: F.body },
    rodapeBase: { flexDirection: 'row', justifyContent: 'space-between', gap: 20 },
    rodapeBaseTexto: { color: c.muted, fontFamily: F.body, fontSize: 9 },
  })
}
