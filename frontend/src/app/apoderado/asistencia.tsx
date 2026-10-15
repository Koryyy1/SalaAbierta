import { Text, View } from 'react-native';

import { Card, colorEstado, colors, Empty, formatFecha, Loading, Notice, PupilScreen, useAsync } from '@/components/ui';
import { api } from '@/lib/api';

function Asistencia({ alumnoId }: { alumnoId: number }) {
  const { data, error, loading } = useAsync(() => api.asistenciaAlumno(alumnoId), [alumnoId]);
  if (loading) return <Loading />;
  return (
    <>
      <Notice text={error} />
      {data && (
        <Card>
          <Text style={{ color: colors.brown, fontWeight: '800' }}>ASISTENCIA</Text>
          <Text style={{ color: colors.ink, fontSize: 40, fontWeight: '800' }}>
            {data.porcentaje === null ? '—' : `${data.porcentaje}%`}
          </Text>
        </Card>
      )}
      {data && !data.datos.length && <Empty text="Aún no hay registros de asistencia." />}
      {data?.datos.map((r) => (
        <Card key={r.fecha}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink, fontWeight: '700' }}>{formatFecha(r.fecha)}</Text>
            <Text style={{ color: colorEstado[r.estado], fontWeight: '800', textTransform: 'capitalize' }}>{r.estado}</Text>
          </View>
        </Card>
      ))}
    </>
  );
}

export default function AsistenciaApoderado() {
  return <PupilScreen title="Asistencia">{(alumno) => <Asistencia key={alumno.id} alumnoId={alumno.id} />}</PupilScreen>;
}
