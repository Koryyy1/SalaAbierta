import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, type Alumno, type Curso, type EstadoAsistencia } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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
  warn: '#b26a00',
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
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
          <Text style={styles.back}>‹ Volver</Text>
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
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        (pressed || disabled) && { opacity: 0.7 },
      ]}>
      <Text style={[styles.buttonText, tone === 'secondary' && { color: colors.brown }]}>{label}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#b9a08e"
        {...rest}
        style={[styles.input, rest.multiline && { minHeight: 80, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Chip({ label, selected, onPress, color }: { label: string; selected: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: color ?? colors.brown, borderColor: color ?? colors.brown }]}>
      <Text style={[styles.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Notice({ text, tone = 'danger' }: { text: string | null; tone?: 'danger' | 'ok' }) {
  if (!text) return null;
  // Fondo sand en tarjetas; en el fondo marrón se usa un tono claro para mantener contraste
  return (
    <View style={{ backgroundColor: colors.sand, borderRadius: 10, padding: 10 }}>
      <Text style={{ color: tone === 'ok' ? colors.ok : colors.danger, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator color={colors.brown} style={{ marginVertical: 24 }} />;
}

export function Empty({ text }: { text: string }) {
  return <Text style={styles.empty}>{text}</Text>;
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
    <Pressable onPress={() => void cerrarSesion()} hitSlop={8}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  topBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 6 },
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
  button: { alignItems: 'center', backgroundColor: colors.orange, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18 },
  buttonSecondary: { backgroundColor: 'transparent', borderColor: colors.brown, borderWidth: 1.5 },
  buttonText: { color: '#1a1006', fontSize: 15, fontWeight: '800' },
  label: { color: colors.brown, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    color: colors.ink,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { color: colors.brown, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.sand, fontSize: 14, textAlign: 'center', marginVertical: 12 },
  logout: { color: colors.brown, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },
});
