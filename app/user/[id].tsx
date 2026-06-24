import React from 'react'
import { useLocalSearchParams } from 'expo-router'
import ProfileScreen from '../../src/screens/ProfileScreen'

// Perfil de outro usuário (rota "/user/:id"). Reusa a ProfileScreen em modo
// visitante (sem edição/logout, com botão de seguir).
export default function UserProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ProfileScreen userId={String(id)} />
}
