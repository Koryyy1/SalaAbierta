import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icono, type NombreIcono } from '@/components/icono';
import { SaliAvatar } from '@/components/sali';
import { formatFecha, LogoutLink, useContador, vibrar } from '@/components/ui';
import { api, type ResumenPupilo } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Text } from '@/components/texto';

type MenuItem = {
  label: string;
  icono: NombreIcono;
  href?: Href;
  aviso?: string | null;
};

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const TIPO: Record<string, string> = { positiva: 'Positiva', negativa: 'Negativa', observacion: 'Observación' };

// Valores del resumen que suben desde 0 al aparecer
function ValorAnimado({ valor, formato, color }: { valor: number | null; formato: (n: number) => string; color?: string }) {
  const actual = useContador(valor);
  return <Text style={[styles.indicadorValor, color ? { color } : null]}>{actual === null ? '—' : formato(actual)}</Text>;
}

// Aviso de alertas que "late" dos veces al aparecer para llamar la atención del profesor
function AvisoAlertas({ texto }: { texto: string }) {
  const reducir = useReducedMotion();
  const escala = useSharedValue(1);
  useEffect(() => {
    if (!reducir) escala.value = withDelay(500, withRepeat(withSequence(withTiming(1.12, { duration: 180 }), withTiming(1, { duration: 180 })), 2));
  }, [reducir, escala, texto]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <Animated.View style={[styles.aviso, estilo]}>
      <Text style={styles.avisoTexto}>{texto}</Text>
    </Animated.View>
  );
}

