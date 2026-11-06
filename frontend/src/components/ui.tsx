import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icono, type NombreIcono } from '@/components/icono';
import { FUENTE, Text } from '@/components/texto';
import { api, type Alumno, type Curso, type EstadoAsistencia } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// Vibración corta al tocar (solo en el teléfono; en web no aporta)
export const vibrar = {
  toque: () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  exito: () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error: () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

// --- Mensajes flotantes ("toast"): confirman una acción y desaparecen solos ---
type Toast = { id: number; texto: string; tono: 'ok' | 'error' };
const ToastContext = createContext<(texto: string, tono?: Toast['tono']) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrar = useCallback((texto: string, tono: Toast['tono'] = 'ok') => {
    if (temporizador.current) clearTimeout(temporizador.current);
    setToast({ id: Date.now(), texto, tono });
    if (tono === 'ok') vibrar.exito();
    else vibrar.error();
    temporizador.current = setTimeout(() => setToast(null), 2800);
  }, []);

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      {toast && (
        <View pointerEvents="none" style={styles.toastZona}>
          <Animated.View
            key={toast.id}
            entering={FadeInDown.duration(220)}
            exiting={FadeOutDown.duration(200)}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={[styles.toast, toast.tono === 'error' && { backgroundColor: colors.danger }]}>
            <Icono nombre={toast.tono === 'ok' ? 'ok' : 'error'} size={22} color={colors.white} />
            <Text style={styles.toastTexto}>{toast.texto}</Text>
          </Animated.View>
        </View>
      )}
    </ToastContext.Provider>
  );
}

export const colors = {
  brown: '#5d3b2b',
  sand: '#e6c7a8',
  sandDark: '#dcb894',
  orange: '#c9793f',
  ink: '#241610',
  muted: '#a2795c',
  white: '#ffffff',
  danger: '#b3261e',
  ok: '#2e7d32',
  warn: '#8a5200', // oscurecido para contraste 4,5:1 sobre el fondo arena (WCAG AA)
  textoSecundario: '#5d3b2b',
};

export function messageOf(e: unknown) {
  return e instanceof Error ? e.message : 'Error inesperado.';
}

