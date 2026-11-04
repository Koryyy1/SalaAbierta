import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/texto';
import { colors } from '@/components/ui';

// Avatar original de Sali: una burbuja de diálogo con cara amable, en los colores de SalaAbierta.
// Parpadea de vez en cuando (salvo que el teléfono tenga activado "Reducir movimiento").
export function SaliAvatar({ size = 44 }: { size?: number }) {
  const reducir = useReducedMotion();
  const parpado = useSharedValue(1);
  useEffect(() => {
    if (reducir) return;
    parpado.value = withRepeat(
      withSequence(withDelay(2800, withTiming(0.1, { duration: 90 })), withTiming(1, { duration: 110 })),
      -1,
    );
  }, [reducir, parpado]);
  const ojos = useAnimatedStyle(() => ({ transform: [{ scaleY: parpado.value }] }));
  const ojo = { width: size * 0.13, height: size * 0.17, borderRadius: size * 0.08 };

  return (
    <View accessible={false} style={{ width: size, height: size * 1.1 }}>
      <View style={[styles.cara, { width: size, height: size, borderRadius: size / 2 }]}>
        <Animated.View style={[styles.fila, { gap: size * 0.2, marginTop: size * 0.1 }, ojos]}>
          <View style={[styles.ojo, ojo]} />
          <View style={[styles.ojo, ojo]} />
        </Animated.View>
        <View
          style={[
            styles.sonrisa,
            { width: size * 0.36, height: size * 0.18, borderBottomLeftRadius: size * 0.2, borderBottomRightRadius: size * 0.2, borderWidth: size * 0.05 },
          ]}
        />
      </View>
      {/* "Colita" de burbuja de diálogo */}
      <View style={[styles.cola, { left: size * 0.12, bottom: 0, borderTopWidth: size * 0.22, borderRightWidth: size * 0.2 }]} />
    </View>
  );
}

// Tres puntos que saltan mientras Sali "escribe"; texto estático si se reduce el movimiento
export function Escribiendo() {
  const reducir = useReducedMotion();
  if (reducir) return <Text style={styles.escribiendoTexto}>Sali está escribiendo…</Text>;
  return (
    <View style={styles.fila} accessibilityLabel="Sali está escribiendo" accessibilityLiveRegion="polite">
      {[0, 1, 2].map((i) => (
        <Punto key={i} retraso={i * 150} />
      ))}
    </View>
  );
}

function Punto({ retraso }: { retraso: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(retraso, withRepeat(withSequence(withTiming(-5, { duration: 260 }), withTiming(0, { duration: 260 })), -1));
  }, [retraso, y]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[styles.punto, estilo]} />;
}

const styles = StyleSheet.create({
  cara: { alignItems: 'center', backgroundColor: colors.orange, justifyContent: 'center' },
  fila: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  ojo: { backgroundColor: '#2a1b12' },
  sonrisa: { borderColor: '#2a1b12', borderTopWidth: 0, marginTop: 3 },
  cola: {
    borderRightColor: 'transparent',
    borderTopColor: colors.orange,
    height: 0,
    position: 'absolute',
    transform: [{ rotate: '20deg' }],
    width: 0,
  },
  punto: { backgroundColor: colors.brown, borderRadius: 5, height: 10, width: 10 },
  escribiendoTexto: { color: colors.brown, fontSize: 15 },
});
