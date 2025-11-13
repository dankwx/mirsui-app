import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['rgba(101,69,255,0.45)', 'rgba(5,3,15,0.4)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.backgroundGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(217,70,239,0.35)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cornerGlow}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.logoRow}>
          <LinearGradient
            colors={['#a855f7', '#d946ef', '#6366f1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Text style={styles.logoIcon}>🎵</Text>
          </LinearGradient>
          <View>
            <Text style={styles.logoTitle}>mirsui</Text>
            <Text style={styles.logoSubtitle}>MUSIC DISCOVERY</Text>
          </View>
        </View>

        <LinearGradient
          colors={['#131129', '#110d24', '#0b0718']}
          locations={[0, 0.55, 1]}
          style={styles.heroCard}
        >
          <Text style={styles.pillCopy}>Você ouviu primeiro</Text>
          <Text style={styles.heroTitle}>E tem como provar.</Text>
          <Text style={styles.heroDescription}>
            Registre suas descobertas antes do hype e mostre que seu ouvido chega primeiro.
          </Text>

          <View style={styles.primaryActions}>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Entrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Criar conta</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkButtonText}>Explorar sem login</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.metaBlock}>
          <Text style={styles.metaTitle}>Prove que você descobriu antes do mainstream</Text>
          <Text style={styles.metaSubtitle}>
            Simples, rápido e feito pra quem vive caçando som novo. Quando aquela track explodir, todo mundo vai saber que você chegou lá primeiro.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05030f',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backgroundGlow: {
    position: 'absolute',
    top: -200,
    left: -140,
    right: -140,
    height: 420,
    borderRadius: 210,
  },
  cornerGlow: {
    position: 'absolute',
    bottom: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  content: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  logoIcon: {
    fontSize: 22,
  },
  logoTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.6,
  },
  logoSubtitle: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 9,
    letterSpacing: 2,
  },
  heroCard: {
    borderRadius: 32,
    paddingVertical: 40,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 45,
    shadowOffset: { width: 0, height: 24 },
    elevation: 16,
    alignItems: 'center',
  },
  pillCopy: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  heroDescription: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  primaryActions: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#a855f7',
    paddingVertical: 16,
    borderRadius: 26,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 18,
  },
  linkButtonText: {
    color: 'rgba(224, 196, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  metaBlock: {
    marginTop: 36,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  metaTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  metaSubtitle: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
