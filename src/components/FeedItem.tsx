import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import type { FeedPost } from '../api/types'
import { timeAgo, ordLabel } from '../lib/time'
import { colors } from '../theme'
import Cover from './Cover'

export type FeedPostUI = FeedPost & { isLiked: boolean }

function whoOf(post: FeedPost) {
  return post.display_name || post.username
}

export default function FeedItem({
  post,
  onToggleSave,
}: {
  post: FeedPostUI
  onToggleSave: (post: FeedPostUI) => void
}) {
  const [busy, setBusy] = useState(false)
  const who = whoOf(post)
  const early = typeof post.position === 'number' && post.position <= 10

  async function handle() {
    if (busy) return
    setBusy(true)
    try {
      await onToggleSave(post)
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.row}>
      <Cover
        seed={post.artist_name}
        thumbnail={post.track_thumbnail}
        size={84}
        radius={9}
      />

      <View style={styles.body}>
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            {post.avatar_url ? (
              <Image source={{ uri: post.avatar_url }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarIni}>
                {(who || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.metaText} numberOfLines={1}>
            <Text style={styles.who}>{who}</Text> salvou
          </Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{timeAgo(post.claimedat)}</Text>
          {early && (
            <View style={styles.earlyTag}>
              <Text style={styles.earlyTagText}>
                {post.position === 1 ? '1º' : 'cedo'}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {post.track_title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {post.artist_name}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.stat, early && { color: colors.acc }]}>
            <Text style={[styles.statStrong, early && { color: colors.acc }]}>
              {ordLabel(post.position)}
            </Text>{' '}
            a salvar
          </Text>
          <Text style={styles.statMuted}>{post.likes_count} também têm</Text>

          <Pressable
            onPress={handle}
            disabled={busy}
            style={[styles.saveBtn, post.isLiked ? styles.saved : styles.unsaved]}
          >
            <Text style={[styles.saveText, post.isLiked ? styles.savedText : styles.unsavedText]}>
              {post.isLiked ? '✓ Salva' : '+ Salvar'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  body: { flex: 1, minWidth: 0 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1b1813',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarIni: { color: colors.text, fontSize: 10, fontWeight: '800' },
  metaText: { color: colors.text2, fontSize: 13 },
  who: { color: colors.text, fontWeight: '700' },
  dot: { color: colors.text3 },
  time: { color: colors.text3, fontSize: 11 },
  earlyTag: {
    borderWidth: 1,
    borderColor: 'rgba(205,239,54,0.4)',
    backgroundColor: colors.accSoft,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  earlyTagText: {
    color: colors.acc,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 9, letterSpacing: -0.2 },
  artist: { color: colors.text2, fontSize: 13.5, marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  stat: { color: colors.text2, fontSize: 11 },
  statStrong: { color: colors.text, fontWeight: '700' },
  statMuted: { color: colors.text3, fontSize: 11 },
  saveBtn: {
    marginLeft: 'auto',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  saved: { borderWidth: 1, borderColor: colors.line2, backgroundColor: 'transparent' },
  unsaved: { backgroundColor: colors.acc },
  saveText: { fontSize: 12.5, fontWeight: '700' },
  savedText: { color: colors.text2 },
  unsavedText: { color: colors.onAcc },
})
