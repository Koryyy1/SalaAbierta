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

// Avatar original de Sali: un búho con lentes, en los colores de SalaAbierta.
// Parpadea de vez en cuando (salvo que el teléfono tenga activado "Reducir movimiento").
// Las medidas están en una grilla de 100 × 100 y se escalan con "size".
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
  const pupila = useAnimatedStyle(() => ({ transform: [{ scaleY: parpado.value }] }));
  const u = (v: number) => (v * size) / 100;
  const caja = (x: number, y: number, w: number, h: number) => ({ position: 'absolute' as const, left: u(x), top: u(y), width: u(w), height: u(h) });
  const oreja = (x: number, giro: string) => ({
    ...caja(x, 2, 0, 0),
    borderLeftWidth: u(11),
    borderRightWidth: u(11),
    borderBottomWidth: u(26),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: CAFE,
    transform: [{ rotate: giro }],
  });

  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <View style={oreja(10, '-18deg')} />
      <View style={oreja(68, '18deg')} />
      <View style={[caja(5, 12, 90, 86), { backgroundColor: CAFE, borderRadius: u(45) }]} />
      <View style={[caja(14, 24, 72, 66), { backgroundColor: CREMA, borderRadius: u(36) }]} />
      {/* Lentes */}
      <View style={[caja(13, 31, 36, 36), styles.lente, { borderRadius: u(18), borderWidth: u(4.5) }]} />
      <View style={[caja(51, 31, 36, 36), styles.lente, { borderRadius: u(18), borderWidth: u(4.5) }]} />
      <View style={[caja(47, 43, 6, 4), { backgroundColor: TINTA }]} />
      {/* Ojos */}
      <Animated.View style={[caja(24.5, 42.5, 13, 13), { backgroundColor: TINTA, borderRadius: u(6.5) }, pupila]} />
      <Animated.View style={[caja(62.5, 42.5, 13, 13), { backgroundColor: TINTA, borderRadius: u(6.5) }, pupila]} />
      <View style={[caja(29, 44.5, 4, 4), { backgroundColor: '#ffffff', borderRadius: u(2) }]} />
      <View style={[caja(67, 44.5, 4, 4), { backgroundColor: '#ffffff', borderRadius: u(2) }]} />
      {/* Pico */}
      <View
        style={[
          caja(43, 67, 0, 0),
          { borderLeftWidth: u(7), borderRightWidth: u(7), borderTopWidth: u(12), borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: colors.orange },
        ]}
      />
    </View>
  );
}

const CAFE = '#5d3b2b';
const CREMA = '#f6e6cf';
const TINTA = '#2a1b12';

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
  fila: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  lente: { backgroundColor: '#ffffff', borderColor: TINTA },
  punto: { backgroundColor: colors.brown, borderRadius: 5, height: 10, width: 10 },
  escribiendoTexto: { color: colors.brown, fontSize: 15 },
});
