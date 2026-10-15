import { Text } from 'react-native';

import { Card, Empty, formatFecha, Loading, Notice, PupilScreen, useAsync } from '@/components/ui';
import { api } from '@/lib/api';

function Notas({ alumnoId }: { alumnoId: number }) {
  const { data, error, loading } = useAsync(() => api.calificaciones(alumnoId), [alumnoId]);
  if (loading) return <Loading />;
  return (
    <>
      <Notice text={error} />
      {data && (
        <Card>
          <Text style={{ color: '#5d3b2b', fontWeight: '800' }}>PROMEDIO ACTUAL</Text>
          <Text style={{ color: '#241610', fontSize: 40, fontWeight: '800' }}>{data.promedio?.toFixed(1) ?? '—'}</Text>
        </Card>
      )}
      {data && !data.datos.length && <Empty text="Aún no hay calificaciones." />}
      {data?.datos.map((n) => (
        <Card key={n.id}>
          <Text style={{ color: '#241610', fontSize: 16, fontWeight: '800' }}>
            {n.asignatura} · {n.nota.toFixed(1)}
          </Text>
          <Text style={{ color: '#5d3b2b' }}>{n.descripcion}</Text>
          <Text style={{ color: '#7a5640', fontSize: 12 }}>{formatFecha(n.fecha)}</Text>
        </Card>
      ))}
    </>
  );
}

export default function NotasApoderado() {
  return <PupilScreen title="Notas">{(alumno) => <Notas key={alumno.id} alumnoId={alumno.id} />}</PupilScreen>;
}
