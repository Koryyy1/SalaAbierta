import { StyleSheet, Text, View } from 'react-native';

import { Card, colors, Empty, Loading, Notice, Screen, useAsync } from '@/components/ui';
import { api } from '@/lib/api';

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Indicador({ etiqueta, valor, alerta }: { etiqueta: string; valor: string; alerta?: boolean }) {
  return (
    <View style={styles.indicador}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={[styles.valor, alerta && { color: colors.danger }]}>{valor}</Text>
    </View>
  );
}

// Dirección: indicadores agregados por curso (sin datos individuales de alumnos)
export default function ResumenColegio() {
  const { data, error, loading } = useAsync(() => api.resumenDireccion(), []);

  return (
    <Screen title="Resumen del colegio">
      {loading ? <Loading /> : <Notice text={error} />}
      {data && (
        <Card>
          <Text style={styles.seccion}>TODO EL COLEGIO</Text>
          <View style={styles.fila}>
            <Indicador etiqueta="Alumnos" valor={String(data.colegio.alumnos)} />
            <Indicador etiqueta="Asistencia" valor={data.colegio.asistencia === null ? '—' : `${data.colegio.asistencia}%`} />
          </View>
          <View style={styles.fila}>
            <Indicador etiqueta="Cursos" valor={String(data.colegio.cursos)} />
            <Indicador etiqueta="Alumnos con alerta" valor={String(data.colegio.alumnosConAlerta)} alerta={data.colegio.alumnosConAlerta > 0} />
          </View>
        </Card>
      )}
      {data && !data.datos.length && <Empty text="No hay cursos registrados." />}
      {data?.datos.map((c) => (
        <Card key={c.id}>
          <Text style={styles.curso}>{c.nombre}</Text>
          <View style={styles.fila}>
            <Indicador etiqueta="Promedio" valor={c.promedio === null ? '—' : decimal(c.promedio)} alerta={c.promedio !== null && c.promedio < 4} />
            <Indicador etiqueta="Asistencia" valor={c.asistencia === null ? '—' : `${c.asistencia}%`} alerta={c.asistencia !== null && c.asistencia < 85} />
          </View>
          <Text style={styles.detalle}>
            {c.alumnos} {c.alumnos === 1 ? 'alumno' : 'alumnos'} ·{' '}
            {c.alumnosConAlerta
              ? `${c.alumnosConAlerta} con alerta (${c.alertasPromedio} de promedio, ${c.alertasAsistencia} de asistencia)`
              : 'sin alertas activas'}
          </Text>
        </Card>
      ))}
      <Text style={styles.nota}>
        Los indicadores se calculan con todas las notas y la asistencia registradas. El detalle por alumno lo ve cada profesor en sus
        alertas tempranas.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  seccion: { color: colors.brown, fontSize: 14, fontWeight: '800' },
  fila: { flexDirection: 'row', gap: 10 },
  indicador: { backgroundColor: colors.white, borderRadius: 14, flex: 1, padding: 12 },
  etiqueta: { color: colors.textoSecundario, fontSize: 14, fontWeight: '700' },
  valor: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  curso: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  detalle: { color: colors.ink, fontSize: 15 },
  nota: { color: colors.sand, fontSize: 14, textAlign: 'center' },
});