// Carga datos asíncronos con estado de carga/error y recarga manual
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await run());
      setError(null);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }, [run]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backZona}>
          <Icono nombre="volver" size={18} color={colors.muted} />
          <Text style={styles.back}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Button({
  label,
  onPress,
  disabled,
  tone = 'primary',
  icono,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
  icono?: NombreIcono;
}) {
  const colorTexto = tone === 'secondary' ? colors.brown : '#1a1006';
  return (
    <Pressable
      onPress={() => {
        vibrar.toque();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        disabled && { opacity: 0.55 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}>
      {icono && <Icono nombre={icono} size={20} color={colorTexto} />}
      <Text style={[styles.buttonText, { color: colorTexto }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#8f7564"
        accessibilityLabel={label}
        {...rest}
        style={[styles.input, rest.multiline && { minHeight: 80, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        vibrar.toque();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && { backgroundColor: color ?? colors.brown, borderColor: color ?? colors.brown },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ text, tone = 'danger' }: { text: string | null; tone?: 'danger' | 'ok' }) {
  if (!text) return null;
  // Fondo sand en tarjetas; en el fondo marrón se usa un tono claro para mantener contraste
  return (
    <View
      accessibilityRole="alert"
      style={{ alignItems: 'center', backgroundColor: colors.sand, borderRadius: 12, flexDirection: 'row', gap: 8, padding: 12 }}>
      <Icono nombre={tone === 'ok' ? 'ok' : 'error'} size={20} color={tone === 'ok' ? colors.ok : colors.danger} />
      <Text style={{ color: tone === 'ok' ? colors.ok : colors.danger, flexShrink: 1, fontSize: 15, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

// Carga con siluetas: tarjetas que "respiran" mientras llegan los datos (estáticas si se reduce el movimiento)
export function Loading({ filas = 2 }: { filas?: number }) {
  const reducir = useReducedMotion();
  const opacidad = useSharedValue(0.55);
  useEffect(() => {
    if (!reducir) opacidad.value = withRepeat(withSequence(withTiming(1, { duration: 650 }), withTiming(0.55, { duration: 650 })), -1);
  }, [reducir, opacidad]);
  const animado = useAnimatedStyle(() => ({ opacity: opacidad.value }));
  return (
    <View accessibilityLabel="Cargando" accessibilityRole="progressbar" style={{ gap: 14 }}>
      {Array.from({ length: filas }, (_, i) => (
        <Animated.View key={i} style={[styles.silueta, animado]}>
          <View style={[styles.siluetaLinea, { width: '45%', height: 16 }]} />
          <View style={[styles.siluetaLinea, { width: '85%' }]} />
          <View style={[styles.siluetaLinea, { width: '65%' }]} />
        </Animated.View>
      ))}
    </View>
  );
}

// Estado vacío con ícono; "logrado" para buenas noticias (por ejemplo, sin alertas)
export function Empty({ text, icono = 'vacio' }: { text: string; icono?: NombreIcono }) {
  return (
    <View style={styles.vacio}>
      <View style={styles.vacioIcono}>
        <Icono nombre={icono} size={34} color={colors.sand} />
      </View>
      <Text style={styles.empty}>{text}</Text>
    </View>
  );
}

// Pantalla de apoderado: elige pupilo (solo los suyos) y entrega el seleccionado
export function PupilScreen({ title, children }: { title: string; children: (alumno: Alumno) => ReactNode }) {
  const { data: pupilos, error, loading } = useAsync(() => api.pupilos(), []);
  const [elegido, setElegido] = useState<number | null>(null);
  const alumno = pupilos?.find((p) => p.id === elegido) ?? pupilos?.[0];

  return (
    <Screen title={title}>
      {loading ? <Loading /> : <Notice text={error} />}
      {pupilos && pupilos.length > 1 && (
        <View style={styles.row}>
          {pupilos.map((p) => (
            <Chip key={p.id} label={p.nombre} selected={p.id === alumno?.id} onPress={() => setElegido(p.id)} />
          ))}
        </View>
      )}
      {pupilos && !pupilos.length && <Empty text="No tienes pupilos asociados." />}
      {alumno && (
        <>
          <Text style={styles.subtitle}>
            {alumno.nombre} · {alumno.curso}
          </Text>
          {children(alumno)}
        </>
      )}
    </Screen>
  );
}

// Pantalla de profesor: elige curso entre los suyos
export function CourseScreen({ title, children }: { title: string; children: (curso: Curso) => ReactNode }) {
  const { data: cursos, error, loading } = useAsync(() => api.cursos(), []);
  const [elegido, setElegido] = useState<number | null>(null);
  const curso = cursos?.find((c) => c.id === elegido) ?? cursos?.[0];

  return (
    <Screen title={title}>
      {loading ? <Loading /> : <Notice text={error} />}
      {cursos && cursos.length > 1 && (
        <View style={styles.row}>
          {cursos.map((c) => (
            <Chip key={c.id} label={c.nombre} selected={c.id === curso?.id} onPress={() => setElegido(c.id)} />
          ))}
        </View>
      )}
      {cursos && !cursos.length && <Empty text="No tienes cursos asignados." />}
      {curso && children(curso)}
    </Screen>
  );
}

export const colorEstado: Record<EstadoAsistencia, string> = {
  presente: colors.ok,
  ausente: colors.danger,
  atrasado: colors.warn,
  justificado: '#1565c0',
};

// Dentro de un curso, elige alumno y entrega el seleccionado
export function StudentPicker({ cursoId, children }: { cursoId: number; children: (alumno: Alumno) => ReactNode }) {
  const { data: alumnos, error, loading } = useAsync(() => api.alumnosDeCurso(cursoId), [cursoId]);
  const [elegido, setElegido] = useState<number | null>(null);
  const alumno = alumnos?.find((a) => a.id === elegido) ?? alumnos?.[0];

  return (
    <>
      {loading ? <Loading /> : <Notice text={error} />}
      <View style={styles.row}>
        {alumnos?.map((a) => (
          <Chip key={a.id} label={a.nombre} selected={a.id === alumno?.id} onPress={() => setElegido(a.id)} />
        ))}
      </View>
      {alumnos && !alumnos.length && <Empty text="El curso no tiene alumnos." />}
      {alumno && children(alumno)}
    </>
  );
}

export function LogoutLink() {
  const { cerrarSesion } = useAuth();
  return (
    <Pressable onPress={() => void cerrarSesion()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
      <Text style={styles.logout}>Cerrar sesión</Text>
    </Pressable>
  );
}

export const formatFecha = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};

export const hoyISO = () => {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${String(d.getDate()).padStart(2, '0')}`;
};

// Suma (o resta) días a una fecha AAAA-MM-DD sin problemas de zona horaria
export const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
};

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaSemana = (iso: string) => DIAS_SEMANA[new Date(`${iso}T12:00:00Z`).getUTCDay()];

// T9: selector de fecha sin escribir formatos. Avanza o retrocede de a un día y no pasa de "max".
export function SelectorFecha({ value, onChange, max }: { value: string; onChange: (iso: string) => void; max?: string }) {
  const puedeAvanzar = !max || value < max;
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>Fecha</Text>
      <View style={styles.selector}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Día anterior"
          onPress={() => onChange(sumarDias(value, -1))}
          style={styles.flecha}>
          <Text style={styles.flechaTexto}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.fechaGrande}>{formatFecha(value)}</Text>
          <Text style={styles.fechaDia}>{value === hoyISO() ? 'hoy' : diaSemana(value)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Día siguiente"
          disabled={!puedeAvanzar}
          onPress={() => onChange(sumarDias(value, 1))}
          style={[styles.flecha, !puedeAvanzar && { opacity: 0.35 }]}>
          <Text style={styles.flechaTexto}>›</Text>
        </Pressable>
      </View>
      {value !== hoyISO() && <Button label="Volver a hoy" tone="secondary" onPress={() => onChange(hoyISO())} />}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 6 },
  backZona: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 2, minHeight: 32 },
  back: { color: colors.muted, fontSize: 15, fontWeight: '700' },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.sand, fontSize: 14, fontWeight: '700' },
  body: {
    backgroundColor: colors.brown,
    borderRadius: 28,
    flexGrow: 1,
    gap: 14,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 16,
  },
  card: { backgroundColor: colors.sand, borderRadius: 18, gap: 10, padding: 16 },
  // T9: zonas táctiles de al menos 48 dp
  button: {
    alignItems: 'center',
    backgroundColor: colors.orange,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: 18,
  },
  buttonSecondary: { backgroundColor: 'transparent', borderColor: colors.brown, borderWidth: 1.5 },
  buttonText: { color: '#1a1006', fontSize: 16, fontWeight: '800' },
  label: { color: colors.brown, fontSize: 14, fontWeight: '800', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    color: colors.ink,
    fontFamily: FUENTE.normal,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.white,
    borderColor: colors.sand,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipText: { color: colors.brown, fontSize: 15, fontWeight: '700' },
  empty: { color: colors.sand, fontSize: 16, textAlign: 'center' },
  vacio: { alignItems: 'center', gap: 10, marginVertical: 18 },
  vacioIcono: {
    alignItems: 'center',
    backgroundColor: 'rgba(230, 199, 168, 0.14)',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  silueta: { backgroundColor: colors.sand, borderRadius: 18, gap: 10, padding: 16 },
  siluetaLinea: { backgroundColor: colors.sandDark, borderRadius: 8, height: 12 },
  toastZona: { alignItems: 'center', bottom: 28, left: 16, position: 'absolute', right: 16 },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.ok,
    borderRadius: 16,
    elevation: 6,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 480,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  toastTexto: { color: colors.white, flexShrink: 1, fontSize: 16, fontWeight: '700' },
  logout: { color: colors.brown, fontSize: 14, fontWeight: '800', textDecorationLine: 'underline' },
  selector: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 14, flexDirection: 'row', gap: 8, padding: 6 },
  flecha: { alignItems: 'center', backgroundColor: colors.sand, borderRadius: 12, height: 48, justifyContent: 'center', width: 56 },
  flechaTexto: { color: colors.brown, fontSize: 28, fontWeight: '800', lineHeight: 30 },
  fechaGrande: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  fechaDia: { color: colors.brown, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
});
