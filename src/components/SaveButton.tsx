import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme'

/**
 * O botão de salvar, e o selo em que ele vira.
 *
 * Salvar é mão única: não existe "dessalvar", porque tirar um salvamento
 * abriria buraco na numeração de quem veio depois, e a posição é justamente o
 * registro de quem ouviu antes. Então o estado salvo não é um botão desativado
 * (que parece quebrado) e sim um selo: a ação acabou.
 *
 * Faixa sem chave de gravação (linha antiga, sem `track_uri` e sem `isrc`) não
 * tem como ser salva — o backend precisa dela para calcular a posição. Nesse
 * caso não aparece botão nenhum, em vez de oferecer uma ação que vai falhar.
 *
 * O creme e o lima não são intercambiáveis aqui: a AÇÃO "Salvar" se repete em
 * toda linha do feed, então é creme; a confirmação só aparece no que é seu,
 * então o tique leva o lima. O que se repete não pode ser o que brilha.
 */
export interface SaveState {
  salva: boolean
  ocupada: boolean
  erro: string | null
  podeSalvar: boolean
  onSave: () => void
}

export default function SaveButton({
  state,
  tamanho = 'linha',
}: {
  state: SaveState
  tamanho?: 'linha' | 'destaque'
}) {
  const grande = tamanho === 'destaque'

  if (!state.podeSalvar && !state.salva) return null

  if (state.salva) {
    return (
      <View style={[styles.base, grande ? styles.grande : styles.pequena, styles.selo]}>
        <Text style={styles.tique}>✓</Text>
        <Text style={[styles.seloTexto, grande && styles.textoGrande]}>
          {grande ? 'Salva no seu acervo' : 'Salva'}
        </Text>
      </View>
    )
  }

  return (
    <View style={grande ? undefined : styles.alinhaDireita}>
      <Pressable
        onPress={state.onSave}
        disabled={state.ocupada}
        style={({ pressed }) => [
          styles.base,
          grande ? styles.grande : styles.pequena,
          styles.acao,
          pressed && !state.ocupada && { opacity: 0.85, transform: [{ translateY: 1 }] },
          state.ocupada && { opacity: 0.6 },
        ]}
      >
        {state.ocupada ? (
          <ActivityIndicator size="small" color={colors.paperInk} />
        ) : (
          <Text style={[styles.acaoTexto, grande && styles.textoGrande]}>
            {grande ? 'Salvar no meu acervo' : 'Salvar'}
          </Text>
        )}
      </Pressable>
      {!!state.erro && <Text style={styles.erro}>{state.erro}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  pequena: { paddingHorizontal: 15, paddingVertical: 8, minHeight: 34 },
  grande: { paddingHorizontal: 24, paddingVertical: 13, minHeight: 46 },
  alinhaDireita: { marginLeft: 'auto', alignItems: 'flex-end' },

  acao: { backgroundColor: colors.paper },
  acaoTexto: { color: colors.paperInk, fontSize: 13, fontWeight: '700' },

  // O selo recua de propósito: só o tique leva o acento. Em lima cheio ele
  // competiria com o "1ª a salvar" da mesma linha, e o feed inteiro viraria
  // destaque conforme o acervo cresce.
  selo: { borderWidth: 1, borderColor: colors.line2 },
  tique: { color: colors.acc, fontSize: 13, fontWeight: '800' },
  seloTexto: { color: colors.text2, fontSize: 13, fontWeight: '600' },

  textoGrande: { fontSize: 14.5 },
  erro: { color: colors.text3, fontSize: 11, marginTop: 5, textAlign: 'right' },
})
