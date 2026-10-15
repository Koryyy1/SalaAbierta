import { useState } from 'react';
import { Text } from 'react-native';
import { View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  colors,
  CourseScreen,
  Empty,
  Field,
  formatFecha,
  Loading,
  messageOf,
  Notice,
  StudentPicker,
  useAsync,
} from '@/components/ui';
import { api, type TipoAnotacion } from '@/lib/api';

const TIPOS: { tipo: TipoAnotacion; texto: string; color: string }[] = [
  { tipo: 'positiva', texto: 'Positiva', color: colors.ok },
  { tipo: 'negativa', texto: 'Negativa', color: colors.danger },
  { tipo: 'observacion', texto: 'Observación', color: colors.warn },
];

function AnotacionesAlumno({ alumnoId }: { alumnoId: number }) {
  const { data, error, loading, reload } = useAsync(() => api.anotaciones(alumnoId), [alumnoId]);
  const [tipo, setTipo] = useState<TipoAnotacion>('observacion');
  const [descripcion, setDescripcion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const crear = async () => {
    if (!descripcion.trim()) return setFormError('Escribe la descripción de la anotación.');
    try {
      await api.crearAnotacion(alumnoId, { tipo, descripcion: descripcion.trim() });
      setDescripcion('');
      setFormError(null);
      await reload();
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  return (
    <>
      <Card>
        <Text style={{ color: colors.brown, fontWeight: '800' }}>NUEVA ANOTACIÓN</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TIPOS.map((t) => (
            <Chip key={t.tipo} label={t.texto} color={t.color} selected={tipo === t.tipo} onPress={() => setTipo(t.tipo)} />
          ))}
        </View>
        <Field label="Descripción" value={descripcion} onChangeText={setDescripcion} multiline />
        <Notice text={formError} />
        <Button label="Registrar anotación" onPress={crear} />
      </Card>
      {loading ? <Loading /> : <Notice text={error} />}
      {data && !data.length && <Empty text="Sin anotaciones registradas." />}
      {data?.map((a) => {
        const t = TIPOS.find((x) => x.tipo === a.tipo)!;
        return (
          <Card key={a.id}>
            <Text style={{ color: t.color, fontWeight: '800' }}>{t.texto}</Text>
            <Text style={{ color: colors.ink, fontSize: 15 }}>{a.descripcion}</Text>
            <Text style={{ color: '#7a5640', fontSize: 12 }}>{formatFecha(a.fecha)}</Text>
          </Card>
        );
      })}
    </>
  );
}

export default function AnotacionesProfesor() {
  return (
    <CourseScreen title="Anotaciones">
      {(curso) => (
        <StudentPicker key={curso.id} cursoId={curso.id}>
          {(alumno) => <AnotacionesAlumno key={alumno.id} alumnoId={alumno.id} />}
        </StudentPicker>
      )}
    </CourseScreen>
  );
}
