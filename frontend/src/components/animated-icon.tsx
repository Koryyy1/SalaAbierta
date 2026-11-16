import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 600;
const CREMA = '#fbf4ec'; // mismo fondo que la pantalla de carga nativa (app.json)

// Al abrir la app en el teléfono: el logo aparece sobre fondo crema y se desvanece hacia la primera pantalla
export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const salida = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }] },
    30: { opacity: 1, transform: [{ scale: 1 }] },
    100: { opacity: 0, transform: [{ scale: 1.08 }], easing: Easing.out(Easing.quad) },
  });

  const logo = <Image style={styles.logo} source={require('@/assets/images/splash-icon.png')} contentFit="contain" />;

  return animate ? (
    <Animated.View
      entering={salida.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      })}
      style={styles.overlay}>
      {logo}
    </Animated.View>
  ) : (
    <View onLayout={() => void SplashScreen.hideAsync().finally(() => setAnimate(true))} style={styles.overlay}>
      {logo}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { height: 141, width: 160 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: CREMA,
    justifyContent: 'center',
    zIndex: 1000,
  },
});
