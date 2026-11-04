import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Chip, colors, Field, Loading, messageOf, Notice, PupilScreen } from '@/components/ui';
import { api, type Alumno, type RespuestaAgente } from '@/lib/api';

type Mensaje = { id: number; de: 'apoderado' | 'asistente'; texto: string; respuesta?: RespuestaAgente };

const SUGERENCIAS = ['¿Cuál es su promedio?', '¿Cuánta asistencia tiene?', '¿Tiene anotaciones?', '¿Hay anuncios nuevos?'];

const NOMBRE_SECCION: Record<string, string> = {
  '/apoderado/notas': 'Ver notas',
  '/apoderado/asistencia': 'Ver asistencia',
  '/apoderado/anotaciones': 'Ver anotaciones',
  '/muro': 'Ir al muro',
};

// HU009: asistente conversacional. Responde solo con información del pupilo seleccionado.
function Chat({ alumno }: { alumno: Alumno }) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (texto: string) => {
    const limpia = texto.trim();
    if (!limpia || enviando) return;
    setPregunta('');
    setError(null);
    setEnviando(true);
    setMensajes((prev) => [...prev, { id: Date.now(), de: 'apoderado', texto: limpia }]);
    try {
      const respuesta = await api.preguntarAgente(limpia, alumno.id);
      setMensajes((prev) => [...prev, { id: Date.now() + 1, de: 'asistente', texto: respuesta.respuesta, respuesta }]);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {!mensajes.length && (
        <Card>
          <Text style={styles.intro}>
            Hola, soy el asistente de SalaAbierta. Pregúnteme por las notas, la asistencia o las anotaciones de su pupilo, o cómo usar la
            aplicación.
          </Text>
          <View style={styles.row}>
            {SUGERENCIAS.map((s) => (
              <Chip key={s} label={s} selected={false} onPress={() => void enviar(s)} />
            ))}
          </View>
        </Card>
      )}

      {mensajes.map((m) =>
        m.de === 'apoderado' ? (
          <View key={m.id} style={[styles.burbuja, styles.propia]}>
            <Text style={styles.textoPropio}>{m.texto}</Text>
          </View>
        ) : (
          <View key={m.id} style={[styles.burbuja, styles.asistente]}>
            {m.respuesta?.aviso && <Text style={styles.aviso}>{m.respuesta.aviso}</Text>}
            <Text style={styles.textoAsistente}>{m.texto}</Text>
            {m.respuesta?.seccion && NOMBRE_SECCION[m.respuesta.seccion] && (
              <Button
                label={NOMBRE_SECCION[m.respuesta.seccion]}
                tone="secondary"
                onPress={() => router.push(m.respuesta!.seccion as Href)}
              />
            )}
            {m.respuesta?.modo === 'basico' && !m.respuesta.aviso && <Text style={styles.modo}>Respuesta automática sin IA</Text>}
          </View>
        ),
      )}

      {enviando && <Loading />}
      <Notice text={error} />

      <Card>
        <Field
          label="Escriba su pregunta"
          value={pregunta}
          onChangeText={setPregunta}
          onSubmitEditing={() => void enviar(pregunta)}
          placeholder="Por ejemplo: ¿cómo le fue en Matemática?"
          maxLength={500}
        />
        <Button label={enviando ? 'Enviando…' : 'Preguntar'} onPress={() => void enviar(pregunta)} disabled={enviando} />
      </Card>
    </>
  );
}

export default function AsistenteApoderado() {
  return <PupilScreen title="Asistente">{(alumno) => <Chat key={alumno.id} alumno={alumno} />}</PupilScreen>;
}

const styles = StyleSheet.create({
  intro: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  burbuja: { borderRadius: 16, gap: 8, maxWidth: '88%', padding: 12 },
  propia: { alignSelf: 'flex-end', backgroundColor: colors.orange },
  asistente: { alignSelf: 'flex-start', backgroundColor: colors.sand },
  textoPropio: { color: colors.white, fontSize: 15, fontWeight: '600' },
  textoAsistente: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  aviso: { color: colors.warn, fontSize: 13, fontWeight: '700' },
  modo: { color: '#7a5640', fontSize: 11 },
});
