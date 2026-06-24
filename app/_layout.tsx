import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../src/auth/AuthContext'
import { queryClient } from '../src/api/queryClient'
import MirsuiLogo from '../src/components/MirsuiLogo'
import { colors } from '../src/theme'

// Navegador raiz: enquanto restaura a sessão, mostra um splash. Depois, as
// guardas (Stack.Protected) decidem quais rotas existem conforme o login —
// o expo-router redireciona sozinho quando o estado de auth muda.
function RootNavigator() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <View style={styles.splash}>
        <MirsuiLogo size={56} />
        <ActivityIndicator color={colors.acc} style={{ marginTop: 20 }} />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    >
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="track/[id]" options={{ animation: 'slide_from_right' }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {/* QueryClientProvider acima do AuthProvider: o auth dispara o prefetch
          do perfil assim que a sessão é restaurada. */}
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
})
