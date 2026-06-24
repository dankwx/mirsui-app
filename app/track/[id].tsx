import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import TrackScreen from '../../src/screens/TrackScreen'

export default function TrackRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <TrackScreen trackId={String(id)} />
}
