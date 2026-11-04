import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card, colors, CourseScreen, Empty, formatFecha, Loading, Notice, useAsync } from '@/components/ui';
import { api, type Alerta } from '@/lib/api';
import { Text } from '@/components/texto';

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function describir(a: Alerta) {
  return a.tipo === 'promedio'
    ? { titulo: 'Promedio bajo', detalle: `Promedio ${decimal(a.valor)} (umbral ${decimal(a.umbral)})`, color: colors.danger }
    : { titulo: 'Asistencia baja', detalle: `Asistencia ${a.valor}% (umbral ${a.umbral}%)`, color: colors.warn };
}

// HU010: alertas activas del curso. Desaparecen solas cuando el estudiante se recupera.
function Alertas({ cursoId }: { cursoId: number }) {
  const { data, error, loading } = useAsync(() => api.alertasCurso(cursoId), [cursoId]);
  if (loading) return <Loading />;
  return (
    <>
      <Notice text={error} />
      {data && !data.length && <Empty icono="logrado" text="No hay alertas activas en este curso. ¡Todos van bien!" />}
      {data?.map((a, i) => {
        const d = describir(a);
        return (
          <Animated.View key={a.id} entering={FadeInDown.delay(i * 70).duration(300)}>
          <Card>
            <Text style={[styles.titulo, { color: d.color }]}>{d.titulo}</Text>
            <Text style={styles.alumno}>{a.alumno}</Text>
            <Text style={styles.detalle}>{d.detalle}</Text>
            <Text style={styles.fecha}>Desde el {formatFecha(a.creada_en)}</Text>
          </Card>
          </Animated.View>
        );
      })}
    </>
  );
}

export default function AlertasProfesor() {
  return <CourseScreen title="Alertas tempranas">{(curso) => <Alertas key={curso.id} cursoId={curso.id} />}</CourseScreen>;
}

const styles = StyleSheet.create({
  titulo: { fontSize: 15, fontWeight: '800', textTransform: 'uppercase' },
  alumno: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  detalle: { color: colors.ink, fontSize: 16 },
  fecha: { color: colors.textoSecundario, fontSize: 14 },
});
