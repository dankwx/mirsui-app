import React from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

// Prévia da faixa. No mobile não embutimos um <iframe>: mostramos a thumbnail do
// YouTube com um botão de play que abre o app/site do YouTube, e um atalho para
// ouvir no Spotify. (No front isso é um iframe embutido.)
export default function TrackPreviewBar({
  videoId,
  spotifyUrl,
  trackTitle,
  artistName,
}: {
  videoId: string | null
  spotifyUrl: string
  trackTitle: string
  artistName: string
}) {
  const openYouTube = () => {
    if (videoId) Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.kicker}>PRÉVIA</Text>
        <Pressable style={styles.spotifyBtn} onPress={() => Linking.openURL(spotifyUrl)}>
          <Ionicons name="musical-notes" size={14} color={colors.text2} />
          <Text style={styles.spotifyText}>Ouvir no Spotify</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {videoId ? (
          <Pressable style={styles.videoWrap} onPress={openYouTube}>
            <Image
              source={{ uri: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` }}
              style={styles.thumb}
              contentFit="cover"
              transition={150}
            />
            <View style={styles.playOverlay}>
              <View style={styles.playCircle}>
                <Ionicons name="play" size={26} color={colors.onAcc} />
              </View>
            </View>
          </Pressable>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={34} color={colors.text3} />
            <Text style={styles.emptyText}>Vídeo não disponível</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  kicker: { color: colors.text3, fontSize: 10.5, fontWeight: '700', letterSpacing: 1.6 },
  spotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  spotifyText: { color: colors.text2, fontSize: 12.5, fontWeight: '600' },
  body: { padding: 16, paddingTop: 12 },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  thumb: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 3,
  },
  empty: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line2,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: { color: colors.text3, fontSize: 12.5 },
})
