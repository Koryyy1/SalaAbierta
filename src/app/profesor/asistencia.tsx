import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  colorEstado,
  CourseScreen,
  Empty,
  Field,
  hoyISO,
  Loading,
  messageOf,
  Notice,
  useAsync,
} from '@/components/ui';
import { api, type EstadoAsistencia } from '@/lib/api';

const ESTADOS: EstadoAsistencia[] = ['presente', 'ausente', 'atrasado', 'justificado'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function Pasar({ cursoId }: { cursoId: number }) {
  const [fecha, setFecha] = useState(hoyISO());
  const fechaOk = FECHA.test(fecha) && !Number.isNaN(Date.parse(fecha));
  const { data, error, loading } = useAsync(
    () => (fechaOk ? api.asistenciaCurso(cursoId, fecha) : Promise.resolve([])),
    [cursoId, fecha, fechaOk],
  );
  const [estados, setEstados] = useState<Record<number, EstadoAsistencia>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Alumnos sin registro quedan en "presente" por defecto
  useEffect(() => {
    if (data) setEstados(Object.fromEntries(data.map((r) => [r.alumno_id, r.estado ?? 'presente'])));
    setMensaje(null);
  }, [data]);

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await api.guardarAsistencia(
        cursoId,
        fecha,
        Object.entries(estados).map(([id, estado]) => ({ alumno_id: Number(id), estado })),
      );
      setMensaje({ texto: 'Asistencia guardada.', ok: true });
    } catch (e) {
      setMensaje({ texto: messageOf(e), ok: false });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Card>
        <Field label="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} autoCapitalize="none" />
        {!fechaOk && <Notice text="Fecha inválida." />}
      </Card>
      {fechaOk && (loading ? <Loading /> : <Notice text={error} />)}
      {fechaOk && data && !data.length && <Empty text="El curso no tiene alumnos." />}
      {fechaOk &&
        data?.map((r) => (
          <Card key={r.alumno_id}>
            <Text style={styles.nombre}>{r.nombre}</Text>
            <View style={styles.row}>
              {ESTADOS.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  selected={estados[r.alumno_id] === e}
                  color={colorEstado[e]}
                  onPress={() => setEstados((prev) => ({ ...prev, [r.alumno_id]: e }))}
                />
              ))}
            </View>
          </Card>
        ))}
      {fechaOk && !!data?.length && (
        <>
          <Notice text={mensaje && !mensaje.ok ? mensaje.texto : null} />
          <Notice tone="ok" text={mensaje?.ok ? mensaje.texto : null} />
          <Button label={guardando ? 'Guardando…' : 'Guardar asistencia'} onPress={guardar} disabled={guardando} />
        </>
      )}
    </>
  );
}

export default function AsistenciaProfesor() {
  return <CourseScreen title="Pasar asistencia">{(curso) => <Pasar key={curso.id} cursoId={curso.id} />}</CourseScreen>;
}

const styles = StyleSheet.create({
  nombre: { color: '#241610', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
