import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  Button,
  Card,
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
import { api, type Calificacion } from '@/lib/api';

const parseNota = (valor: string) => Number(valor.replace(',', '.'));
const notaOk = (n: number) => Number.isFinite(n) && n >= 1 && n <= 7 && Math.round(n * 10) === n * 10;

function FilaNota({ nota, onSaved }: { nota: Calificacion; onSaved: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nota.nota.toFixed(1));
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const n = parseNota(valor);
    if (!notaOk(n)) return setError('La nota debe estar entre 1.0 y 7.0 (un decimal).');
    try {
      await api.editarCalificacion(nota.id, { nota: n });
      setEditando(false);
      setError(null);
      onSaved();
    } catch (e) {
      setError(messageOf(e));
    }
  };

  return (
    <Card>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800' }}>
        {nota.asignatura} · {nota.nota.toFixed(1)}
      </Text>
      <Text style={{ color: colors.brown }}>
        {nota.descripcion} · {formatFecha(nota.fecha)}
      </Text>
      {editando ? (
        <>
          <Field label="Nueva nota" value={valor} onChangeText={setValor} keyboardType="decimal-pad" />
          <Notice text={error} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button label="Guardar" onPress={guardar} />
            <Button label="Cancelar" tone="secondary" onPress={() => setEditando(false)} />
          </View>
        </>
      ) : (
        <Button label="Editar nota" tone="secondary" onPress={() => setEditando(true)} />
      )}
    </Card>
  );
}

function NotasAlumno({ alumnoId }: { alumnoId: number }) {
  const { data, error, loading, reload } = useAsync(() => api.calificaciones(alumnoId), [alumnoId]);
  const [asignatura, setAsignatura] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [nota, setNota] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const crear = async () => {
    const n = parseNota(nota);
    if (!asignatura.trim() || !descripcion.trim() || !notaOk(n)) {
      return setFormError('Completa asignatura, descripción y una nota entre 1.0 y 7.0.');
    }
    try {
      await api.crearCalificacion(alumnoId, { asignatura: asignatura.trim(), descripcion: descripcion.trim(), nota: n });
      setAsignatura('');
      setDescripcion('');
      setNota('');
      setFormError(null);
      await reload();
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  return (
    <>
      <Card>
        <Text style={{ color: colors.brown, fontWeight: '800' }}>NUEVA CALIFICACIÓN</Text>
        <Field label="Asignatura" value={asignatura} onChangeText={setAsignatura} />
        <Field label="Descripción" value={descripcion} onChangeText={setDescripcion} />
        <Field label="Nota (1.0 - 7.0)" value={nota} onChangeText={setNota} keyboardType="decimal-pad" />
        <Notice text={formError} />
        <Button label="Registrar nota" onPress={crear} />
      </Card>
      {loading ? <Loading /> : <Notice text={error} />}
      {data && (
        <Text style={{ color: colors.sand, fontWeight: '800' }}>Promedio: {data.promedio?.toFixed(1) ?? '—'}</Text>
      )}
      {data && !data.datos.length && <Empty text="Aún no hay calificaciones." />}
      {data?.datos.map((n) => <FilaNota key={`${n.id}-${n.nota}`} nota={n} onSaved={reload} />)}
    </>
  );
}

export default function NotasProfesor() {
  return (
    <CourseScreen title="Registrar notas">
      {(curso) => (
        <StudentPicker key={curso.id} cursoId={curso.id}>
          {(alumno) => <NotasAlumno key={alumno.id} alumnoId={alumno.id} />}
        </StudentPicker>
      )}
    </CourseScreen>
  );
}
