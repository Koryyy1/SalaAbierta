import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/texto';
import { Chip, colors, CourseScreen, Empty, Loading, Notice, PupilScreen, useAsync } from '@/components/ui';
import { api, type BloqueHorario } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

// Pausa entre dos bloques que no son seguidos: recreo o almuerzo, según cuánto dure
function Pausa({ desde, hasta }: { desde: string; hasta: string }) {
  const nombre = minutos(hasta) - minutos(desde) >= 40 ? 'Almuerzo' : 'Recreo';
  return (
    <Text style={styles.pausa}>
      {nombre} · {desde} a {hasta}
    </Text>
  );
}

// Horario semanal de un curso: se elige el día y se muestran sus bloques en orden
function HorarioCurso({ cursoId }: { cursoId: number }) {
  const { data, error, loading } = useAsync(() => api.horario(cursoId), [cursoId]);
  const [dia, setDia] = useState<number | null>(null);

  // Al abrir se muestra el día de hoy; en fin de semana, el lunes
  useEffect(() => {
    if (data && dia === null) setDia(data.hoy >= 1 && data.hoy <= 5 ? data.hoy : 1);
  }, [data, dia]);

  if (loading) return <Loading filas={4} />;
  if (error) return <Notice text={error} />;
  if (!data?.datos.length) return <Empty text="El horario de este curso todavía no está cargado." icono="horario" />;

  const elegido = dia ?? 1;
  const bloques = data.datos.filter((b) => b.dia === elegido);
  const finDeSemana = data.hoy > 5;

  return (
    <>
      <View style={styles.dias} accessibilityRole="tablist">
        {DIAS.map((nombre, i) => (
          <Chip key={nombre} label={DIAS_CORTOS[i]} selected={elegido === i + 1} onPress={() => setDia(i + 1)} />
        ))}
      </View>
      <Text style={styles.diaTitulo} accessibilityRole="header">
        {DIAS[elegido - 1]}
        {data.hoy === elegido ? ' · hoy' : ''}
      </Text>
      {finDeSemana && <Text style={styles.nota}>Hoy no hay clases. Se muestra el horario de la semana.</Text>}

      <View style={styles.lista}>
        {bloques.map((b: BloqueHorario, i) => {
          const anterior = bloques[i - 1];
          return (
            <View key={b.bloque} style={{ gap: 8 }}>
              {anterior && anterior.hora_fin !== b.hora_inicio && <Pausa desde={anterior.hora_fin} hasta={b.hora_inicio} />}
              <View
                style={styles.bloque}
                accessible
                accessibilityLabel={`${b.hora_inicio} a ${b.hora_fin}, ${b.asignatura}${b.profesor ? `, ${b.profesor}` : ''}`}>
                <View style={styles.hora}>
                  <Text style={styles.horaInicio}>{b.hora_inicio}</Text>
                  <Text style={styles.horaFin}>{b.hora_fin}</Text>
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.asignatura}>{b.asignatura}</Text>
                  {b.profesor && <Text style={styles.profesor}>{b.profesor}</Text>}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      {bloques.length > 0 && <Text style={styles.nota}>Salida: {bloques[bloques.length - 1].hora_fin}</Text>}
    </>
  );
}

// El apoderado ve el horario del curso de su pupilo; el profesor, el de cada uno de sus cursos
export default function HorarioScreen() {
  const { usuario } = useAuth();
  if (usuario?.rol === 'Profesor') {
    return <CourseScreen title="Horario">{(curso) => <HorarioCurso key={curso.id} cursoId={curso.id} />}</CourseScreen>;
  }
  return (
    <PupilScreen title="Horario">
      {(alumno) =>
        alumno.curso_id ? <HorarioCurso key={alumno.curso_id} cursoId={alumno.curso_id} /> : <Empty text="No se encontró el curso del estudiante." />
      }
    </PupilScreen>
  );
}

const styles = StyleSheet.create({
  dias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  diaTitulo: { color: colors.white, fontSize: 20, fontWeight: '800' },
  nota: { color: colors.sand, fontSize: 15 },
  lista: { gap: 8 },
  bloque: { alignItems: 'center', backgroundColor: colors.sand, borderRadius: 16, flexDirection: 'row', gap: 14, padding: 14 },
  hora: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, minWidth: 66, paddingHorizontal: 8, paddingVertical: 6 },
  horaInicio: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  horaFin: { color: colors.textoSecundario, fontSize: 14 },
  asignatura: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  profesor: { color: colors.textoSecundario, fontSize: 14 },
  pausa: { color: colors.sand, fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
