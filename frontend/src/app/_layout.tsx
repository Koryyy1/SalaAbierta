import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { FUENTE } from '@/components/texto';
import { ToastProvider } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

// Rutas privadas: solo accesibles con sesión iniciada
const privadas = [
  'index',
  'muro',
  'profesor/asistencia',
  'profesor/notas',
  'profesor/anotaciones',
  'profesor/alertas',
  'apoderado/asistencia',
  'apoderado/notas',
  'apoderado/anotaciones',
  'apoderado/asistente',
  'admin/resumen',
  'admin/auditoria',
  'admin/umbrales',
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
  // Tipografía accesible (Atkinson Hyperlegible). Si falla la carga, la app sigue con la fuente del sistema.
  const [fuentesListas, errorFuentes] = useFonts({
    [FUENTE.normal]: require('@/assets/fonts/AtkinsonHyperlegible-Regular.ttf'),
    [FUENTE.negrita]: require('@/assets/fonts/AtkinsonHyperlegible-Bold.ttf'),
  });
  if (!fuentesListas && !errorFuentes) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AuthProvider>
        <ToastProvider>
          <Routes />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
