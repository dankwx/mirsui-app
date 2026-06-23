import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../auth/AuthContext'
import * as api from '../api/client'
import type { Profile } from '../api/types'
import { Button } from './ui'
import { colors, initials } from '../theme'

export default function EditProfileModal({
  visible,
  profile,
  onClose,
}: {
  visible: boolean
  profile: Profile
  onClose: () => void
}) {
  const insets = useSafeAreaInsets()
  const { getValidToken, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile.display_name || '')
  const [description, setDescription] = useState(profile.description || '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Re-sincroniza os campos sempre que o modal reabre.
  React.useEffect(() => {
    if (visible) {
      setDisplayName(profile.display_name || '')
      setDescription(profile.description || '')
      setAvatarUrl(profile.avatar_url || null)
      setError(null)
    }
  }, [visible, profile.display_name, profile.description, profile.avatar_url])

  const name = displayName || profile.username || 'Sem nome'

  async function handlePickAvatar() {
    setError(null)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError('Permita o acesso às fotos para trocar o avatar.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    })
    if (result.canceled || !result.assets?.length) return

    const asset = result.assets[0]
    if (!asset.base64) {
      setError('Não foi possível ler a imagem selecionada.')
      return
    }

    setUploadingAvatar(true)
    try {
      const token = await getValidToken()
      if (!token) throw new Error('Sessão expirada. Entre novamente.')
      const res = await api.uploadAvatar(
        profile.id,
        asset.base64,
        asset.mimeType || 'image/jpeg',
        token
      )
      setAvatarUrl(res.avatar_url)
      await refreshProfile()
    } catch (e: any) {
      setError(e?.message || 'Não foi possível enviar a foto.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSave() {
    const trimmed = displayName.trim()
    if (!trimmed) {
      setError('O nome de exibição não pode ficar vazio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const token = await getValidToken()
      if (!token) throw new Error('Sessão expirada. Entre novamente.')
      await api.updateProfile(
        profile.id,
        { display_name: trimmed, description: description.trim() || null },
        token
      )
      await refreshProfile()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>PERFIL</Text>
                <Text style={styles.title}>Editar perfil</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.close}>
                <Ionicons name="close" size={20} color={colors.text2} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* avatar */}
              <View style={styles.avatarBlock}>
                <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  <View style={styles.avatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <Text style={styles.avatarIni}>{initials(name)}</Text>
                    )}
                    <View style={styles.avatarOverlay}>
                      {uploadingAvatar ? (
                        <ActivityIndicator color={colors.text} />
                      ) : (
                        <Ionicons name="camera" size={20} color={colors.text} />
                      )}
                    </View>
                  </View>
                </Pressable>
                <Pressable onPress={handlePickAvatar} disabled={uploadingAvatar}>
                  <Text style={styles.avatarHint}>
                    {uploadingAvatar ? 'Enviando...' : 'Trocar foto'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>Nome de exibição</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Seu nome"
                placeholderTextColor={colors.text3}
                style={styles.input}
                maxLength={40}
              />

              <Text style={[styles.label, { marginTop: 18 }]}>Bio</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Escreva algo sobre você..."
                placeholderTextColor={colors.text3}
                style={[styles.input, styles.textarea]}
                multiline
                maxLength={160}
              />
              <Text style={styles.counter}>{description.length}/160</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={saving ? 'Salvando...' : 'Salvar'}
                onPress={handleSave}
                loading={saving}
                disabled={uploadingAvatar}
                style={{ marginTop: 18 }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,6,3,0.72)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: '#1c160e',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.line2,
    paddingHorizontal: 22,
    paddingTop: 10,
    maxHeight: '90%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line2,
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  kicker: { color: colors.acc, fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  close: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlock: { alignItems: 'center', marginBottom: 22, gap: 9 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#241c12',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line2,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarIni: { color: colors.text, fontSize: 34, fontWeight: '800' },
  avatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(22,18,12,0.78)',
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: { color: colors.acc, fontSize: 13, fontWeight: '700' },
  label: {
    color: colors.text3,
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 7,
  },
  input: {
    backgroundColor: colors.fill1,
    borderWidth: 1,
    borderColor: colors.line2,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    color: colors.text,
    fontSize: 16,
  },
  textarea: { height: 96, textAlignVertical: 'top', paddingTop: 12 },
  counter: { color: colors.text3, fontSize: 11, textAlign: 'right', marginTop: 6 },
  error: { color: colors.danger, fontSize: 13, marginTop: 14 },
})
