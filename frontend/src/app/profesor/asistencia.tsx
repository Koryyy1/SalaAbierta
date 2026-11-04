import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  colorEstado,
  CourseScreen,
  Empty,
  hoyISO,
  Loading,
  messageOf,
  Notice,
  SelectorFecha,
  useAsync,
  useToast,
} from '@/components/ui';
import { api, type EstadoAsistencia } from '@/lib/api';
import { Text } from '@/components/texto';

const ESTADOS: EstadoAsistencia[] = ['presente', 'ausente', 'atrasado', 'justificado'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function Pasar({ cursoId }: { cursoId: number }) {
  const [fecha, setFecha] = useState(hoyISO());
  const fechaOk = FECHA.test(fecha) && !Number.isNaN(Date.parse(fecha));
  // AAAA-MM-DD se compara bien como texto; no se permite registrar días que aún no ocurren
  const esFutura = fechaOk && fecha > hoyISO();
  const { data, error, loading, reload } = useAsync(
    () => (fechaOk ? api.asistenciaCurso(cursoId, fecha) : Promise.resolve([])),
    [cursoId, fecha, fechaOk],
  );
  const [estados, setEstados] = useState<Record<number, EstadoAsistencia>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; ok: boolean } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const toast = useToast();

  // Alumnos sin registro quedan en "presente" por defecto
  useEffect(() => {
    if (data) setEstados(Object.fromEntries(data.map((r) => [r.alumno_id, r.estado ?? 'presente'])));
  }, [data]);

  const cambiarFecha = (nueva: string) => {
    setMensaje(null);
    setFecha(nueva);
  };

  // Resumen de lo que quedó guardado en el servidor para esta fecha
  const guardados = data?.filter((r) => r.estado) ?? [];
  const conteo = Object.fromEntries(ESTADOS.map((e) => [e, guardados.filter((r) => r.estado === e).length])) as Record<
    EstadoAsistencia,
    number
  >;
  const porcentaje = guardados.length ? Math.round(((conteo.presente + conteo.atrasado) / guardados.length) * 100) : null;
  const noPresentes = guardados.filter((r) => r.estado !== 'presente');

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      await api.guardarAsistencia(
        cursoId,
        fecha,
        Object.entries(estados).map(([id, estado]) => ({ alumno_id: Number(id), estado })),
      );
      toast('Asistencia guardada');
      await reload();
    } catch (e) {
      setMensaje({ texto: messageOf(e), ok: false });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Card>
        <SelectorFecha value={fecha} onChange={cambiarFecha} max={hoyISO()} />
        {!fechaOk && <Notice text="Fecha inválida." />}
        {esFutura && <Notice text="No se puede registrar asistencia en una fecha futura." />}
      </Card>
      {fechaOk && !loading && data && !!data.length && (
        <Card>
          <Text style={styles.resumenTitulo}>{guardados.length ? 'Asistencia registrada' : 'Asistencia sin registrar'}</Text>
          {guardados.length ? (
            <>
              <Text style={styles.resumenGrande}>
                {porcentaje}% asistió ({conteo.presente + conteo.atrasado} de {guardados.length})
              </Text>
              <View style={styles.row}>
                {ESTADOS.map((e) => (
                  <Text key={e} style={[styles.conteo, { color: colorEstado[e] }]}>
                    {conteo[e]} {e}
                  </Text>
                ))}
              </View>
              {noPresentes.map((r) => (
                <Text key={r.alumno_id} style={styles.detalle}>
                  <Text style={{ color: colorEstado[r.estado!], fontWeight: '800' }}>{r.estado}</Text>: {r.nombre}
                </Text>
              ))}
              {!noPresentes.length && <Text style={styles.detalle}>Todo el curso estuvo presente.</Text>}
            </>
          ) : (
            <Text style={styles.detalle}>Todavía no se guarda la asistencia de este día.</Text>
          )}
        </Card>
      )}
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
          <Button label={guardando ? 'Guardando…' : 'Guardar asistencia'} onPress={guardar} disabled={guardando || esFutura} />
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
  resumenTitulo: { color: '#5d3b2b', fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  resumenGrande: { color: '#241610', fontSize: 20, fontWeight: '800' },
  conteo: { fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  detalle: { color: '#241610', fontSize: 15 },
});
