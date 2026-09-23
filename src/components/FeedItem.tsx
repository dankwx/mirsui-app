import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { FeedPost } from '../api/types'
import { recadoValido } from '../lib/recado'
import { timeAgo } from '../lib/time'
import { colors } from '../theme'
import Cover from './Cover'
import SaveButton, { type SaveState } from './SaveButton'

/**
 * Só o primeiro leva acento.
 *
 * Era `position <= 10`, e vestia um selo "cedo" em lima. Com o acervo do
 * tamanho de hoje quase toda faixa está no top 10, então o selo aparecia em
 * toda linha do feed, ao lado de "1ª a salvar", que já diz a mesma coisa com
 * mais precisão. Dois acentos por linha dizendo o mesmo é o que faz o lima
 * parar de significar alguma coisa.
 */
const chegouPrimeiro = (post: FeedPost) => post.position === 1

export function quemSalvou(post: FeedPost, ehMeu: boolean) {
  return ehMeu ? 'Você' : post.display_name || post.username
}

export default function FeedItem({
  post,
  ehMeu,
  save,
  onOpen,
  onOpenUser,
}: {
  post: FeedPost
  ehMeu: boolean
  save: SaveState
  onOpen?: (post: FeedPost) => void
  onOpenUser?: (userId: string) => void
}) {
  const quem = quemSalvou(post, ehMeu)
  const primeiro = chegouPrimeiro(post)
  const recado = recadoValido(post.claim_message)

  return (
    <View style={styles.row}>
      <Pressable onPress={() => onOpen?.(post)}>
        <Cover
          seed={post.artist_name}
          thumbnail={post.track_thumbnail}
          size={72}
          radius={8}
        />
      </Pressable>

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Pressable
            style={({ pressed }) => [styles.author, pressed && { opacity: 0.6 }]}
            onPress={() => onOpenUser?.(post.user_id)}
            hitSlop={6}
          >
            <View style={styles.avatar}>
              {post.avatar_url ? (
                <Image source={{ uri: post.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarIni}>
                  {(quem || 'U').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.who} numberOfLines={1}>
              {quem}
            </Text>
          </Pressable>
          <Text style={styles.metaText}>salvou</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(post.claimedat)}</Text>
        </View>

        <Pressable onPress={() => onOpen?.(post)}>
          <Text style={styles.title} numberOfLines={1}>
            {post.track_title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {post.artist_name}
          </Text>
        </Pressable>

        {!!recado && <Text style={styles.recado}>{recado}</Text>}

        <View style={styles.footer}>
          <Text style={styles.stat}>
            <Text style={primeiro ? styles.primeiro : styles.statStrong}>
              {post.position}ª
            </Text>
            {' a salvar'}
            {post.savers_count > 1 ? ` · ${post.savers_count} já salvaram` : ''}
          </Text>

          <SaveButton state={save} />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  body: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  author: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarIni: { color: colors.text2, fontSize: 10, fontWeight: '800' },
  metaText: { color: colors.text2, fontSize: 13 },
  who: { color: colors.text, fontWeight: '700', fontSize: 13 },
  dot: { color: colors.text3 },
  time: { color: colors.text3, fontSize: 11 },

  title: { color: colors.text, fontSize: 17.5, fontWeight: '700', marginTop: 7, letterSpacing: -0.3 },
  artist: { color: colors.text2, fontSize: 13.5, marginTop: 1 },

  // Laranja: alguém escreveu isto com a própria mão. É a camada humana, a
  // mesma cor de seguir e de recado.
  recado: {
    color: colors.text2,
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 21,
    marginTop: 9,
    paddingLeft: 11,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(232,115,74,0.5)',
  },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 11 },
  stat: { color: colors.text3, fontSize: 11.5, flexShrink: 1 },
  statStrong: { color: colors.text2, fontWeight: '700' },
  primeiro: { color: colors.acc, fontWeight: '700' },
})
