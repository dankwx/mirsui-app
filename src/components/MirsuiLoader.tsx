import React, { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'
import MirsuiLogo from './MirsuiLogo'

// Loader do app: o próprio ícone Mirsui girando. O giro não é constante —
// Easing.inOut faz cada volta acelerar ("dar um gás") e depois desacelerar
// quase parando antes de repetir.
export default function MirsuiLoader({ size = 48 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    )
    loop.start()
    return () => loop.stop()
  }, [spin])

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <MirsuiLogo size={size} />
    </Animated.View>
  )
}
