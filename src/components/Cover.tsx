import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { initials, tone } from '../theme'

// Capa da faixa: usa thumbnail quando existe, senão um quadro tonal com as
// iniciais do artista (mesma lógica do componente Cover no front).
export default function Cover({
  seed,
  thumbnail,
  size,
  radius = 10,
  fontSize,
}: {
  seed: string
  thumbnail?: string | null
  size: number
  radius?: number
  fontSize?: number
}) {
  if (thumbnail) {
    return (
      <Image
        source={{ uri: thumbnail }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        transition={150}
      />
    )
  }
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: radius, backgroundColor: tone(seed) },
      ]}
    >
      <Text style={[styles.ini, { fontSize: fontSize ?? size * 0.4 }]}>
        {initials(seed)}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  ini: {
    color: 'rgba(255,255,255,0.07)',
    fontWeight: '800',
    letterSpacing: -1,
    paddingLeft: 8,
    paddingBottom: 2,
  },
})
