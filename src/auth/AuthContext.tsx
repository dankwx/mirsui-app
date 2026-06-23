import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import * as api from '../api/client'
import { ApiError } from '../api/client'
import { clearSession, loadSession, saveSession } from '../api/session'
import type { Profile, SupabaseSession, SupabaseUser } from '../api/types'

interface AuthState {
  loading: boolean // restaurando sessão no boot
  user: SupabaseUser | null
  profile: Profile | null
  session: SupabaseSession | null
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  // Retorna um access token válido (renovando se necessário). null se deslogado.
  getValidToken: () => Promise<string | null>
  // Recarrega o profile do backend e atualiza o estado (após editar perfil).
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Margem de segurança (segundos) para renovar antes de expirar de fato.
const EXPIRY_SKEW = 60

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    profile: null,
    session: null,
  })

  const applySession = useCallback(
    async (session: SupabaseSession, user: SupabaseUser, profile: Profile | null) => {
      await saveSession(session)
      setState({ loading: false, user, profile, session })
    },
    []
  )

  // Restaura a sessão salva ao abrir o app e confirma com o backend.
  useEffect(() => {
    let active = true
    ;(async () => {
      const saved = await loadSession()
      if (!saved?.access_token) {
        if (active) setState((s) => ({ ...s, loading: false }))
        return
      }
      try {
        let session = saved
        // Renova se já estiver (ou prestes a) expirar.
        if (isExpired(session)) {
          const refreshed = await api.refresh(session.refresh_token)
          session = refreshed.session
        }
        const { user, profile } = await api.me(session.access_token)
        if (active) await applySession(session, user, profile)
      } catch {
        await clearSession()
        if (active) setState({ loading: false, user: null, profile: null, session: null })
      }
    })()
    return () => {
      active = false
    }
  }, [applySession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password)
      if (!res.session) {
        throw new ApiError('Confirme seu email antes de entrar.', 401)
      }
      let profile: Profile | null = null
      try {
        profile = (await api.me(res.session.access_token)).profile
      } catch {
        // segue mesmo sem o profile carregado
      }
      await applySession(res.session, res.user, profile)
    },
    [applySession]
  )

  const signUp = useCallback(
    async (email: string, password: string, username: string) => {
      const res = await api.signup(email, password, username)
      // Se o projeto exige confirmação de email, session vem null.
      if (res.session) {
        await applySession(res.session, res.user, null)
      }
    },
    [applySession]
  )

  const signOut = useCallback(async () => {
    const token = state.session?.access_token
    try {
      await api.logout(token)
    } catch {
      // logout é best-effort
    }
    await clearSession()
    setState({ loading: false, user: null, profile: null, session: null })
  }, [state.session])

  const getValidToken = useCallback(async (): Promise<string | null> => {
    const session = state.session
    if (!session) return null
    if (!isExpired(session)) return session.access_token
    try {
      const refreshed = await api.refresh(session.refresh_token)
      await saveSession(refreshed.session)
      setState((s) => ({ ...s, session: refreshed.session, user: refreshed.user }))
      return refreshed.session.access_token
    } catch {
      await clearSession()
      setState({ loading: false, user: null, profile: null, session: null })
      return null
    }
  }, [state.session])

  const refreshProfile = useCallback(async () => {
    const token = await getValidToken()
    if (!token) return
    try {
      const { user, profile } = await api.me(token)
      setState((s) => ({ ...s, user, profile }))
    } catch {
      // mantém o estado atual em caso de falha de rede
    }
  }, [getValidToken])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.user,
      signIn,
      signUp,
      signOut,
      getValidToken,
      refreshProfile,
    }),
    [state, signIn, signUp, signOut, getValidToken, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function isExpired(session: SupabaseSession): boolean {
  if (!session.expires_at) return false
  const now = Math.floor(Date.now() / 1000)
  return session.expires_at - EXPIRY_SKEW <= now
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
