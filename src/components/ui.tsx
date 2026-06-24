import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../theme'

type ButtonVariant = 'acc' | 'light' | 'solid' | 'ghost'

export function Button({
  label,
  onPress,
  variant = 'acc',
  loading,
  disabled,
  style,
  icon,
}: {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
  icon?: React.ReactNode
}) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.btn,
        variantStyles[variant].btn,
        pressed && !isDisabled && { opacity: 0.85, transform: [{ translateY: 1 }] },
        isDisabled && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color as string} />
      ) : (
        <View style={styles.btnInner}>
          {icon}
          <Text style={[styles.btnText, variantStyles[variant].text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  )
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View style={{ width: '100%' }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.text3}
        style={[styles.input, !!error && { borderColor: colors.danger }]}
        {...props}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  )
}

// Botão de voltar padrão do app: um "chip" arredondado, visível, com ícone +
// rótulo. Aceita rótulo e estilo de posicionamento (margens) por chamada.
export function BackButton({
  onPress,
  label = 'VOLTAR',
  style,
}: {
  onPress?: () => void
  label?: string
  style?: ViewStyle
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.back, pressed && styles.backPressed, style]}
    >
      <Ionicons name="arrow-back" size={17} color={colors.text} />
      <Text style={styles.backText}>{label}</Text>
    </Pressable>
  )
}

export function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <View style={[styles.pill, accent && styles.pillAccent]}>
      <Text style={[styles.pillText, accent && { color: colors.acc }]}>{children}</Text>
    </View>
  )
}

const variantStyles: Record<ButtonVariant, { btn: ViewStyle; text: any }> = {
  acc: { btn: { backgroundColor: colors.acc }, text: { color: colors.onAcc } },
  light: {
    btn: { backgroundColor: colors.fill2, borderWidth: 1, borderColor: colors.line2 },
    text: { color: colors.text },
  },
  solid: { btn: { backgroundColor: colors.bg }, text: { color: colors.acc } },
  ghost: {
    btn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line2 },
    text: { color: colors.text2 },
  },
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { fontSize: 15, fontWeight: '700' },
  fieldLabel: {
    color: colors.text2,
    fontSize: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    backgroundColor: colors.fill1,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  fieldError: { color: colors.danger, fontSize: 12, marginTop: 6 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.fill2,
    borderWidth: 1,
    borderColor: colors.line2,
  },
  backPressed: { backgroundColor: colors.fill1, opacity: 0.85 },
  backText: { color: colors.text, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line2,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillAccent: { borderColor: 'rgba(205,239,54,0.4)', backgroundColor: colors.accSoft },
  pillText: {
    color: colors.text2,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
})
