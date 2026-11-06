import * as Speech from 'expo-speech';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Icono } from '@/components/icono';
import { Escribiendo, SaliAvatar } from '@/components/sali';
import { Text } from '@/components/texto';
import { Button, Chip, colors, Field, messageOf, Notice, PupilScreen } from '@/components/ui';
import { api, type Alumno, type RespuestaAgente } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Mensaje = { id: number; de: 'apoderado' | 'sali'; texto: string; respuesta?: RespuestaAgente };

const SUGERENCIAS_INICIALES = ['¿Cómo le va en las notas?', '¿Cuánta asistencia tiene?', '¿Tiene anotaciones?', '¿Hay anuncios nuevos?'];

const NOMBRE_SECCION: Record<string, string> = {
  '/apoderado/notas': 'Ver notas',
  '/apoderado/asistencia': 'Ver asistencia',
  '/apoderado/anotaciones': 'Ver anotaciones',
  '/muro': 'Ir al muro',
};

const primerNombre = (nombre?: string | null) => (nombre ?? '').split(' ')[0];

// Burbuja de Sali: avatar, texto, botón de voz y acceso a la sección relacionada
function BurbujaSali({
  texto,
  respuesta,
  hablando,
  onHablar,
  onIr,
}: {
  texto: string;
  respuesta?: RespuestaAgente;
  hablando: boolean;
  onHablar: () => void;
  onIr: (href: Href) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={styles.filaSali}>
      <SaliAvatar size={38} />
      <View style={[styles.burbuja, styles.burbujaSali]}>
        {respuesta?.aviso && <Text style={styles.aviso}>{respuesta.aviso}</Text>}
        <Text style={styles.textoSali}>{texto}</Text>
        <View style={styles.acciones}>
          <Pressable
            onPress={onHablar}
            accessibilityRole="button"
            accessibilityLabel={hablando ? 'Detener lectura' : 'Escuchar respuesta'}
            hitSlop={8}
            style={styles.botonVoz}>
            <Icono nombre={hablando ? 'detener' : 'parlante'} size={20} color={colors.brown} />
            <Text style={styles.botonVozTexto}>{hablando ? 'Detener' : 'Escuchar'}</Text>
          </Pressable>
          {respuesta?.modo === 'basico' && !respuesta.aviso && <Text style={styles.modo}>Respuesta automática sin IA</Text>}
        </View>
        {respuesta?.seccion && NOMBRE_SECCION[respuesta.seccion] && (
          <Button label={NOMBRE_SECCION[respuesta.seccion]} tone="secondary" icono="siguiente" onPress={() => onIr(respuesta.seccion as Href)} />
        )}
      </View>
    </Animated.View>
  );
}

// HU009: conversación con Sali. Responde solo con información del pupilo seleccionado.
function Chat({ alumno }: { alumno: Alumno }) {
  const router = useRouter();
  const { usuario } = useAuth();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hablandoId, setHablandoId] = useState<number | null>(null);

  // Al salir de la pantalla se detiene la lectura en voz alta
  useEffect(() => () => void Speech.stop(), []);

  const saludo = `Hola, ${primerNombre(usuario?.nombre)}. Soy Sali, la asistente automática de SalaAbierta. Puedo contarle cómo va ${primerNombre(alumno.nombre)} en notas, asistencia y anotaciones, o ayudarle a usar la aplicación. ¿En qué le ayudo?`;
  const ultima = [...mensajes].reverse().find((m) => m.de === 'sali')?.respuesta;
  const sugerencias = ultima?.sugerencias ?? SUGERENCIAS_INICIALES;

  const hablar = (id: number, texto: string) => {
    void Speech.stop();
    if (hablandoId === id) return setHablandoId(null);
    setHablandoId(id);
    Speech.speak(texto, { language: 'es', rate: 0.95, onDone: () => setHablandoId(null), onStopped: () => setHablandoId(null) });
  };

  const enviar = async (texto: string) => {
    const limpia = texto.trim();
    if (!limpia || enviando) return;
    setPregunta('');
    setError(null);
    setEnviando(true);
    setMensajes((prev) => [...prev, { id: Date.now(), de: 'apoderado', texto: limpia }]);
    try {
      const respuesta = await api.preguntarAgente(limpia, alumno.id);
      setMensajes((prev) => [...prev, { id: Date.now() + 1, de: 'sali', texto: respuesta.respuesta, respuesta }]);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <BurbujaSali texto={saludo} hablando={hablandoId === 0} onHablar={() => hablar(0, saludo)} onIr={(h) => router.push(h)} />

      {mensajes.map((m) =>
        m.de === 'apoderado' ? (
          <Animated.View key={m.id} entering={FadeInDown.duration(220)} style={[styles.burbuja, styles.burbujaPropia]}>
            <Text style={styles.textoPropio}>{m.texto}</Text>
          </Animated.View>
        ) : (
          <BurbujaSali
            key={m.id}
            texto={m.texto}
            respuesta={m.respuesta}
            hablando={hablandoId === m.id}
            onHablar={() => hablar(m.id, m.texto)}
            onIr={(h) => router.push(h)}
          />
        ),
      )}

      {enviando && (
        <View style={styles.filaSali}>
          <SaliAvatar size={38} />
          <View style={[styles.burbuja, styles.burbujaSali, { paddingVertical: 16 }]}>
            <Escribiendo />
          </View>
        </View>
      )}
      <Notice text={error} />

      {!enviando && (
        <View style={styles.sugerencias}>
          {sugerencias.map((s) => (
            <Chip key={s} label={s} selected={false} onPress={() => void enviar(s)} />
          ))}
        </View>
      )}

      <View style={styles.entrada}>
        <Field
          label="Escriba su pregunta"
          value={pregunta}
          onChangeText={setPregunta}
          onSubmitEditing={() => void enviar(pregunta)}
          placeholder="Por ejemplo: ¿cómo le fue en Matemática?"
          maxLength={500}
        />
        <Button label={enviando ? 'Enviando…' : 'Preguntar a Sali'} icono="enviar" onPress={() => void enviar(pregunta)} disabled={enviando} />
      </View>
    </>
  );
}

export default function AsistenteApoderado() {
  return (
    <PupilScreen title="Sali · Asistente" alFinal>
      {(alumno) => <Chat key={alumno.id} alumno={alumno} />}
    </PupilScreen>
  );
}

const styles = StyleSheet.create({
  filaSali: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, maxWidth: '94%' },
  burbuja: { borderRadius: 18, gap: 8, padding: 14 },
  burbujaSali: { backgroundColor: colors.sand, borderBottomLeftRadius: 6, flexShrink: 1 },
  burbujaPropia: { alignSelf: 'flex-end', backgroundColor: colors.orange, borderBottomRightRadius: 6, maxWidth: '85%' },
  textoPropio: { color: '#1a1006', fontSize: 16, fontWeight: '700' },
  textoSali: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  aviso: { color: colors.warn, fontSize: 14, fontWeight: '700' },
  acciones: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  botonVoz: { alignItems: 'center', flexDirection: 'row', gap: 4, minHeight: 32 },
  botonVozTexto: { color: colors.brown, fontSize: 14, fontWeight: '700' },
  modo: { color: colors.textoSecundario, fontSize: 14 },
  sugerencias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  entrada: { backgroundColor: colors.sand, borderRadius: 18, gap: 10, padding: 14 },
});
