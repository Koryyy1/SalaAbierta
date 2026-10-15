import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

// Rutas privadas: solo accesibles con sesión iniciada
const privadas = [
  'index',
  'muro',
  'profesor/asistencia',
  'profesor/notas',
  'profesor/anotaciones',
  'apoderado/asistencia',
  'apoderado/notas',
  'apoderado/anotaciones',
] as const;

function Routes() {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!usuario}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!usuario}>
        {privadas.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </ThemeProvider>
  );
}
