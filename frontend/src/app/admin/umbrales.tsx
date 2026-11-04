import { useEffect, useState } from 'react';

import { Button, Card, colors, Field, Loading, messageOf, Notice, Screen, useAsync, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { Text } from '@/components/texto';

// HU010: el Administrador configura cuándo se genera una alerta temprana
export default function UmbralesAdmin() {
  const { data, error, loading } = useAsync(() => api.umbrales(), []);
  const [promedio, setPromedio] = useState('');
  const [asistencia, setAsistencia] = useState('');
  const [notas, setNotas] = useState('');
  const [dias, setDias] = useState('');
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!data) return;
    setPromedio(String(data.promedio_minimo).replace('.', ','));
    setAsistencia(String(data.asistencia_minima));
    setNotas(String(data.notas_minimas));
    setDias(String(data.dias_minimos));
  }, [data]);

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.guardarUmbrales({
        promedio_minimo: Number(promedio.replace(',', '.')),
        asistencia_minima: Number(asistencia),
        notas_minimas: Number(notas),
        dias_minimos: Number(dias),
      });
      setMensaje(null);
      toast('Umbrales guardados. Las alertas se recalcularon.');
    } catch (e) {
      setMensaje({ ok: false, texto: messageOf(e) });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Screen title="Umbrales de alerta">
      {loading ? <Loading /> : <Notice text={error} />}
      {data && (
        <Card>
          <Text style={{ color: colors.ink, fontSize: 15 }}>
            Se genera una alerta cuando el promedio o la asistencia de un estudiante quedan bajo estos valores.
          </Text>
          <Field label="Promedio mínimo (1,0 a 7,0)" value={promedio} onChangeText={setPromedio} keyboardType="decimal-pad" />
          <Field label="Asistencia mínima (%)" value={asistencia} onChangeText={setAsistencia} keyboardType="number-pad" />
          <Field label="Notas mínimas para evaluar el promedio" value={notas} onChangeText={setNotas} keyboardType="number-pad" />
          <Field label="Días registrados mínimos para evaluar la asistencia" value={dias} onChangeText={setDias} keyboardType="number-pad" />
          <Notice text={mensaje && !mensaje.ok ? mensaje.texto : null} />
          <Button label={guardando ? 'Guardando…' : 'Guardar umbrales'} onPress={() => void guardar()} disabled={guardando} />
        </Card>
      )}
    </Screen>
  );
}
