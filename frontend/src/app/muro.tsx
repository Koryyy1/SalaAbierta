import { useState } from 'react';
import { Text } from 'react-native';

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
  PupilScreen,
  useAsync,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { api, type Anuncio } from '@/lib/api';

function AnuncioCard({ anuncio, esApoderado, onChange }: { anuncio: Anuncio; esApoderado: boolean; onChange: () => void }) {
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ejecutar = async (accion: () => Promise<unknown>) => {
    try {
      await accion();
      setError(null);
      onChange();
    } catch (e) {
      setError(messageOf(e));
    }
  };

  const comentar = () =>
    comentario.trim() &&
    ejecutar(async () => {
      await api.comentarAnuncio(anuncio.id, comentario.trim());
      setComentario('');
    });

  return (
    <Card>
      <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800' }}>{anuncio.titulo}</Text>
      <Text style={{ color: '#7a5640', fontSize: 12 }}>
        {anuncio.autor} · {formatFecha(anuncio.creado_en)}
      </Text>
      <Text style={{ color: colors.ink, fontSize: 15 }}>{anuncio.contenido}</Text>
      <Text style={{ color: colors.brown, fontWeight: '700' }}>
        {anuncio.confirmaciones} {anuncio.confirmaciones === 1 ? 'confirmación' : 'confirmaciones'}
      </Text>

      {esApoderado &&
        (anuncio.confirmado ? (
          <Text style={{ color: colors.ok, fontWeight: '800' }}>✓ Recepción confirmada</Text>
        ) : (
          <Button label="Confirmar recepción" onPress={() => ejecutar(() => api.confirmarAnuncio(anuncio.id))} />
        ))}

      {anuncio.comentarios.map((c) => (
        <Text key={c.id} style={{ color: colors.ink }}>
          <Text style={{ fontWeight: '800' }}>{c.autor}: </Text>
          {c.contenido}
        </Text>
      ))}

      <Field label="Comentar" value={comentario} onChangeText={setComentario} onSubmitEditing={comentar} />
      <Notice text={error} />
      <Button label="Enviar comentario" tone="secondary" onPress={comentar} />
    </Card>
  );
}

function Muro({ cursoId, esApoderado }: { cursoId: number; esApoderado: boolean }) {
  const { data, error, loading, reload } = useAsync(() => api.anuncios(cursoId), [cursoId]);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const publicar = async () => {
    if (!titulo.trim() || !contenido.trim()) return setFormError('Completa título y contenido.');
    try {
      await api.crearAnuncio(cursoId, { titulo: titulo.trim(), contenido: contenido.trim() });
      setTitulo('');
      setContenido('');
      setFormError(null);
      await reload();
    } catch (e) {
      setFormError(messageOf(e));
    }
  };

  return (
    <>
      {!esApoderado && (
        <Card>
          <Text style={{ color: colors.brown, fontWeight: '800' }}>NUEVO ANUNCIO</Text>
          <Field label="Título" value={titulo} onChangeText={setTitulo} />
          <Field label="Contenido" value={contenido} onChangeText={setContenido} multiline />
          <Notice text={formError} />
          <Button label="Publicar anuncio" onPress={publicar} />
        </Card>
      )}
      {loading ? <Loading /> : <Notice text={error} />}
      {data && !data.length && <Empty text="No hay anuncios publicados." />}
      {data?.map((a) => (
        <AnuncioCard key={a.id} anuncio={a} esApoderado={esApoderado} onChange={reload} />
      ))}
    </>
  );
}

export default function MuroScreen() {
  const { usuario } = useAuth();

  if (usuario?.rol === 'Apoderado') {
    return (
      <PupilScreen title="Muro del curso">
        {(alumno) => <Muro key={alumno.id} cursoId={alumno.curso_id!} esApoderado />}
      </PupilScreen>
    );
  }
  return (
    <CourseScreen title="Muro del curso">{(curso) => <Muro key={curso.id} cursoId={curso.id} esApoderado={false} />}</CourseScreen>
  );
}