// Inicio del apoderado: lo más importante de cada pupilo sin tener que entrar a otra pantalla
function ResumenPupilos({ datos, onIr }: { datos: ResumenPupilo[]; onIr: (href: Href) => void }) {
  return (
    <View style={{ gap: 12, marginBottom: 18 }}>
      {datos.map((p, i) => {
        const promedioBajo = p.promedio !== null && p.promedio < 4;
        const asistenciaBaja = p.asistencia !== null && p.asistencia < 85;
        return (
          <Animated.View key={p.id} entering={FadeInDown.delay(i * 80).duration(320)} style={styles.resumen}>
            <Text style={styles.resumenNombre}>
              {p.nombre} · {p.curso}
            </Text>
            <View style={styles.indicadores}>
              <Pressable
                style={styles.indicador}
                onPress={() => onIr('/apoderado/notas')}
                accessibilityRole="button"
                accessibilityLabel={`Promedio ${p.promedio === null ? 'sin notas' : decimal(p.promedio)}. Ver notas`}>
                <Text style={styles.indicadorEtiqueta}>Promedio</Text>
                <ValorAnimado valor={p.promedio} formato={decimal} color={promedioBajo ? '#b3261e' : undefined} />
              </Pressable>
              <Pressable
                style={styles.indicador}
                onPress={() => onIr('/apoderado/asistencia')}
                accessibilityRole="button"
                accessibilityLabel={`Asistencia ${p.asistencia === null ? 'sin registros' : `${p.asistencia} por ciento`}. Ver asistencia`}>
                <Text style={styles.indicadorEtiqueta}>Asistencia</Text>
                <ValorAnimado valor={p.asistencia} formato={(n) => `${Math.round(n)}%`} color={asistenciaBaja ? '#8a5200' : undefined} />
              </Pressable>
            </View>
            <Pressable onPress={() => onIr('/apoderado/anotaciones')} accessibilityRole="button">
              <Text style={styles.resumenTexto}>
                {p.ultimaAnotacion
                  ? `Última anotación (${formatFecha(p.ultimaAnotacion.fecha)}): ${TIPO[p.ultimaAnotacion.tipo] ?? p.ultimaAnotacion.tipo}`
                  : 'Sin anotaciones.'}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const menuApoderado: MenuItem[] = [
  { label: 'Notas', icono: 'libro', href: '/apoderado/notas' },
  { label: 'Anotaciones', icono: 'anotaciones', href: '/apoderado/anotaciones' },
  { label: 'Muro del curso', icono: 'muro', href: '/muro' },
  { label: 'Asistencia', icono: 'calendario', href: '/apoderado/asistencia' },
];

const menuProfesor: MenuItem[] = [
  { label: 'Pasar asistencia', icono: 'asistencia', href: '/profesor/asistencia' },
  { label: 'Registrar notas', icono: 'notas', href: '/profesor/notas' },
  { label: 'Anotaciones', icono: 'anotaciones', href: '/profesor/anotaciones' },
  { label: 'Muro del curso', icono: 'muro', href: '/muro' },
  { label: 'Alertas tempranas', icono: 'alertas', href: '/profesor/alertas' },
];

const menuAdmin: MenuItem[] = [
  { label: 'Resumen del colegio', icono: 'resumen', href: '/admin/resumen' },
  { label: 'Auditoría', icono: 'auditoria', href: '/admin/auditoria' },
  { label: 'Umbrales de alerta', icono: 'umbrales', href: '/admin/umbrales' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { usuario } = useAuth();
  const esProfesor = usuario?.rol === 'Profesor';
  const esAdmin = usuario?.rol === 'Administrador';
  const esApoderado = usuario?.rol === 'Apoderado';
  const [resumen, setResumen] = useState<ResumenPupilo[] | null>(null);
  const [alertas, setAlertas] = useState<number | null>(null);

  // Se actualiza cada vez que se vuelve al inicio (por ejemplo, después de registrar notas)
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      if (esApoderado) api.resumenApoderado().then((d) => activo && setResumen(d)).catch(() => {});
      if (esProfesor) api.alertasProfesor().then((d) => activo && setAlertas(d.length)).catch(() => {});
      return () => {
        activo = false;
      };
    }, [esApoderado, esProfesor]),
  );

  const menuProfesorConAlertas = menuProfesor.map((item) =>
    item.href === '/profesor/alertas' && alertas
      ? { ...item, aviso: `${alertas} ${alertas === 1 ? 'alerta activa' : 'alertas activas'}` }
      : item,
  );
  const menuItems = esProfesor
    ? menuProfesorConAlertas
    : esAdmin
      ? menuAdmin
      : usuario?.rol === 'Apoderado'
        ? menuApoderado
        : [];
  const eyebrow = esProfesor ? 'Portal de profesores' : esAdmin ? 'Portal de dirección' : 'Portal de apoderados';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>

          <Text style={styles.welcomeText}>Bienvenido, {usuario?.nombre}</Text>
          <LogoutLink />
        </View>
        <View style={styles.brandBlock}>
          <View style={styles.brandMark}>
            <Text style={styles.brandMarkText}>SA</Text>
          </View>
          <Text style={styles.brandText}>SALA{'\n'}ABIERTA</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.panel} showsVerticalScrollIndicator={false}>
        {!menuItems.length && <Text style={{ color: '#e6c7a8' }}>Tu perfil no tiene módulos móviles disponibles.</Text>}
        {esApoderado && resumen && resumen.length > 0 && <ResumenPupilos datos={resumen} onIr={(href) => router.push(href)} />}
        <View style={styles.grid}>
          {menuItems.map((item, i) => (
            // Entrada escalonada: cada tarjeta aparece un instante después de la anterior
            <Animated.View key={item.label} entering={FadeInDown.delay(120 + i * 70).duration(340)} style={styles.cardZona}>
            <Pressable
              disabled={!item.href}
              onPress={() => {
                vibrar.toque();
                if (item.href) router.push(item.href);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.aviso ? `${item.label}, ${item.aviso}` : item.label}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed, !item.href && styles.cardDisabled]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={styles.cardBadge}>
                  <Icono nombre={item.icono} size={22} color="#5d3b2b" />
                </View>
                {item.aviso && <AvisoAlertas texto={item.aviso} />}
              </View>
              <View style={styles.cardFooter}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.cardLabel}>{item.label}</Text>
                  {!item.href && <Text style={styles.soon}>Próximamente</Text>}
                </View>
                {item.href && <Icono nombre="siguiente" size={18} color="#5d3b2b" />}
              </View>
            </Pressable>
            </Animated.View>
          ))}
        </View>

        {!esProfesor && usuario?.rol === 'Apoderado' && (
          <Animated.View entering={FadeInDown.delay(120 + menuItems.length * 70).duration(340)}>
          <Pressable
            onPress={() => router.push('/apoderado/asistente')}
            accessibilityRole="button"
            accessibilityLabel="Hablar con Sali, la asistente de SalaAbierta"
            style={({ pressed }) => [styles.chatbotButton, pressed && styles.chatbotButtonPressed]}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 14 }}>
              <SaliAvatar size={46} />
              <View>
                <Text style={styles.chatbotText}>¿Tiene dudas?</Text>
                <Text style={styles.chatbotTextBold}>Hablar con Sali</Text>
              </View>
            </View>
            <Icono nombre="siguiente" size={22} color="#1a1006" />
          </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    color: '#7a5640',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  welcomeText: {
    color: '#241610',
    flexShrink: 1,
    fontSize: 22,
    fontWeight: '800',
  },
  brandBlock: {
    alignItems: 'center',
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#5d3b2b',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandMarkText: {
    color: '#e6c7a8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandText: {
    color: '#5d3b2b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  panel: {
    backgroundColor: '#5d3b2b',
    borderRadius: 32,
    flexGrow: 1,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 28,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  cardZona: { width: '47%' },
  card: {
    backgroundColor: '#e6c7a8',
    borderRadius: 20,
    height: 150,
    justifyContent: 'space-between',
    padding: 16,
  },
  cardPressed: {
    backgroundColor: '#dcb894',
    transform: [{ scale: 0.97 }],
  },
  cardBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(93, 59, 43, 0.14)',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cardBadgeText: {
    color: '#5d3b2b',
    fontSize: 15,
    fontWeight: '800',
  },
  cardFooter: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#1f140d',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },
  cardChevron: {
    color: '#5d3b2b',
    fontSize: 20,
    fontWeight: '700',
  },
  chatbotButton: {
    alignItems: 'center',
    backgroundColor: '#c9793f',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  chatbotButtonPressed: {
    backgroundColor: '#b16a34',
    transform: [{ scale: 0.98 }],
  },
  chatbotText: {
    color: '#2c1a10',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  chatbotTextBold: {
    color: '#1a1006',
    fontSize: 18,
    fontWeight: '800',
  },
  chatbotChevron: {
    color: '#1a1006',
    fontSize: 22,
    fontWeight: '800',
  },
  cardDisabled: {
    opacity: 0.55,
  },
  resumen: { backgroundColor: '#e6c7a8', borderRadius: 20, gap: 10, padding: 16 },
  resumenNombre: { color: '#1f140d', fontSize: 16, fontWeight: '800' },
  indicadores: { flexDirection: 'row', gap: 10 },
  indicador: { backgroundColor: '#ffffff', borderRadius: 14, flex: 1, minHeight: 48, padding: 12 },
  indicadorEtiqueta: { color: '#5d3b2b', fontSize: 14, fontWeight: '700' },
  indicadorValor: { color: '#1f140d', fontSize: 26, fontWeight: '800' },
  resumenTexto: { color: '#1f140d', fontSize: 15 },
  aviso: { backgroundColor: '#b3261e', borderRadius: 999, flexShrink: 1, marginLeft: 6, paddingHorizontal: 10, paddingVertical: 4 },
  avisoTexto: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  soon: {
    color: '#5d3b2b',
    fontSize: 14,
    fontWeight: '600',
  },
});
