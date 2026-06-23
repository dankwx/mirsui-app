import * as SecureStore from 'expo-secure-store'
import type { SupabaseSession } from './types'

// Guarda a sessão (tokens) com segurança no Keychain (iOS) / Keystore (Android).
const SESSION_KEY = 'mirsui.session'

export async function saveSession(session: SupabaseSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session))
}

export async function loadSession(): Promise<SupabaseSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SupabaseSession
  } catch {
    return null
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
