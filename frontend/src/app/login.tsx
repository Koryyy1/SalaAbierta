import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, messageOf, Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/texto';

export default function LoginScreen() {
  const { iniciarSesion } = useAuth();
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 20 },
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
  heading: { color: colors.brown, fontSize: 22, fontWeight: '800' },
});
