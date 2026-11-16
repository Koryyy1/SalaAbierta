import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, messageOf, Notice } from '@/components/ui';
import { api, type PerfilDemo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/texto';

export default function LoginScreen() {
  const { iniciarSesion, entrarDemo } = useAuth();
  const [perfiles, setPerfiles] = useState<PerfilDemo[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(email.trim(), password);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setEnviando(false);
    }
  };

  // Acceso de demostración: si el servidor lo tiene activo, se ofrecen las cuentas de prueba sin pedir credenciales
  useEffect(() => {
    let activo = true;
    api
      .perfilesDemo()
      .then((p) => activo && setPerfiles(p))
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const entrarComo = async (perfil: string) => {
    setEnviando(true);
    setError(null);
    try {
      await entrarDemo(perfil);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark} accessible={false}>
            <Text style={styles.brandMarkText}>SA</Text>
          </View>
          <Text style={styles.brand} accessibilityRole="header">
            SALA ABIERTA
          </Text>
          <Text style={styles.lema}>El colegio y la familia, en la misma sala.</Text>
          <View style={styles.panel}>
            <Text style={styles.heading}>Iniciar sesión</Text>
            <Text style={styles.ayuda}>Use el correo y la contraseña que le entregó el colegio.</Text>
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholder="correo@colegio.cl"
            />
            <Field
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              onSubmitEditing={enviar}
              placeholder="••••••••"
            />
            <Notice text={error} />
            <Button label={enviando ? 'Ingresando…' : 'Ingresar'} onPress={enviar} disabled={enviando} />
          </View>
          {perfiles.length > 0 && (
            <View style={styles.demo}>
              <Text style={styles.demoTitulo} accessibilityRole="header">
                ¿Solo quiere conocer la app?
              </Text>
              <Text style={styles.demoAyuda}>Entre con una cuenta de demostración. No necesita registrarse y los datos son de ejemplo.</Text>
              {perfiles.map((p) => (
                <Button key={p.id} label={`Entrar como ${p.etiqueta.toLowerCase()}`} tone="secondary" onPress={() => void entrarComo(p.id)} disabled={enviando} />
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', flexGrow: 1, justifyContent: 'center', padding: 20 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: colors.brown,
    borderRadius: 26,
    height: 92,
    justifyContent: 'center',
    transform: [{ rotate: '-4deg' }],
    width: 92,
  },
  brandMarkText: { color: colors.sand, fontSize: 36, fontWeight: '800', letterSpacing: 1 },
  brand: { color: colors.brown, fontSize: 18, fontWeight: '800', letterSpacing: 3, marginTop: 14 },
  lema: { color: colors.textoSecundario, fontSize: 16, marginBottom: 24, marginTop: 4, textAlign: 'center' },
  ayuda: { color: colors.textoSecundario, fontSize: 15, marginTop: -6 },
  panel: { backgroundColor: colors.sand, borderRadius: 28, gap: 14, maxWidth: 420, padding: 22, width: '100%' },
  demo: { borderColor: colors.sandDark, borderRadius: 28, borderWidth: 1.5, gap: 10, marginTop: 16, maxWidth: 420, padding: 22, width: '100%' },
  demoTitulo: { color: colors.brown, fontSize: 18, fontWeight: '800' },
  demoAyuda: { color: colors.textoSecundario, fontSize: 15, marginBottom: 2 },
  heading: { color: colors.brown, fontSize: 22, fontWeight: '800' },
});
