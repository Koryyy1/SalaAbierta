import { useState } from 'react';
import { View } from 'react-native';

import { Icono } from '@/components/icono';
import { Text } from '@/components/texto';
import { Button, Card, colors, Field, formatFecha, messageOf, Notice, Screen } from '@/components/ui';
import { api, type VerificacionCertificado } from '@/lib/api';
import { NOMBRE_CERTIFICADO } from '@/lib/certificado';

// La dirección comprueba que un certificado presentado en papel o por mensaje fue emitido por la app.
// Solo se muestra lo necesario para validarlo: no aparecen notas ni asistencia.
export default function VerificarCertificado() {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState<VerificacionCertificado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  const verificar = async () => {
    if (!codigo.trim()) return setError('Escriba el código que aparece al pie del certificado.');
    setBuscando(true);
    setError(null);
    setResultado(null);
    try {
      setResultado(await api.verificarCertificado(codigo));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBuscando(false);
    }
  };

  return (
    <Screen title="Verificar certificado">
      <Card>
        <Text style={{ color: colors.ink, fontSize: 15 }}>
          Escriba el código de verificación que aparece al pie del certificado para comprobar que fue emitido desde SalaAbierta.
        </Text>
        <Field
          label="Código de verificación"
          value={codigo}
          onChangeText={setCodigo}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="SA-2026-XXXXXXXX"
          onSubmitEditing={() => void verificar()}
          maxLength={20}
        />
        <Notice text={error} />
        <Button label={buscando ? 'Verificando…' : 'Verificar'} onPress={() => void verificar()} disabled={buscando} />
      </Card>

      {resultado && (
        <Card>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
            <Icono nombre="logrado" size={26} color={colors.ok} />
            <Text style={{ color: colors.ok, fontSize: 18, fontWeight: '800' }}>Certificado auténtico</Text>
          </View>
          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{NOMBRE_CERTIFICADO[resultado.tipo]}</Text>
          <Text style={{ color: colors.ink, fontSize: 16 }}>
            {resultado.alumno} · {resultado.curso}
          </Text>
          <Text style={{ color: colors.textoSecundario, fontSize: 15 }}>
            Emitido el {formatFecha(resultado.emitido_en)} a petición de {resultado.solicitado_por}.
          </Text>
          <Text style={{ color: colors.textoSecundario, fontSize: 15 }}>Código {resultado.codigo}</Text>
        </Card>
      )}
    </Screen>
  );
}
