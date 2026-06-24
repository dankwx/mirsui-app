import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import MirsuiLogo from '../components/MirsuiLogo'
import { BackButton, Button, Field } from '../components/ui'
import { colors } from '../theme'

type Mode = 'login' | 'signup'

export default function AuthScreen({ mode: initialMode = 'login' }: { mode?: Mode }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>(initialMode)

  const onBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const isSignup = mode === 'signup'

  function validate(): string | null {
    if (!email.trim()) return 'Informe seu email.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return 'Email inválido.'
    if (isSignup) {
      if (username.trim().length < 3) return 'Username precisa de ao menos 3 caracteres.'
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim()))
        return 'Username: apenas letras, números e _.'
    }
    if (password.length < 6) return 'A senha deve ter no mínimo 6 caracteres.'
    return null
  }

  async function submit() {
    setError(null)
    setNotice(null)
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setBusy(true)
    try {
      if (isSignup) {
        await signUp(email.trim(), password, username.trim())
        // Se exigir confirmação de email, não há sessão → avisa o usuário.
        setNotice(
          'Conta criada! Se pedirmos confirmação, verifique seu email e depois entre.'
        )
        setMode('login')
        setPassword('')
      } else {
        await signIn(email.trim(), password)
        // Sucesso: o AuthProvider troca a tela automaticamente.
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Algo deu errado. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setMode(isSignup ? 'login' : 'signup')
    setError(null)
    setNotice(null)
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={onBack} />

        <View style={styles.brand}>
          <MirsuiLogo size={40} />
          <Text style={styles.brandText}>mirsui</Text>
        </View>

        <Text style={styles.title}>
          {isSignup ? 'Crie sua conta' : 'Bem-vindo de volta'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignup
            ? 'Comece a carimbar as descobertas que são suas.'
            : 'Entre para continuar cavando som novo.'}
        </Text>

        <View style={styles.form}>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="voce@email.com"
          />
          {isSignup && (
            <Field
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoComplete="username"
              placeholder="seu_user"
            />
          )}
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder="mínimo 6 caracteres"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button
            label={isSignup ? 'Criar conta' : 'Entrar'}
            onPress={submit}
            loading={busy}
            style={{ marginTop: 6 }}
          />
        </View>

        <Pressable onPress={switchMode} style={styles.switch}>
          <Text style={styles.switchText}>
            {isSignup ? 'Já tem conta? ' : 'Ainda não tem conta? '}
            <Text style={styles.switchLink}>
              {isSignup ? 'Entrar' : 'Criar conta'}
            </Text>
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
    marginBottom: 28,
  },
  brandText: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: colors.text2, fontSize: 15, marginTop: 8, lineHeight: 22 },
  form: { marginTop: 28, gap: 16 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  notice: { color: colors.acc, fontSize: 14, lineHeight: 20 },
  switch: { marginTop: 28, alignItems: 'center' },
  switchText: { color: colors.text2, fontSize: 15 },
  switchLink: { color: colors.acc, fontWeight: '700' },
})
