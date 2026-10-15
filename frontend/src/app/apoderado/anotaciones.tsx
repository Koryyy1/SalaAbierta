import { Text } from 'react-native';

import { Card, colors, Empty, formatFecha, Loading, Notice, PupilScreen, useAsync } from '@/components/ui';
import { api, type TipoAnotacion } from '@/lib/api';

const etiqueta: Record<TipoAnotacion, { texto: string; color: string }> = {
  positiva: { texto: 'Positiva', color: colors.ok },
  negativa: { texto: 'Negativa', color: colors.danger },
  observacion: { texto: 'Observación', color: colors.warn },
};

function Anotaciones({ alumnoId }: { alumnoId: number }) {
  const { data, error, loading } = useAsync(() => api.anotaciones(alumnoId), [alumnoId]);
  if (loading) return <Loading />;
  return (
    <>
      <Notice text={error} />
      {data && !data.length && <Empty text="Sin anotaciones registradas." />}
      {data?.map((a) => (
        <Card key={a.id}>
          <Text style={{ color: etiqueta[a.tipo].color, fontWeight: '800' }}>{etiqueta[a.tipo].texto}</Text>
          <Text style={{ color: colors.ink, fontSize: 15 }}>{a.descripcion}</Text>
          <Text style={{ color: '#7a5640', fontSize: 12 }}>{formatFecha(a.fecha)}</Text>
        </Card>
      ))}
    </>
  );
}

export default function AnotacionesApoderado() {
  return <PupilScreen title="Anotaciones">{(alumno) => <Anotaciones key={alumno.id} alumnoId={alumno.id} />}</PupilScreen>;
}
