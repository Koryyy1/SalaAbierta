import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, colors, Field, messageOf, Notice } from '@/components/ui';
import { useAuth } from '@/lib/auth';

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
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>SA</Text>
        </View>
        <Text style={styles.brand}>SALA ABIERTA</Text>
        <View style={styles.panel}>
          <Text style={styles.heading}>Iniciar sesión</Text>
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
    borderRadius: 18,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  brandMarkText: { color: colors.sand, fontSize: 24, fontWeight: '800' },
  brand: { color: colors.brown, fontSize: 14, fontWeight: '800', letterSpacing: 2, marginBottom: 24, marginTop: 8 },
  panel: { backgroundColor: colors.sand, borderRadius: 28, gap: 14, maxWidth: 420, padding: 22, width: '100%' },
  heading: { color: colors.brown, fontSize: 22, fontWeight: '800' },
});
